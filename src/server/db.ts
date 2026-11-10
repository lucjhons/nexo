import fs from 'fs';
import path from 'path';
import { hashPassword, encryptSensitiveData, maskCPF, hashCode } from './crypto.js';
import { classifyTicketPriority, TicketPriority, TicketStatus } from './services/ticketClassifier.js';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'client' | 'admin';
  clientType: 'jovem' | 'business' | null;
  status: 'active' | 'suspended';
  failedAttempts: number;
  lockedUntil?: number;
  createdAt: string;
  lastLoginAt?: string;
}

export interface PasswordResetRecord {
  id: string;
  email: string;
  hashedCode: string;
  expiresAt: number;
  used: boolean;
  attempts: number;
  createdAt: string;
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
  cpfResponsavelEncrypted: string;
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
  status: TicketStatus;
  prioridade: TicketPriority; // Internal classification - visible to admins only!
  prioridadeMotivo: string;
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

export interface DatabaseSchema {
  users: User[];
  passwordResets: PasswordResetRecord[];
  companies: Company[];
  projects: ProjectJovem[];
  products: Product[];
  sales: Sale[];
  expenses: Expense[];
  clients: Client[];
  businessGoals: BusinessGoal[];
  opportunities: Opportunity[];
  supportTickets: SupportTicket[];
  networkProfiles: NetworkProfile[];
  auditLogs: AuditLog[];
}

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'nexo_database.json');

