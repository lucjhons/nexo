import React, { useState, useEffect } from 'react';
import { SupportTicket, TicketMessage } from '../../types/index.js';
import { apiRequest } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import { 
  MessageSquare, Plus, Clock, CheckCircle2, AlertCircle, 
  Send, RefreshCw, HelpCircle, Phone, X, ShieldAlert
} from 'lucide-react';

export const NexoSuporteView: React.FC = () => {
  const { user, publicConfig } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);

  // New ticket modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [assunto, setAssunto] = useState('');
  const [categoria, setCategoria] = useState('vendas');
  const [mensagem, setMensagem] = useState('');
  const [sending, setSending] = useState(false);

  // Reply message
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const res = await apiRequest<{ tickets: SupportTicket[] }>('/support/tickets');
      setTickets(res.tickets || []);
      if (res.tickets && res.tickets.length > 0 && !activeTicket) {
        setActiveTicket(res.tickets[0]);
      } else if (activeTicket) {
        // Refresh active ticket
        const updated = res.tickets.find(t => t.id === activeTicket.id);
        if (updated) setActiveTicket(updated);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assunto.trim() || !mensagem.trim()) return;

    try {
      setSending(true);
      const res = await apiRequest<{ ticket: SupportTicket }>('/support/tickets', {
        method: 'POST',
        body: JSON.stringify({ assunto, categoria, mensagem }),
      });

      setShowNewModal(false);
      setAssunto('');
      setMensagem('');
      await loadTickets();
      setActiveTicket(res.ticket);
    } catch (err: any) {
      alert(err.message || 'Erro ao abrir chamado.');
    } finally {
      setSending(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket || !replyText.trim()) return;

    try {
      setReplying(true);
      const res = await apiRequest<{ ticket: SupportTicket }>(`/support/tickets/${activeTicket.id}/reply`, {
        method: 'POST',
        body: JSON.stringify({ mensagem: replyText.trim() }),
      });

      setReplyText('');
      setActiveTicket(res.ticket);
      loadTickets();
    } catch (err: any) {
      alert(err.message || 'Erro ao enviar resposta.');
    } finally {
      setReplying(false);
    }
  };

  const handleWhatsAppClick = () => {
    const rawNumber = publicConfig?.whatsappSuporte || 'INSERIR_NUMERO_OFICIAL_AQUI';
    if (rawNumber === 'INSERIR_NUMERO_OFICIAL_AQUI') {
      alert(`[Central de Atendimento Oficial NEXO]\n\nO número de WhatsApp da plataforma está configurado como:\nWHATSAPP_SUPORTE = "${rawNumber}"\n\nPara disponibilizar o link direto, configure a variável de ambiente WHATSAPP_SUPORTE com o número oficial corporativo com DDD.`);
    } else {
      const cleanNum = rawNumber.replace(/\D/g, '');
      window.open(`https://wa.me/${cleanNum}?text=Ol%C3%A1%2C%20preciso%20de%20suporte%20na%20Plataforma%20NEXO.`, '_blank');
    }
  };

  const getStatusBadge = (status: SupportTicket['status']) => {
    switch (status) {
      case 'pendente':
        return <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 text-[10px] font-semibold border border-amber-200 dark:border-amber-800">Pendente</span>;
      case 'em_andamento':
        return <span className="px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 text-[10px] font-semibold border border-sky-200 dark:border-sky-800">Em Andamento</span>;
      case 'aguardando_resposta':
        return <span className="px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 text-[10px] font-semibold border border-purple-200 dark:border-purple-800">Aguardando sua resposta</span>;
      case 'concluido':
        return <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold border border-emerald-200 dark:border-emerald-800">Concluído</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in space-y-8">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-sky-700 to-indigo-800 text-white shadow-md">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-medium mb-2">
            <MessageSquare className="w-3.5 h-3.5" />
            NEXO SUPORTE — Atendimento e Comunicação Oficial
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Canal de Atendimento ao Cliente
          </h1>
          <p className="text-xs sm:text-sm text-sky-100 mt-1 max-w-2xl">
            Tire dúvidas sobre funcionalidades, relate dificuldades operacionais ou entre em contato com nossa equipe administrativa.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowNewModal(true)}
            className="px-4 py-2.5 rounded-xl bg-white text-sky-800 hover:bg-sky-50 font-bold text-xs flex items-center gap-2 transition-all shadow-md"
          >
            <Plus className="w-4 h-4" />
            Abrir Novo Chamado
          </button>
        </div>
      </div>

      {/* WhatsApp and FAQ strip */}
      <div className="p-5 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <Phone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Ajuda e Contato via WhatsApp Oficial
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Deseja atendimento em tempo real com nossa equipe de suporte? Inicie uma conversa.
            </p>
          </div>
        </div>

        <button
          onClick={handleWhatsAppClick}
          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition-colors shadow-sm shrink-0 whitespace-nowrap"
        >
          <MessageSquare className="w-4 h-4" />
          Conversar pelo WhatsApp
        </button>
      </div>

      {/* Tickets Master-Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left: Tickets List */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Minhas Solicitações ({tickets.length})
            </h2>
            <button
              onClick={loadTickets}
              className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Atualizar
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">Carregando seus chamados...</div>
          ) : tickets.length === 0 ? (
            <div className="p-8 text-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-400">
              Você ainda não possui nenhum chamado de suporte aberto.
            </div>
          ) : (
            <div className="space-y-2">
              {tickets.map(ticket => (
                <div
                  key={ticket.id}
                  onClick={() => setActiveTicket(ticket)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${activeTicket?.id === ticket.id ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-950/20 shadow-sm' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'}`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-[11px] font-bold text-slate-500">{ticket.ticketNumber}</span>
                    {getStatusBadge(ticket.status)}
                  </div>
                  <div className="font-semibold text-xs text-slate-900 dark:text-white line-clamp-1 mb-1">
                    {ticket.assunto}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="capitalize">{ticket.categoria}</span>
                    <span>{new Date(ticket.createdAt).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Ticket Conversation Details */}
        <div className="lg:col-span-7">
          {activeTicket ? (
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col h-[600px]">
              
              {/* Ticket Header */}
              <div className="pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold text-slate-500">{activeTicket.ticketNumber}</span>
                  {getStatusBadge(activeTicket.status)}
                </div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1">
                  {activeTicket.assunto}
                </h3>
                <div className="text-xs text-slate-500">
                  Categoria: <span className="capitalize font-medium text-slate-700 dark:text-slate-300">{activeTicket.categoria}</span> · Aberto em: {new Date(activeTicket.createdAt).toLocaleString('pt-BR')}
                </div>
              </div>

              {/* Message History */}
              <div className="flex-1 overflow-y-auto space-y-4 p-1">
                {/* Initial User Message */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
                  <div className="flex items-center justify-between font-semibold text-slate-900 dark:text-white mb-1">
                    <span>Você (Mensagem Inicial)</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      {new Date(activeTicket.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {activeTicket.mensagem}
                  </p>
                </div>

                {/* Follow-up Replies */}
                {activeTicket.respostas && activeTicket.respostas.map(resp => (
                  <div
                    key={resp.id}
                    className={`p-4 rounded-xl text-xs ${resp.autorRole === 'admin' ? 'bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 ml-4' : 'bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 mr-4'}`}
                  >
                    <div className="flex items-center justify-between font-semibold mb-1">
                      <span className={resp.autorRole === 'admin' ? 'text-sky-700 dark:text-sky-300' : 'text-slate-900 dark:text-white'}>
                        {resp.autorNome} {resp.autorRole === 'admin' && '(Equipe NEXO)'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        {new Date(resp.data).toLocaleDateString('pt-BR')} {new Date(resp.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                      {resp.mensagem}
                    </p>
                  </div>
                ))}
              </div>

              {/* Reply Box */}
              <form onSubmit={handleSendReply} className="pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Escreva sua resposta..."
                  disabled={replying || activeTicket.status === 'concluido'}
                  className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={replying || !replyText.trim() || activeTicket.status === 'concluido'}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  Enviar
                </button>
              </form>

            </div>
          ) : (
            <div className="p-12 text-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-400">
              Selecione um chamado ao lado para visualizar os detalhes e o histórico de atendimento.
            </div>
          )}
        </div>

      </div>

      {/* MODAL: NEW TICKET */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Abrir Nova Solicitação de Atendimento</h3>
              <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Assunto do Chamado *</label>
                <input
                  type="text"
                  required
                  value={assunto}
                  onChange={e => setAssunto(e.target.value)}
                  placeholder="Ex: Dúvida sobre conciliação bancária, Dificuldade no PDV..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Categoria</label>
                <select
                  value={categoria}
                  onChange={e => setCategoria(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value="vendas">Vendas e PDV</option>
                  <option value="estoque">Controle de Estoque</option>
                  <option value="financeiro">Módulo Financeiro e Despesas</option>
                  <option value="acesso">Acesso à Conta e Segurança</option>
                  <option value="duvida">Dúvida Operacional ou Conceitual</option>
                  <option value="sugestao">Sugestão de Melhoria</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Descrição Detalhada do Problema *</label>
                <textarea
                  rows={4}
                  required
                  value={mensagem}
                  onChange={e => setMensagem(e.target.value)}
                  placeholder="Explique o que aconteceu, passos para reproduzir e se há urgência operacional..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowNewModal(false)} className="px-4 py-2 rounded-lg border">Cancelar</button>
                <button
                  type="submit"
                  disabled={sending}
                  className="px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold disabled:opacity-50"
                >
                  {sending ? 'Registrando...' : 'Registrar Chamado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
