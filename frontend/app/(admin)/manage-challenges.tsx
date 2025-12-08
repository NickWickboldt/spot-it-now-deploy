import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import {
    apiClearAllRegionalChallenges,
    apiDeleteRegionalChallenge,
    apiListAllRegionalChallenges,
    apiRegenerateRegionalChallenges,
    RegionalChallengeListItem,
} from '../../api/regionalChallenge';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext';

/**
 * Admin page for managing AI-generated regional challenges.
 * 
 * Features:
 * - View all cached regional challenges
 * - Clear all challenges (cache reset)
 * - Manually trigger AI generation for a specific area
 * - Delete individual challenges
 */
export default function ManageChallenges(): React.JSX.Element {
  const { token } = useAuth();
  const router = useRouter();

  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [challenges, setChallenges] = useState<RegionalChallengeListItem[]>([]);
  const [generating, setGenerating] = useState(false);
  const [clearing, setClearing] = useState(false);

  // AI Generation form state
  const [cityQuery, setCityQuery] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
    display: string;
  } | null>(null);

  /**
   * Load all regional challenges from the server
   */
  const loadChallenges = useCallback(async () => {
    try {
      const response = await apiListAllRegionalChallenges();
      setChallenges(response.data.challenges || []);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load challenges');
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadChallenges();
      setLoading(false);
    };
    init();
  }, [loadChallenges]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadChallenges();
    setRefreshing(false);
  };

  /**
   * Search for a city and geocode it
   */
  const searchCity = async () => {
    const q = cityQuery.trim();
    if (!q) {
      Alert.alert('Enter a location', 'Please type a city, address, or place name.');
      return;
    }
    try {
      setGeocoding(true);
      const results = await Location.geocodeAsync(q);
      const filtered = results
        .filter((r) => typeof r.latitude === 'number' && typeof r.longitude === 'number')
        .slice(0, 1);

      if (filtered.length === 0) {
        Alert.alert('Not found', 'Could not find that location.');
        return;
      }

      const loc = filtered[0];
      setSelectedLocation({
        lat: loc.latitude,
        lng: loc.longitude,
        display: q,
      });
      Alert.alert('Location found', `Coordinates: ${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Geocoding failed');
    } finally {
      setGeocoding(false);
    }
  };

  /**
   * Use device's current location
   */
  const useCurrentLocation = async () => {
    try {
      setGeocoding(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Location permission is needed.');
        return;
      }
      const current = await Location.getCurrentPositionAsync({});
      setSelectedLocation({
        lat: current.coords.latitude,
        lng: current.coords.longitude,
        display: 'Current Location',
      });
      Alert.alert(
        'Location set',
        `Using current location: ${current.coords.latitude.toFixed(4)}, ${current.coords.longitude.toFixed(4)}`
      );
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to get current location');
    } finally {
      setGeocoding(false);
    }
  };

  /**
   * Trigger AI generation for the selected location
   */
  const generateForLocation = async () => {
    if (!selectedLocation) {
      Alert.alert('Select a location', 'Please search for a city or use your current location first.');
      return;
    }

    Alert.alert(
      'Generate Challenges',
      `Generate AI challenges for ${selectedLocation.display}?\n\nThis will create a new probability manifest for this region using AI.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate',
          onPress: async () => {
            try {
              setGenerating(true);
              const response = await apiRegenerateRegionalChallenges(selectedLocation.lat, selectedLocation.lng);
              Alert.alert(
                'Success!',
                `Generated probability manifest for ${response.data.location}\n\n` +
                `Daily Sample: ${response.data.daily.map((a) => `${a.name} (${a.probability}%)`).join(', ')}\n\n` +
                `Weekly Sample: ${response.data.weekly.slice(0, 3).map((a) => `${a.name} (${a.probability}%)`).join(', ')}...`
              );
              // Refresh the list
              await loadChallenges();
              // Clear the selection
              setSelectedLocation(null);
              setCityQuery('');
            } catch (e: any) {
              Alert.alert('Generation failed', e?.message || 'Unknown error');
            } finally {
              setGenerating(false);
            }
          },
        },
      ]
    );
  };

  /**
   * Clear all regional challenges
   */
  const clearAllChallenges = async () => {
    Alert.alert(
      'Clear All Challenges',
      'Are you sure you want to delete ALL cached regional challenges?\n\nThis will force the AI to regenerate challenges for all regions when users next request them.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              setClearing(true);
              const response = await apiClearAllRegionalChallenges();
              Alert.alert('Cleared', `Deleted ${response.data.deleted} challenges.`);
              setChallenges([]);
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Failed to clear challenges');
            } finally {
              setClearing(false);
            }
          },
        },
      ]
    );
  };

  /**
   * Delete a single challenge
   */
  const deleteChallenge = async (challenge: RegionalChallengeListItem) => {
    Alert.alert(
      'Delete Challenge',
      `Delete the challenge for ${challenge.location}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiDeleteRegionalChallenge(challenge._id);
              setChallenges((prev) => prev.filter((c) => c._id !== challenge._id));
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Failed to delete challenge');
            }
          },
        },
      ]
    );
  };

  /**
   * Format date for display
   */
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  /**
   * Get difficulty color
   */
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return '#4CAF50';
      case 'medium':
        return '#FF9800';
      case 'hard':
        return '#F44336';
      default:
        return '#666';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.primaryGreen} />
        <Text style={styles.loadingText}>Loading challenges...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[Colors.light.primaryGreen, Colors.light.secondaryGreen]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <FontAwesome5 name="arrow-left" size={20} color="#fff" />
        </Pressable>
        <View style={styles.headerContent}>
          <MaterialIcons name="auto-awesome" size={32} color="#fff" />
          <Text style={styles.headerTitle}>AI Challenge Manager</Text>
          <Text style={styles.headerSubtitle}>{challenges.length} cached challenges</Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* AI Generation Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="smart-toy" size={24} color={Colors.light.primaryGreen} />
            <Text style={styles.sectionTitle}>Generate AI Challenges</Text>
          </View>
          <Text style={styles.sectionDesc}>
            Generate a probability manifest for a location. The AI will analyze your database animals and assign 
            likelihood percentages (0-100%) for each animal in that region. This is called ONCE per region.
          </Text>

          {/* Location Input */}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={cityQuery}
              onChangeText={setCityQuery}
              placeholder="Enter city, address, or place..."
              placeholderTextColor="#999"
              onSubmitEditing={searchCity}
            />
          </View>

          {/* Location Buttons */}
          <View style={styles.buttonRow}>
            <Pressable style={styles.secondaryBtn} onPress={searchCity} disabled={geocoding}>
              {geocoding ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <FontAwesome5 name="search" size={14} color="#fff" />
                  <Text style={styles.btnText}>Search</Text>
                </>
              )}
            </Pressable>
            <Pressable style={styles.secondaryBtn} onPress={useCurrentLocation} disabled={geocoding}>
              <FontAwesome5 name="location-arrow" size={14} color="#fff" />
              <Text style={styles.btnText}>Use Current</Text>
            </Pressable>
          </View>

          {/* Selected Location */}
          {selectedLocation && (
            <View style={styles.selectedLocation}>
              <FontAwesome5 name="map-marker-alt" size={16} color={Colors.light.primaryGreen} />
              <View style={styles.selectedLocationText}>
                <Text style={styles.selectedLocationName}>{selectedLocation.display}</Text>
                <Text style={styles.selectedLocationCoords}>
                  {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
                </Text>
              </View>
              <Pressable onPress={() => setSelectedLocation(null)}>
                <FontAwesome5 name="times-circle" size={18} color="#999" />
              </Pressable>
            </View>
          )}

          {/* Generate Button */}
          <Pressable
            style={[styles.primaryBtn, (!selectedLocation || generating) && styles.btnDisabled]}
            onPress={generateForLocation}
            disabled={!selectedLocation || generating}
          >
            {generating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialIcons name="auto-awesome" size={18} color="#fff" />
                <Text style={styles.primaryBtnText}>Generate AI Challenges</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Clear All Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="delete-sweep" size={24} color="#F44336" />
            <Text style={[styles.sectionTitle, { color: '#F44336' }]}>Clear Cache</Text>
          </View>
          <Text style={styles.sectionDesc}>
            Delete all cached regional challenges. This forces the AI to regenerate fresh challenges for all regions.
          </Text>
          <Pressable
            style={[styles.dangerBtn, clearing && styles.btnDisabled]}
            onPress={clearAllChallenges}
            disabled={clearing || challenges.length === 0}
          >
            {clearing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialIcons name="delete-forever" size={18} color="#fff" />
                <Text style={styles.dangerBtnText}>Clear All Challenges ({challenges.length})</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Cached Challenges List */}
        <View style={styles.listHeader}>
          <FontAwesome5 name="list" size={16} color={Colors.light.primaryGreen} />
          <Text style={styles.listHeaderText}>Cached Regional Challenges</Text>
        </View>

        {challenges.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="cloud-off" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No cached region manifests</Text>
            <Text style={styles.emptySubtext}>
              Generate a probability manifest using the form above, or they'll be created automatically when users open the app.
            </Text>
          </View>
        ) : (
          challenges.map((challenge) => (
            <View key={challenge._id} style={styles.challengeCard}>
              <View style={styles.challengeHeader}>
                <View style={styles.challengeLocation}>
                  <FontAwesome5 name="map-marker-alt" size={14} color={Colors.light.primaryGreen} />
                  <Text style={styles.challengeLocationText}>{challenge.location}</Text>
                </View>
                <Pressable style={styles.deleteBtn} onPress={() => deleteChallenge(challenge)}>
                  <FontAwesome5 name="trash-alt" size={14} color="#F44336" />
                </Pressable>
              </View>

              <View style={styles.challengeMeta}>
                <View style={styles.metaItem}>
                  <FontAwesome5 name="calendar" size={12} color="#666" />
                  <Text style={styles.metaText}>Created: {formatDate(challenge.createdAt)}</Text>
                </View>
                <View style={styles.metaItem}>
                  <MaterialIcons name="location-on" size={14} color="#666" />
                  <Text style={styles.metaText}>
                    {challenge.center?.latitude?.toFixed(2)}, {challenge.center?.longitude?.toFixed(2)}
                  </Text>
                </View>
              </View>

              {/* Manifest Stats */}
              <View style={styles.animalSection}>
                <Text style={styles.animalSectionTitle}>
                  <MaterialIcons name="analytics" size={12} color={Colors.light.primaryGreen} /> Probability Manifest
                </Text>
                <View style={styles.animalChips}>
                  <View style={styles.animalChip}>
                    <FontAwesome5 name="paw" size={12} color={Colors.light.primaryGreen} />
                    <Text style={styles.animalChipText}>{challenge.manifest_size} animals</Text>
                  </View>
                  <View style={[styles.animalChip, { backgroundColor: '#E8F5E9' }]}>
                    <FontAwesome5 name="check-circle" size={12} color="#4CAF50" />
                    <Text style={styles.animalChipText}>{challenge.high_probability_count} likely (≥15%)</Text>
                  </View>
                </View>
              </View>

              <Text style={styles.regionKey}>Key: {challenge.region_key}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    alignItems: 'center',
    marginTop: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.mainText,
  },
  sectionDesc: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 16,
  },
  inputRow: {
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#f8f8f8',
    borderColor: '#e0e0e0',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.light.mainText,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.light.darkNeutral,
    paddingVertical: 12,
    borderRadius: 10,
  },
  btnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  selectedLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.light.primaryGreen + '10',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  selectedLocationText: {
    flex: 1,
  },
  selectedLocationName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.mainText,
  },
  selectedLocationCoords: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.light.primaryGreen,
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#F44336',
    paddingVertical: 14,
    borderRadius: 12,
  },
  dangerBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    marginTop: 8,
  },
  listHeaderText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.mainText,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#fff',
    borderRadius: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#bbb',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 24,
  },
  challengeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  challengeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  challengeLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  challengeLocationText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.mainText,
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F4433615',
    alignItems: 'center',
    justifyContent: 'center',
  },
  challengeMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: '#666',
  },
  animalSection: {
    marginBottom: 10,
  },
  animalSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
  },
  animalChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  animalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  difficultyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  animalChipText: {
    fontSize: 13,
    color: Colors.light.mainText,
  },
  regionKey: {
    fontSize: 11,
    color: '#bbb',
    marginTop: 8,
    fontFamily: 'monospace',
  },
});
