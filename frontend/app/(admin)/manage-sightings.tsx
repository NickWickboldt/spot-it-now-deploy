// ==================================================================
// File: app/(admin)/manage-sightings.tsx
// ==================================================================

import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, FlatList, Image, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { setBaseUrl } from '../../api/client';
import { apiAdminDeleteSighting, apiAdminGetAllSightings, apiAdminUpdateSighting, apiCreateSighting, apiGetSightingById, apiGetSightingsNear } from '../../api/sighting';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

export default function ManageSightingsScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const [sightings, setSightings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(20);
  const [total, setTotal] = useState<number>(0);
  const [q, setQ] = useState<string>('');
  const [selectedSightingId, setSelectedSightingId] = useState<string | null>(null);
  const [selectedSighting, setSelectedSighting] = useState<any>(null);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [form, setForm] = useState<any>({ mediaUrls: [], latitude: null, longitude: null, caption: '', isPrivate: false, animal: '' });

  const fetchNearby = async () => {
    try {
      setError(null);
      let resp: any = null;
      if (token) {
        // If admin token available, use admin route to get paginated sightings
        resp = await apiAdminGetAllSightings(token, page, pageSize, q);
        setSightings(resp.data?.items || []);
        setTotal(resp.data?.total || 0);
      } else {
        // fallback to public near query
        resp = await apiGetSightingsNear(0, 0, 100000, '');
        setSightings(resp.data || []);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to fetch sightings.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const openSightingDetails = async (sightingId: string, base?: any) => {
    setSelectedSightingId(sightingId);
    setSelectedSighting(null);
    setIsDetailsLoading(true);
    setIsEditMode(false);
    if (base) {
      setForm({
        mediaUrls: base.mediaUrls || [],
        latitude: base.location?.coordinates?.[1] ?? null,
        longitude: base.location?.coordinates?.[0] ?? null,
        caption: base.caption || '',
        isPrivate: !!base.isPrivate,
        animal: base.animal || '',
      });
    }

    try {
      const full = await apiGetSightingById(sightingId);
      setSelectedSighting(full.data || {});
      const d = full.data || {};
      setForm({
        mediaUrls: d.mediaUrls || [],
        latitude: d.location?.coordinates?.[1] ?? null,
        longitude: d.location?.coordinates?.[0] ?? null,
        caption: d.caption || '',
        isPrivate: !!d.isPrivate,
        animal: d.animal || '',
      });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load sighting');
      setSelectedSighting({});
    } finally {
      setIsDetailsLoading(false);
    }
  };

  const openCreate = () => {
    setSelectedSightingId('');
    setSelectedSighting(null);
    setIsEditMode(true);
    setForm({ mediaUrls: [], latitude: null, longitude: null, caption: '', isPrivate: false, animal: '' });
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    setPage(1);
    fetchNearby();
  };

  useEffect(() => {
    // same dev-server convenience as users page
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Constants: any = require('expo-constants');
      const manifest = Constants?.manifest || Constants?.expoConfig || Constants?.manifest2;
      const debuggerHost = manifest?.debuggerHost || manifest?.hostUri || manifest?.packagerOpts?.devClient?.url;
      if (debuggerHost && typeof debuggerHost === 'string') {
        const ip = debuggerHost.split(':')[0];
        const url = `http://${ip}:8000/api/v1`;
        setBaseUrl(url);
        console.log('[ManageSightings] setBaseUrl ->', url);
      }
    } catch (e) {
      // ignore
    }

    fetchNearby();
  }, [token]);

  // refetch when pagination or search changes
  useEffect(() => {
    setIsLoading(true);
    fetchNearby();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, q]);

  const handleSave = async () => {
    if (!token) return Alert.alert('Not authenticated');
    // Validate coordinates
    if (form.latitude == null || form.longitude == null) return Alert.alert('Please provide latitude and longitude');
    try {
      if (selectedSightingId === '') {
        // create
        const payload: any = {
          mediaUrls: form.mediaUrls,
          latitude: Number(form.latitude),
          longitude: Number(form.longitude),
          caption: form.caption,
          isPrivate: !!form.isPrivate,
          animal: form.animal || undefined,
        };
        await apiCreateSighting(token, payload);
        Alert.alert('Created');
      } else {
        // update
        const updates: any = {};
        if (form.caption !== selectedSighting?.caption) updates.caption = form.caption;
        if (form.isPrivate !== selectedSighting?.isPrivate) updates.isPrivate = form.isPrivate;
        if (form.animal !== selectedSighting?.animal) updates.animal = form.animal;
        if (form.latitude != null && form.longitude != null) updates.location = { type: 'Point', coordinates: [Number(form.longitude), Number(form.latitude)] };
        await apiAdminUpdateSighting(token as string, selectedSightingId as string, updates);
        Alert.alert('Updated');
      }
      setIsEditMode(false);
      setSelectedSightingId(null);
      fetchNearby();
    } catch (e: any) {
      Alert.alert('Error', String(e));
    }
  };

  const handleDelete = async (sightingId?: string) => {
    const id = sightingId || selectedSightingId;
    if (!id) return;
    if (!token) return Alert.alert('Not authenticated');
    Alert.alert('Delete', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await apiAdminDeleteSighting(token as string, id as string);
          setSelectedSightingId(null);
          setIsEditMode(false);
          fetchNearby();
        } catch (e: any) {
          Alert.alert('Error', String(e));
        }
      } }
    ]);
  };

  if (isLoading) return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={Colors.light.primary} />
      <Text style={styles.loadingText}>Loading sightings...</Text>
    </View>
  );
  
  if (error) return (
    <View style={styles.errorContainer}>
      <FontAwesome5 name="exclamation-circle" size={48} color="#FF3B30" />
      <Text style={styles.errorText}>{error}</Text>
      <Pressable style={styles.retryButton} onPress={() => { setIsLoading(true); fetchNearby(); }}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </Pressable>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Gradient Header */}
      <LinearGradient
        colors={[Colors.light.primary, Colors.light.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <FontAwesome5 name="arrow-left" size={20} color="#fff" />
        </Pressable>
        <View style={styles.headerContent}>
          <FontAwesome5 name="binoculars" size={32} color="#fff" />
          <Text style={styles.headerTitle}>Manage Sightings</Text>
          <Text style={styles.headerSubtitle}>{total} total sightings</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable style={styles.headerActionButton} onPress={openCreate}>
            <FontAwesome5 name="plus" size={16} color="#fff" />
          </Pressable>
          <Pressable style={styles.headerActionButton} onPress={() => { setIsLoading(true); fetchNearby(); }}>
            <FontAwesome5 name="sync" size={16} color="#fff" />
          </Pressable>
        </View>
      </LinearGradient>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <FontAwesome5 name="search" size={16} color="#999" style={styles.searchIcon} />
          <TextInput
            placeholder="Search captions..."
            placeholderTextColor="#999"
            value={q}
            onChangeText={(t) => { setQ(t); setPage(1); }}
            style={styles.searchInput}
          />
          {q.length > 0 && (
            <Pressable onPress={() => { setQ(''); setPage(1); }}>
              <FontAwesome5 name="times-circle" size={16} color="#999" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Sightings List */}
      <View style={styles.scrollWrapper}>
        <FlatList
          data={sightings}
          keyExtractor={(item: any) => item._id}
          renderItem={({ item }: { item: any }) => (
            <Pressable style={styles.sightingCard} onPress={() => openSightingDetails(item._id, item)}>
              {/* Thumbnail */}
              <View style={styles.sightingThumb}>
                {item.mediaUrls?.length > 0 ? (
                  <Image source={{ uri: item.mediaUrls[0] }} style={styles.thumbImage} />
                ) : (
                  <FontAwesome5 name="image" size={20} color="#999" />
                )}
              </View>
              {/* Info */}
              <View style={styles.sightingInfo}>
                <Text style={styles.sightingCaption} numberOfLines={1}>{item.caption || '(no caption)'}</Text>
                <Text style={styles.sightingSub}>
                  <FontAwesome5 name="user" size={10} color="#999" /> {item.user?.username || 'Unknown'}
                </Text>
                <Text style={styles.sightingSub}>
                  <FontAwesome5 name="map-marker-alt" size={10} color="#999" /> {item.location?.coordinates?.[1]?.toFixed(4)}, {item.location?.coordinates?.[0]?.toFixed(4)}
                </Text>
              </View>
              {/* Actions */}
              <View style={styles.sightingActions}>
                <Pressable style={styles.iconButton} onPress={async () => { await openSightingDetails(item._id, item); setIsEditMode(true); }}>
                  <FontAwesome5 name="edit" size={16} color={Colors.light.primary} />
                </Pressable>
                <Pressable style={styles.iconButton} onPress={() => handleDelete(item._id)}>
                  <FontAwesome5 name="trash-alt" size={16} color="#FF3B30" />
                </Pressable>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <FontAwesome5 name="binoculars" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No sightings found</Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[Colors.light.primary]} />}
        />
      </View>

      {/* Pagination */}
      {token && (
        <View style={styles.pagination}>
          <Pressable 
            disabled={page <= 1} 
            onPress={() => setPage(Math.max(1, page - 1))} 
            style={[styles.pageButton, page <= 1 && styles.pageButtonDisabled]}
          >
            <FontAwesome5 name="chevron-left" size={14} color={page <= 1 ? '#ccc' : Colors.light.primary} />
          </Pressable>
          <Text style={styles.pageInfo}>Page {page} of {Math.ceil(total / pageSize) || 1}</Text>
          <Pressable 
            disabled={page * pageSize >= total} 
            onPress={() => setPage(page + 1)} 
            style={[styles.pageButton, page * pageSize >= total && styles.pageButtonDisabled]}
          >
            <FontAwesome5 name="chevron-right" size={14} color={page * pageSize >= total ? '#ccc' : Colors.light.primary} />
          </Pressable>
        </View>
      )}

      {/* Sighting Modal */}
      <Modal visible={!!selectedSightingId || isEditMode} animationType="slide" transparent={true} onRequestClose={() => { setSelectedSightingId(null); setIsEditMode(false); }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <LinearGradient
              colors={[Colors.light.primary, Colors.light.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.modalHeader}
            >
              <Pressable style={styles.modalClose} onPress={() => { setSelectedSightingId(null); setIsEditMode(false); }}>
                <FontAwesome5 name="times" size={20} color="#fff" />
              </Pressable>
              <Text style={styles.modalTitle}>{selectedSightingId === '' ? 'New Sighting' : isEditMode ? 'Edit Sighting' : 'Sighting Details'}</Text>
            </LinearGradient>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {isDetailsLoading && (
                <View style={styles.modalLoading}>
                  <ActivityIndicator size="large" color={Colors.light.primary} />
                </View>
              )}

              {!isDetailsLoading && (
                <>
                  {/* Media Preview */}
                  {selectedSighting?.mediaUrls?.length > 0 && (
                    <View style={styles.mediaPreview}>
                      <Image source={{ uri: selectedSighting.mediaUrls[0] }} style={styles.mediaImage} />
                    </View>
                  )}

                  {!isEditMode && selectedSighting && (
                    /* View Mode */
                    <View style={styles.detailsContainer}>
                      <View style={styles.detailCard}>
                        <Text style={styles.detailLabel}>Caption</Text>
                        <Text style={styles.detailValue}>{selectedSighting.caption || 'No caption'}</Text>
                      </View>
                      <View style={styles.detailCard}>
                        <Text style={styles.detailLabel}>Posted By</Text>
                        <Text style={styles.detailValue}>{selectedSighting.user?.username || 'Unknown'}</Text>
                      </View>
                      <View style={styles.detailCard}>
                        <Text style={styles.detailLabel}>AI Identification</Text>
                        <Text style={styles.detailValue}>{selectedSighting.aiIdentification?.commonName || selectedSighting.aiIdentification || 'N/A'}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <View style={[styles.detailCard, { flex: 1, marginRight: 8 }]}>
                          <Text style={styles.detailLabel}>Private</Text>
                          <Text style={styles.detailValue}>{selectedSighting.isPrivate ? 'Yes' : 'No'}</Text>
                        </View>
                        <View style={[styles.detailCard, { flex: 1 }]}>
                          <Text style={styles.detailLabel}>Created</Text>
                          <Text style={styles.detailValue}>{selectedSighting.createdAt ? new Date(selectedSighting.createdAt).toLocaleDateString() : 'N/A'}</Text>
                        </View>
                      </View>
                      <View style={styles.detailRow}>
                        <View style={[styles.detailCard, { flex: 1, marginRight: 8 }]}>
                          <Text style={styles.detailLabel}>Latitude</Text>
                          <Text style={styles.detailValue}>{selectedSighting.location?.coordinates?.[1]?.toFixed(4) || 'N/A'}</Text>
                        </View>
                        <View style={[styles.detailCard, { flex: 1 }]}>
                          <Text style={styles.detailLabel}>Longitude</Text>
                          <Text style={styles.detailValue}>{selectedSighting.location?.coordinates?.[0]?.toFixed(4) || 'N/A'}</Text>
                        </View>
                      </View>
                      
                      {/* View Mode Actions */}
                      <View style={styles.actionButtons}>
                        <Pressable style={styles.primaryButton} onPress={() => setIsEditMode(true)}>
                          <FontAwesome5 name="edit" size={16} color="#fff" />
                          <Text style={styles.primaryButtonText}>Edit</Text>
                        </Pressable>
                        <Pressable style={styles.dangerButton} onPress={() => handleDelete()}>
                          <FontAwesome5 name="trash-alt" size={16} color="#fff" />
                          <Text style={styles.dangerButtonText}>Delete</Text>
                        </Pressable>
                      </View>
                    </View>
                  )}

                  {isEditMode && (
                    /* Edit Mode */
                    <View style={styles.editContainer}>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Caption</Text>
                        <TextInput 
                          value={form.caption} 
                          onChangeText={(t) => setForm({ ...form, caption: t })} 
                          style={styles.input} 
                          placeholder="Enter caption..."
                        />
                      </View>

                      <View style={styles.inputRow}>
                        <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                          <Text style={styles.inputLabel}>Latitude</Text>
                          <TextInput 
                            value={form.latitude == null ? '' : String(form.latitude)} 
                            onChangeText={(t) => setForm({ ...form, latitude: Number(t) })} 
                            keyboardType="numeric" 
                            style={styles.input} 
                          />
                        </View>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                          <Text style={styles.inputLabel}>Longitude</Text>
                          <TextInput 
                            value={form.longitude == null ? '' : String(form.longitude)} 
                            onChangeText={(t) => setForm({ ...form, longitude: Number(t) })} 
                            keyboardType="numeric" 
                            style={styles.input} 
                          />
                        </View>
                      </View>

                      <View style={styles.switchRow}>
                        <Text style={styles.inputLabel}>Private Sighting</Text>
                        <Switch 
                          value={!!form.isPrivate} 
                          onValueChange={(v) => setForm({ ...form, isPrivate: v })} 
                          trackColor={{ false: '#ddd', true: Colors.light.primary + '50' }}
                          thumbColor={form.isPrivate ? Colors.light.primary : '#f4f3f4'}
                        />
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Media URLs (one per line)</Text>
                        <TextInput 
                          value={(form.mediaUrls || []).join('\n')} 
                          onChangeText={(t) => setForm({ ...form, mediaUrls: t.split('\n').map((s: string) => s.trim()).filter(Boolean) })} 
                          style={[styles.input, styles.textArea]} 
                          multiline
                          placeholder="Enter media URLs..."
                        />
                      </View>

                      <View style={styles.actionButtons}>
                        <Pressable style={styles.primaryButton} onPress={handleSave}>
                          <FontAwesome5 name="save" size={16} color="#fff" />
                          <Text style={styles.primaryButtonText}>{selectedSightingId === '' ? 'Create' : 'Save'}</Text>
                        </Pressable>
                        {selectedSightingId !== '' && (
                          <Pressable style={styles.dangerButton} onPress={() => handleDelete()}>
                            <FontAwesome5 name="trash-alt" size={16} color="#fff" />
                            <Text style={styles.dangerButtonText}>Delete</Text>
                          </Pressable>
                        )}
                      </View>
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
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
  headerActions: {
    position: 'absolute',
    top: 50,
    right: 16,
    flexDirection: 'row',
    gap: 8,
  },
  headerActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.light.background,
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
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  scrollWrapper: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  listContent: {
    padding: 16,
    paddingBottom: 20,
  },
  sightingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sightingThumb: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  thumbImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  sightingInfo: {
    flex: 1,
  },
  sightingCaption: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  sightingSub: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  sightingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconButton: {
    padding: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#999',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  pageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageButtonDisabled: {
    opacity: 0.5,
  },
  pageInfo: {
    fontSize: 14,
    color: '#666',
    marginHorizontal: 20,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.light.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    alignItems: 'center',
  },
  modalClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalBody: {
    padding: 20,
  },
  modalLoading: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  mediaPreview: {
    alignItems: 'center',
    marginBottom: 20,
  },
  mediaImage: {
    width: width - 80,
    height: 200,
    borderRadius: 12,
  },
  detailsContainer: {
    gap: 12,
  },
  detailCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  detailRow: {
    flexDirection: 'row',
  },
  detailLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  editContainer: {
    gap: 16,
  },
  inputGroup: {
    marginBottom: 0,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  inputRow: {
    flexDirection: 'row',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  actionButtons: {
    marginTop: 24,
    marginBottom: 40,
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  dangerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
