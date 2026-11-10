import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../services/api.js';
import { 
  Sparkles, ShieldCheck, Send, RefreshCw, BarChart2, 
  TrendingUp, AlertCircle, HelpCircle, CheckCircle2, MessageSquare
} from 'lucide-react';

export const NexoInteligenciaView: React.FC = () => {
  const [analysisText, setAnalysisText] = useState<string>('');
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [userQuestion, setUserQuestion] = useState('');
  const [conversation, setConversation] = useState<Array<{ sender: 'user' | 'ai'; text: string; time: string }>>([]);

  const runAnalysis = async (customPrompt?: string) => {
    try {
      setLoading(true);
      const res = await apiRequest<{ success: boolean; analysis: string; sanitizedMetrics: any }>('/intelligence/analyze', {
        method: 'POST',
        body: JSON.stringify({ userQuestion: customPrompt }),
      });

      setMetrics(res.sanitizedMetrics);

      if (customPrompt) {
        setConversation(prev => [
          ...prev,
          { sender: 'user', text: customPrompt, time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) },
          { sender: 'ai', text: res.analysis, time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) },
        ]);
        setUserQuestion('');
      } else {
        setAnalysisText(res.analysis);
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao consultar NEXO Inteligência');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runAnalysis();
  }, []);

  const handleAskQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuestion.trim()) return;
    runAnalysis(userQuestion.trim());
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in space-y-8">
      
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-900 via-slate-900 to-sky-950 text-white shadow-md border border-indigo-800/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              NEXO INTELIGÊNCIA · Motor Analítico Gemini 3.8 Flash
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Análise Estratégica e Inteligência Financeira
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              Diagnósticos automatizados e consultor virtual para responder dúvidas gerenciais com base estritamente nos números autorizados da sua empresa.
            </p>
          </div>

          <button
            onClick={() => runAnalysis()}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-md shrink-0 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar Diagnóstico Executivo
          </button>
        </div>
      </div>

      {/* Privacy Guarantee Banner */}
      <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 text-xs text-sky-800 dark:text-sky-300 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5 text-sky-600 dark:text-sky-400" />
        <div className="leading-relaxed">
          <strong>Protocolo de Privacidade e Não-Vazamento (LGPD):</strong> O módulo NEXO INTELIGÊNCIA processa exclusivamente os valores consolidados da sua própria empresa. Documentos pessoais, CPF, nomes de clientes e detalhes privados são retidos e nunca transferidos para terceiros.
        </div>
      </div>

      {/* KPI Numbers Grid */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <span className="text-[11px] font-medium text-slate-500 block mb-1">Receita Analisada</span>
            <span className="font-mono text-xl font-bold text-slate-900 dark:text-white tabular-nums">
              R$ {metrics.totalVendas?.toFixed(2)}
            </span>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <span className="text-[11px] font-medium text-slate-500 block mb-1">Despesas Mapeadas</span>
            <span className="font-mono text-xl font-bold text-rose-600 dark:text-rose-400 tabular-nums">
              R$ {metrics.totalDespesas?.toFixed(2)}
            </span>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <span className="text-[11px] font-medium text-slate-500 block mb-1">Margem Líquida</span>
            <span className={`font-mono text-xl font-bold tabular-nums ${metrics.margemLucroPercentual >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {metrics.margemLucroPercentual?.toFixed(1)}%
            </span>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <span className="text-[11px] font-medium text-slate-500 block mb-1">Ticket Médio</span>
            <span className="font-mono text-xl font-bold text-sky-600 dark:text-sky-400 tabular-nums">
              R$ {metrics.ticketMedio?.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* Main Analysis and Interactive Advisor Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left: Executive AI Report */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-indigo-600" />
                Relatório de Diagnóstico Estratégico
              </h2>
              <span className="text-[11px] text-slate-400">Gerado com base nos lançamentos</span>
            </div>

            {loading && !analysisText ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                Analisando fluxo financeiro e margens...
              </div>
            ) : (
              <div className="prose dark:prose-invert max-w-none text-xs sm:text-sm leading-relaxed text-slate-700 dark:text-slate-300 space-y-3 whitespace-pre-wrap font-sans">
                {analysisText || 'Cadastre vendas e despesas em sua empresa para desbloquear a análise preditiva completa.'}
              </div>
            )}
          </div>
        </div>

        {/* Right: Interactive Q&A Advisor */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col h-[580px]">
            <div className="mb-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-sky-600" />
                Pergunte aos Números da Empresa
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Tire dúvidas práticas sobre faturamento, produtos e redução de custos.
              </p>
            </div>

            {/* Conversation Feed */}
            <div className="flex-1 overflow-y-auto space-y-3 p-1">
              {conversation.length === 0 ? (
                <div className="text-center py-10 space-y-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                    <HelpCircle className="w-5 h-5" />
                  </div>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    Exemplos de perguntas que você pode fazer:
                  </p>
                  <div className="space-y-1.5 text-[11px]">
                    <button
                      onClick={() => runAnalysis('Qual foi o produto que gerou mais lucro e qual devo promover mais?')}
                      className="w-full text-left p-2 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                    >
                      "Qual produto gerou mais lucro?"
                    </button>
                    <button
                      onClick={() => runAnalysis('Como posso reequilibrar minhas despesas fixas para aumentar a margem?')}
                      className="w-full text-left p-2 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                    >
                      "Como reequilibrar despesas fixas?"
                    </button>
                    <button
                      onClick={() => runAnalysis('O que fazer para aumentar o ticket médio por cliente?')}
                      className="w-full text-left p-2 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                    >
                      "Como aumentar o ticket médio?"
                    </button>
                  </div>
                </div>
              ) : (
                conversation.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl text-xs ${msg.sender === 'user' ? 'bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 ml-6 text-slate-900 dark:text-white' : 'bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 mr-6 text-slate-700 dark:text-slate-200'}`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                      <span className="font-semibold">{msg.sender === 'user' ? 'Você' : 'NEXO Inteligência'}</span>
                      <span>{msg.time}</span>
                    </div>
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                  </div>
                ))
              )}
            </div>

            {/* Input Bar */}
            <form onSubmit={handleAskQuestion} className="pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">
              <input
                type="text"
                value={userQuestion}
                onChange={e => setUserQuestion(e.target.value)}
                placeholder="Ex: Como reduzir custos nesse mês?"
                disabled={loading}
                className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={loading || !userQuestion.trim()}
                className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg disabled:opacity-50 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

      </div>

    </div>
  );
};
