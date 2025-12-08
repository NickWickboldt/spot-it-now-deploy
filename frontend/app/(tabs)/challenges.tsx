import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, Dimensions, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/FontAwesome';
import { apiGetTodayChallenges, ChallengeDTO } from '../../api/challenge';
import { apiGetUserChallenges, UserChallengeDTO } from '../../api/regionalChallenge';
import { ChallengesList } from '../../components/ChallengesList';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function ChallengesScreen() {
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const [challenges, setChallenges] = useState<ChallengeDTO[]>([]);
  const [userChallenge, setUserChallenge] = useState<UserChallengeDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Animation for skeleton loader
  const pulseAnim = React.useRef(new Animated.Value(0.3)).current;
  
  React.useEffect(() => {
    if (isGenerating) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [isGenerating]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('[CHALLENGES] Starting to fetch challenges...');
        
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('Location permission is required to fetch challenges');
          setLoading(false);
          return;
        }
        const loc = await Location.getCurrentPositionAsync({});
        const lat = loc.coords.latitude;
        const lng = loc.coords.longitude;
        console.log('[CHALLENGES] Got location:', { lat, lng });
        
        // Fetch both traditional challenges and user-specific AI challenges in parallel
        setIsGenerating(true);
        
        console.log('[CHALLENGES] Calling apiGetTodayChallenges and apiGetUserChallenges...');
        
        try {
          const [traditionalResp, userChallengeResp] = await Promise.allSettled([
            apiGetTodayChallenges(lat, lng),
            apiGetUserChallenges(lat, lng),
          ]);
          
          console.log('[USER CHALLENGES] traditionalResp:', JSON.stringify(traditionalResp));
          console.log('[USER CHALLENGES] userChallengeResp:', JSON.stringify(userChallengeResp));
          
          if (!mounted) return;
          
          // Handle traditional challenges
          if (traditionalResp.status === 'fulfilled') {
            setChallenges((traditionalResp.value as any)?.data || []);
          } else {
            console.warn('[CHALLENGES] Failed to fetch traditional challenges:', traditionalResp.reason);
          }
          
          // Handle user-specific AI challenges (persisted)
          if (userChallengeResp.status === 'fulfilled') {
            const data = (userChallengeResp.value as any)?.data;
            console.log('[USER CHALLENGES] User challenge data:', JSON.stringify(data));
            setUserChallenge(data || null);
          } else {
            console.error('[USER CHALLENGES] Failed to fetch user challenges:', userChallengeResp.reason);
          }
        } catch (parallelError) {
          console.error('[CHALLENGES] Error in parallel fetch:', parallelError);
        }
        
        setIsGenerating(false);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || 'Failed to load challenges');
        setIsGenerating(false);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [token]);

  // Calculate completion - check tasks if completed field not provided
  const completedCount = challenges.filter(c => 
    c.completed ?? (
      Array.isArray(c.tasks) && c.tasks.length > 0 &&
      c.tasks.every(t => (t.completed ?? 0) >= t.required)
    )
  ).length;
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
        {/* Daily Badge */}
        <View style={styles.dailyBadgeRow}>
          <View style={styles.streakBadge}>
            <Icon name="fire" size={14} color="#FF6B35" />
            <Text style={styles.streakText}>Daily Challenges</Text>
          </View>
        </View>

        {/* Title Section */}
        <View style={styles.titleSection}>
            <Text style={styles.heroTitle}>Today's Challenges</Text>
            <Text style={styles.heroSubtitle}>
              Complete challenges to earn XP and discover new wildlife!
            </Text>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={[styles.statIconCircle, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Icon name="check-circle" size={20} color="#fff" />
              </View>
              <Text style={styles.statNumber}>{completedCount}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={[styles.statIconCircle, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Icon name="list" size={20} color="#fff" />
              </View>
              <Text style={styles.statNumber}>{totalCount}</Text>
              <Text style={styles.statLabel}>Available</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={[styles.statIconCircle, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Icon name="star" size={20} color="#FFD700" />
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
        <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
          {/* AI Regional Challenges Section */}
          {isGenerating ? (
            <View style={styles.skeletonContainer}>
              <Animated.View style={[styles.skeletonCard, { opacity: pulseAnim }]}>
                <View style={styles.skeletonIcon}>
                  <Icon name="compass" size={24} color="#40743dff" />
                </View>
                <Text style={styles.scoutingText}>Scouting local area...</Text>
                <Text style={styles.scoutingSubtext}>Finding wildlife in your region</Text>
                <View style={styles.skeletonItems}>
                  <View style={styles.skeletonItem} />
                  <View style={styles.skeletonItem} />
                  <View style={styles.skeletonItem} />
                </View>
              </Animated.View>
            </View>
          ) : userChallenge ? (
            <View style={styles.regionalSection}>
              {/* Location Header */}
              <View style={styles.locationHeader}>
                <Icon name="map-marker" size={16} color="#40743dff" />
                <Text style={styles.locationText}>{userChallenge.location}</Text>
              </View>
              
              {/* Daily Challenges */}
              {userChallenge.daily && (
                <View style={styles.challengeSection}>
                  <View style={styles.sectionHeader}>
                    <Icon name="sun-o" size={18} color="#FF9500" />
                    <Text style={styles.sectionTitle}>Daily Challenge</Text>
                    {userChallenge.daily.completed && (
                      <View style={styles.completedBadge}>
                        <Icon name="check" size={10} color="#fff" />
                        <Text style={styles.completedText}>Complete!</Text>
                      </View>
                    )}
                    {!userChallenge.daily.completed && (
                      <Text style={styles.expiresText}>
                        Ends {new Date(userChallenge.daily.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    )}
                  </View>
                  {/* XP Reward Banner */}
                  {userChallenge.daily.completed && userChallenge.daily.xp_awarded > 0 && (
                    <View style={styles.xpRewardBanner}>
                      <Icon name="star" size={16} color="#FFD700" />
                      <Text style={styles.xpRewardText}>+{userChallenge.daily.xp_awarded} XP Earned!</Text>
                    </View>
                  )}
                  {!userChallenge.daily.completed && userChallenge.daily.xp_potential > 0 && (
                    <View style={styles.xpPotentialBanner}>
                      <Icon name="star-o" size={14} color="#FF9500" />
                      <Text style={styles.xpPotentialText}>+{userChallenge.daily.xp_potential} XP</Text>
                    </View>
                  )}
                  {userChallenge.daily.animals.map((animal, index) => (
                    <TouchableOpacity 
                      key={`daily-${index}`} 
                      style={[styles.animalCard, (animal.progress || 0) >= animal.count && styles.animalCardComplete]}
                      onPress={() => router.push({ pathname: '/(user)/animal_detail', params: { animalName: animal.name } })}
                      activeOpacity={0.7}
                    >
                      <View style={styles.animalInfo}>
                        <Text style={styles.animalName}>{animal.name}</Text>
                        <View style={styles.animalMeta}>
                        <View style={[styles.difficultyBadge, 
                          animal.probability >= 50 ? styles.difficultyEasy :
                          animal.probability >= 15 ? styles.difficultyMedium :
                          styles.difficultyHard
                        ]}>
                          <Text style={styles.difficultyText}>
                            {animal.probability >= 50 ? 'Easy' : animal.probability >= 15 ? 'Medium' : 'Hard'}
                          </Text>
                        </View>
                        </View>
                      </View>
                      <View style={styles.progressContainer}>
                        <Text style={[styles.progressText, (animal.progress || 0) >= animal.count && styles.progressComplete]}>
                          {animal.progress || 0}/{animal.count}
                        </Text>
                        <Icon 
                          name={(animal.progress || 0) >= animal.count ? "check-circle" : "camera"} 
                          size={20} 
                          color={(animal.progress || 0) >= animal.count ? "#34C759" : "#999"} 
                        />
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              
              {/* Weekly Challenges */}
              {userChallenge.weekly && (
                <View style={styles.challengeSection}>
                  <View style={styles.sectionHeader}>
                    <Icon name="moon-o" size={18} color="#5856D6" />
                    <Text style={styles.sectionTitle}>Weekly Challenge</Text>
                    {userChallenge.weekly.completed ? (
                      <View style={styles.completedBadge}>
                        <Icon name="check" size={10} color="#fff" />
                        <Text style={styles.completedText}>Complete!</Text>
                      </View>
                    ) : (
                      <Text style={styles.expiresText}>
                        {userChallenge.weekly.animals.reduce((sum, a) => sum + a.count - (a.progress || 0), 0)} left
                      </Text>
                    )}
                  </View>
                  {/* XP Reward Banner */}
                  {userChallenge.weekly.completed && userChallenge.weekly.xp_awarded > 0 && (
                    <View style={[styles.xpRewardBanner, styles.xpRewardBannerWeekly]}>
                      <Icon name="star" size={16} color="#FFD700" />
                      <Text style={styles.xpRewardText}>+{userChallenge.weekly.xp_awarded} XP Earned!</Text>
                    </View>
                  )}
                  {!userChallenge.weekly.completed && userChallenge.weekly.xp_potential > 0 && (
                    <View style={[styles.xpPotentialBanner, styles.xpPotentialBannerWeekly]}>
                      <Icon name="star-o" size={14} color="#5856D6" />
                      <Text style={styles.xpPotentialText}>+{userChallenge.weekly.xp_potential} XP</Text>
                    </View>
                  )}
                  {userChallenge.weekly.animals.map((animal, index) => (
                    <TouchableOpacity 
                      key={`weekly-${index}`} 
                      style={[styles.animalCard, (animal.progress || 0) >= animal.count && styles.animalCardComplete]}
                      onPress={() => router.push({ pathname: '/(user)/animal_detail', params: { animalName: animal.name } })}
                      activeOpacity={0.7}
                    >
                      <View style={styles.animalInfo}>
                        <Text style={styles.animalName}>{animal.name}</Text>
                        <View style={styles.animalMeta}>
                          <View style={[styles.difficultyBadge, 
                            animal.probability >= 50 ? styles.difficultyEasy :
                            animal.probability >= 15 ? styles.difficultyMedium :
                            styles.difficultyHard
                          ]}>
                            <Text style={styles.difficultyText}>
                              {animal.probability >= 50 ? 'Easy' : animal.probability >= 15 ? 'Medium' : 'Hard'}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <View style={styles.progressContainer}>
                        <Text style={[styles.progressText, (animal.progress || 0) >= animal.count && styles.progressComplete]}>
                          {animal.progress || 0}/{animal.count}
                        </Text>
                        <Icon 
                          name={(animal.progress || 0) >= animal.count ? "check-circle" : "camera"} 
                          size={20} 
                          color={(animal.progress || 0) >= animal.count ? "#34C759" : "#999"} 
                        />
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <View style={styles.skeletonContainer}>
              <View style={styles.errorCard}>
                <Icon name="exclamation-triangle" size={32} color="#FF9500" />
                <Text style={styles.errorCardTitle}>Unable to load regional challenges</Text>
                <Text style={styles.errorCardText}>Please try again later</Text>
              </View>
            </View>
          )}
          
          {/* Traditional Challenges List */}
          {challenges.length > 0 ? (
            <View style={styles.traditionalSection}>
              <Text style={styles.traditionalTitle}>More Challenges</Text>
              <ChallengesList challenges={challenges} />
            </View>
          ) : !isGenerating && userChallenge && (
            <View style={styles.noChallengesNote}>
              <Text style={styles.noChallengesText}>
                No additional challenges in your area. Check back tomorrow!
              </Text>
            </View>
          )}
        </ScrollView>
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
    paddingHorizontal: 20,
    paddingTop: 70,
    paddingBottom: 28,
    width: '100%',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  dailyBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 16,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  streakText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: 0.3,
  },
  titleSection: {
    marginBottom: 24,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 50,
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
  contentContainer: {
    flex: 1,
  },
  skeletonContainer: {
    padding: 16,
  },
  skeletonCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  skeletonIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(64, 116, 61, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  scoutingText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  scoutingSubtext: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  skeletonItems: {
    width: '100%',
    gap: 12,
  },
  skeletonItem: {
    height: 48,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    width: '100%',
  },
  regionalSection: {
    padding: 16,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  locationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  newBadge: {
    backgroundColor: 'rgba(64, 116, 61, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  newBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#40743dff',
  },
  challengeSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    flex: 1,
  },
  expiresText: {
    fontSize: 12,
    color: '#888',
  },
  animalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  animalInfo: {
    flex: 1,
  },
  animalName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  animalMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  difficultyEasy: {
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
  },
  difficultyMedium: {
    backgroundColor: 'rgba(255, 149, 0, 0.15)',
  },
  difficultyHard: {
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    textTransform: 'capitalize',
  },
  countBadge: {
    backgroundColor: 'rgba(88, 86, 214, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  countText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#5856D6',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#40743dff',
  },
  progressComplete: {
    color: '#34C759',
  },
  animalCardComplete: {
    backgroundColor: 'rgba(52, 199, 89, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.2)',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#34C759',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  completedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  xpRewardBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  xpRewardBannerWeekly: {
    backgroundColor: 'rgba(88, 86, 214, 0.1)',
    borderColor: 'rgba(88, 86, 214, 0.25)',
  },
  xpRewardText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#B8860B',
  },
  xpPotentialBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 149, 0, 0.12)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 149, 0, 0.2)',
  },
  xpPotentialBannerWeekly: {
    backgroundColor: 'rgba(88, 86, 214, 0.12)',
    borderColor: 'rgba(88, 86, 214, 0.2)',
  },
  xpPotentialText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  traditionalSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  traditionalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  errorCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    gap: 12,
  },
  errorCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
  },
  errorCardText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  noChallengesNote: {
    padding: 16,
    marginTop: 8,
    alignItems: 'center',
  },
  noChallengesText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
