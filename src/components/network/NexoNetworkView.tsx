import React, { useState, useEffect } from 'react';
import { NetworkProfile } from '../../types/index.js';
import { apiRequest } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import { Users, Sparkles, Mail, Tag, Plus, Edit2, CheckCircle2, ShieldCheck, X } from 'lucide-react';

export const NexoNetworkView: React.FC = () => {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<NetworkProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipoFiltro, setTipoFiltro] = useState<string>('todos');

  // Modal to edit own public profile
  const [showEditModal, setShowEditModal] = useState(false);
  const [myProfileData, setMyProfileData] = useState({
    nomePublico: '',
    tipoPerfil: 'jovem' as NetworkProfile['tipoPerfil'],
    biografia: '',
    areaAtuacao: '',
    habilidades: '',
    contatoAutorizado: '',
    projetosPublicos: [{ titulo: '', resumo: '' }],
  });

  const loadProfiles = async () => {
    try {
      setLoading(true);
      const res = await apiRequest<{ profiles: NetworkProfile[] }>('/network/profiles');
      setProfiles(res.profiles || []);

      // If user has an existing profile, find it
      if (user) {
        const mine = (res.profiles || []).find(p => p.userId === user.id);
        if (mine) {
          setMyProfileData({
            nomePublico: mine.nomePublico,
            tipoPerfil: mine.tipoPerfil,
            biografia: mine.biografia,
            areaAtuacao: mine.areaAtuacao,
            habilidades: (mine.habilidades || []).join(', '),
            contatoAutorizado: mine.contatoAutorizado,
            projetosPublicos: mine.projetosPublicos && mine.projetosPublicos.length > 0 ? mine.projetosPublicos : [{ titulo: '', resumo: '' }],
          });
        } else {
          setMyProfileData({
            nomePublico: user.name,
            tipoPerfil: user.clientType === 'business' ? 'empreendedor' : 'jovem',
            biografia: '',
            areaAtuacao: '',
            habilidades: '',
            contatoAutorizado: user.email,
            projetosPublicos: [{ titulo: '', resumo: '' }],
          });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const skillsArray = myProfileData.habilidades.split(',').map(s => s.trim()).filter(Boolean);
      await apiRequest('/network/profile', {
        method: 'POST',
        body: JSON.stringify({
          nomePublico: myProfileData.nomePublico,
          tipoPerfil: myProfileData.tipoPerfil,
          biografia: myProfileData.biografia,
          areaAtuacao: myProfileData.areaAtuacao,
          habilidades: skillsArray,
          contatoAutorizado: myProfileData.contatoAutorizado,
          projetosPublicos: myProfileData.projetosPublicos.filter(p => p.titulo.trim()),
          visivel: true,
        }),
      });

      setShowEditModal(false);
      loadProfiles();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar perfil.');
    }
  };

  const filteredProfiles = profiles.filter(p => {
    if (tipoFiltro === 'todos') return true;
    return p.tipoPerfil === tipoFiltro;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in space-y-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-purple-800 to-indigo-900 text-white shadow-md">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-medium mb-2">
            <Users className="w-3.5 h-3.5" />
            NEXO NETWORK — Vitrine de Empreendedores e Projetos
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Conecte-se com Jovens Fundadores e Parceiros
          </h1>
          <p className="text-xs sm:text-sm text-purple-200 mt-1 max-w-2xl">
            Apresente sua ideia para a comunidade, descubra sinergias locais e encontre pessoas com habilidades complementares para tirar projetos do papel.
          </p>
        </div>

        {user && (
          <button
            onClick={() => setShowEditModal(true)}
            className="px-4 py-2.5 rounded-xl bg-white text-purple-900 hover:bg-purple-50 font-bold text-xs flex items-center gap-2 transition-all shadow-md shrink-0"
          >
            <Edit2 className="w-4 h-4" />
            Meu Perfil na Rede
          </button>
        )}
      </div>

      {/* Filter strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs font-semibold text-slate-500 mr-2">Filtrar por papel:</span>
        {[
          { id: 'todos', label: 'Todos os Membros' },
          { id: 'jovem', label: 'Jovens Empreendedores' },
          { id: 'empreendedor', label: 'Empresas Estabelecidas' },
          { id: 'parceiro', label: 'Mentores e Parceiros' },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setTipoFiltro(f.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${tipoFiltro === f.id ? 'bg-purple-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Profiles Grid */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 text-xs">Carregando membros da rede...</div>
      ) : filteredProfiles.length === 0 ? (
        <div className="p-8 text-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-400">
          Nenhum perfil cadastrado nesta categoria ainda.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProfiles.map(profile => (
            <div
              key={profile.id}
              className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold flex items-center justify-center text-sm">
                    {profile.nomePublico.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                      {profile.nomePublico}
                    </h3>
                    <span className="text-[11px] text-purple-600 dark:text-purple-400 font-medium capitalize">
                      {profile.tipoPerfil === 'jovem' ? 'Jovem Empreendedor' : profile.tipoPerfil === 'empreendedor' ? 'Empresa em Operação' : 'Mentor / Parceiro'}
                    </span>
                  </div>
                </div>

                <div className="text-xs font-semibold text-slate-500 mb-1">
                  {profile.areaAtuacao}
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 mb-4 leading-relaxed">
                  {profile.biografia}
                </p>

                {/* Skills tags */}
                {profile.habilidades && profile.habilidades.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {profile.habilidades.map((sk, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px]">
                        {sk}
                      </span>
                    ))}
                  </div>
                )}

                {/* Showcase Projects */}
                {profile.projetosPublicos && profile.projetosPublicos.length > 0 && (
                  <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 mb-4">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block">
                      Iniciativa em Destaque:
                    </span>
                    {profile.projetosPublicos.map((proj, idx) => (
                      <div key={idx}>
                        <div className="font-semibold text-xs text-slate-900 dark:text-white">{proj.titulo}</div>
                        <p className="text-[11px] text-slate-500 line-clamp-2">{proj.resumo}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Authorized Contact */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">Contato:</span>
                <span className="font-mono text-purple-600 dark:text-purple-400 font-semibold select-all">
                  {profile.contatoAutorizado || 'Via Plataforma'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: EDIT MY PUBLIC PROFILE */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Meu Perfil Público no NEXO Network</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Nome de Exibição Público</label>
                <input
                  type="text"
                  required
                  value={myProfileData.nomePublico}
                  onChange={e => setMyProfileData({ ...myProfileData, nomePublico: e.target.value })}
                  placeholder="Seu nome ou marca pública"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Tipo de Perfil</label>
                  <select
                    value={myProfileData.tipoPerfil}
                    onChange={e => setMyProfileData({ ...myProfileData, tipoPerfil: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="jovem">Jovem Empreendedor</option>
                    <option value="empreendedor">Empreendedor / Empresa</option>
                    <option value="parceiro">Mentor / Parceiro</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Área de Atuação</label>
                  <input
                    type="text"
                    value={myProfileData.areaAtuacao}
                    onChange={e => setMyProfileData({ ...myProfileData, areaAtuacao: e.target.value })}
                    placeholder="Ex: Alimentos, Tecnologia, Artesanato"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Biografia Resumida</label>
                <textarea
                  rows={2}
                  value={myProfileData.biografia}
                  onChange={e => setMyProfileData({ ...myProfileData, biografia: e.target.value })}
                  placeholder="Compartilhe seus objetivos e o que você busca na rede..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Habilidades Principais (separadas por vírgula)</label>
                <input
                  type="text"
                  value={myProfileData.habilidades}
                  onChange={e => setMyProfileData({ ...myProfileData, habilidades: e.target.value })}
                  placeholder="Ex: Vendas, Design, Gestão, Programação, Gastronomia"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Contato Autorizado para a Comunidade</label>
                <input
                  type="text"
                  value={myProfileData.contatoAutorizado}
                  onChange={e => setMyProfileData({ ...myProfileData, contatoAutorizado: e.target.value })}
                  placeholder="Ex: seu-email@exemplo.com ou link de contato"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="font-semibold block mb-2">Projeto para Apresentar na Vitrine:</span>
                <input
                  type="text"
                  value={myProfileData.projetosPublicos[0]?.titulo || ''}
                  onChange={e => {
                    const list = [...myProfileData.projetosPublicos];
                    list[0] = { ...list[0], titulo: e.target.value };
                    setMyProfileData({ ...myProfileData, projetosPublicos: list });
                  }}
                  placeholder="Título do Projeto"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 mb-2"
                />
                <textarea
                  rows={2}
                  value={myProfileData.projetosPublicos[0]?.resumo || ''}
                  onChange={e => {
                    const list = [...myProfileData.projetosPublicos];
                    list[0] = { ...list[0], resumo: e.target.value };
                    setMyProfileData({ ...myProfileData, projetosPublicos: list });
                  }}
                  placeholder="Resumo do projeto em 2 frases..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 rounded-lg border">Cancelar</button>
                <button type="submit" className="px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold">
                  Salvar e Publicar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
