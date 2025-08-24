// ==================================================================
// File: app/(admin)/manage-sightings.tsx
// ==================================================================

import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Button, FlatList, Image, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { setBaseUrl } from '../../api/client';
import { apiAdminDeleteSighting, apiAdminGetAllSightings, apiAdminUpdateSighting, apiCreateSighting, apiGetSightingById, apiGetSightingsNear } from '../../api/sighting';
import { useAuth } from '../../context/AuthContext';

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

  if (isLoading) return <View style={manageSightingsStyles.centered}><ActivityIndicator size="large" /></View>;
  if (error) return <View style={manageSightingsStyles.centered}><Text style={manageSightingsStyles.errorText}>{error}</Text></View>;

  return (
    <View style={{ flex: 1 }}>
      <View style={manageSightingsStyles.header}>
        <Pressable style={manageSightingsStyles.headerButton} onPress={openCreate}>
          <Text style={{ color: 'white' }}>Create</Text>
        </Pressable>
        <Pressable style={manageSightingsStyles.headerButton} onPress={() => { setIsLoading(true); fetchNearby(); }}>
          <Text style={{ color: 'white' }}>Refresh</Text>
        </Pressable>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <TextInput placeholder="Search captions..." value={q} onChangeText={(t) => { setQ(t); setPage(1); }} style={[manageSightingsStyles.input, { backgroundColor: 'white' }]} />
        </View>
      </View>

      <FlatList
        data={sightings}
        keyExtractor={(item: any) => item._id}
        renderItem={({ item }: { item: any }) => (
          <View style={manageSightingsStyles.item}>
            <Pressable onPress={() => openSightingDetails(item._id, item)} style={{ flex: 1 }}>
              <View>
                <Text style={manageSightingsStyles.title}>{item.caption || '(no caption)'} </Text>
                <Text style={manageSightingsStyles.sub}>{item.user?.username || item.user} • {item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}</Text>
                <Text style={manageSightingsStyles.sub}>Location: {item.location?.coordinates?.[1]}, {item.location?.coordinates?.[0]}</Text>
              </View>
            </Pressable>
            <View style={manageSightingsStyles.itemActions}>
              <Pressable style={manageSightingsStyles.smallButton} onPress={() => openSightingDetails(item._id, item)}>
                <Text style={{ color: '#007AFF' }}>View</Text>
              </Pressable>
              <Pressable style={manageSightingsStyles.smallButton} onPress={async () => { await openSightingDetails(item._id, item); setIsEditMode(true); }}>
                <Text style={{ color: '#007AFF' }}>Edit</Text>
              </Pressable>
              <Pressable style={manageSightingsStyles.smallButton} onPress={() => handleDelete(item._id)}>
                <Text style={{ color: '#FF3B30' }}>Delete</Text>
              </Pressable>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={manageSightingsStyles.centered}>No sightings found.</Text>}
        contentContainerStyle={manageSightingsStyles.container}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      />

      {/* Pagination controls (admin only) */}
      {token && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 10, alignItems: 'center' }}>
          <Pressable disabled={page <= 1} onPress={() => setPage(Math.max(1, page - 1))} style={[manageSightingsStyles.smallButton, { opacity: page <= 1 ? 0.4 : 1 }]}>
            <Text>Prev</Text>
          </Pressable>
          <Text>Page {page} • {total} items</Text>
          <Pressable disabled={page * pageSize >= total} onPress={() => setPage(page + 1)} style={[manageSightingsStyles.smallButton, { opacity: page * pageSize >= total ? 0.4 : 1 }]}>
            <Text>Next</Text>
          </Pressable>
        </View>
      )}

      <Modal visible={!!selectedSightingId || isEditMode} animationType="slide" onRequestClose={() => { setSelectedSightingId(null); setIsEditMode(false); }}>
        <ScrollView contentContainerStyle={{ padding: 30 }}>
          <Button title="Close" onPress={() => { setSelectedSightingId(null); setIsEditMode(false); }} />
          {isDetailsLoading && <ActivityIndicator size="large" />}

          {!isDetailsLoading && (
            <View>
              <View style={{ alignItems: 'center' }}>
                {selectedSighting?.mediaUrls?.length ? (
                  <Image source={{ uri: selectedSighting.mediaUrls[0] }} style={{ width: 300, height: 200, borderRadius: 8 }} />
                ) : null}
              </View>

              {!isEditMode && selectedSighting && (
                <View>
                  <Text style={{ fontWeight: '700', fontSize: 18 }}>{selectedSighting.caption}</Text>
                  <Text>By: {selectedSighting.user?.username}</Text>
                  <Text>AI Guess: {selectedSighting.aiIdentification?.commonName || selectedSighting.aiIdentification}</Text>
                  <Text>Private: {String(!!selectedSighting.isPrivate)}</Text>
                  <Text>Created: {selectedSighting.createdAt ? new Date(selectedSighting.createdAt).toLocaleString() : ''}</Text>
                  <Text>Media: {JSON.stringify(selectedSighting.mediaUrls || [])}</Text>
                </View>
              )}

              {isEditMode && (
                <View>
                  <Text style={manageSightingsStyles.fieldLabel}>Caption</Text>
                  <TextInput value={form.caption} onChangeText={(t) => setForm({ ...form, caption: t })} style={manageSightingsStyles.input} />

                  <Text style={manageSightingsStyles.fieldLabel}>Latitude</Text>
                  <TextInput value={form.latitude == null ? '' : String(form.latitude)} onChangeText={(t) => setForm({ ...form, latitude: Number(t) })} keyboardType="numeric" style={manageSightingsStyles.input} />

                  <Text style={manageSightingsStyles.fieldLabel}>Longitude</Text>
                  <TextInput value={form.longitude == null ? '' : String(form.longitude)} onChangeText={(t) => setForm({ ...form, longitude: Number(t) })} keyboardType="numeric" style={manageSightingsStyles.input} />

                  <Text style={manageSightingsStyles.fieldLabel}>Private</Text>
                  <Switch value={!!form.isPrivate} onValueChange={(v) => setForm({ ...form, isPrivate: v })} />

                  <Text style={manageSightingsStyles.fieldLabel}>Media URLs (one per line)</Text>
                  <TextInput value={(form.mediaUrls || []).join('\n')} onChangeText={(t) => setForm({ ...form, mediaUrls: t.split('\n').map((s: string) => s.trim()).filter(Boolean) })} style={[manageSightingsStyles.input, { height: 120 }]} multiline />

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
                    <Pressable style={manageSightingsStyles.actionButton} onPress={handleSave}><Text style={{ color: 'white' }}>Save</Text></Pressable>
                    <Pressable style={manageSightingsStyles.dangerButton} onPress={() => handleDelete()}><Text style={{ color: 'white' }}>Delete</Text></Pressable>
                  </View>
                </View>
              )}

            </View>
          )}
        </ScrollView>
      </Modal>

    </View>
  );
}

const manageSightingsStyles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'flex-end', padding: 10, gap: 8 },
  headerButton: { backgroundColor: '#007AFF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginLeft: 8 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { padding: 10 },
  input: { backgroundColor: 'white', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: '#ddd', marginBottom: 8 },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  actionButton: { backgroundColor: '#007AFF', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  dangerButton: { backgroundColor: '#FF3B30', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  itemActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  smallButton: { paddingHorizontal: 8, paddingVertical: 6, marginLeft: 6 },
  item: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#eee' },
  title: { fontSize: 16, fontWeight: '700' },
  sub: { fontSize: 12, color: '#666' },
  fieldLabel: { fontSize: 14, color: '#333', marginTop: 10, marginBottom: 6 },
  errorText: { color: 'red', fontSize: 16, paddingHorizontal: 20, textAlign: 'center' },
});
