import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { apiAdminPopulateAnimals } from '../api/admin';
import { ANIMAL_DATA } from '../constants/animalData';
import { useAuth } from '../context/AuthContext';

interface Animal {
  commonName: string;
  scientificName: string;
  description: string;
  rarityLevel: 'Common' | 'Uncommon' | 'Rare' | 'Legendary';
  category: string;
  imageUrls: string[];
  conservationStatus: string;
  kingdom: string;
  phylum: string;
  class: string;
  order: string;
  family: string;
  genus: string;
  species: string;
}

const AdminAnimalPopulator: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<string>('');
  const { token } = useAuth();

  const populateAnimals = async () => {
    if (!token) {
      Alert.alert('Error', 'No authentication token found. Please log in as an admin.');
      return;
    }

    setIsLoading(true);
    setStatus('Starting animal population...');

    try {
      // Flatten animal names from all categories
      const animalNames = ANIMAL_DATA.flatMap(cat => cat.data);
      setStatus(`Found ${animalNames.length} animals to add`);

      // Prepare animal documents
      const animals: Animal[] = [];
      
      // Process each category with its animals
      ANIMAL_DATA.forEach((category) => {
        category.data.forEach((name, idx) => {
          animals.push({
            commonName: name,
            scientificName: `Unknown_${animals.length}_${name.replace(/\s+/g, '_')}`,
            description: `No description available for ${name}.`,
            rarityLevel: 'Common',
            category: category.title, // Add the category from animalData
            imageUrls: [],
            conservationStatus: 'Not Evaluated',
            kingdom: '',
            phylum: '',
            class: '',
            order: '',
            family: '',
            genus: '',
            species: '',
          });
        });
      });

      let addedCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;

      // Send animals to backend in batches
      const batchSize = 10;
      for (let i = 0; i < animals.length; i += batchSize) {
        const batch = animals.slice(i, i + batchSize);
        setStatus(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(animals.length / batchSize)}...`);

        try {
          const result = await apiAdminPopulateAnimals(token, batch);
          addedCount += result.data?.added || 0;
          updatedCount += result.data?.updated || 0;
          skippedCount += result.data?.skipped || 0;

        } catch (error: any) {
          console.error(`Error processing batch:`, error);
          setStatus(`Error processing batch: ${error.message}`);
        }
      }

      setStatus(`Complete! Added: ${addedCount}, Updated: ${updatedCount}, Skipped: ${skippedCount}`);
      
      Alert.alert(
        'Success!',
        `Animal population complete!\n\nAdded: ${addedCount} new animals\nUpdated: ${updatedCount} existing animals\nSkipped: ${skippedCount} unchanged animals`,
        [{ text: 'OK' }]
      );

    } catch (error: any) {
      console.error('Error populating animals:', error);
      setStatus(`Error: ${error.message || error}`);
      Alert.alert('Error', `Failed to populate animals: ${error.message || error}`, [{ text: 'OK' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const confirmPopulation = () => {
    Alert.alert(
      'Populate Animals Database',
      `This will add ${ANIMAL_DATA.flatMap(cat => cat.data).length} animals to the database. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Yes, Populate', onPress: populateAnimals, style: 'default' }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Animal Database Management</Text>
      
      <TouchableOpacity 
        style={[styles.button, isLoading && styles.buttonDisabled]} 
        onPress={confirmPopulation}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.buttonText}>Populate Animals Database</Text>
        )}
      </TouchableOpacity>

      {status !== '' && (
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>{status}</Text>
        </View>
      )}

      <Text style={styles.infoText}>
        This will add {ANIMAL_DATA.flatMap(cat => cat.data).length} animals from animalData.ts to the database.
        Existing animals will be skipped.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
    marginBottom: 20,
    minWidth: 200,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonDisabled: {
    backgroundColor: '#cccccc',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusContainer: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    minWidth: 300,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  statusText: {
    fontSize: 14,
    textAlign: 'center',
    color: '#333333',
  },
  infoText: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 18,
  },
});

export default AdminAnimalPopulator;