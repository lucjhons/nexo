import express, { Request, Response, NextFunction } from 'express';
import { db, User } from './db.js';
import { verifyPassword, generateSessionToken, generateVerificationCode } from './crypto.js';
import { EmailService } from './services/emailService.js';
import { analyzeBusinessWithAI, SanitizedBusinessData } from './gemini.js';

export const router = express.Router();

// Configuration constant required by user specifications:
// "WHATSAPP_SUPORTE = 'INSERIR_NUMERO_OFICIAL_AQUI'
// Não inventar um número de telefone. O número deverá ser configurado posteriormente."
export const WHATSAPP_SUPORTE = process.env.WHATSAPP_SUPORTE || 'INSERIR_NUMERO_OFICIAL_AQUI';

// In-memory token-to-user store for authenticating requests
const activeSessions: Map<string, { userId: string; createdAt: number }> = new Map();

// Helper to extract authenticated user
export function getAuthenticatedUser(req: Request): User | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.substring(7).trim();
  const session = activeSessions.get(token);
  if (!session) return null;

  // Session expiry: 7 days
  if (Date.now() - session.createdAt > 7 * 24 * 60 * 60 * 1000) {
    activeSessions.delete(token);
    return null;
  }

  const user = db.findUserById(session.userId);
  if (!user || user.status === 'suspended') return null;

  return user;
}

// Middleware: Require Authenticated User
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Sessão expirada ou não autenticada. Por favor, faça login novamente.' });
    return;
  }
  (req as any).user = user;
  next();
}

// Middleware: Require Admin Role with strict authorization
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const user = getAuthenticatedUser(req);
  if (!user || user.role !== 'admin') {
    res.status(403).json({ error: 'Acesso restrito. Esta área requer privilégios administrativos autorizados.' });
    return;
  }
  (req as any).user = user;
  next();
}

// -------------------------------------------------------------
// 1. PUBLIC CONFIGURATION
// -------------------------------------------------------------
router.get('/config/public', (_req: Request, res: Response) => {
  res.json({
    slogan: 'Conectando ideias, negócios e oportunidades.',
    whatsappSuporte: WHATSAPP_SUPORTE,
    smtpConfigured: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER),
  });
});

// -------------------------------------------------------------
// 2. AUTHENTICATION & SESSIONS
// -------------------------------------------------------------
router.post('/auth/register', (req: Request, res: Response) => {
  try {
    const { name, email, password, role, clientType } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'A senha deve conter no mínimo 6 caracteres.' });
    }

    // Email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Formato de e-mail inválido.' });
    }

    // Check duplicate email
    const existing = db.findUserByEmail(email);
    if (existing) {
      return res.status(409).json({
        error: 'Este endereço de e-mail já possui uma conta no NEXO. Por favor, utilize a tela de login.',
        alreadyRegistered: true,
      });
    }

    const newUser = db.createUser({
      name,
      email,
      password,
      role: role === 'admin' ? 'client' : (role || 'client'), // Security: cannot self-register as admin
      clientType: clientType || null,
    });

    const token = generateSessionToken();
    activeSessions.set(token, { userId: newUser.id, createdAt: Date.now() });

    return res.status(201).json({
      message: 'Cadastro realizado com sucesso!',
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        clientType: newUser.clientType,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao realizar cadastro.' });
  }
});

router.post('/auth/login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
    }

    const user = db.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Credenciais incorretas. Verifique seu e-mail e senha.' });
    }

    // Check if account is temporarily locked
    if (user.lockedUntil && user.lockedUntil > Date.now()) {
      const waitMinutes = Math.ceil((user.lockedUntil - Date.now()) / 60000);
      return res.status(403).json({
        error: `Conta temporariamente bloqueada por excesso de tentativas incorretas. Aguarde ${waitMinutes} minuto(s) para tentar novamente.`,
      });
    }

    // Check if suspended
    if (user.status === 'suspended') {
      return res.status(403).json({
        error: 'Sua conta foi suspensa pela administração da plataforma. Entre em contato com o suporte para mais esclarecimentos.',
      });
    }

    const isValid = verifyPassword(password, user.passwordHash);
    if (!isValid) {
      db.recordFailedLogin(user.email);
      return res.status(401).json({ error: 'Credenciais incorretas. Verifique seu e-mail e senha.' });
    }

    // Successful login
    db.updateUserLoginSuccess(user.id);
    const token = generateSessionToken();
    activeSessions.set(token, { userId: user.id, createdAt: Date.now() });

    db.logAudit({
      userId: user.id,
      userEmail: user.email,
      action: 'LOGIN_SUCESSO',
      resource: 'AUTH',
      details: `Login efetuado com sucesso via ${user.role}.`,
      ip: req.ip,
    });

    return res.json({
      message: 'Login realizado com sucesso.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        clientType: user.clientType,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro no processo de login.' });
  }
});

