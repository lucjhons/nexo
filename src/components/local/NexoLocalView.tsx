import React, { useState, useEffect } from 'react';
import { Opportunity } from '../../types/index.js';
import { apiRequest } from '../../services/api.js';
import { Compass, Calendar, ExternalLink, Search, Filter, BookOpen, Users, Award, MapPin } from 'lucide-react';

export const NexoLocalView: React.FC = () => {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoria, setCategoria] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState('');

  const loadOpportunities = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (categoria !== 'todos') params.append('categoria', categoria);
      if (searchQuery) params.append('query', searchQuery);

      const res = await apiRequest<{ opportunities: Opportunity[] }>(`/opportunities?${params.toString()}`);
      setOpportunities(res.opportunities || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOpportunities();
  }, [categoria]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadOpportunities();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in space-y-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-700 text-white shadow-md">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-medium mb-2">
            <Compass className="w-3.5 h-3.5" />
            NEXO LOCAL — Ecossistema Regional de Oportunidades
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Cursos, Editais de Fomento e Eventos
          </h1>
          <p className="text-xs sm:text-sm text-amber-100 mt-1 max-w-2xl">
            Encontre programas de capacitação gratuitos do SEBRAE, linhas de crédito produtivo, feiras de negócios e editais de aceleração para seu projeto.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: 'todos', label: 'Todos' },
            { id: 'curso', label: 'Cursos & Oficinas' },
            { id: 'evento', label: 'Eventos & Feiras' },
            { id: 'edital', label: 'Editais & Fomento' },
            { id: 'apoio', label: 'Instituições de Apoio' },
          ].map(c => (
            <button
              key={c.id}
              onClick={() => setCategoria(c.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${categoria === c.id ? 'bg-amber-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearch} className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar oportunidade..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold"
          >
            Filtrar
          </button>
        </form>
      </div>

      {/* Opportunities Grid */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 text-xs">Carregando oportunidades da sua região...</div>
      ) : opportunities.length === 0 ? (
        <div className="p-8 text-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-400">
          Nenhuma oportunidade encontrada para os filtros selecionados.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {opportunities.map(opp => (
            <div
              key={opp.id}
              className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-2">
                  <span className="font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    {opp.categoria}
                  </span>
                  <span>{opp.organizacao}</span>
                </div>

                <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2 leading-tight">
                  {opp.titulo}
                </h3>

                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 mb-4 leading-relaxed">
                  {opp.descricao}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-slate-500">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{opp.dataInicio}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{opp.localizacao}</span>
                </div>

                <div className="pt-2">
                  <a
                    href={opp.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 px-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span>Acessar Informações Oficiais</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
