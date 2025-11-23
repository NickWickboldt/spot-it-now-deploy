import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Modal, Pressable, Switch, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { apiGetMySightings } from '../../api/sighting'; // Use authenticated endpoint to get all sightings
import { apiDeleteUserAccount, apiUpdateUserDetails } from '../../api/user';
import { profileStyles } from '../../constants/ProfileStyles';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../hooks/useNotification';

type Sighting = {
  _id: string;
  caption: string;
  createdAt: string; // Changed from timestamp
  mediaUrls: string[];
  userName: string;
  // Add other fields from your response if you need them
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

  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sync notification state with user data
  useEffect(() => {
    if (user?.notificationsEnabled !== undefined) {
      setNotificationsEnabled(user.notificationsEnabled);
    }
  }, [user?.notificationsEnabled]);

  const loadMySightings = useCallback(async () => {
    if (!user?._id || !token) { setIsLoading(false); return; }
    try {
      const response: ApiResponse = await apiGetMySightings(token);
      console.log('API Response:', JSON.stringify(response, null, 2));
      if (response && response.data) {
        const raw = Array.isArray(response.data) ? response.data : [];
        console.log('Raw sightings:', raw.length, 'items');
        console.log('First sighting:', raw[0]);
        // Enrich sightings with user data for the detail view
        const enriched = raw.map((doc: any) => ({ 
          ...doc, 
          user: doc?.user ?? user._id,
          userName: user.username,
          userProfilePictureUrl: user.profilePictureUrl,
          likes: doc.likes || 0
        }));
        console.log('Enriched first sighting:', enriched[0]);
        setSightings(enriched);
      }
    } catch (error) {
      console.error("Failed to fetch sightings:", error);
      alert("Could not load your sightings.");
    } finally {
      setIsLoading(false);
    }
  }, [user?._id, user?.username, user?.profilePictureUrl, token]);

  useEffect(() => { loadMySightings(); }, [loadMySightings]);
  useFocusEffect(useCallback(() => { loadMySightings(); return () => {}; }, [loadMySightings]));

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
    console.log(`Sighting ${index}:`, {
      id: item._id,
      mediaUrls: item.mediaUrls,
      thumbnail: thumb
    });
    return (
      <Pressable
        style={profileStyles.sightingGridItem}
        onPress={() => handleSightingPress(index)}
      >
        {thumb ? (
          <Image
            source={{ uri: thumb }}
            style={profileStyles.sightingGridImage}
            resizeMode="cover"
            onError={(e) => console.log('Image load error:', e.nativeEvent.error)}
            onLoad={() => console.log('Image loaded successfully:', thumb)}
          />
        ) : (
          <View style={[profileStyles.sightingGridImage, { backgroundColor: '#ddd', alignItems: 'center', justifyContent: 'center' }]}>
            <Text>No preview</Text>
          </View>
        )}
      </Pressable>
    );
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
    router.push('/edit_profile'); // Navigate to the new edit screen
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

  return (
    <View style={profileStyles.container}>
      <View style={profileStyles.header}>
        <Text style={profileStyles.screenTitle}>Profile</Text>
        <Pressable onPress={() => setMenuVisible(true)}>
          <Icon name="ellipsis-h" size={32} color="#333" />
        </Pressable>
      </View>

      <FlatList
        style={profileStyles.profileContainer}
        ListHeaderComponent={
          <>
            {/* Profile Info Section */}
            <View style={profileStyles.profileHeader}>
              {/* Profile Picture with Grid Overlay */}
              <View style={profileStyles.avatarContainer}>
                {user.profilePictureUrl ? (
                  <Image
                    source={{ uri: user.profilePictureUrl }}
                    style={profileStyles.avatar}
                  />
                ) : (
                  <View style={[profileStyles.avatar, { backgroundColor: "#ddd", alignItems: "center", justifyContent: "center" }]}>
                    <Icon name="user" size={40} color="#999" />
                  </View>
                )}
                {/* Green checkmark badge */}
                <View style={profileStyles.verifiedBadge}>
                  <Icon name="check" size={12} color="#fff" />
                </View>
              </View>

              {/* User Info */}
              <View style={profileStyles.userInfoContainer}>
                <Text style={profileStyles.username}>{user.username}</Text>
                <Text style={profileStyles.bio}>Bio: {user.bio || "No bio yet"}</Text>
                
                {/* Experience and Role Badges */}
                <View style={profileStyles.badgesRow}>
                  <View style={profileStyles.badge}>
                    <Icon name="star" size={14} color="#666" />
                    <Text style={profileStyles.badgeText}>Experience Points: {user.experiencePoints}</Text>
                  </View>
                  <View style={profileStyles.badge}>
                    <Icon name="leaf" size={14} color="#666" />
                    <Text style={profileStyles.badgeText}>Wildlife Enthusiast</Text>
                  </View>
                </View>

                {/* Share Button */}
                <Pressable style={profileStyles.shareButton}>
                  <Icon name="share-alt" size={14} color="#333" />
                  <Text style={profileStyles.shareButtonText}>Share</Text>
                </Pressable>
              </View>
            </View>

            {/* Stats Section */}
            <View style={profileStyles.statsContainer}>
              <View style={profileStyles.statItem}>
                <Text style={profileStyles.statNumber}>{sightings.length}</Text>
                <Text style={profileStyles.statLabel}>Sightings</Text>
              </View>
              <View style={profileStyles.statDivider} />
              <View style={profileStyles.statItem}>
                <Text style={profileStyles.statNumber}>14</Text>
                <Text style={profileStyles.statLabel}>Species</Text>
              </View>
              <View style={profileStyles.statDivider} />
              <View style={profileStyles.statItem}>
                <Text style={profileStyles.statNumber}>3</Text>
                <Text style={profileStyles.statLabel}>Badges</Text>
              </View>
            </View>

            {/* Recent Sightings Header */}
            <View style={profileStyles.sectionHeader}>
              <Text style={profileStyles.sectionTitle}>Recent Sightings</Text>
              <Pressable onPress={() => {}}>
                <Text style={profileStyles.seeAllText}>See All</Text>
              </Pressable>
            </View>
          </>
        }
        data={sightings}
        renderItem={renderSightingGridItem}
        keyExtractor={(item) => item._id}
        numColumns={3}
        columnWrapperStyle={profileStyles.gridRow}
        ListEmptyComponent={
          isLoading ? <ActivityIndicator style={{ marginTop: 20 }} /> : <Text style={profileStyles.emptyListText}>No sightings found.</Text>
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
    </View>
  );
}
