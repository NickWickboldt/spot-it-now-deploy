// ==================================================================
// File: app/manage-users.tsx
// ==================================================================
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, FlatList, Image, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { apiAdminDeleteUser, apiAdminForceLogoutUser, apiAdminGetAllUsers, apiAdminGetUser, apiAdminPromoteUser, apiAdminUpdateUser, apiGetUserBio, apiGetUserExperience, apiGetUserProfilePicture } from '../../api/admin';
import { setBaseUrl } from '../../api/client';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

export default function ManageUsersScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserDetails, setSelectedUserDetails] = useState<any>(null);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editProfilePictureUrl, setEditProfilePictureUrl] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editExperience, setEditExperience] = useState<number | null>(null);
  const [editLatitude, setEditLatitude] = useState<number | null>(null);
  const [editLongitude, setEditLongitude] = useState<number | null>(null);
  const [editRadius, setEditRadius] = useState<number | null>(null);

  // Sort users by earliest substring match in username or email (case-insensitive)
  const sortUsersByQuery = (list: any[], q: string) => {
    const ql = q.toLowerCase();
    const score = (u: any) => {
      const username = (u.username || '').toString().toLowerCase();
      const email = (u.email || '').toString().toLowerCase();
      const idxUser = username.indexOf(ql);
      const idxEmail = email.indexOf(ql);
      const best = Math.min(idxUser === -1 ? Infinity : idxUser, idxEmail === -1 ? Infinity : idxEmail);
      return best === Infinity ? Number.MAX_SAFE_INTEGER : best;
    };
    return [...list].sort((a, b) => {
      const sa = score(a);
      const sb = score(b);
      if (sa !== sb) return sa - sb;
      return (a.username || '').localeCompare(b.username || '');
    });
  };

  const fetchUsers = async (opts: { page?: number; q?: string } = {}) => {
    if (!token) {
        setError("Cannot fetch users with local admin credentials. Please use a real admin account.");
        setIsLoading(false);
        return;
    };
    const p = opts.page ?? page;
    const q = opts.q ?? query;
    try {
      setError(null);
      const response = await apiAdminGetAllUsers(token, p, pageSize, q);
      // response.data is either { items, total, page, pageSize } or legacy array
      const payload = response.data;
      if (Array.isArray(payload)) {
        setUsers(payload);
        setTotal(payload.length);
      } else {
        setUsers(payload.items || []);
        setTotal(payload.total || 0);
        setPage(payload.page || p);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to fetch users.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const openUserDetails = async (userId: string, base?: any) => {
    setSelectedUserId(userId);
    setSelectedUserDetails(null);
    setIsDetailsLoading(true);
    setIsEditMode(false);
    if (base) {
      setEditUsername(base.username || '');
      setEditEmail(base.email || '');
      setEditProfilePictureUrl(base.profilePictureUrl || '');
      setEditBio(base.bio || '');
      setEditExperience(base.experiencePoints ?? null);
      setEditLatitude(base.latitude ?? null);
      setEditLongitude(base.longitude ?? null);
      setEditRadius(base.radius ?? null);
    }
    try {
      // Try to fetch full user record (includes latitude/longitude/radius)
      let fullUser: any = null;
      try {
        const fullResp = await apiAdminGetUser(token as string, userId);
        fullUser = fullResp.data || null;
      } catch (e) {
        // ignore — we'll still fetch individual pieces below
        fullUser = null;
      }
      const [picResp, bioResp, expResp] = await Promise.all([
        apiGetUserProfilePicture(userId),
        apiGetUserBio(userId),
        apiGetUserExperience(userId),
      ]);
      setSelectedUserDetails({
        profilePictureUrl: picResp.data?.profilePictureUrl || null,
        bio: bioResp.data?.bio || null,
        experiencePoints: expResp.data?.experiencePoints || 0,
        latitude: fullUser?.latitude ?? base?.latitude ?? null,
        longitude: fullUser?.longitude ?? base?.longitude ?? null,
        radius: fullUser?.radius ?? base?.radius ?? null,
      });
      if (!base) {
        setEditProfilePictureUrl(picResp.data?.profilePictureUrl || '');
        setEditBio(bioResp.data?.bio || '');
        setEditExperience(expResp.data?.experiencePoints ?? null);
        setEditLatitude(fullUser?.latitude ?? null);
        setEditLongitude(fullUser?.longitude ?? null);
        setEditRadius(fullUser?.radius ?? null);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load user details');
      setSelectedUserDetails({});
    } finally {
      setIsDetailsLoading(false);
    }
  };

  const openUserEdit = async (item: any) => {
    // Open modal and immediately enter edit mode with base values
    await openUserDetails(item._id, item);
    setIsEditMode(true);
  };

  useEffect(() => {
    // Ensure the API client points to the backend on port 8000 when running in Expo Go.
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Constants: any = require('expo-constants');
      const manifest = Constants?.manifest || Constants?.expoConfig || Constants?.manifest2;
      const debuggerHost = manifest?.debuggerHost || manifest?.hostUri || manifest?.packagerOpts?.devClient?.url;
      if (debuggerHost && typeof debuggerHost === 'string') {
        const ip = debuggerHost.split(':')[0];
        const url = `http://${ip}:8000/api/v1`;
        setBaseUrl(url);
        console.log('[ManageUsers] setBaseUrl ->', url);
      }
    } catch (e) {
      // ignore
    }

  fetchUsers({ page: 1 });
  }, [token]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchUsers();
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.primaryGreen} />
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <FontAwesome5 name="exclamation-circle" size={48} color="#FF3B30" />
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={() => { setIsLoading(true); fetchUsers(); }}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Gradient Header */}
      <LinearGradient
        colors={[Colors.light.primaryGreen, Colors.light.secondaryGreen]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <FontAwesome5 name="arrow-left" size={20} color="#fff" />
        </Pressable>
        <View style={styles.headerContent}>
          <FontAwesome5 name="users-cog" size={32} color="#fff" />
          <Text style={styles.headerTitle}>Manage Users</Text>
          <Text style={styles.headerSubtitle}>{total} total users</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable style={styles.headerActionButton} onPress={() => router.push('/(admin)/create-user')}>
            <FontAwesome5 name="user-plus" size={16} color="#fff" />
          </Pressable>
          <Pressable style={styles.headerActionButton} onPress={() => { setIsLoading(true); fetchUsers(); }}>
            <FontAwesome5 name="sync" size={16} color="#fff" />
          </Pressable>
        </View>
      </LinearGradient>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <FontAwesome5 name="search" size={16} color="#999" style={styles.searchIcon} />
          <TextInput
            placeholder="Search users..."
            placeholderTextColor="#999"
            value={query}
            onChangeText={(t) => {
              setQuery(t);
              const trimmed = t?.trim?.() || '';
              if (trimmed === '') {
                setIsLoading(true);
                setPage(1);
                fetchUsers({ page: 1 });
                return;
              }
              setUsers((prev: any[]) => sortUsersByQuery(prev, trimmed));
            }}
            style={styles.searchInput}
          />
          {query.length > 0 && (
            <Pressable onPress={() => { setQuery(''); setIsLoading(true); setPage(1); fetchUsers({ page: 1 }); }}>
              <FontAwesome5 name="times-circle" size={16} color="#999" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Users List */}
      <View style={styles.scrollWrapper}>
        <FlatList
          data={users}
          keyExtractor={(item: any) => item._id}
          renderItem={({ item }: { item: any }) => {
            const isAdmin = (item?.permissionLevel >= 1) || (item?.role === 'admin') || (Array.isArray(item?.roles) && item.roles.includes('admin'));
            return (
              <Pressable style={styles.userCard} onPress={() => openUserDetails(item._id, item)}>
                <View style={styles.userAvatar}>
                  {item.profilePictureUrl ? (
                    <Image source={{ uri: item.profilePictureUrl }} style={styles.avatarImage} />
                  ) : (
                    <FontAwesome5 name="user" size={20} color="#999" />
                  )}
                </View>
                <View style={styles.userInfo}>
                  <View style={styles.userNameRow}>
                    <Text style={styles.username}>{item.username}</Text>
                    {isAdmin && (
                      <View style={styles.adminBadge}>
                        <Text style={styles.adminBadgeText}>Admin</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.email}>{item.email}</Text>
                </View>
                <View style={styles.userActions}>
                  <Pressable style={styles.iconButton} onPress={() => openUserEdit(item)}>
                    <FontAwesome5 name="edit" size={16} color={Colors.light.primaryGreen} />
                  </Pressable>
                  <Pressable style={styles.iconButton} onPress={() => openUserDetails(item._id, item)}>
                    <FontAwesome5 name="chevron-right" size={16} color="#999" />
                  </Pressable>
                </View>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <FontAwesome5 name="users-slash" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No users found</Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[Colors.light.primaryGreen]} />}
        />
      </View>

      {/* Pagination */}
      <View style={styles.pagination}>
        <Pressable 
          disabled={page <= 1} 
          onPress={() => { setPage(Math.max(1, page - 1)); fetchUsers({ page: Math.max(1, page - 1) }); }} 
          style={[styles.pageButton, page <= 1 && styles.pageButtonDisabled]}
        >
          <FontAwesome5 name="chevron-left" size={14} color={page <= 1 ? '#ccc' : Colors.light.primaryGreen} />
        </Pressable>
        <Text style={styles.pageInfo}>Page {page} of {Math.ceil(total / pageSize) || 1}</Text>
        <Pressable 
          disabled={page * pageSize >= total} 
          onPress={() => { setPage(page + 1); fetchUsers({ page: page + 1 }); }} 
          style={[styles.pageButton, page * pageSize >= total && styles.pageButtonDisabled]}
        >
          <FontAwesome5 name="chevron-right" size={14} color={page * pageSize >= total ? '#ccc' : Colors.light.primaryGreen} />
        </Pressable>
      </View>

      {/* User Details/Edit Modal */}
      <Modal visible={!!selectedUserId} animationType="slide" transparent={true} onRequestClose={() => { setSelectedUserId(null); setIsEditMode(false); }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <LinearGradient
              colors={[Colors.light.primaryGreen, Colors.light.secondaryGreen]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.modalHeader}
            >
              <Pressable style={styles.modalClose} onPress={() => { setSelectedUserId(null); setIsEditMode(false); }}>
                <FontAwesome5 name="times" size={20} color="#fff" />
              </Pressable>
              <Text style={styles.modalTitle}>{isEditMode ? 'Edit User' : 'User Details'}</Text>
            </LinearGradient>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {isDetailsLoading && (
                <View style={styles.modalLoading}>
                  <ActivityIndicator size="large" color={Colors.light.primaryGreen} />
                </View>
              )}

              {!isDetailsLoading && selectedUserDetails && (
                <>
                  {/* Profile Picture */}
                  <View style={styles.profileSection}>
                    {(selectedUserDetails.profilePictureUrl || editProfilePictureUrl) ? (
                      <Image 
                        source={{ uri: selectedUserDetails.profilePictureUrl || editProfilePictureUrl }} 
                        style={styles.profileImage} 
                      />
                    ) : (
                      <View style={styles.profilePlaceholder}>
                        <FontAwesome5 name="user" size={40} color="#999" />
                      </View>
                    )}
                  </View>

                  {!isEditMode ? (
                    /* View Mode */
                    <View style={styles.detailsContainer}>
                      <View style={styles.detailCard}>
                        <Text style={styles.detailLabel}>Username</Text>
                        <Text style={styles.detailValue}>{editUsername || 'N/A'}</Text>
                      </View>
                      <View style={styles.detailCard}>
                        <Text style={styles.detailLabel}>Email</Text>
                        <Text style={styles.detailValue}>{editEmail || 'N/A'}</Text>
                      </View>
                      <View style={styles.detailCard}>
                        <Text style={styles.detailLabel}>Bio</Text>
                        <Text style={styles.detailValue}>{selectedUserDetails.bio || editBio || 'No bio'}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <View style={[styles.detailCard, { flex: 1, marginRight: 8 }]}>
                          <Text style={styles.detailLabel}>Experience</Text>
                          <Text style={styles.detailValue}>{selectedUserDetails.experiencePoints ?? editExperience ?? 0} XP</Text>
                        </View>
                        <View style={[styles.detailCard, { flex: 1 }]}>
                          <Text style={styles.detailLabel}>Radius</Text>
                          <Text style={styles.detailValue}>{selectedUserDetails.radius ?? 'N/A'} mi</Text>
                        </View>
                      </View>
                      <View style={styles.detailRow}>
                        <View style={[styles.detailCard, { flex: 1, marginRight: 8 }]}>
                          <Text style={styles.detailLabel}>Latitude</Text>
                          <Text style={styles.detailValue}>{selectedUserDetails.latitude?.toFixed(4) ?? 'N/A'}</Text>
                        </View>
                        <View style={[styles.detailCard, { flex: 1 }]}>
                          <Text style={styles.detailLabel}>Longitude</Text>
                          <Text style={styles.detailValue}>{selectedUserDetails.longitude?.toFixed(4) ?? 'N/A'}</Text>
                        </View>
                      </View>
                    </View>
                  ) : (
                    /* Edit Mode */
                    <View style={styles.editContainer}>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Username</Text>
                        <TextInput style={styles.input} value={editUsername} onChangeText={setEditUsername} />
                      </View>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Email</Text>
                        <TextInput style={styles.input} value={editEmail} onChangeText={setEditEmail} keyboardType="email-address" autoCapitalize="none" />
                      </View>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Profile Picture URL</Text>
                        <TextInput style={styles.input} value={editProfilePictureUrl} onChangeText={setEditProfilePictureUrl} />
                      </View>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Bio</Text>
                        <TextInput style={[styles.input, styles.textArea]} value={editBio} onChangeText={setEditBio} multiline numberOfLines={3} />
                      </View>
                      <View style={styles.inputRow}>
                        <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                          <Text style={styles.inputLabel}>Experience</Text>
                          <TextInput style={styles.input} value={editExperience?.toString() || ''} onChangeText={(t) => setEditExperience(t ? parseInt(t, 10) : null)} keyboardType="numeric" />
                        </View>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                          <Text style={styles.inputLabel}>Radius (mi)</Text>
                          <TextInput style={styles.input} value={editRadius?.toString() || ''} onChangeText={(t) => setEditRadius(t ? parseInt(t, 10) : null)} keyboardType="numeric" />
                        </View>
                      </View>
                      <View style={styles.inputRow}>
                        <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                          <Text style={styles.inputLabel}>Latitude</Text>
                          <TextInput style={styles.input} value={editLatitude?.toString() || ''} onChangeText={(t) => setEditLatitude(t ? Number(t) : null)} keyboardType="numeric" />
                        </View>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                          <Text style={styles.inputLabel}>Longitude</Text>
                          <TextInput style={styles.input} value={editLongitude?.toString() || ''} onChangeText={(t) => setEditLongitude(t ? Number(t) : null)} keyboardType="numeric" />
                        </View>
                      </View>
                    </View>
                  )}

                  {/* Action Buttons */}
                  <View style={styles.actionButtons}>
                    {!isEditMode ? (
                      <>
                        <Pressable style={styles.primaryButton} onPress={() => setIsEditMode(true)}>
                          <FontAwesome5 name="edit" size={16} color="#fff" />
                          <Text style={styles.primaryButtonText}>Edit</Text>
                        </Pressable>
                        <Pressable style={styles.secondaryButton} onPress={async () => {
                          if (!token) { Alert.alert('Unauthorized'); return; }
                          try { 
                            setIsDetailsLoading(true); 
                            await apiAdminForceLogoutUser(token, selectedUserId as string); 
                            Alert.alert('Success', 'User logged out'); 
                          } catch (err: any) { 
                            Alert.alert('Error', err.message || 'Failed to logout'); 
                          } finally { 
                            setIsDetailsLoading(false); 
                          }
                        }}>
                          <FontAwesome5 name="sign-out-alt" size={16} color={Colors.light.primaryGreen} />
                          <Text style={styles.secondaryButtonText}>Force Logout</Text>
                        </Pressable>
                      </>
                    ) : (
                      <Pressable style={styles.primaryButton} onPress={async () => {
                        if (!token) { Alert.alert('Unauthorized'); return; }
                        try {
                          setIsDetailsLoading(true);
                          if (editLatitude !== null && (Number.isNaN(editLatitude) || editLatitude < -90 || editLatitude > 90)) {
                            Alert.alert('Validation Error', 'Latitude must be between -90 and 90');
                            return;
                          }
                          if (editLongitude !== null && (Number.isNaN(editLongitude) || editLongitude < -180 || editLongitude > 180)) {
                            Alert.alert('Validation Error', 'Longitude must be between -180 and 180');
                            return;
                          }
                          if (editRadius !== null && (Number.isNaN(editRadius) || editRadius < 0)) {
                            Alert.alert('Validation Error', 'Radius must be non-negative');
                            return;
                          }
                          const updateData: any = {
                            username: editUsername,
                            email: editEmail,
                            profilePictureUrl: editProfilePictureUrl,
                            bio: editBio,
                            experiencePoints: editExperience,
                            latitude: editLatitude,
                            longitude: editLongitude,
                            radius: editRadius,
                          };
                          await apiAdminUpdateUser(token, selectedUserId as string, updateData);
                          await fetchUsers();
                          setIsEditMode(false);
                          Alert.alert('Success', 'User updated');
                        } catch (err: any) {
                          Alert.alert('Error', err.message || 'Failed to update user');
                        } finally { setIsDetailsLoading(false); }
                      }}>
                        <FontAwesome5 name="save" size={16} color="#fff" />
                        <Text style={styles.primaryButtonText}>Save Changes</Text>
                      </Pressable>
                    )}
                    
                    <View style={styles.dangerActions}>
                      <Pressable style={styles.promoteButton} onPress={async () => {
                        try {
                          setIsDetailsLoading(true);
                          await apiAdminPromoteUser(token as string, selectedUserId as string, 1);
                          await fetchUsers();
                          setSelectedUserId(null);
                          Alert.alert('Success', 'User promoted to admin');
                        } catch (err: any) {
                          Alert.alert('Error', err.message || 'Failed to promote user');
                        } finally { setIsDetailsLoading(false); }
                      }}>
                        <FontAwesome5 name="user-shield" size={16} color="#fff" />
                        <Text style={styles.promoteButtonText}>Promote</Text>
                      </Pressable>
                      
                      <Pressable style={styles.dangerButton} onPress={() => {
                        if (!token) { Alert.alert('Unauthorized'); return; }
                        Alert.alert('Confirm Delete', 'Are you sure you want to delete this user?', [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Delete', style: 'destructive', onPress: async () => {
                            try { 
                              setIsDetailsLoading(true); 
                              await apiAdminDeleteUser(token, selectedUserId as string); 
                              await fetchUsers(); 
                              setSelectedUserId(null); 
                              Alert.alert('Deleted', 'User has been deleted'); 
                            } catch (err: any) { 
                              Alert.alert('Error', err.message || 'Failed to delete'); 
                            } finally { 
                              setIsDetailsLoading(false); 
                            }
                          }}
                        ]);
                      }}>
                        <FontAwesome5 name="trash-alt" size={16} color="#fff" />
                        <Text style={styles.dangerButtonText}>Delete</Text>
                      </Pressable>
                    </View>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: Colors.light.primaryGreen,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    alignItems: 'center',
    marginTop: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  headerActions: {
    position: 'absolute',
    top: 50,
    right: 16,
    flexDirection: 'row',
    gap: 8,
  },
  headerActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.light.background,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  scrollWrapper: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  listContent: {
    padding: 16,
    paddingBottom: 20,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  adminBadge: {
    backgroundColor: Colors.light.primaryGreen + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  adminBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.light.primaryGreen,
  },
  email: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  userActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconButton: {
    padding: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#999',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  pageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageButtonDisabled: {
    opacity: 0.5,
  },
  pageInfo: {
    fontSize: 14,
    color: '#666',
    marginHorizontal: 20,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.light.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    alignItems: 'center',
  },
  modalClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalBody: {
    padding: 20,
  },
  modalLoading: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  profilePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsContainer: {
    gap: 12,
  },
  detailCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  detailRow: {
    flexDirection: 'row',
  },
  detailLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  editContainer: {
    gap: 16,
  },
  inputGroup: {
    marginBottom: 0,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  inputRow: {
    flexDirection: 'row',
  },
  actionButtons: {
    marginTop: 24,
    marginBottom: 40,
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.primaryGreen,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.light.primaryGreen,
    gap: 8,
  },
  secondaryButtonText: {
    color: Colors.light.primaryGreen,
    fontSize: 16,
    fontWeight: '600',
  },
  dangerActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  promoteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#34C759',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  promoteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  dangerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  dangerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
