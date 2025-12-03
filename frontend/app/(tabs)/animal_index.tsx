import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Image, Modal, ScrollView, StatusBar, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { apiGetAllAnimals } from '../../api/animal';
import { apiGetMySightings } from '../../api/sighting';
import { apiGetUserDiscoveries } from '../../api/userDiscovery';
import { modalStyles, styles } from '../../constants/animalIndexStyle';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext';

// Animated wrapper for animal cards with staggered entrance
const AnimatedAnimalCard = ({ children, index, style, onPress, activeOpacity }: { 
  children: React.ReactNode; 
  index: number; 
  style: any;
  onPress?: () => void;
  activeOpacity?: number;
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const delay = Math.min(index * 30, 300); // Cap delay at 300ms
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(pressScale, {
      toValue: 0.95,
      useNativeDriver: true,
      tension: 100,
      friction: 5,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressScale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 5,
    }).start();
  };

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: Animated.multiply(scaleAnim, pressScale) }] }}>
      <TouchableOpacity
        style={style}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={activeOpacity}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

const SCREEN_WIDTH = Dimensions.get('window').width;

// Map category names to icon files
const getCategoryIcon = (category: string) => {
  const iconMap: Record<string, any> = {
    'Arachnids': require('../../assets/animalIcons/Arachnids.png'),
    'Bees, Wasps, Ants': require('../../assets/animalIcons/Bees, Wasps, Ants.png'),
    'Beetles': require('../../assets/animalIcons/Beetles.png'),
    'Butterflies & Moths': require('../../assets/animalIcons/Butterflies & Moths.png'),
    'Caecilians': require('../../assets/animalIcons/Caecilians.png'),
    'Crustaceans': require('../../assets/animalIcons/Crustaceans.png'),
    'Dragonflies': require('../../assets/animalIcons/Dragonflies.png'),
    'Flightless Birds': require('../../assets/animalIcons/Flightless Birds.png'),
    'Freshwater Fish': require('../../assets/animalIcons/Freshwater Fish.png'),
    'Frogs & Toads': require('../../assets/animalIcons/Frogs & Toads.png'),
    'Insects': require('../../assets/animalIcons/Insects.png'),
    'Large Birds': require('../../assets/animalIcons/Large Birds.png'),
    'Large Fish': require('../../assets/animalIcons/Large Fish.png'),
    'Large Mammals': require('../../assets/animalIcons/Large Mammals.png'),
    'Large Reptiles': require('../../assets/animalIcons/Large Reptiles.png'),
    'Medium Birds': require('../../assets/animalIcons/Medium Birds.png'),
    'Medium Fish': require('../../assets/animalIcons/Medium Fish.png'),
    'Medium Mammals': require('../../assets/animalIcons/Medium Mammals.png'),
    'Medium Reptiles': require('../../assets/animalIcons/Medium Reptiles.png'),
    'Mollusks': require('../../assets/animalIcons/Mollusks.png'),
    'Salamanders & Newts': require('../../assets/animalIcons/Salamanders & Newts.png'),
    'Saltwater Fish': require('../../assets/animalIcons/Saltwater Fish.png'),
    'Sea Mammals': require('../../assets/animalIcons/Sea Mammals.png'),
    'Small Birds': require('../../assets/animalIcons/Small Birds.png'),
    'Small Fish': require('../../assets/animalIcons/Small Fish.png'),
    'Small Mammals': require('../../assets/animalIcons/Small Mammals.png'),
    'Small Reptiles': require('../../assets/animalIcons/Small Reptiles.png'),
    'Snakes': require('../../assets/animalIcons/Snakes.png'),
    'Turtles & Tortoises': require('../../assets/animalIcons/Turtles & Tortoises.png'),
    'Worms': require('../../assets/animalIcons/Worms.png'),
  };
  return iconMap[category] || null;
};

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

interface Animal {
  _id: string;
  commonName: string;
  scientificName: string;
  description: string;
  category: string;
  rarityLevel: string;
  imageUrls: string[];
  conservationStatus: string;
  iconPath?: string;
}

