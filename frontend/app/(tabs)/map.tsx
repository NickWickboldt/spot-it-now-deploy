import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import MapView, { Callout, Circle, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import Icon from 'react-native-vector-icons/FontAwesome';
import { apiGetSightingsNear } from '../../api/sighting';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Pokemon Go inspired map style - vibrant nature colors
const pokemonGoMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#e8f5e9' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#523735' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f1e6' }] },
  {
    featureType: 'administrative',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#c9b2a6' }],
  },
  {
    featureType: 'administrative.land_parcel',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#dcd2be' }],
  },
  {
    featureType: 'administrative.land_parcel',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#ae9e90' }],
  },
  {
    featureType: 'landscape.natural',
    elementType: 'geometry',
    stylers: [{ color: '#c8e6c9' }],
  },
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [{ color: '#a5d6a7' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#2e7d32' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry.fill',
    stylers: [{ color: '#81c784' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#1b5e20' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#ffffff' }],
  },
  {
    featureType: 'road.arterial',
    elementType: 'geometry',
    stylers: [{ color: '#fdfcf8' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#fff3e0' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#ffcc80' }],
  },
  {
    featureType: 'road.highway.controlled_access',
    elementType: 'geometry',
    stylers: [{ color: '#ffcc80' }],
  },
  {
    featureType: 'road.local',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#806b63' }],
  },
  {
    featureType: 'transit.line',
    elementType: 'geometry',
    stylers: [{ color: '#dfd2ae' }],
  },
  {
    featureType: 'transit.line',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#8f7d77' }],
  },
  {
    featureType: 'transit.line',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#ebe3cd' }],
  },
  {
    featureType: 'transit.station',
    elementType: 'geometry',
    stylers: [{ color: '#dfd2ae' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry.fill',
    stylers: [{ color: '#81d4fa' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#0277bd' }],
  },
];

// Animal icon mapper
const getAnimalIcon = (iconPath?: string) => {
  if (!iconPath) return null;

  const iconMap: Record<string, any> = {
    'Large Mammals.png': require('../../assets/animalIcons/Large Mammals.png'),
    'Medium Mammals.png': require('../../assets/animalIcons/Medium Mammals.png'),
    'Small Mammals.png': require('../../assets/animalIcons/Small Mammals.png'),
    'Sea Mammals.png': require('../../assets/animalIcons/Sea Mammals.png'),
    'Large Birds.png': require('../../assets/animalIcons/Large Birds.png'),
    'Medium Birds.png': require('../../assets/animalIcons/Medium Birds.png'),
    'Small Birds.png': require('../../assets/animalIcons/Small Birds.png'),
    'Flightless Birds.png': require('../../assets/animalIcons/Flightless Birds.png'),
    'Arachnids.png': require('../../assets/animalIcons/Arachnids.png'),
    'Butterflies & Moths.png': require('../../assets/animalIcons/Butterflies & Moths.png'),
    'Bees, Wasps, Ants.png': require('../../assets/animalIcons/Bees, Wasps, Ants.png'),
    'Beetles.png': require('../../assets/animalIcons/Beetles.png'),
    'Dragonflies.png': require('../../assets/animalIcons/Dragonflies.png'),
    'Worms.png': require('../../assets/animalIcons/Worms.png'),
    'Snakes.png': require('../../assets/animalIcons/Snakes.png'),
    'Turtles & Tortoises.png': require('../../assets/animalIcons/Turtles & Tortoises.png'),
    'Large Reptiles.png': require('../../assets/animalIcons/Large Reptiles.png'),
    'Medium Reptiles.png': require('../../assets/animalIcons/Medium Reptiles.png'),
    'Small Reptiles.png': require('../../assets/animalIcons/Small Reptiles.png'),
    'Frogs & Toads.png': require('../../assets/animalIcons/Frogs & Toads.png'),
    'Salamanders & Newts.png': require('../../assets/animalIcons/Salamanders & Newts.png'),
    'Caecilians.png': require('../../assets/animalIcons/Caecilians.png'),
    'Large Fish.png': require('../../assets/animalIcons/Large Fish.png'),
    'Medium Fish.png': require('../../assets/animalIcons/Medium Fish.png'),
    'Small Fish.png': require('../../assets/animalIcons/Small Fish.png'),
    'Freshwater Fish.png': require('../../assets/animalIcons/Freshwater Fish.png'),
    'Saltwater Fish.png': require('../../assets/animalIcons/Saltwater Fish.png'),
    'Crustaceans.png': require('../../assets/animalIcons/Crustaceans.png'),
    'Mollusks.png': require('../../assets/animalIcons/Mollusks.png'),
    'Insects.png': require('../../assets/animalIcons/Insects.png'),
  };

  return iconMap[iconPath] || null;
};

// Animated floating marker component - Pokemon Go style
const FloatingMarker = ({
  sighting,
  onPress,
  isSelected,
  index,
}: {
  sighting: any;
  onPress: () => void;
  isSelected: boolean;
  index: number;
}) => {
  const animalIconSource = getAnimalIcon(sighting.iconPath);

  return (
    <Marker
      coordinate={{
        latitude: Number(sighting.coordinate.latitude),
        longitude: Number(sighting.coordinate.longitude),
      }}
      onPress={(e) => {
        e.stopPropagation();
        onPress();
      }}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <View style={styles.markerTouchArea}>
        <View
          style={[
            styles.markerContainer,
            isSelected && { transform: [{ scale: 1.2 }] },
          ]}
        >
          {/* Main bubble */}
          <LinearGradient
            colors={isSelected ? ['#FFD700', '#FFA500', '#FF8C00'] : ['#5a9a55', '#40743d', '#2d5a2a']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.markerBubble}
          >
            {/* Shine effect */}
            <View style={styles.markerShine} />
            {animalIconSource ? (
              <Image source={animalIconSource} style={styles.markerIcon} />
            ) : (
              <Icon name="paw" size={26} color="#fff" />
            )}
          </LinearGradient>
        </View>
      </View>
      <Callout tooltip onPress={onPress}>
        <View style={styles.calloutContainer}>
          <View style={styles.calloutBubble}>
            <Text style={styles.calloutText}>{sighting.name}</Text>
          </View>
          <View style={styles.calloutArrow} />
        </View>
      </Callout>
    </Marker>
  );
};

// Cluster marker component for grouped sightings
const ClusterMarker = ({
  cluster,
  onPress,
  index,
}: {
  cluster: { coordinate: { latitude: number; longitude: number }; sightings: any[] };
  onPress: () => void;
  index: number;
}) => {
  const count = cluster.sightings.length;
  
  // Size based on count
  const size = Math.min(70, 50 + count * 3);

  return (
    <Marker
      coordinate={cluster.coordinate}
      onPress={(e) => {
        e.stopPropagation();
        onPress();
      }}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <View style={[styles.clusterTouchArea, { width: size + 20, height: size + 20 }]}>
        <View style={styles.clusterContainer}>
          <LinearGradient
            colors={['#5a9a55', '#40743d', '#2d5a2a']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.clusterBubble, { width: size, height: size, borderRadius: size / 2 }]}
          >
            <View style={styles.clusterShine} />
            <Text style={[styles.clusterCount, { fontSize: count > 99 ? 14 : count > 9 ? 18 : 22 }]}>
              {count > 99 ? '99+' : count}
            </Text>
            <Icon name="paw" size={14} color="rgba(255,255,255,0.8)" style={styles.clusterIcon} />
          </LinearGradient>
        </View>
      </View>
    </Marker>
  );
};

// Function to cluster nearby sightings
const clusterSightings = (sightings: any[], clusterRadius: number = 0.0008) => {
  if (!sightings || sightings.length === 0) return { clusters: [], singles: [] };
  
  const clusters: { coordinate: { latitude: number; longitude: number }; sightings: any[] }[] = [];
  const singles: any[] = [];
  const used = new Set<number>(); // Use index-based tracking

  for (let i = 0; i < sightings.length; i++) {
    if (used.has(i)) continue;

    const nearby: any[] = [sightings[i]];
    used.add(i);

    for (let j = i + 1; j < sightings.length; j++) {
      if (used.has(j)) continue;

      const latDiff = Math.abs(
        Number(sightings[i].coordinate.latitude) - Number(sightings[j].coordinate.latitude)
      );
      const lngDiff = Math.abs(
        Number(sightings[i].coordinate.longitude) - Number(sightings[j].coordinate.longitude)
      );

      if (latDiff < clusterRadius && lngDiff < clusterRadius) {
        nearby.push(sightings[j]);
        used.add(j);
      }
    }

    if (nearby.length > 1) {
      // Calculate center of cluster
      const avgLat = nearby.reduce((sum, s) => sum + Number(s.coordinate.latitude), 0) / nearby.length;
      const avgLng = nearby.reduce((sum, s) => sum + Number(s.coordinate.longitude), 0) / nearby.length;
      
      clusters.push({
        coordinate: { latitude: avgLat, longitude: avgLng },
        sightings: nearby,
      });
    } else {
      singles.push(sightings[i]);
    }
  }

  return { clusters, singles };
};

// Sighting card for the list modal
const SightingCard = ({
  sighting,
  onPress,
  isActive,
  index,
}: {
  sighting: any;
  onPress: () => void;
  isActive: boolean;
  index: number;
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const animalIconSource = getAnimalIcon(sighting.iconPath);

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      delay: index * 50,
      tension: 80,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [index]);

  return (
    <Pressable onPress={onPress}>
      <Animated.View
        style={[
          styles.sightingCard,
          isActive && styles.sightingCardActive,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        {/* Animal Icon */}
        <LinearGradient
          colors={isActive ? ['#FFD700', '#FFA500'] : ['#5a9a55', '#40743d']}
          style={styles.cardIconContainer}
        >
          {animalIconSource ? (
            <Image source={animalIconSource} style={styles.cardIcon} />
          ) : (
            <Icon name="paw" size={28} color="#fff" />
          )}
        </LinearGradient>
        {/* Info */}
        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={1}>
            {sighting.name}
          </Text>
          <Text style={styles.cardCaption} numberOfLines={1}>
            {sighting.caption || 'Spotted nearby!'}
          </Text>
          <View style={styles.cardMeta}>
            <Icon name="user" size={10} color="#999" />
            <Text style={styles.cardMetaText}>{sighting.userName || 'Explorer'}</Text>
            <View style={styles.cardMetaDot} />
            <Icon name="clock-o" size={10} color="#999" />
            <Text style={styles.cardMetaText}>Recently</Text>
          </View>
        </View>
        {/* Arrow */}
        <View style={styles.cardArrow}>
          <Icon name="map-marker" size={18} color={isActive ? '#FFD700' : '#40743d'} />
        </View>
      </Animated.View>
    </Pressable>
  );
};

// Distance options
const DISTANCE_OPTIONS = [
  { meters: 805, label: '0.5 mi', icon: 'dot-circle-o' },
  { meters: 1609, label: '1 mi', icon: 'circle-o' },
  { meters: 4828, label: '3 mi', icon: 'circle' },
  { meters: 8047, label: '5 mi', icon: 'bullseye' },
  { meters: 16093, label: '10 mi', icon: 'globe' },
];

export default function WildlifeMapScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sightings, setSightings] = useState<any[]>([]);
  const [selectedSighting, setSelectedSighting] = useState<any | null>(null);
  const [distance, setDistance] = useState(4828);
  const [isLoading, setIsLoading] = useState(true);
  const [showRadiusFilter, setShowRadiusFilter] = useState(false);
  const [showSightingsList, setShowSightingsList] = useState(false);
  const [showClusterModal, setShowClusterModal] = useState(false);
  const [selectedCluster, setSelectedCluster] = useState<any[] | null>(null);

  const mapRef = useRef<MapView>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const radiusSlideAnim = useRef(new Animated.Value(0)).current;
  const listSlideAnim = useRef(new Animated.Value(0)).current;
  const clusterSlideAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const radarAnim = useRef(new Animated.Value(0)).current;

  // Cluster sightings that are close together
  const { clusters, singles } = useMemo(() => clusterSightings(sightings), [sightings]);

  // Pulse animation for user location
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 2,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Radar sweep animation
    Animated.loop(
      Animated.timing(radarAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  // Fetch location and sightings
  const fetchSightings = useCallback(async () => {
    try {
      setIsLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Location permission denied');
        setIsLoading(false);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);

      const resp = await apiGetSightingsNear(
        currentLocation.coords.longitude,
        currentLocation.coords.latitude,
        distance
      );

      const mapped = (resp.data || []).map((sighting: any, index: number) => ({
        id: sighting._id || index,
        name: sighting.animal?.commonName || sighting.aiIdentification || 'Unknown Wildlife',
        caption: sighting.caption || '',
        mediaUrls: sighting.mediaUrls || [],
        userName: sighting.userName || 'Anonymous',
        iconPath: sighting.animal?.iconPath,
        coordinate: {
          latitude: Number(sighting.location.coordinates[1]),
          longitude: Number(sighting.location.coordinates[0]),
        },
        createdAt: sighting.createdAt,
      }));

      setSightings(mapped);
    } catch (err) {
      setErrorMsg('Failed to fetch sightings');
      setSightings([]);
    } finally {
      setIsLoading(false);
    }
  }, [distance]);

  useEffect(() => {
    fetchSightings();
  }, [fetchSightings]);

  // Animate bottom sheet when sighting selected
  useEffect(() => {
    if (selectedSighting) {
      Animated.spring(slideAnim, {
        toValue: 1,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [selectedSighting]);

  const openRadiusFilter = () => {
    setShowRadiusFilter(true);
    Animated.spring(radiusSlideAnim, {
      toValue: 1,
      tension: 65,
      friction: 11,
      useNativeDriver: true,
    }).start();
  };

  const closeRadiusFilter = () => {
    Animated.timing(radiusSlideAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setShowRadiusFilter(false));
  };

  const openSightingsList = () => {
    setShowSightingsList(true);
    Animated.spring(listSlideAnim, {
      toValue: 1,
      tension: 65,
      friction: 11,
      useNativeDriver: true,
    }).start();
  };

  const closeSightingsList = () => {
    Animated.timing(listSlideAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setShowSightingsList(false));
  };

  const openClusterModal = (clusterSightings: any[]) => {
    setSelectedCluster(clusterSightings);
    setShowClusterModal(true);
    Animated.spring(clusterSlideAnim, {
      toValue: 1,
      tension: 65,
      friction: 11,
      useNativeDriver: true,
    }).start();
  };

  const closeClusterModal = () => {
    Animated.timing(clusterSlideAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowClusterModal(false);
      setSelectedCluster(null);
    });
  };

  const goToSighting = (sighting: any) => {
    setSelectedSighting(sighting);
    mapRef.current?.animateToRegion(
      {
        latitude: Number(sighting.coordinate.latitude),
        longitude: Number(sighting.coordinate.longitude),
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      },
      500
    );
  };

  const goToMyLocation = () => {
    if (location && mapRef.current) {
      setSelectedSighting(null);
      mapRef.current.animateToRegion(
        {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        },
        500
      );
    }
  };

  const getDistanceLabel = () => {
    const option = DISTANCE_OPTIONS.find((o) => o.meters === distance);
    return option?.label || '3 mi';
  };

  const getDistanceEmoji = () => {
    const option = DISTANCE_OPTIONS.find((o) => o.meters === distance);
    return option?.icon || 'circle';
  };

  // Loading screen with Pokemon Go style
  if (isLoading && !location) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={['#4CAF50', '#2E7D32', '#1B5E20']}
          style={styles.loadingGradient}
        >
          {/* Animated radar circles */}
          <Animated.View
            style={[
              styles.radarCircle,
              styles.radarCircle1,
              {
                opacity: radarAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.6, 0],
                }),
                transform: [
                  {
                    scale: radarAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.5, 2.5],
                    }),
                  },
                ],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.radarCircle,
              styles.radarCircle2,
              {
                opacity: radarAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0, 0.6, 0],
                }),
                transform: [
                  {
                    scale: radarAnim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0.5, 1.5, 2.5],
                    }),
                  },
                ],
              },
            ]}
          />
          
          <View style={styles.loadingIconContainer}>
            <Icon name="paw" size={60} color="#fff" />
          </View>
          <Text style={styles.loadingTitle}>SpotItNow</Text>
          <Text style={styles.loadingText}>Scanning for wildlife...</Text>
          <View style={styles.loadingDotsContainer}>
            <Animated.View style={[styles.loadingDot, { opacity: radarAnim }]} />
            <Animated.View
              style={[
                styles.loadingDot,
                {
                  opacity: radarAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, 1, 0],
                  }),
                },
              ]}
            />
            <Animated.View
              style={[
                styles.loadingDot,
                {
                  opacity: radarAnim.interpolate({
                    inputRange: [0, 0.7, 1],
                    outputRange: [0, 1, 0],
                  }),
                },
              ]}
            />
          </View>
        </LinearGradient>
      </View>
    );
  }

  if (errorMsg) {
    return (
      <View style={styles.errorContainer}>
        <LinearGradient
          colors={['#FF5722', '#E64A19']}
          style={styles.errorIconBg}
        >
          <Icon name="exclamation-triangle" size={40} color="#fff" />
        </LinearGradient>
        <Text style={styles.errorTitle}>Oops!</Text>
        <Text style={styles.errorText}>{errorMsg}</Text>
        <Pressable style={styles.retryButton} onPress={fetchSightings}>
          <LinearGradient
            colors={['#4CAF50', '#2E7D32']}
            style={styles.retryButtonGradient}
          >
            <Icon name="refresh" size={18} color="#fff" />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </LinearGradient>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Full-screen Map */}
      {location && (
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          customMapStyle={pokemonGoMapStyle}
          initialRegion={{
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          }}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={false}
          rotateEnabled={true}
          pitchEnabled={true}
          onPress={() => setSelectedSighting(null)}
        >
          {/* Search radius circle */}
          <Circle
            center={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            }}
            radius={distance}
            strokeColor="rgba(76, 175, 80, 0.6)"
            fillColor="rgba(76, 175, 80, 0.08)"
            strokeWidth={3}
          />

          {/* Custom user location marker */}
          <Marker
            coordinate={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            }}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.userMarkerContainer}>
              {/* Middle ring */}
              <View style={styles.userMarkerRing} />
              {/* Center dot */}
              <LinearGradient
                colors={['#42A5F5', '#1976D2']}
                style={styles.userMarkerDot}
              >
                <Icon name="street-view" size={18} color="#fff" />
              </LinearGradient>
            </View>
          </Marker>

          {/* Sighting markers - singles (not clustered) */}
          {singles.map((sighting, index) => (
            <FloatingMarker
              key={`single-${sighting.id}-${index}`}
              sighting={sighting}
              index={index}
              isSelected={selectedSighting?.id === sighting.id}
              onPress={() => goToSighting(sighting)}
            />
          ))}

          {/* Cluster markers */}
          {clusters.map((cluster, index) => (
            <ClusterMarker
              key={`cluster-${index}`}
              cluster={cluster}
              index={index}
              onPress={() => openClusterModal(cluster.sightings)}
            />
          ))}

          {/* Fallback: if clustering returns nothing but sightings exist, show them directly */}
          {singles.length === 0 && clusters.length === 0 && sightings.map((sighting, index) => (
            <FloatingMarker
              key={`fallback-${sighting.id}-${index}`}
              sighting={sighting}
              index={index}
              isSelected={selectedSighting?.id === sighting.id}
              onPress={() => goToSighting(sighting)}
            />
          ))}
        </MapView>
      )}

      {/* Top stats bar */}
      <View style={styles.topOverlay}>
        <View style={styles.statsBar}>
          <Pressable style={styles.statItem} onPress={openSightingsList}>
            <View style={styles.statIconBg}>
              <Icon name="paw" size={16} color="#fff" />
            </View>
            <View>
              <Text style={styles.statNumber}>{sightings.length}</Text>
              <Text style={styles.statLabel}>Spotted</Text>
            </View>
          </Pressable>
          
          <View style={styles.statDivider} />
          
          <Pressable style={styles.statItem} onPress={openRadiusFilter}>
            <View style={[styles.statIconBg, { backgroundColor: '#5a9a55' }]}>
              <Icon name={getDistanceEmoji()} size={16} color="#fff" />
            </View>
            <View>
              <Text style={styles.statNumber}>{getDistanceLabel()}</Text>
              <Text style={styles.statLabel}>Radius</Text>
            </View>
          </Pressable>
          
          <View style={styles.statDivider} />
          
          <Pressable style={styles.statItem} onPress={fetchSightings}>
            <View style={[styles.statIconBg, { backgroundColor: '#40743d' }]}>
              <Icon name="refresh" size={16} color="#fff" />
            </View>
            <View>
              <Text style={styles.statNumber}>Scan</Text>
              <Text style={styles.statLabel}>Refresh</Text>
            </View>
          </Pressable>
        </View>
      </View>

      {/* Floating action buttons */}
      <View style={styles.fabContainer}>
        <Pressable style={styles.fabButton} onPress={goToMyLocation}>
          <LinearGradient colors={['#5a9a55', '#40743d']} style={styles.fabGradient}>
            <Icon name="crosshairs" size={24} color="#fff" />
          </LinearGradient>
        </Pressable>

        <Pressable style={styles.fabButton} onPress={openSightingsList}>
          <LinearGradient colors={['#40743d', '#2d5a2a']} style={styles.fabGradient}>
            <Icon name="paw" size={24} color="#fff" />
          </LinearGradient>
        </Pressable>

        <Pressable style={styles.fabButton} onPress={openRadiusFilter}>
          <LinearGradient colors={['#7FA37C', '#5a9a55']} style={styles.fabGradient}>
            <Icon name="sliders" size={24} color="#fff" />
          </LinearGradient>
        </Pressable>
      </View>

      {/* Selected sighting bottom card */}
      {selectedSighting && (
        <Animated.View
          style={[
            styles.bottomSheet,
            {
              transform: [
                {
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [200, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.bottomSheetHandle} />
          <SightingCard
            sighting={selectedSighting}
            isActive={true}
            index={0}
            onPress={() => {}}
          />
        </Animated.View>
      )}

      {/* Radius filter modal */}
      <Modal
        visible={showRadiusFilter}
        transparent
        animationType="none"
        onRequestClose={closeRadiusFilter}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={closeRadiusFilter}
          />
          <Animated.View
            style={[
              styles.radiusModal,
              {
                transform: [
                  {
                    translateY: radiusSlideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [400, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>🎯 Search Radius</Text>
            <Text style={styles.modalSubtitle}>
              How far should we look for wildlife?
            </Text>
            <View style={styles.radiusOptions}>
              {DISTANCE_OPTIONS.map((option) => (
                <Pressable
                  key={option.meters}
                  style={[
                    styles.radiusOption,
                    distance === option.meters && styles.radiusOptionActive,
                  ]}
                  onPress={() => {
                    setDistance(option.meters);
                    closeRadiusFilter();
                  }}
                >
                  <LinearGradient
                    colors={
                      distance === option.meters
                        ? ['#40743d', '#2d5a2a']
                        : ['#f5f5f5', '#eeeeee']
                    }
                    style={styles.radiusOptionGradient}
                  >
                    <View style={[styles.radiusIconCircle, distance === option.meters && styles.radiusIconCircleActive]}>
                      <Icon name={option.icon} size={20} color={distance === option.meters ? '#fff' : '#40743d'} />
                    </View>
                    <Text
                      style={[
                        styles.radiusOptionText,
                        distance === option.meters && styles.radiusOptionTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </LinearGradient>
                </Pressable>
              ))}
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Sightings list modal */}
      <Modal
        visible={showSightingsList}
        transparent
        animationType="none"
        onRequestClose={closeSightingsList}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={closeSightingsList}
          />
          <Animated.View
            style={[
              styles.listModal,
              {
                transform: [
                  {
                    translateY: listSlideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [600, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>🐾 Nearby Wildlife</Text>
            <Text style={styles.modalSubtitle}>
              {sightings.length} sightings within {getDistanceLabel()}
            </Text>
            <ScrollView 
              style={styles.sightingsList}
              showsVerticalScrollIndicator={false}
            >
              {sightings.length > 0 ? (
                sightings.map((sighting, index) => (
                  <SightingCard
                    key={sighting.id}
                    sighting={sighting}
                    index={index}
                    isActive={selectedSighting?.id === sighting.id}
                    onPress={() => {
                      goToSighting(sighting);
                      closeSightingsList();
                    }}
                  />
                ))
              ) : (
                <View style={styles.emptyList}>
                  <View style={styles.emptyIconContainer}>
                    <Icon name="binoculars" size={50} color="#bbb" />
                  </View>
                  <Text style={styles.emptyListText}>No wildlife spotted nearby</Text>
                  <Text style={styles.emptyListSubtext}>
                    Try increasing your search radius or check back later!
                  </Text>
                </View>
              )}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* Cluster modal - shows animals in a cluster */}
      <Modal
        visible={showClusterModal}
        transparent
        animationType="none"
        onRequestClose={closeClusterModal}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={closeClusterModal}
          />
          <Animated.View
            style={[
              styles.listModal,
              {
                transform: [
                  {
                    translateY: clusterSlideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [600, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.modalHandle} />
            <View style={styles.clusterModalHeader}>
              <LinearGradient
                colors={['#5a9a55', '#40743d']}
                style={styles.clusterModalIcon}
              >
                <Text style={styles.clusterModalCount}>{selectedCluster?.length || 0}</Text>
              </LinearGradient>
              <View style={styles.clusterModalTitleContainer}>
                <Text style={styles.modalTitle}>Wildlife Cluster</Text>
                <Text style={styles.modalSubtitle}>
                  {selectedCluster?.length || 0} animals spotted in this area
                </Text>
              </View>
            </View>
            <ScrollView 
              style={styles.sightingsList}
              showsVerticalScrollIndicator={false}
            >
              {selectedCluster?.map((sighting, index) => (
                <SightingCard
                  key={sighting.id}
                  sighting={sighting}
                  index={index}
                  isActive={selectedSighting?.id === sighting.id}
                  onPress={() => {
                    goToSighting(sighting);
                    closeClusterModal();
                  }}
                />
              ))}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e8f5e9',
  },
  map: {
    flex: 1,
  },
  
  // Loading screen
  loadingContainer: {
    flex: 1,
  },
  loadingGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarCircle: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  radarCircle1: {},
  radarCircle2: {},
  loadingIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  loadingTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
    letterSpacing: 1,
  },
  loadingText: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.9)',
  },
  loadingDotsContainer: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 8,
  },
  loadingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#fff',
  },
  
  // Error screen
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 24,
  },
  errorIconBg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    borderRadius: 30,
    overflow: 'hidden',
  },
  retryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 14,
    gap: 10,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  
  // Top stats bar
  topOverlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 55 : (StatusBar.currentHeight || 0) + 12,
    left: 16,
    right: 16,
    zIndex: 100,
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 24,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  statIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statEmoji: {
    fontSize: 18,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 4,
  },
  
  // FAB buttons
  fabContainer: {
    position: 'absolute',
    right: 16,
    bottom: 130,
    gap: 14,
  },
  fabButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    overflow: 'visible',
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  fabBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#FF5722',
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    paddingHorizontal: 4,
  },
  fabBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  
  // Map markers
  markerTouchArea: {
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerContainer: {
    alignItems: 'center',
  },
  
  // Cluster markers
  clusterTouchArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  clusterContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  clusterBubble: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 10,
  },
  clusterShine: {
    position: 'absolute',
    top: 8,
    left: 10,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  clusterCount: {
    color: '#fff',
    fontWeight: '800',
  },
  clusterIcon: {
    position: 'absolute',
    bottom: 8,
  },
  
  // Cluster modal
  clusterModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  clusterModalIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  clusterModalCount: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
  },
  clusterModalTitleContainer: {
    flex: 1,
  },
  
  calloutContainer: {
    alignItems: 'center',
  },
  calloutBubble: {
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    maxWidth: 180,
  },
  calloutText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  calloutArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'rgba(0, 0, 0, 0.85)',
  },
  markerNameBubble: {
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 6,
    maxWidth: 150,
    alignItems: 'center',
  },
  markerNameText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  markerNameArrow: {
    position: 'absolute',
    bottom: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'rgba(0, 0, 0, 0.85)',
  },
  markerBubble: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  markerShine: {
    position: 'absolute',
    top: 4,
    left: 6,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  markerIcon: {
    width: 30,
    height: 30,
  },
  
  // User marker
  userMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 200,
    height: 200,
    overflow: 'visible',
  },
  userMarkerPulse: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2196F3',
  },
  userMarkerRing: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(33, 150, 243, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(33, 150, 243, 0.3)',
  },
  userMarkerDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  
  // Bottom sheet
  bottomSheet: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
  },
  bottomSheetHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 12,
  },
  
  // Sighting card
  sightingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  sightingCardActive: {
    backgroundColor: '#E8F5E9',
    borderColor: '#40743d',
  },
  cardIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIcon: {
    width: 40,
    height: 40,
  },
  cardInfo: {
    flex: 1,
    marginLeft: 14,
  },
  cardName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#333',
  },
  cardCaption: {
    fontSize: 13,
    color: '#666',
    marginTop: 3,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 5,
  },
  cardMetaText: {
    fontSize: 11,
    color: '#999',
  },
  cardMetaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#ccc',
    marginHorizontal: 4,
  },
  cardArrow: {
    padding: 10,
  },
  
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  radiusModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 44,
  },
  listModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 44,
    maxHeight: SCREEN_HEIGHT * 0.85,
  },
  modalHandle: {
    width: 44,
    height: 5,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#333',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 24,
  },
  radiusOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 14,
  },
  radiusOption: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  radiusOptionActive: {
    shadowColor: '#40743d',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  radiusOptionGradient: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    minWidth: 90,
    alignItems: 'center',
  },
  radiusIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(64, 116, 61, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  radiusIconCircleActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  radiusOptionText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#666',
  },
  radiusOptionTextActive: {
    color: '#fff',
  },
  sightingsList: {
    maxHeight: SCREEN_HEIGHT * 0.65,
  },
  emptyList: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyListText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#999',
  },
  emptyListSubtext: {
    fontSize: 14,
    color: '#bbb',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});

