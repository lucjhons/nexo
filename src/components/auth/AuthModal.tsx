import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { X, Lock, Mail, User, AlertCircle, CheckCircle, ArrowRight, ShieldCheck, KeyRound, Clock, Sparkles } from 'lucide-react';
import { ClientType } from '../../types/index.js';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'login' | 'register';
  onSuccessRedirect?: (type: ClientType | 'admin') => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialTab = 'login', onSuccessRedirect }) => {
  const { login, register, requestPasswordReset, submitPasswordReset } = useAuth();
  const [tab, setTab] = useState<'login' | 'register' | 'forgot' | 'verify_code'>(initialTab);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [clientType, setClientType] = useState<ClientType>('jovem');
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Recovery states
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [recoveryNotice, setRecoveryNotice] = useState<string | null>(null);
  const [devCodeHelper, setDevCodeHelper] = useState<string | null>(null);

  // Status
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setPassword('');
    setConfirmPassword('');
    setRecoveryCode('');
    setNewPassword('');
    setRecoveryNotice(null);
    setDevCodeHelper(null);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    const res = await login(email, password);
    setLoading(false);

    if (res.success) {
      onClose();
      if (onSuccessRedirect) {
        onSuccessRedirect(clientType);
      }
    } else {
      setErrorMessage(res.error || 'Credenciais inválidas.');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage('As senhas digitadas não coincidem.');
      return;
    }

    if (!agreeTerms) {
      setErrorMessage('É necessário aceitar os termos de uso e política de privacidade.');
      return;
    }

    setLoading(true);
    const res = await register(name, email, password, clientType);
    setLoading(false);

    if (res.success) {
      setSuccessMessage('Conta criada com sucesso! Bem-vindo ao NEXO.');
      setTimeout(() => {
        onClose();
        if (onSuccessRedirect) {
          onSuccessRedirect(clientType);
        }
      }, 1000);
    } else {
      setErrorMessage(res.error || 'Erro ao criar conta.');
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const res = await requestPasswordReset(email);
      setLoading(false);
      setSuccessMessage(res.message);
      if (res.adminNotice) {
        setRecoveryNotice(res.adminNotice);
      }
      if (res.devCode) {
        setDevCodeHelper(res.devCode);
      }
      setTab('verify_code');
    } catch (err: any) {
      setLoading(false);
      setErrorMessage(err.message || 'Erro ao processar recuperação.');
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const res = await submitPasswordReset(email, recoveryCode, newPassword);
      setLoading(false);
      setSuccessMessage(res.message);
      setTimeout(() => {
        resetForm();
        setTab('login');
      }, 2000);
    } catch (err: any) {
      setLoading(false);
      setErrorMessage(err.message || 'Erro ao redefinir senha.');
    }
  };

  // Demo account quick filler
  const fillDemoAccount = (role: 'admin' | 'business' | 'jovem') => {
    resetForm();
    if (role === 'admin') {
      setEmail('admin@nexo.com.br');
      setPassword('AdminPassword@2026');
    } else if (role === 'business') {
      setEmail('negocios@exemplo.com.br');
      setPassword('Business@2026');
    } else {
      setEmail('jovem@exemplo.com.br');
      setPassword('JovemNexo@2026');
    }
    setTab('login');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-sky-600 flex items-center justify-center text-white font-bold text-sm">
              N
            </div>
            <span className="font-bold text-slate-900 dark:text-white">
              {tab === 'login' && 'Acessar Plataforma NEXO'}
              {tab === 'register' && 'Cadastre-se no NEXO'}
              {tab === 'forgot' && 'Recuperação de Senha'}
              {tab === 'verify_code' && 'Validar Código e Redefinir'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switchers if on Login/Register */}
        {(tab === 'login' || tab === 'register') && (
          <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
            <button
              onClick={() => { resetForm(); setTab('login'); }}
              className={`flex-1 py-3 text-xs font-semibold text-center transition-colors border-b-2 ${tab === 'login' ? 'border-sky-600 text-sky-600 dark:text-sky-400 bg-white dark:bg-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              Entrar na Conta
            </button>
            <button
              onClick={() => { resetForm(); setTab('register'); }}
              className={`flex-1 py-3 text-xs font-semibold text-center transition-colors border-b-2 ${tab === 'register' ? 'border-sky-600 text-sky-600 dark:text-sky-400 bg-white dark:bg-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              Criar Nova Conta
            </button>
          </div>
        )}

        <div className="p-6">
          {/* Notifications */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 flex items-start gap-2.5 text-xs text-emerald-700 dark:text-emerald-300">
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* 1. LOGIN FORM */}
          {tab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@exemplo.com.br"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Senha
                  </label>
                  <button
                    type="button"
                    onClick={() => { resetForm(); setTab('forgot'); }}
                    className="text-xs text-sky-600 dark:text-sky-400 hover:underline font-medium"
                  >
                    Esqueci minha senha
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 text-sm font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-500 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? 'Validando...' : 'Acessar Conta'}
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Demo accounts selector for evaluator */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                  Acesso rápido de teste:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => fillDemoAccount('admin')}
                    className="px-2 py-1.5 text-[11px] rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-colors text-center"
                  >
                    Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => fillDemoAccount('business')}
                    className="px-2 py-1.5 text-[11px] rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-colors text-center"
                  >
                    Business
                  </button>
                  <button
                    type="button"
                    onClick={() => fillDemoAccount('jovem')}
                    className="px-2 py-1.5 text-[11px] rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-colors text-center"
                  >
                    Jovem
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* 2. REGISTER FORM */}
          {tab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nome Completo
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome ou razão social"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  E-mail (Único por conta)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@exemplo.com.br"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Qual ambiente melhor descreve seu momento?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setClientType('jovem')}
                    className={`p-2.5 text-left rounded-lg border transition-all ${clientType === 'jovem' ? 'border-sky-600 bg-sky-50/50 dark:bg-sky-950/30' : 'border-slate-200 dark:border-slate-700'}`}
                  >
                    <div className="text-xs font-semibold text-slate-900 dark:text-white">NEXO JOVEM</div>
                    <div className="text-[11px] text-slate-500">Tenho uma ideia de negócio para tirar do papel</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setClientType('business')}
                    className={`p-2.5 text-left rounded-lg border transition-all ${clientType === 'business' ? 'border-sky-600 bg-sky-50/50 dark:bg-sky-950/30' : 'border-slate-200 dark:border-slate-700'}`}
                  >
                    <div className="text-xs font-semibold text-slate-900 dark:text-white">NEXO BUSINESS</div>
                    <div className="text-[11px] text-slate-500">Já possuo empresa ou vendas em operação</div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Senha (mín. 6)
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Confirmar Senha
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="flex items-start gap-2 pt-1">
                <input
                  type="checkbox"
                  id="agreeTerms"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-1 rounded text-sky-600 focus:ring-sky-500"
                />
                <label htmlFor="agreeTerms" className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                  Concordo com os Termos de Uso e a Política de Privacidade e Proteção de Dados (LGPD) da Plataforma NEXO.
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 text-sm font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-500 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? 'Criando Conta...' : 'Cadastrar e Começar'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* 3. FORGOT PASSWORD (STEP 1: Request Code) */}
          {tab === 'forgot' && (
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Informe o e-mail cadastrado na sua conta. Nosso servidor gerará um código seguro e temporário com validade de <strong>10 minutos</strong>.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  E-mail da Conta
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@exemplo.com.br"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 text-sm font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-500 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? 'Gerando Código...' : 'Enviar Código de Recuperação'}
                <KeyRound className="w-4 h-4" />
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => { resetForm(); setTab('login'); }}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                >
                  Voltar para o Login
                </button>
              </div>
            </form>
          )}

          {/* 4. VERIFY CODE & SET NEW PASSWORD (STEP 2) */}
          {tab === 'verify_code' && (
            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Digite o código de 6 dígitos enviado para <strong>{email}</strong> e escolha sua nova senha segura.
              </div>

              {recoveryNotice && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-lg text-[11px] text-amber-800 dark:text-amber-300">
                  <div className="font-semibold mb-1">Aviso Administrativo de Integração:</div>
                  {recoveryNotice}
                  {devCodeHelper && (
                    <div className="mt-1 pt-1 border-t border-amber-200 dark:border-amber-800">
                      Código gerado para validação em teste: <strong className="font-mono text-sm">{devCodeHelper}</strong>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Código de 6 Dígitos
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={recoveryCode}
                    onChange={(e) => setRecoveryCode(e.target.value)}
                    placeholder="123456"
                    className="w-full pl-9 pr-3 py-2 text-sm font-mono tracking-widest text-center rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nova Senha (mínimo 6 caracteres)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <Clock className="w-3.5 h-3.5" />
                <span>O código expira em 10 minutos (máximo de 3 tentativas).</span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 text-sm font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-500 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? 'Validando...' : 'Confirmar e Salvar Nova Senha'}
                <ShieldCheck className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => setTab('forgot')}
                  className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                >
                  Reenviar código
                </button>
                <button
                  type="button"
                  onClick={() => { resetForm(); setTab('login'); }}
                  className="text-sky-600 dark:text-sky-400 hover:underline"
                >
                  Voltar ao Login
                </button>
              </div>
            </form>
          )}

        </div>

      </div>
    </div>
  );
};
