import { useEffect, useRef, useState } from 'react';
import { Dimensions, FlatList, Image, Modal, Platform, RefreshControl, StatusBar, StyleSheet, Text, TouchableOpacity, View, Animated, Easing, TextInput, Alert } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/FontAwesome';
import { apiGetRecentSightings } from '../../api/sighting';
import { Colors } from '../../constants/Colors';
import { FeedScreenStyles } from '../../constants/FeedStyles';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { apiGetLikedSightingsByUser, apiToggleSightingLike } from '../../api/like';
import { apiCreateComment, apiDeleteComment, apiGetCommentsForSighting, apiUpdateComment } from '../../api/comment';

const { width } = Dimensions.get('window');

// Simple Coming Soon placeholder for non-Discover tabs
const ComingSoonScreen = () => (
  <View style={comingSoonStyles.container}>
    <StatusBar barStyle="light-content" />
    <Icon name="rocket" size={80} color="#fff" style={comingSoonStyles.icon} />
    <Text style={comingSoonStyles.title}>Coming Soon!</Text>
    <Text style={comingSoonStyles.subtitle}>We're working hard to bring you something amazing.</Text>
    <Text style={comingSoonStyles.subtitle}>Stay tuned!</Text>
  </View>
);

const TABS = ['Community', 'Following','Local','Discover'] as const;
type TabKey = typeof TABS[number];

