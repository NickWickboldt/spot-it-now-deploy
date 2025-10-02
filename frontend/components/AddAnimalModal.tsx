import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { apiCreateAnimal, apiSuggestAnimal } from '../api/animalAdmin';
import { useAuth } from '../context/AuthContext';

type Props = {
  visible: boolean;
  onClose: () => void;
  defaultCommonName?: string;
};

const categories = ['Mammals', 'Birds', 'Insects and Arachnids', 'Reptiles and Amphibians', 'Marine Animals'];
const rarityLevels = ['Common', 'Uncommon', 'Rare', 'Legendary'];

export const AddAnimalModal: React.FC<Props> = ({ visible, onClose, defaultCommonName = '' }) => {
  const { token } = useAuth();
  const [commonName, setCommonName] = useState(defaultCommonName);
  const [scientificName, setScientificName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [rarityLevel, setRarityLevel] = useState(rarityLevels[0]);
  const [conservationStatus, setConservationStatus] = useState('Not Evaluated');
  const [loading, setLoading] = useState(false);

  // Keep input in sync when parent provides a new default or when modal opens
  useEffect(() => {
    setCommonName(defaultCommonName);
  }, [defaultCommonName, visible]);

  const reset = () => {
    setScientificName('');
    setDescription('');
    setCategory(categories[0]);
    setRarityLevel(rarityLevels[0]);
    setConservationStatus('Not Evaluated');
  };

  const handleSuggest = async () => {
    if (!token) {
      Alert.alert('Auth required', 'Please log in as an admin.');
      return;
    }
    if (!commonName.trim()) {
      Alert.alert('Missing', 'Enter a common name first.');
      return;
    }
    setLoading(true);
    try {
      const res = await apiSuggestAnimal(token, commonName.trim());
      const data = res?.data;
      if (data) {
        setScientificName(data.scientificName || '');
        setDescription(data.description || '');
        if (categories.includes(data.category)) setCategory(data.category);
        if (rarityLevels.includes(data.rarityLevel)) setRarityLevel(data.rarityLevel);
        setConservationStatus(data.conservationStatus || 'Not Evaluated');
      } else {
        Alert.alert('No suggestion', 'AI did not return a suggestion.');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to fetch suggestion');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!token) {
      Alert.alert('Auth required', 'Please log in as an admin.');
      return;
    }
    if (!commonName.trim() || !scientificName.trim() || !description.trim()) {
      Alert.alert('Missing fields', 'Common name, scientific name, and description are required.');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        commonName: commonName.trim(),
        scientificName: scientificName.trim(),
        description: description.trim(),
        category,
        rarityLevel,
        conservationStatus,
        imageUrls: [],
      };
      const res = await apiCreateAnimal(token, payload);
      if (res?.data) {
        Alert.alert('Success', 'Animal created successfully');
        onClose();
        reset();
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to create animal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Add Animal to DB</Text>
          <TextInput
            placeholder="Common Name"
            style={styles.input}
            value={commonName}
            onChangeText={setCommonName}
          />
          <View style={styles.row}>
            <TouchableOpacity style={styles.secondary} onPress={handleSuggest} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.secondaryText}>AI Suggest</Text>}
            </TouchableOpacity>
          </View>

          <TextInput
            placeholder="Scientific Name"
            style={styles.input}
            value={scientificName}
            onChangeText={setScientificName}
          />
          <TextInput
            placeholder="Description"
            style={[styles.input, styles.multiline]}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />
          <TextInput
            placeholder="Category (e.g., Mammals)"
            style={styles.input}
            value={category}
            onChangeText={setCategory}
          />
          <TextInput
            placeholder="Rarity (Common/Uncommon/Rare/Legendary)"
            style={styles.input}
            value={rarityLevel}
            onChangeText={setRarityLevel}
          />
          <TextInput
            placeholder="Conservation Status"
            style={styles.input}
            value={conservationStatus}
            onChangeText={setConservationStatus}
          />

          <View style={styles.row}>
            <TouchableOpacity style={styles.cancel} onPress={onClose} disabled={loading}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primary} onPress={handleCreate} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Create</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' },
  modal: { backgroundColor: '#fff', width: '90%', borderRadius: 12, padding: 16 },
  title: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 10 },
  multiline: { height: 90, textAlignVertical: 'top' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8 },
  primary: { backgroundColor: '#007AFF', paddingVertical: 12, paddingHorizontal: 18, borderRadius: 8 },
  primaryText: { color: '#fff', fontWeight: '600' },
  secondary: { backgroundColor: '#6b7280', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8 },
  secondaryText: { color: '#fff', fontWeight: '600' },
  cancel: { paddingVertical: 10, paddingHorizontal: 12 },
  cancelText: { color: '#6b7280', fontWeight: '600' },
});

export default AddAnimalModal;
