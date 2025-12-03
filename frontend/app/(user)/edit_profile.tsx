import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import Icon5 from 'react-native-vector-icons/FontAwesome5';
import { uploadToCloudinarySigned } from '../../api/upload';
import { apiUpdateUserDetails } from '../../api/user';
import { Colors } from '../../constants/Colors';
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

// Section Card Component
const SectionCard = ({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) => (
  <View style={styles.sectionCard}>
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIconContainer}>
        <Icon name={icon} size={14} color={Colors.light.primaryGreen} />
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    {children}
  </View>
);

// Input Row Component for cleaner inline fields
const InputRow = ({ 
  label, 
  value, 
  onChangeText, 
  placeholder, 
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  multiline = false,
  editable = true,
  rightElement
}: { 
  label: string; 
  value: string; 
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'numeric';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  multiline?: boolean;
  editable?: boolean;
  rightElement?: React.ReactNode;
}) => (
  <View style={styles.inputRow}>
    <Text style={styles.inputLabel}>{label}</Text>
    <View style={styles.inputWrapper}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={[
          styles.inputField, 
          multiline && styles.inputFieldMultiline,
          !editable && styles.inputFieldDisabled
        ]}
        placeholder={placeholder}
        placeholderTextColor="#999"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        editable={editable}
      />
      {rightElement}
    </View>
  </View>
);

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
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const hasLocationQuery = locationQuery.trim().length > 0;

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        notification.warning('Permission Required', 'Please allow access to your photo library');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setIsUploadingImage(true);
        try {
          const uploadResponse = await uploadToCloudinarySigned(result.assets[0].uri, token, 'image', 'profile_pictures');
          if (uploadResponse?.secure_url) {
            setForm(prev => ({ ...prev, profilePictureUrl: uploadResponse.secure_url }));
            notification.success('Photo Updated', 'Your profile photo has been changed');
          }
        } catch (uploadError: any) {
          notification.error('Upload Failed', uploadError?.message || 'Could not upload image');
        } finally {
          setIsUploadingImage(false);
        }
      }
    } catch (error: any) {
      notification.error('Error', error?.message || 'Could not select image');
    }
  };

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
      
      {/* Hero Header with Profile Photo */}
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

        {/* Profile Photo Section */}
        <View style={styles.profilePhotoSection}>
          <Pressable onPress={handlePickImage} style={styles.avatarContainer}>
            {form.profilePictureUrl ? (
              <Image source={{ uri: form.profilePictureUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Icon name="user" size={40} color="#fff" />
              </View>
            )}
            <View style={styles.cameraOverlay}>
              {isUploadingImage ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Icon name="camera" size={14} color="#fff" />
              )}
            </View>
          </Pressable>
          <Text style={styles.changePhotoText}>Tap to change photo</Text>
        </View>
      </LinearGradient>

      <View style={styles.scrollWrapper}>
        <ScrollView 
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollContentContainer}
          showsVerticalScrollIndicator={false}
        >
        {/* Basic Info Section */}
        <SectionCard title="Basic Information" icon="user">
          <InputRow
            label="Username"
            value={form.username}
            onChangeText={(t) => setForm({ ...form, username: t })}
            placeholder="Your username"
            autoCapitalize="none"
          />
          <InputRow
            label="Email"
            value={form.email}
            onChangeText={(t) => setForm({ ...form, email: t })}
            placeholder="your@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </SectionCard>

        {/* About Section */}
        <SectionCard title="About You" icon="pencil">
          <InputRow
            label="Bio"
            value={form.bio}
            onChangeText={(t) => setForm({ ...form, bio: t })}
            placeholder="Tell us about yourself..."
            multiline
          />
        </SectionCard>

        {/* Location Section */}
        <SectionCard title="Location Settings" icon="map-marker">
          {/* Current Location Display */}
          <View style={styles.locationDisplayRow}>
            <View style={styles.locationCoord}>
              <Text style={styles.coordLabel}>Latitude</Text>
              <Text style={styles.coordValue}>{formatCoordinate(form.latitude)}</Text>
            </View>
            <View style={styles.locationDivider} />
            <View style={styles.locationCoord}>
              <Text style={styles.coordLabel}>Longitude</Text>
              <Text style={styles.coordValue}>{formatCoordinate(form.longitude)}</Text>
            </View>
          </View>

          {/* Location Action Buttons */}
          <View style={styles.locationActions}>
            <Pressable
              style={[styles.locationButton, (isLocating || isGeocoding) && styles.locationButtonDisabled]}
              onPress={handleUseCurrentLocation}
              disabled={isLocating || isGeocoding}
            >
              {isLocating ? (
                <ActivityIndicator size="small" color={Colors.light.primaryGreen} />
              ) : (
                <Icon5 name="crosshairs" size={16} color={Colors.light.primaryGreen} />
              )}
              <Text style={styles.locationButtonText}>
                {isLocating ? 'Locating...' : 'Use Current'}
              </Text>
            </Pressable>
          </View>

          {/* Search Location */}
          <View style={styles.searchLocationContainer}>
            <View style={styles.searchInputWrapper}>
              <Icon name="search" size={14} color="#999" style={styles.searchIcon} />
              <TextInput
                value={locationQuery}
                onChangeText={(t) => {
                  setLocationQuery(t);
                  if (locationMessage) setLocationMessage(null);
                  if (locationResults.length) setLocationResults([]);
                }}
                style={styles.searchInput}
                placeholder="Search city or address..."
                placeholderTextColor="#999"
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="search"
                onSubmitEditing={handleSearchLocation}
              />
              {hasLocationQuery && (
                <Pressable onPress={handleSearchLocation} disabled={isGeocoding}>
                  {isGeocoding ? (
                    <ActivityIndicator size="small" color={Colors.light.primaryGreen} />
                  ) : (
                    <Icon name="arrow-right" size={14} color={Colors.light.primaryGreen} />
                  )}
                </Pressable>
              )}
            </View>
          </View>

          {locationMessage && (
            <Text style={styles.locationMessage}>{locationMessage}</Text>
          )}

          {/* Location Results */}
          {locationResults.length > 0 && (
            <View style={styles.locationResults}>
              {locationResults.map((result, index) => (
                <Pressable
                  key={`location-${index}`}
                  style={styles.locationResultItem}
                  onPress={() => handleSelectLocationResult(result)}
                >
                  <Icon name="map-pin" size={14} color={Colors.light.primaryGreen} />
                  <View style={styles.locationResultText}>
                    <Text style={styles.locationResultCoords}>
                      {result.latitude.toFixed(4)}, {result.longitude.toFixed(4)}
                    </Text>
                  </View>
                  <Icon name="check" size={12} color={Colors.light.secondaryGreen} />
                </Pressable>
              ))}
            </View>
          )}

          {/* Search Radius */}
          <View style={styles.radiusRow}>
            <View style={styles.radiusInfo}>
              <Icon5 name="ruler-horizontal" size={14} color={Colors.light.primaryGreen} />
              <Text style={styles.radiusLabel}>Search Radius</Text>
            </View>
            <View style={styles.radiusInputWrapper}>
              <TextInput
                value={String(form.radius)}
                onChangeText={(t) => setForm({ ...form, radius: Number(t) || 0 })}
                style={styles.radiusInput}
                keyboardType="numeric"
                placeholder="0"
              />
              <Text style={styles.radiusUnit}>miles</Text>
            </View>
          </View>
        </SectionCard>

        {/* Bottom Spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>
      </View>
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
    paddingBottom: 30,
    zIndex: 10,
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
  profilePhotoSection: {
    alignItems: 'center',
    marginTop: 20,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.light.primaryGreen,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  changePhotoText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    marginTop: 10,
    fontWeight: '500',
  },
  scrollWrapper: {
    flex: 1,
    backgroundColor: Colors.light.softBeige,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    overflow: 'hidden',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: `${Colors.light.primaryGreen}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.mainText,
  },
  inputRow: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputField: {
    flex: 1,
    backgroundColor: Colors.light.softBeige,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.light.mainText,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  inputFieldMultiline: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  inputFieldDisabled: {
    backgroundColor: '#f5f5f5',
    color: '#999',
  },
  locationDisplayRow: {
    flexDirection: 'row',
    backgroundColor: Colors.light.softBeige,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  locationCoord: {
    flex: 1,
    alignItems: 'center',
  },
  locationDivider: {
    width: 1,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 16,
  },
  coordLabel: {
    fontSize: 11,
    color: '#888',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  coordValue: {
    fontSize: 15,
    color: Colors.light.mainText,
    fontWeight: '600',
  },
  locationActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  locationButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${Colors.light.primaryGreen}12`,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: `${Colors.light.primaryGreen}30`,
  },
  locationButtonDisabled: {
    opacity: 0.5,
  },
  locationButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.primaryGreen,
  },
  searchLocationContainer: {
    marginBottom: 12,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.softBeige,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.light.mainText,
  },
  locationMessage: {
    fontSize: 13,
    color: '#666',
    marginTop: 8,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  locationResults: {
    marginTop: 8,
    gap: 8,
  },
  locationResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.light.primaryGreen}08`,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: `${Colors.light.primaryGreen}20`,
  },
  locationResultText: {
    flex: 1,
  },
  locationResultCoords: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.mainText,
  },
  radiusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: 8,
  },
  radiusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radiusLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.mainText,
  },
  radiusInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.softBeige,
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  radiusInput: {
    width: 50,
    paddingVertical: 8,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.mainText,
    textAlign: 'center',
  },
  radiusUnit: {
    fontSize: 13,
    color: '#888',
    marginLeft: 4,
  },
});
