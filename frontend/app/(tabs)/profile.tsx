import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Dimensions, FlatList, Image, Modal, Pressable, RefreshControl, Share, StyleSheet, Switch, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { apiGetMyBadgeProgress, Badge, getBadgeCategoryColor, getBadgeIcon } from '../../api/badge';
import { getLevelColor, getMyLevelInfo, LevelProgress } from '../../api/experience';
import { ActivityItem, apiGetUserActivityFeed } from '../../api/like';
import { apiGetMySightings } from '../../api/sighting';
import { apiDeleteUserAccount, apiUpdateUserDetails } from '../../api/user';
import { apiGetUserDiscoveries } from '../../api/userDiscovery';
import { ScaleInView } from '../../components/AnimatedComponents';
import { profileStyles } from '../../constants/ProfileStyles';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../hooks/useNotification';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Sighting = {
  _id: string;
  caption: string;
  createdAt: string;
  mediaUrls: string[];
  userName: string;
  animalName?: string;
  verified?: boolean;
};

// Separate component for animated grid item (hooks must be in components)
const AnimatedGridItem = ({ 
  thumb, 
  index, 
  onPress 
}: { 
  thumb: string | null; 
  index: number; 
  onPress: () => void;
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      tension: 100,
      friction: 5,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 5,
    }).start();
  };

  return (
    <ScaleInView delay={index * 50} style={{ flex: 1/3 }}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Pressable
          style={profileStyles.sightingGridItem}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          {thumb ? (
            <Image
              source={{ uri: thumb }}
              style={profileStyles.sightingGridImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[profileStyles.sightingGridImage, { backgroundColor: '#ddd', alignItems: 'center', justifyContent: 'center' }]}>
              <Text>No preview</Text>
            </View>
          )}
        </Pressable>
      </Animated.View>
    </ScaleInView>
  );
};

type ApiResponse = {
  data: Sighting[];
  message: string;
  statusCode: number;
  success: boolean;
};

