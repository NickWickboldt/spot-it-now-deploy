// ==================================================================
// File: app/manage-users.tsx
// ==================================================================
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Button, FlatList, Image, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { apiAdminDeleteUser, apiAdminForceLogoutUser, apiAdminGetAllUsers, apiAdminGetUser, apiAdminPromoteUser, apiAdminUpdateUser, apiGetUserBio, apiGetUserExperience, apiGetUserProfilePicture } from '../../api/admin';
import { setBaseUrl } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

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
  // ...existing state

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
    return <View style={manageUsersStyles.centered}><ActivityIndicator size="large" /></View>;
  }

  if (error) {
    return <View style={manageUsersStyles.centered}><Text style={manageUsersStyles.errorText}>{error}</Text></View>;
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={manageUsersStyles.header}>
        <Pressable style={manageUsersStyles.headerButton} onPress={() => router.push('/(admin)/create-user')}>
          <Text style={{ color: 'white' }}>Create</Text>
        </Pressable>
        <Pressable style={manageUsersStyles.headerButton} onPress={() => { setIsLoading(true); fetchUsers(); }}>
          <Text style={{ color: 'white' }}>Refresh</Text>
        </Pressable>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <TextInput
            placeholder="Search users..."
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
            style={[manageUsersStyles.input, { backgroundColor: 'white' }]}
          />
        </View>
      </View>

      <FlatList
        data={users}
        keyExtractor={(item: any) => item._id}
        renderItem={({ item }: { item: any }) => (
          <View style={manageUsersStyles.userItem}>
            <Pressable onPress={() => openUserDetails(item._id, item)} style={{ flex: 1 }}>
              <View>
                <Text style={manageUsersStyles.username}>{item.username} {item.role}</Text>
                <Text style={manageUsersStyles.email}>{item.email}</Text>
              </View>
            </Pressable>
            <View style={manageUsersStyles.itemActions}>
              <Pressable style={manageUsersStyles.smallButton} onPress={() => openUserDetails(item._id, item)}>
                <Text style={{ color: '#007AFF' }}>View</Text>
              </Pressable>
              <Pressable style={manageUsersStyles.smallButton} onPress={() => openUserEdit(item)}>
                <Text style={{ color: '#007AFF' }}>Edit</Text>
              </Pressable>
              {(() => {
                const isAdmin = (item?.permissionLevel >= 1) || (item?.role === 'admin') || (Array.isArray(item?.roles) && item.roles.includes('admin'));
                if (isAdmin) return null;
                return (
                  <Pressable style={manageUsersStyles.smallButton} onPress={async () => {
                    // Use secure promote endpoint (requires super-admin token)
                    try {
                      setIsDetailsLoading(true);
                      await apiAdminPromoteUser(token as string, item._id, 1);
                      await fetchUsers();
                      Alert.alert('Success', 'User promoted to admin');
                    } catch (err: any) {
                      Alert.alert('Error', err.message || 'Failed to promote user');
                    } finally { setIsDetailsLoading(false); }
                  }}>
                    <Text style={{ color: '#007AFF' }}>Promote</Text>
                  </Pressable>
                );
              })()}
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={manageUsersStyles.centered}>No users found.</Text>}
        contentContainerStyle={manageUsersStyles.container}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      />

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 10, alignItems: 'center' }}>
        <Pressable disabled={page <= 1} onPress={() => setPage(Math.max(1, page - 1))} style={[manageUsersStyles.smallButton, { opacity: page <= 1 ? 0.4 : 1 }]}>
                    <Text>Prev</Text>
                  </Pressable>
                  <Text>Page {page} • {total} items</Text>
                  <Pressable disabled={page * pageSize >= total} onPress={() => setPage(page + 1)} style={[manageUsersStyles.smallButton, { opacity: page * pageSize >= total ? 0.4 : 1 }]}>
                    <Text>Next</Text>
                  </Pressable>
      </View>

      <Modal visible={!!selectedUserId} animationType="slide" onRequestClose={() => { setSelectedUserId(null); setIsEditMode(false); }}>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <Button title="Close" onPress={() => { setSelectedUserId(null); setIsEditMode(false); }} />
          {isDetailsLoading && <ActivityIndicator size="large" />}

          {!isDetailsLoading && selectedUserDetails && (
            <View>
              <View style={{ alignItems: 'center' }}>
                {selectedUserDetails.profilePictureUrl ? (
                  <Image source={{ uri: selectedUserDetails.profilePictureUrl }} style={{ width: 120, height: 120, borderRadius: 60, marginBottom: 10 }} />
                ) : (
                  <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: '#eee', marginBottom: 10, justifyContent: 'center', alignItems: 'center' }}>
                    <Text>No Image</Text>
                  </View>
                )}
              </View>

              {!isEditMode && (
                <View>
                  <Text style={{ fontSize: 18, fontWeight: '600' }}>{editUsername || 'Username'}</Text>
                  <Text style={{ color: '#666', marginBottom: 10 }}>{editEmail || 'Email'}</Text>
                  <Text style={{ fontSize: 18, fontWeight: '600' }}>Bio</Text>
                  <Text style={{ marginVertical: 10 }}>{selectedUserDetails.bio || editBio || 'No bio'}</Text>
                  <Text style={{ fontSize: 18, fontWeight: '600' }}>Latitude</Text>
                  <Text style={{ marginVertical: 10 }}>{selectedUserDetails.latitude ?? 'N/A'}</Text>
                  <Text style={{ fontSize: 18, fontWeight: '600' }}>Longitude</Text>
                  <Text style={{ marginVertical: 10 }}>{selectedUserDetails.longitude ?? 'N/A'}</Text>
                  <Text style={{ fontSize: 18, fontWeight: '600' }}>Radius (miles)</Text>
                  <Text style={{ marginVertical: 10 }}>{selectedUserDetails.radius ?? 'N/A'}</Text>
                  <Text style={{ fontSize: 18, fontWeight: '600' }}>Experience</Text>
                  <Text style={{ marginVertical: 10 }}>{selectedUserDetails.experiencePoints ?? editExperience ?? 0}</Text>
                </View>
              )}

              {isEditMode && (
                <View>
                  <Text style={{ marginTop: 10 }}>Username</Text>
                  <TextInput style={manageUsersStyles.input} value={editUsername} onChangeText={setEditUsername} />
                  <Text style={{ marginTop: 10 }}>Email</Text>
                  <TextInput style={manageUsersStyles.input} value={editEmail} onChangeText={setEditEmail} keyboardType="email-address" autoCapitalize="none" />
                  <Text style={{ marginTop: 10 }}>Profile Picture URL</Text>
                  <TextInput style={manageUsersStyles.input} value={editProfilePictureUrl} onChangeText={setEditProfilePictureUrl} />
                  <Text style={{ marginTop: 10 }}>Bio</Text>
                  <TextInput style={[manageUsersStyles.input, { height: 90 }]} value={editBio} onChangeText={setEditBio} multiline />
                  <Text style={{ marginTop: 10 }}>Experience Points</Text>
                  <TextInput style={manageUsersStyles.input} value={editExperience?.toString() || ''} onChangeText={(t) => setEditExperience(t ? parseInt(t, 10) : null)} keyboardType="numeric" />
                  <Text style={{ marginTop: 10 }}>Latitude</Text>
                  <TextInput style={manageUsersStyles.input} value={editLatitude?.toString() || ''} onChangeText={(t) => setEditLatitude(t ? Number(t) : null)} keyboardType="numeric" />
                  <Text style={{ marginTop: 10 }}>Longitude</Text>
                  <TextInput style={manageUsersStyles.input} value={editLongitude?.toString() || ''} onChangeText={(t) => setEditLongitude(t ? Number(t) : null)} keyboardType="numeric" />
                  <Text style={{ marginTop: 10 }}>Radius (miles)</Text>
                  <TextInput style={manageUsersStyles.input} value={editRadius?.toString() || ''} onChangeText={(t) => setEditRadius(t ? parseInt(t, 10) : null)} keyboardType="numeric" />
                </View>
              )}

              <View style={manageUsersStyles.actionsRow}>
                {!isEditMode ? (
                  <Pressable style={manageUsersStyles.actionButton} onPress={() => setIsEditMode(true)}>
                    <Text style={{ color: 'white' }}>Edit</Text>
                  </Pressable>
                ) : (
                  <Pressable style={manageUsersStyles.actionButton} onPress={async () => {
                    if (!token) { Alert.alert('Unauthorized'); return; }
                    try {
                      setIsDetailsLoading(true);

                      // Validate admin-edited geo fields
                      if (editLatitude !== null && (Number.isNaN(editLatitude) || editLatitude < -90 || editLatitude > 90)) {
                        Alert.alert('Validation Error', 'Latitude must be a number between -90 and 90');
                        return;
                      }
                      if (editLongitude !== null && (Number.isNaN(editLongitude) || editLongitude < -180 || editLongitude > 180)) {
                        Alert.alert('Validation Error', 'Longitude must be a number between -180 and 180');
                        return;
                      }
                      if (editRadius !== null && (Number.isNaN(editRadius) || editRadius < 0 || !Number.isInteger(editRadius))) {
                        Alert.alert('Validation Error', 'Radius must be a non-negative integer');
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
                    <Text style={{ color: 'white' }}>Save</Text>
                  </Pressable>
                )}

                <Pressable style={manageUsersStyles.dangerButton} onPress={() => {
                  if (!token) { Alert.alert('Unauthorized'); return; }
                  Alert.alert('Confirm Delete', 'Delete this user?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: async () => {
                      try { setIsDetailsLoading(true); await apiAdminDeleteUser(token, selectedUserId as string); await fetchUsers(); setSelectedUserId(null); Alert.alert('Deleted'); }
                      catch (err: any) { Alert.alert('Error', err.message || 'Failed to delete'); }
                      finally { setIsDetailsLoading(false); }
                    } }
                  ]);
                }}>
                  <Text style={{ color: 'white' }}>Delete</Text>
                </Pressable>

                <Pressable style={manageUsersStyles.actionButton} onPress={async () => {
                  if (!token) { Alert.alert('Unauthorized'); return; }
                  try { setIsDetailsLoading(true); await apiAdminForceLogoutUser(token, selectedUserId as string); Alert.alert('User logged out'); }
                  catch (err: any) { Alert.alert('Error', err.message || 'Failed to logout'); }
                  finally { setIsDetailsLoading(false); }
                }}>
                  <Text style={{ color: 'white' }}>Force Logout</Text>
                </Pressable>
                <Pressable style={[manageUsersStyles.actionButton, { marginLeft: 8 }]} onPress={async () => {
                    // Use secure promote endpoint (requires super-admin token)
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
                  <Text style={{ color: 'white' }}>Promote</Text>
                </Pressable>
              </View>
            </View>
          )}
        </ScrollView>
      </Modal>
      
    </View>
  );
}

const manageUsersStyles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'flex-end', padding: 10, gap: 8 },
  headerButton: { backgroundColor: '#007AFF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginLeft: 8 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { padding: 10 },
  input: { backgroundColor: 'white', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: '#ddd', marginBottom: 8 },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  actionButton: { backgroundColor: '#007AFF', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  dangerButton: { backgroundColor: '#FF3B30', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  itemActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  smallButton: { paddingHorizontal: 8, paddingVertical: 6, marginLeft: 6 },
  userItem: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#eee' },
  username: { fontSize: 16, fontWeight: 'bold' },
  email: { fontSize: 14, color: '#666' },
  role: { fontSize: 14, fontWeight: '500', color: '#007AFF', textTransform: 'capitalize' },
  errorText: { color: 'red', fontSize: 16, paddingHorizontal: 20, textAlign: 'center' },
});
