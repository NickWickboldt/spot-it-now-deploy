import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { apiGetAllAnimals } from '../../api/animal';
import { fetchWithAuth } from '../../api/client';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext';

// Minimal admin page to create and list challenges manually.
export default function ManageChallenges(): React.JSX.Element {
  const { token } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [animals, setAnimals] = useState<any[]>([]);
  const [list, setList] = useState<any[]>([]);

  // Form state
  // City search instead of lat/lng
  const [cityQuery, setCityQuery] = useState('');
  const [cityResults, setCityResults] = useState<Location.LocationGeocodedLocation[]>([]);
  const [geocoding, setGeocoding] = useState(false);
  const [chosenCenter, setChosenCenter] = useState<Location.LocationGeocodedLocation | null>(null);
  // Defaults: 50 miles radius (~80467 m) and 1 day duration starting today
  const defaultRadiusMeters = String(Math.round(50 * 1609.34));
  const [radius, setRadius] = useState(defaultRadiusMeters);
  const [activeFrom, setActiveFrom] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [activeTo, setActiveTo] = useState<string>(() => new Date(Date.now() + 24*60*60*1000).toISOString().slice(0, 10));
  const [useCustomDates, setUseCustomDates] = useState(false);
  const [selectedCounts, setSelectedCounts] = useState<Record<string, string>>({});
  const [selectedAnimalIds, setSelectedAnimalIds] = useState<string[]>([]);
  const [filter, setFilter] = useState('');

  // Quick radius chips (miles)
  const M_PER_MILE = 1609.34;
  const QUICK_MILES = [25, 50, 100];
  const isRadiusSelected = (mi: number) => {
    const meters = Math.round(mi * M_PER_MILE);
    const current = Number(radius) || 0;
    return Math.abs(current - meters) < 2; // allow tiny rounding diff
  };
  const setRadiusMiles = (mi: number) => setRadius(String(Math.round(mi * M_PER_MILE)));

  const filteredAnimals = useMemo(() => {
    if (!filter) return animals;
    const f = filter.toLowerCase();
    return animals.filter((a: any) => (a.commonName || '').toLowerCase().includes(f));
  }, [animals, filter]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const animalsResp: any = await apiGetAllAnimals(token || undefined);
        setAnimals(Array.isArray(animalsResp?.data) ? animalsResp.data : []);
        const challengesResp: any = await fetchWithAuth('/challenges', token || undefined);
        setList(Array.isArray(challengesResp?.data) ? challengesResp.data : []);
      } catch (e: any) {
        Alert.alert('Error', e?.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const toggleAnimal = (id: string) => {
    setSelectedAnimalIds((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((x) => x !== id);
        const { [id]: _, ...rest } = selectedCounts;
        setSelectedCounts(rest);
        return next;
      }
      setSelectedCounts((c) => ({ ...c, [id]: c[id] ?? '1' }));
      return [...prev, id];
    });
  };

  const setCountFor = (id: string, val: string) => {
    const safe = val.replace(/[^0-9]/g, '');
    setSelectedCounts((c) => ({ ...c, [id]: safe || '1' }));
  };

  const searchCity = async () => {
    const q = cityQuery.trim();
    if (!q) return;
    try {
      setGeocoding(true);
      const results = await Location.geocodeAsync(q);
      const filtered = results.filter(r => typeof r.latitude === 'number' && typeof r.longitude === 'number').slice(0, 5);
      setCityResults(filtered);
      setChosenCenter(null);
      if (!filtered.length) Alert.alert('No results', 'Could not find that place.');
    } catch (e:any) {
      Alert.alert('Error', e?.message || 'Failed to search for that place.');
    } finally {
      setGeocoding(false);
    }
  };

  const createChallenge = async (chosen?: Location.LocationGeocodedLocation) => {
    const centerChoice = chosen || chosenCenter || cityResults[0];
    if (!centerChoice) {
      Alert.alert('Select a city', 'Search and pick a city for the challenge center.');
      return;
    }
    try {
      const tasks = selectedAnimalIds.map((id) => ({ animal: id, required: Number(selectedCounts[id] || '1') || 1 }));
      const body = {
        // Use per-animal tasks; backend will derive animals from these
        tasks,
        center: { type: 'Point', coordinates: [Number(centerChoice.longitude), Number(centerChoice.latitude)] },
        radiusMeters: Number(radius) || Number(defaultRadiusMeters),
        activeFrom: useCustomDates ? new Date(activeFrom).toISOString() : new Date().toISOString(),
        activeTo: useCustomDates ? new Date(activeTo).toISOString() : new Date(Date.now() + 24*60*60*1000).toISOString(),
        scope: 'DAILY',
      };
      const resp: any = await fetchWithAuth('/challenges/create', token || undefined, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (resp?.data) {
        setList((prev) => [resp.data, ...prev]);
        // reset essentials
        setSelectedAnimalIds([]);
        setSelectedCounts({});
        setCityResults([]);
        setChosenCenter(null);
        Alert.alert('Created', 'Challenge created.');
      }
    } catch (e:any) {
      Alert.alert('Error creating challenge', e?.message || 'Unknown error');
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
      {/* Gradient Header */}
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
          <FontAwesome5 name="trophy" size={32} color="#fff" />
          <Text style={styles.headerTitle}>Manage Challenges</Text>
          <Text style={styles.headerSubtitle}>{list.length} active challenges</Text>
        </View>
      </LinearGradient>

      <FlatList
        data={list}
        keyExtractor={(c: any) => c._id}
        ListHeaderComponent={
          <View>
            {/* Preset Card */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>
                <FontAwesome5 name="calendar-day" size={16} color={Colors.light.primaryGreen} /> Daily Challenge Preset
              </Text>
              <Text style={styles.sectionSub}>Pick a city, radius, and animals. Defaults: 1 day, 50 mi radius.</Text>
            </View>

            {/* Step 1: City */}
            <View style={styles.sectionCard}>
              <Text style={styles.stepLabel}>1. Choose City</Text>
              <View style={styles.formRow}><Text style={styles.label}>City/Place</Text><TextInput style={styles.input} value={cityQuery} onChangeText={setCityQuery} placeholder="Type a city, address, or landmark" onSubmitEditing={searchCity} /></View>
              <View style={styles.rowBetween}>
                <Pressable style={styles.smallBtn} onPress={searchCity} disabled={geocoding}>
                  {geocoding ? <ActivityIndicator color="#fff" /> : <Text style={styles.smallBtnText}>Search City</Text>}
                </Pressable>
                <Pressable style={[styles.smallBtn, { backgroundColor: Colors.light.darkNeutral }]} onPress={async () => {
                  try {
                    const { status } = await Location.requestForegroundPermissionsAsync();
                    if (status !== 'granted') { Alert.alert('Permission', 'Location permission required.'); return; }
                    const current = await Location.getCurrentPositionAsync({});
                    const loc = { latitude: current.coords.latitude, longitude: current.coords.longitude } as any;
                    setChosenCenter(loc);
                    setCityResults([]);
                    Alert.alert('Selected', 'Using your current location.');
                  } catch (e:any) { Alert.alert('Error', e?.message || 'Failed to use current location'); }
                }}>
                  <Text style={styles.smallBtnText}>Use Current Location</Text>
                </Pressable>
              </View>
              {cityResults.length > 0 ? (
                <View style={{ maxHeight: 150, backgroundColor: Colors.light.itemBackground, borderRadius: 8, marginTop: 8 }}>
                  {cityResults.map((item, idx) => (
                    <Pressable key={`${idx}-${item.latitude}-${item.longitude}`} style={[styles.cityItem, chosenCenter && item.latitude === chosenCenter.latitude && item.longitude === chosenCenter.longitude ? styles.cityItemSelected : null]} onPress={() => setChosenCenter(item)}>
                      <Text style={styles.cityText}>Lat {item.latitude.toFixed(4)} • Lon {item.longitude.toFixed(4)}</Text>
                      <Text style={styles.cityHint}>Tap to select</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              {chosenCenter ? (
                <Text style={styles.selectionMeta}>Selected: Lat {chosenCenter.latitude.toFixed(4)} • Lon {chosenCenter.longitude.toFixed(4)}</Text>
              ) : null}
            </View>

            {/* Step 2: Settings */}
            <View style={styles.sectionCard}>
              <Text style={styles.stepLabel}>2. Radius & Dates</Text>
              <View style={styles.chipsRow}>
                {QUICK_MILES.map((mi) => (
                  <Pressable key={mi} style={[styles.chip, isRadiusSelected(mi) && styles.chipSelected]} onPress={() => setRadiusMiles(mi)}>
                    <Text style={[styles.chipText, isRadiusSelected(mi) && styles.chipTextSelected]}>{mi} mi</Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.formRow}><Text style={styles.label}>Radius (meters)</Text><TextInput style={styles.input} value={radius} onChangeText={setRadius} keyboardType="numeric" placeholder={defaultRadiusMeters} /></View>
              <View style={[styles.rowBetween, { marginTop: 8 }]}>
                <Text style={styles.label}>Use custom dates (otherwise: today only)</Text>
                <Switch value={useCustomDates} onValueChange={setUseCustomDates} />
              </View>
              {useCustomDates ? (
                <>
                  <View style={styles.formRow}><Text style={styles.label}>Active From (YYYY-MM-DD)</Text><TextInput style={styles.input} value={activeFrom} onChangeText={setActiveFrom} /></View>
                  <View style={styles.formRow}><Text style={styles.label}>Active To (YYYY-MM-DD)</Text><TextInput style={styles.input} value={activeTo} onChangeText={setActiveTo} /></View>
                </>
              ) : (
                <Text style={styles.selectionMeta}>Will run for 24 hours starting now</Text>
              )}
            </View>

            {/* Step 3: Animals */}
            <View style={styles.sectionCard}>
              <Text style={styles.stepLabel}>3. Choose Animals</Text>
              <TextInput style={styles.search} placeholder="Filter animals" value={filter} onChangeText={setFilter} />
              {/* Selected chips */}
              {selectedAnimalIds.length > 0 ? (
                <View style={[styles.chipsRow, { marginBottom: 8 }]}>
                  {selectedAnimalIds.map((id) => {
                    const a = animals.find((x:any) => x._id === id);
                    if (!a) return null;
                    return (
                      <View key={id} style={[styles.chip, styles.chipSelected, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                        <Pressable onPress={() => toggleAnimal(id)}>
                          <Text style={[styles.chipText, styles.chipTextSelected]}>{a.commonName}</Text>
                        </Pressable>
                        <TextInput
                          style={styles.countInput}
                          value={selectedCounts[id] || '1'}
                          onChangeText={(t) => setCountFor(id, t)}
                          keyboardType="numeric"
                        />
                        <Text style={[styles.chipText, styles.chipTextSelected]}>required</Text>
                      </View>
                    );
                  })}
                </View>
              ) : null}
              <View style={{ backgroundColor: Colors.light.itemBackground, borderRadius: 8 }}>
                {(filteredAnimals as any[]).map((item: any) => (
                  <Pressable key={item._id} style={styles.animalItem} onPress={() => toggleAnimal(item._id)}>
                    <Icon name={selectedAnimalIds.includes(item._id) ? 'check-square' : 'square-o'} size={18} color={Colors.light.primaryGreen} />
                    <Text style={styles.animalName}>{item.commonName}</Text>
                  </Pressable>
                ))}
              </View>
              {/* per-animal required counts handled above */}
            </View>

            {/* Step 4: Create */}
            <Pressable style={styles.createBtn} onPress={() => createChallenge()}>
              <FontAwesome5 name="plus-circle" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.createBtnText}>Create Daily Challenge</Text>
            </Pressable>

            {/* Existing */}
            <View style={styles.existingHeader}>
              <FontAwesome5 name="list" size={16} color={Colors.light.primaryGreen} />
              <Text style={styles.h2}>Existing Challenges</Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <FontAwesome5 name="trophy" size={16} color={Colors.light.primaryGreen} />
              <Text style={styles.cardTitle}>{item.title || 'Daily Challenge'}</Text>
            </View>
            {item.description ? <Text style={styles.cardDesc}>{item.description}</Text> : null}
            <View style={styles.cardMetaRow}>
              <FontAwesome5 name="clock" size={12} color="#999" />
              <Text style={styles.cardMeta}>{new Date(item.activeFrom).toLocaleDateString()} - {new Date(item.activeTo).toLocaleDateString()}</Text>
            </View>
            <View style={styles.cardMetaRow}>
              <FontAwesome5 name="map-marker-alt" size={12} color="#999" />
              <Text style={styles.cardMeta}>{(item.radiusMeters/1609.34).toFixed(0)} mi radius • [{item.center?.coordinates?.[1]?.toFixed(2)}, {item.center?.coordinates?.[0]?.toFixed(2)}]</Text>
            </View>
            <View style={styles.cardMetaRow}>
              <FontAwesome5 name="paw" size={12} color="#999" />
              <Text style={styles.cardMeta}>{item.targetCount ?? item.animals?.length} of {item.animals?.length} animals</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <FontAwesome5 name="trophy" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No challenges yet</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.light.background },
  loadingText: { marginTop: 12, fontSize: 16, color: '#666' },
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
  listContent: { padding: 16, paddingBottom: 28 },
  h2: { fontSize: 18, fontWeight: '700', color: Colors.light.primaryGreen, marginLeft: 8 },
  existingHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 24, marginBottom: 8 },
  sectionCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.light.mainText },
  sectionSub: { marginTop: 4, color: '#666', fontSize: 13 },
  stepLabel: { fontSize: 14, fontWeight: '700', color: Colors.light.primaryGreen, marginBottom: 10 },
  formRow: { marginBottom: 8 },
  label: { fontSize: 12, color: '#666', marginBottom: 4 },
  input: { backgroundColor: '#f8f8f8', borderColor: '#e0e0e0', borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  search: { backgroundColor: '#f8f8f8', borderColor: '#e0e0e0', borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 8 },
  smallBtn: { alignSelf: 'flex-start', backgroundColor: Colors.light.primaryGreen, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  smallBtnText: { color: '#fff', fontWeight: '600' },
  cityItem: { padding: 12, borderBottomColor: '#eee', borderBottomWidth: 1 },
  cityItemSelected: { backgroundColor: Colors.light.primaryGreen + '15' },
  cityText: { color: Colors.light.mainText, fontWeight: '500' },
  cityHint: { color: '#999', fontSize: 12 },
  selectionMeta: { marginTop: 8, color: '#666', fontSize: 12, fontStyle: 'italic' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chipsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' as any, marginBottom: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#e0e0e0', backgroundColor: '#fff' },
  chipSelected: { backgroundColor: Colors.light.primaryGreen, borderColor: Colors.light.primaryGreen },
  chipText: { color: Colors.light.mainText, fontSize: 13 },
  chipTextSelected: { color: '#fff', fontWeight: '600' },
  countInput: { width: 44, height: 28, backgroundColor: '#fff', borderRadius: 6, borderWidth: 1, borderColor: '#ddd', textAlign: 'center', color: Colors.light.mainText },
  animalItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomColor: '#eee', borderBottomWidth: 1 },
  animalName: { marginLeft: 12, color: Colors.light.mainText, fontSize: 14 },
  createBtn: { marginTop: 16, backgroundColor: Colors.light.primaryGreen, borderRadius: 12, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginTop: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: Colors.light.mainText, marginLeft: 8 },
  cardDesc: { marginTop: 4, color: '#666', fontSize: 13 },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 6 },
  cardMeta: { color: '#999', fontSize: 12 },
  emptyContainer: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { marginTop: 12, fontSize: 16, color: '#999' },
});
