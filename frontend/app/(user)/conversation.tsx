import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/FontAwesome';
import {
    apiGetMessages,
    apiMarkMessagesAsRead,
    apiSendMessage,
    Attachment,
    Message,
} from '../../api/message';
import { uploadToCloudinarySigned } from '../../api/upload';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ConversationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    conversationId: string;
    recipientId: string;
    recipientName: string;
    recipientAvatar: string;
  }>();

  const { token, user } = useAuth();
  const {
    joinConversation,
    leaveConversation,
    startTyping,
    stopTyping,
    onNewMessage,
    onTypingStart,
    onTypingStop,
    onMessagesRead,
    isUserOnline,
    decrementUnreadCount,
  } = useSocket();

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);

  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  const conversationId = params.conversationId;
  const recipientId = params.recipientId;
  const recipientName = params.recipientName;
  const recipientAvatar = params.recipientAvatar;
  const recipientOnline = isUserOnline(recipientId);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!token || !conversationId) return;

    try {
      const data = await apiGetMessages(token, conversationId, { limit: 50 });
      setMessages(data.reverse()); // API returns newest first, we want oldest first
      setHasMore(data.length === 50);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  }, [token, conversationId]);

  // Load more messages
  const loadMoreMessages = useCallback(async () => {
    if (!token || !conversationId || loadingMore || !hasMore || messages.length === 0)
      return;

    setLoadingMore(true);
    try {
      const oldestMessage = messages[0];
      const data = await apiGetMessages(token, conversationId, {
        limit: 50,
        before: oldestMessage.createdAt,
      });
      if (data.length > 0) {
        setMessages((prev) => [...data.reverse(), ...prev]);
        setHasMore(data.length === 50);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Failed to load more messages:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [token, conversationId, loadingMore, hasMore, messages]);

  // Mark messages as read
  const markAsRead = useCallback(async () => {
    if (!token || !conversationId) return;

    try {
      const result = await apiMarkMessagesAsRead(token, conversationId);
      if (result.markedAsRead > 0) {
        decrementUnreadCount(result.markedAsRead);
      }
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
    }
  }, [token, conversationId, decrementUnreadCount]);

  // Initial load and socket setup
  useEffect(() => {
    fetchMessages();
    markAsRead();

    // Join conversation room
    if (conversationId) {
      joinConversation(conversationId);
    }

    return () => {
      // Leave conversation room
      if (conversationId) {
        leaveConversation(conversationId);
      }
    };
  }, [conversationId, fetchMessages, markAsRead, joinConversation, leaveConversation]);

  // Listen for new messages from OTHER users only
  // Our own messages are added immediately after the API call for instant feedback
  useEffect(() => {
    const unsubscribe = onNewMessage((event) => {
      if (event.conversationId === conversationId) {
        // Skip if this is our own message (we already added it locally)
        const senderId = typeof event.message.sender === 'object' 
          ? event.message.sender._id 
          : event.message.sender;
        if (senderId === user?._id) {
          return;
        }
        
        // Check for duplicates before adding
        setMessages((prev) => {
          const exists = prev.some((msg) => msg._id === event.message._id);
          if (exists) return prev;
          return [...prev, event.message];
        });
        // Auto-scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
        // Mark as read since we're viewing
        markAsRead();
      }
    });

    return unsubscribe;
  }, [onNewMessage, conversationId, markAsRead, user?._id]);

  // Listen for typing indicators
  useEffect(() => {
    const unsubStart = onTypingStart((event) => {
      if (
        event.conversationId === conversationId &&
        event.userId === recipientId
      ) {
        setIsOtherTyping(true);
      }
    });

    const unsubStop = onTypingStop((event) => {
      if (
        event.conversationId === conversationId &&
        event.userId === recipientId
      ) {
        setIsOtherTyping(false);
      }
    });

    return () => {
      unsubStart();
      unsubStop();
    };
  }, [onTypingStart, onTypingStop, conversationId, recipientId]);

  // Listen for read receipts
  useEffect(() => {
    const unsubscribe = onMessagesRead((event) => {
      if (
        event.conversationId === conversationId &&
        event.readBy === recipientId
      ) {
        // Update messages to show as read
        setMessages((prev) =>
          prev.map((msg) =>
            event.messageIds.includes(msg._id)
              ? { ...msg, isRead: true, readAt: event.readAt }
              : msg
          )
        );
      }
    });

    return unsubscribe;
  }, [onMessagesRead, conversationId, recipientId]);

  // Handle input change with typing indicator
  const handleInputChange = (text: string) => {
    setInputText(text);

    // Start typing indicator
    if (!isTypingRef.current && text.length > 0) {
      isTypingRef.current = true;
      startTyping(conversationId);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        stopTyping(conversationId);
      }
    }, 2000);
  };

  // Pick and upload image
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setUploadingMedia(true);
      try {
        const uploaded = await uploadToCloudinarySigned(
          result.assets[0].uri,
          token!,
          'image',
          'messages'
        );

        setPendingAttachments((prev) => [
          ...prev,
          {
            url: uploaded.secure_url,
            publicId: uploaded.public_id,
            type: 'image',
            width: result.assets[0].width,
            height: result.assets[0].height,
          },
        ]);
      } catch (error) {
        console.error('Failed to upload image:', error);
      } finally {
        setUploadingMedia(false);
      }
    }
  };

  // Pick and upload video
  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      videoMaxDuration: 60,
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      setUploadingMedia(true);
      try {
        const uploaded = await uploadToCloudinarySigned(
          result.assets[0].uri,
          token!,
          'video',
          'messages'
        );

        setPendingAttachments((prev) => [
          ...prev,
          {
            url: uploaded.secure_url,
            publicId: uploaded.public_id,
            type: 'video',
            width: result.assets[0].width,
            height: result.assets[0].height,
            duration: result.assets[0].duration
              ? result.assets[0].duration / 1000
              : undefined,
          },
        ]);
      } catch (error) {
        console.error('Failed to upload video:', error);
      } finally {
        setUploadingMedia(false);
      }
    }
  };

  // Remove pending attachment
  const removeAttachment = (index: number) => {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Send message
  const sendMessage = async () => {
    const trimmedText = inputText.trim();
    if (!trimmedText && pendingAttachments.length === 0) return;
    if (!token || !conversationId) return;

    // Stop typing indicator
    if (isTypingRef.current) {
      isTypingRef.current = false;
      stopTyping(conversationId);
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    setSending(true);
    try {
      const message = await apiSendMessage(token, conversationId, {
        content: trimmedText,
        attachments: pendingAttachments,
      });

      // Add to local state (will also come via socket but this is faster)
      setMessages((prev) => [...prev, message]);
      setInputText('');
      setPendingAttachments([]);

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error: any) {
      console.error('Failed to send message:', error);
      // Check if this is a message request limit error
      if (error.message?.includes('only send one message')) {
        alert('Message request pending. You can only send one message until the recipient accepts your request.');
      } else if (error.message?.includes('declined')) {
        alert('This message request was declined.');
      }
    } finally {
      setSending(false);
    }
  };

  // Format message time
  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Format date separator
  const formatDateSeparator = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return date.toLocaleDateString([], {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  };

  // Check if should show date separator
  const shouldShowDateSeparator = (index: number) => {
    if (index === 0) return true;
    const currentDate = new Date(messages[index].createdAt).toDateString();
    const prevDate = new Date(messages[index - 1].createdAt).toDateString();
    return currentDate !== prevDate;
  };

  // Render message item
  const renderMessage = ({
    item,
    index,
  }: {
    item: Message;
    index: number;
  }) => {
    const isOwnMessage = item.sender._id === user?._id;
    const showDateSeparator = shouldShowDateSeparator(index);

    return (
      <View>
        {showDateSeparator && (
          <View style={styles.dateSeparator}>
            <Text style={styles.dateSeparatorText}>
              {formatDateSeparator(item.createdAt)}
            </Text>
          </View>
        )}
        <View
          style={[
            styles.messageRow,
            isOwnMessage ? styles.ownMessageRow : styles.otherMessageRow,
          ]}
        >
          {!isOwnMessage && (
            <View style={styles.messageAvatarContainer}>
              {recipientAvatar ? (
                <Image
                  source={{ uri: recipientAvatar }}
                  style={styles.messageAvatar}
                />
              ) : (
                <View style={[styles.messageAvatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarPlaceholderText}>
                    {recipientName?.charAt(0).toUpperCase() || '?'}
                  </Text>
                </View>
              )}
            </View>
          )}
          <View
            style={[
              styles.messageBubble,
              isOwnMessage ? styles.ownBubble : styles.otherBubble,
            ]}
          >
            {/* Attachments */}
            {item.attachments.length > 0 && (
              <View style={styles.attachmentsContainer}>
                {item.attachments.map((att, attIndex) => (
                  <View key={attIndex} style={styles.attachmentWrapper}>
                    {att.type === 'image' ? (
                      <Image
                        source={{ uri: att.url }}
                        style={styles.attachmentImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.videoPlaceholder}>
                        <Icon name="play-circle" size={40} color="#fff" />
                        <Text style={styles.videoDuration}>
                          {att.duration
                            ? `${Math.floor(att.duration / 60)}:${String(
                                Math.floor(att.duration % 60)
                              ).padStart(2, '0')}`
                            : 'Video'}
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
            {/* Text content */}
            {item.content && (
              <Text
                style={[
                  styles.messageText,
                  isOwnMessage ? styles.ownMessageText : styles.otherMessageText,
                ]}
              >
                {item.content}
              </Text>
            )}
            {/* Time and read receipt */}
            <View style={styles.messageFooter}>
              <Text
                style={[
                  styles.messageTime,
                  isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime,
                ]}
              >
                {formatMessageTime(item.createdAt)}
              </Text>
              {isOwnMessage && (
                <Icon
                  name={item.isRead ? 'check-circle' : 'check'}
                  size={12}
                  color={item.isRead ? '#22c55e' : 'rgba(255,255,255,0.6)'}
                  style={styles.readReceipt}
                />
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.primaryGreen} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeTop} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Icon name="chevron-left" size={20} color={Colors.light.primaryGreen} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerProfile}
            onPress={() =>
              router.push({
                pathname: '/(user)/user_profile',
                params: { userId: recipientId },
              })
            }
          >
            {recipientAvatar ? (
              <Image source={{ uri: recipientAvatar }} style={styles.headerAvatar} />
            ) : (
              <View style={[styles.headerAvatar, styles.avatarPlaceholder]}>
                <Text style={styles.headerAvatarText}>
                  {recipientName?.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
            )}
            <View style={styles.headerInfo}>
              <Text style={styles.headerName}>{recipientName}</Text>
              <Text style={styles.headerStatus}>
                {isOtherTyping
                  ? 'typing...'
                  : recipientOnline
                  ? 'Online'
                  : 'Offline'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView 
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item._id}
          renderItem={renderMessage}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          onScrollToIndexFailed={() => {}}
          onContentSizeChange={() => {
            if (messages.length > 0) {
              flatListRef.current?.scrollToEnd({ animated: false });
            }
          }}
          onRefresh={loadMoreMessages}
          refreshing={loadingMore}
          ListHeaderComponent={
            loadingMore ? (
              <ActivityIndicator
                size="small"
                color={Colors.light.primaryGreen}
                style={styles.loadingMore}
              />
            ) : null
          }
        />

        {/* Typing indicator */}
        {isOtherTyping && (
          <View style={styles.typingIndicator}>
            <Text style={styles.typingText}>{recipientName} is typing...</Text>
          </View>
        )}

        {/* Pending attachments preview */}
        {pendingAttachments.length > 0 && (
          <View style={styles.pendingAttachments}>
            {pendingAttachments.map((att, index) => (
              <View key={index} style={styles.pendingAttachment}>
                {att.type === 'image' ? (
                  <Image
                    source={{ uri: att.url }}
                    style={styles.pendingAttachmentImage}
                  />
                ) : (
                  <View style={styles.pendingAttachmentVideo}>
                    <Icon name="video-camera" size={20} color="#fff" />
                  </View>
                )}
                <TouchableOpacity
                  style={styles.removeAttachment}
                  onPress={() => removeAttachment(index)}
                >
                  <Icon name="times-circle" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Input area */}
        <View style={styles.inputContainer}>
          <TouchableOpacity
            style={styles.attachButton}
            onPress={pickImage}
            disabled={uploadingMedia}
          >
            <Icon
              name="image"
              size={22}
              color={uploadingMedia ? '#ccc' : Colors.light.primaryGreen}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.attachButton}
            onPress={pickVideo}
            disabled={uploadingMedia}
          >
            <Icon
              name="video-camera"
              size={22}
              color={uploadingMedia ? '#ccc' : Colors.light.primaryGreen}
            />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#9ca3af"
            value={inputText}
            onChangeText={handleInputChange}
            multiline
            maxLength={5000}
          />
          {uploadingMedia && (
            <ActivityIndicator
              size="small"
              color={Colors.light.primaryGreen}
              style={styles.uploadingIndicator}
            />
          )}
          <TouchableOpacity
            style={[
              styles.sendButton,
              ((!inputText.trim() && pendingAttachments.length === 0) ||
                sending ||
                uploadingMedia) &&
                styles.sendButtonDisabled,
            ]}
            onPress={sendMessage}
            disabled={
              (!inputText.trim() && pendingAttachments.length === 0) ||
              sending ||
              uploadingMedia
            }
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Icon name="send" size={18} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  safeTop: {
    backgroundColor: '#fff',
  },
  keyboardAvoid: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  headerAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.primaryGreen,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  headerStatus: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 12,
    paddingBottom: 8,
  },
  loadingMore: {
    marginVertical: 8,
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateSeparatorText: {
    fontSize: 12,
    color: '#9ca3af',
    backgroundColor: Colors.light.background,
    paddingHorizontal: 12,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  ownMessageRow: {
    justifyContent: 'flex-end',
  },
  otherMessageRow: {
    justifyContent: 'flex-start',
  },
  messageAvatarContainer: {
    marginRight: 8,
    alignSelf: 'flex-end',
  },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.light.softBeige,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.primaryGreen,
  },
  messageBubble: {
    maxWidth: SCREEN_WIDTH * 0.7,
    borderRadius: 16,
    padding: 12,
  },
  ownBubble: {
    backgroundColor: Colors.light.primaryGreen,
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#f3f4f6',
    borderBottomLeftRadius: 4,
  },
  attachmentsContainer: {
    marginBottom: 8,
  },
  attachmentWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 4,
  },
  attachmentImage: {
    width: SCREEN_WIDTH * 0.6,
    height: SCREEN_WIDTH * 0.45,
    borderRadius: 12,
  },
  videoPlaceholder: {
    width: SCREEN_WIDTH * 0.6,
    height: SCREEN_WIDTH * 0.45,
    backgroundColor: '#1f2937',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoDuration: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#1f2937',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 10,
  },
  ownMessageTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  otherMessageTime: {
    color: '#9ca3af',
  },
  readReceipt: {
    marginLeft: 4,
  },
  typingIndicator: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  typingText: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  pendingAttachments: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: '#f9fafb',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  pendingAttachment: {
    position: 'relative',
    marginRight: 8,
  },
  pendingAttachmentImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  pendingAttachmentVideo: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#1f2937',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeAttachment: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 8,
    paddingBottom: 34,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  attachButton: {
    padding: 8,
    marginRight: 4,
  },
  input: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    color: '#1f2937',
  },
  uploadingIndicator: {
    marginHorizontal: 8,
  },
  sendButton: {
    backgroundColor: Colors.light.primaryGreen,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
});
