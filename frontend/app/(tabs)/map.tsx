import * as Location from 'expo-location';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Callout, Marker, Region } from 'react-native-maps';
import Icon from 'react-native-vector-icons/FontAwesome';
import { apiGetSightingsNear } from '../../api/sighting';
import AnimalMarker from '../../components/ui/AnimalMarker';
import { Colors } from '../../constants/Colors';
import MapStyles from '../../constants/MapStyles';

// FontAwesome glyphmap and icon validator
import fontAwesomeIcons from 'react-native-vector-icons/glyphmaps/FontAwesome.json';
function isValidIcon(iconName) {
  return iconName && Object.prototype.hasOwnProperty.call(fontAwesomeIcons, iconName);
}

const AnimalTrackerScreen = () => {
  // Helper to go to a sighting's location
  // Store refs for each marker
  const markerRefs = useRef({});

  const goToSighting = (sighting) => {
    if (mapRef.current && sighting && sighting.coordinate) {
      mapRef.current.animateToRegion({
        latitude: Number(sighting.coordinate.latitude),
        longitude: Number(sighting.coordinate.longitude),
        latitudeDelta: 0.00922,
        longitudeDelta: 0.00421,
      }, 300);
      // Show callout for the selected marker
      if (markerRefs.current[sighting.id]) {
        setTimeout(() => {
          markerRefs.current[sighting.id].showCallout();
        }, 200);
      }
    }
  };
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [animals, setAnimals] = useState([]);
  const [distance, setDistance] = useState(4828); // default to 3 miles
  const [distanceMenuVisible, setDistanceMenuVisible] = useState(false);
  const [sightingsMenuVisible, setSightingsMenuVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const sightingsSlideAnim = useRef(new Animated.Value(0)).current;
  const mapRef = useRef<MapView>(null);

  const openDistanceMenu = () => {
    setDistanceMenuVisible(true);
    Animated.spring(slideAnim, {
      toValue: 1,
      tension: 65,
      friction: 11,
      useNativeDriver: true,
    }).start();
  };

  const closeDistanceMenu = () => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setDistanceMenuVisible(false));
  };

  const openSightingsMenu = () => {
    setSightingsMenuVisible(true);
    Animated.spring(sightingsSlideAnim, {
      toValue: 1,
      tension: 65,
      friction: 11,
      useNativeDriver: true,
    }).start();
  };

  const closeSightingsMenu = () => {
    Animated.timing(sightingsSlideAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setSightingsMenuVisible(false));
  };

  // Define the zoom boundaries using deltas for pinch-to-zoom gestures.
  const MIN_ZOOM_DELTA = 0.004;
  const MAX_ZOOM_DELTA = 0.1;

  // Define the zoom boundaries for the buttons using camera zoom levels.
  const MIN_CAMERA_ZOOM = 13;
  const MAX_CAMERA_ZOOM = 18;

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }
      try {
        // Get user's current location if not already set
        let currentLocation = location;
        if (!currentLocation) {
          currentLocation = await Location.getCurrentPositionAsync({});
          setLocation(currentLocation);
        }
        if (currentLocation) {
          const resp = await apiGetSightingsNear(
            currentLocation.coords.longitude,
            currentLocation.coords.latitude,
            distance // use state value
          );
          setAnimals(
            (resp.data || []).map((sighting, index) => ({
              id: sighting._id || index,
              name: sighting.animal?.commonName || sighting.aiIdentification || 'Unknown',
              caption: sighting.caption || '',
              mediaUrls: sighting.mediaUrls || [],
              userName: sighting.userName || '',
              coordinate: {
                latitude: Number(sighting.location.coordinates[1]),
                longitude: Number(sighting.location.coordinates[0]),
              },
            }))
          );
        }
      } catch (err) {
        setErrorMsg('Failed to fetch nearby sightings');
        setAnimals([]);
      }
    })();
  }, [distance]);

  const handleZoom = async (zoomIn: boolean) => {
    if (!mapRef.current) return;
    const camera = await mapRef.current.getCamera();
    if (camera) {
      // Check zoom out limit before animating
      if (!zoomIn && camera.zoom <= MIN_CAMERA_ZOOM) {
        return; // Already at max zoom out, do nothing
      }
      // Check zoom in limit before animating
      if (zoomIn && camera.zoom >= MAX_CAMERA_ZOOM) {
        return; // Already at max zoom in, do nothing
      }

      let newZoom = zoomIn ? camera.zoom + 1 : camera.zoom - 1;
      camera.zoom = newZoom;
      mapRef.current.animateCamera(camera, { duration: 300 });
    }
  };

  const handleRegionChange = (region: Region) => {
    if (!mapRef.current) return;
    const aspectRatio = region.longitudeDelta / region.latitudeDelta;
    let changed = false;
    const newRegion = { ...region };
    if (region.latitudeDelta < MIN_ZOOM_DELTA) {
      newRegion.latitudeDelta = MIN_ZOOM_DELTA;
      newRegion.longitudeDelta = MIN_ZOOM_DELTA * aspectRatio;
      changed = true;
    }
    if (region.latitudeDelta > MAX_ZOOM_DELTA) {
      newRegion.latitudeDelta = MAX_ZOOM_DELTA;
      newRegion.longitudeDelta = MAX_ZOOM_DELTA * aspectRatio;
      changed = true;
    }
    if (changed) {
      mapRef.current.animateToRegion(newRegion, 0);
    }
  };

  const goToMyLocation = () => {
    if (mapRef.current && location) {
      mapRef.current.animateToRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.00922,
        longitudeDelta: 0.00421,
      }, 300);
    }
  };


  const renderContent = () => {
    if (location) {
      return (
        <MapView
          ref={mapRef}
          provider="google"
          style={MapStyles.map}
          onRegionChangeComplete={handleRegionChange}
          initialRegion={{
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.00922,
            longitudeDelta: 0.00421,
          }}
          showsUserLocation={true}
          // If you have a custom map style, import it correctly, otherwise remove this line or set to []
          customMapStyle={[]}
        >
          {animals.map(sighting => (
            <Marker
              key={sighting.id}
              ref={ref => { markerRefs.current[sighting.id] = ref; }}
              coordinate={{
                latitude: Number(sighting.coordinate.latitude),
                longitude: Number(sighting.coordinate.longitude),
              }}
            >
              {/* Custom marker icon */}
              <View style={MapStyles.animalMarker}>
                <Icon name={isValidIcon(sighting.animal) ? sighting.animal : 'question'} style={MapStyles.markerIcon} />
              </View>
              {/* Callout with info */}
              <Callout style={{ borderRadius: 16, padding: 0, backgroundColor: 'transparent' }}>
                <AnimalMarker
                  name={sighting.animal?.commonName || 'Unknown'}
                  caption={sighting.caption}
                  mediaUrls={sighting.mediaUrls}
                  userName={sighting.userName}
                />
              </Callout>
            </Marker>
          ))}
        </MapView>
      );
    }

    return (
      <View style={MapStyles.centered}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={MapStyles.loadingText}>Finding nearby animals...</Text>
      </View>
    );
  };

  return (
    <View style={MapStyles.container}>
      <StatusBar style="light" />


      {renderContent()}
      {/* Distance menu modal */}
      <Modal
        visible={distanceMenuVisible}
        transparent
        animationType="none"
        onRequestClose={closeDistanceMenu}
      >
        <View style={menuStyles.overlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject as any}
            activeOpacity={1}
            onPress={closeDistanceMenu}
          />
          <Animated.View style={[
            menuStyles.menuContainer,
            {
              transform: [{
                translateY: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [600, 0],
                }),
              }],
            },
          ]}>
            <View style={menuStyles.dragHandle} />
            <Text style={menuStyles.menuTitle}>Search Radius</Text>
            {[
              { meters: 805, label: '0.5 mi' },
              { meters: 1609, label: '1 mi' },
              { meters: 4828, label: '3 mi' },
              { meters: 8047, label: '5 mi' },
              { meters: 16093, label: '10 mi' },
            ].map(({ meters, label }) => {
              const isActive = distance === meters;
              return (
                <TouchableOpacity
                  key={meters}
                  style={menuStyles.menuItem}
                  onPress={() => {
                    setDistance(meters);
                    closeDistanceMenu();
                  }}
                >
                  <Text style={[menuStyles.menuText, isActive && menuStyles.menuTextActive]}>
                    {label}
                  </Text>
                  {isActive && <Icon name="check" size={16} color={Colors.light.primaryGreen} />}
                </TouchableOpacity>
              );
            })}
          </Animated.View>
        </View>
      </Modal>
      {/* Sightings menu modal */}
      <Modal
        visible={sightingsMenuVisible}
        transparent
        animationType="none"
        onRequestClose={closeSightingsMenu}
      >
        <View style={menuStyles.overlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject as any}
            activeOpacity={1}
            onPress={closeSightingsMenu}
          />
          <Animated.View style={[
            menuStyles.sightingsContainer,
            {
              transform: [{
                translateY: sightingsSlideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [600, 0],
                }),
              }],
            },
          ]}>
            <View style={menuStyles.dragHandle} />
            <Text style={menuStyles.menuTitle}>Nearby Sightings</Text>
            <ScrollView 
              style={menuStyles.sightingsScrollView}
              showsVerticalScrollIndicator={false}
            >
              {animals.length > 0 ? (
                <View style={menuStyles.gridContainer}>
                  {animals.map(sighting => (
                    <TouchableOpacity
                      key={sighting.id}
                      style={menuStyles.gridItem}
                      onPress={() => {
                        goToSighting(sighting);
                        closeSightingsMenu();
                      }}
                    >
                      <View style={menuStyles.gridIconWrap}>
                        <Icon name={isValidIcon(sighting.animal) ? sighting.animal : 'question'} size={28} color="#fff" />
                      </View>
                      <Text style={menuStyles.gridText} numberOfLines={2}>{sighting.animal?.commonName || 'Unknown'}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <Text style={menuStyles.noSightingsText}>No sightings nearby</Text>
              )}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
      {/* Sightings bar - removed, now in modal */}
      {location && (
        <View style={MapStyles.buttonContainer}>
          <View style={MapStyles.zoomControls}>
            <TouchableOpacity style={MapStyles.zoomButton} onPress={() => handleZoom(true)}>
              <Icon name="plus" size={20} color="#333" />
            </TouchableOpacity>
            <View style={MapStyles.zoomSeparator} />
            <TouchableOpacity style={MapStyles.zoomButton} onPress={() => handleZoom(false)}>
              <Icon name="minus" size={20} color="#333" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={MapStyles.recenterButton} onPress={goToMyLocation}>
            <Icon name="location-arrow" size={20} color="#333" />
          </TouchableOpacity>
        </View>
      )}
      {location && (
        <TouchableOpacity 
          style={menuStyles.distanceButtonBottomRight} 
          onPress={openDistanceMenu}
        >
          <Icon name="sliders" size={20} color="#fff" />
        </TouchableOpacity>
      )}
      {location && (
        <TouchableOpacity 
          style={menuStyles.sightingsButtonBottomRight} 
          onPress={openSightingsMenu}
        >
          <Icon name="paw" size={20} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const menuStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    backgroundColor: Colors.light.softBeige,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  dragHandle: {
    width: 40,
    height: 5,
    backgroundColor: Colors.light.shadow,
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.primaryGreen,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.shadow,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  menuText: {
    fontSize: 16,
    color: Colors.light.darkNeutral,
  },
  menuTextActive: {
    color: Colors.light.primaryGreen,
    fontWeight: '700',
  },
  distanceButtonBottomRight: {
    position: 'absolute',
    bottom: 140,
    right: 16,
    backgroundColor: Colors.light.primaryGreen,
    borderRadius: 20,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  sightingsButtonBottomRight: {
    position: 'absolute',
    bottom: 200,
    right: 16,
    backgroundColor: Colors.light.primaryGreen,
    borderRadius: 20,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  sightingsContainer: {
    backgroundColor: Colors.light.softBeige,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  sightingsScrollView: {
    maxHeight: 400,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  gridItem: {
    width: '33.333%',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  gridIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.light.primaryGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  gridText: {
    fontSize: 12,
    color: Colors.light.darkNeutral,
    textAlign: 'center',
    fontWeight: '600',
  },
  sightingMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.shadow,
  },
  sightingIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.primaryGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sightingText: {
    fontSize: 16,
    color: Colors.light.darkNeutral,
    flex: 1,
  },
  noSightingsText: {
    fontSize: 16,
    color: Colors.light.secondaryGreen,
    textAlign: 'center',
    paddingVertical: 40,
  },
});

export default AnimalTrackerScreen;

