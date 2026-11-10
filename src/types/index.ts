export type UserRole = 'client' | 'admin';
export type ClientType = 'jovem' | 'business';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  clientType: ClientType | null;
}

export interface Company {
  id: string;
  userId: string;
  razaoSocial: string;
  nomeFantasia: string;
  tipoNegocio: string;
  categoria: string;
  descricao: string;
  cidade: string;
  estado: string;
  tempoFuncionamento: string;
  numFuncionarios: string;
  cnpj: string;
  cpfMascarado?: string;
  telefone: string;
  emailComercial: string;
  endereco: string;
  objetivos: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectJovem {
  id: string;
  userId: string;
  nome: string;
  tipoNegocio: string;
  produtosServicos: string;
  publicoAlvo: string;
  problemaSolucao: string;
  custosPrincipais: string;
  objetivoProjeto: string;
  status: 'planejamento' | 'simulacao' | 'validacao' | 'pronto';
  simulacao: {
    precoVendaUnitario: number;
    custoUnitario: number;
    custosFixosMensais: number;
    vendasEstimadasMensais: number;
    pontoEquilibrioUnidades: number;
    pontoEquilibrioReais: number;
    margemLucroPercentual: number;
    lucroMensalEstimado: number;
  };
  etapas: Array<{ id: string; titulo: string; concluido: boolean; dica: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  companyId: string;
  nome: string;
  categoria: string;
  precoCusto: number;
  precoVenda: number;
  estoqueAtual: number;
  estoqueMinimo: number;
  unidade: string;
  createdAt: string;
}

export interface SaleItem {
  produtoId: string;
  produtoNome: string;
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
}

export interface Sale {
  id: string;
  companyId: string;
  clienteId?: string;
  clienteNome?: string;
  items: SaleItem[];
  valorTotal: number;
  formaPagamento: 'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito' | 'boleto';
  data: string;
  observacoes?: string;
}

export interface Expense {
  id: string;
  companyId: string;
  categoria: string;
  descricao: string;
  valor: number;
  data: string;
  vencimento: string;
  status: 'pago' | 'pendente';
}

export interface Client {
  id: string;
  companyId: string;
  nome: string;
  email: string;
  telefone: string;
  cidade: string;
  notas?: string;
  createdAt: string;
}

export interface BusinessGoal {
  id: string;
  companyId: string;
  titulo: string;
  metaValor: number;
  atualValor: number;
  prazo: string;
  status: 'em_andamento' | 'atingida' | 'expirada';
}

export interface FinancialReport {
  totalVendas: number;
  totalDespesas: number;
  totalDespesasPagas: number;
  totalDespesasPendentes: number;
  resultadoLiquido: number;
  margemLucroPercentual: number;
  ticketMedio: number;
  quantidadeVendas: number;
  quantidadeClientes: number;
  produtosCadastrados: number;
  produtosMaisVendidos: Array<{ nome: string; quantidade: number; receita: number }>;
  produtosBaixoEstoque: Product[];
  despesasPorCategoria: Record<string, number>;
  formasPagamentoMap: Record<string, number>;
}

export interface Opportunity {
  id: string;
  titulo: string;
  categoria: 'curso' | 'evento' | 'apoio' | 'edital';
  organizacao: string;
  descricao: string;
  link: string;
  dataInicio: string;
  localizacao: string;
  destaque: boolean;
  criadoPor: string;
}

export interface TicketMessage {
  id: string;
  autorId: string;
  autorNome: string;
  autorRole: 'client' | 'admin';
  mensagem: string;
  data: string;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  userId: string;
  userEmail: string;
  userName: string;
  assunto: string;
  categoria: string;
  mensagem: string;
  status: 'pendente' | 'em_andamento' | 'aguardando_resposta' | 'concluido';
  prioridade?: 'alta' | 'media' | 'baixa'; // visible to admins only
  prioridadeMotivo?: string;
  respostas: TicketMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface NetworkProfile {
  id: string;
  userId: string;
  nomePublico: string;
  tipoPerfil: 'jovem' | 'empreendedor' | 'parceiro';
  biografia: string;
  areaAtuacao: string;
  habilidades: string[];
  contatoAutorizado: string;
  projetosPublicos: Array<{ titulo: string; resumo: string }>;
  visivel: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId?: string;
  userEmail?: string;
  action: string;
  resource: string;
  details: string;
  ip?: string;
}

export interface AdminUserRecord {
  id: string;
  name: string;
  email: string;
  role: 'client' | 'admin';
  clientType: 'jovem' | 'business' | null;
  status: 'active' | 'suspended';
  failedAttempts: number;
  createdAt: string;
  lastLoginAt?: string;
}
