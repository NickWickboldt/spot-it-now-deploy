import * as Location from 'expo-location';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Callout, Marker, Region } from 'react-native-maps';
import Icon from 'react-native-vector-icons/FontAwesome';
import { apiGetSightingsNear } from '../../api/sighting';
import AnimalMarker from '../../components/ui/AnimalMarker';
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
  const [distance, setDistance] = useState(1000); // default to 5km
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
              name: sighting.animal || 'Unknown',
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
                  name={sighting.animal || 'Unknown'}
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
      {/* Distance select buttons */}
      <View style={MapStyles.distanceSelectorWrap}>
        <View style={{ flexDirection: 'row' }}>
          {[100, 500, 1000].map(val => {
            const isActive = distance === val;
            return (
              <TouchableOpacity
                key={val}
                style={[MapStyles.distanceSelectorButton, isActive && MapStyles.distanceSelectorButtonActive]}
                onPress={() => setDistance(val)}
              >
                <Text style={[MapStyles.distanceSelectorText, isActive && MapStyles.distanceSelectorTextActive]}>{val} km</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      {/* Sightings bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={MapStyles.sightingsBar}
        contentContainerStyle={{ alignItems: 'flex-start', paddingHorizontal: 8 }}
      >
        {animals.map(sighting => (
          <TouchableOpacity
            key={sighting.id}
            style={MapStyles.sightingItem}
            onPress={() => goToSighting(sighting)}
          >
            <View style={MapStyles.sightingIconWrap}>
              <Icon name={isValidIcon(sighting.animal) ? sighting.animal : 'question'} size={22} color="#fff" />
            </View>
            <Text style={MapStyles.sightingName} numberOfLines={1}>{sighting.animal || 'Unknown'}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
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
    </View>
  );
};

export default AnimalTrackerScreen;

