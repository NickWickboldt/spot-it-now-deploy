import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, StatusBar, ActivityIndicator, TouchableOpacity } from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker, Callout, MapStyleElement, Region } from 'react-native-maps';
import mapStyle from '../../constants/mapStyle';
import Icon from 'react-native-vector-icons/FontAwesome';

// --- (generateMockAnimals function remains the same) ---
const generateMockAnimals = (userCoords) => {
  const animals = [
    { name: 'Deer', icon: 'paw' },
    { name: 'Squirrel', icon: 'paw' },
    { name: 'Fox', icon: 'paw' },
    { name: 'Bird', icon: 'paw' },
    { name: 'Rabbit', icon: 'paw' },
  ];
  return animals.map((animal, index) => {
    const offset = (Math.random() - 0.5) * 0.02;
    return {
      id: index,
      name: animal.name,
      icon: animal.icon,
      coordinate: {
        latitude: userCoords.latitude + offset,
        longitude: userCoords.longitude + (offset / Math.cos(userCoords.latitude * Math.PI / 180)),
      },
    };
  });
};


const AnimalTrackerScreen = () => {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [animals, setAnimals] = useState([]);
  const mapRef = useRef<MapView>(null);

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
      let currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);
      setAnimals(generateMockAnimals(currentLocation.coords));
    })();
  }, []);

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
      }, 1000);
    }
  };


  const renderContent = () => {
    if (location) {
      return (
        <MapView
          ref={mapRef}
          provider="google"
          style={styles.map}
          onRegionChangeComplete={handleRegionChange}
          initialRegion={{
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.00922,
            longitudeDelta: 0.00421,
          }}
          showsUserLocation={true}
          customMapStyle={mapStyle as MapStyleElement[]}
        >
          {animals.map(animal => (
            <Marker key={animal.id} coordinate={animal.coordinate}>
              <View style={styles.animalMarker}>
                <Icon name={animal.icon} style={styles.markerIcon} />
              </View>
              <Callout>
                <View style={styles.calloutView}>
                  <Text style={styles.calloutTitle}>{animal.name}</Text>
                </View>
              </Callout>
            </Marker>
          ))}
        </MapView>
      );
    }

    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.loadingText}>Finding nearby animals...</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      {renderContent()}
      {location && (
        <View style={styles.buttonContainer}>
          <View style={styles.zoomControls}>
            <TouchableOpacity style={styles.zoomButton} onPress={() => handleZoom(true)}>
              <Icon name="plus" size={20} color="#333" />
            </TouchableOpacity>
            <View style={styles.zoomSeparator} />
            <TouchableOpacity style={styles.zoomButton} onPress={() => handleZoom(false)}>
              <Icon name="minus" size={20} color="#333" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.recenterButton} onPress={goToMyLocation}>
            <Icon name="location-arrow" size={20} color="#333" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1c1c1e' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 15, fontSize: 18, color: '#a1a1a6' },
  subtitle: { fontSize: 18, color: '#a1a1a6', textAlign: 'center', lineHeight: 26 },
  map: { flex: 1 },
  animalMarker: {
    backgroundColor: '#c6633c', padding: 10, borderRadius: 22,
    borderColor: '#fff', borderWidth: 2, alignItems: 'center', justifyContent: 'center',
  },
  markerIcon: { width: 20, height: 20, color: 'white' },
  calloutView: { padding: 10, minWidth: 100, alignItems: 'center' },
  calloutTitle: { fontWeight: 'bold', fontSize: 16 },
  buttonContainer: {
    position: 'absolute',
    top: 60,
    right: 15,
    alignItems: 'center',
  },
  zoomControls: {
    backgroundColor: 'white',
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  zoomButton: {
    padding: 10,
    alignItems: 'center',
  },
  zoomSeparator: {
    width: '100%',
    height: 1,
    backgroundColor: '#ccc',
  },
  recenterButton: {
    marginTop: 10,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
});

export default AnimalTrackerScreen;

