// ==================================================================
// File: app/(tabs)/profile.tsx
// ==================================================================
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { apiDeleteUserAccount, apiUpdateUserDetails } from '../../api/user';
import { useAuth } from '../../context/AuthContext';

export default function ProfileScreen() {
  const { user, token, logout, refreshUser } = useAuth();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'admin'>('profile');
  const [form, setForm] = useState({ username: user?.username || '', email: user?.email || '', bio: user?.bio || '', profilePictureUrl: user?.profilePictureUrl || '', radius: user?.radius ?? 0 });

  if(!user){
    logout(); 
    return; 
  }

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

  const startEdit = () => {
  setForm({ username: user.username || '', email: user.email || '', bio: user.bio || '', profilePictureUrl: user.profilePictureUrl || '', radius: user.radius ?? 0 });
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
  };

  const handleSave = async () => {
    if (!token) return alert('Not authenticated');

    // Validate radius: must be a non-negative integer
    const radiusVal = Number(form.radius);
    if (Number.isNaN(radiusVal) || radiusVal < 0 || !Number.isInteger(radiusVal)) {
      return alert('Radius must be a non-negative integer');
    }

    const updates: any = {};
    // radius is the only required editable field per spec; still include other changes
    if (form.radius !== undefined && form.radius !== user.radius) updates.radius = radiusVal;
    if (form.username !== user.username) updates.username = form.username;
    if (form.email !== user.email) updates.email = form.email;
    if (form.bio !== user.bio) updates.bio = form.bio;
    if (form.profilePictureUrl !== user.profilePictureUrl) updates.profilePictureUrl = form.profilePictureUrl;

    try {
      await apiUpdateUserDetails(token, updates);
      if (refreshUser) await refreshUser();
      alert('Profile updated');
      setEditing(false);
    } catch (e) {
      alert(String(e));
    }
  };

  if (!user) {
    return <View style={profileStyles.container}><ActivityIndicator /></View>;
  }

  return (
    <View style={profileStyles.container}>
      <Text style={profileStyles.title}>Profile</Text>
      {user.role === "admin" && (
        <View style={profileStyles.tabBar}>
          <Pressable
            style={[
              profileStyles.tabButton,
              activeTab === "profile" && profileStyles.tabButtonActive,
            ]}
            onPress={() => {
              setActiveTab("profile")
              refreshUser()}}
          >
            <Text
              style={[
                profileStyles.tabButtonText,
                activeTab === "profile" && profileStyles.tabButtonTextActive,
              ]}
            >
              My Profile
            </Text>
          </Pressable>
          <Pressable
            style={[
              profileStyles.tabButton,
              activeTab === "admin" && profileStyles.tabButtonActive,
            ]}
            onPress={() => setActiveTab("admin")}
          >
            <Text
              style={[
                profileStyles.tabButtonText,
                activeTab === "admin" && profileStyles.tabButtonTextActive,
              ]}
            >
              Admin Tools
            </Text>
          </Pressable>
        </View>
      )}
      <ScrollView
        style={{ width: "100%" }}
        contentContainerStyle={{ alignItems: "center" }}
      >
        <View style={profileStyles.infoContainer}>
          {(!(user.role === "admin") || activeTab === "profile") &&
            (!editing ? (
              <>
                {user.profilePictureUrl ? (
                  <Image
                    source={{ uri: user.profilePictureUrl }}
                    style={profileStyles.avatar}
                  />
                ) : (
                  <View
                    style={[
                      profileStyles.avatar,
                      {
                        backgroundColor: "#ddd",
                        alignItems: "center",
                        justifyContent: "center",
                      },
                    ]}
                  >
                    <Text>No Image</Text>
                  </View>
                )}
                <Text style={profileStyles.userInfo}>
                  Username: {user.username}
                </Text>
                <Text style={profileStyles.userInfo}>Email: {user.email}</Text>
                <Text style={profileStyles.userInfo}>Role: {user.role}</Text>
                <Text style={profileStyles.userInfo}>Latitude: {user.latitude ?? 'N/A'}</Text>
                <Text style={profileStyles.userInfo}>Longitude: {user.longitude ?? 'N/A'}</Text>
                <Text style={profileStyles.userInfo}>Radius (miles): {user.radius}</Text>
                <Text style={profileStyles.userInfo}>
                  Bio: {user.bio || "N/A"}
                </Text>
                <Text style={profileStyles.userInfo}>
                  Experience Points: {user.experiencePoints}
                </Text>
              </>
            ) : (
              <View>
                <Text style={profileStyles.fieldLabel}>
                  Profile Picture URL
                </Text>
                <TextInput
                  value={form.profilePictureUrl}
                  onChangeText={(t) =>
                    setForm({ ...form, profilePictureUrl: t })
                  }
                  style={profileStyles.input}
                  placeholder="https://..."
                />
                <Text style={profileStyles.fieldLabel}>Radius (miles)</Text>
                <TextInput
                  value={String(form.radius)}
                  onChangeText={(t) => setForm({ ...form, radius: Number(t) || 0 })}
                  style={profileStyles.input}
                  keyboardType="numeric"
                />
                <Text style={profileStyles.fieldLabel}>Username</Text>
                <TextInput
                  value={form.username}
                  onChangeText={(t) => setForm({ ...form, username: t })}
                  style={profileStyles.input}
                />
                <Text style={profileStyles.fieldLabel}>Email</Text>
                <TextInput
                  value={form.email}
                  onChangeText={(t) => setForm({ ...form, email: t })}
                  style={profileStyles.input}
                  keyboardType="email-address"
                />
                <Text style={profileStyles.fieldLabel}>Bio</Text>
                <TextInput
                  value={form.bio}
                  onChangeText={(t) => setForm({ ...form, bio: t })}
                  style={[profileStyles.input, { height: 80 }]}
                  multiline
                />
                <Pressable
                  style={[
                    profileStyles.button,
                    profileStyles.destructiveButton,
                    { marginTop: 6 },
                  ]}
                  onPress={handleDeleteAccount}
                >
                  <Text style={profileStyles.buttonText}>
                    Delete My Account
                  </Text>
                </Pressable>
              </View>
            ))}

          {user.role === "admin" && activeTab === "admin" && (
            <View style={profileStyles.adminContainerInner}>
              <Text style={profileStyles.adminTitle}>Admin Tools</Text>
              <Pressable
                style={profileStyles.button}
                onPress={() => router.push("/manage-users")}
              >
                <Text style={profileStyles.buttonText}>Manage Users</Text>
              </Pressable>
              <Pressable
                style={profileStyles.button}
                onPress={() => router.push("/manage-sightings")}
              >
                <Text style={profileStyles.buttonText}>Manage Sightings</Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>

      {!editing ? (
        <View style={{ width: "100%" }}>
          <Pressable
            style={profileStyles.editProfileButton}
            onPress={startEdit}
          >
            <Text style={profileStyles.buttonText}>Edit Profile</Text>
          </Pressable>
        </View>
      ) : (
        <View
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
          }}
        >
          <Pressable style={profileStyles.halfButton} onPress={handleSave}>
            <Text style={profileStyles.buttonText}>Save</Text>
          </Pressable>
          <Pressable
            style={[profileStyles.halfButton, { backgroundColor: "#999" }]}
            onPress={handleCancel}
          >
            <Text style={profileStyles.buttonText}>Cancel</Text>
          </Pressable>
        </View>
      )}

      <Pressable style={profileStyles.logoutFloating} onPress={logout}>
        <Text style={{ color: "white", fontWeight: "700" }}>Logout</Text>
      </Pressable>
    </View>
  );
}

