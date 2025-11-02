import { StyleSheet } from 'react-native';
import { Colors } from './Colors';

export const NotificationStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingHorizontal: 16,
    paddingTop: 60,
    pointerEvents: 'box-none',
  },
  notificationWrapper: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  notification: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  notificationSuccess: {
    backgroundColor: Colors.light.primaryGreen,
  },
  notificationError: {
    backgroundColor: '#EF4444',
  },
  notificationWarning: {
    backgroundColor: '#F59E0B',
  },
  notificationInfo: {
    backgroundColor: '#3B82F6',
  },
  iconContainer: {
    marginTop: 2,
    minWidth: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 18,
  },
  closeButton: {
    padding: 4,
    marginTop: -2,
    marginRight: -8,
  },
  closeIcon: {
    fontSize: 18,
    color: '#fff',
  },
});