class Database {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadDatabase();
  }

  private loadDatabase(): DatabaseSchema {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw);
      } catch (e) {
        console.error('Failed to parse existing DB file, reinitializing', e);
      }
    }

    const initial = this.generateInitialSeed();
    this.persist(initial);
    return initial;
  }

  private persist(dataToSave?: DatabaseSchema) {
    const data = dataToSave || this.data;
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  }

  private generateInitialSeed(): DatabaseSchema {
    const now = new Date().toISOString();

    const adminUser: User = {
      id: 'usr_admin_01',
      name: 'Gestor Administrativo NEXO',
      email: 'admin@nexo.com.br',
      passwordHash: hashPassword('AdminPassword@2026'),
      role: 'admin',
      clientType: null,
      status: 'active',
      failedAttempts: 0,
      createdAt: now,
    };

    const businessUser: User = {
      id: 'usr_biz_01',
      name: 'Mariana Duarte Mendes',
      email: 'negocios@exemplo.com.br',
      passwordHash: hashPassword('Business@2026'),
      role: 'client',
      clientType: 'business',
      status: 'active',
      failedAttempts: 0,
      createdAt: now,
    };

    const jovemUser: User = {
      id: 'usr_jovem_01',
      name: 'Lucas Silva Prado',
      email: 'jovem@exemplo.com.br',
      passwordHash: hashPassword('JovemNexo@2026'),
      role: 'client',
      clientType: 'jovem',
      status: 'active',
      failedAttempts: 0,
      createdAt: now,
    };

    const demoCompany: Company = {
      id: 'comp_01',
      userId: businessUser.id,
      razaoSocial: 'Aroma & Grão Comércio de Cafés Especiais Ltda',
      nomeFantasia: 'Cafeteria & Empório Aroma',
      tipoNegocio: 'Comércio e Serviços',
      categoria: 'Alimentos e Bebidas',
      descricao: 'Cafeteria artesanal especializada em grãos selecionados de pequenos produtores e confeitaria autoral.',
      cidade: 'Belo Horizonte',
      estado: 'MG',
      tempoFuncionamento: '1 a 3 anos',
      numFuncionarios: '3 a 5 funcionários',
      cnpj: '45.123.789/0001-90',
      cpfResponsavelEncrypted: encryptSensitiveData('123.456.789-00'),
      telefone: '(31) 98765-4321',
      emailComercial: 'contato@aromaegrao.com.br',
      endereco: 'Rua das Flores, 420 - Savassi',
      objetivos: [
        'Controle de vendas',
        'Controle de despesas',
        'Gestão de estoque',
        'Cadastro de clientes',
        'Análise financeira',
        'Relatórios empresariais'
      ],
      createdAt: now,
      updatedAt: now,
    };

    const demoProducts: Product[] = [
      {
        id: 'prod_01',
        companyId: demoCompany.id,
        nome: 'Café Especial Grãos 250g (Mogiana)',
        categoria: 'Grãos e Cafés',
        precoCusto: 18.50,
        precoVenda: 36.00,
        estoqueAtual: 42,
        estoqueMinimo: 15,
        unidade: 'pct',
        createdAt: now,
      },
      {
        id: 'prod_02',
        companyId: demoCompany.id,
        nome: 'Cappuccino Italiano Clássico',
        categoria: 'Bebidas Quentes',
        precoCusto: 4.20,
        precoVenda: 14.00,
        estoqueAtual: 120,
        estoqueMinimo: 30,
        unidade: 'un',
        createdAt: now,
      },
      {
        id: 'prod_03',
        companyId: demoCompany.id,
        nome: 'Fatia Bolo de Cenoura Artesanal c/ Brigadeiro',
        categoria: 'Confeitaria',
        precoCusto: 5.00,
        precoVenda: 15.50,
        estoqueAtual: 8, // Low inventory alert (< 10)
        estoqueMinimo: 10,
        unidade: 'fat',
        createdAt: now,
      },
      {
        id: 'prod_04',
        companyId: demoCompany.id,
        nome: 'Pão de Queijo Recheado da Casa',
        categoria: 'Salgados',
        precoCusto: 3.50,
        precoVenda: 9.90,
        estoqueAtual: 25,
        estoqueMinimo: 15,
        unidade: 'un',
        createdAt: now,
      },
      {
        id: 'prod_05',
        companyId: demoCompany.id,
        nome: 'Café Prensa Francesa 500ml',
        categoria: 'Métodos Especiais',
        precoCusto: 6.00,
        precoVenda: 22.00,
        estoqueAtual: 60,
        estoqueMinimo: 20,
        unidade: 'un',
        createdAt: now,
      },
    ];

    const demoClients: Client[] = [
      {
        id: 'cli_01',
        companyId: demoCompany.id,
        nome: 'Camila Ferreira Alves',
        email: 'camila.alves@email.com',
        telefone: '(31) 99123-1122',
        cidade: 'Belo Horizonte',
        notas: 'Cliente assídua no café da manhã. Aprecia cafés frutados.',
        createdAt: now,
      },
      {
        id: 'cli_02',
        companyId: demoCompany.id,
        nome: 'Roberto Nogueira',
        email: 'roberto.nog@empresa.com.br',
        telefone: '(31) 98834-5566',
        cidade: 'Nova Lima',
        notas: 'Compra pacotes de café em grãos todo mês para o escritório.',
        createdAt: now,
      },
      {
        id: 'cli_03',
        companyId: demoCompany.id,
        nome: 'Juliana Paes e Costa',
        email: 'juliana.costa@techhub.com',
        telefone: '(31) 99445-7788',
        cidade: 'Belo Horizonte',
        notas: 'Participante do clube de fidelidade.',
        createdAt: now,
      },
    ];

    const demoSales: Sale[] = [
      {
        id: 'sal_01',
        companyId: demoCompany.id,
        clienteId: demoClients[0].id,
        clienteNome: demoClients[0].nome,
        items: [
          { produtoId: 'prod_02', produtoNome: 'Cappuccino Italiano Clássico', quantidade: 2, precoUnitario: 14.00, subtotal: 28.00 },
          { produtoId: 'prod_03', produtoNome: 'Fatia Bolo de Cenoura Artesanal c/ Brigadeiro', quantidade: 1, precoUnitario: 15.50, subtotal: 15.50 },
        ],
        valorTotal: 43.50,
        formaPagamento: 'pix',
        data: new Date(Date.now() - 3600000 * 4).toISOString(),
        observacoes: 'Consumo no local - mesa 4',
      },
      {
        id: 'sal_02',
        companyId: demoCompany.id,
        clienteId: demoClients[1].id,
        clienteNome: demoClients[1].nome,
        items: [
          { produtoId: 'prod_01', produtoNome: 'Café Especial Grãos 250g (Mogiana)', quantidade: 3, precoUnitario: 36.00, subtotal: 108.00 },
        ],
        valorTotal: 108.00,
        formaPagamento: 'cartao_credito',
        data: new Date(Date.now() - 3600000 * 26).toISOString(),
        observacoes: 'Retirada rápida',
      },
      {
        id: 'sal_03',
        companyId: demoCompany.id,
        clienteId: demoClients[2].id,
        clienteNome: demoClients[2].nome,
        items: [
          { produtoId: 'prod_04', produtoNome: 'Pão de Queijo Recheado da Casa', quantidade: 2, precoUnitario: 9.90, subtotal: 19.80 },
          { produtoId: 'prod_05', produtoNome: 'Café Prensa Francesa 500ml', quantidade: 1, precoUnitario: 22.00, subtotal: 22.00 },
        ],
        valorTotal: 41.80,
        formaPagamento: 'cartao_debito',
        data: new Date(Date.now() - 3600000 * 50).toISOString(),
        observacoes: 'Atendimento balcão',
      },
    ];

    const demoExpenses: Expense[] = [
      {
        id: 'exp_01',
        companyId: demoCompany.id,
        categoria: 'Insumos e Matéria-Prima',
        descricao: 'Lote de café cru direto do produtor Mantiqueira',
        valor: 1850.00,
        data: new Date(Date.now() - 3600000 * 72).toISOString(),
        vencimento: new Date(Date.now() - 3600000 * 24).toISOString(),
        status: 'pago',
      },
      {
        id: 'exp_02',
        companyId: demoCompany.id,
        categoria: 'Aluguel e Condomínio',
        descricao: 'Aluguel ponto comercial Savassi',
        valor: 3200.00,
        data: new Date(Date.now() - 3600000 * 120).toISOString(),
        vencimento: new Date(Date.now() + 3600000 * 72).toISOString(),
        status: 'pago',
      },
      {
        id: 'exp_03',
        companyId: demoCompany.id,
        categoria: 'Energia Elétrica',
        descricao: 'Conta Cemig referência mensal',
        valor: 640.50,
        data: new Date().toISOString(),
        vencimento: new Date(Date.now() + 3600000 * 140).toISOString(),
        status: 'pendente',
      },
      {
        id: 'exp_04',
        companyId: demoCompany.id,
        categoria: 'Embalagens e Descartáveis',
        descricao: 'Copos ecológicos e embalagens seladas',
        valor: 480.00,
        data: new Date().toISOString(),
        vencimento: new Date(Date.now() + 3600000 * 96).toISOString(),
        status: 'pendente',
      },
    ];

    const demoGoals: BusinessGoal[] = [
      {
        id: 'goal_01',
        companyId: demoCompany.id,
        titulo: 'Faturamento Mensal Alvo',
        metaValor: 25000.00,
        atualValor: 17450.00,
        prazo: 'Fim do mês corrente',
        status: 'em_andamento',
      },
      {
        id: 'goal_02',
        companyId: demoCompany.id,
        titulo: 'Clientes Cadastrados Ativos',
        metaValor: 100,
        atualValor: 68,
        prazo: '3 meses',
        status: 'em_andamento',
      },
    ];

    const demoProject: ProjectJovem = {
      id: 'proj_01',
      userId: jovemUser.id,
      nome: 'EcoPack Embalagens Biodegradáveis',
      tipoNegocio: 'Indústria Sustentável / B2B',
      produtosServicos: 'Embalagens térmicas ecológicas produzidas a partir de fibra de mandioca e bagaço de cana para delivery de restaurantes.',
      publicoAlvo: 'Restaurantes sustentáveis, cafeterias, hamburguerias artesanais e negócios de alimentação consciente.',
      problemaSolucao: 'Substituir isopor e plásticos descartáveis de uso único por embalagens 100% compostáveis em 90 dias, mantendo alimentos quentes e crocantes.',
      custosPrincipais: 'Matéria-prima vegetal prensada, maquinário de termoformagem e logística de distribuição local.',
      objetivoProjeto: 'Validar protótipo com 10 restaurantes piloto nos próximos 6 meses e buscar apoio de edital de inovação.',
      status: 'simulacao',
      simulacao: {
        precoVendaUnitario: 3.20,
        custoUnitario: 1.40,
        custosFixosMensais: 2400.00,
        vendasEstimadasMensais: 3000,
        pontoEquilibrioUnidades: 1334,
        pontoEquilibrioReais: 4268.80,
        margemLucroPercentual: 56.25,
        lucroMensalEstimado: 3000.00,
      },
      etapas: [
        { id: 'etapa_1', titulo: 'Definição da Ideia e Problema', concluido: true, dica: 'Identifique claramente quem sofre a dor e por que as soluções atuais são insuficientes.' },
        { id: 'etapa_2', titulo: 'Pesquisa com Potenciais Clientes', concluido: true, dica: 'Converse com pelo menos 10 proprietários de restaurantes sobre os custos atuais de descartáveis.' },
        { id: 'etapa_3', titulo: 'Simulação de Custos e Ponto de Equilíbrio', concluido: true, dica: 'Conheça o número exato de unidades necessárias apenas para cobrir os custos fixos.' },
        { id: 'etapa_4', titulo: 'Desenvolvimento do Protótipo Funcional', concluido: false, dica: 'Produza as primeiras 50 unidades de teste para avaliar resistência térmica e umidade.' },
        { id: 'etapa_5', titulo: 'Validação no Mercado Piloto', concluido: false, dica: 'Entregue o produto para uso diário em 3 parceiros e colete feedback minucioso.' },
        { id: 'etapa_6', titulo: 'Formalização e Modelo de Crescimento', concluido: false, dica: 'Defina a estrutura jurídica (MEI ou ME) e estude editais de fomento à sustentabilidade.' },
      ],
      createdAt: now,
      updatedAt: now,
    };

    const demoOpportunities: Opportunity[] = [
      {
        id: 'opp_01',
        titulo: 'Programa Empretec SEBRAE 2026',
        categoria: 'curso',
        organizacao: 'SEBRAE',
        descricao: 'Seminário intensivo de desenvolvimento do comportamento empreendedor baseado em metodologia da ONU.',
        link: 'https://sebrae.com.br/empretec',
        dataInicio: 'Inscrições abertas até 15 de cada mês',
        localizacao: 'Presencial nas principais capitais e polos regionais',
        destaque: true,
        criadoPor: adminUser.id,
      },
      {
        id: 'opp_02',
        titulo: 'Edital Inova Jovem — Apoio a Startups de Impacto',
        categoria: 'edital',
        organizacao: 'Fundação de Fomento e Inovação',
        descricao: 'Aporte de até R$ 50.000 em capital semente a fundo perdido para projetos de jovens de 18 a 29 anos.',
        link: 'https://inovajovem.gov.br',
        dataInicio: 'Submissões até 30 de Novembro',
        localizacao: 'Nacional (Inscrição online)',
        destaque: true,
        criadoPor: adminUser.id,
      },
      {
        id: 'opp_03',
        titulo: 'Oficina Prática de Gestão de Fluxo de Caixa e Custos',
        categoria: 'curso',
        organizacao: 'Escola de Negócios Locais',
        descricao: 'Aprenda a controlar entradas, saídas, prazos de recebimento e formação de preço de venda sem complicação.',
        link: 'https://nexo.org.br/cursos/gestao-financeira',
        dataInicio: 'Toda terça e quinta, 19h',
        localizacao: 'Online / Transmissão ao vivo',
        destaque: false,
        criadoPor: adminUser.id,
      },
      {
        id: 'opp_04',
        titulo: 'Feira Regional de Empreendedorismo e Conexões',
        categoria: 'evento',
        organizacao: 'Associação Comercial e Empresarial',
        descricao: 'Espaço de networking, rodadas de negócios com compradores locais e estandes para novas marcas.',
        link: 'https://feiradoempreendedor.org.br',
        dataInicio: 'Dias 12 a 14 do próximo mês',
        localizacao: 'Centro de Convenções Regional',
        destaque: true,
        criadoPor: adminUser.id,
      },
      {
        id: 'opp_05',
        titulo: 'Mentoria Jurídica e Contábil Gratuita para MEIs',
        categoria: 'apoio',
        organizacao: 'Núcleo de Práticas Jurídicas',
        descricao: 'Orientação personalizada com advogados e contadores para regularização, contratos e enquadramento fiscal.',
        link: 'https://nucleodeapoio.org.br',
        dataInicio: 'Atendimento contínuo mediante agendamento',
        localizacao: 'Híbrido (Presencial ou videoconferência)',
        destaque: false,
        criadoPor: adminUser.id,
      },
    ];

    // Build tickets with automatic priority classification
    const ticket1Classification = classifyTicketPriority(
      'Não consigo emitir pedido de venda no balcão',
      'vendas',
      'Ao tentar registrar a venda com 3 itens, o sistema apresentou mensagem de timeout e não confirmou o pagamento. Estamos com clientes na fila.'
    );

    const ticket2Classification = classifyTicketPriority(
      'Dúvida sobre simulador de ponto de equilíbrio',
      'duvida',
      'Gostaria de saber se a fórmula do ponto de equilíbrio já considera a depreciação de máquinas que comprei em segunda mão.'
    );

    const ticket3Classification = classifyTicketPriority(
      'Suspeita de tentativa de acesso não autorizada na conta',
      'segurança',
      'Recebi um aviso no meu e-mail informando que alguém tentou logar na minha conta a partir de um IP desconhecido. Solicito bloqueio preventivo e verificação.'
    );

    const demoTickets: SupportTicket[] = [
      {
        id: 'tkt_01',
        ticketNumber: 'NX-2026-1001',
        userId: businessUser.id,
        userEmail: businessUser.email,
        userName: businessUser.name,
        assunto: 'Não consigo emitir pedido de venda no balcão',
        categoria: 'vendas',
        mensagem: 'Ao tentar registrar a venda com 3 itens, o sistema apresentou mensagem de timeout e não confirmou o pagamento. Estamos com clientes na fila.',
        status: 'em_andamento',
        prioridade: ticket1Classification.prioridade, // Classified as ALTA/MEDIA
        prioridadeMotivo: ticket1Classification.motivo,
        respostas: [
          {
            id: 'resp_01',
            autorId: adminUser.id,
            autorNome: 'Suporte Técnico NEXO',
            autorRole: 'admin',
            mensagem: 'Olá Mariana, nossa equipe operacional identificou uma oscilação na rota de transações do gateway e já aplicou a correção de contingência. Pode tentar registrar novamente?',
            data: new Date(Date.now() - 3600000 * 2).toISOString(),
          },
        ],
        createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
      {
        id: 'tkt_02',
        ticketNumber: 'NX-2026-1002',
        userId: jovemUser.id,
        userEmail: jovemUser.email,
        userName: jovemUser.name,
        assunto: 'Dúvida sobre simulador de ponto de equilíbrio',
        categoria: 'duvida',
        mensagem: 'Gostaria de saber se a fórmula do ponto de equilíbrio já considera a depreciação de máquinas que comprei em segunda mão.',
        status: 'pendente',
        prioridade: ticket2Classification.prioridade, // Classified as BAIXA
        prioridadeMotivo: ticket2Classification.motivo,
        respostas: [],
        createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
      },
      {
        id: 'tkt_03',
        ticketNumber: 'NX-2026-1003',
        userId: businessUser.id,
        userEmail: businessUser.email,
        userName: businessUser.name,
        assunto: 'Suspeita de tentativa de acesso não autorizada na conta',
        categoria: 'segurança',
        mensagem: 'Recebi um aviso no meu e-mail informando que alguém tentou logar na minha conta a partir de um IP desconhecido. Solicito bloqueio preventivo e verificação.',
        status: 'pendente',
        prioridade: ticket3Classification.prioridade, // Classified as ALTA
        prioridadeMotivo: ticket3Classification.motivo,
        respostas: [],
        createdAt: new Date(Date.now() - 3600000 * 1).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 1).toISOString(),
      },
    ];

    const demoProfiles: NetworkProfile[] = [
      {
        id: 'net_01',
        userId: jovemUser.id,
        nomePublico: 'Lucas Silva Prado — Fundador EcoPack',
        tipoPerfil: 'jovem',
        biografia: 'Estudante de engenharia e entusiasta de biomateriais. Desenvolvendo soluções para diminuir o impacto do plástico descartável no setor gastronômico.',
        areaAtuacao: 'Sustentabilidade e Embalagens',
        habilidades: ['Biomateriais', 'Modelagem de Negócios', 'Design de Produto', 'Sustentabilidade'],
        contatoAutorizado: 'contato.lucas@ecopack.exemplo.com.br',
        projetosPublicos: [
          { titulo: 'EcoPack Embalagens', resumo: 'Embalagens térmicas biodegradáveis feitas de mandioca e bagaço de cana.' },
        ],
        visivel: true,
        createdAt: now,
      },
      {
        id: 'net_02',
        userId: businessUser.id,
        nomePublico: 'Mariana Duarte Mendes — Café & Empório Aroma',
        tipoPerfil: 'empreendedor',
        biografia: 'Empreendedora com 3 anos de atuação no mercado de cafeterias especiais. Apaixonada por comércio justo e valorização de pequenos produtores rurais.',
        areaAtuacao: 'Alimentos, Bebidas e Varejo Especial',
        habilidades: ['Gestão de Cafeterias', 'Controle Financeiro', 'Curadoria de Cafés', 'Atendimento'],
        contatoAutorizado: 'mariana@aromaegrao.com.br',
        projetosPublicos: [
          { titulo: 'Cafeteria & Empório Aroma', resumo: 'Cafeteria especializada em cafés especiais e doces artesanais em Belo Horizonte.' },
        ],
        visivel: true,
        createdAt: now,
      },
    ];

    const demoAuditLogs: AuditLog[] = [
      {
        id: 'aud_01',
        timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
        userId: adminUser.id,
        userEmail: adminUser.email,
        action: 'INICIALIZACAO_SISTEMA',
        resource: 'SISTEMA_NEXO',
        details: 'Criação inicial da base de dados e esquemas de proteção criptográfica.',
        ip: '127.0.0.1',
      },
      {
        id: 'aud_02',
        timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
        userId: businessUser.id,
        userEmail: businessUser.email,
        action: 'CADASTRO_EMPRESA',
        resource: 'COMPANIES',
        details: 'Empresa cadastrada com sucesso via assistente guiado. CPF do responsável criptografado com chave AES-256.',
        ip: '189.40.12.8',
      },
      {
        id: 'aud_03',
        timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
        userId: jovemUser.id,
        userEmail: jovemUser.email,
        action: 'SIMULACAO_PROJETO_CRIADA',
        resource: 'PROJECTS_JOVEM',
        details: 'Projeto EcoPack configurado com cálculo de Ponto de Equilíbrio em 1334 unidades.',
        ip: '177.105.88.2',
      },
    ];

    return {
      users: [adminUser, businessUser, jovemUser],
      passwordResets: [],
      companies: [demoCompany],
      projects: [demoProject],
      products: demoProducts,
      sales: demoSales,
      expenses: demoExpenses,
      clients: demoClients,
      businessGoals: demoGoals,
      opportunities: demoOpportunities,
      supportTickets: demoTickets,
      networkProfiles: demoProfiles,
      auditLogs: demoAuditLogs,
    };
  }

  // --- Security & Audit Helpers ---
  public logAudit(entry: Omit<AuditLog, 'id' | 'timestamp'>) {
    const log: AuditLog = {
      id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };
    this.data.auditLogs.unshift(log);
    // Keep max 500 logs
    if (this.data.auditLogs.length > 500) {
      this.data.auditLogs.pop();
    }
    this.persist();
  }

  public getAuditLogs(limit = 100): AuditLog[] {
    return this.data.auditLogs.slice(0, limit);
  }

  // --- Users & Auth ---
  public findUserByEmail(email: string): User | undefined {
    return this.data.users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
  }

  public findUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  public createUser(userData: {
    name: string;
    email: string;
    password: string;
    role: 'client' | 'admin';
    clientType: 'jovem' | 'business' | null;
  }): User {
    const existing = this.findUserByEmail(userData.email);
    if (existing) {
      throw new Error('Este endereço de e-mail já possui uma conta cadastrada no NEXO. Por favor, acesse a página de login.');
    }

    const newUser: User = {
      id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: userData.name.trim(),
      email: userData.email.trim().toLowerCase(),
      passwordHash: hashPassword(userData.password),
      role: userData.role,
      clientType: userData.clientType,
      status: 'active',
      failedAttempts: 0,
      createdAt: new Date().toISOString(),
    };

    this.data.users.push(newUser);
    this.persist();

    this.logAudit({
      userId: newUser.id,
      userEmail: newUser.email,
      action: 'USUARIO_CADASTRADO',
      resource: 'USERS',
      details: `Novo usuário registrado (${newUser.role} / ${newUser.clientType || 'indefinido'})`,
    });

    return newUser;
  }

  public updateUserLoginSuccess(userId: string) {
    const user = this.findUserById(userId);
    if (user) {
      user.failedAttempts = 0;
      user.lockedUntil = undefined;
      user.lastLoginAt = new Date().toISOString();
      this.persist();
    }
  }

  public recordFailedLogin(email: string) {
    const user = this.findUserByEmail(email);
    if (!user) return;

    user.failedAttempts = (user.failedAttempts || 0) + 1;
    // Lock for 15 minutes after 5 consecutive failed attempts
    if (user.failedAttempts >= 5) {
      user.lockedUntil = Date.now() + 15 * 60 * 1000;
      this.logAudit({
        userId: user.id,
        userEmail: user.email,
        action: 'CONTA_TEMPORARIAMENTE_BLOQUEADA',
        resource: 'USERS',
        details: '5 tentativas consecutivas de senha incorreta. Conta bloqueada por 15 minutos.',
      });
    }
    this.persist();
  }

  public updateUserClientType(userId: string, clientType: 'jovem' | 'business') {
    const user = this.findUserById(userId);
    if (!user) throw new Error('Usuário não encontrado');
    user.clientType = clientType;
    this.persist();
  }

  // --- Password Recovery ---
  public createPasswordReset(email: string, rawCode: string): PasswordResetRecord {
    // Invalidate prior pending codes for this email
    const cleanEmail = email.trim().toLowerCase();
    this.data.passwordResets.forEach(pr => {
      if (pr.email === cleanEmail && !pr.used) {
        pr.used = true;
      }
    });

    const resetRecord: PasswordResetRecord = {
      id: `rst_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      email: cleanEmail,
      hashedCode: hashCode(rawCode),
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
      used: false,
      attempts: 0,
      createdAt: new Date().toISOString(),
    };

    this.data.passwordResets.push(resetRecord);
    this.persist();
    return resetRecord;
  }

  public verifyAndResetPassword(email: string, rawCode: string, newPassword: string): boolean {
    const cleanEmail = email.trim().toLowerCase();
    const candidateHash = hashCode(rawCode);

    const record = this.data.passwordResets
      .filter(pr => pr.email === cleanEmail && !pr.used && pr.expiresAt > Date.now())
      .sort((a, b) => b.expiresAt - a.expiresAt)[0];

    if (!record) {
      throw new Error('Código de verificação inválido, expirado ou inexistente.');
    }

    record.attempts += 1;
    if (record.attempts > 3) {
      record.used = true;
      this.persist();
      throw new Error('Limite de tentativas para este código foi excedido. Solicite um novo código de recuperação.');
    }

    if (record.hashedCode !== candidateHash) {
      this.persist();
      throw new Error('Código de verificação incorreto. Verifique o número recebido por e-mail.');
    }

    // Mark code as used
    record.used = true;

    // Update user password
    const user = this.findUserByEmail(cleanEmail);
    if (!user) {
      throw new Error('Usuário não localizado no sistema.');
    }

    user.passwordHash = hashPassword(newPassword);
    user.failedAttempts = 0;
    user.lockedUntil = undefined;

    this.persist();

    this.logAudit({
      userId: user.id,
      userEmail: user.email,
      action: 'SENHA_REDEFINIDA_COM_SUCESSO',
      resource: 'PASSWORD_RESET',
      details: 'Senha atualizada através do fluxo de verificação em duas etapas de recuperação.',
    });

    return true;
  }

  // --- Admin Account Management (Strict privacy: cannot see private finances or CPF) ---
  public listAllUsersForAdmin(): Array<Omit<User, 'passwordHash'>> {
    return this.data.users.map(({ passwordHash, ...rest }) => rest);
  }

  public setAccountStatus(userId: string, status: 'active' | 'suspended', adminId: string): User {
    const user = this.findUserById(userId);
    if (!user) throw new Error('Usuário não encontrado');
    if (user.role === 'admin' && status === 'suspended') {
      throw new Error('Não é permitido suspender uma conta administrativa principal.');
    }

    user.status = status;
    this.persist();

    this.logAudit({
      userId: adminId,
      action: status === 'active' ? 'CONTA_REATIVADA' : 'CONTA_SUSPENSA',
      resource: 'USERS',
      details: `Status do usuário ${user.email} alterado para "${status}" pelo administrador.`,
    });

    return user;
  }

  // --- Company (NEXO BUSINESS) ---
  public getCompanyByUserId(userId: string): (Company & { cpfMascarado?: string }) | null {
    const comp = this.data.companies.find(c => c.userId === userId);
    if (!comp) return null;
    return {
      ...comp,
      cpfMascarado: comp.cpfResponsavelEncrypted ? maskCPF(comp.cpfResponsavelEncrypted) : '***.***.***-**',
    };
  }

  public saveCompany(userId: string, companyData: Partial<Company> & { cpfResponsavel?: string }): Company {
    let company = this.data.companies.find(c => c.userId === userId);
    const now = new Date().toISOString();

    if (!company) {
      company = {
        id: `comp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        userId,
        razaoSocial: companyData.razaoSocial || '',
        nomeFantasia: companyData.nomeFantasia || companyData.razaoSocial || '',
        tipoNegocio: companyData.tipoNegocio || 'Comércio',
        categoria: companyData.categoria || 'Geral',
        descricao: companyData.descricao || '',
        cidade: companyData.cidade || '',
        estado: companyData.estado || '',
        tempoFuncionamento: companyData.tempoFuncionamento || 'Menos de 1 ano',
        numFuncionarios: companyData.numFuncionarios || '1 a 2',
        cnpj: companyData.cnpj || '',
        cpfResponsavelEncrypted: companyData.cpfResponsavel ? encryptSensitiveData(companyData.cpfResponsavel) : '',
        telefone: companyData.telefone || '',
        emailComercial: companyData.emailComercial || '',
        endereco: companyData.endereco || '',
        objetivos: companyData.objetivos || [],
        createdAt: now,
        updatedAt: now,
      };
      this.data.companies.push(company);
    } else {
      if (companyData.razaoSocial !== undefined) company.razaoSocial = companyData.razaoSocial;
      if (companyData.nomeFantasia !== undefined) company.nomeFantasia = companyData.nomeFantasia;
      if (companyData.tipoNegocio !== undefined) company.tipoNegocio = companyData.tipoNegocio;
      if (companyData.categoria !== undefined) company.categoria = companyData.categoria;
      if (companyData.descricao !== undefined) company.descricao = companyData.descricao;
      if (companyData.cidade !== undefined) company.cidade = companyData.cidade;
      if (companyData.estado !== undefined) company.estado = companyData.estado;
      if (companyData.tempoFuncionamento !== undefined) company.tempoFuncionamento = companyData.tempoFuncionamento;
      if (companyData.numFuncionarios !== undefined) company.numFuncionarios = companyData.numFuncionarios;
      if (companyData.cnpj !== undefined) company.cnpj = companyData.cnpj;
      if (companyData.cpfResponsavel) {
        company.cpfResponsavelEncrypted = encryptSensitiveData(companyData.cpfResponsavel);
      }
      if (companyData.telefone !== undefined) company.telefone = companyData.telefone;
      if (companyData.emailComercial !== undefined) company.emailComercial = companyData.emailComercial;
      if (companyData.endereco !== undefined) company.endereco = companyData.endereco;
      if (companyData.objetivos !== undefined) company.objetivos = companyData.objetivos;
      company.updatedAt = now;
    }

    this.persist();
    return company;
  }

  // --- Products & Inventory ---
  public getProducts(companyId: string, userId: string): Product[] {
    const comp = this.data.companies.find(c => c.id === companyId && c.userId === userId);
    if (!comp) return [];
    return this.data.products.filter(p => p.companyId === companyId);
  }

  public saveProduct(companyId: string, userId: string, productData: Omit<Product, 'id' | 'companyId' | 'createdAt'> & { id?: string }): Product {
    const comp = this.data.companies.find(c => c.id === companyId && c.userId === userId);
    if (!comp) throw new Error('Acesso não autorizado para esta empresa.');

    if (productData.id) {
      const prod = this.data.products.find(p => p.id === productData.id && p.companyId === companyId);
      if (!prod) throw new Error('Produto não encontrado');
      prod.nome = productData.nome;
      prod.categoria = productData.categoria;
      prod.precoCusto = Number(productData.precoCusto);
      prod.precoVenda = Number(productData.precoVenda);
      prod.estoqueAtual = Number(productData.estoqueAtual);
      prod.estoqueMinimo = Number(productData.estoqueMinimo);
      prod.unidade = productData.unidade;
      this.persist();
      return prod;
    } else {
      const newProd: Product = {
        id: `prod_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        companyId,
        nome: productData.nome,
        categoria: productData.categoria,
        precoCusto: Number(productData.precoCusto),
        precoVenda: Number(productData.precoVenda),
        estoqueAtual: Number(productData.estoqueAtual),
        estoqueMinimo: Number(productData.estoqueMinimo),
        unidade: productData.unidade || 'un',
        createdAt: new Date().toISOString(),
      };
      this.data.products.push(newProd);
      this.persist();
      return newProd;
    }
  }

  public deleteProduct(productId: string, companyId: string, userId: string): boolean {
    const comp = this.data.companies.find(c => c.id === companyId && c.userId === userId);
    if (!comp) throw new Error('Não autorizado.');

    const idx = this.data.products.findIndex(p => p.id === productId && p.companyId === companyId);
    if (idx >= 0) {
      this.data.products.splice(idx, 1);
      this.persist();
      return true;
    }
    return false;
  }

  // --- Sales ---
  public getSales(companyId: string, userId: string): Sale[] {
    const comp = this.data.companies.find(c => c.id === companyId && c.userId === userId);
    if (!comp) return [];
    return this.data.sales.filter(s => s.companyId === companyId).sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  }

  public createSale(companyId: string, userId: string, saleData: {
    clienteId?: string;
    clienteNome?: string;
    items: SaleItem[];
    formaPagamento: Sale['formaPagamento'];
    observacoes?: string;
  }): Sale {
    const comp = this.data.companies.find(c => c.id === companyId && c.userId === userId);
    if (!comp) throw new Error('Não autorizado para esta empresa.');

    if (!saleData.items || saleData.items.length === 0) {
      throw new Error('A venda deve conter ao menos um produto selecionado.');
    }

    let valorTotal = 0;
    // Decrement stock atomically
    for (const item of saleData.items) {
      const prod = this.data.products.find(p => p.id === item.produtoId && p.companyId === companyId);
      if (prod) {
        prod.estoqueAtual = Math.max(0, prod.estoqueAtual - item.quantidade);
      }
      valorTotal += item.subtotal;
    }

    const newSale: Sale = {
      id: `sal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      companyId,
      clienteId: saleData.clienteId,
      clienteNome: saleData.clienteNome,
      items: saleData.items,
      valorTotal,
      formaPagamento: saleData.formaPagamento,
      data: new Date().toISOString(),
      observacoes: saleData.observacoes,
    };

    this.data.sales.unshift(newSale);
    this.persist();
    return newSale;
  }

  // --- Expenses ---
  public getExpenses(companyId: string, userId: string): Expense[] {
    const comp = this.data.companies.find(c => c.id === companyId && c.userId === userId);
    if (!comp) return [];
    return this.data.expenses.filter(e => e.companyId === companyId).sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  }

  public saveExpense(companyId: string, userId: string, expData: Omit<Expense, 'id' | 'companyId'> & { id?: string }): Expense {
    const comp = this.data.companies.find(c => c.id === companyId && c.userId === userId);
    if (!comp) throw new Error('Não autorizado.');

    if (expData.id) {
      const exp = this.data.expenses.find(e => e.id === expData.id && e.companyId === companyId);
      if (!exp) throw new Error('Despesa não encontrada');
      exp.categoria = expData.categoria;
      exp.descricao = expData.descricao;
      exp.valor = Number(expData.valor);
      exp.data = expData.data;
      exp.vencimento = expData.vencimento;
      exp.status = expData.status;
      this.persist();
      return exp;
    } else {
      const newExp: Expense = {
        id: `exp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        companyId,
        categoria: expData.categoria,
        descricao: expData.descricao,
        valor: Number(expData.valor),
        data: expData.data || new Date().toISOString(),
        vencimento: expData.vencimento || new Date().toISOString(),
        status: expData.status || 'pendente',
      };
      this.data.expenses.unshift(newExp);
      this.persist();
      return newExp;
    }
  }

  public deleteExpense(expenseId: string, companyId: string, userId: string): boolean {
    const comp = this.data.companies.find(c => c.id === companyId && c.userId === userId);
    if (!comp) throw new Error('Não autorizado.');
    const idx = this.data.expenses.findIndex(e => e.id === expenseId && e.companyId === companyId);
    if (idx >= 0) {
      this.data.expenses.splice(idx, 1);
      this.persist();
      return true;
    }
    return false;
  }

  // --- Clients CRM ---
  public getClients(companyId: string, userId: string): Client[] {
    const comp = this.data.companies.find(c => c.id === companyId && c.userId === userId);
    if (!comp) return [];
    return this.data.clients.filter(c => c.companyId === companyId);
  }

  public saveClient(companyId: string, userId: string, clientData: Omit<Client, 'id' | 'companyId' | 'createdAt'> & { id?: string }): Client {
    const comp = this.data.companies.find(c => c.id === companyId && c.userId === userId);
    if (!comp) throw new Error('Não autorizado.');

    if (clientData.id) {
      const client = this.data.clients.find(c => c.id === clientData.id && c.companyId === companyId);
      if (!client) throw new Error('Cliente não encontrado');
      client.nome = clientData.nome;
      client.email = clientData.email;
      client.telefone = clientData.telefone;
      client.cidade = clientData.cidade;
      client.notas = clientData.notas;
      this.persist();
      return client;
    } else {
      const newClient: Client = {
        id: `cli_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        companyId,
        nome: clientData.nome,
        email: clientData.email,
        telefone: clientData.telefone,
        cidade: clientData.cidade,
        notas: clientData.notas,
        createdAt: new Date().toISOString(),
      };
      this.data.clients.push(newClient);
      this.persist();
      return newClient;
    }
  }

  public deleteClient(clientId: string, companyId: string, userId: string): boolean {
    const comp = this.data.companies.find(c => c.id === companyId && c.userId === userId);
    if (!comp) throw new Error('Não autorizado.');
    const idx = this.data.clients.findIndex(c => c.id === clientId && c.companyId === companyId);
    if (idx >= 0) {
      this.data.clients.splice(idx, 1);
      this.persist();
      return true;
    }
    return false;
  }

  // --- Business Goals ---
  public getGoals(companyId: string, userId: string): BusinessGoal[] {
    const comp = this.data.companies.find(c => c.id === companyId && c.userId === userId);
    if (!comp) return [];
    return this.data.businessGoals.filter(g => g.companyId === companyId);
  }

  public saveGoal(companyId: string, userId: string, goalData: Omit<BusinessGoal, 'id' | 'companyId'> & { id?: string }): BusinessGoal {
    const comp = this.data.companies.find(c => c.id === companyId && c.userId === userId);
    if (!comp) throw new Error('Não autorizado.');

    if (goalData.id) {
      const goal = this.data.businessGoals.find(g => g.id === goalData.id && g.companyId === companyId);
      if (!goal) throw new Error('Meta não encontrada');
      goal.titulo = goalData.titulo;
      goal.metaValor = Number(goalData.metaValor);
      goal.atualValor = Number(goalData.atualValor);
      goal.prazo = goalData.prazo;
      goal.status = goalData.status;
      this.persist();
      return goal;
    } else {
      const newGoal: BusinessGoal = {
        id: `goal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        companyId,
        titulo: goalData.titulo,
        metaValor: Number(goalData.metaValor),
        atualValor: Number(goalData.atualValor),
        prazo: goalData.prazo,
        status: goalData.status || 'em_andamento',
      };
      this.data.businessGoals.push(newGoal);
      this.persist();
      return newGoal;
    }
  }

  public deleteGoal(goalId: string, companyId: string, userId: string): boolean {
    const comp = this.data.companies.find(c => c.id === companyId && c.userId === userId);
    if (!comp) throw new Error('Não autorizado.');
    const idx = this.data.businessGoals.findIndex(g => g.id === goalId && g.companyId === companyId);
    if (idx >= 0) {
      this.data.businessGoals.splice(idx, 1);
      this.persist();
      return true;
    }
    return false;
  }

  // --- NEXO JOVEM (Projects & Business Simulator) ---
  public getProjectsByUserId(userId: string): ProjectJovem[] {
    return this.data.projects.filter(p => p.userId === userId);
  }

  public saveProjectJovem(userId: string, projectData: Partial<ProjectJovem> & { id?: string }): ProjectJovem {
    const now = new Date().toISOString();
    let project: ProjectJovem | undefined;

    if (projectData.id) {
      project = this.data.projects.find(p => p.id === projectData.id && p.userId === userId);
    }

    // Default simulation computation
    const preco = Number(projectData.simulacao?.precoVendaUnitario ?? 10);
    const custoUnit = Number(projectData.simulacao?.custoUnitario ?? 4);
    const custosFixos = Number(projectData.simulacao?.custosFixosMensais ?? 1000);
    const vendas = Number(projectData.simulacao?.vendasEstimadasMensais ?? 300);

    const margemContribuicao = Math.max(0.01, preco - custoUnit);
    const pontoEquilibrioUnidades = Math.ceil(custosFixos / margemContribuicao);
    const pontoEquilibrioReais = pontoEquilibrioUnidades * preco;
    const margemLucroPercentual = preco > 0 ? ((margemContribuicao / preco) * 100) : 0;
    const lucroMensalEstimado = (vendas * margemContribuicao) - custosFixos;

    const computedSimulation = {
      precoVendaUnitario: preco,
      custoUnitario: custoUnit,
      custosFixosMensais: custosFixos,
      vendasEstimadasMensais: vendas,
      pontoEquilibrioUnidades,
      pontoEquilibrioReais,
      margemLucroPercentual,
      lucroMensalEstimado,
    };

    if (project) {
      if (projectData.nome) project.nome = projectData.nome;
      if (projectData.tipoNegocio) project.tipoNegocio = projectData.tipoNegocio;
      if (projectData.produtosServicos) project.produtosServicos = projectData.produtosServicos;
      if (projectData.publicoAlvo) project.publicoAlvo = projectData.publicoAlvo;
      if (projectData.problemaSolucao) project.problemaSolucao = projectData.problemaSolucao;
      if (projectData.custosPrincipais) project.custosPrincipais = projectData.custosPrincipais;
      if (projectData.objetivoProjeto) project.objetivoProjeto = projectData.objetivoProjeto;
      if (projectData.status) project.status = projectData.status;
      if (projectData.etapas) project.etapas = projectData.etapas;
      project.simulacao = computedSimulation;
      project.updatedAt = now;
    } else {
      project = {
        id: `proj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        userId,
        nome: projectData.nome || 'Novo Projeto NEXO Jovem',
        tipoNegocio: projectData.tipoNegocio || 'Serviços / Digital',
        produtosServicos: projectData.produtosServicos || '',
        publicoAlvo: projectData.publicoAlvo || '',
        problemaSolucao: projectData.problemaSolucao || '',
        custosPrincipais: projectData.custosPrincipais || '',
        objetivoProjeto: projectData.objetivoProjeto || '',
        status: projectData.status || 'planejamento',
        simulacao: computedSimulation,
        etapas: projectData.etapas || [
          { id: 'etapa_1', titulo: 'Definição da Ideia e Problema', concluido: true, dica: 'Identifique claramente quem sofre a dor e por que as soluções atuais são insuficientes.' },
          { id: 'etapa_2', titulo: 'Pesquisa com Potenciais Clientes', concluido: false, dica: 'Converse com pelo menos 10 potenciais clientes para validar interesse real.' },
          { id: 'etapa_3', titulo: 'Simulação de Custos e Ponto de Equilíbrio', concluido: false, dica: 'Calcule o preço de venda e a quantidade mínima para não ter prejuízo.' },
          { id: 'etapa_4', titulo: 'Desenvolvimento do Protótipo / MVP', concluido: false, dica: 'Crie uma versão simplificada para validar a proposta de valor rapidamente.' },
          { id: 'etapa_5', titulo: 'Primeiras Vendas e Feedback', concluido: false, dica: 'Conquiste seus primeiros clientes pagantes e aprimore o serviço.' },
          { id: 'etapa_6', titulo: 'Planejamento de Crescimento e Formalização', concluido: false, dica: 'Analise enquadramento no MEI e parcerias estratégicas.' },
        ],
        createdAt: now,
        updatedAt: now,
      };
      this.data.projects.push(project);
    }

    this.persist();
    return project;
  }

  // --- Opportunities (NEXO LOCAL) ---
  public getOpportunities(filter?: { categoria?: string; query?: string }): Opportunity[] {
    let list = [...this.data.opportunities];
    if (filter?.categoria && filter.categoria !== 'todos') {
      list = list.filter(o => o.categoria === filter.categoria);
    }
    if (filter?.query) {
      const q = filter.query.toLowerCase();
      list = list.filter(o => o.titulo.toLowerCase().includes(q) || o.descricao.toLowerCase().includes(q) || o.organizacao.toLowerCase().includes(q));
    }
    return list;
  }

  public saveOpportunity(oppData: Omit<Opportunity, 'id'> & { id?: string }, adminUserId: string): Opportunity {
    if (oppData.id) {
      const opp = this.data.opportunities.find(o => o.id === oppData.id);
      if (!opp) throw new Error('Oportunidade não encontrada');
      opp.titulo = oppData.titulo;
      opp.categoria = oppData.categoria;
      opp.organizacao = oppData.organizacao;
      opp.descricao = oppData.descricao;
      opp.link = oppData.link;
      opp.dataInicio = oppData.dataInicio;
      opp.localizacao = oppData.localizacao;
      opp.destaque = oppData.destaque;
      this.persist();
      return opp;
    } else {
      const newOpp: Opportunity = {
        id: `opp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        titulo: oppData.titulo,
        categoria: oppData.categoria,
        organizacao: oppData.organizacao,
        descricao: oppData.descricao,
        link: oppData.link,
        dataInicio: oppData.dataInicio,
        localizacao: oppData.localizacao,
        destaque: oppData.destaque || false,
        criadoPor: adminUserId,
      };
      this.data.opportunities.unshift(newOpp);
      this.persist();
      return newOpp;
    }
  }

  public deleteOpportunity(oppId: string): boolean {
    const idx = this.data.opportunities.findIndex(o => o.id === oppId);
    if (idx >= 0) {
      this.data.opportunities.splice(idx, 1);
      this.persist();
      return true;
    }
    return false;
  }

  // --- Support Tickets (NEXO SUPORTE) ---
  public getTicketsByUserId(userId: string): SupportTicket[] {
    // Note: Do NOT expose internal priority classification to client!
    return this.data.supportTickets
      .filter(t => t.userId === userId)
      .map(t => {
        // Mask internal classification for regular clients as required
        const copy = { ...t };
        delete (copy as any).prioridade;
        delete (copy as any).prioridadeMotivo;
        return copy;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getAllTicketsForAdmin(): SupportTicket[] {
    // Admin gets full data, including internal automated priority classification!
    return [...this.data.supportTickets].sort((a, b) => {
      const priorityOrder: Record<TicketPriority, number> = { alta: 3, media: 2, baixa: 1 };
      const diff = priorityOrder[b.prioridade] - priorityOrder[a.prioridade];
      if (diff !== 0) return diff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  public createTicket(userId: string, userEmail: string, userName: string, data: {
    assunto: string;
    categoria: string;
    mensagem: string;
  }): SupportTicket {
    const now = new Date().toISOString();
    const classification = classifyTicketPriority(data.assunto, data.categoria, data.mensagem, now);
    const count = this.data.supportTickets.length + 1001;
    const ticketNumber = `NX-2026-${count}`;

    const newTicket: SupportTicket = {
      id: `tkt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      ticketNumber,
      userId,
      userEmail,
      userName,
      assunto: data.assunto,
      categoria: data.categoria,
      mensagem: data.mensagem,
      status: 'pendente',
      prioridade: classification.prioridade,
      prioridadeMotivo: classification.motivo,
      respostas: [],
      createdAt: now,
      updatedAt: now,
    };

    this.data.supportTickets.unshift(newTicket);
    this.persist();

    this.logAudit({
      userId,
      userEmail,
      action: 'CHAMADO_SUPORTE_ABERTO',
      resource: 'SUPPORT_TICKETS',
      details: `Chamado ${ticketNumber} criado. Classificação interna calculada: ${classification.prioridade.toUpperCase()}`,
    });

    return newTicket;
  }

  public replyTicket(ticketId: string, autorId: string, autorNome: string, autorRole: 'client' | 'admin', mensagem: string, novoStatus?: TicketStatus): SupportTicket {
    const ticket = this.data.supportTickets.find(t => t.id === ticketId);
    if (!ticket) throw new Error('Chamado não localizado.');

    const now = new Date().toISOString();
    ticket.respostas.push({
      id: `resp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      autorId,
      autorNome,
      autorRole,
      mensagem,
      data: now,
    });

    if (novoStatus) {
      ticket.status = novoStatus;
    } else if (autorRole === 'admin') {
      ticket.status = 'aguardando_resposta';
    } else {
      ticket.status = 'em_andamento';
    }

    ticket.updatedAt = now;
    this.persist();

    this.logAudit({
      userId: autorId,
      action: 'RESPOSTA_SUPORTE',
      resource: 'SUPPORT_TICKETS',
      details: `Resposta adicionada ao chamado ${ticket.ticketNumber} por ${autorNome} (${autorRole}). Status: ${ticket.status}`,
    });

    return ticket;
  }

  public updateTicketStatus(ticketId: string, status: TicketStatus, adminUserId: string): SupportTicket {
    const ticket = this.data.supportTickets.find(t => t.id === ticketId);
    if (!ticket) throw new Error('Chamado não encontrado.');
    ticket.status = status;
    ticket.updatedAt = new Date().toISOString();
    this.persist();

    this.logAudit({
      userId: adminUserId,
      action: 'STATUS_CHAMADO_ALTERADO',
      resource: 'SUPPORT_TICKETS',
      details: `Status do chamado ${ticket.ticketNumber} alterado para "${status}".`,
    });

    return ticket;
  }

  // --- Network Profiles (NEXO NETWORK) ---
  public getNetworkProfiles(): NetworkProfile[] {
    return this.data.networkProfiles.filter(p => p.visivel);
  }

  public saveNetworkProfile(userId: string, profileData: Partial<NetworkProfile>): NetworkProfile {
    let profile = this.data.networkProfiles.find(p => p.userId === userId);
    const now = new Date().toISOString();

    if (profile) {
      if (profileData.nomePublico !== undefined) profile.nomePublico = profileData.nomePublico;
      if (profileData.tipoPerfil !== undefined) profile.tipoPerfil = profileData.tipoPerfil;
      if (profileData.biografia !== undefined) profile.biografia = profileData.biografia;
      if (profileData.areaAtuacao !== undefined) profile.areaAtuacao = profileData.areaAtuacao;
      if (profileData.habilidades !== undefined) profile.habilidades = profileData.habilidades;
      if (profileData.contatoAutorizado !== undefined) profile.contatoAutorizado = profileData.contatoAutorizado;
      if (profileData.projetosPublicos !== undefined) profile.projetosPublicos = profileData.projetosPublicos;
      if (profileData.visivel !== undefined) profile.visivel = profileData.visivel;
    } else {
      profile = {
        id: `net_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        userId,
        nomePublico: profileData.nomePublico || 'Membro da Comunidade NEXO',
        tipoPerfil: profileData.tipoPerfil || 'jovem',
        biografia: profileData.biografia || '',
        areaAtuacao: profileData.areaAtuacao || 'Inovação e Empreendedorismo',
        habilidades: profileData.habilidades || [],
        contatoAutorizado: profileData.contatoAutorizado || '',
        projetosPublicos: profileData.projetosPublicos || [],
        visivel: profileData.visivel ?? true,
        createdAt: now,
      };
      this.data.networkProfiles.push(profile);
    }

    this.persist();
    return profile;
  }

  // --- Platform Statistics (For Admin and Public overview) ---
  public getPlatformStats() {
    const totalUsers = this.data.users.length;
    const totalCompanies = this.data.companies.length;
    const totalProjects = this.data.projects.length;
    const totalOpportunities = this.data.opportunities.length;
    const totalTickets = this.data.supportTickets.length;
    const pendingTickets = this.data.supportTickets.filter(t => t.status === 'pendente' || t.status === 'em_andamento').length;
    const highPriorityTickets = this.data.supportTickets.filter(t => t.prioridade === 'alta' && t.status !== 'concluido').length;

    return {
      totalUsers,
      totalCompanies,
      totalProjects,
      totalOpportunities,
      totalTickets,
      pendingTickets,
      highPriorityTickets,
      activeUsers: this.data.users.filter(u => u.status === 'active').length,
    };
  }
}

export const db = new Database();
