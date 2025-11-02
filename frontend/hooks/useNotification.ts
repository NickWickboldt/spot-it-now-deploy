import { useContext } from 'react';
import { NotificationContext, NotificationType } from '../context/NotificationContext';

interface UseNotificationReturn {
  success: (title: string, message?: string, duration?: number) => string;
  error: (title: string, message?: string, duration?: number) => string;
  warning: (title: string, message?: string, duration?: number) => string;
  info: (title: string, message?: string, duration?: number) => string;
  show: (title: string, type?: NotificationType, message?: string, duration?: number) => string;
  hide: (id: string) => void;
  clearAll: () => void;
}

export const useNotification = (): UseNotificationReturn => {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }

  const { showNotification, hideNotification, clearAll } = context;

  return {
    success: (title: string, message?: string, duration?: number) =>
      showNotification(title, 'success', message, duration),
    error: (title: string, message?: string, duration?: number) =>
      showNotification(title, 'error', message, duration),
    warning: (title: string, message?: string, duration?: number) =>
      showNotification(title, 'warning', message, duration),
    info: (title: string, message?: string, duration?: number) =>
      showNotification(title, 'info', message, duration),
    show: (title: string, type?: NotificationType, message?: string, duration?: number) =>
      showNotification(title, type, message, duration),
    hide: hideNotification,
    clearAll,
  };
};
