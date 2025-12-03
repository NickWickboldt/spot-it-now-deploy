import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Image,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { apiGetMySightings } from '../../api/sighting';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HEADER_HEIGHT = 320;

interface Sighting {
  _id: string;
  animalId?: string | { _id: string; commonName?: string; iconPath?: string } | null;
  aiIdentification?: string | null;
  confidence?: number | null;
  mediaUrls?: string[];
  createdAt?: string;
  location?: {
    coordinates?: [number, number];
  };
}

// Helper to extract animal ID from potentially populated animalId field
function getAnimalIdString(animalId: string | { _id: string } | null | undefined): string | null {
  if (!animalId) return null;
  if (typeof animalId === 'string') return animalId;
  if (typeof animalId === 'object' && animalId._id) return animalId._id;
  return null;
}

// Helper: choose the best image URL from media list
function pickImageUrl(list?: string[]): string | undefined {
  if (!Array.isArray(list) || list.length === 0) return undefined;
  const isImage = (u: string) => /\.(jpg|jpeg|png|webp|heic|heif)$/i.test(u.split('?')[0]);
  const img = list.find(isImage) || list[0];
  return img;
}

// Prefer a tiny transformed Cloudinary URL when possible
function toOptimizedUrl(uri?: string, size = 400): string | undefined {
  if (!uri || typeof uri !== 'string') return uri;
  try {
    const u = new URL(uri);
    if (u.hostname.includes('cloudinary.com')) {
      const injected = `/upload/c_fill,w_${size},h_${size},q_80,f_auto/`;
      const path = u.pathname;
      const idx = path.indexOf('/upload/');
      if (idx !== -1) {
        const before = path.slice(0, idx);
        const after = path.slice(idx + '/upload/'.length);
        u.pathname = `${before}${injected}${after}`;
        return u.toString();
      }
    }
    return uri;
  } catch {
    return uri;
  }
}

// Get animal icon from iconPath field
const getAnimalIcon = (iconPath: string | undefined) => {
  if (!iconPath) return null;
  
  const iconMap: Record<string, any> = {
    'Arachnids.png': require('../../assets/animalIcons/Arachnids.png'),
    'Bees, Wasps, Ants.png': require('../../assets/animalIcons/Bees, Wasps, Ants.png'),
    'Beetles.png': require('../../assets/animalIcons/Beetles.png'),
    'Butterflies & Moths.png': require('../../assets/animalIcons/Butterflies & Moths.png'),
    'Caecilians.png': require('../../assets/animalIcons/Caecilians.png'),
    'Crustaceans.png': require('../../assets/animalIcons/Crustaceans.png'),
    'Dragonflies.png': require('../../assets/animalIcons/Dragonflies.png'),
    'Flightless Birds.png': require('../../assets/animalIcons/Flightless Birds.png'),
    'Freshwater Fish.png': require('../../assets/animalIcons/Freshwater Fish.png'),
    'Frogs & Toads.png': require('../../assets/animalIcons/Frogs & Toads.png'),
    'Insects.png': require('../../assets/animalIcons/Insects.png'),
    'Large Birds.png': require('../../assets/animalIcons/Large Birds.png'),
    'Large Fish.png': require('../../assets/animalIcons/Large Fish.png'),
    'Large Mammals.png': require('../../assets/animalIcons/Large Mammals.png'),
    'Large Reptiles.png': require('../../assets/animalIcons/Large Reptiles.png'),
    'Medium Birds.png': require('../../assets/animalIcons/Medium Birds.png'),
    'Medium Fish.png': require('../../assets/animalIcons/Medium Fish.png'),
    'Medium Mammals.png': require('../../assets/animalIcons/Medium Mammals.png'),
    'Medium Reptiles.png': require('../../assets/animalIcons/Medium Reptiles.png'),
    'Mollusks.png': require('../../assets/animalIcons/Mollusks.png'),
    'Salamanders & Newts.png': require('../../assets/animalIcons/Salamanders & Newts.png'),
    'Saltwater Fish.png': require('../../assets/animalIcons/Saltwater Fish.png'),
    'Sea Mammals.png': require('../../assets/animalIcons/Sea Mammals.png'),
    'Small Birds.png': require('../../assets/animalIcons/Small Birds.png'),
    'Small Fish.png': require('../../assets/animalIcons/Small Fish.png'),
    'Small Mammals.png': require('../../assets/animalIcons/Small Mammals.png'),
    'Small Reptiles.png': require('../../assets/animalIcons/Small Reptiles.png'),
    'Snakes.png': require('../../assets/animalIcons/Snakes.png'),
    'Turtles & Tortoises.png': require('../../assets/animalIcons/Turtles & Tortoises.png'),
    'Worms.png': require('../../assets/animalIcons/Worms.png'),
  };
  return iconMap[iconPath] || null;
};

