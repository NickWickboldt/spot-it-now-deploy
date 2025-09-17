import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, Image, Modal, PanResponder, ScrollView, StatusBar, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { apiGetAllAnimals } from '../../api/animal';
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

export default function AnimalDexScreen() {
  const { user, token } = useAuth();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [userSightings, setUserSightings] = useState<any[]>([]);
  const [userDiscoveries, setUserDiscoveries] = useState<any[]>([]);
  const [mapped, setMapped] = useState<Record<string, EntryMeta>>({});
  const [badgeModalVisible, setBadgeModalVisible] = useState(false);
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
  const [selectedTab, setSelectedTab] = useState('');
  const [infoLoading, setInfoLoading] = useState(false);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [animalCategories, setAnimalCategories] = useState<AnimalCategory[]>([]);

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

  // Fetch animals from database on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch animals and discoveries in parallel
        const [animalsResponse, discoveriesResponse] = await Promise.all([
          apiGetAllAnimals(token),
          apiGetUserDiscoveries(token).catch(() => ({ data: null }))
        ]);

        const fetchedAnimals = animalsResponse.data || [];
        const userDiscoveryData = discoveriesResponse.data;

        // Extract discoveries from the correct field
        let discoveries = [];
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
    };

    fetchData();
  }, [token]);

  const getAnimalImage = (animal: Animal) => {
    // Use the first image URL if available, otherwise fallback to Unsplash
    if (animal.imageUrls && animal.imageUrls.length > 0) {
      return animal.imageUrls[0];
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

    const filtered = userSightings.filter(s => {
      const ident = (s as any).identification;
      return ident?.commonName && ident.commonName.toLowerCase().trim() === animal.commonName.toLowerCase();
    });
    setBadgeModalVisible(true);
  };

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
    return (
      <TouchableOpacity
        key={animal._id}
        style={[styles.square, !spotted && styles.lockedSquare]}
        onPress={() => openBadgeModal(animal)}
        activeOpacity={spotted ? 0.7 : 1}
      >
        {spotted ? (
          <Image source={{ uri: getAnimalImage(animal) }} style={styles.animalImage} />
        ) : (
          <View style={styles.silhouette}>
            <Icon name="question" size={32} color={Colors.light.darkNeutral} />
          </View>
        )}
        <Text style={styles.animalName}>{animal.commonName}</Text>
        {/* Removed verification badges from grid view - they only show in modal now */}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.title}>{'AnimalDex'}</Text>
        <View style={styles.searchBox}>
          <Icon name="search" size={16} color={Colors.light.darkNeutral} style={{ marginRight: 6 }} />
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
        {renderTabs()}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 6 }}>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBarFill, { width: `${percent}%` }]} />
            <Text style={styles.progressBarText}>
              {percent}%
            </Text>
          </View>
          <Text style={{ marginLeft: 10, color: Colors.light.mainText, fontWeight: '600', fontSize: 15 }}>
            {spotted}/{total}
          </Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={styles.grid}>
          {currentSection.data.length > 0
            ? currentSection.data.map(renderAnimalSquare)
            : <Text style={styles.empty}>No animals match that search.</Text>
          }
        </View>
      </ScrollView>
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
                <ScrollView style={{ flexGrow: 0, maxHeight: 400, marginBottom: 10 }}>
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
                  </View>
                </ScrollView>
              </>
            ) : (
              <Text style={{ color: '#666', textAlign: 'center', marginBottom: 10 }}>No info found.</Text>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}