router.get('/auth/me', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Não autenticado.' });
  }

  const company = user.clientType === 'business' ? db.getCompanyByUserId(user.id) : null;
  const projects = user.clientType === 'jovem' ? db.getProjectsByUserId(user.id) : [];

  return res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      clientType: user.clientType,
    },
    company,
    projects,
  });
});

router.post('/auth/select-type', requireAuth, (req: Request, res: Response) => {
  try {
    const user = (req as any).user as User;
    const { clientType } = req.body;

    if (clientType !== 'jovem' && clientType !== 'business') {
      return res.status(400).json({ error: 'Tipo inválido. Escolha entre "jovem" ou "business".' });
    }

    db.updateUserClientType(user.id, clientType);

    return res.json({
      message: `Ambiente ${clientType === 'jovem' ? 'NEXO JOVEM' : 'NEXO BUSINESS'} selecionado com sucesso.`,
      clientType,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao selecionar tipo de ambiente.' });
  }
});

router.post('/auth/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    activeSessions.delete(token);
  }
  return res.json({ message: 'Sessão encerrada com sucesso.' });
});

// -------------------------------------------------------------
// 3. RECUPERAÇÃO DE SENHA — ESQUECI MINHA SENHA
// -------------------------------------------------------------
router.post('/auth/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Informe o e-mail cadastrado.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = db.findUserByEmail(cleanEmail);

    // Rule: "Utilizar mensagens que não revelem se um e-mail está ou não cadastrado"
    // Generate code and record only if user exists
    let sendResult: any = { success: false, configured: false };
    if (user) {
      const rawCode = generateVerificationCode();
      db.createPasswordReset(cleanEmail, rawCode);

      // Attempt real email send via configured SMTP
      sendResult = await EmailService.sendPasswordResetCode(cleanEmail, rawCode);

      db.logAudit({
        userId: user.id,
        userEmail: cleanEmail,
        action: 'SOLICITACAO_RECUPERACAO_SENHA',
        resource: 'AUTH',
        details: `Código de recuperação gerado para ${cleanEmail}. SMTP configurado: ${sendResult.configured}`,
        ip: req.ip,
      });
    }

    return res.json({
      message: 'Se o e-mail informado estiver registrado em nossa plataforma, as instruções e o código de recuperação foram encaminhados.',
      emailConfigured: sendResult.configured,
      adminNotice: sendResult.adminNotice,
      // For developer/demonstration environment inspection when SMTP is unconfigured:
      devCode: sendResult.devCode,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao processar solicitação de recuperação.' });
  }
});

router.post('/auth/reset-password', (req: Request, res: Response) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'E-mail, código de verificação e nova senha são obrigatórios.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'A nova senha deve ter no mínimo 6 caracteres.' });
    }

    db.verifyAndResetPassword(email, code.trim(), newPassword);

    return res.json({
      message: 'Senha alterada com sucesso! Você já pode realizar o login com suas novas credenciais.',
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Erro ao redefinir senha.' });
  }
});

// -------------------------------------------------------------
// 4. NEXO BUSINESS — GESTÃO EMPRESARIAL
// -------------------------------------------------------------
router.get('/business/company', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const company = db.getCompanyByUserId(user.id);
  return res.json({ company });
});

