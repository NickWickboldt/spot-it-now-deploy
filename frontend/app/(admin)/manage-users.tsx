// ==================================================================
// File: app/manage-users.tsx
// ==================================================================
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Button, FlatList, Image, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { apiAdminDeleteUser, apiAdminForceLogoutUser, apiAdminPromoteUser, apiAdminUpdateUser, apiGetAllUsers, apiGetUserBio, apiGetUserExperience, apiGetUserProfilePicture } from '../../api/admin';
import { setBaseUrl } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export default function ManageUsersScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState([]);
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
  // ...existing state

  const fetchUsers = async () => {
    if (!token) {
        setError("Cannot fetch users with local admin credentials. Please use a real admin account.");
        setIsLoading(false);
        return;
    };
    try {
      setError(null);
      const response = await apiGetAllUsers(token);
      // API returns ApiResponse shape { status, data, message }
      setUsers(response.data || []); 
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
    }
    try {
      const [picResp, bioResp, expResp] = await Promise.all([
        apiGetUserProfilePicture(userId),
        apiGetUserBio(userId),
        apiGetUserExperience(userId),
      ]);
      setSelectedUserDetails({
        profilePictureUrl: picResp.data?.profilePictureUrl || null,
        bio: bioResp.data?.bio || null,
        experiencePoints: expResp.data?.experiencePoints || 0,
      });
      if (!base) {
        setEditProfilePictureUrl(picResp.data?.profilePictureUrl || '');
        setEditBio(bioResp.data?.bio || '');
        setEditExperience(expResp.data?.experiencePoints ?? null);
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

    fetchUsers();
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
      </View>

      <FlatList
        data={users}
        keyExtractor={(item: any) => item._id}
        renderItem={({ item }: { item: any }) => (
          <View style={manageUsersStyles.userItem}>
            <Pressable onPress={() => openUserDetails(item._id, item)} style={{ flex: 1 }}>
              <View>
                <Text style={manageUsersStyles.username}>{item.username}</Text>
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
                      const updateData: any = {
                        username: editUsername,
                        email: editEmail,
                        profilePictureUrl: editProfilePictureUrl,
                        bio: editBio,
                        experiencePoints: editExperience,
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
