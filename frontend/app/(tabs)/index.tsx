import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Image, Modal, RefreshControl, SectionList, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { apiGetSightingsByUser } from '../../api/sighting';
import { ANIMAL_DATA, TOTAL_ANIMALS } from '../../constants/animalData';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext';

// Basic badge colors for future verification levels
const LEVEL_COLORS: Record<string, string> = {
  AI: '#4dabf7',
  USER: '#51cf66',
  COMMUNITY: '#ffa94d'
};

interface EntryMeta {
  name: string;
  spotted: boolean;
  aiCount: number;
  userCount: number;
  level?: 'AI' | 'USER' | 'COMMUNITY';
  // total counted appearances
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
  const [selectedAnimalSightings, setSelectedAnimalSightings] = useState<any[]>([]);

  // Fetch user's sightings to determine spotted animals
  const loadSightings = useCallback(async () => {
    if (!user?._id) return;
    try {
      setRefreshing(true);
      const resp = await apiGetSightingsByUser(user._id);
      if (resp?.data) {
        setUserSightings(resp.data);
      }
    } catch (e) {
      console.warn('Failed to fetch user sightings', e);
    } finally {
      setRefreshing(false);
    }
  }, [user?._id]);

  useEffect(() => { loadSightings(); }, [loadSightings]);

  // Lowercase lookup map for canonical names
  const lowerToCanonical = useMemo(() => {
    const out: Record<string, string> = {};
    ANIMAL_DATA.forEach(cat => cat.data.forEach(an => { out[an.toLowerCase()] = an; }));
    return out;
  }, []);