// Info Card Component
const InfoCard = ({ icon, label, value, color = Colors.light.primaryGreen }: { 
  icon: string; 
  label: string; 
  value: string;
  color?: string;
}) => (
  <View style={styles.infoCard}>
    <View style={[styles.infoCardIcon, { backgroundColor: `${color}15` }]}>
      <Icon name={icon} size={18} color={color} />
    </View>
    <View style={styles.infoCardContent}>
      <Text style={styles.infoCardLabel}>{label}</Text>
      <Text style={styles.infoCardValue}>{value}</Text>
    </View>
  </View>
);

// Sighting Thumbnail Component
const SightingThumbnail = ({ sighting, onPress, index }: { 
  sighting: Sighting; 
  onPress: () => void;
  index: number;
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        delay: index * 50,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        delay: index * 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const raw = pickImageUrl(sighting.mediaUrls);
  const thumb = toOptimizedUrl(raw, 200);
  const date = sighting.createdAt ? new Date(sighting.createdAt).toLocaleDateString() : '';

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity style={styles.sightingThumb} onPress={onPress} activeOpacity={0.8}>
        {thumb ? (
          <Image source={{ uri: thumb }} style={styles.sightingThumbImage} />
        ) : (
          <View style={styles.sightingThumbPlaceholder}>
            <Icon name="image" size={24} color={Colors.light.darkNeutral} />
          </View>
        )}
        <View style={styles.sightingThumbOverlay}>
          <Text style={styles.sightingThumbDate}>{date}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function AnimalDetailScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const params = useLocalSearchParams();
  
  // Parse animal data from params
  const animal = useMemo(() => {
    try {
      return params.animal ? JSON.parse(params.animal as string) : null;
    } catch {
      return null;
    }
  }, [params.animal]);

  const discoveryInfo = useMemo(() => {
    try {
      return params.discoveryInfo ? JSON.parse(params.discoveryInfo as string) : null;
    } catch {
      return null;
    }
  }, [params.discoveryInfo]);

  const [userSightings, setUserSightings] = useState<Sighting[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  // Fetch user's sightings for this animal
  useEffect(() => {
    const fetchSightings = async () => {
      if (!animal?._id) return;
      try {
        const response = await apiGetMySightings(token);
        const allSightings = (response.data || []) as Sighting[];
        const filtered = allSightings.filter(s => getAnimalIdString(s.animalId) === animal._id);
        // Sort newest first
        filtered.sort((a, b) => {
          const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return tb - ta;
        });
        setUserSightings(filtered);
      } catch (error) {
        console.error('Error fetching sightings:', error);
      }
    };
    fetchSightings();
  }, [animal?._id, token]);

  // Get hero image (user's latest sighting or animal's default image)
  const heroImage = useMemo(() => {
    if (userSightings.length > 0) {
      const raw = pickImageUrl(userSightings[0].mediaUrls);
      return toOptimizedUrl(raw, 800);
    }
    if (animal?.imageUrls?.length > 0) {
      return toOptimizedUrl(animal.imageUrls[0], 800);
    }
    return null;
  }, [userSightings, animal]);

  const allSightingImages = useMemo(() => {
    return userSightings
      .map(s => pickImageUrl(s.mediaUrls))
      .filter(Boolean) as string[];
  }, [userSightings]);

  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT],
    outputRange: [0, -HEADER_HEIGHT / 2],
    extrapolate: 'clamp',
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT / 2],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const titleScale = scrollY.interpolate({
    inputRange: [-100, 0],
    outputRange: [1.1, 1],
    extrapolate: 'clamp',
  });

  if (!animal) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text>Animal not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: Colors.light.primaryGreen }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isDiscovered = discoveryInfo?.spotted || false;
  const animalIconSource = getAnimalIcon(animal.iconPath);

  const getRarityColor = (rarity: string) => {
    switch (rarity?.toLowerCase()) {
      case 'legendary': return '#FFD700';
      case 'rare': return '#9B59B6';
      case 'uncommon': return '#3498DB';
      default: return Colors.light.primaryGreen;
    }
  };

  const getConservationColor = (status: string) => {
    const s = status?.toLowerCase() || '';
    if (s.includes('endangered') || s.includes('critical')) return '#E74C3C';
    if (s.includes('vulnerable') || s.includes('threatened')) return '#F39C12';
    if (s.includes('near')) return '#F1C40F';
    return Colors.light.primaryGreen;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* Animated Header Image */}
      <Animated.View 
        style={[
          styles.headerImage,
          { 
            transform: [{ translateY: headerTranslateY }],
            opacity: headerOpacity,
          }
        ]}
      >
        {heroImage ? (
          <Image source={{ uri: heroImage }} style={styles.heroImage} />
        ) : (
          <LinearGradient
            colors={[Colors.light.primaryGreen, Colors.light.secondaryGreen]}
            style={styles.heroPlaceholder}
          >
            {animalIconSource ? (
              <Image source={animalIconSource} style={{ width: 100, height: 100, opacity: 0.8 }} />
            ) : (
              <Icon name="paw" size={80} color="rgba(255,255,255,0.5)" />
            )}
          </LinearGradient>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.headerGradient}
        />
        
        {/* Discovery Badge */}
        {isDiscovered && (
          <View style={styles.discoveryBadge}>
            <Icon name="check-circle" size={14} color="#fff" />
            <Text style={styles.discoveryBadgeText}>Discovered</Text>
          </View>
        )}
      </Animated.View>

      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <View style={styles.backButtonInner}>
          <Icon name="arrow-left" size={18} color="#fff" />
        </View>
      </TouchableOpacity>

      {/* Content */}
      <Animated.ScrollView
        style={{ flex: 1, zIndex: 5 }}
        contentContainerStyle={styles.scrollContent}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {/* Spacer for header */}
        <View style={{ height: HEADER_HEIGHT - 40 }} />
        
        {/* Main Content Card */}
        <Animated.View style={[styles.contentCard, { opacity: fadeAnim }]}>
          {/* Title Section */}
          <View style={styles.titleSection}>
            <Animated.Text style={[styles.animalName, { transform: [{ scale: titleScale }] }]}>
              {animal.commonName}
            </Animated.Text>
            {animal.scientificName && (
              <Text style={styles.scientificName}>{animal.scientificName}</Text>
            )}
            
            {/* Quick Info Badges */}
            <View style={styles.badgeRow}>
              {animal.category && (
                <View style={styles.categoryBadge}>
                  <Icon name="tag" size={10} color={Colors.light.primaryGreen} />
                  <Text style={styles.categoryBadgeText}>{animal.category}</Text>
                </View>
              )}
              {animal.rarityLevel && (
                <View style={[styles.rarityBadge, { backgroundColor: `${getRarityColor(animal.rarityLevel)}20` }]}>
                  <Icon name="star" size={10} color={getRarityColor(animal.rarityLevel)} />
                  <Text style={[styles.rarityBadgeText, { color: getRarityColor(animal.rarityLevel) }]}>
                    {animal.rarityLevel}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Discovery Info */}
          {isDiscovered && discoveryInfo && (
            <View style={styles.discoverySection}>
              <View style={styles.sectionHeader}>
                <Icon name="trophy" size={16} color={Colors.light.primaryGreen} />
                <Text style={styles.sectionTitle}>Your Discovery</Text>
              </View>
              
              <View style={styles.discoveryStats}>
                {discoveryInfo.discoveredAt && (
                  <InfoCard 
                    icon="calendar" 
                    label="Discovered On" 
                    value={new Date(discoveryInfo.discoveredAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  />
                )}
                <InfoCard 
                  icon="camera" 
                  label="Total Sightings" 
                  value={`${userSightings.length}`}
                />
              </View>

              {/* Verification Badges */}
              <View style={styles.verificationRow}>
                {discoveryInfo.verifiedByAI && (
                  <View style={[styles.verificationBadge, { backgroundColor: '#4CAF5020' }]}>
                    <Icon name="robot" size={12} color="#4CAF50" />
                    <Text style={[styles.verificationText, { color: '#4CAF50' }]}>AI Verified</Text>
                  </View>
                )}
                {discoveryInfo.verifiedByUser && (
                  <View style={[styles.verificationBadge, { backgroundColor: '#FFC10720' }]}>
                    <Icon name="user" size={12} color="#F59E0B" />
                    <Text style={[styles.verificationText, { color: '#F59E0B' }]}>Self Verified</Text>
                  </View>
                )}
                {discoveryInfo.verifiedByCommunity && (
                  <View style={[styles.verificationBadge, { backgroundColor: '#2196F320' }]}>
                    <Icon name="users" size={12} color="#2196F3" />
                    <Text style={[styles.verificationText, { color: '#2196F3' }]}>Community Verified</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Your Sightings Gallery */}
          {userSightings.length > 0 && (
            <View style={styles.sightingsSection}>
              <View style={styles.sectionHeader}>
                <Icon name="camera" size={16} color={Colors.light.primaryGreen} />
                <Text style={styles.sectionTitle}>Your Photos</Text>
                <Text style={styles.sectionCount}>{userSightings.length}</Text>
              </View>
              
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.sightingsScroll}
              >
                {userSightings.map((sighting, index) => (
                  <SightingThumbnail
                    key={sighting._id}
                    sighting={sighting}
                    index={index}
                    onPress={() => {
                      const img = pickImageUrl(sighting.mediaUrls);
                      if (img) {
                        setSelectedImage(toOptimizedUrl(img, 1200) || img);
                        setCurrentImageIndex(index);
                      }
                    }}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {/* About Section */}
          {animal.description && (
            <View style={styles.aboutSection}>
              <View style={styles.sectionHeader}>
                <Icon name="info-circle" size={16} color={Colors.light.primaryGreen} />
                <Text style={styles.sectionTitle}>About</Text>
              </View>
              <Text style={styles.description}>{animal.description}</Text>
            </View>
          )}

          {/* Details Section */}
          <View style={styles.detailsSection}>
            <View style={styles.sectionHeader}>
              <Icon name="list" size={16} color={Colors.light.primaryGreen} />
              <Text style={styles.sectionTitle}>Details</Text>
            </View>
            
            <View style={styles.detailsGrid}>
              {animal.conservationStatus && (
                <InfoCard 
                  icon="shield" 
                  label="Conservation" 
                  value={animal.conservationStatus}
                  color={getConservationColor(animal.conservationStatus)}
                />
              )}
              {animal.rarityLevel && (
                <InfoCard 
                  icon="diamond" 
                  label="Rarity" 
                  value={animal.rarityLevel}
                  color={getRarityColor(animal.rarityLevel)}
                />
              )}
              {animal.category && (
                <InfoCard 
                  icon="folder" 
                  label="Category" 
                  value={animal.category}
                />
              )}
            </View>
          </View>

          {/* Not Discovered Message */}
          {!isDiscovered && (
            <View style={styles.notDiscoveredSection}>
              <View style={styles.notDiscoveredContent}>
                <Icon name="search" size={40} color={Colors.light.darkNeutral} style={{ opacity: 0.4 }} />
                <Text style={styles.notDiscoveredTitle}>Not Yet Discovered</Text>
                <Text style={styles.notDiscoveredText}>
                  Go out and find this animal to add it to your collection!
                </Text>
                <TouchableOpacity 
                  style={styles.spotItButton}
                  onPress={() => router.push('/(tabs)/spotit')}
                >
                  <Icon name="camera" size={16} color="#fff" />
                  <Text style={styles.spotItButtonText}>Spot It Now</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Bottom Padding */}
          <View style={{ height: 40 }} />
        </Animated.View>
      </Animated.ScrollView>

      {/* Fullscreen Image Modal */}
      {selectedImage && (
        <View style={styles.imageModal}>
          <TouchableOpacity 
            style={styles.imageModalClose} 
            onPress={() => setSelectedImage(null)}
          >
            <Icon name="times" size={24} color="#fff" />
          </TouchableOpacity>
          <Image 
            source={{ uri: selectedImage }} 
            style={styles.fullscreenImage}
            resizeMode="contain"
          />
          {allSightingImages.length > 1 && (
            <View style={styles.imageCounter}>
              <Text style={styles.imageCounterText}>
                {currentImageIndex + 1} / {allSightingImages.length}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  headerImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HEADER_HEIGHT,
    zIndex: 1,
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 150,
  },
  discoveryBadge: {
    position: 'absolute',
    top: 50,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.primaryGreen,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  discoveryBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 16,
    zIndex: 10,
  },
  backButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingTop: 0,
  },
  contentCard: {
    backgroundColor: Colors.light.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    paddingTop: 24,
    paddingHorizontal: 20,
    minHeight: SCREEN_HEIGHT - HEADER_HEIGHT + 100,
    zIndex: 10,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  titleSection: {
    marginBottom: 24,
  },
  animalName: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.light.mainText,
    letterSpacing: -0.5,
  },
  scientificName: {
    fontSize: 16,
    fontStyle: 'italic',
    color: Colors.light.darkNeutral,
    marginTop: 4,
    opacity: 0.8,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.light.primaryGreen}15`,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 5,
  },
  categoryBadgeText: {
    color: Colors.light.primaryGreen,
    fontSize: 12,
    fontWeight: '600',
  },
  rarityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 5,
  },
  rarityBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.mainText,
  },
  sectionCount: {
    fontSize: 14,
    color: Colors.light.darkNeutral,
    marginLeft: 'auto',
  },
  discoverySection: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#f0f9f0',
    borderRadius: 16,
  },
  discoveryStats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  infoCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    gap: 10,
  },
  infoCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCardContent: {
    flex: 1,
  },
  infoCardLabel: {
    fontSize: 11,
    color: Colors.light.darkNeutral,
    marginBottom: 2,
  },
  infoCardValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.mainText,
  },
  verificationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  verificationText: {
    fontSize: 11,
    fontWeight: '600',
  },
  sightingsSection: {
    marginBottom: 24,
  },
  sightingsScroll: {
    paddingRight: 20,
    gap: 12,
  },
  sightingThumb: {
    width: 140,
    height: 140,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Colors.light.lightGrey,
  },
  sightingThumbImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  sightingThumbPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sightingThumbOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  sightingThumbDate: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  aboutSection: {
    marginBottom: 24,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    color: Colors.light.darkNeutral,
  },
  detailsSection: {
    marginBottom: 24,
  },
  detailsGrid: {
    gap: 12,
  },
  notDiscoveredSection: {
    marginTop: 8,
    marginBottom: 24,
  },
  notDiscoveredContent: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: Colors.light.lightGrey,
    borderRadius: 16,
  },
  notDiscoveredTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.mainText,
    marginTop: 16,
    marginBottom: 8,
  },
  notDiscoveredText: {
    fontSize: 14,
    color: Colors.light.darkNeutral,
    textAlign: 'center',
    marginBottom: 20,
  },
  spotItButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.primaryGreen,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  spotItButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  imageModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  imageModalClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    padding: 10,
    zIndex: 101,
  },
  fullscreenImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
  },
  imageCounter: {
    position: 'absolute',
    bottom: 50,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  imageCounterText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
