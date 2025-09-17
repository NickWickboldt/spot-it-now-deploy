import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { apiGetDiscoveryStats } from '../api/userDiscovery';
import { Colors } from '../constants/Colors';
import { useAuth } from '../context/AuthContext';

interface DiscoveryStatsProps {
  onPress?: () => void;
  style?: any;
}

interface Stats {
  totalDiscovered: number;
  totalAnimals: number;
  discoveryPercentage: number;
  categoriesStats: Record<string, { discovered: number; total: number; percentage: number }>;
  recentDiscoveries: any[];
}

export default function DiscoveryStats({ onPress, style }: DiscoveryStatsProps) {
  const { token } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await apiGetDiscoveryStats(token);
        setStats(response.data);
      } catch (error) {
        console.error('Failed to fetch discovery stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [token]);

  if (loading) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.loadingText}>Loading stats...</Text>
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.errorText}>Failed to load discovery stats</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity 
      style={[styles.container, style]} 
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
    >
      <View style={styles.header}>
        <Icon name="trophy" size={20} color={Colors.light.accent} />
        <Text style={styles.title}>Discovery Progress</Text>
      </View>
      
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${stats.discoveryPercentage}%` }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>
          {stats.totalDiscovered}/{stats.totalAnimals} ({Math.round(stats.discoveryPercentage)}%)
        </Text>
      </View>

      <View style={styles.categoriesContainer}>
        {Object.entries(stats.categoriesStats).slice(0, 3).map(([category, categoryStats]) => (
          <View key={category} style={styles.categoryRow}>
            <Text style={styles.categoryName}>{category}</Text>
            <Text style={styles.categoryProgress}>
              {categoryStats.discovered}/{categoryStats.total}
            </Text>
          </View>
        ))}
      </View>

      {stats.recentDiscoveries.length > 0 && (
        <Text style={styles.recentText}>
          Latest: {stats.recentDiscoveries[0].animal.commonName}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.mainText,
    marginLeft: 8,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.light.primaryGreen,
  },
  progressText: {
    fontSize: 14,
    color: Colors.light.mainText,
    textAlign: 'center',
    fontWeight: '500',
  },
  categoriesContainer: {
    marginBottom: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  categoryName: {
    fontSize: 12,
    color: Colors.light.darkNeutral,
  },
  categoryProgress: {
    fontSize: 12,
    color: Colors.light.mainText,
    fontWeight: '500',
  },
  recentText: {
    fontSize: 11,
    color: Colors.light.darkNeutral,
    fontStyle: 'italic',
  },
  loadingText: {
    textAlign: 'center',
    color: Colors.light.darkNeutral,
  },
  errorText: {
    textAlign: 'center',
    color: '#ff6b6b',
  },
});