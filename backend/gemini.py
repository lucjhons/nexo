"""NEXO INTELIGÊNCIA — análise financeira com IA (Gemini).

Privacidade rigorosa: apenas indicadores financeiros agregados e
anonimizados são enviados à IA. Nunca CPF, dados pessoais, telefones ou
dados bancários. Sem GEMINI_API_KEY (ou sem o pacote google-genai
instalado), o sistema gera automaticamente o relatório local.
"""
import os

SYSTEM_INSTRUCTION = (
    'Você é o NEXO INTELIGÊNCIA, especialista sênior em finanças, gestão estratégica e pequenos negócios no Brasil.\n'
    'Seu objetivo é analisar os números reais do negócio de forma executiva, objetiva, prática e motivadora.\n'
    'Princípios obrigatórios:\n'
    '1. Responda em Português do Brasil com clareza executiva e termos fáceis (DRE, Margem de Contribuição, Ponto de Equilíbrio, Gestão de Estoque).\n'
    '2. Forneça diagnósticos reais baseados nos dados fornecidos: se o lucro for positivo, aponte oportunidades de reinvestimento; se as despesas forem altas, aponte categorias que precisam de contenção.\n'
    '3. Se houver produtos com baixo estoque ou baixa rotação, recomende ações promocionais ou reposição.\n'
    '4. Jamais invente dados inexistentes ou faça promessas mirabolantes. Não mencione dados pessoais.\n'
    '5. Estruture com seções elegantes:\n'
    '   - Diagnóstico Geral de Saúde Financeira\n'
    '   - Pontos Fortes e Oportunidades Identificadas\n'
    '   - Alertas e Riscos Operacionais\n'
    '   - Plano de Ação em 3 Passos'
)


def _build_prompt(data, user_question=None) -> str:
    produtos_giro = (
        ', '.join(
            f'{p["nome"]} ({p["quantidade"]} un - R$ {p["receita"]:.2f})'
            for p in data['produtosMaisVendidos']
        )
        or 'Nenhum ainda'
    )
    produtos_estoque = (
        ', '.join(
            f'{p["nome"]} (Atual: {p["estoqueAtual"]}, Mínimo: {p["estoqueMinimo"]})'
            for p in data['produtosBaixoEstoque']
        )
        or 'Nenhum no momento'
    )
    despesas = (
        ', '.join(f'{cat}: R$ {val:.2f}' for cat, val in data['despesasPorCategoria'].items())
        or 'Nenhuma registrada'
    )

    pergunta = (
        f'PERGUNTA ESPECÍFICA DO EMPREENDEDOR:\n"{user_question}"\n'
        'Por favor, responda diretamente a essa dúvida considerando o cenário dos números acima.'
        if user_question
        else 'Gere um relatório executivo de diagnóstico inteligente e recomendações prioritárias para as próximas semanas.'
    )

    return f"""
DADOS OPERACIONAIS E FINANCEIROS DO NEGÓCIO:
- Negócio: {data['nomeEmpresaOuProjeto']} ({data['ramoAtividade']})
- Faturamento Total: R$ {data['totalVendas']:.2f}
- Despesas Operacionais: R$ {data['totalDespesas']:.2f}
- Resultado Líquido: R$ {data['resultadoLiquido']:.2f}
- Margem Líquida: {data['margemLucroPercentual']:.1f}%
- Ticket Médio por Venda: R$ {data['ticketMedio']:.2f}
- Clientes Cadastrados: {data['totalClientesAtivos']}
- Produtos com Maior Giro: {produtos_giro}
- Produtos com Alerta de Estoque: {produtos_estoque}
- Despesas por Categoria: {despesas}

{pergunta}
"""


def _fallback_text(data) -> str:
    return f"""### Diagnóstico Inteligente NEXO (Modo Operacional Local)

**1. Diagnóstico Geral de Saúde Financeira**
O negócio registrou faturamento de **R$ {data['totalVendas']:.2f}** com despesas de **R$ {data['totalDespesas']:.2f}**, resultando em saldo operacional líquido de **R$ {data['resultadoLiquido']:.2f}** ({data['margemLucroPercentual']:.1f}% de margem líquida).
O ticket médio atual por transação é de **R$ {data['ticketMedio']:.2f}**.

**2. Pontos Fortes e Oportunidades**
- {(f'Seu principal motor de receita é o produto **{data["produtosMaisVendidos"][0]["nome"]}**. Mantenha negociação de compra em escala para preservar margem.' if data['produtosMaisVendidos'] else 'Cadastre mais vendas para identificar curvas ABC de faturamento.')}
- Base com **{data['totalClientesAtivos']} clientes** cadastrados, permitindo ações de recompra e fidelização.

**3. Alertas e Riscos Operacionais**
- {(f'Atenção: {len(data["produtosBaixoEstoque"])} produto(s) atingiram nível crítico de estoque mínimo. Risco de ruptura de vendas.' if data['produtosBaixoEstoque'] else 'Nenhum alerta de ruptura de estoque no momento.')}
- Custos fixos e despesas devem ser monitorados semanalmente para preservar o fluxo de caixa.

**4. Plano de Ação em 3 Passos**
1. Negociar prazos de pagamento com fornecedores dos produtos com maior margem.
2. Criar uma campanha de vendas direta para os clientes cadastrados.
3. Estabelecer meta de redução de 5% a 10% nas maiores categorias de despesas operacionais."""


def analyze_business_with_ai(data: dict, user_question: str | None = None) -> dict:
    """Analisa o negócio com o Gemini; em falha, gera o diagnóstico local."""
    try:
        api_key = os.environ.get('GEMINI_API_KEY')
        if not api_key:
            raise RuntimeError('API key should be set when using the Gemini API.')

        from google import genai  # importação tardia: pacote é opcional

        client = genai.Client(
            api_key=api_key,
            http_options={'headers': {'User-Agent': 'aistudio-build'}},
        )
        response = client.models.generate_content(
            model='gemini-3.8-flash',
            contents=_build_prompt(data, user_question),
            config=genai.types.GenerateContentConfig(system_instruction=SYSTEM_INSTRUCTION),
        )
        text = response.text or 'Não foi possível gerar a análise no momento.'
        return {'text': text, 'success': True}
    except Exception as err:  # noqa: BLE001
        print(f'[NEXO INTELIGÊNCIA GEMINI ERROR] {err}')
        return {'text': _fallback_text(data), 'success': False}