  // Build lookup of spotted names using structured identification (no caption parsing)
  useEffect(() => {
    const map: Record<string, EntryMeta> = {};
    // init
    ANIMAL_DATA.forEach(cat => cat.data.forEach(an => {
      map[an] = { name: an, spotted: false, aiCount: 0, userCount: 0, count: 0, level: undefined };
    }));

    (userSightings || []).forEach(s => {
      const ident = (s as any).identification;
      if (!ident || !ident.commonName) return;
      const keyLower = String(ident.commonName).toLowerCase().trim();
      const canonical = lowerToCanonical[keyLower];
      if (!canonical || !map[canonical]) return; // ignore unknown / non-canonical names for now
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

  const filteredSections = useMemo(() => {
    if (!search.trim()) return ANIMAL_DATA;
    const q = search.toLowerCase();
    return ANIMAL_DATA.map(section => ({
      title: section.title,
      data: section.data.filter(name => name.toLowerCase().includes(q))
    })).filter(sec => sec.data.length > 0);
  }, [search]);

  const progress = useMemo(() => {
    const spottedCount = Object.values(mapped).filter(m => m.spotted).length;
    return { spottedCount, percent: TOTAL_ANIMALS ? (spottedCount / TOTAL_ANIMALS) : 0 };
  }, [mapped]);

  const openBadgeModal = (animal: string) => {
    const filtered = userSightings.filter(s => {
      const ident = (s as any).identification;
      return ident?.commonName && ident.commonName.toLowerCase().trim() === animal.toLowerCase();
    });
    setSelectedAnimal(animal);
    setSelectedAnimalSightings(filtered);
    setBadgeModalVisible(true);
  };

  const renderItem = ({ item }: { item: string }) => {
  const meta = mapped[item] || { name: item, spotted: false, aiCount: 0, userCount: 0, count: 0 } as EntryMeta;
  const spotted = meta.spotted;
  const opacity = spotted ? 1 : 0.35;
  const greenBadge = meta.aiCount > 0;
  const orangeBadge = meta.userCount > 0;
    return (
      <View style={styles.rowItem}>
        <Text style={[styles.animalName, { opacity }]}>{item}</Text>
        <View style={styles.badgeRow}>
          {orangeBadge && (
            <TouchableOpacity onPress={() => openBadgeModal(item)} style={[styles.spottedBadge, styles.userBadge]}> 
              <Icon name="check" size={12} color="#fff" />
              <Text style={styles.spottedBadgeText}>{meta.userCount}</Text>
            </TouchableOpacity>
          )}
      {greenBadge && (
            <TouchableOpacity onPress={() => openBadgeModal(item)} style={styles.spottedBadge}> 
              <Icon name="check" size={12} color="#fff" />
              <Text style={styles.spottedBadgeText}>{meta.aiCount}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderSectionHeader = ({ section }: any) => (
    <View style={styles.sectionHeader}> 
      <Text style={styles.sectionHeaderText}>{section.title}</Text>
    </View>
  );

  return (
  <View style={styles.container}> 
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.title}>AnimalDex</Text>
        <Text style={styles.subtitle}>{progress.spottedCount} / {TOTAL_ANIMALS} spotted ({Math.round(progress.percent * 100)}%)</Text>
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
      </View>
      <SectionList
        sections={filteredSections}
        keyExtractor={(item) => item}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadSightings} tintColor={Colors.light.primaryGreen} />}
        contentContainerStyle={{ paddingBottom: 120 }}
        ListEmptyComponent={<Text style={styles.empty}>No animals match that search.</Text>}
      />
      <Modal
        visible={badgeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setBadgeModalVisible(false)}
      >
        <View style={modalStyles.backdrop}>
          <View style={modalStyles.sheet}>
            <View style={modalStyles.handle} />
            <View style={{ flexDirection:'row', alignItems:'center', marginBottom:8 }}>
              <Text style={modalStyles.sheetTitle}>{selectedAnimal}</Text>
              <TouchableOpacity onPress={() => setBadgeModalVisible(false)} style={{ marginLeft:'auto', padding:6 }}>
                <Icon name="times" size={18} color="#aaa" />
              </TouchableOpacity>
            </View>
            <Text style={modalStyles.sheetSubtitle}>{selectedAnimalSightings.length} sighting(s)</Text>
            <FlatList
              data={selectedAnimalSightings}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => {
                const thumb = item.mediaUrls?.[0];
                const created = item.createdAt ? new Date(item.createdAt) : null;
                const time = created ? created.toLocaleDateString(undefined, { month:'short', day:'numeric'}) : '';
                return (
                  <View style={modalStyles.sightingRow}>
                    {thumb ? <Image source={{ uri: thumb }} style={modalStyles.thumb} /> : <View style={modalStyles.thumb} />}
                    <View style={{ flex:1 }}>
                      <Text numberOfLines={2} style={modalStyles.cap}>{item.caption || '(no caption)'}</Text>
                      <Text style={modalStyles.time}>{time}</Text>
                    </View>
                  </View>
                );
              }}
              ListEmptyComponent={<Text style={{ color:'#666', textAlign:'center', marginTop:10 }}>No posts found.</Text>}
              style={{ marginHorizontal:-16 }}
              contentContainerStyle={{ paddingHorizontal:16, paddingBottom:8 }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121214' },
  header: { paddingTop: 50, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: '#121214' },
  title: { fontSize: 28, fontWeight: '700', color: '#fff' },
  subtitle: { marginTop: 4, fontSize: 14, color: '#bbb' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1d1f22', borderRadius: 10, paddingHorizontal: 12, marginTop: 12 },
  searchInput: { flex: 1, color: '#fff', paddingVertical: 10 },
  sectionHeader: { backgroundColor: '#1d1f22', paddingVertical: 6, paddingHorizontal: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#2a2c30' },
  sectionHeaderText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  rowItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#1f2124' },
  animalName: { flex: 1, color: '#fff', fontSize: 15 },
  badgeRow: { flexDirection: 'row', alignItems: 'center' },
  spottedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.light.primaryGreen, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginLeft: 8 },
  spottedBadgeText: { color: '#fff', fontSize: 12, marginLeft: 4, fontWeight: '600' },
  levelBadge: { marginLeft: 8, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  levelBadgeText: { color: '#000', fontSize: 10, fontWeight: '700' },
  empty: { color: '#666', textAlign: 'center', marginTop: 40 },
  userBadge: { backgroundColor: '#ff9f1c' }
});

// Extra styles appended (avoid reformatting above)
const modalStyles = StyleSheet.create({
  backdrop: { flex:1, backgroundColor:'rgba(0,0,0,0.6)', justifyContent:'flex-end' },
  sheet: { backgroundColor:'#1d1f22', paddingTop:12, paddingHorizontal:16, paddingBottom:32, borderTopLeftRadius:18, borderTopRightRadius:18, maxHeight:'70%' },
  handle: { width:50, height:5, backgroundColor:'#333', borderRadius:3, alignSelf:'center', marginBottom:12 },
  sheetTitle: { color:'#fff', fontSize:18, fontWeight:'700', marginBottom:4 },
  sheetSubtitle: { color:'#bbb', fontSize:12, marginBottom:12 },
  sightingRow: { flexDirection:'row', alignItems:'center', paddingVertical:10, borderBottomWidth:StyleSheet.hairlineWidth, borderBottomColor:'#2a2c30' },
  thumb: { width:54, height:54, borderRadius:8, backgroundColor:'#222', marginRight:12 },
  cap: { color:'#fff', flex:1, fontSize:13 },
  time: { color:'#888', fontSize:11, marginTop:4 }
});

// Inject modal component after main export (augment return via fragment not editing existing large return) - patch below
