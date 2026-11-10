import React, { useState, useEffect } from 'react';
import { Company, Product, Sale, Expense, Client, BusinessGoal, FinancialReport } from '../../types/index.js';
import { apiRequest } from '../../services/api.js';
import { 
  Building2, Package, ShoppingCart, TrendingDown, Users, Target, 
  BarChart3, Plus, Trash2, Edit2, AlertTriangle, CheckCircle, 
  ArrowRight, ShieldCheck, DollarSign, Calendar, Search, Filter, 
  CheckCircle2, RefreshCw, X
} from 'lucide-react';

export const NexoBusinessView: React.FC = () => {
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'produtos' | 'vendas' | 'despesas' | 'clientes' | 'metas' | 'relatorios' | 'wizard'>('dashboard');

  // Sub-data states
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [goals, setGoals] = useState<BusinessGoal[]>([]);
  const [report, setReport] = useState<FinancialReport | null>(null);

  // Wizard state (for 4-step guided onboarding)
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardData, setWizardData] = useState({
    razaoSocial: '',
    nomeFantasia: '',
    tipoNegocio: 'Comércio',
    categoria: 'Alimentos e Bebidas',
    descricao: '',
    cidade: '',
    estado: 'MG',
    tempoFuncionamento: '1 a 3 anos',
    numFuncionarios: '3 a 5',
    cnpj: '',
    cpfResponsavel: '',
    telefone: '',
    emailComercial: '',
    endereco: '',
    objetivos: [
      'Controle de vendas',
      'Controle de despesas',
      'Gestão de estoque',
      'Cadastro de clientes',
      'Análise financeira',
      'Relatórios empresariais'
    ],
  });

  // Modal states for CRUD operations
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);

  const [showSaleModal, setShowSaleModal] = useState(false);
  const [newSaleCustomer, setNewSaleCustomer] = useState('');
  const [newSalePayment, setNewSalePayment] = useState<Sale['formaPagamento']>('pix');
  const [newSaleItems, setNewSaleItems] = useState<Array<{ produtoId: string; produtoNome: string; quantidade: number; precoUnitario: number; subtotal: number }>>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedQuantity, setSelectedQuantity] = useState(1);

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Partial<Expense> | null>(null);

  const [showClientModal, setShowClientModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Partial<Client> | null>(null);

  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Partial<BusinessGoal> | null>(null);

  // Load all company data
  const loadCompanyData = async () => {
    try {
      setLoading(true);
      const res = await apiRequest<{ company: Company | null }>('/business/company');
      setCompany(res.company);

      if (!res.company) {
        setActiveTab('wizard');
      } else {
        // Pre-fill wizard with current data if user edits later
        setWizardData({
          razaoSocial: res.company.razaoSocial,
          nomeFantasia: res.company.nomeFantasia,
          tipoNegocio: res.company.tipoNegocio,
          categoria: res.company.categoria,
          descricao: res.company.descricao,
          cidade: res.company.cidade,
          estado: res.company.estado,
          tempoFuncionamento: res.company.tempoFuncionamento,
          numFuncionarios: res.company.numFuncionarios,
          cnpj: res.company.cnpj,
          cpfResponsavel: '', // masked for security
          telefone: res.company.telefone,
          emailComercial: res.company.emailComercial,
          endereco: res.company.endereco,
          objetivos: res.company.objetivos || [],
        });

        // Parallel load of business modules
        const [prodsRes, salesRes, expRes, cliRes, goalsRes, repRes] = await Promise.all([
          apiRequest<{ products: Product[] }>('/business/products'),
          apiRequest<{ sales: Sale[] }>('/business/sales'),
          apiRequest<{ expenses: Expense[] }>('/business/expenses'),
          apiRequest<{ clients: Client[] }>('/business/clients'),
          apiRequest<{ goals: BusinessGoal[] }>('/business/goals'),
          apiRequest<{ report: FinancialReport }>('/business/reports'),
        ]);

        setProducts(prodsRes.products || []);
        setSales(salesRes.sales || []);
        setExpenses(expRes.expenses || []);
        setClients(cliRes.clients || []);
        setGoals(goalsRes.goals || []);
        setReport(repRes.report || null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanyData();
  }, []);

  // Wizard submission
  const handleWizardSubmit = async () => {
    try {
      const res = await apiRequest<{ company: Company }>('/business/company', {
        method: 'POST',
        body: JSON.stringify(wizardData),
      });
      setCompany(res.company);
      setActiveTab('dashboard');
      loadCompanyData();
    } catch (err: any) {
      alert(err.message || 'Erro ao registrar empresa.');
    }
  };

  // Product Actions
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct?.nome || !editingProduct?.precoVenda) return;
    try {
      await apiRequest('/business/products', {
        method: 'POST',
        body: JSON.stringify(editingProduct),
      });
      setShowProductModal(false);
      setEditingProduct(null);
      loadCompanyData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Deseja realmente excluir este produto?')) return;
    try {
      await apiRequest(`/business/products/${id}`, { method: 'DELETE' });
      loadCompanyData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Sale Actions
  const handleAddItemToSale = () => {
    const prod = products.find(p => p.id === selectedProductId);
    if (!prod) return;

    if (prod.estoqueAtual < selectedQuantity) {
      alert(`Estoque insuficiente. Estoque disponível: ${prod.estoqueAtual} ${prod.unidade}.`);
      return;
    }

    const subtotal = prod.precoVenda * selectedQuantity;
    setNewSaleItems(prev => [
      ...prev,
      {
        produtoId: prod.id,
        produtoNome: prod.nome,
        quantidade: selectedQuantity,
        precoUnitario: prod.precoVenda,
        subtotal,
      },
    ]);

    setSelectedProductId('');
    setSelectedQuantity(1);
  };

  const handleRemoveItemFromSale = (index: number) => {
    setNewSaleItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleRegisterSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newSaleItems.length === 0) {
      alert('Adicione ao menos um produto para registrar a venda.');
      return;
    }

    try {
      const clientObj = clients.find(c => c.id === newSaleCustomer);
      await apiRequest('/business/sales', {
        method: 'POST',
        body: JSON.stringify({
          clienteId: clientObj?.id,
          clienteNome: clientObj?.nome,
          items: newSaleItems,
          formaPagamento: newSalePayment,
        }),
      });

      setShowSaleModal(false);
      setNewSaleItems([]);
      setNewSaleCustomer('');
      loadCompanyData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Expense Actions
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense?.descricao || !editingExpense?.valor) return;
    try {
      await apiRequest('/business/expenses', {
        method: 'POST',
        body: JSON.stringify(editingExpense),
      });
      setShowExpenseModal(false);
      setEditingExpense(null);
      loadCompanyData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Deseja excluir esta despesa?')) return;
    try {
      await apiRequest(`/business/expenses/${id}`, { method: 'DELETE' });
      loadCompanyData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Client Actions
  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient?.nome) return;
    try {
      await apiRequest('/business/clients', {
        method: 'POST',
        body: JSON.stringify(editingClient),
      });
      setShowClientModal(false);
      setEditingClient(null);
      loadCompanyData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (!confirm('Deseja remover este cliente?')) return;
    try {
      await apiRequest(`/business/clients/${id}`, { method: 'DELETE' });
      loadCompanyData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Goal Actions
  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGoal?.titulo || !editingGoal?.metaValor) return;
    try {
      await apiRequest('/business/goals', {
        method: 'POST',
        body: JSON.stringify(editingGoal),
      });
      setShowGoalModal(false);
      setEditingGoal(null);
      loadCompanyData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    if (!confirm('Deseja excluir esta meta?')) return;
    try {
      await apiRequest(`/business/goals/${id}`, { method: 'DELETE' });
      loadCompanyData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-sky-600" />
        <span>Carregando dados empresariais seguros...</span>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW: 4-STEP GUIDED ONBOARDING WIZARD
  // -------------------------------------------------------------
  if (activeTab === 'wizard' || !company) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
        
        {/* Wizard Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 text-xs font-semibold text-sky-700 dark:text-sky-300 mb-3">
            <Building2 className="w-3.5 h-3.5" />
            NEXO BUSINESS — Cadastro Guiado da Empresa
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Configure seu Espaço Empresarial Privado
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xl mx-auto">
            Siga os 4 passos para parametrizar seu ambiente de controle financeiro, estoque e vendas.
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
            <span className={wizardStep >= 1 ? 'text-sky-600 dark:text-sky-400' : ''}>1. Identificação</span>
            <span className={wizardStep >= 2 ? 'text-sky-600 dark:text-sky-400' : ''}>2. Complementares</span>
            <span className={wizardStep >= 3 ? 'text-sky-600 dark:text-sky-400' : ''}>3. Objetivos</span>
            <span className={wizardStep >= 4 ? 'text-sky-600 dark:text-sky-400' : ''}>4. Revisão</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-sky-600 transition-all duration-300 rounded-full"
              style={{ width: `${(wizardStep / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* Wizard Step 1: Identificação */}
        {wizardStep === 1 && (
          <div className="p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-5">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Etapa 1 — Identificação da Empresa
            </h2>
            <p className="text-xs text-slate-500">
              Forneça os dados principais da sua atividade comercial ou de serviços.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nome da Empresa / Razão Social *
                </label>
                <input
                  type="text"
                  required
                  value={wizardData.razaoSocial}
                  onChange={e => setWizardData({ ...wizardData, razaoSocial: e.target.value })}
                  placeholder="Ex: Aroma & Grão Cafeteria Ltda"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nome Fantasia
                </label>
                <input
                  type="text"
                  value={wizardData.nomeFantasia}
                  onChange={e => setWizardData({ ...wizardData, nomeFantasia: e.target.value })}
                  placeholder="Ex: Cafeteria Aroma"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tipo de Negócio
                </label>
                <select
                  value={wizardData.tipoNegocio}
                  onChange={e => setWizardData({ ...wizardData, tipoNegocio: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="Comércio">Comércio e Varejo</option>
                  <option value="Prestação de Serviços">Prestação de Serviços</option>
                  <option value="Alimentação e Bebidas">Alimentação e Bebidas</option>
                  <option value="Indústria / Produção">Indústria / Fabricação</option>
                  <option value="Tecnologia">Tecnologia e Serviços Digitais</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Categoria ou Segmento
                </label>
                <input
                  type="text"
                  value={wizardData.categoria}
                  onChange={e => setWizardData({ ...wizardData, categoria: e.target.value })}
                  placeholder="Ex: Cafés Especiais e Confeitaria"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tempo de Funcionamento
                </label>
                <select
                  value={wizardData.tempoFuncionamento}
                  onChange={e => setWizardData({ ...wizardData, tempoFuncionamento: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="Menos de 6 meses">Menos de 6 meses</option>
                  <option value="6 meses a 1 ano">6 meses a 1 ano</option>
                  <option value="1 a 3 anos">1 a 3 anos</option>
                  <option value="Mais de 3 anos">Mais de 3 anos</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Quantidade de Funcionários
                </label>
                <select
                  value={wizardData.numFuncionarios}
                  onChange={e => setWizardData({ ...wizardData, numFuncionarios: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="Apenas o fundador (1)">Apenas o fundador (1)</option>
                  <option value="2 a 4 funcionários">2 a 4 funcionários</option>
                  <option value="5 a 10 funcionários">5 a 10 funcionários</option>
                  <option value="Mais de 10 funcionários">Mais de 10 funcionários</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Descrição da Atividade
                </label>
                <textarea
                  rows={2}
                  value={wizardData.descricao}
                  onChange={e => setWizardData({ ...wizardData, descricao: e.target.value })}
                  placeholder="Resuma o que sua empresa oferece e seu diferencial..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Cidade
                </label>
                <input
                  type="text"
                  value={wizardData.cidade}
                  onChange={e => setWizardData({ ...wizardData, cidade: e.target.value })}
                  placeholder="Ex: Belo Horizonte"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Estado (UF)
                </label>
                <input
                  type="text"
                  maxLength={2}
                  value={wizardData.estado}
                  onChange={e => setWizardData({ ...wizardData, estado: e.target.value.toUpperCase() })}
                  placeholder="Ex: MG"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500 uppercase"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  if (!wizardData.razaoSocial) {
                    alert('Informe a Razão Social ou Nome da Empresa.');
                    return;
                  }
                  setWizardStep(2);
                }}
                className="px-5 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors"
              >
                Avançar para Etapa 2
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Wizard Step 2: Informações Complementares & Proteção de CPF */}
        {wizardStep === 2 && (
          <div className="p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-5">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Etapa 2 — Informações Complementares e Proteção de Dados
            </h2>
            
            <div className="p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-xs text-sky-800 dark:text-sky-300 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong>Garantia de Sigilo & LGPD:</strong> O CPF do responsável é criptografado com chave militar AES-256 no backend. Nunca é exibido de forma integral e jamais fica visível para o painel administrativo.
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  CNPJ (opcional para quem opera informal)
                </label>
                <input
                  type="text"
                  value={wizardData.cnpj}
                  onChange={e => setWizardData({ ...wizardData, cnpj: e.target.value })}
                  placeholder="00.000.000/0001-00"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  CPF do Responsável (Criptografia AES-256)
                </label>
                <input
                  type="text"
                  value={wizardData.cpfResponsavel}
                  onChange={e => setWizardData({ ...wizardData, cpfResponsavel: e.target.value })}
                  placeholder="000.000.000-00"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Exibição mascarada automática para segurança.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Telefone Comercial
                </label>
                <input
                  type="text"
                  value={wizardData.telefone}
                  onChange={e => setWizardData({ ...wizardData, telefone: e.target.value })}
                  placeholder="(00) 00000-0000"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  E-mail Comercial
                </label>
                <input
                  type="email"
                  value={wizardData.emailComercial}
                  onChange={e => setWizardData({ ...wizardData, emailComercial: e.target.value })}
                  placeholder="contato@suaempresa.com.br"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Endereço Comercial
                </label>
                <input
                  type="text"
                  value={wizardData.endereco}
                  onChange={e => setWizardData({ ...wizardData, endereco: e.target.value })}
                  placeholder="Rua, Número, Bairro, CEP"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setWizardStep(1)}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => setWizardStep(3)}
                className="px-5 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors"
              >
                Avançar para Etapa 3
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Wizard Step 3: Objetivos Empresariais */}
        {wizardStep === 3 && (
          <div className="p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-5">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Etapa 3 — Objetivos Empresariais e Ferramentas Desejadas
            </h2>
            <p className="text-xs text-slate-500">
              Selecione quais recursos prioritários você pretende utilizar na sua gestão:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { id: 'Controle de vendas', desc: 'Registro de pedidos, emissão e formas de pagamento' },
                { id: 'Controle de despesas', desc: 'Acompanhamento de custos fixos, variáveis e contas a pagar' },
                { id: 'Gestão de estoque', desc: 'Controle de quantidades e alerta de nível crítico' },
                { id: 'Cadastro de clientes', desc: 'Base de dados CRM e histórico de pedidos' },
                { id: 'Análise financeira', desc: 'Cálculo de margens, faturamento líquido e ticket médio' },
                { id: 'Relatórios empresariais', desc: 'Demonstrativos e visão consolidada de desempenho' },
                { id: 'Organização e planejamento', desc: 'Metas comerciais e estratégias de crescimento' },
              ].map(item => {
                const checked = wizardData.objetivos.includes(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (checked) {
                        setWizardData({ ...wizardData, objetivos: wizardData.objetivos.filter(o => o !== item.id) });
                      } else {
                        setWizardData({ ...wizardData, objetivos: [...wizardData.objetivos, item.id] });
                      }
                    }}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${checked ? 'border-sky-500 bg-sky-50/40 dark:bg-sky-950/20' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {}}
                      className="mt-0.5 rounded text-sky-600 focus:ring-sky-500"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">{item.id}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{item.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setWizardStep(2)}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => setWizardStep(4)}
                className="px-5 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors"
              >
                Avançar para Revisão
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Wizard Step 4: Revisão e Confirmação */}
        {wizardStep === 4 && (
          <div className="p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Etapa 4 — Revisão das Informações e Confirmação
            </h2>
            <p className="text-xs text-slate-500">
              Confira os dados cadastrados antes de criar seu espaço empresarial seguro.
            </p>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500">Razão Social:</span>
                  <div className="font-semibold text-slate-900 dark:text-white">{wizardData.razaoSocial}</div>
                </div>
                <div>
                  <span className="text-slate-500">Nome Fantasia:</span>
                  <div className="font-semibold text-slate-900 dark:text-white">{wizardData.nomeFantasia || '—'}</div>
                </div>
                <div>
                  <span className="text-slate-500">Tipo / Segmento:</span>
                  <div className="font-semibold text-slate-900 dark:text-white">{wizardData.tipoNegocio} · {wizardData.categoria}</div>
                </div>
                <div>
                  <span className="text-slate-500">Localização:</span>
                  <div className="font-semibold text-slate-900 dark:text-white">{wizardData.cidade}/{wizardData.estado}</div>
                </div>
                <div>
                  <span className="text-slate-500">CNPJ:</span>
                  <div className="font-semibold text-slate-900 dark:text-white">{wizardData.cnpj || 'Não informado'}</div>
                </div>
                <div>
                  <span className="text-slate-500">Contato Comercial:</span>
                  <div className="font-semibold text-slate-900 dark:text-white">{wizardData.telefone || wizardData.emailComercial || '—'}</div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                <span className="text-slate-500">Módulos habilitados:</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {wizardData.objetivos.map(obj => (
                    <span key={obj} className="px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 text-[10px] font-medium">
                      {obj}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-2">
              <div className="font-semibold text-slate-900 dark:text-white">Termos e Conformidade:</div>
              <p className="text-slate-500 dark:text-slate-400">
                Ao clicar em "Confirmar e Criar Espaço Empresarial", seus dados serão salvos com isolamento rigoroso por empresa. Nenhum terceiro ou outro usuário terá acesso às suas transações financeiras.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setWizardStep(3)}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleWizardSubmit}
                className="px-6 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-2 shadow-md transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                Confirmar e Criar Espaço Empresarial
              </button>
            </div>
          </div>
        )}

      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW: FULL MANAGEMENT SUITE
  // -------------------------------------------------------------
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm mb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 text-xs font-medium text-sky-700 dark:text-sky-300 mb-1.5">
            <Building2 className="w-3.5 h-3.5" />
            NEXO BUSINESS · {company.tipoNegocio}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {company.nomeFantasia || company.razaoSocial}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            CNPJ: {company.cnpj || 'Informal'} · {company.cidade}/{company.estado} · CPF do responsável protegido: {company.cpfMascarado || '***.***.***-**'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              setNewSaleItems([]);
              setNewSaleCustomer('');
              setShowSaleModal(true);
            }}
            className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <ShoppingCart className="w-4 h-4" />
            Registrar Venda (PDV)
          </button>
          <button
            onClick={() => {
              setEditingExpense({
                categoria: 'Operacional',
                descricao: '',
                valor: 0,
                status: 'pendente',
                data: new Date().toISOString().slice(0, 10),
                vencimento: new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10),
              });
              setShowExpenseModal(true);
            }}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Lançar Despesa
          </button>
          <button
            onClick={() => setActiveTab('wizard')}
            title="Editar cadastro da empresa"
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 mb-8 overflow-x-auto pb-1">
        {[
          { id: 'dashboard', label: 'Visão Geral & Indicadores', icon: BarChart3 },
          { id: 'produtos', label: `Produtos & Estoque (${products.length})`, icon: Package },
          { id: 'vendas', label: `Histórico de Vendas (${sales.length})`, icon: ShoppingCart },
          { id: 'despesas', label: `Despesas & Contas (${expenses.length})`, icon: TrendingDown },
          { id: 'clientes', label: `Clientes CRM (${clients.length})`, icon: Users },
          { id: 'metas', label: `Metas Comerciais (${goals.length})`, icon: Target },
          { id: 'relatorios', label: 'Relatórios Financeiros (DRE)', icon: DollarSign },
        ].map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-4 py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${activeTab === t.id ? 'border-sky-600 text-sky-600 dark:text-sky-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* 1. TAB: DASHBOARD */}
      {activeTab === 'dashboard' && report && (
        <div className="space-y-8">
          
          {/* Top KPI Cards Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <span className="text-xs font-medium text-slate-500 block mb-1">Faturamento Total</span>
              <div className="font-mono text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                R$ {report.totalVendas.toFixed(2)}
              </div>
              <span className="text-[11px] text-slate-400 block mt-1">
                {report.quantidadeVendas} venda(s) registrada(s)
              </span>
            </div>

            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <span className="text-xs font-medium text-slate-500 block mb-1">Despesas Operacionais</span>
              <div className="font-mono text-2xl font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                R$ {report.totalDespesas.toFixed(2)}
              </div>
              <span className="text-[11px] text-slate-400 block mt-1">
                R$ {report.totalDespesasPendentes.toFixed(2)} a vencer
              </span>
            </div>

            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <span className="text-xs font-medium text-slate-500 block mb-1">Resultado Líquido</span>
              <div className={`font-mono text-2xl font-bold tabular-nums ${report.resultadoLiquido >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                {report.resultadoLiquido >= 0 ? '+' : ''} R$ {report.resultadoLiquido.toFixed(2)}
              </div>
              <span className="text-[11px] text-slate-400 block mt-1">
                Margem líquida de {report.margemLucroPercentual.toFixed(1)}%
              </span>
            </div>

            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <span className="text-xs font-medium text-slate-500 block mb-1">Ticket Médio</span>
              <div className="font-mono text-2xl font-bold text-sky-600 dark:text-sky-400 tabular-nums">
                R$ {report.ticketMedio.toFixed(2)}
              </div>
              <span className="text-[11px] text-slate-400 block mt-1">
                {report.quantidadeClientes} clientes na base
              </span>
            </div>

          </div>

          {/* Low Stock Alert Strip if any */}
          {report.produtosBaixoEstoque && report.produtosBaixoEstoque.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <strong className="font-semibold block mb-1">Alerta de Estoque Mínimo Atingido:</strong>
                <div className="flex flex-wrap gap-2">
                  {report.produtosBaixoEstoque.map(p => (
                    <span key={p.id} className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-800 font-mono">
                      {p.nome}: {p.estoqueAtual} / min {p.estoqueMinimo} {p.unidade}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setActiveTab('produtos')}
                className="text-xs font-bold text-amber-700 dark:text-amber-300 hover:underline shrink-0"
              >
                Repor Estoque
              </button>
            </div>
          )}

          {/* Top Products & Recent Sales Split */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Top Products */}
            <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center justify-between">
                <span>Produtos com Maior Giro de Vendas</span>
                <button onClick={() => setActiveTab('produtos')} className="text-xs text-sky-600 hover:underline font-normal">
                  Ver catálogo
                </button>
              </h3>

              {report.produtosMaisVendidos.length === 0 ? (
                <p className="text-xs text-slate-400 py-4">Nenhuma venda registrada ainda para calcular a curva de faturamento.</p>
              ) : (
                <div className="space-y-3">
                  {report.produtosMaisVendidos.map((prod, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                      <div>
                        <div className="text-xs font-semibold text-slate-900 dark:text-white">{prod.nome}</div>
                        <div className="text-[11px] text-slate-400">{prod.quantidade} unidades vendidas</div>
                      </div>
                      <div className="font-mono text-xs font-bold text-slate-900 dark:text-white tabular-nums">
                        R$ {prod.receita.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions & Recent Sales */}
            <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center justify-between">
                <span>Últimas Vendas Registradas</span>
                <button onClick={() => setActiveTab('vendas')} className="text-xs text-sky-600 hover:underline font-normal">
                  Ver todas
                </button>
              </h3>

              {sales.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-xs text-slate-400 mb-3">Nenhuma venda registrada ainda.</p>
                  <button
                    onClick={() => setShowSaleModal(true)}
                    className="px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-semibold"
                  >
                    Registrar Primeira Venda
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {sales.slice(0, 4).map(sale => (
                    <div key={sale.id} className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {sale.clienteNome || 'Cliente Balcão'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {new Date(sale.data).toLocaleDateString('pt-BR')} · {sale.items.length} item(ns) · {sale.formaPagamento.toUpperCase()}
                        </div>
                      </div>
                      <div className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                        R$ {sale.valorTotal.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* 2. TAB: PRODUTOS & ESTOQUE */}
      {activeTab === 'produtos' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Catálogo de Produtos & Controle de Estoque</h2>
              <p className="text-xs text-slate-500">Gerencie preços de custo, venda, margem e limites mínimos de reposição.</p>
            </div>
            <button
              onClick={() => {
                setEditingProduct({
                  nome: '',
                  categoria: 'Geral',
                  precoCusto: 0,
                  precoVenda: 0,
                  estoqueAtual: 0,
                  estoqueMinimo: 5,
                  unidade: 'un',
                });
                setShowProductModal(true);
              }}
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Novo Produto
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">Produto</th>
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3 text-right">Preço Custo</th>
                  <th className="px-4 py-3 text-right">Preço Venda</th>
                  <th className="px-4 py-3 text-right">Margem Unit.</th>
                  <th className="px-4 py-3 text-center">Estoque Atual</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {products.map(prod => {
                  const isLow = prod.estoqueAtual <= prod.estoqueMinimo;
                  const margem = prod.precoVenda - prod.precoCusto;
                  return (
                    <tr key={prod.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{prod.nome}</td>
                      <td className="px-4 py-3 text-slate-500">{prod.categoria}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400">R$ {prod.precoCusto.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-white">R$ {prod.precoVenda.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-emerald-600 font-semibold">+ R$ {margem.toFixed(2)}</td>
                      <td className="px-4 py-3 text-center font-mono font-bold tabular-nums">
                        {prod.estoqueAtual} <span className="text-[10px] text-slate-400 font-normal">{prod.unidade}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isLow ? (
                          <span className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-[10px] font-semibold border border-rose-200 dark:border-rose-800">
                            Estoque Baixo (Mín: {prod.estoqueMinimo})
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold">
                            Normal
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button
                          onClick={() => {
                            setEditingProduct(prod);
                            setShowProductModal(true);
                          }}
                          className="p-1 text-slate-400 hover:text-sky-600"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(prod.id)}
                          className="p-1 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. TAB: HISTÓRICO DE VENDAS */}
      {activeTab === 'vendas' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Histórico de Movimentações de Vendas</h2>
              <p className="text-xs text-slate-500">Transações comerciais efetuadas com dedução automática de estoque.</p>
            </div>
            <button
              onClick={() => {
                setNewSaleItems([]);
                setNewSaleCustomer('');
                setShowSaleModal(true);
              }}
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <ShoppingCart className="w-4 h-4" />
              Nova Venda (PDV)
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Itens da Venda</th>
                  <th className="px-4 py-3">Pagamento</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sales.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-mono text-slate-500 whitespace-nowrap">
                      {new Date(s.data).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                      {s.clienteNome || 'Cliente Balcão'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {s.items.map(item => `${item.quantidade}x ${item.produtoNome}`).join(', ')}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-mono uppercase">
                        {s.formaPagamento}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                      R$ {s.valorTotal.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. TAB: DESPESAS */}
      {activeTab === 'despesas' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Livro de Despesas Operacionais</h2>
              <p className="text-xs text-slate-500">Acompanhamento rigoroso de custos para preservação do fluxo de caixa.</p>
            </div>
            <button
              onClick={() => {
                setEditingExpense({
                  categoria: 'Operacional',
                  descricao: '',
                  valor: 0,
                  status: 'pendente',
                  data: new Date().toISOString().slice(0, 10),
                  vencimento: new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10),
                });
                setShowExpenseModal(true);
              }}
              className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Lançar Despesa
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">Descrição</th>
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3">Vencimento</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {expenses.map(e => (
                  <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{e.descricao}</td>
                    <td className="px-4 py-3 text-slate-500">{e.categoria}</td>
                    <td className="px-4 py-3 font-mono text-slate-500">{new Date(e.vencimento).toLocaleDateString('pt-BR')}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${e.status === 'pago' ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300' : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300'}`}>
                        {e.status === 'pago' ? 'Pago' : 'Pendente'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                      - R$ {e.valor.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => {
                          setEditingExpense(e);
                          setShowExpenseModal(true);
                        }}
                        className="p-1 text-slate-400 hover:text-sky-600"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteExpense(e.id)}
                        className="p-1 text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. TAB: CLIENTES CRM */}
      {activeTab === 'clientes' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Cadastro de Clientes (CRM)</h2>
              <p className="text-xs text-slate-500">Mantenha os contatos e preferências de consumo organizados.</p>
            </div>
            <button
              onClick={() => {
                setEditingClient({ nome: '', email: '', telefone: '', cidade: '', notas: '' });
                setShowClientModal(true);
              }}
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Novo Cliente
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients.map(cli => (
              <div key={cli.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">{cli.nome}</span>
                    <button onClick={() => handleDeleteClient(cli.id)} className="text-slate-400 hover:text-rose-600">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400 mb-3">
                    <div>{cli.email || 'Sem e-mail'}</div>
                    <div>{cli.telefone || 'Sem telefone'}</div>
                    <div>{cli.cidade}</div>
                  </div>
                  {cli.notas && (
                    <p className="p-2.5 rounded bg-slate-50 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-300 italic">
                      "{cli.notas}"
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. TAB: METAS COMERCIAIS */}
      {activeTab === 'metas' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Metas Empresariais</h2>
              <p className="text-xs text-slate-500">Defina alvos mensais de faturamento, volume de vendas e clientes.</p>
            </div>
            <button
              onClick={() => {
                setEditingGoal({ titulo: '', metaValor: 10000, atualValor: 0, prazo: 'Fim do mês', status: 'em_andamento' });
                setShowGoalModal(true);
              }}
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Criar Nova Meta
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goals.map(g => {
              const pct = g.metaValor > 0 ? Math.min(100, (g.atualValor / g.metaValor) * 100) : 0;
              return (
                <div key={g.id} className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">{g.titulo}</span>
                    <button onClick={() => handleDeleteGoal(g.id)} className="text-slate-400 hover:text-rose-600">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Atual: <strong className="font-mono text-slate-900 dark:text-white tabular-nums">{g.atualValor}</strong></span>
                    <span>Meta: <strong className="font-mono text-slate-900 dark:text-white tabular-nums">{g.metaValor}</strong></span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400 pt-1">
                    <span>Prazo: {g.prazo}</span>
                    <span className="font-semibold text-emerald-600">{pct.toFixed(0)}% alcançado</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 7. TAB: RELATÓRIOS FINANCEIROS */}
      {activeTab === 'relatorios' && report && (
        <div className="space-y-6">
          <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Demonstrativo do Resultado do Exercício (DRE Simplificado)</h2>
            <p className="text-xs text-slate-500">Visão contábil padronizada de receita bruta, deduções e lucro líquido operacional.</p>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              <div className="py-2.5 flex justify-between font-semibold">
                <span className="text-slate-900 dark:text-white">(=) Receita Operacional Bruta de Vendas</span>
                <span className="font-mono tabular-nums text-slate-900 dark:text-white">R$ {report.totalVendas.toFixed(2)}</span>
              </div>
              <div className="py-2.5 flex justify-between text-rose-600">
                <span>(-) Total de Custos e Despesas Operacionais Registradas</span>
                <span className="font-mono tabular-nums">- R$ {report.totalDespesas.toFixed(2)}</span>
              </div>
              <div className="py-2.5 flex justify-between font-bold text-sm bg-slate-50 dark:bg-slate-800/60 px-3 rounded-lg">
                <span className={report.resultadoLiquido >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600'}>
                  (=) Resultado Líquido Operacional
                </span>
                <span className={`font-mono tabular-nums ${report.resultadoLiquido >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600'}`}>
                  R$ {report.resultadoLiquido.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <h3 className="text-xs font-bold uppercase text-slate-500 mb-3">Despesas por Categoria</h3>
              <div className="space-y-2 text-xs">
                {Object.entries(report.despesasPorCategoria).map(([cat, val]) => (
                  <div key={cat} className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-700 dark:text-slate-300">{cat}</span>
                    <strong className="font-mono tabular-nums text-slate-900 dark:text-white">R$ {val.toFixed(2)}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <h3 className="text-xs font-bold uppercase text-slate-500 mb-3">Vendas por Forma de Pagamento</h3>
              <div className="space-y-2 text-xs">
                {Object.entries(report.formasPagamentoMap).map(([forma, val]) => (
                  <div key={forma} className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-700 dark:text-slate-300 capitalize">{forma.replace('_', ' ')}</span>
                    <strong className="font-mono tabular-nums text-slate-900 dark:text-white">R$ {val.toFixed(2)}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: NOVO / EDITAR PRODUTO --- */}
      {showProductModal && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {editingProduct.id ? 'Editar Produto' : 'Cadastrar Novo Produto'}
              </h3>
              <button onClick={() => setShowProductModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Nome do Produto</label>
                <input
                  type="text"
                  required
                  value={editingProduct.nome || ''}
                  onChange={e => setEditingProduct({ ...editingProduct, nome: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Categoria</label>
                  <input
                    type="text"
                    value={editingProduct.categoria || ''}
                    onChange={e => setEditingProduct({ ...editingProduct, categoria: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Unidade (un, kg, pct)</label>
                  <input
                    type="text"
                    value={editingProduct.unidade || 'un'}
                    onChange={e => setEditingProduct({ ...editingProduct, unidade: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Preço de Custo (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editingProduct.precoCusto || 0}
                    onChange={e => setEditingProduct({ ...editingProduct, precoCusto: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Preço de Venda (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editingProduct.precoVenda || 0}
                    onChange={e => setEditingProduct({ ...editingProduct, precoVenda: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Estoque Atual</label>
                  <input
                    type="number"
                    required
                    value={editingProduct.estoqueAtual || 0}
                    onChange={e => setEditingProduct({ ...editingProduct, estoqueAtual: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Estoque Mínimo (Alerta)</label>
                  <input
                    type="number"
                    required
                    value={editingProduct.estoqueMinimo || 5}
                    onChange={e => setEditingProduct({ ...editingProduct, estoqueMinimo: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold"
                >
                  Salvar Produto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: REGISTRAR VENDA (PDV) --- */}
      {showSaleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-sky-600" />
                Frente de Caixa (PDV) — Registrar Venda
              </h3>
              <button onClick={() => setShowSaleModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterSale} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Vincular Cliente</label>
                  <select
                    value={newSaleCustomer}
                    onChange={e => setNewSaleCustomer(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="">Cliente Balcão (Avulso)</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Forma de Pagamento</label>
                  <select
                    value={newSalePayment}
                    onChange={e => setNewSalePayment(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="pix">PIX</option>
                    <option value="cartao_credito">Cartão de Crédito</option>
                    <option value="cartao_debito">Cartão de Débito</option>
                    <option value="dinheiro">Dinheiro</option>
                    <option value="boleto">Boleto Bancário</option>
                  </select>
                </div>
              </div>

              {/* Add item bar */}
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex gap-2 items-end">
                <div className="flex-1">
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Selecionar Produto</label>
                  <select
                    value={selectedProductId}
                    onChange={e => setSelectedProductId(e.target.value)}
                    className="w-full px-2 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="">-- Escolha um item --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id} disabled={p.estoqueAtual <= 0}>
                        {p.nome} (Estoque: {p.estoqueAtual} {p.unidade} - R$ {p.precoVenda.toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="w-20">
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Qtd</label>
                  <input
                    type="number"
                    min="1"
                    value={selectedQuantity}
                    onChange={e => setSelectedQuantity(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-2 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAddItemToSale}
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded font-semibold text-xs"
                >
                  Adicionar
                </button>
              </div>

              {/* Items List */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-lg divide-y divide-slate-100 dark:divide-slate-800 max-h-48 overflow-y-auto">
                {newSaleItems.length === 0 ? (
                  <p className="p-3 text-center text-slate-400">Nenhum item adicionado à cesta ainda.</p>
                ) : (
                  newSaleItems.map((item, idx) => (
                    <div key={idx} className="p-2.5 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">{item.produtoNome}</div>
                        <div className="text-[11px] text-slate-500">{item.quantidade} x R$ {item.precoUnitario.toFixed(2)}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-slate-900 dark:text-white">R$ {item.subtotal.toFixed(2)}</span>
                        <button type="button" onClick={() => handleRemoveItemFromSale(idx)} className="text-slate-400 hover:text-rose-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Total & Submit */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-slate-500 block">Total a Pagar:</span>
                  <span className="font-mono text-xl font-bold text-sky-600 dark:text-sky-400 tabular-nums">
                    R$ {newSaleItems.reduce((acc, i) => acc + i.subtotal, 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSaleModal(false)}
                    className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={newSaleItems.length === 0}
                    className="px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold disabled:opacity-50"
                  >
                    Concluir Venda
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: LANÇAR DESPESA --- */}
      {showExpenseModal && editingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Lançamento de Despesa</h3>
              <button onClick={() => setShowExpenseModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Descrição</label>
                <input
                  type="text"
                  required
                  value={editingExpense.descricao || ''}
                  onChange={e => setEditingExpense({ ...editingExpense, descricao: e.target.value })}
                  placeholder="Ex: Fornecedor de embalagens, Conta de luz, Aluguel"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Categoria</label>
                  <select
                    value={editingExpense.categoria || 'Insumos e Matéria-Prima'}
                    onChange={e => setEditingExpense({ ...editingExpense, categoria: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="Insumos e Matéria-Prima">Insumos e Matéria-Prima</option>
                    <option value="Aluguel e Condomínio">Aluguel e Condomínio</option>
                    <option value="Energia Elétrica e Água">Energia Elétrica e Água</option>
                    <option value="Embalagens e Descartáveis">Embalagens e Descartáveis</option>
                    <option value="Internet e Telefonia">Internet e Telefonia</option>
                    <option value="Marketing e Anúncios">Marketing e Anúncios</option>
                    <option value="Impostos e MEI">Impostos e MEI</option>
                    <option value="Outros Operacionais">Outros Operacionais</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editingExpense.valor || 0}
                    onChange={e => setEditingExpense({ ...editingExpense, valor: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Vencimento</label>
                  <input
                    type="date"
                    required
                    value={editingExpense.vencimento ? editingExpense.vencimento.slice(0, 10) : ''}
                    onChange={e => setEditingExpense({ ...editingExpense, vencimento: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Status de Pagamento</label>
                  <select
                    value={editingExpense.status || 'pendente'}
                    onChange={e => setEditingExpense({ ...editingExpense, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="pendente">Pendente a Pagar</option>
                    <option value="pago">Já Pago</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button type="button" onClick={() => setShowExpenseModal(false)} className="px-4 py-2 rounded-lg border">Cancelar</button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold">Salvar Despesa</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: CLIENTE CRM --- */}
      {showClientModal && editingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Cliente CRM</h3>
              <button onClick={() => setShowClientModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClient} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Nome do Cliente *</label>
                <input
                  type="text"
                  required
                  value={editingClient.nome || ''}
                  onChange={e => setEditingClient({ ...editingClient, nome: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">E-mail</label>
                  <input
                    type="email"
                    value={editingClient.email || ''}
                    onChange={e => setEditingClient({ ...editingClient, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Telefone</label>
                  <input
                    type="text"
                    value={editingClient.telefone || ''}
                    onChange={e => setEditingClient({ ...editingClient, telefone: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Cidade</label>
                <input
                  type="text"
                  value={editingClient.cidade || ''}
                  onChange={e => setEditingClient({ ...editingClient, cidade: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Observações e Preferências</label>
                <textarea
                  rows={2}
                  value={editingClient.notas || ''}
                  onChange={e => setEditingClient({ ...editingClient, notas: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowClientModal(false)} className="px-4 py-2 rounded-lg border">Cancelar</button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-sky-600 text-white font-semibold">Salvar Cliente</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: META COMERCIAL --- */}
      {showGoalModal && editingGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Meta Empresarial</h3>
              <button onClick={() => setShowGoalModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGoal} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Título da Meta</label>
                <input
                  type="text"
                  required
                  value={editingGoal.titulo || ''}
                  onChange={e => setEditingGoal({ ...editingGoal, titulo: e.target.value })}
                  placeholder="Ex: Faturamento Mensal, Conquistar 50 Novos Clientes"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Valor Alvo</label>
                  <input
                    type="number"
                    required
                    value={editingGoal.metaValor || 0}
                    onChange={e => setEditingGoal({ ...editingGoal, metaValor: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Progresso Atual</label>
                  <input
                    type="number"
                    required
                    value={editingGoal.atualValor || 0}
                    onChange={e => setEditingGoal({ ...editingGoal, atualValor: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Prazo Estimado</label>
                <input
                  type="text"
                  value={editingGoal.prazo || ''}
                  onChange={e => setEditingGoal({ ...editingGoal, prazo: e.target.value })}
                  placeholder="Ex: Até dia 30, Trimestre atual"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowGoalModal(false)} className="px-4 py-2 rounded-lg border">Cancelar</button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-sky-600 text-white font-semibold">Salvar Meta</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
