import { GoogleGenAI } from '@google/genai';

// Initialize Gemini on server-side with required User-Agent header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

export interface SanitizedBusinessData {
  nomeEmpresaOuProjeto: string;
  ramoAtividade: string;
  totalVendas: number;
  totalDespesas: number;
  resultadoLiquido: number;
  margemLucroPercentual: number;
  produtosMaisVendidos: Array<{ nome: string; quantidade: number; receita: number }>;
  produtosBaixoEstoque: Array<{ nome: string; estoqueAtual: number; estoqueMinimo: number }>;
  despesasPorCategoria: Record<string, number>;
  totalClientesAtivos: number;
  ticketMedio: number;
}

/**
 * Analyzes business performance with Gemini 3.8 Flash
 * Strict data privacy: Only anonymized, aggregated financial data is passed.
 * NEVER passes CPF, customer PII, phone numbers or bank account data.
 */
export async function analyzeBusinessWithAI(
  data: SanitizedBusinessData,
  userQuestion?: string
): Promise<{ text: string; success: boolean }> {
  try {
    const systemInstruction = `Você é o NEXO INTELIGÊNCIA, especialista sênior em finanças, gestão estratégica e pequenos negócios no Brasil.
Seu objetivo é analisar os números reais do negócio de forma executiva, objetiva, prática e motivadora.
Princípios obrigatórios:
1. Responda em Português do Brasil com clareza executiva e termos fáceis (DRE, Margem de Contribuição, Ponto de Equilíbrio, Gestão de Estoque).
2. Forneça diagnósticos reais baseados nos dados fornecidos: se o lucro for positivo, aponte oportunidades de reinvestimento; se as despesas forem altas, aponte categorias que precisam de contenção.
3. Se houver produtos com baixo estoque ou baixa rotação, recomende ações promocionais ou reposição.
4. Jamais invente dados inexistentes ou faça promessas mirabolantes. Não mencione dados pessoais.
5. Estruture com seções elegantes:
   - Diagnóstico Geral de Saúde Financeira
   - Pontos Fortes e Oportunidades Identificadas
   - Alertas e Riscos Operacionais
   - Plano de Ação em 3 Passos`;

    const promptContext = `
DADOS OPERACIONAIS E FINANCEIROS DO NEGÓCIO:
- Negócio: ${data.nomeEmpresaOuProjeto} (${data.ramoAtividade})
- Faturamento Total: R$ ${data.totalVendas.toFixed(2)}
- Despesas Operacionais: R$ ${data.totalDespesas.toFixed(2)}
- Resultado Líquido: R$ ${data.resultadoLiquido.toFixed(2)}
- Margem Líquida: ${data.margemLucroPercentual.toFixed(1)}%
- Ticket Médio por Venda: R$ ${data.ticketMedio.toFixed(2)}
- Clientes Cadastrados: ${data.totalClientesAtivos}
- Produtos com Maior Giro: ${data.produtosMaisVendidos.map(p => `${p.nome} (${p.quantidade} un - R$ ${p.receita.toFixed(2)})`).join(', ') || 'Nenhum ainda'}
- Produtos com Alerta de Estoque: ${data.produtosBaixoEstoque.map(p => `${p.nome} (Atual: ${p.estoqueAtual}, Mínimo: ${p.estoqueMinimo})`).join(', ') || 'Nenhum no momento'}
- Despesas por Categoria: ${Object.entries(data.despesasPorCategoria).map(([cat, val]) => `${cat}: R$ ${val.toFixed(2)}`).join(', ') || 'Nenhuma registrada'}

${userQuestion ? `PERGUNTA ESPECÍFICA DO EMPREENDEDOR:\n"${userQuestion}"\nPor favor, responda diretamente a essa dúvida considerando o cenário dos números acima.` : 'Gere um relatório executivo de diagnóstico inteligente e recomendações prioritárias para as próximas semanas.'}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: promptContext,
      config: {
        systemInstruction,
      },
    });

    return {
      text: response.text || 'Não foi possível gerar a análise no momento.',
      success: true,
    };
  } catch (error: any) {
    console.error('[NEXO INTELIGÊNCIA GEMINI ERROR]', error);
    
    // Fallback analytical generator if API key is temporarily unavailable in sandbox
    const fallbackText = `### Diagnóstico Inteligente NEXO (Modo Operacional Local)

**1. Diagnóstico Geral de Saúde Financeira**
O negócio registrou faturamento de **R$ ${data.totalVendas.toFixed(2)}** com despesas de **R$ ${data.totalDespesas.toFixed(2)}**, resultando em saldo operacional líquido de **R$ ${data.resultadoLiquido.toFixed(2)}** (${data.margemLucroPercentual.toFixed(1)}% de margem líquida).
O ticket médio atual por transação é de **R$ ${data.ticketMedio.toFixed(2)}**.

**2. Pontos Fortes e Oportunidades**
- ${data.produtosMaisVendidos.length > 0 ? `Seu principal motor de receita é o produto **${data.produtosMaisVendidos[0]?.nome}**. Mantenha negociação de compra em escala para preservar margem.` : 'Cadastre mais vendas para identificar curvas ABC de faturamento.'}
- Base com **${data.totalClientesAtivos} clientes** cadastrados, permitindo ações de recompra e fidelização.

**3. Alertas e Riscos Operacionais**
- ${data.produtosBaixoEstoque.length > 0 ? `Atenção: ${data.produtosBaixoEstoque.length} produto(s) atingiram nível crítico de estoque mínimo. Risco de ruptura de vendas.` : 'Nenhum alerta de ruptura de estoque no momento.'}
- Custos fixos e despesas devem ser monitorados semanalmente para preservar o fluxo de caixa.

**4. Plano de Ação em 3 Passos**
1. Negociar prazos de pagamento com fornecedores dos produtos com maior margem.
2. Criar uma campanha de vendas direta para os clientes cadastrados.
3. Estabelecer meta de redução de 5% a 10% nas maiores categorias de despesas operacionais.`;

    return {
      text: fallbackText,
      success: false,
    };
  }
}
