import React, { useState, useEffect } from 'react';
import { ProjectJovem } from '../../types/index.js';
import { apiRequest } from '../../services/api.js';
import { 
  Rocket, Calculator, Lightbulb, CheckCircle, Circle, 
  HelpCircle, TrendingUp, AlertTriangle, Save, Plus, ArrowRight,
  BookOpen, Sparkles, CheckCircle2
} from 'lucide-react';

export const NexoJovemView: React.FC = () => {
  const [projects, setProjects] = useState<ProjectJovem[]>([]);
  const [activeProject, setActiveProject] = useState<ProjectJovem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Tab: 'planejador' | 'simulador' | 'etapas'
  const [activeTab, setActiveTab] = useState<'planejador' | 'simulador' | 'etapas'>('planejador');

  // Guided wizard fields
  const [nome, setNome] = useState('');
  const [tipoNegocio, setTipoNegocio] = useState('');
  const [produtosServicos, setProdutosServicos] = useState('');
  const [publicoAlvo, setPublicoAlvo] = useState('');
  const [problemaSolucao, setProblemaSolucao] = useState('');
  const [custosPrincipais, setCustosPrincipais] = useState('');
  const [objetivoProjeto, setObjetivoProjeto] = useState('');

  // Simulator fields
  const [precoVenda, setPrecoVenda] = useState<number>(25.00);
  const [custoUnitario, setCustoUnitario] = useState<number>(10.00);
  const [custosFixos, setCustosFixos] = useState<number>(1200.00);
  const [vendasEstimadas, setVendasEstimadas] = useState<number>(150);

  // Etapas checklist
  const [etapas, setEtapas] = useState<Array<{ id: string; titulo: string; concluido: boolean; dica: string }>>([]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const res = await apiRequest<{ projects: ProjectJovem[] }>('/jovem/projects');
      setProjects(res.projects || []);
      if (res.projects && res.projects.length > 0) {
        selectProject(res.projects[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const selectProject = (p: ProjectJovem) => {
    setActiveProject(p);
    setNome(p.nome);
    setTipoNegocio(p.tipoNegocio);
    setProdutosServicos(p.produtosServicos);
    setPublicoAlvo(p.publicoAlvo);
    setProblemaSolucao(p.problemaSolucao);
    setCustosPrincipais(p.custosPrincipais);
    setObjetivoProjeto(p.objetivoProjeto);

    if (p.simulacao) {
      setPrecoVenda(p.simulacao.precoVendaUnitario);
      setCustoUnitario(p.simulacao.custoUnitario);
      setCustosFixos(p.simulacao.custosFixosMensais);
      setVendasEstimadas(p.simulacao.vendasEstimadasMensais);
    }

    setEtapas(p.etapas || []);
  };

  const handleCreateNewProject = () => {
    setActiveProject(null);
    setNome('');
    setTipoNegocio('Comércio ou Serviços');
    setProdutosServicos('');
    setPublicoAlvo('');
    setProblemaSolucao('');
    setCustosPrincipais('');
    setObjetivoProjeto('');
    setPrecoVenda(20.00);
    setCustoUnitario(8.00);
    setCustosFixos(1000.00);
    setVendasEstimadas(120);
    setEtapas([
      { id: 'etapa_1', titulo: '1. Definição da Ideia e Problema', concluido: true, dica: 'Identifique claramente quem sofre a dor e por que as soluções atuais são insuficientes.' },
      { id: 'etapa_2', titulo: '2. Pesquisa com Potenciais Clientes', concluido: false, dica: 'Converse com pelo menos 10 potenciais clientes para validar interesse real.' },
      { id: 'etapa_3', titulo: '3. Simulação de Custos e Ponto de Equilíbrio', concluido: false, dica: 'Calcule o preço de venda e a quantidade mínima para não ter prejuízo.' },
      { id: 'etapa_4', titulo: '4. Desenvolvimento do Protótipo / MVP', concluido: false, dica: 'Crie uma versão simplificada para validar a proposta de valor rapidamente.' },
      { id: 'etapa_5', titulo: '5. Primeiras Vendas e Feedback', concluido: false, dica: 'Conquiste seus primeiros clientes pagantes e aprimore o serviço.' },
      { id: 'etapa_6', titulo: '6. Planejamento de Formalização', concluido: false, dica: 'Analise enquadramento no MEI e parcerias estratégicas.' },
    ]);
  };

  // Live simulation calculations
  const margemContribuicaoUnit = Math.max(0.01, precoVenda - custoUnitario);
  const pontoEquilibrioUnidades = Math.ceil(custosFixos / margemContribuicaoUnit);
  const pontoEquilibrioReais = pontoEquilibrioUnidades * precoVenda;
  const margemPercentual = precoVenda > 0 ? (margemContribuicaoUnit / precoVenda) * 100 : 0;
  const receitaEstimada = vendasEstimadas * precoVenda;
  const custoTotalEstimado = custosFixos + (vendasEstimadas * custoUnitario);
  const lucroEstimado = receitaEstimada - custoTotalEstimado;

  const toggleEtapa = (id: string) => {
    setEtapas(prev => prev.map(e => e.id === id ? { ...e, concluido: !e.concluido } : e));
  };

  const handleSaveProject = async () => {
    try {
      setSaving(true);
      const payload = {
        id: activeProject?.id,
        nome: nome || 'Meu Projeto Empreendedor',
        tipoNegocio,
        produtosServicos,
        publicoAlvo,
        problemaSolucao,
        custosPrincipais,
        objetivoProjeto,
        status: activeProject?.status || 'planejamento',
        simulacao: {
          precoVendaUnitario: precoVenda,
          custoUnitario,
          custosFixosMensais: custosFixos,
          vendasEstimadasMensais: vendasEstimadas,
          pontoEquilibrioUnidades,
          pontoEquilibrioReais,
          margemLucroPercentual: margemPercentual,
          lucroMensalEstimado: lucroEstimado,
        },
        etapas,
      };

      const res = await apiRequest<{ project: ProjectJovem }>('/jovem/projects', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setActiveProject(res.project);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      loadProjects();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar projeto');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md mb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-medium mb-2">
            <Rocket className="w-3.5 h-3.5" />
            NEXO JOVEM — Incubadora e Laboratório de Ideias
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {activeProject ? activeProject.nome : 'Criando Novo Projeto Empreendedor'}
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100 mt-1 max-w-2xl">
            Aprenda a estruturar seu modelo de negócio, calcular seus custos reais e simular seu ponto de equilíbrio sem complicação.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleCreateNewProject}
            className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors border border-white/20"
          >
            <Plus className="w-4 h-4" />
            Novo Projeto
          </button>
          <button
            onClick={handleSaveProject}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-white text-emerald-800 hover:bg-emerald-50 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="mb-6 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>Projeto salvo com sucesso! Todas as simulações e metas foram atualizadas.</span>
        </div>
      )}

      {/* Project Selector if multiple */}
      {projects.length > 1 && (
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Meus Projetos:</span>
          {projects.map(p => (
            <button
              key={p.id}
              onClick={() => selectProject(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${activeProject?.id === p.id ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
            >
              {p.nome}
            </button>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 mb-8">
        <button
          onClick={() => setActiveTab('planejador')}
          className={`px-5 py-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'planejador' ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
          <Lightbulb className="w-4 h-4" />
          1. Assistente de Ideação (7 Perguntas)
        </button>
        <button
          onClick={() => setActiveTab('simulador')}
          className={`px-5 py-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'simulador' ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
          <Calculator className="w-4 h-4" />
          2. Simulador de Custos e Ponto de Equilíbrio
        </button>
        <button
          onClick={() => setActiveTab('etapas')}
          className={`px-5 py-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'etapas' ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
          <CheckCircle className="w-4 h-4" />
          3. Roadmap e Etapas de Validação
        </button>
      </div>

      {/* TAB 1: GUIDED 7 QUESTIONS */}
      {activeTab === 'planejador' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-6">
            
            <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-5">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-emerald-600" />
                Estruturação do Projeto em 7 Etapas
              </h2>

              {/* 1. Nome do Negócio */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  1. Qual nome você deseja dar ao seu negócio ou projeto?
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="Ex: EcoPack Embalagens, Confeitaria Doce Sonho, Studio Pixel..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* 2. Tipo de Negócio */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  2. Que tipo de negócio pretende criar?
                </label>
                <select
                  value={tipoNegocio}
                  onChange={e => setTipoNegocio(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Comércio ou Varejo">Comércio ou Varejo (Loja, e-commerce, revenda)</option>
                  <option value="Prestação de Serviços">Prestação de Serviços (Design, consultoria, manutenção, eventos)</option>
                  <option value="Alimentação e Gastronomia">Alimentação e Gastronomia (Restaurante, marmitas, cafeteria, confeitaria)</option>
                  <option value="Tecnologia ou Digital">Tecnologia ou Digital (Aplicativo, SaaS, marketing digital, cursos)</option>
                  <option value="Indústria ou Artesanato">Indústria ou Artesanato (Fabricação própria, confecção, marcenaria)</option>
                </select>
              </div>

              {/* 3. Produtos ou Serviços */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  3. Quais produtos ou serviços pretende oferecer?
                </label>
                <textarea
                  rows={3}
                  value={produtosServicos}
                  onChange={e => setProdutosServicos(e.target.value)}
                  placeholder="Descreva detalhadamente o que seu cliente levará para casa ou qual serviço você executará..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* 4. Público-Alvo */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  4. Quem seria seu público-alvo?
                </label>
                <textarea
                  rows={2}
                  value={publicoAlvo}
                  onChange={e => setPublicoAlvo(e.target.value)}
                  placeholder="Ex: Jovens de 18 a 25 anos em áreas universitárias, donos de pet shops locais, famílias que buscam alimentação saudável..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* 5. Problema e Solução */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  5. Qual problema ou necessidade seu negócio pretende resolver?
                </label>
                <textarea
                  rows={3}
                  value={problemaSolucao}
                  onChange={e => setProblemaSolucao(e.target.value)}
                  placeholder="Qual dor do cliente não é bem atendida hoje? Como sua solução resolve isso de forma melhor, mais rápida ou mais barata?"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* 6. Custos Principais */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  6. Quais seriam os principais custos operacionais identificados?
                </label>
                <textarea
                  rows={2}
                  value={custosPrincipais}
                  onChange={e => setCustosPrincipais(e.target.value)}
                  placeholder="Matéria-prima, ferramentas, embalagens, transporte, energia, divulgação nas redes..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* 7. Objetivo do Projeto */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  7. Qual é o objetivo principal do projeto nos próximos 6 meses?
                </label>
                <input
                  type="text"
                  value={objetivoProjeto}
                  onChange={e => setObjetivoProjeto(e.target.value)}
                  placeholder="Ex: Conquistar os primeiros 20 clientes pagantes, validar protótipo e buscar edital de fomento..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveProject}
                  disabled={saving}
                  className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Salvar Respostas do Projeto
                </button>
              </div>

            </div>

          </div>

          {/* Educational Sidebar */}
          <div className="space-y-6">
            <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-600" />
                Guia Prático do Jovem Empreendedor
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                Antes de gastar dinheiro ou alugar um ponto, teste sua ideia diretamente com pessoas que vivem o problema.
              </p>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="font-semibold text-slate-900 dark:text-white mb-1">Dica 1: Fale com Clientes</div>
                  <p className="text-slate-500 dark:text-slate-400">
                    Não pergunte aos seus amigos se a ideia é boa; pergunte a desconhecidos como eles resolvem esse problema hoje e quanto gastam.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="font-semibold text-slate-900 dark:text-white mb-1">Dica 2: Faça um MVP</div>
                  <p className="text-slate-500 dark:text-slate-400">
                    O Produto Mínimo Viável é a versão mais simples possível do seu produto que já entrega o valor prometido.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="font-semibold text-slate-900 dark:text-white mb-1">Dica 3: Separe Finanças Pessoais</div>
                  <p className="text-slate-500 dark:text-slate-400">
                    Nunca misture o dinheiro do almoço com o dinheiro da matéria-prima do seu negócio.
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setActiveTab('simulador')}
                  className="w-full py-2 px-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                  Ir para o Simulador de Custos
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: BUSINESS SIMULATOR & PRICE CALCULATOR */}
      {activeTab === 'simulador' && (
        <div className="space-y-8">
          
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <strong>Aviso Educativo Importante:</strong> Esta ferramenta calcula projeções matemáticas baseadas nas variáveis informadas pelo usuário para auxiliar o aprendizado e o planejamento. Não representa garantia de lucro, receita assegurada ou aconselhamento financeiro profissional.
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Input Controls */}
            <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-6">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calculator className="w-5 h-5 text-emerald-600" />
                Variáveis do Modelo Financeiro
              </h2>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Preço de Venda Unitário (R$)
                  </label>
                  <span className="font-mono text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                    R$ {precoVenda.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="500"
                  step="0.5"
                  value={precoVenda}
                  onChange={e => setPrecoVenda(parseFloat(e.target.value) || 1)}
                  className="w-full accent-emerald-600"
                />
                <p className="text-[11px] text-slate-500 mt-1">Quanto o cliente pagará por uma unidade ou serviço.</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Custo Variável Unitário (R$)
                  </label>
                  <span className="font-mono text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                    R$ {custoUnitario.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="400"
                  step="0.5"
                  value={custoUnitario}
                  onChange={e => setCustoUnitario(parseFloat(e.target.value) || 0.5)}
                  className="w-full accent-emerald-600"
                />
                <p className="text-[11px] text-slate-500 mt-1">Gasto direto em matéria-prima, embalagem ou insumo por cada unidade feita.</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Custos Fixos Mensais (R$)
                  </label>
                  <span className="font-mono text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                    R$ {custosFixos.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="15000"
                  step="50"
                  value={custosFixos}
                  onChange={e => setCustosFixos(parseFloat(e.target.value) || 100)}
                  className="w-full accent-emerald-600"
                />
                <p className="text-[11px] text-slate-500 mt-1">Gastos que você tem todo mês, vendendo ou não (internet, energia, MEI, aluguel, domínio).</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Vendas Estimadas por Mês (unidades)
                  </label>
                  <span className="font-mono text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                    {vendasEstimadas} un
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="2000"
                  step="5"
                  value={vendasEstimadas}
                  onChange={e => setVendasEstimadas(parseInt(e.target.value, 10) || 10)}
                  className="w-full accent-emerald-600"
                />
                <p className="text-[11px] text-slate-500 mt-1">Quantas unidades você estima conseguir produzir e vender mensalmente.</p>
              </div>

              <button
                type="button"
                onClick={handleSaveProject}
                disabled={saving}
                className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                Gravar Simulação no Projeto
              </button>
            </div>

            {/* Calculated Results & Metrics */}
            <div className="space-y-6">
              
              <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-5">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-sky-600" />
                  Resultados da Simulação Econômica
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] font-medium text-slate-500 block mb-1">Margem de Contribuição Unitária</span>
                    <span className="font-mono text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      R$ {margemContribuicaoUnit.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      ({margemPercentual.toFixed(1)}% do preço de venda)
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] font-medium text-slate-500 block mb-1">Ponto de Equilíbrio (Break-Even)</span>
                    <span className="font-mono text-xl font-bold text-sky-600 dark:text-sky-400 tabular-nums">
                      {pontoEquilibrioUnidades} unidades
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      Faturamento mínimo: R$ {pontoEquilibrioReais.toFixed(2)}
                    </span>
                  </div>

                </div>

                <div className={`p-4 rounded-xl border ${lucroEstimado >= 0 ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800' : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Resultado Líquido Mensal Projetado:
                    </span>
                    <span className={`font-mono text-2xl font-bold tabular-nums ${lucroEstimado >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-400'}`}>
                      {lucroEstimado >= 0 ? '+' : ''} R$ {lucroEstimado.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {vendasEstimadas < pontoEquilibrioUnidades ? (
                      <span className="text-rose-600 dark:text-rose-400 font-medium">
                        Atenção: A estimativa de {vendasEstimadas} vendas está abaixo do ponto de equilíbrio ({pontoEquilibrioUnidades} un). O negócio operaria com déficit operacional.
                      </span>
                    ) : (
                      <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                        Cenário favorável: Vendendo {vendasEstimadas} unidades você ultrapassa o ponto de equilíbrio em {vendasEstimadas - pontoEquilibrioUnidades} unidades.
                      </span>
                    )}
                  </p>
                </div>

                {/* Educational Breakdown */}
                <div className="space-y-2 pt-2 text-xs text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between py-1">
                    <span>Receita Bruta Projetada:</span>
                    <strong className="font-mono text-slate-900 dark:text-white tabular-nums">R$ {receitaEstimada.toFixed(2)}</strong>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>(-) Custos Variáveis Totais ({vendasEstimadas} un × R$ {custoUnitario.toFixed(2)}):</span>
                    <strong className="font-mono text-slate-900 dark:text-white tabular-nums">- R$ {(vendasEstimadas * custoUnitario).toFixed(2)}</strong>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>(-) Custos Fixos Mensais:</span>
                    <strong className="font-mono text-slate-900 dark:text-white tabular-nums">- R$ {custosFixos.toFixed(2)}</strong>
                  </div>
                </div>

              </div>

            </div>

          </div>

        </div>
      )}

      {/* TAB 3: ACTION STEPS ROADMAP */}
      {activeTab === 'etapas' && (
        <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Roadmap de Desenvolvimento do Projeto
              </h2>
              <p className="text-xs text-slate-500">
                Acompanhe e marque as etapas concluídas para transformar sua ideia em um negócio real.
              </p>
            </div>
            <button
              onClick={handleSaveProject}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              Salvar Progresso
            </button>
          </div>

          <div className="space-y-4">
            {etapas.map((etapa) => (
              <div
                key={etapa.id}
                onClick={() => toggleEtapa(etapa.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3.5 ${etapa.concluido ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 hover:border-slate-300'}`}
              >
                <div className="mt-0.5">
                  {etapa.concluido ? (
                    <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600 shrink-0" />
                  )}
                </div>
                <div className="flex-1">
                  <div className={`text-sm font-bold ${etapa.concluido ? 'text-emerald-900 dark:text-emerald-200 line-through' : 'text-slate-900 dark:text-white'}`}>
                    {etapa.titulo}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {etapa.dica}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
