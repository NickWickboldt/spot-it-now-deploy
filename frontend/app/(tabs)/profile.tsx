import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Text, View, Modal } from 'react-native';
import { apiDeleteUserAccount } from '../../api/user';
import { useAuth } from '../../context/AuthContext';
import Icon from 'react-native-vector-icons/FontAwesome';
import { profileStyles } from '../../constants/ProfileStyles';

export default function ProfileScreen(): React.JSX.Element | null {
  const { user, token, logout } = useAuth();
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState<boolean>(false);

  if (!user) {
    // If the user is null, show a loading indicator
    return <View style={profileStyles.container}><ActivityIndicator /></View>;
  }

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
                if (logout) logout();
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

  const handleEdit = (): void => {
    setMenuVisible(false);
    router.push('/edit_profile'); // Navigate to the new edit screen
  };

  return (
    <View style={profileStyles.container}>
      <View style={profileStyles.header}>
        <Text style={profileStyles.screenTitle}>Profile</Text>
        <Pressable onPress={() => setMenuVisible(true)}>
          <Icon name="ellipsis-h" size={28} color="#333" />
        </Pressable>
      </View>

      <ScrollView style={profileStyles.profileContainer}>
        <View style={profileStyles.infoContainer}>
          {user.profilePictureUrl ? (
            <Image
              source={{ uri: user.profilePictureUrl }}
              style={profileStyles.avatar}
            />
          ) : (
            <View style={[profileStyles.avatar, { backgroundColor: "#ddd", alignItems: "center", justifyContent: "center" }]}>
              <Text>No Image</Text>
            </View>
          )}
          <View style={profileStyles.rightContainer}>
            <Text style={profileStyles.userInfo}>{user.username}</Text>
            <Text style={profileStyles.userInfo}>Bio: {user.bio || "N/A"}</Text>
            <Text style={profileStyles.userInfo}>Experience Points: {user.experiencePoints}</Text>
          </View>
        </View>

      </ScrollView>

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
            <Pressable style={[profileStyles.menuItem, { borderTopWidth: 1, borderColor: '#eee' }]} onPress={handleDeleteAccount}>
              <Text style={[profileStyles.menuText, { color: 'red' }]}>Delete Account</Text>
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