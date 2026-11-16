import React, { useEffect, useRef, useState } from 'react';
import {
  Bell,
  BellOff,
  CheckCheck,
  Trash2,
  X,
  MessageSquare,
  Info,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Package,
  Wallet,
  Users,
} from 'lucide-react';
import { AppNotification, NotificationType } from '../../types/index.js';
import { useNotifications } from '../../context/NotificationContext.js';

interface NotificationBellProps {
  onNavigate: (view: string) => void;
}

const TYPE_STYLES: Record<
  NotificationType,
  { icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  sistema: { icon: Info, color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
  suporte: { icon: MessageSquare, color: 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300' },
  conta: { icon: ShieldAlert, color: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300' },
  oportunidade: { icon: Sparkles, color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300' },
  comercial: { icon: TrendingUp, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' },
  estoque: { icon: Package, color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' },
  financeiro: { icon: Wallet, color: 'bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300' },
  rede: { icon: Users, color: 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300' },
};

function formatTimeAgo(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'agora';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} d`;
  return date.toLocaleDateString('pt-BR');
}

const NotificationIcon: React.FC<{ type: NotificationType }> = ({ type }) => {
  const config = TYPE_STYLES[type] || TYPE_STYLES.sistema;
  const Icon = config.icon;
  return (
    <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${config.color}`}>
      <Icon className="w-4 h-4" />
    </span>
  );
};

export const NotificationBell: React.FC<NotificationBellProps> = ({ onNavigate }) => {
  const {
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
  } = useNotifications();

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next) refresh();
  };

  const handleNotificationClick = (notification: AppNotification) => {
    if (!notification.read) markAsRead(notification.id);
    if (notification.linkView) onNavigate(notification.linkView);
    setOpen(false);
  };

  const readCount = notifications.filter(item => item.read).length;

  return (
    <>
      <div className="relative" ref={containerRef}>
        <button
          onClick={handleToggle}
          title="Central de notificações"
          aria-label={`Central de notificações${unreadCount > 0 ? ` (${unreadCount} não lidas)` : ''}`}
          aria-expanded={open}
          className={`relative p-2 rounded-lg transition-colors ${
            open
              ? 'bg-slate-100 text-sky-600 dark:bg-slate-800 dark:text-sky-400'
              : 'text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {open && (
          <div className="animate-notification-in absolute right-0 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Notificações</h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  {unreadCount > 0 ? `${unreadCount} não lida${unreadCount === 1 ? '' : 's'}` : 'Tudo em dia por aqui'}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={markAllAsRead}
                  disabled={unreadCount === 0}
                  title="Marcar todas como lidas"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-colors"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setOpen(false)}
                  title="Fechar"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="max-h-[26rem] overflow-y-auto">
              {loading && notifications.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">Carregando notificações...</div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <BellOff className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Nenhuma notificação por enquanto.
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                    Avisaremos você sobre chamados, oportunidades e novidades.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {notifications.map(notification => (
                    <div
                      key={notification.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleNotificationClick(notification)}
                      onKeyDown={event => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          handleNotificationClick(notification);
                        }
                      }}
                      className={`group w-full text-left px-4 py-3 flex gap-3 transition-colors cursor-pointer focus:outline-none focus:bg-slate-50 dark:focus:bg-slate-800/70 ${
                        notification.read
                          ? 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                          : 'bg-sky-50/70 dark:bg-sky-950/20 hover:bg-sky-50 dark:hover:bg-sky-950/30'
                      }`}
                    >
                      <NotificationIcon type={notification.tipo} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-xs leading-snug ${notification.read ? 'font-medium text-slate-700 dark:text-slate-300' : 'font-bold text-slate-900 dark:text-white'}`}>
                            {notification.titulo}
                          </p>
                          {!notification.read && <span className="mt-1 w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5 line-clamp-2">
                          {notification.mensagem}
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                          {formatTimeAgo(notification.createdAt)}
                        </p>
                      </div>
                      <button
                        onClick={event => {
                          event.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                        title="Remover notificação"
                        className="self-start p-1 rounded text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60">
              <button
                onClick={() => refresh()}
                className="text-[10px] font-medium text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400 transition-colors"
              >
                Atualizar
              </button>
              <button
                onClick={clearRead}
                disabled={readCount === 0}
                className="text-[10px] font-medium text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 disabled:opacity-40 disabled:hover:text-slate-500 transition-colors"
              >
                Limpar lidas ({readCount})
              </button>
            </div>
          </div>
        )}
      </div>

      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-[60] space-y-2 w-[20rem] max-w-[calc(100vw-2rem)]">
          {toasts.map(toast => {
            const config = TYPE_STYLES[toast.tipo] || TYPE_STYLES.sistema;
            const Icon = config.icon;
            return (
              <div
                key={toast.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  markAsRead(toast.id);
                  if (toast.linkView) onNavigate(toast.linkView);
                  dismissToast(toast.id);
                }}
                onKeyDown={event => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    markAsRead(toast.id);
                    if (toast.linkView) onNavigate(toast.linkView);
                    dismissToast(toast.id);
                  }
                }}
                className="animate-toast-in cursor-pointer rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-3 flex gap-3 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${config.color}`}>
                  <Icon className="w-4 h-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{toast.titulo}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">{toast.mensagem}</p>
                </div>
                <button
                  onClick={event => {
                    event.stopPropagation();
                    dismissToast(toast.id);
                  }}
                  className="self-start p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  title="Fechar aviso"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};
