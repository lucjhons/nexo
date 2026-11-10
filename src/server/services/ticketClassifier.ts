export type TicketPriority = 'alta' | 'media' | 'baixa';
export type TicketStatus = 'pendente' | 'em_andamento' | 'aguardando_resposta' | 'concluido';

export interface PriorityClassificationResult {
  prioridade: TicketPriority;
  motivo: string;
  pontos: number;
  fatores: string[];
}

/**
 * Classifies a support ticket based on objective technical criteria:
 * - Urgency
 * - Problem impact & business interruption risk
 * - Security / Access lock risks
 * - Request category
 * - Waiting time
 * 
 * Note: Classification belongs strictly to the ticket/incident, NEVER to the personal value of the user.
 * This classification is internal and visible ONLY to authorized administrators.
 */
export function classifyTicketPriority(
  assunto: string,
  categoria: string,
  mensagem: string,
  criadoEm?: string
): PriorityClassificationResult {
  const text = `${assunto} ${categoria} ${mensagem}`.toLowerCase();
  let score = 0;
  const fatores: string[] = [];

  // 1. Critical Security and Access Interruption (Highest weight)
  const criticalTerms = [
    'bloqueio', 'bloqueado', 'bloqueada', 'invasão', 'invadido', 'vazamento',
    'segurança', 'lgpd', 'senha roubada', 'não consigo entrar', 'fora do ar',
    'parado', 'interrupção', 'perda de dados', 'corrompido', 'crítico', 'urgente'
  ];

  for (const term of criticalTerms) {
    if (text.includes(term)) {
      score += 40;
      fatores.push(`Termo de alta criticidade detectado: "${term}"`);
      break;
    }
  }

  // 2. Financial & Sales Operations Impact
  const operationalTerms = [
    'não consigo vender', 'erro no pdv', 'vendas travadas', 'estoque zerado indevidamente',
    'financeiro travado', 'emissão', 'pagamento', 'perda financeira', 'fechamento de caixa'
  ];

  for (const term of operationalTerms) {
    if (text.includes(term)) {
      score += 25;
      fatores.push(`Impacto direto na operação comercial/financeira: "${term}"`);
      break;
    }
  }

  // 3. Category Weight
  if (categoria === 'segurança' || categoria === 'acesso') {
    score += 30;
    fatores.push(`Categoria crítica: ${categoria}`);
  } else if (categoria === 'financeiro' || categoria === 'vendas' || categoria === 'falha_tecnica') {
    score += 20;
    fatores.push(`Categoria operacional relevante: ${categoria}`);
  } else if (categoria === 'duvida' || categoria === 'sugestao' || categoria === 'informacao') {
    score += 5;
    fatores.push(`Categoria informativa/consultiva: ${categoria}`);
  }

  // 4. Waiting Time (Aging factor)
  if (criadoEm) {
    const hoursWaiting = (Date.now() - new Date(criadoEm).getTime()) / (1000 * 60 * 60);
    if (hoursWaiting > 48) {
      score += 30;
      fatores.push(`Tempo de espera superior a 48h (+${Math.round(hoursWaiting)}h)`);
    } else if (hoursWaiting > 24) {
      score += 15;
      fatores.push(`Tempo de espera superior a 24h (+${Math.round(hoursWaiting)}h)`);
    } else if (hoursWaiting > 12) {
      score += 5;
      fatores.push(`Tempo de espera superior a 12h (+${Math.round(hoursWaiting)}h)`);
    }
  }

  // Thresholds
  let prioridade: TicketPriority = 'baixa';
  let motivo = 'Solicitação de consulta ou impacto leve';

  if (score >= 45) {
    prioridade = 'alta';
    motivo = 'Alto risco de interrupção operacional, bloqueio de acesso ou segurança';
  } else if (score >= 20) {
    prioridade = 'media';
    motivo = 'Impacto moderado em processos diários ou prazo relevante';
  } else {
    prioridade = 'baixa';
    motivo = 'Dúvida operacional, sugestão ou baixa urgência';
  }

  return {
    prioridade,
    motivo: `${motivo}. Critérios identificados: ${fatores.join('; ') || 'Triagem padrão'}`,
    pontos: score,
    fatores,
  };
}
