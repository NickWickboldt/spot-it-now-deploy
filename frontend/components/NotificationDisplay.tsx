import { FontAwesome } from '@expo/vector-icons';
import React, { useContext, useEffect } from 'react';
import { Animated, Text, TouchableOpacity, View } from 'react-native';
import { NotificationStyles } from '../constants/NotificationStyles';
import { NotificationContext, NotificationType } from '../context/NotificationContext';

interface NotificationItemProps {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  onClose: (id: string) => void;
}

const getIconName = (type: NotificationType) => {
  switch (type) {
    case 'success':
      return 'check-circle';
    case 'error':
      return 'exclamation-circle';
    case 'warning':
      return 'warning';
    case 'info':
      return 'info-circle';
    default:
      return 'bell';
  }
};

const NotificationItem: React.FC<NotificationItemProps> = ({ id, type, title, message, onClose }) => {
  const scaleAnim = React.useRef(new Animated.Value(0.9)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 70,
        friction: 10,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleClose = () => {
    // Exit animation
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.9,
        useNativeDriver: true,
        tension: 70,
        friction: 10,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose(id);
    });
  };

  return (
    <Animated.View
      style={[
        NotificationStyles.notificationWrapper,
        {
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <View
        style={[
          NotificationStyles.notification,
          type === 'success' && NotificationStyles.notificationSuccess,
          type === 'error' && NotificationStyles.notificationError,
          type === 'warning' && NotificationStyles.notificationWarning,
          type === 'info' && NotificationStyles.notificationInfo,
        ]}
      >
        <View style={NotificationStyles.iconContainer}>
          <FontAwesome
            name={getIconName(type)}
            size={20}
            color="#fff"
          />
        </View>

        <View style={NotificationStyles.content}>
          <Text style={NotificationStyles.title}>{title}</Text>
          {message && <Text style={NotificationStyles.message}>{message}</Text>}
        </View>

        <TouchableOpacity
          style={NotificationStyles.closeButton}
          onPress={handleClose}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        >
          <FontAwesome
            name="times"
            size={16}
            color="#fff"
          />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

export const NotificationDisplay: React.FC = () => {
  const context = useContext(NotificationContext);

  if (!context) {
    return null;
  }

  const { notifications, hideNotification } = context;

  return (
    <View style={NotificationStyles.container} pointerEvents="box-none">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          id={notification.id}
          type={notification.type}
          title={notification.title}
          message={notification.message}
          onClose={hideNotification}
        />
      ))}
    </View>
  );
};
