import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { apiSearchAnimals } from '../../api/animal';
import { apiCreateOrUpdateMapping, apiGetUnmappedAINames } from '../../api/mapping';
import AddAnimalModal from '../../components/AddAnimalModal';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext';

type UnmappedItem = { aiName: string; count?: number };
type Animal = { _id: string; commonName: string; scientificName?: string; imageUrls?: string[] };

export default function AddAndLinkAnimals(): React.JSX.Element {
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<UnmappedItem[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Animal[]>([]);
  const [linking, setLinking] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const isAdmin = user?.role === 'admin';

  const fetchUnmapped = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const resp = await apiGetUnmappedAINames(token, 200);
      const data = (resp?.data || []).map((x: any) => ({ aiName: x.aiName || x._id || '', count: x.count })) as UnmappedItem[];
      setItems(data.filter(x => !!x.aiName));
    } catch (e) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchUnmapped(); }, [fetchUnmapped]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!expanded || !token) { setResults([]); return; }
      const q = search.trim();
      if (!q) { setResults([]); return; }
      try {
        const r = await apiSearchAnimals(q, token);
        if (!cancelled) setResults(r?.data || []);
      } catch {
        if (!cancelled) setResults([]);
      }
    };
    const t = setTimeout(run, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [search, expanded, token]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchUnmapped();
    setRefreshing(false);
  }, [fetchUnmapped]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || expanded) return items; // when expanded, search applies to animal results, not the list
    return items.filter(x => x.aiName.toLowerCase().includes(q));
  }, [items, search, expanded]);

  const handleExpand = (name: string) => {
    setExpanded(prev => (prev === name ? null : name));
    setResults([]);
    setSearch('');
  };

  const linkToAnimal = async (aiName: string, animalId: string) => {
    if (!token) return;
    try {
      setLinking(animalId);
      await apiCreateOrUpdateMapping(token, aiName, animalId, true);
      await fetchUnmapped();
      setExpanded(null);
      setResults([]);
      setSearch('');
    } finally {
      setLinking(null);
    }
  };

  if (!isAdmin) {
    return (
      <View style={styles.centered}> 
        <Text style={styles.denied}>Not authorized</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Add & Link Animals</Text>
        <Text style={styles.subtitle}>Review unmapped AI labels, link to animals, or create new ones</Text>
      </View>

      {/* Global Add Animal action */}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => setAddOpen(true)}>
          <Text style={styles.primaryBtnText}>Add Animal</Text>
        </TouchableOpacity>
      </View>

      {/* Global filter for AI labels when not expanded */}
      {!expanded && (
        <View style={styles.searchWrap}>
          <Icon name="search" size={14} color={Colors.light.darkNeutral} />
          <TextInput
            style={styles.searchInput}
            placeholder="Filter AI labels..."
            placeholderTextColor={Colors.light.darkNeutral}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      )}

      {loading ? (
        <View style={styles.centered}><ActivityIndicator /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.aiName}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ paddingBottom: 16 }}
          renderItem={({ item }) => {
            const isOpen = expanded === item.aiName;
            return (
              <View style={styles.card}>
                <TouchableOpacity onPress={() => handleExpand(item.aiName)} activeOpacity={0.7}>
                  <View style={styles.cardHeader}>
                    <View style={styles.badge}><Text style={styles.badgeText}>Unmapped</Text></View>
                    <Text style={styles.cardTitle} numberOfLines={1}>{item.aiName}</Text>
                    {typeof item.count === 'number' && (
                      <Text style={styles.count}>{item.count}</Text>
                    )}
                    <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size={14} color={Colors.light.darkNeutral} />
                  </View>
                </TouchableOpacity>

                {isOpen && (
                  <View style={styles.expanded}>
                    <Text style={styles.label}>Search animals to link</Text>
                    <View style={styles.inlineSearch}>
                      <Icon name="search" size={14} color={Colors.light.darkNeutral} />
                      <TextInput
                        style={styles.inlineInput}
                        placeholder="Start typing an animal name..."
                        placeholderTextColor={Colors.light.darkNeutral}
                        value={search}
                        onChangeText={setSearch}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>
                    <View style={{ maxHeight: 260 }}>
                      <FlatList
                        data={results}
                        keyExtractor={(a) => a._id}
                        renderItem={({ item: a }) => {
                          const thumb = (a.imageUrls && a.imageUrls[0]) || undefined;
                          return (
                            <View style={styles.resultRow}>
                              <View style={styles.thumbWrap}>
                                {thumb ? (
                                  <Image source={{ uri: thumb }} style={{ width: '100%', height: '100%' }} />
                                ) : (
                                  <View style={styles.thumbPlaceholder}><Icon name="image" size={16} color={Colors.light.darkNeutral} /></View>
                                )}
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.resultName} numberOfLines={1}>{a.commonName}</Text>
                                {!!a.scientificName && (
                                  <Text style={styles.resultSci} numberOfLines={1}>{a.scientificName}</Text>
                                )}
                              </View>
                              <TouchableOpacity
                                style={styles.linkBtn}
                                disabled={!!linking}
                                onPress={() => linkToAnimal(item.aiName, a._id)}
                              >
                                <Text style={styles.linkBtnText}>{linking === a._id ? 'Linking…' : 'Link'}</Text>
                              </TouchableOpacity>
                            </View>
                          );
                        }}
                      />
                    </View>

                    {/* Per-item Add removed; use the global Add Animal button above */}
                  </View>
                )}
              </View>
            );
          }}
        />
      )}

      {/* Add Animal Modal */}
      <AddAnimalModal
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={() => { setAddOpen(false); fetchUnmapped(); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: Colors.light.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.light.background },
  denied: { color: '#ef4444', fontWeight: '600' },
  header: { marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.light.primaryGreen, marginBottom: 2 },
  subtitle: { fontSize: 13, color: Colors.light.darkNeutral },
  actionsRow: { flexDirection: 'row', justifyContent: 'flex-start', marginBottom: 10 },
  primaryBtn: { backgroundColor: Colors.light.primaryGreen, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: Colors.light.shadow, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 10 },
  searchInput: { flex: 1, marginLeft: 8, color: Colors.light.mainText },

  card: { backgroundColor: Colors.light.itemBackground, borderRadius: 12, borderWidth: 1, borderColor: Colors.light.shadow, padding: 12, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { backgroundColor: Colors.light.lightGrey, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11, color: Colors.light.mainText, fontWeight: '600' },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: Colors.light.mainText },
  count: { fontSize: 12, color: Colors.light.darkNeutral },
  expanded: { marginTop: 10 },
  label: { color: Colors.light.mainText, fontWeight: '600', marginBottom: 6 },
  inlineSearch: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: Colors.light.shadow, paddingHorizontal: 8, marginBottom: 8 },
  inlineInput: { flex: 1, paddingVertical: 6, paddingHorizontal: 8, color: Colors.light.mainText },
  resultRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.light.shadow },
  thumbWrap: { width: 36, height: 36, borderRadius: 6, overflow: 'hidden', backgroundColor: Colors.light.lightGrey, marginRight: 8 },
  thumbPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  resultName: { color: Colors.light.mainText, fontWeight: '600' },
  resultSci: { color: Colors.light.darkNeutral, fontSize: 12 },
  linkBtn: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: Colors.light.accent, borderRadius: 6 },
  linkBtnText: { color: '#fff', fontWeight: '700' },
});
