import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { apiGetAllAnimals } from '../../api/animal';
import { apiCompleteOnboarding } from '../../api/auth';
import { Colors } from '../../constants/Colors';
import { LoginScreenStyles } from '../../constants/LoginStyles';
import { useAuth } from '../../context/AuthContext';

interface Animal {
  _id: string;
  commonName: string;
  scientificName: string;
  category: string;
  rarityLevel: string;
}

export default function OnboardingAnimalsScreen() {
  const router = useRouter();
  const { user, token } = useAuth();
  const params = useLocalSearchParams();
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [filteredAnimals, setFilteredAnimals] = useState<Animal[]>([]);
  const [selectedAnimals, setSelectedAnimals] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [seeAllMode, setSeeAllMode] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchInputRef = useRef<TextInput>(null);
  
  // Get onboarding data from navigation params
  const bioFromParams = Array.isArray(params.bio) ? params.bio[0] : (params.bio || '');
  const pictureFromParams = Array.isArray(params.profilePictureUrl) ? params.profilePictureUrl[0] : (params.profilePictureUrl || '');

  // Validate user and token on mount
  useEffect(() => {
    if (!user || !token) {
      console.warn('Onboarding: No user or token available', { user: !!user, token: !!token });
    }
  }, [user, token]);

  useEffect(() => {
    // Only load animals when token is available
    if (token) {
      loadAnimals();
    } else {
      console.warn('Waiting for token to load animals...');
    }
  }, [token]);

  const loadAnimals = async () => {
    try {
      setIsLoading(true);
      // Use token from context to load animals
      if (!token) {
        console.warn('No token available for loading animals');
        setError('Not authenticated. Please log in again.');
        return;
      }
      const response = await apiGetAllAnimals(token);
      const animalList = response?.data || [];
      setAnimals(animalList);
      setFilteredAnimals([]);
    } catch (err) {
      setError('Failed to load animals. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    
    if (query.length < 2) {
      setFilteredAnimals([]);
      setShowDropdown(false);
      return;
    }

    // Local substring search
    const filtered = animals.filter(animal =>
      animal.commonName.toLowerCase().includes(query.toLowerCase()) ||
      animal.scientificName.toLowerCase().includes(query.toLowerCase())
    );
    
    setFilteredAnimals(filtered);
    setShowDropdown(true);
  };

  const toggleAnimalSelection = (animal: Animal) => {
    setSelectedAnimals((prev) =>
      prev.includes(animal._id)
        ? prev.filter((id) => id !== animal._id)
        : [...prev, animal._id]
    );
    
    // Show selection in search box
    setSearchQuery('');
    setFilteredAnimals([]);
    setShowDropdown(false);
    searchInputRef.current?.blur();
  };

  const handleSeeAllToggle = () => {
    setSeeAllMode(!seeAllMode);
    if (!seeAllMode) {
      setSelectedAnimals([]);
    }
  };

  const handleComplete = async () => {
    console.log('handleComplete called', { userId: user?._id, token: !!token, bio: bioFromParams, picture: pictureFromParams });
    
    if (!token) {
      setError('Authentication required. Please log in again.');
      console.error('No token available');
      return;
    }

    if (!user || !user.username) {
      setError('User information missing. Please restart onboarding.');
      console.error('User or username missing:', user);
      return;
    }

    setIsSubmitting(true);
    try {
      // Use data from params passed from profile screen, fallback to user object
      const bioToSend = bioFromParams || user.bio || '';
      const picToSend = pictureFromParams || user.profilePictureUrl || '';
      const usernameToSend = user.username;

      console.log('Submitting onboarding with:', {
        userId: user._id,
        username: usernameToSend,
        bio: bioToSend,
        profilePictureUrl: picToSend,
        animalPreferences: seeAllMode ? [] : selectedAnimals,
        tokenPrefix: token ? token.substring(0, 20) : 'no token',
      });

      const animalPreferences = seeAllMode ? [] : selectedAnimals;

      console.log('[ONBOARDING_ANIMALS] About to call API with token:', {
        tokenPrefix: token?.substring(0, 20),
        tokenLength: token?.length,
        userId: user._id,
        username: user.username
      });

      const result = await apiCompleteOnboarding(
        {
          username: usernameToSend,
          bio: bioToSend,
          profilePictureUrl: picToSend,
          animalPreferences,
        },
        token
      );

      console.log('Onboarding completed successfully');
      // Navigate to feed
      router.replace('/(tabs)/feed');
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to complete onboarding';
      setError(errorMsg);
      console.error('Onboarding error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderAnimalItem = ({ item }: { item: Animal }) => (
    <Pressable
      onPress={() => toggleAnimalSelection(item)}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: selectedAnimals.includes(item._id)
          ? Colors.light.primaryGreen
          : Colors.light.cardBackground,
        borderRadius: 8,
        marginBottom: 6,
        borderWidth: selectedAnimals.includes(item._id) ? 0 : 1,
        borderColor: Colors.light.secondaryGreen,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: selectedAnimals.includes(item._id)
              ? Colors.light.background
              : Colors.light.darkNeutral,
            fontSize: 15,
            fontWeight: '500',
          }}
        >
          {item.commonName}
        </Text>
        <Text
          style={{
            color: selectedAnimals.includes(item._id)
              ? Colors.light.background
              : Colors.light.darkNeutral,
            fontSize: 12,
            opacity: 0.7,
            marginTop: 2,
          }}
        >
          {item.category}
        </Text>
      </View>
      {selectedAnimals.includes(item._id) && (
        <Ionicons name="checkmark-circle" size={20} color={Colors.light.background} />
      )}
    </Pressable>
  );

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: Colors.light.background }}
    >
      <View style={[LoginScreenStyles.container, { paddingBottom: 40, flex: 1 }]}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 10, color: Colors.light.darkNeutral }}>
          Choose Your Animals
        </Text>
        <Text style={{ fontSize: 14, color: Colors.light.darkNeutral, marginBottom: 20, textAlign: 'center' }}>
          Select animals you'd like to see, or choose to see all
        </Text>

        {error ? (
          <View style={{ marginBottom: 15, padding: 10, backgroundColor: '#ffebee', borderRadius: 8, width: '100%', maxWidth: 400 }}>
            <Text style={{ color: '#c62828', fontSize: 14 }}>{error}</Text>
          </View>
        ) : null}

        {isLoading ? (
          <ActivityIndicator size="large" color={Colors.light.primaryGreen} />
        ) : (
          <>
            {/* See All Toggle */}
            <View style={{ width: '100%', maxWidth: 400, marginBottom: 20 }}>
              <Pressable
                onPress={handleSeeAllToggle}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 15,
                  paddingVertical: 12,
                  backgroundColor: seeAllMode ? Colors.light.primaryGreen : Colors.light.cardBackground,
                  borderRadius: 10,
                  borderWidth: 2,
                  borderColor: Colors.light.secondaryGreen,
                }}
              >
                <Ionicons
                  name={seeAllMode ? 'checkmark-circle-outline' : 'ellipse-outline'}
                  size={20}
                  color={seeAllMode ? Colors.light.background : Colors.light.primaryGreen}
                />
                <Text
                  style={{
                    marginLeft: 12,
                    fontSize: 16,
                    fontWeight: '600',
                    color: seeAllMode ? Colors.light.background : Colors.light.darkNeutral,
                  }}
                >
                  Show All Animals
                </Text>
              </Pressable>
            </View>

            {!seeAllMode && (
              <View style={{ width: '100%', maxWidth: 400 }}>
                {/* Search Input with Dropdown */}
                <View style={{ marginBottom: 20 }}>
                  <View style={[LoginScreenStyles.inputContainer, { marginBottom: showDropdown && filteredAnimals.length > 0 ? 0 : 0 }]}>
                    <Ionicons
                      name="search-outline"
                      size={18}
                      color={Colors.light.primaryGreen}
                      style={LoginScreenStyles.inputIcon}
                    />
                    <TextInput
                      ref={searchInputRef}
                      style={LoginScreenStyles.inputWithIcon}
                      placeholder="Type 2+ characters..."
                      placeholderTextColor={Colors.light.darkNeutral}
                      value={searchQuery}
                      onChangeText={handleSearch}
                      editable={!isSubmitting}
                    />
                    {searchQuery.length > 0 && (
                      <Pressable
                        onPress={() => {
                          setSearchQuery('');
                          setFilteredAnimals([]);
                          setShowDropdown(false);
                        }}
                        style={{ paddingRight: 12 }}
                      >
                        <Ionicons name="close-circle" size={18} color={Colors.light.primaryGreen} />
                      </Pressable>
                    )}
                  </View>

                  {/* Dropdown Results */}
                  {showDropdown && filteredAnimals.length > 0 && (
                    <View
                      style={{
                        backgroundColor: Colors.light.cardBackground,
                        borderWidth: 1,
                        borderColor: Colors.light.secondaryGreen,
                        borderTopWidth: 0,
                        borderBottomLeftRadius: 10,
                        borderBottomRightRadius: 10,
                        maxHeight: 250,
                        overflow: 'scroll',
                      }}
                    >
                      {filteredAnimals.map((animal) => (
                        <View key={animal._id}>
                          {renderAnimalItem({ item: animal })}
                        </View>
                      ))}
                    </View>
                  )}

                  {showDropdown && searchQuery.length >= 2 && filteredAnimals.length === 0 && (
                    <View
                      style={{
                        backgroundColor: Colors.light.cardBackground,
                        borderWidth: 1,
                        borderColor: Colors.light.secondaryGreen,
                        borderTopWidth: 0,
                        borderBottomLeftRadius: 10,
                        borderBottomRightRadius: 10,
                        paddingVertical: 12,
                        paddingHorizontal: 15,
                      }}
                    >
                      <Text style={{ color: Colors.light.darkNeutral, textAlign: 'center' }}>
                        No animals found
                      </Text>
                    </View>
                  )}
                </View>

                {/* Selected Animals Display */}
                {selectedAnimals.length > 0 && (
                  <View style={{ width: '100%', marginBottom: 20 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.light.darkNeutral, marginBottom: 10 }}>
                      Selected ({selectedAnimals.length}):
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {selectedAnimals.map((animalId) => {
                        const animal = animals.find((a) => a._id === animalId);
                        return animal ? (
                          <View
                            key={animalId}
                            style={{
                              backgroundColor: Colors.light.primaryGreen,
                              paddingHorizontal: 12,
                              paddingVertical: 8,
                              borderRadius: 20,
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 6,
                            }}
                          >
                            <Text style={{ color: Colors.light.background, fontSize: 13, fontWeight: '500' }}>
                              {animal.commonName}
                            </Text>
                            <Pressable onPress={() => toggleAnimalSelection(animal)}>
                              <Ionicons name="close-circle" size={16} color={Colors.light.background} />
                            </Pressable>
                          </View>
                        ) : null;
                      })}
                    </View>
                  </View>
                )}
              </View>
            )}
          </>
        )}

        {/* Complete Button */}
        <Pressable
          style={[LoginScreenStyles.button, { marginTop: 30 }]}
          onPress={handleComplete}
          disabled={isSubmitting || (isLoading && !seeAllMode)}
        >
          {isSubmitting ? (
            <View style={LoginScreenStyles.buttonContent}>
              <ActivityIndicator color={Colors.light.buttonText} size="small" />
              <Text style={LoginScreenStyles.buttonTextLoading}>Completing...</Text>
            </View>
          ) : (
            <View style={LoginScreenStyles.buttonContent}>
              <Text style={LoginScreenStyles.buttonText}>Complete Setup</Text>
              <Ionicons name="checkmark-done" size={18} color={Colors.light.buttonText} />
            </View>
          )}
        </Pressable>

        {/* Back Button */}
        <Pressable onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={[LoginScreenStyles.linkText, { textAlign: 'center' }]}>Back</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