interface EntryMeta {
  name: string;
  spotted: boolean;
  aiCount: number;
  userCount: number;
  level?: 'AI' | 'USER' | 'COMMUNITY';
  count: number;
  discoveredAt?: string;
  verifiedByAI?: boolean;
  verifiedByUser?: boolean;
  verifiedByCommunity?: boolean;
}

interface AnimalCategory {
  title: string;
  data: Animal[];
}

interface Sighting {
  _id: string;
  animalId?: string | null;
  aiIdentification?: string | null;
  confidence?: number | null;
  mediaUrls?: string[];
  createdAt?: string;
}

export default function AnimalDexScreen() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userSightings, setUserSightings] = useState<any[]>([]);
  const [userDiscoveries, setUserDiscoveries] = useState<any[]>([]);
  const [mapped, setMapped] = useState<Record<string, EntryMeta>>({});
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [unknownGroupModalVisible, setUnknownGroupModalVisible] = useState(false);
  const [reopenUnknownAfterPreview, setReopenUnknownAfterPreview] = useState(false);
  const [selectedUnknownKey, setSelectedUnknownKey] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState('');
  const [viewMode, setViewMode] = useState<'KNOWN' | 'UNKNOWN'>('KNOWN');
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [animalCategories, setAnimalCategories] = useState<AnimalCategory[]>([]);
  // Admin-only linking moved to Admin page

  // Fetch animals from database on mount and when the tab gains focus
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch animals, discoveries, and my sightings in parallel
      const [animalsResponse, discoveriesResponse, mySightingsResponse] = await Promise.all([
        apiGetAllAnimals(token),
        apiGetUserDiscoveries(token).catch(() => ({ data: null })),
        apiGetMySightings(token).catch(() => ({ data: [] }))
      ]);

      const fetchedAnimals = animalsResponse.data || [];
      const userDiscoveryData = discoveriesResponse.data;
      const mySightings = (mySightingsResponse.data || []) as Sighting[];

      // Extract discoveries from the correct field
      let discoveries = [] as any[];
      if (userDiscoveryData && userDiscoveryData.animalDiscoveries) {
        discoveries = userDiscoveryData.animalDiscoveries; // Use the detailed discoveries
        console.log('🔍 Discovery data received:', {
          totalDiscoveries: discoveries.length,
          firstDiscovery: discoveries[0] || 'none',
          sampleAnimal: discoveries[0]?.animal || 'no animal data'
        });
      } else {
        console.log('❌ No discovery data found:', userDiscoveryData);
      }

      setAnimals(fetchedAnimals);
      setUserDiscoveries(discoveries);
      setUserSightings(mySightings);

      // Group animals by category
      const categories: AnimalCategory[] = [];
      const categoryMap: Record<string, Animal[]> = {};

      fetchedAnimals.forEach((animal: Animal) => {
        if (!categoryMap[animal.category]) {
          categoryMap[animal.category] = [];
        }
        categoryMap[animal.category].push(animal);
      });

      Object.entries(categoryMap).forEach(([title, data]) => {
        categories.push({ title, data });
      });

      setAnimalCategories(categories);

      // Set default selected tab to first category
      if (categories.length > 0 && !selectedTab) {
        setSelectedTab(categories[0].title);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [token, selectedTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  // Admin linking UI removed from this screen; use Admin page instead
  // Build a per-animal thumbnail from the user's own sightings (latest wins)
  // Helper: choose the best image URL from media list (skip videos when possible)
  function pickImageUrl(list?: string[]): string | undefined {
    if (!Array.isArray(list) || list.length === 0) return undefined;
    const isImage = (u: string) => /\.(jpg|jpeg|png|webp|heic|heif)$/i.test(u.split('?')[0]);
    const img = list.find(isImage) || list[0];
    return img;
  }

  const userThumbByAnimalId = useMemo(() => {
    const map: Record<string, string> = {};
    const items = (userSightings as Sighting[])
      .filter(s => !!s.animalId && Array.isArray(s.mediaUrls) && s.mediaUrls.length > 0);

    console.log('🖼️ Building userThumbByAnimalId map:', {
      totalSightings: userSightings.length,
      sightingsWithAnimalId: items.length,
      sampleSighting: items[0] || 'none'
    });

    // Sort newest first so latest sighting provides the thumb
    items.sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });

    items.forEach(s => {
      const aid = String(s.animalId);
      if (!map[aid]) {
        const raw = pickImageUrl(s.mediaUrls);
        if (raw) {
          const tiny = toTinyPreview(raw, 96) || raw;
          map[aid] = tiny;
          console.log(`✅ Mapped image for animal ${aid}:`, tiny.substring(0, 80) + '...');
        }
      }
    });
    
    console.log('🖼️ Final userThumbByAnimalId map:', Object.keys(map).length, 'animals with images');
    return map;
  }, [userSightings]);

  // Prefer a tiny transformed Cloudinary URL when possible
  function toTinyPreview(uri?: string, size = 112): string | undefined {
    if (!uri || typeof uri !== 'string') return uri;
    try {
      const u = new URL(uri);
      // Cloudinary URL pattern includes '/image/upload/' or '/video/upload/'
      if (u.hostname.includes('cloudinary.com')) {
        // More aggressive optimization: lower quality, auto format, progressive
        const injected = `/upload/c_fill,w_${size},h_${size},q_70,f_auto,fl_progressive/`;
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


  const getAnimalImage = (animal: Animal) => {
    // Use the first image URL if available, otherwise return null to show icon placeholder
    if (animal.imageUrls && animal.imageUrls.length > 0) {
      return toTinyPreview(animal.imageUrls[0], 96) || animal.imageUrls[0];
    }
    // Return null to indicate no image - will show category icon instead
    return null;
  };

  const lowerToCanonical = useMemo(() => {
    const out: Record<string, string> = {};
    animals.forEach(animal => {
      out[animal.commonName.toLowerCase()] = animal.commonName;
    });
    return out;
  }, [animals]);

  const idToCommon = useMemo(() => {
    const out: Record<string, string> = {};
    animals.forEach(animal => {
      out[animal._id] = animal.commonName;
    });
    return out;
  }, [animals]);

  useEffect(() => {
    const map: Record<string, EntryMeta> = {};
    animals.forEach(animal => {
      map[animal.commonName] = {
        name: animal.commonName,
        spotted: false,
        aiCount: 0,
        userCount: 0,
        count: 0,
        level: undefined
      };
    });

    // Mark discovered animals from UserDiscovery system
    console.log('🗺️ Processing discoveries:', userDiscoveries.length, 'discoveries');
    (userDiscoveries || []).forEach((discovery, index) => {
      console.log(`🔍 Discovery ${index + 1}:`, {
        hasAnimal: !!discovery.animal,
        animalName: discovery.animal?.commonName || 'no name',
        discoveredAt: discovery.discoveredAt,
        verifiedByAI: discovery.verifiedByAI || false,
        verifiedByUser: discovery.verifiedByUser || false,
        verifiedByCommunity: discovery.verifiedByCommunity || false
      });

      // discovery should be from animalDiscoveries array with populated animal data
      if (!discovery.animal || !discovery.animal.commonName) return;

      const commonName = discovery.animal.commonName;
      if (!map[commonName]) {
        console.log(`⚠️ Animal "${commonName}" not found in animals list`);
        return;
      }

      const meta = map[commonName];
      meta.spotted = true;
      meta.discoveredAt = discovery.discoveredAt;
      meta.verifiedByAI = discovery.verifiedByAI || false;
      meta.verifiedByUser = discovery.verifiedByUser || false;
      meta.verifiedByCommunity = discovery.verifiedByCommunity || false;

      const verificationTypes = [];
      if (meta.verifiedByAI) verificationTypes.push('AI');
      if (meta.verifiedByUser) verificationTypes.push('USER');
      if (meta.verifiedByCommunity) verificationTypes.push('COMMUNITY');

      console.log(`✅ Marked "${commonName}" as discovered (verified by: ${verificationTypes.join(', ') || 'none'})`);

      // Count verification-based discoveries
      if (meta.verifiedByUser) {
        meta.userCount += 1;
      }
      if (meta.verifiedByAI) {
        meta.aiCount += 1;
      }

      meta.count = meta.aiCount + meta.userCount;

      if (meta.userCount > 0 && meta.aiCount === 0) meta.level = 'USER';
      else if (meta.aiCount > 0 && meta.userCount === 0) meta.level = 'AI';
      else if (meta.userCount > 0 && meta.aiCount > 0) meta.level = 'COMMUNITY';
    });

    // Legacy support for old sighting system (if still needed)
    (userSightings || []).forEach(s => {
      const ident = (s as any).identification;
      if (!ident || !ident.commonName) return;
      const keyLower = String(ident.commonName).toLowerCase().trim();
      const canonical = lowerToCanonical[keyLower];
      if (!canonical || !map[canonical]) return;
      const meta = map[canonical];
      if (ident.source === 'USER') meta.userCount += 1;
      else if (ident.source === 'AI') meta.aiCount += 1;
      else meta.aiCount += 1;
      meta.count = meta.aiCount + meta.userCount;
      meta.spotted = true;
      if (meta.userCount > 0 && meta.aiCount === 0) meta.level = 'USER';
      else if (meta.aiCount > 0 && meta.userCount === 0) meta.level = 'AI';
      else if (meta.userCount > 0 && meta.aiCount > 0) meta.level = 'COMMUNITY';
    });

    // New: mark as discovered using sighting.animalId (mapping-aware)
    (userSightings || []).forEach(s => {
      const aId = s.animalId ? String(s.animalId) : '';
      if (!aId) return;
      const common = idToCommon[aId];
      if (!common || !map[common]) return;
      const meta = map[common];
      meta.spotted = true;
    });

    console.log('🎯 Final mapping results:', {
      totalAnimals: Object.keys(map).length,
      spottedAnimals: Object.values(map).filter(m => m.spotted).map(m => m.name),
      mappedEntries: Object.entries(map).slice(0, 3) // First 3 for debugging
    });

    setMapped(map);
  }, [userSightings, userDiscoveries, lowerToCanonical]);

  const currentSection = useMemo(() => {
    const section = animalCategories.find(sec => sec.title === selectedTab);
    if (!section) return { title: '', data: [] };
    if (!search.trim()) return section;
    const q = search.toLowerCase();
    return {
      title: section.title,
      data: section.data.filter(animal => animal.commonName.toLowerCase().includes(q))
    };
  }, [selectedTab, search, animalCategories]);

  const navigateToAnimalDetail = (animal: Animal) => {
    const discoveryInfo = mapped[animal.commonName] || { spotted: false };
    router.push({
      pathname: '/(user)/animal_detail',
      params: {
        animal: JSON.stringify(animal),
        discoveryInfo: JSON.stringify(discoveryInfo),
      },
    });
  };

  // Helpers to show/hide the full-screen preview without stacking Modals
  const openPreview = useCallback((uri: string) => {
    if (unknownGroupModalVisible) {
      setReopenUnknownAfterPreview(true);
      setUnknownGroupModalVisible(false);
    }
    setPreviewImage(uri);
  }, [unknownGroupModalVisible]);

  const closePreview = useCallback(() => {
    setPreviewImage(null);
    if (reopenUnknownAfterPreview) {
      setReopenUnknownAfterPreview(false);
      setUnknownGroupModalVisible(true);
    }
  }, [reopenUnknownAfterPreview]);

  const unknownGroups = useMemo(() => {
    const list = (userSightings as Sighting[]).filter(s => !s.animalId);
    const groups: Record<string, Sighting[]> = {};
    list.forEach(s => {
      const key = (s.aiIdentification || 'Unknown identification').trim().toLowerCase();
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    });
    // Sort each group newest first
    Object.values(groups).forEach(arr => arr.sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    }));
    // Order groups by their latest sighting date
    const ordered = Object.entries(groups).sort(([, a], [, b]) => {
      const ta = a[0]?.createdAt ? new Date(a[0].createdAt!).getTime() : 0;
      const tb = b[0]?.createdAt ? new Date(b[0].createdAt!).getTime() : 0;
      return tb - ta;
    });
    return ordered.map(([key, arr]) => ({ key, title: arr[0]?.aiIdentification || 'Unknown identification', items: arr }));
  }, [userSightings]);

  const renderKnownUnknownToggle = () => (
    <View style={{ 
      flexDirection: 'row', 
      backgroundColor: 'rgba(255,255,255,0.2)', 
      borderRadius: 25, 
      padding: 4,
      marginBottom: 16
    }}>
      <TouchableOpacity
        onPress={() => setViewMode('KNOWN')}
        style={{
          flex: 1,
          paddingVertical: 8,
          paddingHorizontal: 16,
          borderRadius: 20,
          backgroundColor: viewMode === 'KNOWN' ? '#fff' : 'transparent',
          alignItems: 'center'
        }}
      >
        <Text style={{ 
          color: viewMode === 'KNOWN' ? Colors.light.primaryGreen : '#fff', 
          fontWeight: '700', 
          fontSize: 14 
        }}>All Species</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => setViewMode('UNKNOWN')}
        style={{
          flex: 1,
          paddingVertical: 8,
          paddingHorizontal: 16,
          borderRadius: 20,
          backgroundColor: viewMode === 'UNKNOWN' ? '#fff' : 'transparent',
          alignItems: 'center'
        }}
      >
        <Text style={{ 
          color: viewMode === 'UNKNOWN' ? Colors.light.primaryGreen : '#fff', 
          fontWeight: '700', 
          fontSize: 14 
        }}>Unknown</Text>
      </TouchableOpacity>
    </View>
  );

  const renderUnknownList = () => (
    <ScrollView contentContainerStyle={{ paddingBottom: 120, paddingTop: 16 }}>
      {unknownGroups.length === 0 ? (
        <View style={{ alignItems: 'center', paddingTop: 60 }}>
          <Icon name="search" size={48} color={Colors.light.darkNeutral} style={{ opacity: 0.3, marginBottom: 16 }} />
          <Text style={[styles.empty, { fontSize: 16, color: Colors.light.darkNeutral, opacity: 0.6 }]}>
            No unknown sightings yet.
          </Text>
          <Text style={{ fontSize: 14, color: Colors.light.darkNeutral, opacity: 0.5, marginTop: 8, textAlign: 'center', paddingHorizontal: 40 }}>
            Unidentified animals will appear here
          </Text>
        </View>
      ) : (
        <View style={{ paddingHorizontal: 20, gap: 14 }}>
          {unknownGroups.map((g) => {
            const first = g.items[0];
            const raw = pickImageUrl(first?.mediaUrls);
            const imageUri = toTinyPreview(raw, 96) || raw;
            const title = g.title;
            const count = g.items.length;
            const date = first?.createdAt ? new Date(first.createdAt).toLocaleDateString() : '';
            const avgConf = (() => {
              const vals = g.items.map(s => (typeof s.confidence === 'number' ? s.confidence! : null)).filter(v => v != null) as number[];
              if (vals.length === 0) return null;
              const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
              return Math.round(avg);
            })();
            return (
              <TouchableOpacity 
                key={g.key} 
                onPress={() => { setSelectedUnknownKey(g.key); setUnknownGroupModalVisible(true); }} 
                activeOpacity={0.7}
              >
                <View style={{ 
                  flexDirection: 'row', 
                  backgroundColor: '#fff', 
                  borderRadius: 16, 
                  overflow: 'hidden', 
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 6,
                  elevation: 3,
                }}>
                  <View style={{ 
                    width: 100, 
                    height: 100, 
                    backgroundColor: Colors.light.lightGrey, 
                    margin: 8, 
                    borderRadius: 12, 
                    overflow: 'hidden' 
                  }}>
                    {imageUri ? (
                      <Image source={{ uri: imageUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    ) : (
                      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.light.lightGrey }}>
                        <Icon name="image" size={28} color={Colors.light.darkNeutral} style={{ opacity: 0.4 }} />
                      </View>
                    )}
                  </View>
                  <View style={{ flex: 1, paddingVertical: 14, paddingRight: 14 }}>
                    <Text style={{ color: Colors.light.mainText, fontWeight: '700', fontSize: 15, marginBottom: 6 }} numberOfLines={1}>
                      {title}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <Icon name="camera" size={12} color={Colors.light.darkNeutral} style={{ opacity: 0.6, marginRight: 6 }} />
                      <Text style={{ color: Colors.light.darkNeutral, fontSize: 13, opacity: 0.75 }}>
                        {count} sighting{count > 1 ? 's' : ''}
                      </Text>
                      {avgConf != null && (
                        <>
                          <Text style={{ color: Colors.light.darkNeutral, opacity: 0.5, marginHorizontal: 6 }}>•</Text>
                          <Text style={{ color: Colors.light.darkNeutral, fontSize: 13, opacity: 0.75 }}>
                            {avgConf}% confidence
                          </Text>
                        </>
                      )}
                    </View>
                    {date && (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Icon name="clock" size={11} color={Colors.light.darkNeutral} style={{ opacity: 0.5, marginRight: 6 }} />
                        <Text style={{ color: Colors.light.darkNeutral, fontSize: 12, opacity: 0.6 }}>
                          Latest: {date}
                        </Text>
                      </View>
                    )}
                    <View style={{ 
                      marginTop: 10, 
                      backgroundColor: 'rgba(255, 152, 0, 0.1)', 
                      borderRadius: 8, 
                      paddingHorizontal: 10, 
                      paddingVertical: 4,
                      alignSelf: 'flex-start',
                      borderWidth: 1,
                      borderColor: 'rgba(255, 152, 0, 0.3)',
                    }}>
                      <Text style={{ color: '#F57C00', fontSize: 11, fontWeight: '700' }}>Unmapped</Text>
                    </View>
                  </View>
                  <Icon name="chevron-right" size={18} color={Colors.light.darkNeutral} style={{ opacity: 0.3, marginRight: 12 }} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </ScrollView>
  );

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text>Loading animals...</Text>
      </View>
    );
  }

  const selectedSection = animalCategories.find(sec => sec.title === selectedTab);
  const spotted = selectedSection?.data.filter(animal => mapped[animal.commonName]?.spotted).length || 0;
  const total = selectedSection?.data.length || 0;
  const percent = total ? Math.round((spotted / total) * 100) : 0;

  const renderTabs = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.tabsContainer}
    >
      {animalCategories.map(section => {
        const iconSource = getCategoryIcon(section.title);
        const isActive = selectedTab === section.title;
        return (
          <TouchableOpacity
            key={section.title}
            style={[
              styles.tab,
              isActive && styles.tabActive
            ]}
            onPress={() => setSelectedTab(section.title)}
          >
            <View style={{ alignItems: 'center' }}>
              {iconSource && (
                <Image 
                  source={iconSource} 
                  style={{ 
                    width: 36, 
                    height: 36, 
                    marginBottom: 6,
                    opacity: isActive ? 1 : 0.7
                  }} 
                />
              )}
              <Text style={[
                styles.tabText,
                isActive && styles.tabTextActive
              ]}>
                {section.title}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  const renderAnimalSquare = (animal: Animal, index: number) => {
    const meta = mapped[animal.commonName] || {
      name: animal.commonName,
      spotted: false,
      aiCount: 0,
      userCount: 0,
      count: 0
    } as EntryMeta;
    const spotted = meta.spotted;
    const userThumb = userThumbByAnimalId[animal._id];
    const displayImage = spotted ? (userThumb || getAnimalImage(animal)) : null;
    const animalIconSource = getAnimalIcon(animal.iconPath);
    
    return (
      <AnimatedAnimalCard
        key={animal._id}
        index={index}
        style={[styles.square, spotted ? styles.spottedSquare : styles.lockedSquare]}
        onPress={() => navigateToAnimalDetail(animal)}
        activeOpacity={0.8}
      >
        {spotted && displayImage ? (
          <Image 
            source={{ uri: displayImage, cache: 'force-cache' }} 
            style={styles.animalImage}
            resizeMode="cover"
            fadeDuration={0}
          />
        ) : (
          <View style={styles.silhouette}>
            {animalIconSource ? (
              <Image source={animalIconSource} style={{ width: 40, height: 40, opacity: 0.7 }} />
            ) : (
              <Icon name="question" size={22} color={Colors.light.darkNeutral} style={{ opacity: 0.5 }} />
            )}
          </View>
        )}
        {spotted && (
          <View style={styles.spottedChip}>
            <Text style={styles.spottedChipText}>Spotted</Text>
          </View>
        )}
        <Text style={styles.animalName} numberOfLines={2}>{animal.commonName}</Text>
      </AnimatedAnimalCard>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Gradient Header */}
      <LinearGradient
        colors={[Colors.light.primaryGreen, Colors.light.secondaryGreen]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradientHeader}
      >
        {/* Title row with search icon */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <View>
            <Text style={styles.headerTitle}>AnimalDex</Text>
            {viewMode === 'KNOWN' && (
              <Text style={styles.headerSubtitle}>{spotted} of {total} discovered ({percent}%)</Text>
            )}
          </View>
          <TouchableOpacity 
            onPress={() => setSearchOpen(v => !v)} 
            style={styles.headerIconButton}
          >
            <Icon name={searchOpen ? 'times' : 'search'} size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        {searchOpen && (
          <View style={styles.searchBox}>
            <Icon name="search" size={16} color="#fff" style={{ marginRight: 8, opacity: 0.7 }} />
            <TextInput
              placeholder="Search animals..."
              placeholderTextColor="rgba(255,255,255,0.7)"
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Icon name="times" size={16} color="#fff" style={{ opacity: 0.7 }} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Known/Unknown toggle */}
        {renderKnownUnknownToggle()}

        {/* Category tabs */}
        {viewMode === 'KNOWN' && renderTabs()}
      </LinearGradient>
      {viewMode === 'KNOWN' ? (
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
          <View style={styles.grid}>
            {currentSection.data.length > 0
              ? currentSection.data.map((animal, index) => renderAnimalSquare(animal, index))
              : <Text style={styles.empty}>No animals match that search.</Text>
            }
          </View>
        </ScrollView>
      ) : (
        renderUnknownList()
      )}

      {/* Unknown Group Modal */}
      <Modal
        visible={unknownGroupModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setUnknownGroupModalVisible(false)}
      >
        <View style={modalStyles.backdrop}>
          <View style={modalStyles.sheet}>
            <TouchableOpacity style={modalStyles.handle} onPress={() => setUnknownGroupModalVisible(false)} />
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Text style={modalStyles.sheetTitle}>
                {(unknownGroups.find(g => g.key === selectedUnknownKey)?.title) || 'Unknown identification'}
              </Text>
              <TouchableOpacity onPress={() => setUnknownGroupModalVisible(false)} style={{ marginLeft: 'auto', padding: 6 }}>
                <Icon name="times" size={18} color="#aaa" />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
              {(() => {
                const group = unknownGroups.find(g => g.key === selectedUnknownKey);
                if (!group) return null;
                const count = group.items.length;
                const vals = group.items.map(s => (typeof s.confidence === 'number' ? s.confidence! : null)).filter(v => v != null) as number[];
                const avg = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
                return (
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <Text style={{ color: Colors.light.darkNeutral }}>
                        {count} sighting{count > 1 ? 's' : ''}{avg != null ? ` • Avg ${avg}%` : ''}
                      </Text>
                      <View style={{ backgroundColor: Colors.light.lightGrey, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 }}>
                        <Text style={{ color: Colors.light.mainText, fontSize: 10, fontWeight: '600' }}>Unmapped</Text>
                      </View>
                    </View>
                    {/* Admin linking controls have moved to the Admin page */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                      {group.items.map(s => {
                        const raw = pickImageUrl(s.mediaUrls);
                        const thumb = toTinyPreview(raw, 144) || raw;
                        const key = s._id;
                        return (
                          <TouchableOpacity key={key} onPress={() => raw && openPreview(raw)} style={{ width: '31%', aspectRatio: 1, marginBottom: 10, borderRadius: 8, overflow: 'hidden', backgroundColor: Colors.light.lightGrey }}>
                            {thumb ? (
                              <Image source={{ uri: thumb }} style={{ width: '100%', height: '100%' }} />
                            ) : (
                              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                                <Icon name="image" size={22} color={Colors.light.darkNeutral} />
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                );
              })()}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Fullscreen Image Preview */}
      <Modal
        visible={!!previewImage}
        transparent
        animationType="fade"
        onRequestClose={closePreview}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity onPress={closePreview} style={{ position: 'absolute', top: 40, right: 20, padding: 8 }}>
            <Icon name="times" size={24} color="#fff" />
          </TouchableOpacity>
          {previewImage && (
            <Image source={{ uri: previewImage }} style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH, resizeMode: 'contain' }} />
          )}
        </View>
      </Modal>
    </View>
  );
}