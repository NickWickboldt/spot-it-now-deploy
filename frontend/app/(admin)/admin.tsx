import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext';

export default function AdminHome(): React.JSX.Element {
  const { user } = useAuth();
  const router = useRouter();

  // Gate access: redirect non-admins away
  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.replace('/');
    }
  }, [user]);

  if (!user) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (user.role !== 'admin') {
    return (
      <View style={styles.centered}>
        <Text style={styles.denied}>Not authorized</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin</Text>
        <Text style={styles.subtitle}>Central place for moderation and data tools</Text>
      </View>

      <View style={styles.grid}>
        <TouchableOpacity style={styles.card} onPress={() => router.push('/manage-users')}>
          <View style={styles.cardIconWrap}><Icon name="users" size={18} color={Colors.light.primaryGreen} /></View>
          <Text style={styles.cardTitle}>Manage Users</Text>
          <Text style={styles.cardDesc}>Moderate users and roles</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => router.push('/manage-sightings')}>
          <View style={styles.cardIconWrap}><Icon name="map" size={18} color={Colors.light.primaryGreen} /></View>
          <Text style={styles.cardTitle}>Manage Sightings</Text>
          <Text style={styles.cardDesc}>Review and curate reports</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => router.push('/(admin)/add-animal')}>
          <View style={styles.cardIconWrap}><Icon name="database" size={18} color={Colors.light.primaryGreen} /></View>
          <Text style={styles.cardTitle}>Populate Animal DB</Text>
          <Text style={styles.cardDesc}>Create and seed animal entries</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => router.push('/(admin)/add-and-link')}>
          <View style={styles.cardIconWrap}><Icon name="link" size={18} color={Colors.light.primaryGreen} /></View>
          <Text style={styles.cardTitle}>Add & Link Animals</Text>
          <Text style={styles.cardDesc}>Map AI labels and create animals</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => router.push('/(admin)/manage-challenges')}>
          <View style={styles.cardIconWrap}><Icon name="trophy" size={18} color={Colors.light.primaryGreen} /></View>
          <Text style={styles.cardTitle}>Manage Challenges</Text>
          <Text style={styles.cardDesc}>Create location-based goals</Text>
        </TouchableOpacity>

        {/* Placeholder for future tools */}
        <View style={[styles.card, styles.cardDisabled]}> 
          <View style={styles.cardIconWrap}><Icon name="cogs" size={18} color={Colors.light.darkNeutral} /></View>
          <Text style={styles.cardTitle}>More tools</Text>
          <Text style={styles.cardDesc}>Coming soon</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: Colors.light.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.light.background },
  header: { marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 4, color: Colors.light.primaryGreen },
  subtitle: { fontSize: 14, color: Colors.light.darkNeutral },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { width: '48%', marginBottom: 12, padding: 14, borderRadius: 12, backgroundColor: Colors.light.itemBackground, borderWidth: 1, borderColor: Colors.light.shadow },
  cardDisabled: { opacity: 0.6 },
  cardIconWrap: { width: 32, height: 32, borderRadius: 8, backgroundColor: Colors.light.background, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.light.mainText },
  cardDesc: { fontSize: 12, color: Colors.light.darkNeutral, marginTop: 2 },
  denied: { color: '#ef4444', fontWeight: '600' },
});
