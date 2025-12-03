import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { apiUpdateUserDetails } from '../../api/user';
import { Colors } from '../../constants/Colors';
import { EditProfileStyles } from '../../constants/EditProfileStyles';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../hooks/useNotification';

type EditProfileForm = {
  username: string;
  email: string;
  bio: string;
  profilePictureUrl: string;
  radius: number;
  latitude: number | null;
  longitude: number | null;
};

export default function EditProfileScreen(): React.JSX.Element {
  const { user, token, refreshUser, isLoading } = useAuth();
  const router = useRouter();
  const notification = useNotification();

  // Show loading while auth is loading
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
        <ActivityIndicator size="large" color="#40743dff" />
      </View>
    );
  }

  // Redirect if not logged in
  if (!user || !token) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
        <Text>Please log in to edit your profile</Text>
      </View>
    );
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
  const [locationQuery, setLocationQuery] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [locationResults, setLocationResults] = useState<Location.LocationGeocodedLocation[]>([]);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const hasLocationQuery = locationQuery.trim().length > 0;

  const handleSave = async (): Promise<void> => {
    const radiusVal = Number(form.radius);
    if (Number.isNaN(radiusVal) || radiusVal < 0) {
      notification.warning('Invalid Input', 'Radius must be a non-negative number.');
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
      notification.success('Profile Updated!', 'Your changes have been saved');
      router.back();
    } catch (e: any) {
      notification.error('Update Failed', String(e?.message || e));
    }
  };

  const formatCoordinate = (value: number | null) =>
    value !== null && Number.isFinite(value) ? value.toFixed(4) : 'Not set';

  const formatGeocodedAddress = (result: Location.LocationGeocodedLocation) => {
    // LocationGeocodedLocation doesn't have address info, so we'll show coordinates
    return `Lat: ${result.latitude.toFixed(4)}, Lon: ${result.longitude.toFixed(4)}`;
  };

  const handleSearchLocation = async (): Promise<void> => {
    const trimmedQuery = locationQuery.trim();
    if (!trimmedQuery) {
      Alert.alert('Enter a Location', 'Type a city, address, or landmark to search for.');
      return;
    }

    try {
      setIsGeocoding(true);
      setLocationMessage(null);
      const results = await Location.geocodeAsync(trimmedQuery);
      const normalized = results
        .filter((item) => typeof item.latitude === 'number' && typeof item.longitude === 'number')
        .slice(0, 5);

      if (!normalized.length) {
        setLocationResults([]);
        setLocationMessage('No results found. Try a different search.');
        return;
      }

      setLocationResults(normalized);
      setLocationMessage('Select a result below to update your location.');
    } catch (error: any) {
      setLocationResults([]);
      const fallbackMessage = 'Unable to search for that location right now. Please try again.';
      setLocationMessage(typeof error?.message === 'string' && error.message ? error.message : fallbackMessage);
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleSelectLocationResult = (result: Location.LocationGeocodedLocation): void => {
    const nextLatitude = Number(result.latitude.toFixed(6));
    const nextLongitude = Number(result.longitude.toFixed(6));
    setForm((prev) => ({
      ...prev,
      latitude: nextLatitude,
      longitude: nextLongitude,
    }));
    setLocationQuery(formatGeocodedAddress(result));
    setLocationResults([]);
    notification.success('Location Selected', 'Location updated successfully');
    setLocationMessage('Location updated. Remember to save your changes.');
    Alert.alert('Location Updated', 'Location has been set from your search selection.');
  };

  const handleUseCurrentLocation = async () => {
    try {
      setIsLocating(true);
      setLocationMessage(null);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        notification.warning('Permission Denied', 'Location permission is required to capture your current location.');
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
        setLocationQuery('');
        setLocationResults([]);
        notification.success('Location Captured', 'Your current location has been set');
        setLocationMessage('Location updated using your current GPS coordinates. Remember to save your changes.');
      }
    } catch (error: any) {
      notification.error('Location Error', String(error?.message || 'Unable to fetch current location right now.'));
    } finally {
      setIsLocating(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Hero Header */}
      <LinearGradient
        colors={['#40743dff', '#5a9a55', '#7FA37C']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroHeader}
      >
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Icon name="chevron-left" size={18} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <Pressable onPress={handleSave} style={styles.saveButton}>
            <Text style={styles.saveButtonText}>Save</Text>
          </Pressable>
        </View>
      </LinearGradient>

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

        <View style={EditProfileStyles.locationSection}>
          <Text style={EditProfileStyles.fieldLabel}>Current Location</Text>
          <Text style={EditProfileStyles.locationMeta}>Latitude: {formatCoordinate(form.latitude)}</Text>
          <Text style={EditProfileStyles.locationMeta}>Longitude: {formatCoordinate(form.longitude)}</Text>
          <Pressable
            style={[
              EditProfileStyles.locationActionButton,
              (isLocating || isGeocoding) && EditProfileStyles.locationActionButtonDisabled,
              { marginTop: 12 },
            ]}
            onPress={handleUseCurrentLocation}
            disabled={isLocating || isGeocoding}
          >
            {isLocating ? (
              <ActivityIndicator size='small' color='#fff' />
            ) : (
              <Icon name='map-marker' size={18} color='#fff' />
            )}
            <Text style={EditProfileStyles.locationActionButtonText}>
              {isLocating ? 'Locating...' : 'Use Current Location'}
            </Text>
          </Pressable>

          <Text style={[EditProfileStyles.fieldLabel, { marginTop: 18 }]}>Search Location</Text>
          <TextInput
            value={locationQuery}
            onChangeText={(t) => {
              setLocationQuery(t);
              if (locationMessage) setLocationMessage(null);
              if (locationResults.length) setLocationResults([]);
            }}
            style={EditProfileStyles.input}
            placeholder='Search city, address, or landmark'
            autoCapitalize='words'
            autoCorrect={false}
            returnKeyType='search'
            onSubmitEditing={handleSearchLocation}
          />
          <Pressable
            style={[
              EditProfileStyles.locationActionButton,
              (!hasLocationQuery || isGeocoding) && EditProfileStyles.locationActionButtonDisabled,
            ]}
            onPress={handleSearchLocation}
            disabled={!hasLocationQuery || isGeocoding}
          >
            {isGeocoding ? (
              <ActivityIndicator size='small' color='#fff' />
            ) : (
              <Icon name='search' size={18} color='#fff' />
            )}
            <Text style={EditProfileStyles.locationActionButtonText}>
              {isGeocoding ? 'Searching...' : 'Search & Set'}
            </Text>
          </Pressable>

          {locationMessage ? (
            <Text style={EditProfileStyles.locationStatusText}>{locationMessage}</Text>
          ) : null}

          {locationResults.length > 0 ? (
            <View style={EditProfileStyles.locationResultsContainer}>
              {locationResults.map((result, index) => (
                <Pressable
                  key={`location-result-${index}-${result.latitude}-${result.longitude}`}
                  onPress={() => handleSelectLocationResult(result)}
                  style={EditProfileStyles.locationResult}
                >
                  <Text style={EditProfileStyles.locationResultTitle}>{formatGeocodedAddress(result)}</Text>
                  <Text style={EditProfileStyles.locationResultSubtitle}>
                    Latitude: {formatCoordinate(result.latitude ?? null)} | Longitude: {formatCoordinate(result.longitude ?? null)}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.softBeige,
  },
  heroHeader: {
    paddingTop: Platform.OS === 'ios' ? 60 : (StatusBar.currentHeight || 0) + 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  saveButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#40743dff',
  },
});
