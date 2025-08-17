// ==================================================================
// File: app/(tabs)/profile.tsx
// ==================================================================
import { View, Text, StyleSheet, Pressable, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { apiDeleteUserAccount } from '../../api/user';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const { user, token, logout } = useAuth();
  const router = useRouter();

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account", "Are you sure? This is permanent.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: async () => {
            if (token && token !== 'local-admin-fake-token') { // Prevent deleting local admin
              try {
                await apiDeleteUserAccount(token);
                alert("Account deleted successfully.");
                logout();
              } catch (error) {
                alert(String(error));
              }
            } else {
              alert("Cannot delete the local admin account.");
            }
          },
        },
      ]
    );
  };

  if (!user) {
    return <View style={profileStyles.container}><ActivityIndicator /></View>;
  }

  return (
    <View style={profileStyles.container}>
      <Text style={profileStyles.title}>Profile</Text>
      <View style={profileStyles.infoContainer}>
        <Text style={profileStyles.userInfo}>Username: {user.username}</Text>
        <Text style={profileStyles.userInfo}>Email: {user.email}</Text>
        <Text style={profileStyles.userInfo}>Role: {user.role}</Text>
      </View>

      {user.role === 'admin' && (
        <View style={profileStyles.adminContainer}>
          <Text style={profileStyles.adminTitle}>Admin Tools</Text>
          <Pressable style={profileStyles.button} onPress={() => router.push('/manage-users')}>
            <Text style={profileStyles.buttonText}>Manage Users</Text>
          </Pressable>
          <Pressable style={profileStyles.button} onPress={() => router.push('/create-user')}>
            <Text style={profileStyles.buttonText}>Create New User</Text>
          </Pressable>
        </View>
      )}

      <Pressable style={[profileStyles.button, profileStyles.destructiveButton]} onPress={handleDeleteAccount}>
        <Text style={profileStyles.buttonText}>Delete My Account</Text>
      </Pressable>
      <Pressable style={[profileStyles.button, profileStyles.logoutButton]} onPress={logout}>
        <Text style={profileStyles.buttonText}>Logout</Text>
      </Pressable>
    </View>
  );
}

const profileStyles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', padding: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 20 },
  infoContainer: { width: '100%', padding: 20, backgroundColor: 'white', borderRadius: 10, marginBottom: 20 },
  userInfo: { fontSize: 18, marginBottom: 10 },
  adminContainer: { width: '100%', padding: 20, backgroundColor: '#fff0f0', borderRadius: 10, marginBottom: 20 },
  adminTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', color: '#D0021B' },
  button: { backgroundColor: '#007AFF', padding: 15, borderRadius: 10, width: '100%', alignItems: 'center', marginBottom: 10 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  destructiveButton: { backgroundColor: '#FF3B30' },
  logoutButton: { marginTop: 'auto', backgroundColor: '#666' },
});
