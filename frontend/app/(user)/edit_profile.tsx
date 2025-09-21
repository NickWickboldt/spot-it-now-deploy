import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import * as Location from 'expo-location';
import { Alert, ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { apiUpdateUserDetails } from '../../api/user';
import { useAuth } from '../../context/AuthContext';
import { EditProfileStyles } from '../../constants/EditProfileStyles';
import Icon from 'react-native-vector-icons/FontAwesome';
import { Colors } from '../../constants/Colors';

type EditProfileForm = {
  username: string;
  email: string;
  bio: string;
  profilePictureUrl: string;
  radius: number;
  latitude: number | null;
  longitude: number | null;
};

export default function EditProfileScreen(): React.JSX.Element | null {
  const { user, token, refreshUser } = useAuth();
  const router = useRouter();

  if (!user || !token) {
    if (router.canGoBack()) router.back();
    return null;
  }

  const initialLatitude = typeof user.latitude === 'number' && Number.isFinite(user.latitude)
    ? user.latitude
    : null;
  const initialLongitude = typeof user.longitude === 'number' && Number.isFinite(user.longitude)
    ? user.longitude
    : null;

  const [form, setForm] = useState<EditProfileForm>({
    username: user.username || '',
    email: user.email || '',
    bio: user.bio || '',
    profilePictureUrl: user.profilePictureUrl || '',
    radius: typeof user.radius === 'number' && Number.isFinite(user.radius) ? user.radius : 0,
    latitude: initialLatitude,
    longitude: initialLongitude,
  });

  const [isLocating, setIsLocating] = useState(false);

  const handleSave = async (): Promise<void> => {
    const radiusVal = Number(form.radius);
    if (Number.isNaN(radiusVal) || radiusVal < 0) {
      Alert.alert('Invalid Radius', 'Radius must be a non-negative number.');
      return;
    }

    const updates: Partial<EditProfileForm> = {};
    if (form.radius !== user.radius) updates.radius = radiusVal;
    if (form.latitude !== user.latitude) updates.latitude = form.latitude ?? null;
    if (form.longitude !== user.longitude) updates.longitude = form.longitude ?? null;
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
      Alert.alert('Success', 'Profile updated successfully!');
      router.back();
    } catch (e: any) {
      Alert.alert('Error', String(e?.message || e));
    }
  };

  const formatCoordinate = (value: number | null) =>
    value !== null && Number.isFinite(value) ? value.toFixed(4) : 'Not set';

  const handleUseCurrentLocation = async () => {
    try {
      setIsLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to capture your current location.');
        return;
      }

      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (current?.coords) {
        const nextLatitude = Number(current.coords.latitude.toFixed(6));
        const nextLongitude = Number(current.coords.longitude.toFixed(6));
        setForm((prev) => ({
          ...prev,
          latitude: nextLatitude,
          longitude: nextLongitude,
        }));
        Alert.alert('Location Updated', 'Your current location has been captured for the local feed.');
      }
    } catch (error: any) {
      Alert.alert('Error', String(error?.message || 'Unable to fetch current location right now.'));
    } finally {
      setIsLocating(false);
    }
  };

  return (
    <View style={EditProfileStyles.container}>
      <View style={EditProfileStyles.header}>
        <View style={EditProfileStyles.sideContainer}>
          <Pressable onPress={() => router.back()}>
            <Icon name='chevron-left' size={22} color={Colors.light.primaryGreen} />
          </Pressable>
        </View>
        <View style={EditProfileStyles.centerContainer}>
          <Text style={EditProfileStyles.screenTitle}>Edit Profile</Text>
        </View>
        <View style={EditProfileStyles.sideContainer} />
      </View>

      <ScrollView style={EditProfileStyles.formContainer}>
        <Text style={EditProfileStyles.fieldLabel}>Profile Picture URL</Text>
        <TextInput
          value={form.profilePictureUrl}
          onChangeText={(t) => setForm({ ...form, profilePictureUrl: t })}
          style={EditProfileStyles.input}
          placeholder='https://example.com/image.png'
        />

        <Text style={EditProfileStyles.fieldLabel}>Search Radius (miles)</Text>
        <TextInput
          value={String(form.radius)}
          onChangeText={(t) => setForm({ ...form, radius: Number(t) || 0 })}
          style={EditProfileStyles.input}
          keyboardType='numeric'
        />

        <View style={{ marginTop: 12, marginBottom: 16 }}>
          <Text style={EditProfileStyles.fieldLabel}>Current Location</Text>
          <Text style={{ color: '#999', marginTop: 4 }}>Latitude: {formatCoordinate(form.latitude)}</Text>
          <Text style={{ color: '#999', marginTop: 2 }}>Longitude: {formatCoordinate(form.longitude)}</Text>
          <Pressable
            style={[EditProfileStyles.halfButton, { marginTop: 12, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8 }]}
            onPress={handleUseCurrentLocation}
            disabled={isLocating}
          >
            {isLocating ? (
              <ActivityIndicator size='small' color='#000' />
            ) : (
              <Icon name='map-marker' size={18} color='#000' />
            )}
            <Text style={EditProfileStyles.buttonText}>{isLocating ? 'Locating...' : 'Use Current Location'}</Text>
          </Pressable>
        </View>

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
          keyboardType='email-address'
          autoCapitalize='none'
        />

        <Text style={EditProfileStyles.fieldLabel}>Bio</Text>
        <TextInput
          value={form.bio}
          onChangeText={(t) => setForm({ ...form, bio: t })}
          style={[EditProfileStyles.input, { height: 80, textAlignVertical: 'top' }]}
          multiline
        />

        <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
          <Pressable style={EditProfileStyles.halfButton} onPress={handleSave}>
            <Text style={EditProfileStyles.buttonText}>Save</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