router.post('/business/company', requireAuth, (req: Request, res: Response) => {
  try {
    const user = (req as any).user as User;
    const company = db.saveCompany(user.id, req.body);
    return res.json({
      message: 'Dados empresariais atualizados com sucesso.',
      company,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao salvar empresa.' });
  }
});

// Products & Inventory
router.get('/business/products', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const company = db.getCompanyByUserId(user.id);
  if (!company) return res.json({ products: [] });

  const products = db.getProducts(company.id, user.id);
  return res.json({ products });
});

router.post('/business/products', requireAuth, (req: Request, res: Response) => {
  try {
    const user = (req as any).user as User;
    const company = db.getCompanyByUserId(user.id);
    if (!company) {
      return res.status(400).json({ error: 'Cadastre sua empresa primeiro antes de gerenciar produtos.' });
    }

    const product = db.saveProduct(company.id, user.id, req.body);
    return res.json({ message: 'Produto salvo com sucesso.', product });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao salvar produto.' });
  }
});

router.delete('/business/products/:id', requireAuth, (req: Request, res: Response) => {
  try {
    const user = (req as any).user as User;
    const company = db.getCompanyByUserId(user.id);
    if (!company) return res.status(400).json({ error: 'Empresa não encontrada.' });

    const success = db.deleteProduct(req.params.id, company.id, user.id);
    return res.json({ success, message: 'Produto excluído com sucesso.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao excluir produto.' });
  }
});

// Sales
router.get('/business/sales', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const company = db.getCompanyByUserId(user.id);
  if (!company) return res.json({ sales: [] });

  const sales = db.getSales(company.id, user.id);
  return res.json({ sales });
});

router.post('/business/sales', requireAuth, (req: Request, res: Response) => {
  try {
    const user = (req as any).user as User;
    const company = db.getCompanyByUserId(user.id);
    if (!company) return res.status(400).json({ error: 'Empresa não encontrada.' });

    const sale = db.createSale(company.id, user.id, req.body);
    return res.status(201).json({ message: 'Venda registrada com sucesso e estoque atualizado.', sale });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Erro ao registrar venda.' });
  }
});

// Expenses
router.get('/business/expenses', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const company = db.getCompanyByUserId(user.id);
  if (!company) return res.json({ expenses: [] });

  const expenses = db.getExpenses(company.id, user.id);
  return res.json({ expenses });
});

router.post('/business/expenses', requireAuth, (req: Request, res: Response) => {
  try {
    const user = (req as any).user as User;
    const company = db.getCompanyByUserId(user.id);
    if (!company) return res.status(400).json({ error: 'Empresa não encontrada.' });

    const expense = db.saveExpense(company.id, user.id, req.body);
    return res.json({ message: 'Despesa registrada com sucesso.', expense });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao salvar despesa.' });
  }
});

router.delete('/business/expenses/:id', requireAuth, (req: Request, res: Response) => {
  try {
    const user = (req as any).user as User;
    const company = db.getCompanyByUserId(user.id);
    if (!company) return res.status(400).json({ error: 'Empresa não encontrada.' });

    const success = db.deleteExpense(req.params.id, company.id, user.id);
    return res.json({ success, message: 'Despesa excluída com sucesso.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao excluir despesa.' });
  }
});

// Clients CRM
router.get('/business/clients', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const company = db.getCompanyByUserId(user.id);
  if (!company) return res.json({ clients: [] });

  const clients = db.getClients(company.id, user.id);
  return res.json({ clients });
});

router.post('/business/clients', requireAuth, (req: Request, res: Response) => {
  try {
    const user = (req as any).user as User;
    const company = db.getCompanyByUserId(user.id);
    if (!company) return res.status(400).json({ error: 'Empresa não encontrada.' });

    const client = db.saveClient(company.id, user.id, req.body);
    return res.json({ message: 'Cliente cadastrado com sucesso.', client });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao salvar cliente.' });
  }
});

router.delete('/business/clients/:id', requireAuth, (req: Request, res: Response) => {
  try {
    const user = (req as any).user as User;
    const company = db.getCompanyByUserId(user.id);
    if (!company) return res.status(400).json({ error: 'Empresa não encontrada.' });

    const success = db.deleteClient(req.params.id, company.id, user.id);
    return res.json({ success, message: 'Cliente excluído.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao excluir cliente.' });
  }
});

// Goals
router.get('/business/goals', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const company = db.getCompanyByUserId(user.id);
  if (!company) return res.json({ goals: [] });

  const goals = db.getGoals(company.id, user.id);
  return res.json({ goals });
});

