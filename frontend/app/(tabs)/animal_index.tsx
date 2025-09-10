import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, Image, Modal, PanResponder, ScrollView, StatusBar, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { ANIMAL_DATA } from '../../constants/animalData';
import { modalStyles, styles } from '../../constants/animalIndexStyle';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface EntryMeta {
  name: string;
  spotted: boolean;
  aiCount: number;
  userCount: number;
  level?: 'AI' | 'USER' | 'COMMUNITY';
  count: number;
}

export default function AnimalDexScreen() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [userSightings, setUserSightings] = useState<any[]>([]);
  const [mapped, setMapped] = useState<Record<string, EntryMeta>>({});
  const [badgeModalVisible, setBadgeModalVisible] = useState(false);
  const [selectedAnimal, setSelectedAnimal] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState(ANIMAL_DATA[0]?.title || '');
  const [infoLoading, setInfoLoading] = useState(false);
  const [animalInfoList, setAnimalInfoList] = useState<any[]>([]);
  const [animalInfoIndex, setAnimalInfoIndex] = useState(0);

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

  const getAnimalImage = (name: string) => {
    return `https://source.unsplash.com/56x56/?${encodeURIComponent(name)},animal`;
  };

  const lowerToCanonical = useMemo(() => {
    const out: Record<string, string> = {};
    ANIMAL_DATA.forEach(cat => cat.data.forEach(an => { out[an.toLowerCase()] = an; }));
    return out;
  }, []);

  useEffect(() => {
    const map: Record<string, EntryMeta> = {};
    ANIMAL_DATA.forEach(cat => cat.data.forEach(an => {
      map[an] = { name: an, spotted: false, aiCount: 0, userCount: 0, count: 0, level: undefined };
    }));

    (userSightings || []).forEach(s => {
      const ident = (s as any).identification;
      if (!ident || !ident.commonName) return;
      const keyLower = String(ident.commonName).toLowerCase().trim();
      const canonical = lowerToCanonical[keyLower];
      if (!canonical || !map[canonical]) return;
      const meta = map[canonical];
      if (ident.source === 'USER') meta.userCount += 1; else if (ident.source === 'AI') meta.aiCount += 1; else meta.aiCount += 1;
      meta.count = meta.aiCount + meta.userCount;
      meta.spotted = true;
      if (meta.userCount > 0 && meta.aiCount === 0) meta.level = 'USER';
      else if (meta.aiCount > 0 && meta.userCount === 0) meta.level = 'AI';
      else if (meta.userCount > 0 && meta.aiCount > 0) meta.level = 'COMMUNITY';
    });
    setMapped(map);
  }, [userSightings, lowerToCanonical]);

  const currentSection = useMemo(() => {
    const section = ANIMAL_DATA.find(sec => sec.title === selectedTab);
    if (!section) return { title: '', data: [] };
    if (!search.trim()) return section;
    const q = search.toLowerCase();
    return {
      title: section.title,
      data: section.data.filter(name => name.toLowerCase().includes(q))
    };
  }, [selectedTab, search]);

  const openBadgeModal = async (animal: string) => {
    setSelectedAnimal(animal);
    setInfoLoading(true);
    try {
      const response = await fetch(`https://api.api-ninjas.com/v1/animals?name=${encodeURIComponent(animal)}`, {
        headers: { 'X-Api-Key': process.env.EXPO_PUBLIC_NINJA_API_KEY } // Replace with your actual API key
      });
      const data = await response.json();
      setAnimalInfoList(Array.isArray(data) ? data : []);
      setAnimalInfoIndex(0);
    } catch (e) {
      setAnimalInfoList([]);
      setAnimalInfoIndex(0);
    } finally {
      setInfoLoading(false);
    }

    const filtered = userSightings.filter(s => {
      const ident = (s as any).identification;
      return ident?.commonName && ident.commonName.toLowerCase().trim() === animal.toLowerCase();
    });
    setBadgeModalVisible(true);
  };

  const selectedSection = ANIMAL_DATA.find(sec => sec.title === selectedTab);
  const spotted = selectedSection.data.filter(animal => mapped[animal]?.spotted).length;
  const total = selectedSection.data.length;
  const percent = total ? Math.round((spotted / total) * 100) : 0;

  const renderTabs = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.tabsContainer}
    >
      {ANIMAL_DATA.map(section => (
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

  const renderAnimalSquare = (item: string) => {
    const meta = mapped[item] || { name: item, spotted: false, aiCount: 0, userCount: 0, count: 0 } as EntryMeta;
    const spotted = meta.spotted;
    return (
      <TouchableOpacity
        key={item}
        style={[styles.square, !spotted && styles.lockedSquare]}
        onPress={() => openBadgeModal(item)}
        activeOpacity={spotted ? 0.7 : 1}
      >
        {spotted ? (
          <Image source={{ uri: getAnimalImage(item) }} style={styles.animalImage} />
        ) : (
          <View style={styles.silhouette}>
            <Icon name="question" size={32} color={Colors.light.darkNeutral} />
          </View>
        )}
        <Text style={styles.animalName}>{item}</Text>
        {spotted && (
          <View style={styles.badgeRow}>
            {meta.userCount > 0 && (
              <View style={[styles.spottedBadge, styles.userBadge]}>
                <Icon name="check" size={12} color="#fff" />
                <Text style={styles.spottedBadgeText}>{meta.userCount}</Text>
              </View>
            )}
            {meta.aiCount > 0 && (
              <View style={styles.spottedBadge}>
                <Icon name="check" size={12} color="#fff" />
                <Text style={styles.spottedBadgeText}>{meta.aiCount}</Text>
              </View>
            )}
          </View>
        )}
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
            <TouchableOpacity style={modalStyles.handle} onPress={() => setBadgeModalVisible(false)} {...handlePanResponder.panHandlers}/>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Text style={modalStyles.sheetTitle}>{selectedAnimal}</Text>
              <TouchableOpacity onPress={() => setBadgeModalVisible(false)} style={{ marginLeft: 'auto', padding: 6 }}>
                <Icon name="times" size={18} color="#aaa" />
              </TouchableOpacity>
            </View>
            {infoLoading ? (
              <Text style={{ color: '#666', textAlign: 'center', marginBottom: 10 }}>Loading info...</Text>
            ) : animalInfoList.length > 0 ? (
              <>
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  style={{ flexGrow: 0, height: 650, marginBottom: 10 }} // Only visual styles here
                  onScroll={e => {
                    const index = Math.round(e.nativeEvent.contentOffset.x / (SCREEN_WIDTH - 32));
                    setAnimalInfoIndex(index);
                  }}
                  scrollEventThrottle={16}
                >
                  {animalInfoList.map((animalInfo, idx) => (
                    <View
                      key={idx}
                      style={styles.swipeInfoContainer}
                    >
                      <Text style={styles.swipeInfoTitle}>{animalInfo.name}</Text>
                      {animalInfo.characteristics && typeof animalInfo.characteristics === 'object' ? (
                        <View style={{ marginBottom: 6 }}>
                          {Object.entries(animalInfo.characteristics).map(([key, value]) => (
                            <Text key={key} style={styles.swipeInfoText}>
                              <Text style={styles.swipeInfoLabel}>{key.replace(/_/g, ' ')}: </Text>
                              {String(value)}
                            </Text>
                          ))}
                        </View>
                      ) : animalInfo.characteristics ? (
                        <Text style={styles.swipeInfoText}>{animalInfo.characteristics}</Text>
                      ) : null}
                      {animalInfo.locations && (
                        <Text style={styles.swipeInfoText}>
                          <Text style={styles.swipeInfoLabel}>Locations: </Text>
                          {animalInfo.locations.join(', ')}
                        </Text>
                      )}
                    </View>
                  ))}
                </ScrollView>
                {animalInfoList.length > 1 && (
                  <Text style={styles.swipePageIndicator}>
                    {animalInfoIndex + 1} / {animalInfoList.length}
                  </Text>
                )}
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