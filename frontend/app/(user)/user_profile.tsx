import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { profileStyles } from '../../constants/ProfileStyles';
import { useAuth } from '../../context/AuthContext';
import Icon from 'react-native-vector-icons/FontAwesome';
import { apiGetSightingsByUser } from '../../api/sighting';
import {
  apiGetBioByUserId,
  apiGetExperienceByUserId,
  apiGetProfilePictureByUserId,
  apiGetUsernameByUserId,
} from '../../api/user';
import { apiGetFollowCounts, apiGetFollowers, apiToggleFollow } from '../../api/follow';

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
        const [u, p, b, e, s, counts, followers] = await Promise.all([
          username ? Promise.resolve({ data: { username } }) : apiGetUsernameByUserId(targetUserId),
          profilePictureUrl ? Promise.resolve({ data: { profilePictureUrl } }) : apiGetProfilePictureByUserId(targetUserId),
          apiGetBioByUserId(targetUserId),
          apiGetExperienceByUserId(targetUserId),
          apiGetSightingsByUser(targetUserId),
          apiGetFollowCounts(targetUserId),
          apiGetFollowers(targetUserId),
        ]);

        if (cancelled) return;
        setUsername(u?.data?.username || username || '');
        setProfilePictureUrl(p?.data?.profilePictureUrl || profilePictureUrl || '');
        setBio(b?.data?.bio || '');
        setExperiencePoints(Number(e?.data?.experiencePoints || 0));
        setSightings(s?.data || []);
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
    router.push({
      pathname: '/(user)/user_sighting',
      params: {
        sightings: JSON.stringify(sightings),
        initialIndex: String(index),
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
    <View style={profileStyles.container}>
      <View style={profileStyles.header}>
        <Pressable onPress={() => router.back()}>
          <Icon name="chevron-left" size={24} color="#333" />
        </Pressable>
        <Text style={profileStyles.screenTitle} numberOfLines={1}>{username || 'Profile'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={profileStyles.profileContainer}>
        <View style={profileStyles.infoContainer}>
          {profilePictureUrl ? (
            <Image source={{ uri: profilePictureUrl }} style={profileStyles.avatar} />
          ) : (
            <View style={[profileStyles.avatar, { backgroundColor: '#ddd', alignItems: 'center', justifyContent: 'center' }]}>
              <Text>No Image</Text>
            </View>
          )}
          <View style={profileStyles.rightContainer}>
            <Text style={profileStyles.userInfo}>{username}</Text>
            <Text style={profileStyles.userInfo}>Bio: {bio || 'N/A'}</Text>
            <Text style={profileStyles.userInfo}>Experience Points: {experiencePoints}</Text>
            <Text style={profileStyles.userInfo}>Followers: {followersCount} • Following: {followingCount}</Text>
            {currentUser?._id !== targetUserId && (
              <Pressable
                onPress={handleFollowToggle}
                style={{ marginTop: 8, backgroundColor: isFollowing ? '#333' : '#28a745', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 }}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>{isFollowing ? 'Following' : 'Follow'}</Text>
              </Pressable>
            )}
          </View>
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 20 }} />)
          : (
          <FlatList
            nestedScrollEnabled
            scrollEnabled={false}
            data={sightings}
            keyExtractor={(item) => item._id}
            numColumns={3}
            renderItem={({ item, index }) => (
              <Pressable style={profileStyles.sightingGridItem} onPress={() => handleSightingPress(index)}>
                <Image source={{ uri: item.mediaUrls?.[0] }} style={profileStyles.sightingGridImage} />
              </Pressable>
            )}
            ListEmptyComponent={<Text style={profileStyles.emptyListText}>No sightings with images found.</Text>}
            contentContainerStyle={{ paddingBottom: 32 }}
          />
        )}
      </ScrollView>
    </View>
  );
}