router.post('/business/goals', requireAuth, (req: Request, res: Response) => {
  try {
    const user = (req as any).user as User;
    const company = db.getCompanyByUserId(user.id);
    if (!company) return res.status(400).json({ error: 'Empresa não encontrada.' });

    const goal = db.saveGoal(company.id, user.id, req.body);
    return res.json({ message: 'Meta comercial salva.', goal });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao salvar meta.' });
  }
});

router.delete('/business/goals/:id', requireAuth, (req: Request, res: Response) => {
  try {
    const user = (req as any).user as User;
    const company = db.getCompanyByUserId(user.id);
    if (!company) return res.status(400).json({ error: 'Empresa não encontrada.' });

    const success = db.deleteGoal(req.params.id, company.id, user.id);
    return res.json({ success, message: 'Meta removida.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao excluir meta.' });
  }
});

// Financial Reports & Analytics Summary
router.get('/business/reports', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const company = db.getCompanyByUserId(user.id);
  if (!company) return res.json({ report: null });

  const sales = db.getSales(company.id, user.id);
  const expenses = db.getExpenses(company.id, user.id);
  const products = db.getProducts(company.id, user.id);
  const clients = db.getClients(company.id, user.id);

  const totalVendas = sales.reduce((acc, s) => acc + s.valorTotal, 0);
  const totalDespesas = expenses.reduce((acc, e) => acc + e.valor, 0);
  const totalDespesasPagas = expenses.filter(e => e.status === 'pago').reduce((acc, e) => acc + e.valor, 0);
  const totalDespesasPendentes = expenses.filter(e => e.status === 'pendente').reduce((acc, e) => acc + e.valor, 0);

  const resultadoLiquido = totalVendas - totalDespesas;
  const margemLucroPercentual = totalVendas > 0 ? (resultadoLiquido / totalVendas) * 100 : 0;
  const ticketMedio = sales.length > 0 ? totalVendas / sales.length : 0;

  // Product sales aggregation
  const productSalesMap: Record<string, { nome: string; quantidade: number; receita: number }> = {};
  for (const sale of sales) {
    for (const item of sale.items) {
      if (!productSalesMap[item.produtoId]) {
        productSalesMap[item.produtoId] = { nome: item.produtoNome, quantidade: 0, receita: 0 };
      }
      productSalesMap[item.produtoId].quantidade += item.quantidade;
      productSalesMap[item.produtoId].receita += item.subtotal;
    }
  }

  const produtosMaisVendidos = Object.values(productSalesMap)
    .sort((a, b) => b.receita - a.receita)
    .slice(0, 5);

  const produtosBaixoEstoque = products.filter(p => p.estoqueAtual <= p.estoqueMinimo);

  // Expense categories aggregation
  const despesasPorCategoria: Record<string, number> = {};
  for (const exp of expenses) {
    despesasPorCategoria[exp.categoria] = (despesasPorCategoria[exp.categoria] || 0) + exp.valor;
  }

  // Payment methods breakdown
  const formasPagamentoMap: Record<string, number> = {};
  for (const sale of sales) {
    formasPagamentoMap[sale.formaPagamento] = (formasPagamentoMap[sale.formaPagamento] || 0) + sale.valorTotal;
  }

  return res.json({
    report: {
      totalVendas,
      totalDespesas,
      totalDespesasPagas,
      totalDespesasPendentes,
      resultadoLiquido,
      margemLucroPercentual,
      ticketMedio,
      quantidadeVendas: sales.length,
      quantidadeClientes: clients.length,
      produtosCadastrados: products.length,
      produtosMaisVendidos,
      produtosBaixoEstoque,
      despesasPorCategoria,
      formasPagamentoMap,
    },
  });
});