export default function FeedScreen() {
  const router = useRouter();
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('Discover');
  const [sightings, setSightings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedSighting, setSelectedSighting] = useState(null);
  // Embedded comments state (per sighting)
  const [commentsExpanded, setCommentsExpanded] = useState<Record<string, boolean>>({});
  const [commentsLoadingById, setCommentsLoadingById] = useState<Record<string, boolean>>({});
  const [commentsById, setCommentsById] = useState<Record<string, any[]>>({});
  const [commentInputById, setCommentInputById] = useState<Record<string, string>>({});
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [carouselIndex, setCarouselIndex] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [hasMore, setHasMore] = useState(true);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const scaleMapRef = useRef<Record<string, Animated.Value>>({});

  const getScale = (id: string) => {
    if (!scaleMapRef.current[id]) {
      scaleMapRef.current[id] = new Animated.Value(1);
    }
    return scaleMapRef.current[id];
  };

  const pulseHeart = (id: string) => {
    const scale = getScale(id);
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.2, duration: 120, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
      Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
  };

  useEffect(() => {
    loadPage(1);
  }, []);

  const loadPage = (p = 1) => {
    if (p === 1) {
      setRefreshing(true);
    }
    setLoading(true);
    apiGetRecentSightings(p, pageSize)
      .then(async (resp) => {
        const payload = resp.data || {};
        const items = payload.items || [];
        if (p === 1) {
          setSightings(items);
        } else {
          setSightings(prev => [...prev, ...items]);
        }
        setHasMore((p * pageSize) < (payload.total || 0));
        setPage(p);

        // Preload liked state for current user for the items on this page
        try {
          if (user?._id) {
            const likedResp = await apiGetLikedSightingsByUser(user._id);
            const likedArr = Array.isArray(likedResp?.data) ? likedResp.data : [];
            const likedSet = new Set(
              likedArr.map((l: any) => (typeof l.sighting === 'object' ? l.sighting?._id : l.sighting)).filter(Boolean)
            );
            const pageIds = items.map((it: any) => it._id);
            setLikedMap((prev) => {
              const next = { ...prev } as Record<string, boolean>;
              pageIds.forEach((id: string) => { next[id] = likedSet.has(id); });
              return next;
            });
          }
        } catch (e) {
          // non-fatal; ignore
        }
      })
      .catch(console.error)
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  };

  const handleMenuOpen = (item) => {
    setSelectedSighting(item);
    setMenuVisible(true);
  };

  const handleToggleLike = async (item) => {
    const sightingId = item._id;
    if (!sightingId) return;
    if (!token || token === 'local-admin-fake-token') {
      alert('Please log in to like posts.');
      return;
    }
    const currentlyLiked = !!likedMap[sightingId];
    // optimistic update
    setLikedMap(prev => ({ ...prev, [sightingId]: !currentlyLiked }));
    setSightings(prev => prev.map(s => s._id === sightingId ? { ...s, likes: Math.max(0, (Number(s.likes) || 0) + (currentlyLiked ? -1 : 1)) } : s));
    try {
      const resp = await apiToggleSightingLike(token, sightingId);
      const serverLiked = !!resp?.data?.liked;
      // reconcile if server disagrees
      if (serverLiked !== !currentlyLiked) {
        setLikedMap(prev => ({ ...prev, [sightingId]: serverLiked }));
        setSightings(prev => prev.map(s => s._id === sightingId ? { ...s, likes: Math.max(0, (Number(s.likes) || 0) + (serverLiked ? 1 : -1)) } : s));
      }
    } catch (e) {
      // revert on error
      setLikedMap(prev => ({ ...prev, [sightingId]: currentlyLiked }));
      setSightings(prev => prev.map(s => s._id === sightingId ? { ...s, likes: Math.max(0, (Number(s.likes) || 0) + (currentlyLiked ? 1 : -1)) } : s));
      console.error('Failed to toggle like', e);
    }
    // Gentle pulse animation
    pulseHeart(sightingId);
  };

  const handleMenuClose = () => {
    setMenuVisible(false);
    setSelectedSighting(null);
  };

const loadCommentsFor = async (sightingId: string) => {
    setCommentsLoadingById(prev => ({ ...prev, [sightingId]: true }));
    try {
      const resp = await apiGetCommentsForSighting(sightingId);
      const list = Array.isArray(resp?.data) ? resp.data : [];
      setCommentsById(prev => ({ ...prev, [sightingId]: list }));
    } catch (e) {
      console.error('Failed to load comments', e);
      setCommentsById(prev => ({ ...prev, [sightingId]: [] }));
    } finally {
      setCommentsLoadingById(prev => ({ ...prev, [sightingId]: false }));
    }
  };

  const toggleComments = async (item) => {
    const sightingId = item._id;
    setCommentsExpanded(prev => ({ ...prev, [sightingId]: !prev[sightingId] }));
    const willExpand = !commentsExpanded[sightingId];
    if (willExpand && !commentsById[sightingId]) {
      await loadCommentsFor(sightingId);
    }
  };

  const setInputFor = (sightingId: string, text: string) => {
    setCommentInputById(prev => ({ ...prev, [sightingId]: text }));
  };

  const submitCommentFor = async (item) => {
    const sightingId = item._id;
    const text = (commentInputById[sightingId] || '').trim();
    if (!sightingId || !text) return;
    if (!token || token === 'local-admin-fake-token') {
      alert('Please log in to comment.');
      return;
    }
    try {
      const tempId = `temp_${Date.now()}`;
      const optimistic = {
        _id: tempId,
        sighting: sightingId,
        commentText: text,
        createdAt: new Date().toISOString(),
        user: { _id: user?._id, username: user?.username, profilePictureUrl: user?.profilePictureUrl },
      };
      setCommentsById(prev => ({ ...prev, [sightingId]: [...(prev[sightingId] || []), optimistic] }));
      setSightings(prev => prev.map(s => s._id === sightingId ? { ...s, comments: Math.max(0, Number(s.comments || 0) + 1) } : s));
      setInputFor(sightingId, '');
      await apiCreateComment(token, sightingId, text);
      await loadCommentsFor(sightingId);
    } catch (e) {
      console.error('Failed to post comment', e);
      setSightings(prev => prev.map(s => s._id === sightingId ? { ...s, comments: Math.max(0, Number(s.comments || 0) - 1) } : s));
    }
  };

  const startEditComment = (c) => {
    setEditingCommentId(c._id);
    setEditingText(c.commentText || '');
  };

  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditingText('');
  };

  const saveEditComment = async (sightingId?: string) => {
    if (!editingCommentId || !token) return;
    const text = editingText.trim();
    if (!text) return;
    try {
      await apiUpdateComment(token, editingCommentId, text);
      if (sightingId) {
        setCommentsById(prev => ({
          ...prev,
          [sightingId]: (prev[sightingId] || []).map((c: any) => c._id === editingCommentId ? { ...c, commentText: text } : c)
        }));
      }
      cancelEditComment();
    } catch (e) {
      console.error('Failed to update comment', e);
    }
  };

  const deleteComment = async (sightingId: string, c) => {
    if (!token) return;
    Alert.alert('Delete comment', 'Are you sure you want to delete this comment?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await apiDeleteComment(token, c._id);
          setCommentsById(prev => ({
            ...prev,
            [sightingId]: (prev[sightingId] || []).filter((x: any) => x._id !== c._id)
          }));
          setSightings(prev => prev.map(s => s._id === sightingId ? { ...s, comments: Math.max(0, Number(s.comments || 0) - 1) } : s));
        } catch (e) {
          console.error('Failed to delete comment', e);
        }
      } }
    ]);
  };

  function getRelativeTime(dateString: string) {
    const now = new Date();
    const posted = new Date(dateString);
    const diffMs = now.getTime() - posted.getTime();

    // Calculate the difference in various units
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    // If the difference is 7 days or more, show the date
    if (diffDays >= 7) {
      // Formats the date to "Month Day", e.g., "Sep 24"
      const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
      return new Intl.DateTimeFormat('en-US', options).format(posted);
    }

    // Return days if it's between 1 and 6
    if (diffDays > 0) {
      return `${diffDays}d ago`;
    }
    // Return hours if less than a day
    if (diffHours > 0) {
      return `${diffHours}h ago`;
    }
    // Return minutes if less than an hour
    if (diffMinutes > 0) {
      return `${diffMinutes}m ago`;
    }
    // Return seconds if less than a minute
    if (diffSeconds > 0) {
      return `${diffSeconds}s ago`;
    }

    return 'just now';
  }

  const renderImages = (mediaUrls, sightingId) => {
    if (!mediaUrls || mediaUrls.length === 0) return null;
    if (mediaUrls.length === 1) {
      return (
        <View style={FeedScreenStyles.cardImageContainer}>
          <Image
            source={{ uri: mediaUrls[0] }}
            style={FeedScreenStyles.cardImage}
            resizeMode="contain"
          />
        </View>
      );
    }
    // Carousel for multiple images
    return (
      <View style={FeedScreenStyles.cardImageContainer}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={e => {
            const index = Math.round(e.nativeEvent.contentOffset.x / width);
            setCarouselIndex(prev => ({ ...prev, [sightingId]: index }));
          }}
          scrollEventThrottle={16}
        // No style needed on the ScrollView itself for this to work
        >
          {mediaUrls.map((url, idx) => (
            <Image
              key={idx}
              source={{ uri: url }}
              // Combine the original style with a specific width
              style={[FeedScreenStyles.cardImage, { width: width }]}
              resizeMode="contain"
            />
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderItem = ({ item }) => (
    <View style={FeedScreenStyles.card}>
      <View style={FeedScreenStyles.cardHeader}>
        <TouchableOpacity
          onPress={() => {
            const userId = item?.user?._id || item?.user; // populated object or ObjectId
            const username = item?.user?.username || item?.userName || '';
            const profilePictureUrl = item?.user?.profilePictureUrl || item?.userProfilePictureUrl || '';
            if (userId) {
              router.push({
                pathname: '/(user)/user_profile',
                params: { userId: String(userId), username: String(username), profilePictureUrl: String(profilePictureUrl) }
              });
            }
          }}
          style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
          activeOpacity={0.8}
        >
          <Image
            source={{ uri: (item?.user?.profilePictureUrl || item.userProfilePictureUrl || 'https://ui-avatars.com/api/?name=User') }}
            style={FeedScreenStyles.avatar}
          />
          <View style={{ flex: 1 }}>
            <Text style={FeedScreenStyles.username}>{item?.user?.username || item.userName || 'Unknown'}</Text>
            <Text style={FeedScreenStyles.time}>{getRelativeTime(item.createdAt)}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleMenuOpen(item)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{ padding: 6 }}
          activeOpacity={0.7}
        >
          <Icon name="ellipsis-h" size={22} color={Colors.light.darkNeutral} />
        </TouchableOpacity>
      </View>
      {renderImages(item.mediaUrls, item._id)}
      {/* Carousel indicators */}
      {item.mediaUrls && item.mediaUrls.length > 1 && (
        <View style={FeedScreenStyles.carouselIndicators}>
          {item.mediaUrls.map((_, idx) => (
            <View
              key={idx}
              style={[
                FeedScreenStyles.carouselDot,
                carouselIndex[item._id] === idx && FeedScreenStyles.carouselDotActive,
              ]}
            />
          ))}
        </View>
      )}
      <Text style={FeedScreenStyles.cardCaption}>{item.caption}</Text>
      <View style={FeedScreenStyles.cardActions}>
        <TouchableOpacity style={FeedScreenStyles.cardActionBtn} onPress={() => handleToggleLike(item)} activeOpacity={0.8}>
          <Text style={{ marginRight: 10, color: Colors.light.primaryGreen }}>{Number(item.likes || 0)}</Text>
          <Animated.View style={{ transform: [{ scale: getScale(item._id) }] }}>
            <Icon
              name={likedMap[item._id] ? 'heart' : 'heart-o'}
              size={18}
              color={likedMap[item._id] ? '#e0245e' : Colors.light.buttonText}
            />
          </Animated.View>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', marginLeft: 'auto' }}>
          <TouchableOpacity style={FeedScreenStyles.cardActionBtn} onPress={() => toggleComments(item)}>
            <Text style={{ marginRight: 10, color: Colors.light.buttonText }}>{Number(item.comments || 0)}</Text>
            <Icon name="comment" size={18} color={Colors.light.buttonText} />
          </TouchableOpacity>
          <TouchableOpacity style={FeedScreenStyles.cardActionBtn}>
            <Icon name="share" size={18} color={Colors.light.buttonText} />
          </TouchableOpacity>
        </View>

      </View>
      {commentsExpanded[item._id] && (
        <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
          {commentsLoadingById[item._id] ? (
            <Text style={{ color: '#aaa', paddingVertical: 8 }}>Loading comments...</Text>
          ) : (
            <>
              {(commentsById[item._id] || []).map((c) => {
                const commentUserId = typeof c.user === 'string' ? c.user : c?.user?._id;
                const isMine = commentUserId && user?._id && String(commentUserId) === String(user._id);
                const isEditing = editingCommentId === c._id;
                return (
                  <View key={c._id} style={{ flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 6 }}>
                    <Image
                      source={{ uri: (c?.user?.profilePictureUrl || 'https://ui-avatars.com/api/?name=User') }}
                      style={{ width: 24, height: 24, borderRadius: 12, marginRight: 8 }}
                    />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ color: '#111', fontWeight: '600', flex: 1 }}>{c?.user?.username || 'User'}</Text>
                        {isMine && !isEditing && (
                          <View style={{ flexDirection: 'row' }}>
                            <TouchableOpacity onPress={() => startEditComment(c)} style={{ paddingHorizontal: 6 }}>
                              <Icon name="pencil" size={14} color="#aaa" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => deleteComment(item._id, c)} style={{ paddingHorizontal: 6 }}>
                              <Icon name="trash" size={14} color="#f55" />
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                      {isEditing ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                          <TextInput
                            value={editingText}
                            onChangeText={setEditingText}
                            placeholder="Edit comment"
                            placeholderTextColor="#777"
                            style={{ flex: 1, backgroundColor: '#2a2a2e', color: '#fff', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginRight: 6 }}
                          />
                          <TouchableOpacity onPress={() => saveEditComment(item._id)} style={{ paddingHorizontal: 10, paddingVertical: 8, backgroundColor: Colors.light.primaryGreen, borderRadius: 8, marginRight: 6 }}>
                            <Text style={{ color: '#000', fontWeight: '700' }}>Save</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={cancelEditComment} style={{ paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#333', borderRadius: 8 }}>
                            <Text style={{ color: '#fff', fontWeight: '700' }}>Cancel</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <Text style={{ color: '#000' }}>{c?.commentText}</Text>
                      )}
                    </View>
                  </View>
                );
              })}
              {((commentsById[item._id] || []).length === 0) && (
                <Text style={{ color: '#aaa', paddingVertical: 8 }}>No comments yet.</Text>
              )}
            </>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
            <TextInput
              value={commentInputById[item._id] || ''}
              onChangeText={(t) => setInputFor(item._id, t)}
              placeholder="Add a comment"
              placeholderTextColor="#777"
              style={{ flex: 1, backgroundColor: '#2a2a2e', color: '#fff', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginRight: 8 }}
            />
            <TouchableOpacity onPress={() => submitCommentFor(item)} style={{ paddingHorizontal: 12, paddingVertical: 10, backgroundColor: Colors.light.primaryGreen, borderRadius: 8 }}>
              <Text style={{ color: '#000', fontWeight: '700' }}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );

  // Derive a base status padding; on iOS StatusBar.currentHeight is often undefined so we add a manual safe area offset
  const baseStatus = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0;
  const iosExtra = Platform.OS === 'ios' ? 20 : 0; // additional space for notch/dynamic island
  const statusPad = baseStatus + iosExtra;
  // Increase the vertical offset so the tab bar sits further below notches/dynamic island
  const extraOffset = 36; // previously 12
  const tabBarHeight = 38; // slightly slimmer
  return (
    <View style={FeedScreenStyles.container}>
      <StatusBar barStyle="light-content" />

      {/* TikTok-style absolute tabs */}
  <View style={[tabStyles.absoluteBar, { top: statusPad + extraOffset }]}> 
        {TABS.map(tab => {
          const active = tab === activeTab;
          return (
            <TouchableOpacity
              key={tab}
              style={tabStyles.absTabItem}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.75}
            >
              <Text style={[tabStyles.absTabText, active && tabStyles.absTabTextActive]} numberOfLines={1}>{tab}</Text>
              {active && <View style={tabStyles.absIndicator} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {activeTab === 'Discover' ? (
        loading && sightings.length === 0 ? (
          <Text style={{ color: Colors.light.primaryGreen, paddingTop: tabBarHeight + statusPad + extraOffset + 8 }}>Loading...</Text>
        ) : (
          <FlatList
            data={sightings}
            keyExtractor={item => item._id}
            renderItem={renderItem}
            onEndReached={() => { if (hasMore && !loading) loadPage(page + 1); }}
            onEndReachedThreshold={0.5}
            contentContainerStyle={{ paddingTop: tabBarHeight + statusPad + extraOffset + 8, paddingBottom: 32 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => loadPage(1)}
                colors={[Colors.light.primaryGreen]}
                tintColor={Colors.light.primaryGreen}
              />
            }
            ListFooterComponent={hasMore ? <Text style={{ textAlign: 'center', padding: 8 }}>Loading more...</Text> : null}
          />
        )
      ) : (
  <View style={{ flex:1, paddingTop: tabBarHeight + statusPad + extraOffset }}>
          <ComingSoonScreen />
        </View>
      )}
      {/* Popup menu modal */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={handleMenuClose}
      >
        <TouchableOpacity style={FeedScreenStyles.menuOverlay} onPress={handleMenuClose} activeOpacity={1}>
          <View style={FeedScreenStyles.menuContainer}>
            <TouchableOpacity style={FeedScreenStyles.menuItem} onPress={() => { /* TODO: hook up report */ handleMenuClose(); }}>
              <Text style={FeedScreenStyles.menuText}>Report</Text>
            </TouchableOpacity>
            <TouchableOpacity style={FeedScreenStyles.menuItem} onPress={() => { /* TODO: hook up share */ handleMenuClose(); }}>
              <Text style={FeedScreenStyles.menuText}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity style={FeedScreenStyles.menuItem} onPress={handleMenuClose}>
              <Text style={FeedScreenStyles.menuText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

    </View>
  );
}

const tabStyles = StyleSheet.create({
  // New absolute bar mimicking TikTok top tabs
  absoluteBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    zIndex: 20,
  },
  absTabItem: {
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 6,
    alignItems: 'center',
  },
  absTabText: {
  color: '#888',
  fontSize: 16,
  fontWeight: '600',
  letterSpacing: 0.3,
  },
  absTabTextActive: {
  color: '#fff',
  fontWeight: '700',
  },
  absIndicator: {
  marginTop: 3,
  height: 2,
  width: 18,
  borderRadius: 2,
  backgroundColor: Colors.light.primaryGreen,
  },
});

const comingSoonStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121214', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  icon: { marginBottom: 30 },
  title: { fontSize: 36, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 15 },
  subtitle: { fontSize: 18, color: '#a1a1a6', textAlign: 'center', lineHeight: 26 },
});
