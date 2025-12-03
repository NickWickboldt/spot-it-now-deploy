import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, Image, Platform, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { apiGetFollowCounts, apiGetFollowers, apiToggleFollow } from '../../api/follow';
import { apiGetMySightings, apiGetSightingsByUser } from '../../api/sighting';
import {
    apiGetBioByUserId,
    apiGetExperienceByUserId,
    apiGetProfilePictureByUserId,
    apiGetUsernameByUserId,
} from '../../api/user';
import { Colors } from '../../constants/Colors';
import { profileStyles } from '../../constants/ProfileStyles';
import { useAuth } from '../../context/AuthContext';

const SCREEN_WIDTH = Dimensions.get('window').width;

type Sighting = {
  _id: string;
  caption: string;
  createdAt: string;
  mediaUrls: string[];
  userName: string;
};

export default function OtherUserProfile(): React.JSX.Element | null {
  const router = useRouter();
  const { user: currentUser, token } = useAuth();
  const params = useLocalSearchParams<{
    userId?: string;
    username?: string;
    profilePictureUrl?: string;
  }>();

  const targetUserId = useMemo(() => (params.userId ? String(params.userId) : ''), [params.userId]);
  const [username, setUsername] = useState<string>(params.username ? String(params.username) : '');
  const [bio, setBio] = useState<string>('');
  const [profilePictureUrl, setProfilePictureUrl] = useState<string>(params.profilePictureUrl ? String(params.profilePictureUrl) : '');
  const [experiencePoints, setExperiencePoints] = useState<number>(0);
  const [followersCount, setFollowersCount] = useState<number>(0);
  const [followingCount, setFollowingCount] = useState<number>(0);
  const [isFollowing, setIsFollowing] = useState<boolean>(false);

  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!targetUserId) return;
      setLoading(true);
      try {
        // Fire off parallel fetches for public profile info
        const isOwner = currentUser?._id && String(currentUser._id) === String(targetUserId);
        const [u, p, b, e, s, counts, followers] = await Promise.all([
          username ? Promise.resolve({ data: { username } }) : apiGetUsernameByUserId(targetUserId),
          profilePictureUrl ? Promise.resolve({ data: { profilePictureUrl } }) : apiGetProfilePictureByUserId(targetUserId),
          apiGetBioByUserId(targetUserId),
          apiGetExperienceByUserId(targetUserId),
          (isOwner && token && token !== 'local-admin-fake-token') ? apiGetMySightings(token) : apiGetSightingsByUser(targetUserId),
          apiGetFollowCounts(targetUserId),
          apiGetFollowers(targetUserId),
        ]);

        if (cancelled) return;
        setUsername(u?.data?.username || username || '');
        setProfilePictureUrl(p?.data?.profilePictureUrl || profilePictureUrl || '');
        setBio(b?.data?.bio || '');
        setExperiencePoints(Number(e?.data?.experiencePoints || 0));
        const raw = Array.isArray(s?.data) ? s.data : [];
        // Ensure each sighting carries a user id for ownership checks downstream
        setSightings(raw.map((doc: any) => ({
          ...doc,
          user: doc?.user ?? targetUserId,
        })));
        setFollowersCount(Number(counts?.data?.followersCount || 0));
        setFollowingCount(Number(counts?.data?.followingCount || 0));
        // Determine if current user follows target user
        const followersArr = Array.isArray(followers?.data) ? followers.data : [];
        const followerIds = followersArr.map((f: any) => f?.follower?._id).filter(Boolean);
        setIsFollowing(currentUser?._id ? followerIds.includes(currentUser._id) : false);
      } catch (err) {
        console.error('Failed to load user profile', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [targetUserId]);

  const handleFollowToggle = async () => {
    if (!token || !targetUserId) return;
    try {
      const resp = await apiToggleFollow(token, targetUserId);
      const nowFollowing = !!resp?.data?.isFollowing;
      setIsFollowing(nowFollowing);
      // update counts locally
      setFollowersCount((c) => c + (nowFollowing ? 1 : -1));
    } catch (e) {
      console.error('Follow toggle failed', e);
    }
  };

  const handleSightingPress = (index: number) => {
    const isOwner = currentUser?._id && String(currentUser._id) === String(targetUserId);
    router.push({
      pathname: '/(user)/user_sighting',
      params: {
        sightings: JSON.stringify(sightings),
        initialIndex: String(index),
        isOwner: String(!!isOwner),
      },
    });
  };

  if (!targetUserId) {
    return (
      <View style={[profileStyles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text>Invalid user</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Hero Header with Gradient */}
      <LinearGradient
        colors={['#40743dff', '#5a9a55', '#7FA37C']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroHeader}
      >
        {/* Top Bar */}
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Icon name="chevron-left" size={18} color="#fff" />
          </Pressable>
          <Text style={styles.heroTitle} numberOfLines={1}>{username || 'Profile'}</Text>
          <Pressable 
            style={styles.menuButton}
            onPress={async () => {
              try {
                await Share.share({
                  message: `Check out ${username}'s wildlife profile on SpotItNow! 🦊`,
                });
              } catch (error) {
                console.error('Error sharing profile:', error);
              }
            }}
          >
            <Icon name="share-alt" size={16} color="#fff" />
          </Pressable>
        </View>

        {/* Profile Info */}
        <View style={styles.profileInfoRow}>
          {/* Avatar */}
          <View style={styles.heroAvatarContainer}>
            {profilePictureUrl ? (
              <Image source={{ uri: profilePictureUrl }} style={styles.heroAvatar} />
            ) : (
              <View style={[styles.heroAvatar, { backgroundColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' }]}>
                <Icon name="user" size={36} color="#fff" />
              </View>
            )}
          </View>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{sightings.length}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{followersCount}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{followingCount}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </View>
          </View>
        </View>

        {/* Bio */}
        <View style={styles.bioSection}>
          <Text style={styles.bioText} numberOfLines={2}>{bio || 'No bio yet'}</Text>
          <View style={styles.xpBadge}>
            <Icon name="star" size={12} color="#FFD700" />
            <Text style={styles.xpText}>{experiencePoints} XP</Text>
          </View>
        </View>

        {/* Follow Button */}
        {currentUser?._id !== targetUserId && (
          <Pressable 
            onPress={handleFollowToggle}
            style={[styles.followButton, isFollowing && styles.followingButton]}
          >
            <Icon name={isFollowing ? 'check' : 'user-plus'} size={14} color={isFollowing ? '#40743dff' : '#fff'} />
            <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
              {isFollowing ? 'Following' : 'Follow'}
            </Text>
          </Pressable>
        )}
      </LinearGradient>

      {/* Sightings Grid */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.primaryGreen} />
        </View>
      ) : (
        <FlatList
          data={sightings}
          keyExtractor={(item) => item._id}
          numColumns={3}
          contentContainerStyle={styles.gridContainer}
          renderItem={({ item, index }) => (
            <Pressable style={styles.gridItem} onPress={() => handleSightingPress(index)}>
              <Image source={{ uri: item.mediaUrls?.[0] }} style={styles.gridImage} />
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="camera" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No sightings yet</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.softBeige,
  },
  heroHeader: {
    paddingTop: Platform.OS === 'ios' ? 60 : (StatusBar.currentHeight || 0) + 20,
    paddingHorizontal: 20,
    paddingBottom: 24,
    width: '100%',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroAvatarContainer: {
    marginRight: 20,
  },
  heroAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#fff',
  },
  statsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  bioSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  bioText: {
    flex: 1,
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 20,
    marginRight: 12,
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  xpText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  followingButton: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  followButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  followingButtonText: {
    color: '#40743dff',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridContainer: {
    padding: 2,
  },
  gridItem: {
    width: (SCREEN_WIDTH - 6) / 3,
    aspectRatio: 1,
    padding: 1,
  },
  gridImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#eee',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
});
