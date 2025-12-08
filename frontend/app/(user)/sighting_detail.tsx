import { ResizeMode, Video } from 'expo-av';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Easing,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/FontAwesome';
import { apiCreateComment, apiDeleteComment, apiGetCommentsForSighting } from '../../api/comment';
import { apiToggleSightingLike } from '../../api/like';
import { apiGetSightingById } from '../../api/sighting';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext';

const { width, height } = Dimensions.get('window');

interface Comment {
  _id: string;
  user: {
    _id: string;
    username: string;
    profilePictureUrl?: string;
  };
  commentText: string;
  createdAt: string;
}

interface FullSighting {
  _id: string;
  caption?: string;
  createdAt: string;
  mediaUrls: string[];
  user?: {
    _id: string;
    username: string;
    profilePictureUrl?: string;
  };
  userName?: string;
  userProfilePictureUrl?: string;
  animalId?: {
    _id: string;
    commonName: string;
    scientificName?: string;
  };
  animal?: {
    _id: string;
    commonName: string;
    scientificName?: string;
  };
  likes: number;
  commentCount?: number;
  comments?: number;
  isLikedByUser?: boolean;
}

export default function SightingDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token, user } = useAuth();
  const { sightingId } = useLocalSearchParams<{ sightingId: string }>();

  const [sighting, setSighting] = useState<FullSighting | null>(null);
  const [loading, setLoading] = useState(true);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  const scaleAnim = useRef(new Animated.Value(1)).current;

  const getUserData = () => {
    if (!sighting) return { username: 'Unknown', profilePictureUrl: null, _id: '' };
    
    // Try different possible user data locations
    if (sighting.user) {
      const profileUrl = sighting.user.profilePictureUrl?.trim();
      return {
        _id: sighting.user._id || '',
        username: sighting.user.username || 'Unknown',
        profilePictureUrl: profileUrl && profileUrl.length > 0 ? profileUrl : null,
      };
    }
    
    const profileUrl = sighting.userProfilePictureUrl?.trim();
    return {
      _id: '',
      username: sighting.userName || 'Unknown',
      profilePictureUrl: profileUrl && profileUrl.length > 0 ? profileUrl : null,
    };
  };

  const getAnimalData = () => {
    if (!sighting) return null;
    return sighting.animalId || sighting.animal || null;
  };

  const getCommentCount = () => {
    if (!sighting) return 0;
    return sighting.commentCount || sighting.comments || 0;
  };

  useEffect(() => {
    fetchSightingDetails();
  }, [sightingId]);

  const fetchSightingDetails = async () => {
    if (!sightingId) return;
    
    setLoading(true);
    try {
      const response = await apiGetSightingById(sightingId, token);
      const data = response.data; // Unwrap the data from the API response
      setSighting(data);
      setIsLiked(data.isLikedByUser || false);
      setLikesCount(data.likes || 0);
      
      // Log sighting view with like status
      console.log('[SIGHTING VIEW]', {
        sightingId: sightingId,
        caption: data.caption || 'No caption',
        isLikedByUser: data.isLikedByUser || false,
        likes: data.likes || 0,
        user: data.user?.username || 'Unknown',
        authenticated: !!token,
      });
    } catch (error) {
      console.error('Failed to fetch sighting:', error);
      alert('Failed to load sighting');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    if (!sightingId) return;
    
    setLoadingComments(true);
    try {
      const response = await apiGetCommentsForSighting(sightingId);
      const commentData = response.data || []; // Unwrap the data from the API response
      setComments(commentData);
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleLikeToggle = async () => {
    if (!token || !sightingId) return;

    const wasLiked = isLiked;
    const prevCount = likesCount;

    // Optimistic update
    setIsLiked(!wasLiked);
    setLikesCount(wasLiked ? prevCount - 1 : prevCount + 1);

    // Pulse animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.2,
        duration: 120,
        useNativeDriver: true,
        easing: Easing.out(Easing.quad),
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();

    try {
      await apiToggleSightingLike(token, sightingId);
    } catch (error) {
      console.error('Failed to toggle like:', error);
      // Revert on error
      setIsLiked(wasLiked);
      setLikesCount(prevCount);
    }
  };

  const handleCommentPress = () => {
    setCommentsVisible(true);
    fetchComments();
  };

  const handleSubmitComment = async () => {
    if (!token || !sightingId || !commentText.trim()) return;

    setSubmittingComment(true);
    try {
      const newComment = await apiCreateComment(token, sightingId, commentText.trim());
      setComments([newComment, ...comments]);
      setCommentText('');
      if (sighting) {
        setSighting({ ...sighting, commentCount: sighting.commentCount + 1 });
      }
    } catch (error) {
      console.error('Failed to post comment:', error);
      alert('Failed to post comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!token) return;

    try {
      await apiDeleteComment(token, commentId);
      setComments(comments.filter(c => c._id !== commentId));
      if (sighting) {
        setSighting({ ...sighting, commentCount: Math.max(0, sighting.commentCount - 1) });
      }
    } catch (error) {
      console.error('Failed to delete comment:', error);
      alert('Failed to delete comment');
    }
  };

  const handleShare = () => {
    // TODO: Implement sharing functionality
    alert('Sharing functionality coming soon!');
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
    return 'Just now';
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={Colors.light.primaryGreen} />
      </View>
    );
  }

  if (!sighting) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>Sighting not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const mediaUrls = sighting.mediaUrls || [];
  const currentMedia = mediaUrls[carouselIndex] || '';
  const isVideo = currentMedia.includes('.mp4') || currentMedia.includes('.mov');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sighting</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Info */}
        {(() => {
          const user = getUserData();
          return (
            <View style={styles.userInfo}>
              {user.profilePictureUrl ? (
                <Image
                  source={{ uri: user.profilePictureUrl }}
                  style={styles.avatar}
                />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Icon name="user" size={20} color="#888" />
                </View>
              )}
              <View style={styles.userTextContainer}>
                <Text style={styles.username}>{user.username}</Text>
                <Text style={styles.timestamp}>{getRelativeTime(sighting.createdAt)}</Text>
              </View>
            </View>
          );
        })()}

        {/* Media Carousel */}
        <View style={styles.mediaContainer}>
          {isVideo ? (
            <Video
              source={{ uri: currentMedia }}
              style={styles.media}
              resizeMode={ResizeMode.COVER}
              shouldPlay
              isLooping
              isMuted
            />
          ) : (
            <Image source={{ uri: currentMedia }} style={styles.media} resizeMode="cover" />
          )}

          {/* Media Navigation Dots */}
          {mediaUrls.length > 1 && (
            <View style={styles.dotsContainer}>
              {mediaUrls.map((_, idx) => (
                <View
                  key={idx}
                  style={[styles.dot, idx === carouselIndex && styles.dotActive]}
                />
              ))}
            </View>
          )}

          {/* Media Navigation Arrows */}
          {mediaUrls.length > 1 && (
            <>
              {carouselIndex > 0 && (
                <TouchableOpacity
                  style={[styles.arrowBtn, styles.arrowLeft]}
                  onPress={() => setCarouselIndex(carouselIndex - 1)}
                >
                  <Icon name="chevron-left" size={20} color="#fff" />
                </TouchableOpacity>
              )}
              {carouselIndex < mediaUrls.length - 1 && (
                <TouchableOpacity
                  style={[styles.arrowBtn, styles.arrowRight]}
                  onPress={() => setCarouselIndex(carouselIndex + 1)}
                >
                  <Icon name="chevron-right" size={20} color="#fff" />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {/* Actions Bar */}
        <View style={styles.actionsBar}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleLikeToggle}>
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              <Icon
                name={isLiked ? 'heart' : 'heart-o'}
                size={24}
                color={isLiked ? '#e74c3c' : '#333'}
              />
            </Animated.View>
            <Text style={styles.actionText}>{likesCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={handleCommentPress}>
            <Icon name="comment-o" size={24} color="#333" />
            <Text style={styles.actionText}>{getCommentCount()}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
            <Icon name="share" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        {/* Caption */}
        {sighting.caption && (() => {
          const user = getUserData();
          return (
            <View style={styles.captionContainer}>
              <Text style={styles.captionUsername}>{user.username}</Text>
              <Text style={styles.captionText}>{sighting.caption}</Text>
            </View>
          );
        })()}

        {/* Animal Info */}
        {(() => {
          const animal = getAnimalData();
          return animal ? (
            <View style={styles.animalInfo}>
              <Icon name="paw" size={16} color={Colors.light.primaryGreen} />
              <Text style={styles.animalText}>{animal.commonName}</Text>
              {animal.scientificName && (
                <Text style={styles.scientificText}>({animal.scientificName})</Text>
              )}
            </View>
          ) : null;
        })()}
      </ScrollView>

      {/* Comments Modal */}
      <Modal
        visible={commentsVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setCommentsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingTop: insets.top }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Comments</Text>
              <TouchableOpacity onPress={() => setCommentsVisible(false)}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {/* Comments List */}
            <ScrollView style={styles.commentsList}>
              {loadingComments ? (
                <ActivityIndicator size="small" color={Colors.light.primaryGreen} />
              ) : comments.length === 0 ? (
                <Text style={styles.noCommentsText}>No comments yet</Text>
              ) : (
                comments.map((comment) => (
                  <View key={comment._id} style={styles.commentItem}>
                    {comment.user.profilePictureUrl ? (
                      <Image
                        source={{ uri: comment.user.profilePictureUrl }}
                        style={styles.commentAvatar}
                      />
                    ) : (
                      <View style={[styles.commentAvatar, styles.avatarPlaceholder]}>
                        <Icon name="user" size={12} color="#888" />
                      </View>
                    )}
                    <View style={styles.commentContent}>
                      <View style={styles.commentHeader}>
                        <Text style={styles.commentUsername}>{comment.user.username}</Text>
                        <Text style={styles.commentTime}>{getRelativeTime(comment.createdAt)}</Text>
                      </View>
                      <Text style={styles.commentText}>{comment.commentText}</Text>
                    </View>
                    {user?._id === comment.user._id && (
                      <TouchableOpacity
                        onPress={() => handleDeleteComment(comment._id)}
                        style={styles.deleteCommentBtn}
                      >
                        <Icon name="trash-o" size={16} color="#999" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))
              )}
            </ScrollView>

            {/* Comment Input */}
            <View style={[styles.commentInputContainer, { paddingBottom: insets.bottom || 10 }]}>
              <TextInput
                style={styles.commentInput}
                placeholder="Add a comment..."
                value={commentText}
                onChangeText={setCommentText}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[
                  styles.sendBtn,
                  (!commentText.trim() || submittingComment) && styles.sendBtnDisabled,
                ]}
                onPress={handleSubmitComment}
                disabled={!commentText.trim() || submittingComment}
              >
                {submittingComment ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Icon name="send" size={16} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f0f0f0',
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  userTextContainer: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  timestamp: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  mediaContainer: {
    width: '100%',
    height: width,
    backgroundColor: '#000',
    position: 'relative',
  },
  media: {
    width: '100%',
    height: '100%',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  dotActive: {
    backgroundColor: '#fff',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  arrowBtn: {
    position: 'absolute',
    top: '50%',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateY: -20 }],
  },
  arrowLeft: {
    left: 12,
  },
  arrowRight: {
    right: 12,
  },
  actionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 20,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  captionContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  captionUsername: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  captionText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    lineHeight: 20,
  },
  animalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  animalText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.primaryGreen,
  },
  scientificText: {
    fontSize: 13,
    color: '#888',
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 16,
    color: '#888',
    marginBottom: 20,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.light.primaryGreen,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.8,
    minHeight: height * 0.5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  commentsList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  noCommentsText: {
    textAlign: 'center',
    color: '#888',
    fontSize: 15,
    paddingVertical: 40,
  },
  commentItem: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  commentUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  commentTime: {
    fontSize: 12,
    color: '#999',
  },
  commentText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 18,
  },
  deleteCommentBtn: {
    padding: 8,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 12,
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.primaryGreen,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
});