const profileStyles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', padding: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 20, marginTop: 20 },
  infoContainer: { width: '100%', padding: 20, backgroundColor: 'white', borderRadius: 10, marginBottom: 20 },
  userInfo: { fontSize: 18, marginBottom: 10 },
  avatar: { width: 120, height: 120, borderRadius: 60, marginBottom: 15 },
  fieldLabel: { fontSize: 14, color: '#333', marginTop: 10, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 8, width: 300, marginBottom: 8 },
  adminContainer: { width: '100%', padding: 20, backgroundColor: '#fff0f0', borderRadius: 10, marginBottom: 20 },
  adminTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', color: '#D0021B' },
  adminContainerInner: { width: '100%', paddingTop: 10, paddingBottom: 10 },
  tabBar: { flexDirection: 'row', width: '100%', marginBottom: 12 },
  tabButton: { flex: 1, padding: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabButtonActive: { borderBottomColor: '#007AFF' },
  tabButtonText: { color: '#666', fontWeight: '600' },
  tabButtonTextActive: { color: '#007AFF' },
  button: { backgroundColor: '#007AFF', padding: 15, borderRadius: 10, width: '100%', alignItems: 'center', marginBottom: 10 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  halfButton: { backgroundColor: '#007AFF', padding: 15, borderRadius: 10, width: '48%', alignItems: 'center', marginBottom: 80 },
  editProfileButton: { backgroundColor: '#34C759', padding: 15, borderRadius: 10, width: '100%', alignItems: 'center', marginBottom: 120 },
  destructiveButton: { backgroundColor: '#FF3B30' },
  logoutButton: { marginTop: 'auto', backgroundColor: '#666', marginBottom: 150 },
  logoutFloating: { position: 'absolute', right: 20, bottom: 90, backgroundColor: '#666', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 24, elevation: 4 },
});
