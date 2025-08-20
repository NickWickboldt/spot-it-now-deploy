// ==================================================================
// File: app/manage-users.tsx
// ==================================================================
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { apiGetAllUsers } from '../../api/admin';
import { useAuth } from '../../context/AuthContext';

export default function ManageUsersScreen() {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchUsers = async () => {
    if (!token) {
        setError("Cannot fetch users with local admin credentials. Please use a real admin account.");
        setIsLoading(false);
        return;
    };
    try {
      setError(null);
      const response = await apiGetAllUsers(token);
      setUsers(response.data || []); 
    } catch (e: any) {
      setError(e.message || 'Failed to fetch users.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
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
    <FlatList
      data={users}
      keyExtractor={(item: any) => item._id}
      renderItem={({ item }: { item: any }) => (
        <View style={manageUsersStyles.userItem}>
          <View>
            <Text style={manageUsersStyles.username}>{item.username}</Text>
            <Text style={manageUsersStyles.email}>{item.email}</Text>
          </View>
          <Text style={manageUsersStyles.role}>{item.role || 'user'}</Text>
        </View>
      )}
      ListEmptyComponent={<Text style={manageUsersStyles.centered}>No users found.</Text>}
      contentContainerStyle={manageUsersStyles.container}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
    />
  );
}

const manageUsersStyles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { padding: 10 },
  userItem: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#eee' },
  username: { fontSize: 16, fontWeight: 'bold' },
  email: { fontSize: 14, color: '#666' },
  role: { fontSize: 14, fontWeight: '500', color: '#007AFF', textTransform: 'capitalize' },
  errorText: { color: 'red', fontSize: 16, paddingHorizontal: 20, textAlign: 'center' },
});
