import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { apiGetTodayChallenges, type ChallengeDTO } from '../../api/challenge';
import { ChallengesList } from '../../components/ChallengesList';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext';

export default function UserChallengesScreen() {
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

  if (loading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={Colors.light.primaryGreen} /></View>;
  if (error) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 }}><Text>{error}</Text></View>;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.light.softBeige }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
        <Text style={{ fontSize: 24, fontWeight: '700', color: Colors.light.primaryGreen }}>Today's Challenges</Text>
      </View>
      <ChallengesList challenges={challenges} />
    </View>
  );
}
