import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { apiUpdateUserDetails } from '../../api/user'; // Assuming UserDetails type is exported from your API file
import { useAuth } from '../../context/AuthContext';
import { EditProfileStyles } from '../../constants/EditProfileStyles';
import Icon from 'react-native-vector-icons/FontAwesome';
import { Colors } from '../../constants/Colors';


// Define a type for the form state to ensure type safety
type EditProfileForm = {
  username: string;
  email: string;
  bio: string;
  profilePictureUrl: string;
  radius: number;
};

export default function EditProfileScreen(): React.JSX.Element | null {
  const { user, token, refreshUser } = useAuth();
  const router = useRouter();

  if (!user || !token) {
    if (router.canGoBack()) router.back();
    return null;
  }

  const [form, setForm] = useState<EditProfileForm>({
    username: user.username || '',
    email: user.email || '',
    bio: user.bio || '',
    profilePictureUrl: user.profilePictureUrl || '',
    radius: user.radius ?? 0,
  });

  const handleSave = async (): Promise<void> => {
    const radiusVal = Number(form.radius);
    if (isNaN(radiusVal) || radiusVal < 0 || !Number.isInteger(radiusVal)) {
      alert('Radius must be a non-negative integer.');
      return;
    }

    const updates: Partial<EditProfileForm> = {};
    if (form.radius !== user.radius) updates.radius = radiusVal;
    if (form.username !== user.username) updates.username = form.username;
    if (form.email !== user.email) updates.email = form.email;
    if (form.bio !== user.bio) updates.bio = form.bio;
    if (form.profilePictureUrl !== user.profilePictureUrl) updates.profilePictureUrl = form.profilePictureUrl;

    if (Object.keys(updates).length === 0) {
      router.back();
      return;
    }

    try {
      await apiUpdateUserDetails(token, updates);
      if (refreshUser) await refreshUser();
      alert('Profile updated successfully!');
      router.back();
    } catch (e: any) {
      alert(String(e.message || e));
    }
  };

  return (
    <View style={EditProfileStyles.container}>
      <View style={EditProfileStyles.header}>
        {/* Left Column */}
        <View style={EditProfileStyles.sideContainer}>
          <Pressable onPress={() => router.back()}>
            <Icon name="chevron-left" size={22} color={Colors.light.primaryGreen} />
          </Pressable>
        </View>

        {/* Center Column */}
        <View style={EditProfileStyles.centerContainer}>
          <Text style={EditProfileStyles.screenTitle}>Edit Profile</Text>
        </View>

        {/* Right Column (acts as a spacer) */}
        <View style={EditProfileStyles.sideContainer} />
        
      </View>


      <ScrollView style={EditProfileStyles.formContainer}>
        <Text style={EditProfileStyles.fieldLabel}>Profile Picture URL</Text>
        <TextInput
          value={form.profilePictureUrl}
          onChangeText={(t) => setForm({ ...form, profilePictureUrl: t })}
          style={EditProfileStyles.input}
          placeholder="https://example.com/image.png"
        />
        <Text style={EditProfileStyles.fieldLabel}>Search Radius (miles)</Text>
        <TextInput
          value={String(form.radius)}
          onChangeText={(t) => setForm({ ...form, radius: Number(t) || 0 })}
          style={EditProfileStyles.input}
          keyboardType="numeric"
        />
        <Text style={EditProfileStyles.fieldLabel}>Username</Text>
        <TextInput
          value={form.username}
          onChangeText={(t) => setForm({ ...form, username: t })}
          style={EditProfileStyles.input}
        />
        <Text style={EditProfileStyles.fieldLabel}>Email</Text>
        <TextInput
          value={form.email}
          onChangeText={(t) => setForm({ ...form, email: t })}
          style={EditProfileStyles.input}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Text style={EditProfileStyles.fieldLabel}>Bio</Text>
        <TextInput
          value={form.bio}
          onChangeText={(t) => setForm({ ...form, bio: t })}
          style={[EditProfileStyles.input, { height: 80, textAlignVertical: 'top' }]}
          multiline
        />
        <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
          <Pressable style={EditProfileStyles.halfButton} onPress={handleSave}>
            <Text style={EditProfileStyles.buttonText}>Save</Text>
          </Pressable>
        </View>
      </ScrollView>


    </View>
  );
}