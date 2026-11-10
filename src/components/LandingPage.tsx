import React from 'react';
import { useAuth } from '../context/AuthContext.js';
import { 
  Rocket, Briefcase, Sparkles, Shield, Compass, Users, 
  ArrowRight, BarChart3, Calculator, CheckCircle2, Lock, 
  Layers, MessageSquare, ChevronRight, HelpCircle
} from 'lucide-react';

interface LandingPageProps {
  onOpenAuth: (initialTab?: 'login' | 'register') => void;
  onNavigate: (view: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenAuth, onNavigate }) => {
  const { user, login } = useAuth();

  const handleDemoAccess = async (role: 'admin' | 'business' | 'jovem') => {
    let email = '';
    let pass = '';
    let target = 'jovem';

    if (role === 'admin') {
      email = 'admin@nexo.com.br';
      pass = 'AdminPassword@2026';
      target = 'admin';
    } else if (role === 'business') {
      email = 'negocios@exemplo.com.br';
      pass = 'Business@2026';
      target = 'business';
    } else {
      email = 'jovem@exemplo.com.br';
      pass = 'JovemNexo@2026';
      target = 'jovem';
    }

    const res = await login(email, pass);
    if (res.success) {
      onNavigate(target);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-sky-500 selection:text-white">
      
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-b from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/50 text-xs font-semibold text-sky-700 dark:text-sky-300">
              <Sparkles className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>Plataforma Inteligente de Gestão e Oportunidades</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 dark:text-white mb-6 text-balance">
              Conectando ideias, negócios e oportunidades.
            </h1>

            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 mb-8 leading-relaxed">
              O ecossistema definitivo que une jovens visionários a ferramentas profissionais de gestão, inteligência de dados, capacitação prática e expansão empresarial.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-10">
              {user ? (
                <button
                  onClick={() => {
                    if (user.role === 'admin') onNavigate('admin');
                    else if (user.clientType === 'jovem') onNavigate('jovem');
                    else onNavigate('business');
                  }}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2"
                >
                  Ir para Meu Painel ({user.clientType === 'jovem' ? 'Nexo Jovem' : user.role === 'admin' ? 'Admin' : 'Nexo Business'})
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <>
                  <button
                    onClick={() => onOpenAuth('register')}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    Começar Gratuitamente
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onOpenAuth('login')}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-sm transition-all"
                  >
                    Entrar na Conta
                  </button>
                </>
              )}
            </div>

            {/* Quick Demo Access Strip */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 backdrop-blur-sm max-w-2xl mx-auto shadow-sm">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                Experimente a plataforma instantaneamente com dados demonstrativos reais:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  onClick={() => handleDemoAccess('business')}
                  className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-sky-500 bg-white dark:bg-slate-800 hover:bg-sky-50/50 dark:hover:bg-sky-950/20 text-left transition-all group"
                >
                  <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
                    <span>NEXO Business</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-500" />
                  </div>
                  <div className="text-[11px] text-slate-500">Cafeteria, estoque & vendas</div>
                </button>

                <button
                  onClick={() => handleDemoAccess('jovem')}
                  className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-sky-500 bg-white dark:bg-slate-800 hover:bg-sky-50/50 dark:hover:bg-sky-950/20 text-left transition-all group"
                >
                  <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
                    <span>NEXO Jovem</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-500" />
                  </div>
                  <div className="text-[11px] text-slate-500">Ideia, custos & simulador</div>
                </button>

                <button
                  onClick={() => handleDemoAccess('admin')}
                  className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-amber-500 bg-white dark:bg-slate-800 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 text-left transition-all group"
                >
                  <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
                    <span>Painel Admin</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-500" />
                  </div>
                  <div className="text-[11px] text-slate-500">Fila e triagem de suporte</div>
                </button>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 2. THE TWO PILLARS (NEXO JOVEM & NEXO BUSINESS) */}
      <section className="py-16 md:py-24 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-3">
              Dois Ambientes Especializados. Um Único Propósito.
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Quer você esteja tirando a primeira ideia do papel ou administrando um negócio consolidado, o NEXO entrega as ferramentas exatas para cada etapa.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            
            {/* PILLAR 1: NEXO JOVEM */}
            <div className="flex flex-col justify-between p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow">
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-6">
                  <Rocket className="w-6 h-6" />
                </div>
                <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">
                  Para Iniciantes e Visionários
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                  NEXO JOVEM
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                  Transforme suas ideias embrionárias em projetos estruturados. Conte com um assistente passo a passo, simulador financeiro de ponto de equilíbrio e orientações educativas sem jargões.
                </p>

                <ul className="space-y-3 mb-8 text-xs text-slate-700 dark:text-slate-300">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Questionário guiado de modelagem de negócio em 7 etapas</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Calculadora de custos, markup e ponto de equilíbrio</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Estimativa de receitas e projeção de resultados com segurança</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Roadmap de validação prática e protótipo (MVP)</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => {
                  if (user) onNavigate('jovem');
                  else onOpenAuth('register');
                }}
                className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2"
              >
                Conhecer o NEXO Jovem
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* PILLAR 2: NEXO BUSINESS */}
            <div className="flex flex-col justify-between p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow">
              <div>
                <div className="w-12 h-12 rounded-xl bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 flex items-center justify-center text-sky-600 dark:text-sky-400 mb-6">
                  <Briefcase className="w-6 h-6" />
                </div>
                <div className="text-xs font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1">
                  Para Empresas e Empreendedores
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                  NEXO BUSINESS
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                  Um ambiente privado, robusto e isolado para gerenciar operações diárias: controle de estoque com alertas de ruptura, emissão de vendas, livro de despesas e relatórios financeiros claros.
                </p>

                <ul className="space-y-3 mb-8 text-xs text-slate-700 dark:text-slate-300">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
                    <span>Controle de estoque dinâmico com alertas automáticos de mínimo</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
                    <span>Registro ágil de vendas com suporte a PIX, cartões e dinheiro</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
                    <span>Controle de despesas, contas a pagar e vencimentos</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
                    <span>Relatórios gerenciais (DRE simplificado, ticket médio, margens)</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => {
                  if (user) onNavigate('business');
                  else onOpenAuth('register');
                }}
                className="w-full py-2.5 px-4 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2"
              >
                Conhecer o NEXO Business
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* 3. NEXO INTELIGÊNCIA & SECURITY HIGHLIGHT */}
      <section className="py-16 md:py-24 border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/50 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>NEXO INTELIGÊNCIA</span>
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-4">
                Diagnósticos Executivos com Inteligência Artificial
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
                Nosso motor de IA analisa os dados da sua empresa em tempo real para responder perguntas financeiras, identificar produtos que estão parados no estoque e traçar planos de ação imediatos.
              </p>

              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <div className="font-semibold text-sm text-slate-900 dark:text-white mb-1">
                    Isolamento e Privacidade Absoluta
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Apenas métricas numéricas consolidadas são processadas. CPFs, dados de clientes, documentos e credenciais jamais são enviados para sistemas externos.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <div className="font-semibold text-sm text-slate-900 dark:text-white mb-1">
                    Respostas Personalizadas aos Seus Números
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Pergunte: "Qual produto gerou maior faturamento?", "Onde posso cortar custos esse mês?" ou "Qual minha margem líquida real?".
                  </p>
                </div>
              </div>
            </div>

            {/* Visual Security Card */}
            <div className="p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-sky-100 dark:bg-sky-950 flex items-center justify-center text-sky-600 dark:text-sky-400">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Segurança e Conformidade LGPD
                  </h3>
                  <div className="text-xs text-slate-500">Privacidade implementada desde a base</div>
                </div>
              </div>

              <div className="space-y-3.5 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-start gap-3">
                  <Lock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 dark:text-white">Criptografia AES-256-GCM para CPF:</strong> Documentos sensíveis são criptografados no banco de dados e mascarados na interface.
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Lock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 dark:text-white">Controle de Acesso Limitado:</strong> Administradores do sistema não têm permissão para acessar os dados financeiros privados ou clientes das empresas.
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Lock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 dark:text-white">Hash PBKDF2 e Bloqueio Preventivo:</strong> Senhas com salting individual e proteção contra ataques de força bruta.
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Lock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 dark:text-white">Registro de Auditoria Completo:</strong> Cada alteração e acesso técnico fica documentado em trilhas de auditoria imutáveis.
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 4. NEXO LOCAL & NEXO NETWORK OVERVIEW */}
      <section className="py-16 md:py-24 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-5">
                <Compass className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                NEXO LOCAL
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                Descubra cursos gratuitos, editais de fomento, rodadas de negócios, instituições parceiras (SEBRAE, incubadoras) e eventos para impulsionar sua região.
              </p>
              <button
                onClick={() => onNavigate('local')}
                className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1.5"
              >
                Explorar Oportunidades Locais
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-5">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                NEXO NETWORK
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                Conecte-se com jovens fundadores, mentores e parceiros estratégicos. Crie seu perfil público protegido, compartilhe seus projetos e encontre colaboração real.
              </p>
              <button
                onClick={() => onNavigate('network')}
                className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1.5"
              >
                Conectar com a Rede de Empreendedores
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* 5. FOOTER */}
      <footer className="py-12 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center text-white font-bold text-sm">
                N
              </div>
              <div>
                <span className="font-bold text-slate-900 dark:text-white">NEXO</span>
                <p className="text-xs text-slate-500">"Conectando ideias, negócios e oportunidades."</p>
              </div>
            </div>

            <div className="flex items-center gap-6 text-xs text-slate-500">
              <button onClick={() => onNavigate('suporte')} className="hover:text-slate-900 dark:hover:text-white transition-colors">
                Suporte & Atendimento
              </button>
              <button onClick={() => onNavigate('local')} className="hover:text-slate-900 dark:hover:text-white transition-colors">
                Oportunidades
              </button>
              <button onClick={() => onNavigate('network')} className="hover:text-slate-900 dark:hover:text-white transition-colors">
                Rede de Negócios
              </button>
            </div>

            <div className="text-xs text-slate-400">
              © {new Date().getFullYear()} NEXO Plataforma. Todos os direitos reservados.
            </div>

          </div>
        </div>
      </footer>

    </div>
  );
};
