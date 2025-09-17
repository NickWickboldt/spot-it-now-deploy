import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { apiMatchAnimal } from '../api/animal';
import { Colors } from '../constants/Colors';

export default function AnimalMatchingTest() {
  const [commonName, setCommonName] = useState('');
  const [scientificName, setScientificName] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const testMatching = async () => {
    if (!commonName.trim() && !scientificName.trim()) {
      setError('Please enter at least one name');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setResult(null);

      const response = await apiMatchAnimal(
        commonName.trim() || undefined,
        scientificName.trim() || undefined
      );

      setResult(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to match animal');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const clearTest = () => {
    setCommonName('');
    setScientificName('');
    setResult(null);
    setError('');
  };

  const testCases = [
    { commonName: 'Lion', scientificName: 'Panthera leo' },
    { commonName: 'lion', scientificName: '' },
    { commonName: 'African Lion', scientificName: '' },
    { commonName: '', scientificName: 'Panthera leo' },
    { commonName: 'Eagle', scientificName: '' },
  ];

  const runTestCase = (testCase: any) => {
    setCommonName(testCase.commonName);
    setScientificName(testCase.scientificName);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🔍 Animal Matching Test</Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Common Name:</Text>
        <TextInput
          style={styles.input}
          value={commonName}
          onChangeText={setCommonName}
          placeholder="e.g., Lion"
          placeholderTextColor={Colors.light.darkNeutral}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Scientific Name:</Text>
        <TextInput
          style={styles.input}
          value={scientificName}
          onChangeText={setScientificName}
          placeholder="e.g., Panthera leo"
          placeholderTextColor={Colors.light.darkNeutral}
        />
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity 
          style={styles.testButton} 
          onPress={testMatching}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Matching...' : 'Test Match'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.clearButton} onPress={clearTest}>
          <Text style={styles.clearButtonText}>Clear</Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>❌ {error}</Text>
        </View>
      )}

      {result && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>✅ Match Found!</Text>
          <Text style={styles.resultText}>ID: {result._id}</Text>
          <Text style={styles.resultText}>Common Name: {result.commonName}</Text>
          <Text style={styles.resultText}>Scientific Name: {result.scientificName}</Text>
          <Text style={styles.resultText}>Category: {result.category}</Text>
          <Text style={styles.resultText}>Rarity: {result.rarityLevel}</Text>
        </View>
      )}

      <View style={styles.testCasesContainer}>
        <Text style={styles.testCasesTitle}>Quick Test Cases:</Text>
        {testCases.map((testCase, index) => (
          <TouchableOpacity
            key={index}
            style={styles.testCaseButton}
            onPress={() => runTestCase(testCase)}
          >
            <Text style={styles.testCaseText}>
              {testCase.commonName || 'N/A'} | {testCase.scientificName || 'N/A'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: Colors.light.background,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.mainText,
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.mainText,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.light.lightGrey,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: Colors.light.mainText,
  },
  buttonRow: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  testButton: {
    flex: 1,
    backgroundColor: Colors.light.primaryGreen,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  clearButton: {
    backgroundColor: Colors.light.lightGrey,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  clearButtonText: {
    color: Colors.light.darkNeutral,
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#ffe6e6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    color: '#cc0000',
    fontSize: 14,
  },
  resultContainer: {
    backgroundColor: '#e6ffe6',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#006600',
    marginBottom: 8,
  },
  resultText: {
    fontSize: 14,
    color: '#004400',
    marginBottom: 4,
  },
  testCasesContainer: {
    marginTop: 20,
  },
  testCasesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.mainText,
    marginBottom: 12,
  },
  testCaseButton: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.light.lightGrey,
  },
  testCaseText: {
    fontSize: 14,
    color: Colors.light.mainText,
  },
});