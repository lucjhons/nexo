import React from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Sun, Moon, MessageSquare, LogOut, Shield, Briefcase, Sparkles, User as UserIcon } from 'lucide-react';

interface NavbarProps {
  onOpenAuth: (initialTab?: 'login' | 'register') => void;
  currentView: string;
  onNavigate: (view: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAuth, currentView, onNavigate }) => {
  const { user, logout, theme, toggleTheme, publicConfig } = useAuth();

  const handleWhatsAppClick = () => {
    const rawNumber = publicConfig?.whatsappSuporte || 'INSERIR_NUMERO_OFICIAL_AQUI';
    if (rawNumber === 'INSERIR_NUMERO_OFICIAL_AQUI') {
      alert(`[Central de Atendimento NEXO]\n\nO número oficial de WhatsApp está configurado como:\nWHATSAPP_SUPORTE = "${rawNumber}"\n\nPara disponibilizar o link direto, configure a variável de ambiente WHATSAPP_SUPORTE com o número oficial com DDD.`);
    } else {
      const cleanNum = rawNumber.replace(/\D/g, '');
      window.open(`https://wa.me/${cleanNum}?text=Ol%C3%A1%2C%20gostaria%20de%20informa%C3%A7%C3%B5es%20sobre%20a%20Plataforma%20NEXO.`, '_blank');
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        
        {/* Zone 1: Brand Wordmark */}
        <button
          onClick={() => onNavigate('landing')}
          className="flex items-center gap-2.5 text-left group focus:outline-none"
        >
          <div className="w-9 h-9 rounded-lg bg-sky-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
            N
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
              NEXO
            </span>
          </div>
        </button>

        {/* Zone 2: Navigation Links (single line, clean unboxed typography) */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600 dark:text-slate-300">
          <button
            onClick={() => onNavigate('landing')}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-sky-600 dark:hover:text-sky-400 ${currentView === 'landing' ? 'text-sky-600 dark:text-sky-400 font-semibold' : ''}`}
          >
            Início
          </button>
          <button
            onClick={() => onNavigate('jovem')}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-sky-600 dark:hover:text-sky-400 ${currentView === 'jovem' ? 'text-sky-600 dark:text-sky-400 font-semibold' : ''}`}
          >
            Nexo Jovem
          </button>
          <button
            onClick={() => onNavigate('business')}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-sky-600 dark:hover:text-sky-400 ${currentView === 'business' ? 'text-sky-600 dark:text-sky-400 font-semibold' : ''}`}
          >
            Nexo Business
          </button>
          <button
            onClick={() => onNavigate('local')}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-sky-600 dark:hover:text-sky-400 ${currentView === 'local' ? 'text-sky-600 dark:text-sky-400 font-semibold' : ''}`}
          >
            Oportunidades
          </button>
          <button
            onClick={() => onNavigate('network')}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-sky-600 dark:hover:text-sky-400 ${currentView === 'network' ? 'text-sky-600 dark:text-sky-400 font-semibold' : ''}`}
          >
            Nexo Network
          </button>
          <button
            onClick={() => onNavigate('suporte')}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-sky-600 dark:hover:text-sky-400 ${currentView === 'suporte' ? 'text-sky-600 dark:text-sky-400 font-semibold' : ''}`}
          >
            Suporte
          </button>
          {user?.role === 'admin' && (
            <button
              onClick={() => onNavigate('admin')}
              className={`flex items-center gap-1.5 whitespace-nowrap shrink-0 text-amber-600 dark:text-amber-400 font-semibold hover:text-amber-700`}
            >
              <Shield className="w-4 h-4" />
              Painel Admin
            </button>
          )}
        </nav>

        {/* Zone 3: Actions & Profile */}
        <div className="flex items-center gap-3 shrink-0">
          {/* WhatsApp Support shortcut */}
          <button
            onClick={handleWhatsAppClick}
            title="Ajuda e Contato via WhatsApp Oficial"
            className="p-2 text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {user ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (user.role === 'admin') onNavigate('admin');
                  else if (user.clientType === 'jovem') onNavigate('jovem');
                  else onNavigate('business');
                }}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
              >
                <div className="w-7 h-7 rounded-full bg-sky-600 text-white flex items-center justify-center text-xs font-semibold">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block text-xs leading-tight">
                  <div className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[120px]">
                    {user.name}
                  </div>
                  <div className="text-slate-500 dark:text-slate-400 capitalize text-[10px]">
                    {user.role === 'admin' ? 'Administrador' : (user.clientType === 'jovem' ? 'Nexo Jovem' : 'Nexo Business')}
                  </div>
                </div>
              </button>

              <button
                onClick={() => logout()}
                title="Encerrar sessão"
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenAuth('login')}
                className="px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400 transition-colors whitespace-nowrap shrink-0"
              >
                Entrar
              </button>
              <button
                onClick={() => onOpenAuth('register')}
                className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-500 transition-colors shadow-sm whitespace-nowrap shrink-0"
              >
                Criar Conta
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
