import { ResizeMode, Video } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Dimensions, Easing, FlatList, Image, KeyboardAvoidingView, Modal, PanResponder, Platform, RefreshControl, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/FontAwesome';
import { apiGetPersonalizedFeed, apiGetPersonalizedFollowingFeed, apiGetPersonalizedLocalFeed, apiTrackSightingComment, apiTrackSightingLike, apiTrackSightingView } from '../../api/algorithm';
import { apiCreateComment, apiDeleteComment, apiGetCommentsForSighting, apiUpdateComment } from '../../api/comment';
import { apiGetLikedSightingsByUser, apiToggleSightingLike } from '../../api/like';
import { apiGetMyNotifications } from '../../api/notification';
import { CommunityVoteType, apiAdminDeleteSighting, apiGetCommunitySighting, apiGetFollowingRecentSightings, apiGetRecentSightings, apiGetSightingsNear, apiSubmitCommunityVote } from '../../api/sighting';
import { Colors } from '../../constants/Colors';
import { FeedScreenStyles } from '../../constants/FeedStyles';
import { useAuth } from '../../context/AuthContext';

const LOCAL_PAGE_SIZE = 10;
const getSightingTimestamp = (doc: any) => {
  const dateString = doc?.createdAt || doc?.updatedAt || doc?.timestamp;
  const time = dateString ? new Date(dateString).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
};

// Calculate distance between two points using Haversine formula
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance;
};

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

const TABS = ['Community', 'Following', 'Local', 'Discover'] as const;
type TabKey = typeof TABS[number];