export default function ProfileScreen(): React.JSX.Element | null {
  const { user, token, logout, refreshUser } = useAuth();
  const router = useRouter();
  const notification = useNotification();
  const [menuVisible, setMenuVisible] = useState<boolean>(false);
  const [notificationModalVisible, setNotificationModalVisible] = useState<boolean>(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(user?.notificationsEnabled ?? true);
  const [activeStatTab, setActiveStatTab] = useState<'species' | 'badges' | null>(null);
  const [badgeFilter, setBadgeFilter] = useState<'all' | 'earned'>('all');
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [discoveries, setDiscoveries] = useState<any[]>([]);
  const [levelInfo, setLevelInfo] = useState<LevelProgress | null>(null);
  
  // Badge state
  const [userBadges, setUserBadges] = useState<Badge[]>([]);
  const [badgesLoading, setBadgesLoading] = useState(false);
  const [badgeSummary, setBadgeSummary] = useState<{ totalBadges: number; earnedCount: number; totalXPFromBadges: number; } | null>(null);

  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Profile/Activity tab state
  const [profileTab, setProfileTab] = useState<'profile' | 'activity'>('profile');
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityPage, setActivityPage] = useState(1);
  const [hasMoreActivity, setHasMoreActivity] = useState(true);
  const [activityRefreshing, setActivityRefreshing] = useState(false);
  const tabIndicatorAnim = useRef(new Animated.Value(0)).current;

  // Sync notification state with user data
  useEffect(() => {
    if (user?.notificationsEnabled !== undefined) {
      setNotificationsEnabled(user.notificationsEnabled);
    }
  }, [user?.notificationsEnabled]);

  const loadMySightings = useCallback(async () => {
    if (!user?._id || !token) { setIsLoading(false); return; }
    try {
      const [sightingsResponse, discoveriesResponse, levelResponse] = await Promise.all([
        apiGetMySightings(token),
        apiGetUserDiscoveries(token).catch(() => ({ data: null })),
        getMyLevelInfo(token).catch(() => null)
      ]);
      
      if (sightingsResponse && sightingsResponse.data) {
        const raw = Array.isArray(sightingsResponse.data) ? sightingsResponse.data : [];
        const enriched = raw.map((doc: any) => ({ 
          ...doc, 
          user: doc?.user ?? user._id,
          userName: user.username,
          userProfilePictureUrl: user.profilePictureUrl,
          likes: doc.likes || 0
        }));
        setSightings(enriched);
      }
      
      if (discoveriesResponse?.data?.animalDiscoveries) {
        setDiscoveries(discoveriesResponse.data.animalDiscoveries);
      }

      if (levelResponse) {
        setLevelInfo(levelResponse);
        console.log('[Profile] Level info loaded:', levelResponse);
      }
    } catch (error) {
      console.error("Failed to fetch sightings:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user?._id, user?.username, user?.profilePictureUrl, token]);

  // Load user badges from API
  const loadBadges = useCallback(async () => {
    if (!token) return;
    setBadgesLoading(true);
    try {
      const response = await apiGetMyBadgeProgress();
      // Response is wrapped in ApiResponse: { statusCode, data, message, success }
      if (response?.data) {
        setUserBadges(response.data.all || []);
        setBadgeSummary(response.data.summary || null);
        console.log('[Profile] Badges loaded:', response.data.summary);
      }
    } catch (error) {
      console.error('[Profile] Failed to load badges:', error);
    } finally {
      setBadgesLoading(false);
    }
  }, [token]);

  useEffect(() => { loadMySightings(); loadBadges(); }, [loadMySightings, loadBadges]);
  useFocusEffect(useCallback(() => { loadMySightings(); loadBadges(); return () => {}; }, [loadMySightings, loadBadges]));

  // Load activity feed when tab switches to activity
  const loadActivityFeed = useCallback(async (page = 1, append = false) => {
    if (!user?._id) return;
    
    if (page === 1) {
      setActivityLoading(true);
    }
    
    try {
      const response = await apiGetUserActivityFeed(user._id, page, 15);
      const data = response.data;
      
      if (append) {
        setActivityFeed(prev => [...prev, ...data.activities]);
      } else {
        setActivityFeed(data.activities);
      }
      setHasMoreActivity(data.hasMore);
      setActivityPage(page);
    } catch (error) {
      console.error('Failed to load activity feed:', error);
    } finally {
      setActivityLoading(false);
    }
  }, [user?._id]);

  // Handle pull-to-refresh for activity feed
  const handleActivityRefresh = useCallback(async () => {
    setActivityRefreshing(true);
    try {
      await loadActivityFeed(1, false);
    } finally {
      setActivityRefreshing(false);
    }
  }, [loadActivityFeed]);

  // Animate tab indicator and load data when tab changes
  useEffect(() => {
    Animated.spring(tabIndicatorAnim, {
      toValue: profileTab === 'profile' ? 0 : 1,
      useNativeDriver: true,
      friction: 8,
    }).start();
    
    if (profileTab === 'activity' && activityFeed.length === 0) {
      loadActivityFeed(1);
    }
  }, [profileTab, loadActivityFeed, activityFeed.length, tabIndicatorAnim]);

  const isVideoUrl = (url: string | undefined | null): boolean => {
    if (!url) return false;
    const u = url.toLowerCase();
    return /(\.(mp4|mov|m4v|webm)(\?|$))/.test(u) || /\/video\/upload\//.test(u);
  };

  const isCloudinary = (url: string | undefined | null): boolean => !!url && /res\.cloudinary\.com\//.test(url);

  const deriveCloudinaryPoster = (videoUrl: string): string | null => {
    if (!isCloudinary(videoUrl)) return null;
    // Insert transformation after /upload/, keep versioning, swap extension to .jpg
    const parts = videoUrl.split('/upload/');
    if (parts.length !== 2) return null;
    const [prefix, rest] = parts;
    // Avoid double-transform
    const alreadyHasSo = rest.startsWith('so_');
    const body = alreadyHasSo ? rest : `so_1/${rest}`;
    const dot = body.lastIndexOf('.');
    const pathNoExt = dot !== -1 ? body.substring(0, dot) : body;
    return `${prefix}/upload/${pathNoExt}.jpg`;
  };

  const pickThumbnail = (mediaUrls: string[] | undefined): string | null => {
    if (!mediaUrls || mediaUrls.length === 0) return null;
    // Prefer first image if available
    const img = mediaUrls.find(u => !isVideoUrl(u));
    if (img) return img;
    // Otherwise derive from first video
    const vid = mediaUrls.find(u => isVideoUrl(u));
    if (vid) return deriveCloudinaryPoster(vid);
    return null;
  };

  if (!user) {
    // If the user is null, show a loading indicator
    return <View style={profileStyles.container}><ActivityIndicator /></View>;
  }

  const renderSightingGridItem = ({ item, index }: { item: Sighting; index: number }) => {
    const thumb = pickThumbnail(item.mediaUrls);
    return (
      <AnimatedGridItem
        thumb={thumb}
        index={index}
        onPress={() => handleSightingPress(index)}
      />
    );
  };

  // Activity feed item renderer
  const renderActivityItem = ({ item }: { item: ActivityItem }) => {
    const thumb = pickThumbnail(item.sighting.mediaUrls);
    const activityDate = new Date(item.activityDate);
    const timeAgo = getTimeAgo(activityDate);
    
    const handleActivityPress = () => {
      router.push({
        pathname: '/(user)/sighting_detail',
        params: { sightingId: item.sighting._id }
      });
    };
    
    return (
      <Pressable style={styles.activityItem} onPress={handleActivityPress}>
        <Image
          source={{ uri: thumb || undefined }}
          style={styles.activityThumbnail}
          defaultSource={{ uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' }}
        />
        <View style={styles.activityContent}>
          <View style={styles.activityHeader}>
            <View style={[
              styles.activityTypeBadge, 
              item.type === 'like' ? styles.activityTypeLike : styles.activityTypeComment
            ]}>
              <Icon 
                name={item.type === 'like' ? 'heart' : 'comment'} 
                size={10} 
                color={item.type === 'like' ? '#FF4444' : '#40743dff'} 
              />
              <Text style={[
                styles.activityTypeText,
                item.type === 'like' ? styles.activityTypeLikeText : styles.activityTypeCommentText
              ]}>
                {item.type === 'like' ? 'Liked' : 'Commented'}
              </Text>
            </View>
            <Text style={styles.activityTime}>{timeAgo}</Text>
          </View>
          
          <Text style={styles.activityCaption} numberOfLines={2}>
            {item.sighting.caption || item.sighting.aiIdentification || 'Wildlife sighting'}
          </Text>
          
          {item.type === 'comment' && item.commentText && (
            <View style={styles.activityCommentPreview}>
              <Icon name="quote-left" size={10} color="#999" />
              <Text style={styles.activityCommentText} numberOfLines={1}>
                {item.commentText}
              </Text>
            </View>
          )}
          
          <View style={styles.activityMeta}>
            <Text style={styles.activityUser}>
              @{item.sighting.user?.username || 'Unknown'}
            </Text>
            {item.sighting.animalId && (
              <Text style={styles.activityAnimal}>
                · {item.sighting.animalId.commonName}
              </Text>
            )}
          </View>
        </View>
        <Icon name="chevron-right" size={14} color="#ccc" />
      </Pressable>
    );
  };
  
  // Helper function for time ago
  const getTimeAgo = (date: Date): string => {
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleDeleteAccount = (): void => {
    setMenuVisible(false); // Close menu before showing alert
    Alert.alert(
      "Delete Account", "Are you sure? This is permanent.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete", style: "destructive", onPress: async () => {
            if (token && token !== 'local-admin-fake-token') {
              try {
                await apiDeleteUserAccount(token);
                alert("Account deleted successfully.");
                await logout();
              } catch (error: any) {
                alert(String(error.message || error));
              }
            } else {
              alert("This account cannot be deleted.");
            }
          },
        },
      ]
    );
  };

  const handleSightingPress = (index: number): void => {
    router.push({
      pathname: '/(user)/user_sighting',
      params: {
        sightings: JSON.stringify(sightings),
        // Pass the index instead of the ID
        initialIndex: index.toString(),
        isOwner: 'true',
      },
    });
  };

  const handleEdit = (): void => {
    setMenuVisible(false);
    router.navigate('/(user)/edit_profile' as any);
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

  const handleOpenNotificationSettings = (): void => {
    setMenuVisible(false);
    setNotificationModalVisible(true);
  };

  // Calculate unique species from sightings (filter out undefined/null)
  const speciesList = [...new Set(sightings.map(s => s.animalName).filter(Boolean))];
  const uniqueSpecies = speciesList.length;
  
  // Filter badges for display
  const earnedBadges = userBadges.filter(b => b.isEarned);

  return (
    <View style={profileStyles.container}>
      {/* Hero Header with Gradient */}
      <LinearGradient
        colors={['#40743dff', '#5a9a55', '#7FA37C']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroHeader}
      >
        {/* Top Bar */}
        <View style={styles.topBar}>
          <Text style={styles.heroTitle}>Profile</Text>
          <Pressable onPress={() => setMenuVisible(true)} style={styles.menuButton}>
            <Icon name="ellipsis-h" size={24} color="#fff" />
          </Pressable>
        </View>

        {/* Profile Info */}
        <View style={styles.profileInfoRow}>
          {/* Avatar */}
          <View style={styles.heroAvatarContainer}>
            {user.profilePictureUrl ? (
              <Image
                source={{ uri: user.profilePictureUrl }}
                style={styles.heroAvatar}
              />
            ) : (
              <View style={[styles.heroAvatar, { backgroundColor: "rgba(255,255,255,0.3)", alignItems: "center", justifyContent: "center" }]}>
                <Icon name="user" size={40} color="#fff" />
              </View>
            )}
            <View style={styles.heroVerifiedBadge}>
              <Icon name="check" size={12} color="#40743dff" />
            </View>
          </View>

          {/* Name and Bio */}
          <View style={styles.heroUserInfo}>
            <Text style={styles.heroUsername} numberOfLines={1}>{user.username}</Text>
            <Text style={styles.heroBio} numberOfLines={2}>{user.bio || "No bio yet"}</Text>
            
            {/* Level and XP Badge Row */}
            <View style={styles.levelXPContainer}>
              {levelInfo ? (
                <View style={[styles.levelBadge, { borderColor: getLevelColor(levelInfo.level) }]}>
                  <Text style={[styles.levelNumber, { color: getLevelColor(levelInfo.level) }]}>
                    Lv.{levelInfo.level}
                  </Text>
                </View>
              ) : (
                <View style={[styles.levelBadge, { borderColor: '#6B7280' }]}>
                  <Text style={[styles.levelNumber, { color: '#6B7280' }]}>Lv.1</Text>
                </View>
              )}
              <View style={styles.heroXPBadge}>
                <Icon name="star" size={12} color="#FFD700" />
                <Text style={styles.heroXPText}>{levelInfo?.currentXP ?? user.experiencePoints ?? 0} XP</Text>
              </View>
            </View>
            
            {/* Level Title */}
            <Text style={styles.levelTitle}>{levelInfo?.title || 'Novice Spotter'}</Text>
            
            {/* XP Progress Bar */}
            <View style={styles.xpProgressContainer}>
              <View style={styles.xpProgressBar}>
                <View 
                  style={[
                    styles.xpProgressFill, 
                    { 
                      width: `${Math.max(levelInfo?.progressPercentage || 0, 3)}%`,
                      backgroundColor: levelInfo ? getLevelColor(levelInfo.level) : '#6B7280'
                    }
                  ]} 
                />
              </View>
              <Text style={styles.xpProgressText}>
                {levelInfo ? `${levelInfo.xpInLevel}/${levelInfo.xpForNextLevel} to Lv.${levelInfo.level + 1}` : '0/100 to Lv.2'}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Pressable 
            style={styles.editButton}
            onPress={handleEdit}
          >
            <Icon name="pencil" size={14} color="#40743dff" />
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </Pressable>
          <Pressable 
            style={styles.shareIconButton}
            onPress={async () => {
              try {
                const profileUrl = `https://spotitnow.app/user/${user._id}`;
                await Share.share({
                  message: `Check out ${user.username}'s wildlife profile on SpotItNow! 🦊\n\nThey've spotted ${sightings.length} animals and counting!\n\n${profileUrl}`,
                  url: profileUrl,
                });
              } catch (error) {
                console.error('Error sharing profile:', error);
              }
            }}
          >
            <Icon name="share-alt" size={16} color="#fff" />
          </Pressable>
        </View>
      </LinearGradient>

      <FlatList
        style={profileStyles.profileContainer}
        ListHeaderComponent={
          <>
            {/* Interactive Stats Cards */}
            <View style={styles.statsRow}>
              <Pressable 
                style={[
                  styles.statCard, 
                  activeStatTab === 'species' && styles.statCardActive
                ]}
                onPress={() => setActiveStatTab(activeStatTab === 'species' ? null : 'species')}
              >
                <View style={[styles.statIconCircle, { backgroundColor: '#E8F5E9' }]}>
                  <Icon name="paw" size={18} color="#40743dff" />
                </View>
                <Text style={styles.statCardNumber}>{uniqueSpecies}</Text>
                <Text style={styles.statCardLabel}>Species</Text>
                <Icon 
                  name={activeStatTab === 'species' ? 'chevron-up' : 'chevron-down'} 
                  size={12} 
                  color="#999" 
                  style={styles.statChevron}
                />
              </Pressable>

              <Pressable 
                style={[
                  styles.statCard,
                  activeStatTab === 'badges' && styles.statCardActive
                ]}
                onPress={() => setActiveStatTab(activeStatTab === 'badges' ? null : 'badges')}
              >
                <View style={[styles.statIconCircle, { backgroundColor: '#E3F2FD' }]}>
                  <Icon name="trophy" size={18} color="#2196F3" />
                </View>
                <Text style={styles.statCardNumber}>{earnedBadges.length}</Text>
                <Text style={styles.statCardLabel}>Badges</Text>
                <Icon 
                  name={activeStatTab === 'badges' ? 'chevron-up' : 'chevron-down'} 
                  size={12} 
                  color="#999" 
                  style={styles.statChevron}
                />
              </Pressable>
            </View>

            {/* Expandable Stats Detail Panel */}
            {activeStatTab && (
              <View style={styles.statsDetailPanel}>
                {activeStatTab === 'species' && (
                  <>
                    <Text style={styles.panelTitle}>🐾 Discovered Species</Text>
                    <View style={styles.speciesList}>
                      {speciesList.map((species, index) => (
                        <View key={index} style={styles.speciesItem}>
                          <Icon name="check-circle" size={14} color="#40743dff" />
                          <Text style={styles.speciesName}>{species}</Text>
                        </View>
                      ))}
                      {uniqueSpecies === 0 && (
                        <Text style={styles.emptyText}>No species discovered yet. Start exploring!</Text>
                      )}
                    </View>
                  </>
                )}

                {activeStatTab === 'badges' && (
                  <View style={styles.badgesContainer}>
                    {badgesLoading ? (
                      <View style={{ padding: 20, alignItems: 'center' }}>
                        <ActivityIndicator color="#40743dff" />
                        <Text style={{ marginTop: 8, color: '#666' }}>Loading badges...</Text>
                      </View>
                    ) : (
                      <>
                        <View style={styles.badgesTabs}>
                          <Pressable 
                            style={[styles.badgesTab, badgeFilter === 'all' && styles.badgesTabActive]}
                            onPress={() => setBadgeFilter('all')}
                          >
                            <Text style={[styles.badgesTabText, badgeFilter === 'all' && styles.badgesTabTextActive]}>All ({userBadges.length})</Text>
                          </Pressable>
                          <Pressable 
                            style={[styles.badgesTab, badgeFilter === 'earned' && styles.badgesTabActive]}
                            onPress={() => setBadgeFilter('earned')}
                          >
                            <Text style={[styles.badgesTabText, badgeFilter === 'earned' && styles.badgesTabTextActive]}>Earned ({earnedBadges.length})</Text>
                          </Pressable>
                        </View>
                        
                        <View style={styles.badgesGrid}>
                          {(badgeFilter === 'all' ? userBadges : earnedBadges).map((badge) => (
                            <Pressable 
                              key={badge._id} 
                              style={styles.badgeGridItem}
                              onPress={() => setSelectedBadge(badge)}
                            >
                              <View style={[
                                styles.badgeCircle,
                                !badge.isEarned && styles.badgeCircleLocked,
                                badge.isEarned && { borderColor: getBadgeCategoryColor(badge.category), borderWidth: 2 }
                              ]}>
                                <Icon 
                                  name={getBadgeIcon(badge)} 
                                  size={24} 
                                  color={badge.isEarned ? getBadgeCategoryColor(badge.category) : '#bbb'} 
                                />
                                {!badge.isEarned && (
                                  <View style={{ position: 'absolute', bottom: -2, right: -2 }}>
                                    <Icon name="lock" size={12} color="#999" />
                                  </View>
                                )}
                              </View>
                              <Text 
                                style={[
                                  styles.badgeGridName,
                                  !badge.isEarned && styles.badgeGridNameLocked
                                ]}
                                numberOfLines={2}
                              >
                                {badge.name}
                              </Text>
                              {/* Progress bar for unearned badges */}
                              {!badge.isEarned && badge.progress > 0 && (
                                <View style={{ width: '100%', height: 3, backgroundColor: '#eee', borderRadius: 2, marginTop: 4 }}>
                                  <View style={{ width: `${badge.progress}%`, height: '100%', backgroundColor: getBadgeCategoryColor(badge.category), borderRadius: 2 }} />
                                </View>
                              )}
                            </Pressable>
                          ))}
                        </View>
                        
                        {badgeSummary && (
                          <Text style={{ fontSize: 12, color: '#666', textAlign: 'center', marginTop: 8 }}>
                            {badgeSummary.earnedCount} of {badgeSummary.totalBadges} badges earned • {badgeSummary.totalXPFromBadges} XP from badges
                          </Text>
                        )}
                      </>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* Profile/Activity Tab Switcher */}
            <View style={styles.profileTabContainer}>
              <View style={styles.profileTabBar}>
                <Pressable 
                  style={[styles.profileTabButton, profileTab === 'profile' && styles.profileTabButtonActive]}
                  onPress={() => setProfileTab('profile')}
                >
                  <Icon name="th" size={16} color={profileTab === 'profile' ? '#40743dff' : '#999'} />
                  <Text style={[styles.profileTabText, profileTab === 'profile' && styles.profileTabTextActive]}>Posts</Text>
                </Pressable>
                <Pressable 
                  style={[styles.profileTabButton, profileTab === 'activity' && styles.profileTabButtonActive]}
                  onPress={() => setProfileTab('activity')}
                >
                  <Icon name="heart" size={16} color={profileTab === 'activity' ? '#40743dff' : '#999'} />
                  <Text style={[styles.profileTabText, profileTab === 'activity' && styles.profileTabTextActive]}>Activity</Text>
                </Pressable>
              </View>
              <Animated.View 
                style={[
                  styles.profileTabIndicator,
                  {
                    transform: [{
                      translateX: tabIndicatorAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, (SCREEN_WIDTH - 32) / 2]
                      })
                    }]
                  }
                ]} 
              />
            </View>
          </>
        }
        data={profileTab === 'profile' ? sightings : []}
        renderItem={renderSightingGridItem}
        keyExtractor={(item) => item._id}
        numColumns={3}
        columnWrapperStyle={profileStyles.gridRow}
        refreshControl={
          profileTab === 'activity' ? (
            <RefreshControl
              refreshing={activityRefreshing}
              onRefresh={handleActivityRefresh}
              tintColor="#40743dff"
              colors={['#40743dff']}
            />
          ) : undefined
        }
        ListEmptyComponent={
          profileTab === 'profile'
            ? (isLoading ? <ActivityIndicator style={{ marginTop: 20 }} /> : <Text style={profileStyles.emptyListText}>No sightings found.</Text>)
            : null
        }
        ListFooterComponent={
          profileTab === 'activity' ? (
            <FlatList
              data={activityFeed}
              renderItem={renderActivityItem}
              keyExtractor={(item) => `${item.type}-${item.sighting._id}-${item.activityDate}`}
              scrollEnabled={false}
              ListEmptyComponent={
                activityLoading 
                  ? <ActivityIndicator style={{ marginTop: 20 }} /> 
                  : <Text style={profileStyles.emptyListText}>No activity yet. Like or comment on posts!</Text>
              }
              ListFooterComponent={
                hasMoreActivity && activityFeed.length > 0 ? (
                  <Pressable 
                    style={styles.loadMoreButton}
                    onPress={() => loadActivityFeed(activityPage + 1, true)}
                  >
                    <Text style={styles.loadMoreText}>Load More</Text>
                  </Pressable>
                ) : null
              }
            />
          ) : null
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      />

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable style={profileStyles.menuOverlay} onPress={() => setMenuVisible(false)}>
          <View style={profileStyles.menuContainer}>
            <Pressable style={profileStyles.menuItem} onPress={handleEdit}>
              <Text style={profileStyles.menuText}>Edit Profile</Text>
            </Pressable>

            {user.role === "admin" && (
              <>
                <Pressable style={profileStyles.menuItem} onPress={() => { router.push('/(admin)/admin'); setMenuVisible(false); }}>
                  <Text style={profileStyles.menuText}>Admin Page</Text>
                </Pressable>
    
              </>
            )}

            <Pressable style={profileStyles.menuItem} onPress={() => { router.push('/(user)/challenges'); setMenuVisible(false); }}>
              <Text style={profileStyles.menuText}>Today's Challenges</Text>
            </Pressable>

            <Pressable style={profileStyles.menuItem} onPress={handleOpenNotificationSettings}>
              <Text style={profileStyles.menuText}>Notification Settings</Text>
            </Pressable>

            <Pressable style={profileStyles.menuItem} onPress={() => { logout(); }}>
              <Text style={profileStyles.menuText}>Logout</Text>
            </Pressable>
            <Pressable style={[profileStyles.menuItem, { borderTopWidth: 1, borderColor: '#eee' }]} onPress={handleDeleteAccount}>
              <Text style={[profileStyles.menuText, { color: 'red' }]}>Delete Account</Text>
            </Pressable>
            <Pressable style={profileStyles.menuItem} onPress={() => setMenuVisible(false)}>
              <Text style={profileStyles.menuText}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Notification Settings Modal */}
      <Modal
        visible={notificationModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setNotificationModalVisible(false)}
      >
        <Pressable 
          style={profileStyles.menuOverlay} 
          onPress={() => setNotificationModalVisible(false)}
        >
          <Pressable 
            style={[profileStyles.menuContainer, { padding: 20, width: '85%', maxWidth: 400 }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[profileStyles.sectionTitle, { marginBottom: 20 }]}>
              Notification Settings
            </Text>
            
            <View style={{ 
              flexDirection: 'row', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              paddingVertical: 15,
              borderBottomWidth: 1,
              borderBottomColor: '#eee'
            }}>
              <View style={{ flex: 1, marginRight: 15 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 5 }}>
                  Push Notifications
                </Text>
                <Text style={{ fontSize: 13, color: '#666' }}>
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

            <Pressable 
              style={[profileStyles.menuItem, { marginTop: 20 }]} 
              onPress={() => setNotificationModalVisible(false)}
            >
              <Text style={profileStyles.menuText}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Badge Detail Modal */}
      <Modal
        visible={selectedBadge !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedBadge(null)}
      >
        <Pressable 
          style={styles.badgeModalOverlay} 
          onPress={() => setSelectedBadge(null)}
        >
          <Pressable 
            style={styles.badgeModalContent}
            onPress={(e) => e.stopPropagation()}
          >
            {selectedBadge && (
              <>
                <View style={[
                  styles.badgeModalIcon,
                  selectedBadge.isEarned ? styles.badgeModalIconEarned : styles.badgeModalIconLocked,
                  selectedBadge.isEarned && { borderColor: getBadgeCategoryColor(selectedBadge.category) }
                ]}>
                  <Icon 
                    name={getBadgeIcon(selectedBadge)} 
                    size={40} 
                    color={selectedBadge.isEarned ? getBadgeCategoryColor(selectedBadge.category) : '#999'} 
                  />
                </View>
                
                <Text style={styles.badgeModalTitle}>{selectedBadge.name}</Text>
                
                {/* XP Reward */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Icon name="star" size={14} color="#FFD700" />
                  <Text style={{ marginLeft: 4, color: '#666', fontWeight: '600' }}>
                    +{selectedBadge.xpReward} XP
                  </Text>
                </View>
                
                <View style={[
                  styles.badgeModalStatus,
                  selectedBadge.isEarned ? styles.badgeModalStatusEarned : styles.badgeModalStatusLocked
                ]}>
                  <Icon 
                    name={selectedBadge.isEarned ? 'check-circle' : 'lock'} 
                    size={14} 
                    color={selectedBadge.isEarned ? '#40743dff' : '#999'} 
                  />
                  <Text style={[
                    styles.badgeModalStatusText,
                    selectedBadge.isEarned && styles.badgeModalStatusTextEarned
                  ]}>
                    {selectedBadge.isEarned ? 'Earned!' : 'Locked'}
                  </Text>
                </View>
                
                {/* Progress bar for unearned badges */}
                {!selectedBadge.isEarned && (
                  <View style={{ width: '100%', marginVertical: 12 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontSize: 12, color: '#666' }}>Progress</Text>
                      <Text style={{ fontSize: 12, color: '#666', fontWeight: '600' }}>
                        {selectedBadge.current}/{selectedBadge.threshold}
                      </Text>
                    </View>
                    <View style={{ width: '100%', height: 8, backgroundColor: '#eee', borderRadius: 4 }}>
                      <View style={{ 
                        width: `${selectedBadge.progress}%`, 
                        height: '100%', 
                        backgroundColor: getBadgeCategoryColor(selectedBadge.category), 
                        borderRadius: 4 
                      }} />
                    </View>
                  </View>
                )}
                
                <Text style={styles.badgeModalRequirement}>
                  {selectedBadge.isEarned ? 'You completed this achievement:' : 'Requirement:'}
                </Text>
                <Text style={styles.badgeModalDescription}>
                  {selectedBadge.description}
                </Text>
                
                <Pressable 
                  style={styles.badgeModalClose}
                  onPress={() => setSelectedBadge(null)}
                >
                  <Text style={styles.badgeModalCloseText}>Close</Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  heroHeader: {
    width: '100%',
    paddingTop: 60,
    paddingBottom: 28,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  heroAvatarContainer: {
    position: 'relative',
    marginRight: 16,
    flexShrink: 0,
  },
  heroAvatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: '#fff',
  },
  heroVerifiedBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#40743dff',
  },
  heroUserInfo: {
    flex: 1,
    flexShrink: 1,
  },
  heroUsername: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  heroBio: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 10,
    lineHeight: 20,
  },
  levelXPContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  levelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  levelNumber: {
    fontSize: 13,
    fontWeight: '700',
  },
  levelTitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontStyle: 'italic',
  },
  xpProgressContainer: {
    marginTop: 10,
    width: '100%',
  },
  xpProgressBar: {
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  xpProgressFill: {
    height: '100%',
    borderRadius: 4,
    minWidth: 4,
  },
  xpProgressText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 5,
    fontWeight: '500',
  },
  heroXPBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 6,
  },
  heroXPText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  editButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#40743dff',
  },
  shareIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    marginTop: -12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  statCardActive: {
    borderWidth: 2,
    borderColor: '#40743dff',
  },
  statIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statCardNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginBottom: 2,
  },
  statCardLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  statChevron: {
    marginTop: 6,
  },
  statsDetailPanel: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  speciesList: {
    gap: 8,
  },
  speciesItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  speciesName: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  miniStatItem: {
    width: '47%',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  miniStatNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#40743dff',
    marginBottom: 4,
  },
  miniStatLabel: {
    fontSize: 12,
    color: '#666',
  },
  badgesContainer: {
    gap: 16,
  },
  badgesTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  badgesTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  badgesTabActive: {
    backgroundColor: '#40743dff',
  },
  badgesTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  badgesTabTextActive: {
    color: '#fff',
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  badgeGridItem: {
    width: (SCREEN_WIDTH - 32 - 36) / 4,
    alignItems: 'center',
  },
  badgeCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    borderWidth: 2,
    borderColor: '#40743dff',
  },
  badgeCircleLocked: {
    backgroundColor: '#f5f5f5',
    borderColor: '#ddd',
  },
  badgeGridName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  badgeGridNameLocked: {
    color: '#999',
  },
  badgesList: {
    gap: 10,
  },
  badgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  badgeItemLocked: {
    opacity: 0.6,
  },
  badgeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeIconLocked: {
    backgroundColor: '#f0f0f0',
  },
  badgeInfo: {
    flex: 1,
  },
  badgeName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  badgeNameLocked: {
    color: '#999',
  },
  badgeDescription: {
    fontSize: 12,
    color: '#666',
  },
  badgeProgress: {
    fontSize: 11,
    color: '#40743dff',
    fontWeight: '600',
    marginTop: 4,
  },
  badgeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  badgeModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  badgeModalIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 3,
  },
  badgeModalIconEarned: {
    backgroundColor: '#E8F5E9',
    borderColor: '#40743dff',
  },
  badgeModalIconLocked: {
    backgroundColor: '#f5f5f5',
    borderColor: '#ddd',
  },
  badgeModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  badgeModalStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
    marginBottom: 16,
  },
  badgeModalStatusEarned: {
    backgroundColor: '#E8F5E9',
  },
  badgeModalStatusLocked: {
    backgroundColor: '#f5f5f5',
  },
  badgeModalStatusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
  },
  badgeModalStatusTextEarned: {
    color: '#40743dff',
  },
  badgeModalRequirement: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  badgeModalDescription: {
    fontSize: 15,
    color: '#333',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  badgeModalClose: {
    backgroundColor: '#40743dff',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
  badgeModalCloseText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  // Profile/Activity Tab Styles
  profileTabContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
  },
  profileTabBar: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 4,
  },
  profileTabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
    borderRadius: 10,
  },
  profileTabButtonActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  profileTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
  },
  profileTabTextActive: {
    color: '#40743dff',
  },
  profileTabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 4,
    width: '48%',
    height: 3,
    backgroundColor: '#40743dff',
    borderRadius: 2,
    display: 'none', // Hidden since we use background for active state
  },
  // Activity Item Styles
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  activityThumbnail: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
  },
  activityContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  activityTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  activityTypeLike: {
    backgroundColor: '#FFEBEE',
  },
  activityTypeComment: {
    backgroundColor: '#E8F5E9',
  },
  activityTypeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  activityTypeLikeText: {
    color: '#FF4444',
  },
  activityTypeCommentText: {
    color: '#40743dff',
  },
  activityTime: {
    fontSize: 11,
    color: '#999',
  },
  activityCaption: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
    lineHeight: 18,
  },
  activityCommentPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 4,
  },
  activityCommentText: {
    flex: 1,
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  activityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityUser: {
    fontSize: 12,
    color: '#40743dff',
    fontWeight: '500',
  },
  activityAnimal: {
    fontSize: 12,
    color: '#999',
    marginLeft: 4,
  },
  loadMoreButton: {
    alignSelf: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 12,
    marginBottom: 8,
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#40743dff',
  },
});
