import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View, Modal } from 'react-native';
import { apiDeleteUserAccount, apiUpdateUserDetails } from '../../api/user';
import { useAuth } from '../../context/AuthContext';
import Icon from 'react-native-vector-icons/FontAwesome';
import { Colors } from '../../constants/Colors';

export default function ProfileScreen() {
  const { user, token, logout, refreshUser } = useAuth();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false); // No longer need activeTab
  const [form, setForm] = useState({ username: user?.username || '', email: user?.email || '', bio: user?.bio || '', profilePictureUrl: user?.profilePictureUrl || '', radius: user?.radius ?? 0 });

  if (!user) {
    logout();
    return;
  }

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account", "Are you sure? This is permanent.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete", style: "destructive", onPress: async () => {
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
    setMenuVisible(false); // Close menu when editing starts
  };

  const handleCancel = () => {
    setEditing(false);
  };

  const handleSave = async () => {
    if (!token) return alert('Not authenticated');

    const radiusVal = Number(form.radius);
    if (Number.isNaN(radiusVal) || radiusVal < 0 || !Number.isInteger(radiusVal)) {
      return alert('Radius must be a non-negative integer');
    }

    const updates: any = {};
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
      <View style={profileStyles.header}>
        <Text style={profileStyles.title}>Profile</Text>
        <Pressable onPress={() => setMenuVisible(true)}>
          <Icon name="ellipsis-h" size={28} color="#333" />
        </Pressable>
      </View>

      {/* The Tab Bar has been removed from here */}

      <ScrollView
        style={{ width: "100%" }}
        contentContainerStyle={{ alignItems: "center" }}
      >
        <View style={profileStyles.infoContainer}>
          {!editing ? (
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
              <View style={profileStyles.rightContainer}>
                <Text style={profileStyles.userInfo}>
                  {user.username} 
                </Text>
                <Text style={profileStyles.userInfo}>
                  Bio: {user.bio || "N/A"}
                </Text>
                <Text style={profileStyles.userInfo}>
                  Experience Points: {user.experiencePoints}
                </Text>
              </View>
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
          )}

          {/* The old Admin Tools section has been removed from here */}
        </View>
      </ScrollView>

      {editing && (
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

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable style={profileStyles.menuOverlay} onPress={() => setMenuVisible(false)}>
          <View style={profileStyles.menuContainer}>
            <Pressable style={profileStyles.menuItem} onPress={startEdit}>
              <Text style={profileStyles.menuText}>Edit Profile</Text>
            </Pressable>

            {/* === ADMIN TOOLS ADDED HERE === */}
            {user.role === "admin" && (
              <>
                <Pressable style={profileStyles.menuItem} onPress={() => { router.push('/manage-users'); setMenuVisible(false); }}>
                  <Text style={profileStyles.menuText}>Manage Users</Text>
                </Pressable>
                <Pressable style={profileStyles.menuItem} onPress={() => { router.push('/manage-sightings'); setMenuVisible(false); }}>
                  <Text style={profileStyles.menuText}>Manage Sightings</Text>
                </Pressable>
              </>
            )}

            <Pressable style={profileStyles.menuItem} onPress={logout}>
              <Text style={profileStyles.menuText}>Logout</Text>
            </Pressable>
            <Pressable style={profileStyles.menuItem} onPress={() => setMenuVisible(false)}>
              <Text style={profileStyles.menuText}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
// The StyleSheet (profileStyles) remains the same
const profileStyles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', padding: 10, backgroundColor: Colors.light.shadow },
  title: { fontSize: 32, fontWeight: 'bold', marginTop: 20, color: Colors.light.primaryGreen },
  infoContainer: { width: '100%', padding: 10, backgroundColor: 'white', borderRadius: 10, marginBottom: 10, display: 'flex', alignItems: 'center', flexDirection: 'row' },
  rightContainer: { display: 'flex', flexDirection: 'column', marginLeft: 20, flex: 1 },
  userInfo: { fontSize: 18, marginBottom: 10 },
  avatar: { width: 120, height: 120, borderRadius: 60, marginBottom: 10 },
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
  halfButton: { backgroundColor: '#007AFF', padding: 15, borderRadius: 10, width: '48%', alignItems: 'center', marginBottom: 200 },
  editProfileButton: { backgroundColor: '#34C759', padding: 15, borderRadius: 10, width: '100%', alignItems: 'center', marginBottom: 120 },
  destructiveButton: { backgroundColor: '#FF3B30' },
  logoutButton: { marginTop: 'auto', backgroundColor: '#666', marginBottom: 150 },
  logoutFloating: { position: 'absolute', right: 20, bottom: 90, backgroundColor: '#666', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 24, elevation: 4 },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 20,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    minWidth: 180,
    elevation: 5,
  },
  menuItem: {
    paddingVertical: 12,
  },
  menuText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
});