// -------------------------------------------------------------
// 5. NEXO INTELIGÊNCIA — ANÁLISE DE DADOS E IA
// -------------------------------------------------------------
router.post('/intelligence/analyze', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as User;
    const company = db.getCompanyByUserId(user.id);
    const { userQuestion } = req.body;

    if (!company) {
      return res.status(400).json({ error: 'Nenhuma empresa cadastrada para realizar análise financeira.' });
    }

    const sales = db.getSales(company.id, user.id);
    const expenses = db.getExpenses(company.id, user.id);
    const products = db.getProducts(company.id, user.id);
    const clients = db.getClients(company.id, user.id);

    const totalVendas = sales.reduce((acc, s) => acc + s.valorTotal, 0);
    const totalDespesas = expenses.reduce((acc, e) => acc + e.valor, 0);
    const resultadoLiquido = totalVendas - totalDespesas;
    const margemLucroPercentual = totalVendas > 0 ? (resultadoLiquido / totalVendas) * 100 : 0;
    const ticketMedio = sales.length > 0 ? totalVendas / sales.length : 0;

    const productSalesMap: Record<string, { nome: string; quantidade: number; receita: number }> = {};
    for (const sale of sales) {
      for (const item of sale.items) {
        if (!productSalesMap[item.produtoId]) {
          productSalesMap[item.produtoId] = { nome: item.produtoNome, quantidade: 0, receita: 0 };
        }
        productSalesMap[item.produtoId].quantidade += item.quantidade;
        productSalesMap[item.produtoId].receita += item.subtotal;
      }
    }

    const despesasPorCategoria: Record<string, number> = {};
    for (const exp of expenses) {
      despesasPorCategoria[exp.categoria] = (despesasPorCategoria[exp.categoria] || 0) + exp.valor;
    }

    // Strict PII compliance: only pass sanitized financial aggregates
    const sanitizedData: SanitizedBusinessData = {
      nomeEmpresaOuProjeto: company.nomeFantasia || company.razaoSocial,
      ramoAtividade: company.categoria || company.tipoNegocio,
      totalVendas,
      totalDespesas,
      resultadoLiquido,
      margemLucroPercentual,
      produtosMaisVendidos: Object.values(productSalesMap).sort((a, b) => b.receita - a.receita).slice(0, 5),
      produtosBaixoEstoque: products.filter(p => p.estoqueAtual <= p.estoqueMinimo).map(p => ({
        nome: p.nome,
        estoqueAtual: p.estoqueAtual,
        estoqueMinimo: p.estoqueMinimo,
      })),
      despesasPorCategoria,
      totalClientesAtivos: clients.length,
      ticketMedio,
    };

    const aiResult = await analyzeBusinessWithAI(sanitizedData, userQuestion);

    return res.json({
      success: true,
      analysis: aiResult.text,
      sanitizedMetrics: sanitizedData,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao gerar análise inteligente.' });
  }
});

// -------------------------------------------------------------
// 6. NEXO JOVEM — CRIAÇÃO DE PROJETOS E SIMULADOR
// -------------------------------------------------------------
router.get('/jovem/projects', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const projects = db.getProjectsByUserId(user.id);
  return res.json({ projects });
});

router.post('/jovem/projects', requireAuth, (req: Request, res: Response) => {
  try {
    const user = (req as any).user as User;
    const project = db.saveProjectJovem(user.id, req.body);
    return res.json({ message: 'Projeto de negócio salvo com sucesso.', project });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao salvar projeto.' });
  }
});

// -------------------------------------------------------------
// 7. NEXO LOCAL & NEXO NETWORK
// -------------------------------------------------------------
router.get('/opportunities', (req: Request, res: Response) => {
  const { categoria, query } = req.query;
  const list = db.getOpportunities({
    categoria: categoria ? String(categoria) : undefined,
    query: query ? String(query) : undefined,
  });
  return res.json({ opportunities: list });
});

router.get('/network/profiles', (_req: Request, res: Response) => {
  const profiles = db.getNetworkProfiles();
  return res.json({ profiles });
});

router.post('/network/profile', requireAuth, (req: Request, res: Response) => {
  try {
    const user = (req as any).user as User;
    const profile = db.saveNetworkProfile(user.id, req.body);
    return res.json({ message: 'Perfil de networking atualizado.', profile });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao salvar perfil.' });
  }
});

// -------------------------------------------------------------
// 8. NEXO SUPORTE (ÁREA DO CLIENTE)
// -------------------------------------------------------------
router.get('/support/tickets', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const tickets = db.getTicketsByUserId(user.id);
  return res.json({ tickets });
});

