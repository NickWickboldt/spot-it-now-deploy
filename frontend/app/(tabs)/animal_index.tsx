import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Dimensions, Image, Modal, PanResponder, ScrollView, StatusBar, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { apiGetAllAnimals } from '../../api/animal';
import { apiGetMySightings } from '../../api/sighting';
import { apiGetUserDiscoveries } from '../../api/userDiscovery';
import { modalStyles, styles } from '../../constants/animalIndexStyle';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface Animal {
  _id: string;
  commonName: string;
  scientificName: string;
  description: string;
  category: string;
  rarityLevel: string;
  imageUrls: string[];
  conservationStatus: string;
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
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userSightings, setUserSightings] = useState<any[]>([]);
  const [userDiscoveries, setUserDiscoveries] = useState<any[]>([]);
  const [mapped, setMapped] = useState<Record<string, EntryMeta>>({});
  const [badgeModalVisible, setBadgeModalVisible] = useState(false);
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [reopenSheetAfterPreview, setReopenSheetAfterPreview] = useState(false);
  const [unknownGroupModalVisible, setUnknownGroupModalVisible] = useState(false);
  const [reopenUnknownAfterPreview, setReopenUnknownAfterPreview] = useState(false);
  const [selectedUnknownKey, setSelectedUnknownKey] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState('');
  const [viewMode, setViewMode] = useState<'KNOWN' | 'UNKNOWN'>('KNOWN');
  const [infoLoading, setInfoLoading] = useState(false);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [animalCategories, setAnimalCategories] = useState<AnimalCategory[]>([]);
  // Admin-only linking moved to Admin page

  const handlePanResponder = React.useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to vertical swipes starting on the handle
        return Math.abs(gestureState.dy) > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        // If swipe down is significant, close modal
        if (gestureState.dy > 50) {
          setBadgeModalVisible(false);
        }
      },
    })
  ).current;

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
          const tiny = toTinyPreview(raw, 112) || raw;
          map[aid] = tiny;
        }
      }
    });
    return map;
  }, [userSightings]);

  // Prefer a tiny transformed Cloudinary URL when possible
  function toTinyPreview(uri?: string, size = 112): string | undefined {
    if (!uri || typeof uri !== 'string') return uri;
    try {
      const u = new URL(uri);
      // Cloudinary URL pattern includes '/image/upload/' or '/video/upload/'
      if (u.hostname.includes('cloudinary.com')) {
        const injected = `/upload/c_fill,w_${size},h_${size},q_auto,f_auto/`;
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
    // Use the first image URL if available, otherwise fallback to Unsplash
    if (animal.imageUrls && animal.imageUrls.length > 0) {
      return toTinyPreview(animal.imageUrls[0], 144) || animal.imageUrls[0];
    }
    return `https://source.unsplash.com/56x56/?${encodeURIComponent(animal.commonName)},animal`;
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

  const openBadgeModal = async (animal: Animal) => {
    setSelectedAnimal(animal);
    setInfoLoading(true);

    // Since we're now using database animals, we can show the database info
    // Instead of external API, we'll show the animal's database information
    setInfoLoading(false);
    setBadgeModalVisible(true);
  };

  const selectedAnimalSightings = useMemo(() => {
    if (!selectedAnimal) return [] as Sighting[];
    const list = (userSightings as Sighting[]).filter(s => String(s.animalId || '') === selectedAnimal._id);
    // Fallback: legacy match by name if animalId missing
    if (list.length === 0) {
      const name = selectedAnimal.commonName.toLowerCase();
      const legacy = (userSightings as any[]).filter(s => s?.identification?.commonName?.toLowerCase?.() === name);
      return legacy.sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      });
    }
    return list.sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });
  }, [selectedAnimal, userSightings]);

  // Helpers to show/hide the full-screen preview without stacking Modals
  const openPreview = useCallback((uri: string) => {
    // Close any open sheet/modal while previewing to avoid nested Modals issues
    if (badgeModalVisible) {
      setReopenSheetAfterPreview(true);
      setBadgeModalVisible(false);
    } else if (unknownGroupModalVisible) {
      setReopenUnknownAfterPreview(true);
      setUnknownGroupModalVisible(false);
    }
    setPreviewImage(uri);
  }, [badgeModalVisible, unknownGroupModalVisible]);

  const closePreview = useCallback(() => {
    setPreviewImage(null);
    if (reopenUnknownAfterPreview) {
      setReopenUnknownAfterPreview(false);
      setUnknownGroupModalVisible(true);
    } else if (reopenSheetAfterPreview) {
      setReopenSheetAfterPreview(false);
      setBadgeModalVisible(true);
    }
  }, [reopenSheetAfterPreview, reopenUnknownAfterPreview]);

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
    <View style={{ flexDirection: 'row', gap: 8, marginTop: 0, marginBottom: 12, justifyContent: 'flex-start' }}>
      <TouchableOpacity
        onPress={() => setViewMode('KNOWN')}
        style={{
          paddingVertical: 10,
          paddingHorizontal: 20,
          borderRadius: 20,
          backgroundColor: viewMode === 'KNOWN' ? Colors.light.darkNeutral : 'transparent',
          borderWidth: 1,
          borderColor: Colors.light.darkNeutral
        }}
      >
        <Text style={{ color: viewMode === 'KNOWN' ? '#fff' : Colors.light.darkNeutral, fontWeight: '700', fontSize: 15 }}>All</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => setViewMode('KNOWN')}
        style={{
          paddingVertical: 10,
          paddingHorizontal: 20,
          borderRadius: 20,
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: Colors.light.darkNeutral
        }}
      >
        <Text style={{ color: Colors.light.darkNeutral, fontWeight: '700', fontSize: 15 }}>Known</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => setViewMode('UNKNOWN')}
        style={{
          paddingVertical: 10,
          paddingHorizontal: 20,
          borderRadius: 20,
          backgroundColor: viewMode === 'UNKNOWN' ? Colors.light.darkNeutral : 'transparent',
          borderWidth: 1,
          borderColor: Colors.light.darkNeutral
        }}
      >
        <Text style={{ color: viewMode === 'UNKNOWN' ? '#fff' : Colors.light.darkNeutral, fontWeight: '700', fontSize: 15 }}>Unknown</Text>
      </TouchableOpacity>
    </View>
  );

  const renderUnknownList = () => (
    <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
      {unknownGroups.length === 0 ? (
        <Text style={styles.empty}>No unknown sightings yet.</Text>
      ) : (
        <View style={{ paddingHorizontal: 16, gap: 12 }}>
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
              <TouchableOpacity key={g.key} onPress={() => { setSelectedUnknownKey(g.key); setUnknownGroupModalVisible(true); }} activeOpacity={0.7}>
                <View style={{ flexDirection: 'row', backgroundColor: Colors.light.cardBackground, borderRadius: 12, borderWidth: 1, borderColor: Colors.light.shadow, overflow: 'hidden', alignItems: 'center' }}>
                  <View style={{ width: 96, height: 96, backgroundColor: Colors.light.lightGrey, margin: 6, borderRadius: 8, overflow: 'hidden' }}>
                    {imageUri ? (
                      <Image source={{ uri: imageUri }} style={{ width: '100%', height: '100%' }} />
                    ) : (
                      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.light.lightGrey }}>
                        <Icon name="image" size={22} color={Colors.light.darkNeutral} />
                      </View>
                    )}
                  </View>
                  <View style={{ flex: 1, paddingVertical: 12, paddingRight: 10 }}>
                    <Text style={{ color: Colors.light.mainText, fontWeight: '700' }} numberOfLines={1}>
                      {title}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                      <Text style={{ color: Colors.light.darkNeutral }}>
                        {count} sighting{count > 1 ? 's' : ''}
                      </Text>
                      {avgConf != null && (
                        <Text style={{ color: Colors.light.darkNeutral }}>
                          {`  •  Avg ${avgConf}%`}
                        </Text>
                      )}
                    </View>
                    {date && <Text style={{ color: Colors.light.darkNeutral, marginTop: 2, fontSize: 12 }}>Latest: {date}</Text>}
                    <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ backgroundColor: Colors.light.lightGrey, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 }}>
                        <Text style={{ color: Colors.light.mainText, fontSize: 10, fontWeight: '600' }}>Unmapped</Text>
                      </View>
                      <Icon name="chevron-right" size={14} color={Colors.light.darkNeutral} />
                    </View>
                  </View>
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
      {animalCategories.map(section => (
        <TouchableOpacity
          key={section.title}
          style={[
            styles.tab,
            selectedTab === section.title && styles.tabActive
          ]}
          onPress={() => setSelectedTab(section.title)}
        >
          <View style={{ alignItems: 'center' }}>
            <Text style={[
              styles.tabText,
              selectedTab === section.title && styles.tabTextActive
            ]}>
              {section.title}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderAnimalSquare = (animal: Animal) => {
    const meta = mapped[animal.commonName] || {
      name: animal.commonName,
      spotted: false,
      aiCount: 0,
      userCount: 0,
      count: 0
    } as EntryMeta;
    const spotted = meta.spotted;
    const userThumb = userThumbByAnimalId[animal._id];
    const displayImage = userThumb || getAnimalImage(animal);
    return (
      <TouchableOpacity
        key={animal._id}
        style={[styles.square, spotted ? styles.spottedSquare : styles.lockedSquare]}
        onPress={() => openBadgeModal(animal)}
        activeOpacity={spotted ? 0.7 : 1}
      >
        {spotted ? (
          <Image source={{ uri: displayImage }} style={styles.animalImage} />
        ) : (
          <View style={styles.silhouette}>
            <Icon name="question" size={32} color={Colors.light.darkNeutral} />
          </View>
        )}
        {spotted && (
          <View style={styles.spottedChip}>
            <Text style={styles.spottedChipText}>Spotted</Text>
          </View>
        )}
        <Text style={styles.animalName}>{animal.commonName}</Text>
        {/* Removed verification badges from grid view - they only show in modal now */}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        {/* Title row with search icon */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={styles.title}>AnimalDex</Text>
          <TouchableOpacity onPress={() => setSearchOpen(v => !v)} style={{ padding: 6 }}>
            <Icon name={searchOpen ? 'times' : 'search'} size={20} color={Colors.light.darkNeutral} />
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        {searchOpen && (
          <View style={styles.searchBox}>
            <Icon name="search" size={16} color={Colors.light.darkNeutral} style={{ marginRight: 8 }} />
            <TextInput
              placeholder="Search animals..."
              placeholderTextColor={Colors.light.darkNeutral}
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Icon name="times" size={16} color={Colors.light.darkNeutral} />
              </TouchableOpacity>
            )}
          </View>
        )}
        
        {/* Progress chip */}
        {viewMode === 'KNOWN' && (
          <View style={styles.progressChipContainer}>
            <Text style={styles.progressChipText}>{spotted}/{total} · {percent}%</Text>
          </View>
        )}

        {/* Known/Unknown toggle */}
        {renderKnownUnknownToggle()}

        {/* Category tabs */}
        {viewMode === 'KNOWN' && renderTabs()}
      </View>
      {viewMode === 'KNOWN' ? (
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
          <View style={styles.grid}>
            {currentSection.data.length > 0
              ? currentSection.data.map(renderAnimalSquare)
              : <Text style={styles.empty}>No animals match that search.</Text>
            }
          </View>
        </ScrollView>
      ) : (
        renderUnknownList()
      )}
      <Modal
        visible={badgeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setBadgeModalVisible(false)}
      >
        <View style={modalStyles.backdrop}>
          <View style={modalStyles.sheet}>
            <TouchableOpacity style={modalStyles.handle} onPress={() => setBadgeModalVisible(false)} {...handlePanResponder.panHandlers} />
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Text style={modalStyles.sheetTitle}>{selectedAnimal?.commonName}</Text>
              <TouchableOpacity onPress={() => setBadgeModalVisible(false)} style={{ marginLeft: 'auto', padding: 6 }}>
                <Icon name="times" size={18} color="#aaa" />
              </TouchableOpacity>
            </View>
            {infoLoading ? (
              <Text style={{ color: '#666', textAlign: 'center', marginBottom: 10 }}>Loading info...</Text>
            ) : selectedAnimal ? (
              <>
                <ScrollView style={{ flexGrow: 0, marginBottom: 10 }} contentContainerStyle={{ paddingBottom: 12 }}>
                  <View style={styles.swipeInfoContainer}>
                    <Text style={styles.swipeInfoTitle}>{selectedAnimal.commonName}</Text>

                    {/* Discovery Status */}
                    {selectedAnimal && mapped[selectedAnimal.commonName]?.spotted && (
                      <View style={{ marginBottom: 12, padding: 10, backgroundColor: '#e8f5e8', borderRadius: 8 }}>
                        <Text style={[styles.swipeInfoLabel, { color: '#2d5a2d', marginBottom: 4 }]}>
                          🎉 Discovered!
                        </Text>
                        {mapped[selectedAnimal.commonName]?.discoveredAt && (
                          <Text style={{ color: '#2d5a2d', fontSize: 12, marginBottom: 4 }}>
                            Discovered on: {new Date(mapped[selectedAnimal.commonName].discoveredAt!).toLocaleDateString()}
                          </Text>
                        )}

                        {/* Verification Badges */}
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                          {mapped[selectedAnimal.commonName]?.verifiedByAI && (
                            <View style={{
                              backgroundColor: '#4CAF50', // Green for AI
                              paddingHorizontal: 8,
                              paddingVertical: 2,
                              borderRadius: 12
                            }}>
                              <Text style={{ color: '#fff', fontSize: 10, fontWeight: '500' }}>
                                AI Verified
                              </Text>
                            </View>
                          )}
                          {mapped[selectedAnimal.commonName]?.verifiedByUser && (
                            <View style={{
                              backgroundColor: '#FFC107', // Yellow for User
                              paddingHorizontal: 8,
                              paddingVertical: 2,
                              borderRadius: 12
                            }}>
                              <Text style={{ color: '#fff', fontSize: 10, fontWeight: '500' }}>
                                User Verified
                              </Text>
                            </View>
                          )}
                          {mapped[selectedAnimal.commonName]?.verifiedByCommunity && (
                            <View style={{
                              backgroundColor: '#2196F3', // Blue for Community
                              paddingHorizontal: 8,
                              paddingVertical: 2,
                              borderRadius: 12
                            }}>
                              <Text style={{ color: '#fff', fontSize: 10, fontWeight: '500' }}>
                                Community Verified
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    )}

                    {selectedAnimal.scientificName && (
                      <Text style={styles.swipeInfoText}>
                        <Text style={styles.swipeInfoLabel}>Scientific Name: </Text>
                        {selectedAnimal.scientificName}
                      </Text>
                    )}

                    {selectedAnimal.description && (
                      <Text style={styles.swipeInfoText}>
                        <Text style={styles.swipeInfoLabel}>Description: </Text>
                        {selectedAnimal.description}
                      </Text>
                    )}

                    {selectedAnimal.category && (
                      <Text style={styles.swipeInfoText}>
                        <Text style={styles.swipeInfoLabel}>Category: </Text>
                        {selectedAnimal.category}
                      </Text>
                    )}

                    {selectedAnimal.rarityLevel && (
                      <Text style={styles.swipeInfoText}>
                        <Text style={styles.swipeInfoLabel}>Rarity: </Text>
                        {selectedAnimal.rarityLevel}
                      </Text>
                    )}

                    {selectedAnimal.conservationStatus && (
                      <Text style={styles.swipeInfoText}>
                        <Text style={styles.swipeInfoLabel}>Conservation Status: </Text>
                        {selectedAnimal.conservationStatus}
                      </Text>
                    )}

                    {/* User Sightings Gallery */}
                    {selectedAnimalSightings.length > 0 && (
                      <View style={{ marginTop: 14 }}>
                        <Text style={[styles.swipeInfoLabel, { marginBottom: 8 }]}>Your Sightings</Text>
                        {/* Latest large preview */}
                        {(() => {
                          const first = selectedAnimalSightings[0];
                          const raw = pickImageUrl(first.mediaUrls);
                          const hero = toTinyPreview(raw, 512) || raw;
                          return hero ? (
                            <TouchableOpacity onPress={() => raw && openPreview(raw)}>
                              <Image source={{ uri: hero }} style={{ width: '100%', height: 220, borderRadius: 10 }} />
                            </TouchableOpacity>
                          ) : null;
                        })()}
                        {/* Horizontal thumbnails */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                          <View style={{ flexDirection: 'row', gap: 8 }}>
                            {selectedAnimalSightings.slice(0, 12).map(s => {
                              const raw = pickImageUrl(s.mediaUrls);
                              const thumb = toTinyPreview(raw, 96) || raw;
                              if (!thumb) return null;
                              return (
                                <TouchableOpacity key={s._id} onPress={() => raw && openPreview(raw)}>
                                  <Image source={{ uri: thumb }} style={{ width: 96, height: 96, borderRadius: 8 }} />
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </ScrollView>
                      </View>
                    )}
                  </View>
                </ScrollView>
              </>
            ) : (
              <Text style={{ color: '#666', textAlign: 'center', marginBottom: 10 }}>No info found.</Text>
            )}
          </View>
        </View>
      </Modal>

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