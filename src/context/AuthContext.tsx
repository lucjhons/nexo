import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Company, ProjectJovem, ClientType } from '../types/index.js';
import { apiRequest, getStoredToken, setStoredToken, removeStoredToken } from '../services/api.js';

interface PublicConfig {
  slogan: string;
  whatsappSuporte: string;
  smtpConfigured: boolean;
}

interface AuthContextType {
  user: User | null;
  company: Company | null;
  projects: ProjectJovem[];
  loading: boolean;
  publicConfig: PublicConfig | null;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, pass: string, clientType?: ClientType | null) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  selectClientType: (type: ClientType) => Promise<boolean>;
  refreshUserData: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; message: string; emailConfigured: boolean; adminNotice?: string; devCode?: string }>;
  submitPasswordReset: (email: string, code: string, pass: string) => Promise<{ success: boolean; message: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [projects, setProjects] = useState<ProjectJovem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [publicConfig, setPublicConfig] = useState<PublicConfig | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Load public config and initial auth status
  useEffect(() => {
    // Check saved theme
    const savedTheme = localStorage.getItem('nexo_theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }

    // Load public config
    apiRequest<PublicConfig>('/config/public')
      .then(config => setPublicConfig(config))
      .catch(err => console.error('Failed to load public config', err));

    // Check user session
    const token = getStoredToken();
    if (token) {
      refreshUserData().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('nexo_theme', next);
      if (next === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return next;
    });
  };

  const refreshUserData = async () => {
    try {
      const res = await apiRequest<{ user: User; company: Company | null; projects: ProjectJovem[] }>('/auth/me');
      setUser(res.user);
      setCompany(res.company);
      setProjects(res.projects || []);
    } catch {
      removeStoredToken();
      setUser(null);
      setCompany(null);
      setProjects([]);
    }
  };

  const login = async (email: string, pass: string) => {
    try {
      const res = await apiRequest<{ token: string; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password: pass }),
      });

      setStoredToken(res.token);
      await refreshUserData();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro ao realizar login.' };
    }
  };

  const register = async (name: string, email: string, pass: string, clientType?: ClientType | null) => {
    try {
      const res = await apiRequest<{ token: string; user: User }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password: pass, clientType }),
      });

      setStoredToken(res.token);
      await refreshUserData();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro ao realizar cadastro.' };
    }
  };

  const logout = async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    } finally {
      removeStoredToken();
      setUser(null);
      setCompany(null);
      setProjects([]);
    }
  };

  const selectClientType = async (type: ClientType) => {
    try {
      await apiRequest('/auth/select-type', {
        method: 'POST',
        body: JSON.stringify({ clientType: type }),
      });
      await refreshUserData();
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const requestPasswordReset = async (email: string) => {
    const res = await apiRequest<{ message: string; emailConfigured: boolean; adminNotice?: string; devCode?: string }>(
      '/auth/forgot-password',
      {
        method: 'POST',
        body: JSON.stringify({ email }),
      }
    );
    return {
      success: true,
      message: res.message,
      emailConfigured: res.emailConfigured,
      adminNotice: res.adminNotice,
      devCode: res.devCode,
    };
  };

  const submitPasswordReset = async (email: string, code: string, pass: string) => {
    const res = await apiRequest<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, code, newPassword: pass }),
    });
    return {
      success: true,
      message: res.message,
    };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        company,
        projects,
        loading,
        publicConfig,
        theme,
        toggleTheme,
        login,
        register,
        logout,
        selectClientType,
        refreshUserData,
        requestPasswordReset,
        submitPasswordReset,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