router.post('/support/tickets', requireAuth, (req: Request, res: Response) => {
  try {
    const user = (req as any).user as User;
    const { assunto, categoria, mensagem } = req.body;

    if (!assunto || !categoria || !mensagem) {
      return res.status(400).json({ error: 'Assunto, categoria e mensagem são obrigatórios.' });
    }

    const ticket = db.createTicket(user.id, user.email, user.name, { assunto, categoria, mensagem });
    
    // Mask internal priority for response to client
    const clientCopy = { ...ticket };
    delete (clientCopy as any).prioridade;
    delete (clientCopy as any).prioridadeMotivo;

    return res.status(201).json({ message: 'Chamado de suporte registrado.', ticket: clientCopy });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao abrir chamado.' });
  }
});

router.post('/support/tickets/:id/reply', requireAuth, (req: Request, res: Response) => {
  try {
    const user = (req as any).user as User;
    const { mensagem } = req.body;
    if (!mensagem) {
      return res.status(400).json({ error: 'Mensagem de resposta não pode estar vazia.' });
    }

    const ticket = db.replyTicket(req.params.id, user.id, user.name, 'client', mensagem);
    return res.json({ message: 'Resposta enviada com sucesso.', ticket });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao responder chamado.' });
  }
});

// -------------------------------------------------------------
// 9. PAINEL ADMINISTRATIVO (ROLE === 'ADMIN' ONLY)
// -------------------------------------------------------------
router.get('/admin/stats', requireAdmin, (_req: Request, res: Response) => {
  const stats = db.getPlatformStats();
  return res.json({ stats });
});

router.get('/admin/users', requireAdmin, (_req: Request, res: Response) => {
  // Privacy rule: Only account metadata is listed (NO private financial data or CPF)
  const users = db.listAllUsersForAdmin();
  return res.json({ users });
});

router.post('/admin/users/:id/status', requireAdmin, (req: Request, res: Response) => {
  try {
    const admin = (req as any).user as User;
    const { status } = req.body;

    if (status !== 'active' && status !== 'suspended') {
      return res.status(400).json({ error: 'Status inválido. Escolha entre "active" ou "suspended".' });
    }

    const updated = db.setAccountStatus(req.params.id, status, admin.id);
    return res.json({ message: `Conta ${status === 'active' ? 'reativada' : 'suspensa'} com sucesso.`, user: updated });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Erro ao alterar status da conta.' });
  }
});

// Admin Support Queue (Includes automatic priority classification ALTA / MÉDIA / BAIXA)
router.get('/admin/tickets', requireAdmin, (_req: Request, res: Response) => {
  const tickets = db.getAllTicketsForAdmin();
  return res.json({ tickets });
});

router.post('/admin/tickets/:id/reply', requireAdmin, (req: Request, res: Response) => {
  try {
    const admin = (req as any).user as User;
    const { mensagem, status } = req.body;

    if (!mensagem) {
      return res.status(400).json({ error: 'A mensagem de resposta é obrigatória.' });
    }

    const ticket = db.replyTicket(req.params.id, admin.id, admin.name, 'admin', mensagem, status);
    return res.json({ message: 'Resposta administrativa registrada.', ticket });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao responder chamado.' });
  }
});

router.post('/admin/tickets/:id/status', requireAdmin, (req: Request, res: Response) => {
  try {
    const admin = (req as any).user as User;
    const { status } = req.body;
    const ticket = db.updateTicketStatus(req.params.id, status, admin.id);
    return res.json({ message: 'Status do chamado atualizado.', ticket });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao atualizar status.' });
  }
});

// Opportunities management by admin
router.post('/admin/opportunities', requireAdmin, (req: Request, res: Response) => {
  try {
    const admin = (req as any).user as User;
    const opp = db.saveOpportunity(req.body, admin.id);
    return res.json({ message: 'Oportunidade pública salva com sucesso.', opportunity: opp });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao salvar oportunidade.' });
  }
});

router.delete('/admin/opportunities/:id', requireAdmin, (req: Request, res: Response) => {
  try {
    const success = db.deleteOpportunity(req.params.id);
    return res.json({ success, message: 'Oportunidade removida com sucesso.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao excluir oportunidade.' });
  }
});

// Audit logs
router.get('/admin/audit-logs', requireAdmin, (_req: Request, res: Response) => {
  const logs = db.getAuditLogs(100);
  return res.json({ logs });
});
