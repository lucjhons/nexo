import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import { AppNotification } from '../types/index.js';
import { apiRequest } from '../services/api.js';
import { useAuth } from './AuthContext.js';

const POLL_INTERVAL_MS = 25000;

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  toasts: AppNotification[];
  refresh: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearRead: () => Promise<void>;
  dismissToast: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [toasts, setToasts] = useState<AppNotification[]>([]);

  const knownIdsRef = useRef<Set<string> | null>(null);
  const mountedRef = useRef<boolean>(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await apiRequest<{ notifications: AppNotification[]; unreadCount: number }>(
        '/notifications?limit=60'
      );
      if (!mountedRef.current) return;

      const items = res.notifications || [];
      setNotifications(items);
      setUnreadCount(res.unreadCount || 0);

      const currentIds = new Set(items.map(item => item.id));
      if (knownIdsRef.current === null) {
        knownIdsRef.current = currentIds;
      } else {
        const fresh = items.filter(item => !item.read && !knownIdsRef.current?.has(item.id));
        if (fresh.length > 0) {
          setToasts(prev => {
            const existing = new Set(prev.map(toast => toast.id));
            const additions = fresh.filter(item => !existing.has(item.id));
            return [...additions, ...prev].slice(0, 4);
          });
        }
        knownIdsRef.current = currentIds;
      }
    } catch (err) {
      // Sessão expirada ou instabilidade: o próximo ciclo tenta novamente.
      console.error('Falha ao carregar notificações', err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [user]);

  // Carrega ao entrar e mantém atualização periódica enquanto a sessão estiver ativa.
  useEffect(() => {
    knownIdsRef.current = null;
    setToasts([]);

    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    refresh();
    const interval = window.setInterval(refresh, POLL_INTERVAL_MS);

    const handleFocus = () => refresh();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [user, refresh]);

  // Remove os toasts automaticamente após alguns segundos.
  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map(toast =>
      window.setTimeout(() => {
        setToasts(prev => prev.filter(item => item.id !== toast.id));
      }, 6500)
    );
    return () => timers.forEach(timer => window.clearTimeout(timer));
  }, [toasts]);

  const markAsRead = async (id: string) => {
    const target = notifications.find(item => item.id === id);
    if (!target || target.read) return;

    setNotifications(prev => prev.map(item => (item.id === id ? { ...item, read: true } : item)));
    setUnreadCount(prev => Math.max(0, prev - 1));

    try {
      const res = await apiRequest<{ unreadCount: number }>(`/notifications/${id}/read`, {
        method: 'POST',
      });
      if (mountedRef.current) setUnreadCount(res.unreadCount);
    } catch (err) {
      console.error('Falha ao marcar notificação como lida', err);
      refresh();
    }
  };

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(item => ({ ...item, read: true })));
    setUnreadCount(0);
    try {
      await apiRequest('/notifications/read-all', { method: 'POST' });
    } catch (err) {
      console.error('Falha ao marcar todas como lidas', err);
      refresh();
    }
  };

  const deleteNotification = async (id: string) => {
    const target = notifications.find(item => item.id === id);
    setNotifications(prev => prev.filter(item => item.id !== id));
    if (target && !target.read) setUnreadCount(prev => Math.max(0, prev - 1));
    setToasts(prev => prev.filter(item => item.id !== id));

    try {
      const res = await apiRequest<{ unreadCount: number }>(`/notifications/${id}`, {
        method: 'DELETE',
      });
      if (mountedRef.current) setUnreadCount(res.unreadCount);
    } catch (err) {
      console.error('Falha ao remover notificação', err);
      refresh();
    }
  };

  const clearRead = async () => {
    setNotifications(prev => prev.filter(item => !item.read));
    try {
      await apiRequest('/notifications/read', { method: 'DELETE' });
    } catch (err) {
      console.error('Falha ao limpar notificações lidas', err);
      refresh();
    }
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(item => item.id !== id));
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        toasts,
        refresh,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearRead,
        dismissToast,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
