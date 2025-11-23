import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Switch, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { apiGetMyNotifications, apiMarkAllNotificationsAsRead, apiMarkNotificationAsRead, DbNotification } from '../../api/notification';
import { apiUpdateUserDetails } from '../../api/user';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../hooks/useNotification';

export default function NotificationsScreen() {
  const router = useRouter();
  const { token, user, refreshUser } = useAuth();
  const notification = useNotification();
  const [notifications, setNotifications] = useState<DbNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(user?.notificationsEnabled ?? true);

  // Sync notification state with user data
  useEffect(() => {
    if (user?.notificationsEnabled !== undefined) {
      setNotificationsEnabled(user.notificationsEnabled);
    }
  }, [user?.notificationsEnabled]);

  const loadNotifications = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const data = await apiGetMyNotifications(token);
      setNotifications(data);
    } catch (error: any) {
      console.error('Failed to load notifications', error);
      notification.error('Error', 'Failed to load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleMarkAsRead = async (notificationId: string) => {
    if (!token) return;

    try {
      await apiMarkNotificationAsRead(token, notificationId);
      setNotifications(prev =>
        prev.map(n => (n._id === notificationId ? { ...n, isRead: true } : n))
      );
    } catch (error) {
      console.error('Failed to mark notification as read', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!token) return;

    try {
      await apiMarkAllNotificationsAsRead(token);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      notification.success('Marked All as Read');
    } catch (error: any) {
      notification.error('Error', 'Failed to mark all as read');
    }
  };

  const handleNotificationToggle = async (value: boolean): Promise<void> => {
    try {
      setNotificationsEnabled(value);
      await apiUpdateUserDetails(token!, { notificationsEnabled: value });
      if (refreshUser) await refreshUser();
      notification.success(
        'Settings Updated',
        `Notifications ${value ? 'enabled' : 'disabled'}`
      );
    } catch (error: any) {
      // Revert on error
      setNotificationsEnabled(!value);
      notification.error('Update Failed', String(error?.message || error));
    }
  };

  const getRelativeTime = (dateString: string) => {
    const now = new Date();
    const posted = new Date(dateString);
    const diffMs = now.getTime() - posted.getTime();

    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays >= 7) {
      const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
      return new Intl.DateTimeFormat('en-US', options).format(posted);
    }
    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMinutes > 0) return `${diffMinutes}m ago`;
    if (diffSeconds > 0) return `${diffSeconds}s ago`;
    return 'just now';
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'sighting_approved':
        return 'check-circle';
      case 'new_achievement':
        return 'trophy';
      case 'new_follower':
        return 'user-plus';
      case 'new_comment':
        return 'comment';
      case 'new_like':
      case 'sighting_liked':
        return 'heart';
      case 'admin_message':
        return 'bullhorn';
      default:
        return 'bell';
    }
  };

  const renderNotification = ({ item }: { item: DbNotification }) => (
    <Pressable
      style={[styles.notificationItem, !item.isRead && styles.unreadNotification]}
      onPress={() => handleMarkAsRead(item._id)}
    >
      <View style={styles.iconContainer}>
        <LinearGradient
          colors={item.isRead ? ['#e5e7eb', '#d1d5db'] : [Colors.light.primaryGreen, Colors.light.secondaryGreen]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconCircle}
        >
          <Icon
            name={getNotificationIcon(item.type)}
            size={20}
            color={item.isRead ? '#6b7280' : '#fff'}
          />
        </LinearGradient>
      </View>

      <View style={styles.notificationContent}>
        <Text style={[styles.notificationTitle, !item.isRead && styles.unreadTitle]}>
          {item.title}
        </Text>
        {item.subtitle && (
          <Text style={styles.notificationSubtitle}>{item.subtitle}</Text>
        )}
        <Text style={styles.notificationMessage} numberOfLines={2}>
          {item.message}
        </Text>
        <Text style={styles.notificationTime}>{getRelativeTime(item.createdAt)}</Text>
      </View>

      {!item.isRead && <View style={styles.unreadDot} />}
    </Pressable>
  );

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[Colors.light.background, Colors.light.softBeige]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={Colors.light.primaryGreen} />
        </Pressable>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerRight} />
      </LinearGradient>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.primaryGreen} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id}
          renderItem={renderNotification}
          ListHeaderComponent={
            <>
              {/* Notification Settings Section */}
              <View style={styles.settingsSection}>
                <View style={styles.settingsHeader}>
                  <Text style={styles.settingsTitle}>Settings</Text>
                  {unreadCount > 0 && (
                    <Pressable onPress={handleMarkAllAsRead} style={styles.markAllButton}>
                      <Text style={styles.markAllText}>Mark All Read</Text>
                    </Pressable>
                  )}
                </View>
                <View style={styles.settingsItem}>
                  <View style={{ flex: 1, marginRight: 15 }}>
                    <Text style={styles.settingsItemTitle}>Push Notifications</Text>
                    <Text style={styles.settingsItemSubtitle}>
                      Receive notifications when the app is not active
                    </Text>
                  </View>
                  <Switch
                    value={notificationsEnabled}
                    onValueChange={handleNotificationToggle}
                    trackColor={{ false: '#767577', true: '#40743dff' }}
                    thumbColor={notificationsEnabled ? '#fff' : '#f4f3f4'}
                  />
                </View>
              </View>

              {/* Notifications List Header */}
              {notifications.length > 0 && (
                <View style={styles.listHeader}>
                  <Text style={styles.listHeaderText}>Recent Notifications</Text>
                </View>
              )}
            </>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[Colors.light.primaryGreen]}
              tintColor={Colors.light.primaryGreen}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="bell-slash" size={64} color="#d1d5db" />
              <Text style={styles.emptyTitle}>No Notifications</Text>
              <Text style={styles.emptyText}>You're all caught up!</Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: Colors.light.mainText,
  },
  headerRight: {
    width: 40,
  },
  settingsSection: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  settingsItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  settingsItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  settingsItemSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  listHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.light.background,
  },
  listHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  markAllText: {
    color: Colors.light.primaryGreen,
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#6b7280',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
  },
  listContent: {
    flexGrow: 1,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  unreadNotification: {
    backgroundColor: '#f0fdf4',
  },
  iconContainer: {
    marginRight: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationContent: {
    flex: 1,
    marginRight: 8,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  unreadTitle: {
    fontWeight: '700',
  },
  notificationSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4b5563',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 6,
  },
  notificationTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.light.primaryGreen,
    marginTop: 4,
  },
});
