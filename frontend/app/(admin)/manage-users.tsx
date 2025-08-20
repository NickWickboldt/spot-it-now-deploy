// ==================================================================
// File: app/manage-users.tsx
// ==================================================================
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Button, FlatList, Image, Modal, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { apiGetAllUsers, apiGetUserBio, apiGetUserExperience, apiGetUserProfilePicture } from '../../api/admin';
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

  const openUserDetails = async (userId: string) => {
    setSelectedUserId(userId);
    setSelectedUserDetails(null);
    setIsDetailsLoading(true);
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
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load user details');
      setSelectedUserDetails({});
    } finally {
      setIsDetailsLoading(false);
    }
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
          <Pressable onPress={() => openUserDetails(item._id)} style={manageUsersStyles.userItem}>
            <View>
              <Text style={manageUsersStyles.username}>{item.username}</Text>
              <Text style={manageUsersStyles.email}>{item.email}</Text>
            </View>
            <Text style={manageUsersStyles.role}>{item.role || 'user'}</Text>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={manageUsersStyles.centered}>No users found.</Text>}
        contentContainerStyle={manageUsersStyles.container}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      />

      <Modal visible={!!selectedUserId} animationType="slide" onRequestClose={() => setSelectedUserId(null)}>
        <View style={{ flex: 1, padding: 20 }}>
          <Button title="Close" onPress={() => setSelectedUserId(null)} />
          {isDetailsLoading && <ActivityIndicator size="large" />}
          {!isDetailsLoading && selectedUserDetails && (
            <View style={{ alignItems: 'center', marginTop: 20 }}>
              {selectedUserDetails.profilePictureUrl ? (
                <Image source={{ uri: selectedUserDetails.profilePictureUrl }} style={{ width: 120, height: 120, borderRadius: 60, marginBottom: 10 }} />
              ) : (
                <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: '#eee', marginBottom: 10, justifyContent: 'center', alignItems: 'center' }}>
                  <Text>No Image</Text>
                </View>
              )}
              <Text style={{ fontSize: 18, fontWeight: '600' }}>Bio</Text>
              <Text style={{ marginVertical: 10 }}>{selectedUserDetails.bio || 'No bio'}</Text>
              <Text style={{ fontSize: 18, fontWeight: '600' }}>Experience</Text>
              <Text style={{ marginVertical: 10 }}>{selectedUserDetails.experiencePoints ?? 0}</Text>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const manageUsersStyles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'flex-end', padding: 10, gap: 8 },
  headerButton: { backgroundColor: '#007AFF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginLeft: 8 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { padding: 10 },
  userItem: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#eee' },
  username: { fontSize: 16, fontWeight: 'bold' },
  email: { fontSize: 14, color: '#666' },
  role: { fontSize: 14, fontWeight: '500', color: '#007AFF', textTransform: 'capitalize' },
  errorText: { color: 'red', fontSize: 16, paddingHorizontal: 20, textAlign: 'center' },
});
