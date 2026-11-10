import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { Navbar } from './components/Navbar.js';
import { LandingPage } from './components/LandingPage.js';
import { AuthModal } from './components/auth/AuthModal.js';
import { NexoJovemView } from './components/jovem/NexoJovemView.js';
import { NexoBusinessView } from './components/business/NexoBusinessView.js';
import { NexoInteligenciaView } from './components/intelligence/NexoInteligenciaView.js';
import { NexoLocalView } from './components/local/NexoLocalView.js';
import { NexoNetworkView } from './components/network/NexoNetworkView.js';
import { NexoSuporteView } from './components/support/NexoSuporteView.js';
import { AdminDashboard } from './components/admin/AdminDashboard.js';
import { 
  Rocket, Briefcase, Sparkles, Compass, Users, 
  MessageSquare, Shield, ChevronRight
} from 'lucide-react';

const MainApp: React.FC = () => {
  const { user, selectClientType } = useAuth();
  const [currentView, setCurrentView] = useState<string>('landing');
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login');

  const handleOpenAuth = (initialTab: 'login' | 'register' = 'login') => {
    setAuthModalTab(initialTab);
    setAuthModalOpen(true);
  };

  const handleNavigate = (view: string) => {
    // Protected admin check
    if (view === 'admin' && user?.role !== 'admin') {
      alert('Acesso restrito a administradores autorizados.');
      return;
    }

    // Client views requiring auth
    if ((view === 'jovem' || view === 'business' || view === 'inteligencia' || view === 'suporte') && !user) {
      handleOpenAuth('login');
      return;
    }

    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      
      {/* Top Bar adhering to Top Bar Contract */}
      <Navbar
        onOpenAuth={handleOpenAuth}
        currentView={currentView}
        onNavigate={handleNavigate}
      />

      {/* Logged In Environment Quick Switcher Strip */}
      {user && currentView !== 'landing' && (
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-2.5 px-4 sm:px-8">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
            
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Ambientes Disponíveis:</span>
              
              <button
                onClick={async () => {
                  await selectClientType('jovem');
                  handleNavigate('jovem');
                }}
                className={`px-3 py-1 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${currentView === 'jovem' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
              >
                <Rocket className="w-3.5 h-3.5" />
                NEXO Jovem
              </button>

              <button
                onClick={async () => {
                  await selectClientType('business');
                  handleNavigate('business');
                }}
                className={`px-3 py-1 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${currentView === 'business' ? 'bg-sky-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                NEXO Business
              </button>

              <button
                onClick={() => handleNavigate('inteligencia')}
                className={`px-3 py-1 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${currentView === 'inteligencia' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                NEXO Inteligência
              </button>
            </div>

            <div className="flex items-center gap-4 text-slate-500">
              <span className="hidden sm:inline">
                Sessão segura ativa: <strong className="text-slate-800 dark:text-slate-200">{user.email}</strong>
              </span>
            </div>

          </div>
        </div>
      )}

      {/* Main View Router */}
      <main className="flex-1">
        {currentView === 'landing' && (
          <LandingPage onOpenAuth={handleOpenAuth} onNavigate={handleNavigate} />
        )}

        {currentView === 'jovem' && <NexoJovemView />}

        {currentView === 'business' && <NexoBusinessView />}

        {currentView === 'inteligencia' && <NexoInteligenciaView />}

        {currentView === 'local' && <NexoLocalView />}

        {currentView === 'network' && <NexoNetworkView />}

        {currentView === 'suporte' && <NexoSuporteView />}

        {currentView === 'admin' && <AdminDashboard />}
      </main>

      {/* Auth Modal with Login, Register, and "Esqueci minha senha" verification */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialTab={authModalTab}
        onSuccessRedirect={(type) => {
          if (type === 'admin') handleNavigate('admin');
          else if (type === 'jovem') handleNavigate('jovem');
          else handleNavigate('business');
        }}
      />

    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
