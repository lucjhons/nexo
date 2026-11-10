import React, { useState, useEffect } from 'react';
import { SupportTicket, Opportunity, AuditLog, AdminUserRecord } from '../../types/index.js';
import { apiRequest } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import { 
  Shield, Users, MessageSquare, Compass, Activity, 
  AlertTriangle, CheckCircle, Clock, Send, Plus, 
  Trash2, Edit2, RefreshCw, X, Lock, CheckCircle2
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'tickets' | 'opportunities' | 'audit'>('stats');

  // Stats
  const [stats, setStats] = useState<any>(null);

  // Users
  const [usersList, setUsersList] = useState<AdminUserRecord[]>([]);

  // Tickets
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [replyStatus, setReplyStatus] = useState<SupportTicket['status']>('aguardando_resposta');
  const [priorityFilter, setPriorityFilter] = useState<string>('todos');

  // Opportunities
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [showOppModal, setShowOppModal] = useState(false);
  const [editingOpp, setEditingOpp] = useState<Partial<Opportunity> | null>(null);

  // Audit
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, usersRes, tktRes, oppRes, audRes] = await Promise.all([
        apiRequest<{ stats: any }>('/admin/stats'),
        apiRequest<{ users: AdminUserRecord[] }>('/admin/users'),
        apiRequest<{ tickets: SupportTicket[] }>('/admin/tickets'),
        apiRequest<{ opportunities: Opportunity[] }>('/opportunities'),
        apiRequest<{ logs: AuditLog[] }>('/admin/audit-logs'),
      ]);

      setStats(statsRes.stats);
      setUsersList(usersRes.users || []);
      setTickets(tktRes.tickets || []);
      setOpportunities(oppRes.opportunities || []);
      setAuditLogs(audRes.logs || []);

      if (tktRes.tickets && tktRes.tickets.length > 0 && !selectedTicket) {
        setSelectedTicket(tktRes.tickets[0]);
      } else if (selectedTicket) {
        const current = tktRes.tickets.find((t: any) => t.id === selectedTicket.id);
        if (current) setSelectedTicket(current);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleUserStatus = async (userId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    const confirmMsg = nextStatus === 'suspended'
      ? 'Deseja suspender esta conta? O usuário perderá o acesso à plataforma.'
      : 'Deseja reativar esta conta de usuário?';

    if (!confirm(confirmMsg)) return;

    try {
      await apiRequest(`/admin/users/${userId}/status`, {
        method: 'POST',
        body: JSON.stringify({ status: nextStatus }),
      });
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleReplyTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyMessage.trim()) return;

    try {
      const res = await apiRequest<{ ticket: SupportTicket }>(`/admin/tickets/${selectedTicket.id}/reply`, {
        method: 'POST',
        body: JSON.stringify({ mensagem: replyMessage.trim(), status: replyStatus }),
      });

      setReplyMessage('');
      setSelectedTicket(res.ticket);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleChangeTicketStatus = async (ticketId: string, status: SupportTicket['status']) => {
    try {
      const res = await apiRequest<{ ticket: SupportTicket }>(`/admin/tickets/${ticketId}/status`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      });
      setSelectedTicket(res.ticket);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSaveOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOpp?.titulo || !editingOpp?.organizacao) return;

    try {
      await apiRequest('/admin/opportunities', {
        method: 'POST',
        body: JSON.stringify(editingOpp),
      });
      setShowOppModal(false);
      setEditingOpp(null);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteOpportunity = async (id: string) => {
    if (!confirm('Deseja excluir esta oportunidade pública?')) return;
    try {
      await apiRequest(`/admin/opportunities/${id}`, { method: 'DELETE' });
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Filter tickets by priority
  const filteredTickets = tickets.filter(t => {
    if (priorityFilter === 'todos') return true;
    return t.prioridade === priorityFilter;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in space-y-8">
      
      {/* Admin Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 to-amber-950 text-white shadow-md border border-amber-900/30">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold mb-2">
            <Shield className="w-3.5 h-3.5" />
            PAINEL ADMINISTRATIVO CENTRAL — Acesso Protegido e Auditado
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Gestão da Plataforma NEXO
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
            Administração de contas, fila de suporte com triagem automática de criticidade e curadoria de oportunidades.
          </p>
        </div>

        <button
          onClick={loadData}
          className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs flex items-center gap-2 transition-colors border border-white/20 shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Sincronizar
        </button>
      </div>

      {/* Mandatory Privacy Enclosure Notice */}
      <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
        <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong>Restrição Institucional de Acesso (Privacidade por Design):</strong> Por diretriz do sistema e da LGPD, os administradores NÃO possuem acesso às contas bancárias, vendas individuais, dados financeiros privados, CPFs completos ou bases de clientes cadastradas pelas empresas. O painel administrativo opera com permissões de gestão técnica, operacional e moderação de conteúdo público.
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-1">
        {[
          { id: 'stats', label: 'Indicadores Gerais', icon: Activity },
          { id: 'tickets', label: `Fila de Atendimento (${tickets.filter(t => t.status !== 'concluido').length} abertos)`, icon: MessageSquare },
          { id: 'users', label: `Usuários Cadastrados (${usersList.length})`, icon: Users },
          { id: 'opportunities', label: `Gerenciar Oportunidades (${opportunities.length})`, icon: Compass },
          { id: 'audit', label: `Trilhas de Auditoria (${auditLogs.length})`, icon: Shield },
        ].map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-4 py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${activeTab === t.id ? 'border-amber-600 text-amber-600 dark:text-amber-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* 1. TAB: GENERAL STATS */}
      {activeTab === 'stats' && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <span className="text-xs font-medium text-slate-500 block mb-1">Total de Contas</span>
              <div className="font-mono text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                {stats.totalUsers}
              </div>
              <span className="text-[11px] text-emerald-600 font-semibold block mt-1">
                {stats.activeUsers} ativas
              </span>
            </div>

            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <span className="text-xs font-medium text-slate-500 block mb-1">Empresas Cadastradas</span>
              <div className="font-mono text-2xl font-bold text-sky-600 dark:text-sky-400 tabular-nums">
                {stats.totalCompanies}
              </div>
              <span className="text-[11px] text-slate-400 block mt-1">NEXO Business</span>
            </div>

            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <span className="text-xs font-medium text-slate-500 block mb-1">Projetos Incubados</span>
              <div className="font-mono text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {stats.totalProjects}
              </div>
              <span className="text-[11px] text-slate-400 block mt-1">NEXO Jovem</span>
            </div>

            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <span className="text-xs font-medium text-slate-500 block mb-1">Chamados em Fila</span>
              <div className="font-mono text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                {stats.pendingTickets}
              </div>
              <span className="text-[11px] text-rose-600 font-semibold block mt-1">
                {stats.highPriorityTickets} com Prioridade ALTA
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 2. TAB: SUPPORT TICKETS QUEUE WITH AUTOMATED CLASSIFICATION */}
      {activeTab === 'tickets' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Fila de Atendimento ao Cliente com Triagem Inteligente
              </h2>
              <p className="text-xs text-slate-500">
                A prioridade é atribuída automaticamente à solicitação com base em urgência e risco de interrupção (visível apenas para admins).
              </p>
            </div>

            {/* Priority filter */}
            <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs">
              <button
                onClick={() => setPriorityFilter('todos')}
                className={`px-3 py-1 rounded-md font-semibold transition-colors ${priorityFilter === 'todos' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}
              >
                Todas ({tickets.length})
              </button>
              <button
                onClick={() => setPriorityFilter('alta')}
                className={`px-3 py-1 rounded-md font-semibold transition-colors ${priorityFilter === 'alta' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-500'}`}
              >
                Alta ({tickets.filter(t => t.prioridade === 'alta').length})
              </button>
              <button
                onClick={() => setPriorityFilter('media')}
                className={`px-3 py-1 rounded-md font-semibold transition-colors ${priorityFilter === 'media' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-500'}`}
              >
                Média ({tickets.filter(t => t.prioridade === 'media').length})
              </button>
              <button
                onClick={() => setPriorityFilter('baixa')}
                className={`px-3 py-1 rounded-md font-semibold transition-colors ${priorityFilter === 'baixa' ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-500'}`}
              >
                Baixa ({tickets.filter(t => t.prioridade === 'baixa').length})
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* List */}
            <div className="lg:col-span-5 space-y-2.5">
              {filteredTickets.map(ticket => (
                <div
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedTicket?.id === ticket.id ? 'border-amber-500 bg-amber-50/40 dark:bg-amber-950/20 shadow-sm' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'}`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-xs font-bold text-slate-500">{ticket.ticketNumber}</span>
                    <div className="flex items-center gap-1.5">
                      {/* Priority Badge */}
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${ticket.prioridade === 'alta' ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800' : ticket.prioridade === 'media' ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
                        Prioridade {ticket.prioridade}
                      </span>
                    </div>
                  </div>

                  <div className="font-bold text-xs text-slate-900 dark:text-white mb-1 line-clamp-1">
                    {ticket.assunto}
                  </div>

                  <div className="text-[11px] text-slate-500 mb-2">
                    De: <strong>{ticket.userName}</strong> ({ticket.userEmail})
                  </div>

                  {ticket.prioridadeMotivo && (
                    <div className="p-2 rounded bg-slate-50 dark:bg-slate-800/80 text-[10px] text-slate-600 dark:text-slate-400 mb-2">
                      <strong>Motivo Classificação:</strong> {ticket.prioridadeMotivo}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <span className="capitalize">Status: {ticket.status.replace('_', ' ')}</span>
                    <span>{new Date(ticket.createdAt).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Active Ticket Workbench */}
            <div className="lg:col-span-7">
              {selectedTicket ? (
                <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col h-[650px]">
                  
                  {/* Header */}
                  <div className="pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-500">{selectedTicket.ticketNumber}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${selectedTicket.prioridade === 'alta' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                          Prioridade: {selectedTicket.prioridade}
                        </span>
                      </div>
                      
                      {/* Status switcher */}
                      <select
                        value={selectedTicket.status}
                        onChange={e => handleChangeTicketStatus(selectedTicket.id, e.target.value as any)}
                        className="text-xs px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                      >
                        <option value="pendente">Pendente</option>
                        <option value="em_andamento">Em Andamento</option>
                        <option value="aguardando_resposta">Aguardando Resposta</option>
                        <option value="concluido">Concluído</option>
                      </select>
                    </div>

                    <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1">
                      {selectedTicket.assunto}
                    </h3>
                    <div className="text-xs text-slate-500">
                      Cliente: {selectedTicket.userName} ({selectedTicket.userEmail}) · Categoria: <span className="capitalize font-semibold">{selectedTicket.categoria}</span>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto space-y-4 p-1">
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
                      <div className="flex items-center justify-between font-semibold text-slate-900 dark:text-white mb-1">
                        <span>{selectedTicket.userName} (Solicitante)</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          {new Date(selectedTicket.createdAt).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                        {selectedTicket.mensagem}
                      </p>
                    </div>

                    {selectedTicket.respostas && selectedTicket.respostas.map(r => (
                      <div
                        key={r.id}
                        className={`p-4 rounded-xl text-xs ${r.autorRole === 'admin' ? 'bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 ml-4' : 'bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 mr-4'}`}
                      >
                        <div className="flex items-center justify-between font-semibold mb-1">
                          <span className={r.autorRole === 'admin' ? 'text-amber-800 dark:text-amber-300 font-bold' : 'text-slate-900 dark:text-white'}>
                            {r.autorNome} ({r.autorRole === 'admin' ? 'Atendente NEXO' : 'Cliente'})
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            {new Date(r.data).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                          {r.mensagem}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Admin Reply Form */}
                  <form onSubmit={handleReplyTicket} className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <textarea
                      rows={2}
                      value={replyMessage}
                      onChange={e => setReplyMessage(e.target.value)}
                      placeholder="Escreva a resposta administrativa para o cliente..."
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-500">Mudar status para:</span>
                        <select
                          value={replyStatus}
                          onChange={e => setReplyStatus(e.target.value as any)}
                          className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                        >
                          <option value="aguardando_resposta">Aguardando Resposta do Cliente</option>
                          <option value="em_andamento">Em Andamento</option>
                          <option value="concluido">Concluído / Resolvido</option>
                        </select>
                      </div>

                      <button
                        type="submit"
                        disabled={!replyMessage.trim()}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 disabled:opacity-50 transition-colors"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Responder Cliente
                      </button>
                    </div>
                  </form>

                </div>
              ) : (
                <div className="p-12 text-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-400">
                  Selecione um chamado na fila para responder.
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* 3. TAB: USER ACCOUNTS MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Gerenciamento de Contas e Permissões</h2>
              <p className="text-xs text-slate-500">Controle de ativação e suspensão de contas. Dados financeiros privados e CPFs continuam inacessíveis.</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">Nome do Titular</th>
                  <th className="px-4 py-3">E-mail Cadastrado</th>
                  <th className="px-4 py-3">Função / Perfil</th>
                  <th className="px-4 py-3">Cadastro</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Ação Administrativa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {usersList.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{u.name}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-mono">{u.email}</td>
                    <td className="px-4 py-3 capitalize">
                      {u.role === 'admin' ? (
                        <span className="font-bold text-amber-600">Administrador</span>
                      ) : (
                        u.clientType === 'jovem' ? 'NEXO Jovem' : 'NEXO Business'
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono">
                      {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${u.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                        {u.status === 'active' ? 'Ativa' : 'Suspensa'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {u.role !== 'admin' && (
                        <button
                          onClick={() => handleToggleUserStatus(u.id, u.status)}
                          className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${u.status === 'active' ? 'bg-rose-50 text-rose-700 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
                        >
                          {u.status === 'active' ? 'Suspender Conta' : 'Reativar Conta'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. TAB: OPPORTUNITIES MANAGER */}
      {activeTab === 'opportunities' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Curadoria de Oportunidades Públicas</h2>
              <p className="text-xs text-slate-500">Adicione e mantenha cursos do SEBRAE, feiras locais e editais abertos.</p>
            </div>
            <button
              onClick={() => {
                setEditingOpp({
                  titulo: '',
                  categoria: 'curso',
                  organizacao: 'SEBRAE',
                  descricao: '',
                  link: 'https://',
                  dataInicio: 'Inscrições abertas',
                  localizacao: 'Regional',
                  destaque: false,
                });
                setShowOppModal(true);
              }}
              className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Nova Oportunidade
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">Título</th>
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3">Instituição</th>
                  <th className="px-4 py-3">Período</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {opportunities.map(opp => (
                  <tr key={opp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{opp.titulo}</td>
                    <td className="px-4 py-3 capitalize text-amber-600">{opp.categoria}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{opp.organizacao}</td>
                    <td className="px-4 py-3 text-slate-500">{opp.dataInicio}</td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => {
                          setEditingOpp(opp);
                          setShowOppModal(true);
                        }}
                        className="p-1 text-slate-400 hover:text-sky-600"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteOpportunity(opp.id)}
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

      {/* 5. TAB: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Trilhas de Auditoria e Segurança da Plataforma</h2>
            <p className="text-xs text-slate-500">Histórico de ações críticas registradas pelo servidor para compliance e auditoria interna.</p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">Data / Hora</th>
                  <th className="px-4 py-3">Ação</th>
                  <th className="px-4 py-3">Recurso</th>
                  <th className="px-4 py-3">Usuário</th>
                  <th className="px-4 py-3">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 font-bold text-amber-600 dark:text-amber-400">{log.action}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{log.resource}</td>
                    <td className="px-4 py-3 text-slate-500">{log.userEmail || log.userId || 'Sistema'}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-sans">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: OPPORTUNITY */}
      {showOppModal && editingOpp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Oportunidade Pública</h3>
              <button onClick={() => setShowOppModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOpportunity} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Título *</label>
                <input
                  type="text"
                  required
                  value={editingOpp.titulo || ''}
                  onChange={e => setEditingOpp({ ...editingOpp, titulo: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Categoria</label>
                  <select
                    value={editingOpp.categoria || 'curso'}
                    onChange={e => setEditingOpp({ ...editingOpp, categoria: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="curso">Curso / Capacitação</option>
                    <option value="evento">Evento / Feira</option>
                    <option value="edital">Edital de Fomento</option>
                    <option value="apoio">Instituição de Apoio</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Organização Responsável</label>
                  <input
                    type="text"
                    required
                    value={editingOpp.organizacao || ''}
                    onChange={e => setEditingOpp({ ...editingOpp, organizacao: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Descrição</label>
                <textarea
                  rows={3}
                  value={editingOpp.descricao || ''}
                  onChange={e => setEditingOpp({ ...editingOpp, descricao: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Link Oficial</label>
                <input
                  type="url"
                  value={editingOpp.link || ''}
                  onChange={e => setEditingOpp({ ...editingOpp, link: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Prazo / Período</label>
                  <input
                    type="text"
                    value={editingOpp.dataInicio || ''}
                    onChange={e => setEditingOpp({ ...editingOpp, dataInicio: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Localização</label>
                  <input
                    type="text"
                    value={editingOpp.localizacao || ''}
                    onChange={e => setEditingOpp({ ...editingOpp, localizacao: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowOppModal(false)} className="px-4 py-2 rounded-lg border">Cancelar</button>
                <button type="submit" className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold">Salvar Oportunidade</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
