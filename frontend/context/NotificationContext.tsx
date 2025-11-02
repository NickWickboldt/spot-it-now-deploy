import React, { createContext, useCallback, useState } from 'react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number; // milliseconds, 0 means don't auto-dismiss
}

interface NotificationContextType {
  notifications: Notification[];
  showNotification: (
    title: string,
    type?: NotificationType,
    message?: string,
    duration?: number
  ) => string;
  hideNotification: (id: string) => void;
  clearAll: () => void;
}

export const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const timeoutIds = React.useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const showNotification = useCallback(
    (title: string, type: NotificationType = 'info', message?: string, duration: number = 3000) => {
      const id = Date.now().toString() + Math.random();
      
      const notification: Notification = {
        id,
        type,
        title,
        message,
        duration,
      };

      setNotifications((prev) => [...prev, notification]);

      // Auto-dismiss if duration is provided and greater than 0
      if (duration > 0) {
        const timeoutId = setTimeout(() => {
          hideNotification(id);
        }, duration);
        timeoutIds.current.set(id, timeoutId);
      }

      return id;
    },
    []
  );

  const hideNotification = useCallback((id: string) => {
    // Clear timeout if exists
    const timeoutId = timeoutIds.current.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutIds.current.delete(id);
    }
    
    setNotifications((prev) => prev.filter((notif) => notif.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    // Clear all timeouts
    timeoutIds.current.forEach((timeoutId) => clearTimeout(timeoutId));
    timeoutIds.current.clear();
    
    setNotifications([]);
  }, []);

  const value: NotificationContextType = {
    notifications,
    showNotification,
    hideNotification,
    clearAll,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
