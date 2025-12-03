import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Platform, StatusBar, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { apiGetTodayChallenges, ChallengeDTO } from '../../api/challenge';
import { ChallengesList } from '../../components/ChallengesList';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function ChallengesScreen() {
  const { token } = useAuth();
  const [challenges, setChallenges] = useState<ChallengeDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('Location permission is required to fetch challenges');
          setLoading(false);
          return;
        }
        const loc = await Location.getCurrentPositionAsync({});
        const lat = loc.coords.latitude;
        const lng = loc.coords.longitude;
        const resp: any = await apiGetTodayChallenges(lat, lng);
        if (!mounted) return;
        setChallenges(resp?.data || []);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || 'Failed to load challenges');
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [token]);

  const completedCount = challenges.filter(c => c.completed).length;
  const totalCount = challenges.length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Hero Header with Gradient */}
      <LinearGradient
        colors={['#40743dff', '#5a9a55', '#7FA37C']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroHeader}
      >
        <View style={styles.topBar}>
          <Text style={styles.heroTitle}>Challenges</Text>
          <View style={styles.streakBadge}>
            <Icon name="fire" size={14} color="#FF6B35" />
            <Text style={styles.streakText}>Daily</Text>
          </View>
        </View>

        <Text style={styles.heroSubtitle}>
          Complete challenges to earn XP and discover new wildlife!
        </Text>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <View style={[styles.statIconCircle, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Icon name="check-circle" size={18} color="#fff" />
            </View>
            <Text style={styles.statNumber}>{completedCount}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={[styles.statIconCircle, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Icon name="list" size={18} color="#fff" />
            </View>
            <Text style={styles.statNumber}>{totalCount}</Text>
            <Text style={styles.statLabel}>Available</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={[styles.statIconCircle, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Icon name="star" size={18} color="#FFD700" />
            </View>
            <Text style={styles.statNumber}>{Math.round((completedCount / Math.max(totalCount, 1)) * 100)}%</Text>
            <Text style={styles.statLabel}>Progress</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={Colors.light.primaryGreen} size="large" />
          <Text style={styles.loadingText}>Finding challenges near you...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Icon name="exclamation-circle" size={48} color="#999" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <ChallengesList challenges={challenges} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.softBeige,
  },
  heroHeader: {
    paddingTop: Platform.OS === 'ios' ? 60 : (StatusBar.currentHeight || 0) + 20,
    paddingHorizontal: 20,
    paddingBottom: 24,
    width: '100%',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  streakText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 20,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
