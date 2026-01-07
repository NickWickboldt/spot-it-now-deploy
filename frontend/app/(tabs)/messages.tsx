import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    Pressable,
    RefreshControl,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import {
    apiAcceptMessageRequest,
    apiGetConversations,
    apiGetMessageRequests,
    apiRejectMessageRequest,
    Conversation
} from '../../api/message';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

type TabType = 'messages' | 'requests';

export default function MessagesScreen() {
  const router = useRouter();
  const { token, user } = useAuth();
  const {
    onMessageNotification,
    setUnreadMessageCount,
    isUserOnline,
  } = useSocket();

  const [activeTab, setActiveTab] = useState<TabType>('messages');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messageRequests, setMessageRequests] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!token) return;

    try {
      const data = await apiGetConversations(token);
      // Split into regular conversations and pending (where user is the initiator)
      const regularConversations = data.filter(
        (conv) => !conv.isMessageRequest
      );
      setConversations(regularConversations);

      // Update total unread count
      const totalUnread = regularConversations.reduce(
        (sum, conv) => sum + (conv.unreadCount || 0),
        0
      );
      setUnreadMessageCount(totalUnread);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, setUnreadMessageCount]);

  // Fetch message requests
  const fetchMessageRequests = useCallback(async () => {
    if (!token) return;

    try {
      const requests = await apiGetMessageRequests(token);
      setMessageRequests(requests);
    } catch (error) {
      console.error('Failed to fetch message requests:', error);
    }
  }, [token]);

  // Initial load and focus refresh
  useFocusEffect(
    useCallback(() => {
      fetchConversations();
      fetchMessageRequests();
    }, [fetchConversations, fetchMessageRequests])
  );

  // Listen for new messages to update list
  useEffect(() => {
    const unsubscribe = onMessageNotification((event) => {
      // Refresh conversations when a new message arrives
      fetchConversations();
      fetchMessageRequests();
    });

    return unsubscribe;
  }, [onMessageNotification, fetchConversations, fetchMessageRequests]);

  // Handle pull to refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchConversations();
    fetchMessageRequests();
  };

  // Handle accept message request
  const handleAcceptRequest = async (conversationId: string) => {
    if (!token) return;
    setProcessingRequest(conversationId);
    try {
      await apiAcceptMessageRequest(token, conversationId);
      // Move from requests to conversations
      const acceptedConv = messageRequests.find((r) => r._id === conversationId);
      if (acceptedConv) {
        setMessageRequests((prev) => prev.filter((r) => r._id !== conversationId));
        setConversations((prev) => [{ ...acceptedConv, isMessageRequest: false }, ...prev]);
      }
    } catch (error) {
      console.error('Failed to accept request:', error);
    } finally {
      setProcessingRequest(null);
    }
  };

  // Handle reject message request
  const handleRejectRequest = async (conversationId: string) => {
    if (!token) return;
    setProcessingRequest(conversationId);
    try {
      await apiRejectMessageRequest(token, conversationId);
      setMessageRequests((prev) => prev.filter((r) => r._id !== conversationId));
    } catch (error) {
      console.error('Failed to reject request:', error);
    } finally {
      setProcessingRequest(null);
    }
  };

  // Navigate to conversation
  const openConversation = (conversation: Conversation) => {
    router.push({
      pathname: '/(user)/conversation',
      params: {
        conversationId: conversation._id,
        recipientId: conversation.otherParticipant._id,
        recipientName: conversation.otherParticipant.username,
        recipientAvatar: conversation.otherParticipant.profilePictureUrl || '',
      },
    });
  };

  // Format timestamp
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      // Today - show time
      return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  // Get message preview text
  const getMessagePreview = (conversation: Conversation) => {
    const lastMessage = conversation.lastMessage;
    if (!lastMessage) return 'No messages yet';

    if (lastMessage.messageType === 'image') {
      return '📷 Photo';
    } else if (lastMessage.messageType === 'video') {
      return '🎬 Video';
    } else if (lastMessage.messageType === 'mixed') {
      return lastMessage.content || '📎 Attachment';
    }

    return lastMessage.content || 'No messages yet';
  };

  // Render conversation item
  const renderConversation = ({ item }: { item: Conversation }) => {
    const otherUser = item.otherParticipant;
    const isOnline = isUserOnline(otherUser._id);
    const hasUnread = item.unreadCount > 0;
    const isPendingForMe = item.isPending && item.initiatedBy === user?._id;

    return (
      <TouchableOpacity
        style={[styles.conversationItem, hasUnread && styles.unreadItem]}
        onPress={() => openConversation(item)}
        activeOpacity={0.7}
      >
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {otherUser.profilePictureUrl ? (
            <Image
              source={{ uri: otherUser.profilePictureUrl }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>
                {otherUser.username?.charAt(0).toUpperCase() || '?'}
              </Text>
            </View>
          )}
          {isOnline && <View style={styles.onlineIndicator} />}
        </View>

        {/* Content */}
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text
              style={[styles.username, hasUnread && styles.unreadText]}
              numberOfLines={1}
            >
              {otherUser.username}
            </Text>
            <Text style={styles.time}>
              {item.lastMessageAt && formatTime(item.lastMessageAt)}
            </Text>
          </View>
          <View style={styles.messagePreviewRow}>
            <Text
              style={[styles.messagePreview, hasUnread && styles.unreadText]}
              numberOfLines={1}
            >
              {isPendingForMe ? '⏳ Awaiting approval' : getMessagePreview(item)}
            </Text>
            {hasUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCount}>
                  {item.unreadCount > 99 ? '99+' : item.unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Render message request item
  const renderMessageRequest = ({ item }: { item: Conversation }) => {
    const otherUser = item.otherParticipant;
    const isProcessing = processingRequest === item._id;

    return (
      <View style={styles.requestItem}>
        {/* User info */}
        <TouchableOpacity
          style={styles.requestUserInfo}
          onPress={() => openConversation(item)}
          activeOpacity={0.7}
        >
          <View style={styles.avatarContainer}>
            {otherUser.profilePictureUrl ? (
              <Image
                source={{ uri: otherUser.profilePictureUrl }}
                style={styles.avatar}
              />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>
                  {otherUser.username?.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.conversationContent}>
            <Text style={styles.username} numberOfLines={1}>
              {otherUser.username}
            </Text>
            <Text style={styles.messagePreview} numberOfLines={1}>
              {getMessagePreview(item)}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Action buttons */}
        <View style={styles.requestActions}>
          {isProcessing ? (
            <ActivityIndicator size="small" color={Colors.light.primaryGreen} />
          ) : (
            <>
              <Pressable
                style={styles.rejectButton}
                onPress={() => handleRejectRequest(item._id)}
              >
                <Icon name="times" size={16} color="#ef4444" />
              </Pressable>
              <Pressable
                style={styles.acceptButton}
                onPress={() => handleAcceptRequest(item._id)}
              >
                <Icon name="check" size={16} color="#fff" />
              </Pressable>
            </>
          )}
        </View>
      </View>
    );
  };

  // Empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="comments-o" size={64} color={Colors.light.secondaryGreen} />
      <Text style={styles.emptyTitle}>
        {activeTab === 'messages' ? 'No Messages Yet' : 'No Message Requests'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {activeTab === 'messages'
          ? 'Start a conversation with someone from their profile!'
          : 'Message requests from non-followers will appear here'}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color={Colors.light.primaryGreen} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <Pressable
          style={[styles.tab, activeTab === 'messages' && styles.activeTab]}
          onPress={() => setActiveTab('messages')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'messages' && styles.activeTabText,
            ]}
          >
            Messages
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
          onPress={() => setActiveTab('requests')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'requests' && styles.activeTabText,
            ]}
          >
            Requests
            {messageRequests.length > 0 && (
              <Text style={styles.requestCountBadge}>
                {' '}({messageRequests.length})
              </Text>
            )}
          </Text>
        </Pressable>
      </View>

      {/* Conversations List */}
      {activeTab === 'messages' ? (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item._id}
          renderItem={renderConversation}
          contentContainerStyle={
            conversations.length === 0 ? styles.emptyListContent : undefined
          }
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.light.primaryGreen}
              colors={[Colors.light.primaryGreen]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={messageRequests}
          keyExtractor={(item) => item._id}
          renderItem={renderMessageRequest}
          contentContainerStyle={
            messageRequests.length === 0 ? styles.emptyListContent : undefined
          }
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.light.primaryGreen}
              colors={[Colors.light.primaryGreen]}
            />
          }
          showsVerticalScrollIndicator={false}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.light.primaryGreen,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  unreadItem: {
    backgroundColor: '#f0fdf4',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.light.softBeige,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.light.primaryGreen,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: '#fff',
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
    marginRight: 8,
  },
  time: {
    fontSize: 12,
    color: '#9ca3af',
  },
  messagePreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  messagePreview: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
    marginRight: 8,
  },
  unreadText: {
    fontWeight: '700',
    color: '#1f2937',
  },
  unreadBadge: {
    backgroundColor: Colors.light.primaryGreen,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  unreadCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyListContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  // Tab styles
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: Colors.light.primaryGreen,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#9ca3af',
  },
  activeTabText: {
    color: Colors.light.primaryGreen,
  },
  requestCountBadge: {
    color: Colors.light.primaryGreen,
    fontWeight: '700',
  },
  // Message request styles
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  requestUserInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  acceptButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.primaryGreen,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
