import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { apiGetAllAnimals } from '../api/animal';
import { apiAddDiscovery } from '../api/userDiscovery';
import { Colors } from '../constants/Colors';
import { useAuth } from '../context/AuthContext';

interface Animal {
  _id: string;
  commonName: string;
  category: string;
}

export default function DiscoveryTestPanel() {
  const { token } = useAuth();
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchAnimals = async () => {
      try {
        const response = await apiGetAllAnimals(token);
        setAnimals(response.data || []);
      } catch (error) {
        console.error('Failed to fetch animals:', error);
      }
    };

    fetchAnimals();
  }, [token]);

  const handleAddDiscovery = async (animal: Animal, method: 'USER' | 'AI') => {
    try {
      setLoading(true);
      // Generate a fake sighting ID for testing
      const fakeSightingId = `test-sighting-${Date.now()}`;
      
      await apiAddDiscovery(token, animal._id, fakeSightingId, method);
      
      Alert.alert(
        'Discovery Added!',
        `Added ${animal.commonName} as a ${method} discovery`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message || 'Failed to add discovery',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Discovery Test Panel</Text>
      <Text style={styles.subtitle}>Tap animals to add them as discoveries</Text>
      
      {animals.map((animal) => (
        <View key={animal._id} style={styles.animalRow}>
          <Text style={styles.animalName}>
            {animal.commonName} ({animal.category})
          </Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.userButton]}
              onPress={() => handleAddDiscovery(animal, 'USER')}
              disabled={loading}
            >
              <Text style={styles.buttonText}>USER</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.aiButton]}
              onPress={() => handleAddDiscovery(animal, 'AI')}
              disabled={loading}
            >
              <Text style={styles.buttonText}>AI</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: Colors.light.background,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.mainText,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.light.darkNeutral,
    marginBottom: 16,
  },
  animalRow: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  animalName: {
    fontSize: 14,
    color: Colors.light.mainText,
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    minWidth: 60,
  },
  userButton: {
    backgroundColor: Colors.light.primaryGreen,
  },
  aiButton: {
    backgroundColor: Colors.light.accent,
  },
  buttonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});