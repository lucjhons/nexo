"""Classificação automática de prioridade dos chamados de suporte.

Critérios objetivos: urgência, impacto na operação, riscos de segurança e
tempo de espera. A classificação é interna e visível SOMENTE a
administradores autorizados — nunca ao valor pessoal do usuário.
"""


def classify_ticket_priority(assunto, categoria, mensagem, criado_em=None):
    text = f'{assunto} {categoria} {mensagem}'.lower()
    score = 0
    fatores = []

    # 1. Segurança crítica e interrupção de acesso (peso mais alto)
    critical_terms = [
        'bloqueio', 'bloqueado', 'bloqueada', 'invasão', 'invadido', 'vazamento',
        'segurança', 'lgpd', 'senha roubada', 'não consigo entrar', 'fora do ar',
        'parado', 'interrupção', 'perda de dados', 'corrompido', 'crítico', 'urgente',
    ]
    for term in critical_terms:
        if term in text:
            score += 40
            fatores.append(f'Termo de alta criticidade detectado: "{term}"')
            break

    # 2. Impacto em operações financeiras e de vendas
    operational_terms = [
        'não consigo vender', 'erro no pdv', 'vendas travadas', 'estoque zerado indevidamente',
        'financeiro travado', 'emissão', 'pagamento', 'perda financeira', 'fechamento de caixa',
    ]
    for term in operational_terms:
        if term in text:
            score += 25
            fatores.append(f'Impacto direto na operação comercial/financeira: "{term}"')
            break

    # 3. Peso da categoria
    if categoria in ('segurança', 'acesso'):
        score += 30
        fatores.append(f'Categoria crítica: {categoria}')
    elif categoria in ('financeiro', 'vendas', 'falha_tecnica'):
        score += 20
        fatores.append(f'Categoria operacional relevante: {categoria}')
    elif categoria in ('duvida', 'sugestao', 'informacao'):
        score += 5
        fatores.append(f'Categoria informativa/consultiva: {categoria}')

    # 4. Tempo de espera (fator de envelhecimento)
    if criado_em:
        try:
            from datetime import datetime, timezone
            created = datetime.fromisoformat(str(criado_em).replace('Z', '+00:00'))
            hours_waiting = (datetime.now(timezone.utc) - created).total_seconds() / 3600
            if hours_waiting > 48:
                score += 30
                fatores.append(f'Tempo de espera superior a 48h (+{round(hours_waiting)}h)')
            elif hours_waiting > 24:
                score += 15
                fatores.append(f'Tempo de espera superior a 24h (+{round(hours_waiting)}h)')
            elif hours_waiting > 12:
                score += 5
                fatores.append(f'Tempo de espera superior a 12h (+{round(hours_waiting)}h)')
        except (ValueError, TypeError):
            pass

    # Limiares
    if score >= 45:
        prioridade = 'alta'
        motivo = 'Alto risco de interrupção operacional, bloqueio de acesso ou segurança'
    elif score >= 20:
        prioridade = 'media'
        motivo = 'Impacto moderado em processos diários ou prazo relevante'
    else:
        prioridade = 'baixa'
        motivo = 'Dúvida operacional, sugestão ou baixa urgência'

    return {
        'prioridade': prioridade,
        'motivo': f'{motivo}. Critérios identificados: {"; ".join(fatores) or "Triagem padrão"}',
        'pontos': score,
        'fatores': fatores,
    }
