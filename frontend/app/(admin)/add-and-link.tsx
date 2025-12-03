import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { apiSearchAnimals } from '../../api/animal';
import { apiCreateOrUpdateMapping, apiGetUnmappedAINames } from '../../api/mapping';
import AddAnimalModal from '../../components/AddAnimalModal';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext';

type UnmappedItem = { aiName: string; count?: number };
type Animal = { _id: string; commonName: string; scientificName?: string; imageUrls?: string[] };

export default function AddAndLinkAnimals(): React.JSX.Element {
  const { user, token } = useAuth();
  const router = useRouter();
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
        <FontAwesome5 name="lock" size={48} color="#ccc" />
        <Text style={styles.denied}>Not authorized</Text>
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
          <FontAwesome5 name="link" size={32} color="#fff" />
          <Text style={styles.headerTitle}>Add & Link Animals</Text>
          <Text style={styles.headerSubtitle}>{items.length} unmapped labels</Text>
        </View>
        <Pressable style={styles.addButton} onPress={() => setAddOpen(true)}>
          <FontAwesome5 name="plus" size={16} color="#fff" />
        </Pressable>
      </LinearGradient>

      {/* Global filter for AI labels when not expanded */}
      {!expanded && (
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <FontAwesome5 name="search" size={16} color="#999" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Filter AI labels..."
              placeholderTextColor="#999"
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')}>
                <FontAwesome5 name="times-circle" size={16} color="#999" />
              </Pressable>
            )}
          </View>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.primaryGreen} />
          <Text style={styles.loadingText}>Loading unmapped labels...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.aiName}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.light.primaryGreen]} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <FontAwesome5 name="check-circle" size={48} color="#34C759" />
              <Text style={styles.emptyText}>All labels are mapped!</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isOpen = expanded === item.aiName;
            return (
              <View style={styles.card}>
                <TouchableOpacity onPress={() => handleExpand(item.aiName)} activeOpacity={0.7}>
                  <View style={styles.cardHeader}>
                    <View style={styles.badge}>
                      <FontAwesome5 name="question-circle" size={10} color={Colors.light.primaryGreen} />
                      <Text style={styles.badgeText}>Unmapped</Text>
                    </View>
                    <Text style={styles.cardTitle} numberOfLines={1}>{item.aiName}</Text>
                    {typeof item.count === 'number' && (
                      <View style={styles.countBadge}>
                        <Text style={styles.countText}>{item.count}</Text>
                      </View>
                    )}
                    <FontAwesome5 name={isOpen ? 'chevron-up' : 'chevron-down'} size={14} color="#999" />
                  </View>
                </TouchableOpacity>

                {isOpen && (
                  <View style={styles.expanded}>
                    <Text style={styles.label}>Search animals to link</Text>
                    <View style={styles.inlineSearch}>
                      <FontAwesome5 name="search" size={14} color="#999" />
                      <TextInput
                        style={styles.inlineInput}
                        placeholder="Start typing an animal name..."
                        placeholderTextColor="#999"
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
                        ListEmptyComponent={
                          search.length > 0 ? (
                            <Text style={styles.noResultsText}>No animals found</Text>
                          ) : null
                        }
                        renderItem={({ item: a }) => {
                          const thumb = (a.imageUrls && a.imageUrls[0]) || undefined;
                          return (
                            <View style={styles.resultRow}>
                              <View style={styles.thumbWrap}>
                                {thumb ? (
                                  <Image source={{ uri: thumb }} style={{ width: '100%', height: '100%' }} />
                                ) : (
                                  <View style={styles.thumbPlaceholder}>
                                    <FontAwesome5 name="paw" size={14} color="#999" />
                                  </View>
                                )}
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.resultName} numberOfLines={1}>{a.commonName}</Text>
                                {!!a.scientificName && (
                                  <Text style={styles.resultSci} numberOfLines={1}>{a.scientificName}</Text>
                                )}
                              </View>
                              <TouchableOpacity
                                style={[styles.linkBtn, linking === a._id && styles.linkBtnDisabled]}
                                disabled={!!linking}
                                onPress={() => linkToAnimal(item.aiName, a._id)}
                              >
                                {linking === a._id ? (
                                  <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                  <>
                                    <FontAwesome5 name="link" size={12} color="#fff" />
                                    <Text style={styles.linkBtnText}>Link</Text>
                                  </>
                                )}
                              </TouchableOpacity>
                            </View>
                          );
                        }}
                      />
                    </View>
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
  container: { flex: 1, backgroundColor: Colors.light.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.light.background, padding: 20 },
  denied: { color: '#999', fontSize: 16, marginTop: 12 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  addButton: {
    position: 'absolute',
    top: 50,
    right: 16,
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: { flex: 1, fontSize: 16, color: '#333' },
  listContent: { padding: 16, paddingBottom: 28 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { marginTop: 12, fontSize: 16, color: '#666' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.light.primaryGreen + '15', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, color: Colors.light.primaryGreen, fontWeight: '600' },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: '#333' },
  countBadge: { backgroundColor: '#f0f0f0', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  countText: { fontSize: 12, color: '#666', fontWeight: '600' },
  expanded: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  label: { color: '#333', fontWeight: '600', marginBottom: 8, fontSize: 14 },
  inlineSearch: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f8f8', borderRadius: 10, paddingHorizontal: 12, marginBottom: 12 },
  inlineInput: { flex: 1, paddingVertical: 10, paddingHorizontal: 8, color: '#333', fontSize: 14 },
  noResultsText: { textAlign: 'center', color: '#999', paddingVertical: 20 },
  resultRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  thumbWrap: { width: 40, height: 40, borderRadius: 8, overflow: 'hidden', backgroundColor: '#f0f0f0', marginRight: 12 },
  thumbPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  resultName: { color: '#333', fontWeight: '600', fontSize: 14 },
  resultSci: { color: '#999', fontSize: 12, marginTop: 2 },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: Colors.light.primaryGreen, borderRadius: 8 },
  linkBtnDisabled: { opacity: 0.7 },
  linkBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
});