export default function FeedScreen() {
  const router = useRouter();
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('Discover');
  const [sightings, setSightings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedSighting, setSelectedSighting] = useState(null);
  // Comments modal state
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [activeCommentSighting, setActiveCommentSighting] = useState<any>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
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
  const [localAllSightings, setLocalAllSightings] = useState<any[]>([]);
  const [localPage, setLocalPage] = useState(1);
  const [localMessage, setLocalMessage] = useState<string | null>(null);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const scaleMapRef = useRef<Record<string, Animated.Value>>({});
  const [floatingHearts, setFloatingHearts] = useState<Record<string, Array<{ id: string; anim: Animated.Value; x: number; y: number }>>>({});
  // Track which posts are currently visible to control video autoplay
  const [visibleMap, setVisibleMap] = useState<Record<string, boolean>>({});
  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 60 }).current;
  
  // Track view time for algorithm learning
  const viewStartTimes = useRef<Record<string, number>>({});
  
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: any[] }) => {
    const next: Record<string, boolean> = {};
    const now = Date.now();
    
    for (const it of viewableItems) {
      const id = it?.item?._id;
      if (id) {
        next[id] = true;
        // Start tracking view time if not already tracked
        if (!viewStartTimes.current[id]) {
          viewStartTimes.current[id] = now;
        }
      }
    }
    
    // Track views that ended (items that left the screen)
    Object.keys(visibleMap).forEach(id => {
      if (!next[id] && viewStartTimes.current[id]) {
        // Item left the screen, track the view duration
        const durationMs = now - viewStartTimes.current[id];
        const durationSeconds = Math.floor(durationMs / 1000);
        
        // Only track if viewed for at least 1 second and we have auth
        // Track on all tabs with algorithm (Discover, Following, Local)
        if (durationSeconds >= 1 && token && token !== 'local-admin-fake-token' && 
            (activeTab === 'Discover' || activeTab === 'Following' || activeTab === 'Local')) {
          apiTrackSightingView(id, durationSeconds, token).catch(err => {
            console.warn('Failed to track view:', err);
          });
        }
        
        delete viewStartTimes.current[id];
      }
    });
    
    setVisibleMap(next);
  });

  const [communityCandidate, setCommunityCandidate] = useState<any | null>(null);
  const [communityLoading, setCommunityLoading] = useState(false);
  const [communityProcessing, setCommunityProcessing] = useState(false);
  const [communityMessage, setCommunityMessage] = useState<string | null>(null);
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

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

  const createFloatingHeart = (sightingId: string, x: number, y: number) => {
    const heartId = `${sightingId}_${Date.now()}_${Math.random()}`;
    const anim = new Animated.Value(0);
    
    setFloatingHearts(prev => ({
      ...prev,
      [sightingId]: [...(prev[sightingId] || []), { id: heartId, anim, x, y }]
    }));

    Animated.timing(anim, {
      toValue: 1,
      duration: 1200,
      useNativeDriver: true,
      easing: Easing.out(Easing.ease),
    }).start(() => {
      // Remove the heart after animation completes
      setFloatingHearts(prev => ({
        ...prev,
        [sightingId]: (prev[sightingId] || []).filter(h => h.id !== heartId)
      }));
    });
  };

  const loadCommunityCandidate = useCallback(async () => {
    if (!token || token === 'local-admin-fake-token') {
      setCommunityCandidate(null);
      setCommunityMessage('Log in to help verify community sightings.');
      setCommunityLoading(false);
      pan.setValue({ x: 0, y: 0 });
      return;
    }

    setCommunityLoading(true);
    setCommunityMessage(null);
    setCommunityCandidate(null);

    try {
      const response = await apiGetCommunitySighting(token);
      const candidate = response?.data || null;

      if (candidate) {
        setCommunityCandidate(candidate);
      } else {
        setCommunityCandidate(null);
        setCommunityMessage('All caught up! Check back later for more community reviews.');
      }
    } catch (error: any) {
      const message = error?.message || 'Failed to load community sighting.';
      setCommunityMessage(message);
    } finally {
      setCommunityLoading(false);
      pan.setValue({ x: 0, y: 0 });
    }
  }, [pan, token]);

  const submitCommunityVoteAction = useCallback(async (voteType: CommunityVoteType) => {
    if (!communityCandidate) {
      return;
    }
    if (!token || token === 'local-admin-fake-token') {
      Alert.alert('Community Review', 'Log in to vote on community sightings.');
      return;
    }
    if (communityProcessing) {
      return;
    }

    setCommunityProcessing(true);
    try {
      await apiSubmitCommunityVote(token, communityCandidate._id, voteType);
      await loadCommunityCandidate();
    } catch (error: any) {
      const message = error?.message || 'Failed to record your vote.';
      Alert.alert('Community Review', message);
    } finally {
      setCommunityProcessing(false);
      pan.setValue({ x: 0, y: 0 });
    }
  }, [communityCandidate, communityProcessing, loadCommunityCandidate, pan, token]);

  const animateAndVote = useCallback((voteType: CommunityVoteType) => {
    if (!communityCandidate || communityProcessing) {
      return;
    }
    const targetX = voteType === 'APPROVE' ? width : -width;
    Animated.timing(pan, {
      toValue: { x: targetX, y: 0 },
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      submitCommunityVoteAction(voteType);
    });
  }, [communityCandidate, communityProcessing, pan, submitCommunityVoteAction]);

  const rotate = pan.x.interpolate({
    inputRange: [-width, 0, width],
    outputRange: ['-12deg', '0deg', '12deg'],
    extrapolate: 'clamp',
  });

  const approveOpacity = pan.x.interpolate({
    inputRange: [30, 150],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const rejectOpacity = pan.x.interpolate({
    inputRange: [-150, -30],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => {
          if (communityProcessing || !communityCandidate) return false;
          return Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy);
        },
        onPanResponderMove: (_, gesture) => {
          pan.setValue({ x: gesture.dx, y: gesture.dy });
        },
        onPanResponderRelease: (_, gesture) => {
          const threshold = 120;
          if (communityProcessing) {
            Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
            return;
          }
          if (gesture.dx > threshold) {
            animateAndVote('APPROVE');
          } else if (gesture.dx < -threshold) {
            animateAndVote('REJECT');
          } else {
            Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
          }
        },
        onPanResponderTerminate: () => {
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
        },
      }),
    [animateAndVote, communityCandidate, communityProcessing, pan]
  );

  const loadNotificationCount = useCallback(async () => {
    if (!token || token === 'local-admin-fake-token') {
      setUnreadNotificationCount(0);
      return;
    }

    try {
      const notifications = await apiGetMyNotifications(token);
      const unreadCount = notifications.filter(n => !n.isRead).length;
      setUnreadNotificationCount(unreadCount);
    } catch (error) {
      console.error('Failed to load notification count', error);
    }
  }, [token]);

  useEffect(() => {
    loadNotificationCount();
  }, [loadNotificationCount]);

  // Refresh notification count when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadNotificationCount();
    }, [loadNotificationCount])
  );


  useEffect(() => {
    // Load the first page whenever the active tab changes (Discover/Following)
    if (activeTab === 'Discover' || activeTab === 'Following') {
      loadPage(1);
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'Community') {
      loadCommunityCandidate();
    }
  }, [activeTab, loadCommunityCandidate]);

  const loadPage = useCallback((p = 1) => {
    if (p === 1) {
      setRefreshing(true);
    }
    setLoading(true);
    const fetcher = async () => {
      if (activeTab === 'Following') {
        // Require a valid auth token for following feed
        if (!token || token === 'local-admin-fake-token') {
          return { data: { items: [], total: 0 } } as any;
        }
        // Use personalized following feed with algorithm
        return apiGetPersonalizedFollowingFeed(token, p, pageSize);
      }
      // Use personalized feed for Discover tab if user is logged in
      if (activeTab === 'Discover' && token && token !== 'local-admin-fake-token') {
        return apiGetPersonalizedFeed(token, p, pageSize);
      }
      // Fallback to chronological feed for non-authenticated users
      return apiGetRecentSightings(p, pageSize);
    };
    fetcher()
      .then(async (resp) => {
        const payload = resp.data || {};
        const items = payload.items || [];
        
        // Debug: Log first item to see if algorithmScore is present
        if (items.length > 0 && (activeTab === 'Discover' || activeTab === 'Following')) {
          console.log('[FEED] First item data:', JSON.stringify(items[0], null, 2));
          console.log('[FEED] Has algorithmScore?', items[0].algorithmScore);
        }
        
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
  }, [activeTab, token, user?._id, pageSize]);
  const loadLocal = useCallback(async () => {
    setRefreshing(true);
    setLoading(true);
    setLocalMessage(null);
    setHasMore(false);
    setPage(1);
    try {
      if (!user) {
        setSightings([]);
        setLocalMessage('Sign in to see nearby sightings.');
        return;
      }

      const longitudeRaw = user.longitude ?? user?.location?.coordinates?.[0];
      const latitudeRaw = user.latitude ?? user?.location?.coordinates?.[1];

      const hasLongitude = !(longitudeRaw === null || longitudeRaw === undefined || (typeof longitudeRaw === 'string' && longitudeRaw.trim() === ''));
      const hasLatitude = !(latitudeRaw === null || latitudeRaw === undefined || (typeof latitudeRaw === 'string' && latitudeRaw.trim() === ''));

      if (!hasLongitude || !hasLatitude) {
        setSightings([]);
        setLocalMessage('Add a location to your profile to see nearby sightings.');
        return;
      }

      const longitudeNum = typeof longitudeRaw === 'number' ? longitudeRaw : Number(longitudeRaw);
      const latitudeNum = typeof latitudeRaw === 'number' ? latitudeRaw : Number(latitudeRaw);
      if (!Number.isFinite(longitudeNum) || !Number.isFinite(latitudeNum) || (longitudeNum === 0 && latitudeNum === 0)) {
        setSightings([]);
        setLocalMessage('Add a location to your profile to see nearby sightings.');
        return;
      }

      const radiusRaw = user.radius;
      const hasRadius = !(radiusRaw === null || radiusRaw === undefined || (typeof radiusRaw === 'string' && radiusRaw.trim() === ''));
      const radiusMiles = typeof radiusRaw === 'number' ? radiusRaw : Number(radiusRaw);
      if (!hasRadius || !Number.isFinite(radiusMiles) || radiusMiles <= 0) {
        setSightings([]);
        setLocalMessage('Set a search radius in your profile to see nearby sightings.');
        return;
      }

      const distMeters = Math.max(250, Math.round(radiusMiles * 1609.34));
      
      // Use personalized local feed with algorithm if logged in
      let resp;
      if (token && token !== 'local-admin-fake-token') {
        resp = await apiGetPersonalizedLocalFeed(token, longitudeNum, latitudeNum, distMeters, 1, 1000);
      } else {
        resp = await apiGetSightingsNear(longitudeNum, latitudeNum, distMeters, token || undefined);
      }
      
      const payload = resp?.data;
      const items = Array.isArray(payload) ? payload : (payload?.items || []);
      // For non-algorithm results, sort by timestamp in descending order (newest first)
      const sortedItems = (!token || token === 'local-admin-fake-token') 
        ? items.sort((a, b) => getSightingTimestamp(b) - getSightingTimestamp(a))
        : items; // Algorithm already orders them
      setSightings(sortedItems);

      if (sortedItems.length === 0) {
        setLocalMessage('No sightings within your radius yet. Try widening your search or check back later.');
      } else {
        setLocalMessage(null);
        if (user?._id) {
          try {
            const likedResp = await apiGetLikedSightingsByUser(user._id);
            const likedArr = Array.isArray(likedResp?.data) ? likedResp.data : [];
            const likedSet = new Set(
              likedArr
                .map((l: any) => (typeof l.sighting === 'object' ? l.sighting?._id : l.sighting))
                .filter(Boolean)
            );
            const pageIds = sortedItems.map((it: any) => it._id);
            setLikedMap((prev) => {
              const next = { ...prev } as Record<string, boolean>;
              pageIds.forEach((id: string) => { next[id] = likedSet.has(id); });
              return next;
            });
          } catch (e) {
            // ignore like prefetch errors for local feed
          }
        }
      }
    } catch (error) {
      console.error('Failed to load local sightings', error);
      const message = error instanceof Error ? error.message : 'Failed to load local sightings.';
      setSightings([]);
      setLocalMessage(message);
    } finally {
      setHasMore(false);
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, user]);

  useEffect(() => {
    if (activeTab === 'Discover' || activeTab === 'Following') {
      loadPage(1);
    } else if (activeTab === 'Local') {
      loadLocal();
    }
  }, [activeTab, loadLocal, loadPage]);

  const loadMoreLocal = useCallback(() => {
    if (activeTab !== 'Local' || loading || !hasMore) {
      return;
    }

    const nextPage = localPage + 1;
    const nextSlice = localAllSightings.slice(0, nextPage * LOCAL_PAGE_SIZE);
    if (nextSlice.length === sightings.length) {
      setHasMore(false);
      return;
    }

    setSightings(nextSlice);
    setLocalPage(nextPage);
    setHasMore(nextSlice.length < localAllSightings.length);
  }, [activeTab, hasMore, localAllSightings, localPage, loading, sightings]);

  const handleMenuOpen = (item) => {
    setSelectedSighting(item);
    setMenuVisible(true);
  };

  const lastTapRef = useRef<{ time: number; sightingId: string } | null>(null);

  const handleDoubleTap = async (item, event: any) => {
    const now = Date.now();
    const sightingId = item._id;
    
    if (
      lastTapRef.current &&
      lastTapRef.current.sightingId === sightingId &&
      now - lastTapRef.current.time < 300
    ) {
      // Double tap detected
      const isAlreadyLiked = likedMap[sightingId];
      
      // Always show heart animation on double tap
      const tapX = event?.nativeEvent?.locationX || event?.nativeEvent?.pageX || 50;
      const tapY = event?.nativeEvent?.locationY || event?.nativeEvent?.pageY || 50;
      createFloatingHeart(sightingId, tapX, tapY);
      pulseHeart(sightingId);
      
      // Only like if not already liked
      if (!isAlreadyLiked) {
        await handleToggleLike(item, event);
      }
      
      lastTapRef.current = null;
    } else {
      lastTapRef.current = { time: now, sightingId };
    }
  };

  const handleToggleLike = async (item, event?: any) => {
    const sightingId = item._id;
    if (!sightingId) return;
    if (!token || token === 'local-admin-fake-token') {
      alert('Please log in to like posts.');
      return;
    }
    const currentlyLiked = !!likedMap[sightingId];
    
    // Get tap coordinates if available
    let tapX = 50; // default position
    let tapY = 50; // default position
    if (event?.nativeEvent) {
      tapX = event.nativeEvent.locationX || event.nativeEvent.pageX || 50;
      tapY = event.nativeEvent.locationY || event.nativeEvent.pageY || 50;
    }
    
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
    // Create floating heart only when liking (not unliking)
    if (!currentlyLiked) {
      createFloatingHeart(sightingId, tapX, tapY);
      
      // Track the like for algorithm learning on all algorithm tabs
      if (token && token !== 'local-admin-fake-token' && 
          (activeTab === 'Discover' || activeTab === 'Following' || activeTab === 'Local')) {
        apiTrackSightingLike(sightingId, token).catch(err => {
          console.warn('Failed to track like for algorithm:', err);
        });
      }
    }
  };

  const handleMenuClose = () => {
    setMenuVisible(false);
    setSelectedSighting(null);
  };

  const handleDeleteSelected = async () => {
    const item = selectedSighting;
    if (!item || !item._id) return;
    if (!token || token === 'local-admin-fake-token') {
      alert('Please log in to delete your post.');
      return;
    }
    Alert.alert('Delete post', 'Are you sure you want to delete this post?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await apiAdminDeleteSighting(token, item._id);
            setSightings(prev => prev.filter(s => s._id !== item._id));
            handleMenuClose();
          } catch (e) {
            console.error('Failed to delete sighting', e);
            alert('Could not delete this post.');
          }
        }
      }
    ]);
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
    setActiveCommentSighting(item);
    
    // Load comments if not already loaded
    if (!commentsById[sightingId]) {
      await loadCommentsFor(sightingId);
    }
    
    // Show modal with slide-up animation
    setCommentsModalVisible(true);
    Animated.spring(slideAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  };

  const closeCommentsModal = () => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
      easing: Easing.out(Easing.ease),
    }).start(() => {
      setCommentsModalVisible(false);
      setActiveCommentSighting(null);
    });
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
      
      // Track the comment for algorithm learning on all algorithm tabs
      if (activeTab === 'Discover' || activeTab === 'Following' || activeTab === 'Local') {
        apiTrackSightingComment(sightingId, token).catch(err => {
          console.warn('Failed to track comment for algorithm:', err);
        });
      }
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
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
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
        }
      }
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

  // Helper function to calculate and format distance for local posts
  const getDistanceText = (item: any): string | null => {
    if (activeTab !== 'Local' || !user) return null;

    const userLat = user.latitude ?? user?.location?.coordinates?.[1];
    const userLon = user.longitude ?? user?.location?.coordinates?.[0];
    const sightingLat = item?.location?.coordinates?.[1] || item?.latitude;
    const sightingLon = item?.location?.coordinates?.[0] || item?.longitude;

    if (!userLat || !userLon || !sightingLat || !sightingLon) return null;

    const distance = calculateDistance(
      Number(userLat),
      Number(userLon),
      Number(sightingLat),
      Number(sightingLon)
    );

    if (distance < 0.1) {
      return '< 0.1 mi away';
    } else if (distance < 1) {
      return `${distance.toFixed(1)} mi away`;
    } else {
      return `${distance.toFixed(1)} mi away`;
    }
  };

  const renderImages = (mediaUrls, sightingId, forceVisible = false, onDoubleTap?: (e: any) => void) => {
    if (!mediaUrls || mediaUrls.length === 0) return null;
    const isVideoUrl = (url: string) => /\.(mp4|mov|m4v|webm)$/i.test(url) || /\/video\/upload\//i.test(url);
    const derivePoster = (url: string): string | undefined => {
      // Cloudinary videos: replace /video/upload/ with /video/upload/so_1/ and switch extension to .jpg
      try {
        if (!/res\.cloudinary\.com/i.test(url) || !/\/video\/upload\//i.test(url)) return undefined;
        const qIndex = url.indexOf('?');
        const clean = qIndex >= 0 ? url.slice(0, qIndex) : url;
        const dot = clean.lastIndexOf('.');
        const base = dot >= 0 ? clean.slice(0, dot) : clean;
        const transformed = base.replace('/video/upload/', '/video/upload/so_1/');
        return `${transformed}.jpg`;
      } catch {
        return undefined;
      }
    };
    const VideoComponent: any = Video as any;
    const isVisible = forceVisible || !!visibleMap[sightingId];
    if (mediaUrls.length === 1) {
      const url = mediaUrls[0];
      if (isVideoUrl(url)) {
        const poster = derivePoster(url);
        return (
          <TouchableOpacity 
            activeOpacity={1} 
            onPress={onDoubleTap}
            style={FeedScreenStyles.cardImageContainer}
          >
            <VideoComponent
              source={{ uri: url }}
              style={FeedScreenStyles.cardImage}
              resizeMode={ResizeMode.CONTAIN}
              useNativeControls
              shouldPlay={isVisible}
              isLooping
              isMuted
              {...(poster ? { usePoster: true, posterSource: { uri: poster } } : {})}
            />
          </TouchableOpacity>
        );
      }
      return (
        <TouchableOpacity 
          activeOpacity={1} 
          onPress={onDoubleTap}
          style={FeedScreenStyles.cardImageContainer}
        >
          <Image
            source={{ uri: url }}
            style={FeedScreenStyles.cardImage}
            resizeMode="contain"
          />
        </TouchableOpacity>
      );
    }
    // Carousel for multiple images
    return (
      <TouchableOpacity 
        activeOpacity={1} 
        onPress={onDoubleTap}
        style={FeedScreenStyles.cardImageContainer}
      >
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
          {mediaUrls.map((url, idx) => {
            const video = isVideoUrl(url);
            return video ? (
              <VideoComponent
                key={idx}
                source={{ uri: url }}
                style={[FeedScreenStyles.cardImage, { width }]}
                resizeMode={ResizeMode.CONTAIN}
                useNativeControls
                shouldPlay={isVisible && (carouselIndex[sightingId] === idx)}
                isLooping
                isMuted
                {...(() => { const p = derivePoster(url); return p ? { usePoster: true, posterSource: { uri: p } } : {}; })()}
              />
            ) : (
              <Image
                key={idx}
                source={{ uri: url }}
                style={[FeedScreenStyles.cardImage, { width }]}
                resizeMode="contain"
              />
            );
          })}
        </ScrollView>
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }) => (
    <View style={[FeedScreenStyles.card, { height: postHeight }]}>
      {/* Floating hearts container */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 10 }}>
        {(floatingHearts[item._id] || []).map(({ id, anim, x, y }) => {
          const translateY = anim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -150]
          });
          const opacity = anim.interpolate({
            inputRange: [0, 0.3, 0.7, 1],
            outputRange: [0, 1, 1, 0]
          });
          const scale = anim.interpolate({
            inputRange: [0, 0.3, 1],
            outputRange: [0.5, 1.2, 0.8]
          });
          const randomX = (Math.random() - 0.5) * 60;

          return (
            <Animated.View
              key={id}
              style={{
                position: 'absolute',
                left: x - 16,
                top: y - 16,
                transform: [
                  { translateY },
                  { translateX: randomX },
                  { scale }
                ],
                opacity
              }}
            >
              <Icon name="heart" size={32} color="#e0245e" />
            </Animated.View>
          );
        })}
      </View>
      <View style={FeedScreenStyles.cardHeader}>
        <View style={FeedScreenStyles.headerLeft}>
          <TouchableOpacity
            onPress={() => {
              const userId = item?.user?._id || item?.user;
              const username = item?.user?.username || item?.userName || '';
              const profilePictureUrl = item?.user?.profilePictureUrl || item?.userProfilePictureUrl || '';
              if (userId) {
                router.push({
                  pathname: '/(user)/user_profile',
                  params: { userId: String(userId), username: String(username), profilePictureUrl: String(profilePictureUrl) }
                });
              }
            }}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[Colors.light.primaryGreen, Colors.light.secondaryGreen]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={FeedScreenStyles.avatarRing}
            >
              <View style={FeedScreenStyles.avatar}>
                {item?.user?.profilePictureUrl || item.userProfilePictureUrl ? (
                  <Image
                    source={{ uri: item?.user?.profilePictureUrl || item.userProfilePictureUrl }}
                    style={{ width: 44, height: 44, borderRadius: 22 }}
                  />
                ) : (
                  <Text style={FeedScreenStyles.avatarText}>
                    {(item?.user?.username || item.userName || 'U').charAt(0).toUpperCase()}
                  </Text>
                )}
              </View>
            </LinearGradient>
          </TouchableOpacity>
          <View style={FeedScreenStyles.userInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={FeedScreenStyles.username}>{item?.user?.username || item.userName || 'Unknown'}</Text>
              {/* Algorithm Score Badge (Development Only) */}
              {item.algorithmScore !== undefined && (
                <View style={{
                  marginLeft: 8,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  backgroundColor: '#10b981',
                  borderRadius: 12,
                }}>
                  <Text style={{ color: 'white', fontSize: 11, fontWeight: '600' }}>
                    {item.algorithmScore.toFixed(1)}
                  </Text>
                </View>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={FeedScreenStyles.time}>{getRelativeTime(item.createdAt)}</Text>
              {getDistanceText(item) && (
                <>
                  <Text style={[FeedScreenStyles.time, { marginHorizontal: 4 }]}>•</Text>
                  <Text style={FeedScreenStyles.time}>{getDistanceText(item)}</Text>
                </>
              )}
            </View>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => handleMenuOpen(item)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={FeedScreenStyles.menuButton}
          activeOpacity={0.7}
        >
          <Icon name="ellipsis-h" size={20} color="#6b7280" />
        </TouchableOpacity>
      </View>
      {renderImages(item.mediaUrls, item._id, false, (e) => handleDoubleTap(item, e))}
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
      <View style={FeedScreenStyles.cardContent}>
        <View style={FeedScreenStyles.captionRow}>
          <Text style={FeedScreenStyles.cardCaption}>{item.caption}</Text>
          {/* Verification badges inline with caption */}
          {item.verifiedByAI && (
            <LinearGradient
              colors={[Colors.light.primaryGreen, Colors.light.secondaryGreen]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={verificationStyles.inlineBadge}
            >
              <Text style={verificationStyles.inlineBadgeText}>AI</Text>
            </LinearGradient>
          )}
        </View>

        <View style={FeedScreenStyles.cardActions}>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <View style={FeedScreenStyles.actionGroup}>
              <TouchableOpacity 
                style={FeedScreenStyles.cardActionBtn} 
                onPress={(e) => handleToggleLike(item, e)} 
                activeOpacity={0.8}
              >
                <Animated.View style={{ transform: [{ scale: getScale(item._id) }] }}>
                  <Icon
                    name={likedMap[item._id] ? 'heart' : 'heart-o'}
                    size={24}
                    color={likedMap[item._id] ? '#e0245e' : '#6b7280'}
                  />
                </Animated.View>
              </TouchableOpacity>
              <Text style={FeedScreenStyles.actionText}>{Number(item.likes || 0)}</Text>
            </View>
            <View style={FeedScreenStyles.actionGroup}>
              <TouchableOpacity style={FeedScreenStyles.cardActionBtn} onPress={() => toggleComments(item)}>
                <Icon name="comment-o" size={24} color="#6b7280" />
              </TouchableOpacity>
              <Text style={FeedScreenStyles.actionText}>{Number(item.comments || 0)}</Text>
            </View>
          </View>
          <TouchableOpacity style={FeedScreenStyles.cardActionBtn} onPress={() => {/* TODO: hook up share */ }}>
            <Icon name="share" size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // Derive a base status padding; on iOS StatusBar.currentHeight is often undefined so we add a manual safe area offset
  const baseStatus = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0;
  const iosExtra = Platform.OS === 'ios' ? 44 : 0; // additional space for notch/dynamic island
  const statusPad = baseStatus + iosExtra;
  const tabBarHeight = 56; // Height of the gradient header
  const bottomTabHeight = 80; // Height of bottom navigation
  const screenHeight = Dimensions.get('window').height;
  const postHeight = screenHeight - statusPad - tabBarHeight - bottomTabHeight;

  return (
    <View style={FeedScreenStyles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Gradient header with tabs */}
      <LinearGradient
        colors={[Colors.light.background, Colors.light.softBeige]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[tabStyles.gradientHeader, { paddingTop: statusPad }]}
      >
        <View style={tabStyles.tabRow}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={tabStyles.tabButton}
            >
              <Text style={[
                tabStyles.tabButtonText,
                activeTab === tab && tabStyles.tabButtonTextActive
              ]}>
                {tab}
              </Text>
              {activeTab === tab && (
                <LinearGradient
                  colors={[Colors.light.primaryGreen, Colors.light.secondaryGreen]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={tabStyles.activeIndicator}
                />
              )}
            </TouchableOpacity>
          ))}
          {/* Notification Bell Icon */}
          <TouchableOpacity
            onPress={() => router.push('/(user)/notifications')}
            style={tabStyles.notificationButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="bell" size={22} color={Colors.light.primaryGreen} />
            {unreadNotificationCount > 0 && (
              <View style={tabStyles.notificationBadge}>
                <Text style={tabStyles.notificationBadgeText}>
                  {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {activeTab === 'Community' ? (
        <View style={communityStyles.container}>
          {communityLoading && !communityCandidate ? (
            <View style={communityStyles.loadingContainer}>
              <ActivityIndicator color={Colors.light.primaryGreen} size="large" />
              <Text style={communityStyles.loadingText}>Loading community sighting...</Text>
            </View>
          ) : (!token || token === 'local-admin-fake-token') ? (
            <View style={communityStyles.emptyState}>
              <Text style={communityStyles.emptyText}>Log in to help verify community sightings.</Text>
            </View>
          ) : communityCandidate ? (
            <>
              <Animated.View style={[communityStyles.cardWrapper, { transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate }] }]} {...panResponder.panHandlers}>
                <Animated.View style={[communityStyles.swipeLabel, communityStyles.approveLabel, { opacity: approveOpacity }]}>
                  <Text style={communityStyles.approveText}>VERIFIED</Text>
                </Animated.View>
                <Animated.View style={[communityStyles.swipeLabel, communityStyles.rejectLabel, { opacity: rejectOpacity }]}>
                  <Text style={communityStyles.rejectText}>FLAGGED</Text>
                </Animated.View>
                <View style={[communityStyles.communityCard, { height: postHeight * 0.75 }]}>
                  <View style={FeedScreenStyles.cardHeader}>
                    <View style={FeedScreenStyles.headerLeft}>
                      <TouchableOpacity
                        onPress={() => {
                          const userId = communityCandidate?.user?._id || communityCandidate?.user;
                          const username = communityCandidate?.user?.username || communityCandidate?.userName || '';
                          const profilePictureUrl = communityCandidate?.user?.profilePictureUrl || communityCandidate?.userProfilePictureUrl || '';
                          if (userId) {
                            router.push({
                              pathname: '/(user)/user_profile',
                              params: { userId: String(userId), username: String(username), profilePictureUrl: String(profilePictureUrl) }
                            });
                          }
                        }}
                        activeOpacity={0.8}
                      >
                        <LinearGradient
                          colors={[Colors.light.primaryGreen, Colors.light.secondaryGreen]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={FeedScreenStyles.avatarRing}
                        >
                          <View style={FeedScreenStyles.avatar}>
                            {communityCandidate?.user?.profilePictureUrl || communityCandidate?.userProfilePictureUrl ? (
                              <Image
                                source={{ uri: communityCandidate?.user?.profilePictureUrl || communityCandidate?.userProfilePictureUrl }}
                                style={{ width: 44, height: 44, borderRadius: 22 }}
                              />
                            ) : (
                              <Text style={FeedScreenStyles.avatarText}>
                                {(communityCandidate?.user?.username || communityCandidate?.userName || 'U').charAt(0).toUpperCase()}
                              </Text>
                            )}
                          </View>
                        </LinearGradient>
                      </TouchableOpacity>
                      <View style={FeedScreenStyles.userInfo}>
                        <Text style={FeedScreenStyles.username}>{communityCandidate?.user?.username || communityCandidate?.userName || 'Unknown'}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={FeedScreenStyles.time}>{getRelativeTime(communityCandidate.createdAt)}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  {renderImages(communityCandidate.mediaUrls, communityCandidate._id, true, undefined)}
                  <View style={FeedScreenStyles.cardContent}>
                    <View style={FeedScreenStyles.captionRow}>
                      <Text style={FeedScreenStyles.cardCaption}>{communityCandidate.caption || 'No caption provided.'}</Text>
                    </View>
                    {(communityCandidate.verifiedByAI || communityCandidate.verifiedByUser || communityCandidate.verifiedByCommunity) && (
                      <View style={verificationStyles.badgeContainer}>
                        {communityCandidate.verifiedByAI && (
                          <View style={[verificationStyles.badge, verificationStyles.aiBadge]}>
                            <Text style={verificationStyles.badgeText}>AI</Text>
                          </View>
                        )}
                        {communityCandidate.verifiedByUser && (
                          <View style={[verificationStyles.badge, verificationStyles.userBadge]}>
                            <Text style={verificationStyles.badgeText}>User</Text>
                          </View>
                        )}
                        {communityCandidate.verifiedByCommunity && (
                          <View style={[verificationStyles.badge, verificationStyles.communityBadge]}>
                            <Text style={verificationStyles.badgeText}>Community</Text>
                          </View>
                        )}
                      </View>
                    )}
                    {communityCandidate.identification?.commonName && (
                      <Text style={{ marginHorizontal: 12, marginTop: 6, color: '#9aa0a6', fontSize: 12 }}>
                        Identified as {communityCandidate.identification.commonName}
                        {communityCandidate.identification?.scientificName ? ' (' + communityCandidate.identification.scientificName + ')' : ''}
                      </Text>
                    )}
                    {communityCandidate.communityReview && (
                      <Text style={{ marginHorizontal: 12, marginTop: 6, color: '#666', fontSize: 11 }}>
                        Community approvals: {communityCandidate.communityReview?.approvals || 0} | Flags: {communityCandidate.communityReview?.rejections || 0}
                      </Text>
                    )}
                  </View>
                </View>
              </Animated.View>
              <View style={communityStyles.buttonRow}>
                <TouchableOpacity
                  style={[
                    communityStyles.voteButton,
                    communityStyles.rejectButton,
                    (communityProcessing || communityLoading) && communityStyles.disabledButton,
                  ]}
                  onPress={() => animateAndVote('REJECT')}
                  disabled={communityProcessing || communityLoading}
                >
                  <Icon name="times" size={20} color="#fff" />
                  <Text style={communityStyles.voteButtonText}>Fake / Wrong ID</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    communityStyles.voteButton,
                    communityStyles.approveButton,
                    (communityProcessing || communityLoading) && communityStyles.disabledButton,
                  ]}
                  onPress={() => animateAndVote('APPROVE')}
                  disabled={communityProcessing || communityLoading}
                >
                  <Icon name="check" size={20} color="#fff" />
                  <Text style={communityStyles.voteButtonText}>Looks Good</Text>
                </TouchableOpacity>
              </View>
              <Text style={communityStyles.instructions}>Swipe left to flag, swipe right to verify. Help the community validate sightings.</Text>
            </>
          ) : (
            <View style={communityStyles.emptyState}>
              <Text style={communityStyles.emptyText}>{communityMessage || 'All caught up! Check back later for more sightings.'}</Text>
              <TouchableOpacity onPress={loadCommunityCandidate} style={communityStyles.refreshButton} disabled={communityLoading}>
                <Text style={communityStyles.refreshText}>{communityLoading ? 'Refreshing...' : 'Refresh'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : activeTab === 'Discover' || activeTab === 'Following' ? (
        loading && sightings.length === 0 ? (
          <Text style={{ color: Colors.light.primaryGreen, paddingTop: 8 }}>Loading...</Text>
        ) : (
          (activeTab === 'Following' && (!token || token === 'local-admin-fake-token') && sightings.length === 0) ? (
            <View style={{ flex: 1, alignItems: 'center', paddingTop: 32 }}>
              <Text style={{ color: '#aaa' }}>Log in to see posts from people you follow.</Text>
            </View>
          ) : (
            <FlatList
              data={sightings}
              keyExtractor={item => item._id}
              renderItem={renderItem}
              onEndReached={() => { if (hasMore && !loading) loadPage(page + 1); }}
              onEndReachedThreshold={0.5}
              onViewableItemsChanged={onViewableItemsChanged.current} 
              viewabilityConfig={viewabilityConfig}
              pagingEnabled
              snapToInterval={postHeight}
              snapToAlignment="start"
              decelerationRate="fast"
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => loadPage(1)}
                  colors={[Colors.light.primaryGreen]}
                  tintColor={Colors.light.primaryGreen}
                />
              }
              ListFooterComponent={hasMore ? <View style={{ height: postHeight, justifyContent: 'center', alignItems: 'center' }}><Text style={{ textAlign: 'center', padding: 8 }}>Loading more...</Text></View> : null}
            />
          )
        )
      ) : activeTab === 'Local' ? (
        <View style={{ flex: 1 }}>
          {loading && sightings.length === 0 ? (
            <Text style={{ color: Colors.light.primaryGreen, paddingTop: 8, textAlign: 'center' }}>Loading...</Text>
          ) : localMessage ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
              <Text style={{ color: '#aaa', textAlign: 'center', lineHeight: 22 }}>{localMessage}</Text>
              <TouchableOpacity onPress={() => loadLocal()} style={{ marginTop: 16, paddingHorizontal: 18, paddingVertical: 10, backgroundColor: Colors.light.primaryGreen, borderRadius: 8 }}>
                <Text style={{ color: '#000', fontWeight: '700' }}>Refresh</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={sightings}
              keyExtractor={item => item._id}
              renderItem={renderItem}
              onViewableItemsChanged={onViewableItemsChanged.current}
              viewabilityConfig={viewabilityConfig}
              pagingEnabled
              snapToInterval={postHeight}
              snapToAlignment="start"
              decelerationRate="fast"
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => loadLocal()}
                  colors={[Colors.light.primaryGreen]}
                  tintColor={Colors.light.primaryGreen}
                />
              }
            />
          )}
        </View>
      ) : (
        <View style={{ flex: 1 }}>
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
        <View style={FeedScreenStyles.menuOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject as any}
            activeOpacity={1}
            onPress={handleMenuClose}
          />
          <View style={FeedScreenStyles.menuContainer}>
            {(() => {
              const ownerId = typeof selectedSighting?.user === 'string' ? selectedSighting?.user : selectedSighting?.user?._id;
              const isOwner = ownerId && user?._id && String(ownerId) === String(user._id);
              return (
                <>
                  {isOwner && (
                    <TouchableOpacity style={FeedScreenStyles.menuItem} onPress={handleDeleteSelected}>
                      <Text style={[FeedScreenStyles.menuText, { color: '#f55' }]}>Delete</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={FeedScreenStyles.menuItem} onPress={() => { /* TODO: hook up report */ handleMenuClose(); }}>
                    <Text style={FeedScreenStyles.menuText}>Report</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={FeedScreenStyles.menuItem} onPress={() => { /* TODO: hook up share */ handleMenuClose(); }}>
                    <Text style={FeedScreenStyles.menuText}>Share</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={FeedScreenStyles.menuItem} onPress={handleMenuClose}>
                    <Text style={FeedScreenStyles.menuText}>Cancel</Text>
                  </TouchableOpacity>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* Comments Modal */}
      <Modal
        visible={commentsModalVisible}
        transparent
        animationType="none"
        onRequestClose={closeCommentsModal}
      >
        <View style={commentsModalStyles.overlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject as any}
            activeOpacity={1}
            onPress={closeCommentsModal}
          />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end' }}>
            <Animated.View
              style={[
                commentsModalStyles.modalContainer,
                {
                  transform: [
                    {
                      translateY: slideAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [600, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
            {/* Modal Header */}
            <View style={commentsModalStyles.header}>
              <View style={commentsModalStyles.dragHandle} />
              <Text style={commentsModalStyles.headerTitle}>Comments</Text>
              <TouchableOpacity onPress={closeCommentsModal} style={commentsModalStyles.closeButton}>
                <Icon name="times" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {/* Comments List */}
            <ScrollView style={commentsModalStyles.commentsContainer}>
              {activeCommentSighting && commentsLoadingById[activeCommentSighting._id] ? (
                <Text style={commentsModalStyles.loadingText}>Loading comments...</Text>
              ) : (
                <>
                  {activeCommentSighting && (commentsById[activeCommentSighting._id] || []).map((c) => {
                    const commentUserId = typeof c.user === 'string' ? c.user : c?.user?._id;
                    const isMine = commentUserId && user?._id && String(commentUserId) === String(user._id);
                    const isEditing = editingCommentId === c._id;
                    return (
                      <View key={c._id} style={commentsModalStyles.commentItem}>
                        <TouchableOpacity
                          onPress={() => {
                            const userId = c?.user?._id || c?.user;
                            const username = c?.user?.username || 'User';
                            const profilePictureUrl = c?.user?.profilePictureUrl || '';
                            if (userId) {
                              closeCommentsModal();
                              router.push({
                                pathname: '/(user)/user_profile',
                                params: { userId: String(userId), username: String(username), profilePictureUrl: String(profilePictureUrl) }
                              });
                            }
                          }}
                          activeOpacity={0.8}
                        >
                          <Image
                            source={{ uri: (c?.user?.profilePictureUrl || 'https://ui-avatars.com/api/?name=User') }}
                            style={commentsModalStyles.commentAvatar}
                          />
                        </TouchableOpacity>
                        <View style={commentsModalStyles.commentContent}>
                          <View style={commentsModalStyles.commentHeader}>
                            <Text style={commentsModalStyles.commentUsername}>{c?.user?.username || 'User'}</Text>
                            {isMine && !isEditing && (
                              <View style={commentsModalStyles.commentActions}>
                                <TouchableOpacity onPress={() => startEditComment(c)} style={{ paddingHorizontal: 6 }}>
                                  <Icon name="pencil" size={14} color="#6b7280" />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => deleteComment(activeCommentSighting._id, c)} style={{ paddingHorizontal: 6 }}>
                                  <Icon name="trash" size={14} color="#ef4444" />
                                </TouchableOpacity>
                              </View>
                            )}
                          </View>
                          {isEditing ? (
                            <View style={commentsModalStyles.editContainer}>
                              <TextInput
                                value={editingText}
                                onChangeText={setEditingText}
                                placeholder="Edit comment"
                                placeholderTextColor="#9ca3af"
                                style={commentsModalStyles.editInput}
                                multiline
                              />
                              <View style={commentsModalStyles.editButtons}>
                                <TouchableOpacity onPress={() => saveEditComment(activeCommentSighting._id)} style={commentsModalStyles.saveButton}>
                                  <Text style={commentsModalStyles.saveButtonText}>Save</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={cancelEditComment} style={commentsModalStyles.cancelButton}>
                                  <Text style={commentsModalStyles.cancelButtonText}>Cancel</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          ) : (
                            <Text style={commentsModalStyles.commentText}>{c?.commentText}</Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                  {activeCommentSighting && ((commentsById[activeCommentSighting._id] || []).length === 0) && (
                    <Text style={commentsModalStyles.emptyText}>No comments yet. Be the first to comment!</Text>
                  )}
                </>
              )}
            </ScrollView>

            {/* Comment Input */}
            {activeCommentSighting && (
              <View style={commentsModalStyles.inputContainer}>
                <TextInput
                  value={commentInputById[activeCommentSighting._id] || ''}
                  onChangeText={(t) => setInputFor(activeCommentSighting._id, t)}
                  placeholder="Add a comment..."
                  placeholderTextColor="#9ca3af"
                  style={commentsModalStyles.input}
                  multiline
                />
                <TouchableOpacity 
                  onPress={() => submitCommentFor(activeCommentSighting)} 
                  style={commentsModalStyles.sendButton}
                >
                  <Icon name="send" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

    </View>
  );
}

const communityStyles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#888',
    fontSize: 13,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyText: {
    color: '#bbb',
    textAlign: 'center',
    lineHeight: 20,
  },
  refreshButton: {
    marginTop: 18,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.light.primaryGreen,
    borderRadius: 10,
  },
  refreshText: {
    color: '#000',
    fontWeight: '700',
  },
  cardWrapper: {
    alignSelf: 'stretch',
    marginBottom: 20,
  },
  communityCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  swipeLabel: {
    position: 'absolute',
    top: '45%',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 999,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  approveLabel: {
    right: 32,
    backgroundColor: 'rgba(74, 222, 128, 0.9)',
    transform: [{ rotate: '25deg' }],
  },
  approveText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 24,
    letterSpacing: 1.5,
  },
  rejectLabel: {
    left: 32,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    transform: [{ rotate: '-25deg' }],
  },
  rejectText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 24,
    letterSpacing: 1.5,
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 16,
    paddingHorizontal: 4,
  },
  voteButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rejectButton: {
    backgroundColor: '#1f2937',
  },
  approveButton: {
    backgroundColor: Colors.light.primaryGreen,
  },
  voteButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  disabledButton: {
    opacity: 0.6,
  },
  instructions: {
    marginTop: 18,
    color: '#9aa0a6',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});

const tabStyles = StyleSheet.create({
  gradientHeader: {
    width: '100%',
    paddingBottom: 12,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  tabButton: {
    position: 'relative',
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonText: {
    fontSize: 18,
    color: Colors.light.secondaryGreen,
    fontWeight: '500',
  },
  tabButtonTextActive: {
    color: Colors.light.primaryGreen,
    fontWeight: '700',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -8,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
    marginLeft: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});

const comingSoonStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121214', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  icon: { marginBottom: 30 },
  title: { fontSize: 36, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 15 },
  subtitle: { fontSize: 18, color: '#a1a1a6', textAlign: 'center', lineHeight: 26 },
});

const verificationStyles = StyleSheet.create({
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 12,
    marginBottom: 8,
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  aiBadge: {
    backgroundColor: '#4CAF50', // Green for AI
  },
  userBadge: {
    backgroundColor: '#FFC107', // Yellow for User
  },
  communityBadge: {
    backgroundColor: '#2196F3', // Blue for Community
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  inlineBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
    alignSelf: 'flex-start',
  },
  inlineBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});

const commentsModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    position: 'relative',
  },
  dragHandle: {
    position: 'absolute',
    top: 8,
    width: 40,
    height: 4,
    backgroundColor: '#d1d5db',
    borderRadius: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    padding: 4,
  },
  commentsContainer: {
    maxHeight: 400,
    paddingHorizontal: 16,
  },
  loadingText: {
    color: '#9ca3af',
    textAlign: 'center',
    paddingVertical: 24,
  },
  commentItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  commentUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  commentActions: {
    flexDirection: 'row',
    gap: 8,
  },
  commentText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  editContainer: {
    marginTop: 8,
  },
  editInput: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#1f2937',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  editButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  saveButton: {
    backgroundColor: Colors.light.primaryGreen,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 14,
  },
  cancelButton: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyText: {
    color: '#9ca3af',
    textAlign: 'center',
    paddingVertical: 32,
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  input: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1f2937',
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: Colors.light.primaryGreen,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});







