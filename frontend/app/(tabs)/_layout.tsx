import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Tabs } from 'expo-router';
import Icon from 'react-native-vector-icons/FontAwesome';
import Svg, { Path } from 'react-native-svg';
import { Colors } from '../../constants/Colors';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Assuming you have a Colors file, otherwise replace with your colors


const { width } = Dimensions.get('window');

const TAB_ICONS = [
  { name: 'feed', icon: 'file-text', label: 'Sightings' },
  { name: 'spotit', icon: 'camera', label: 'Post', isCenter: true },
  { name: 'profile', icon: 'user', label: 'Profile' },
];

function CustomTabBar({ state, navigation }) {
  return (
    <View style={styles.tabBarWrapper}>
      <Svg
        width={width}
        height={80}
        style={styles.curveSvg}
        viewBox={`0 0 ${width} 80`}
      >
        <Path
          d={`
            M0,0 
            H${width / 2 - 40} 
            Q${width / 2},60 ${width / 2 + 40},0 
            H${width} 
            V80 
            H0 
            Z
          `}
          fill={Colors.light.softBeige}
        />
      </Svg>
      <View style={styles.tabRow}>
        {TAB_ICONS.map((tab, idx) => {
          const focused = state.index === idx;

          if (tab.isCenter) {
            // --- MODIFIED LOGIC FOR CENTER BUTTON ---
            const spotitRoute = state.routes.find(r => r.name === 'spotit');
            const takePictureFn = spotitRoute?.params?.takePicture;
            
            const handlePress = () => {
              if (focused && typeof takePictureFn === 'function') {
                // If we are already on the camera screen, take the picture
                takePictureFn();
              } else {
                // Otherwise, navigate to the camera screen
                navigation.navigate(tab.name);
              }
            };

            return (
              <View key={tab.name} style={styles.centerTabContainer}>
                <TouchableOpacity
                  onPress={handlePress} // Use the new handler logic
                  activeOpacity={0.7}
                  style={styles.centerIconBg}
                >
                  <Icon name={tab.icon} size={32} color={Colors.light.buttonText} />
                </TouchableOpacity>
                <Text style={styles.centerTabLabel}>{tab.label}</Text>
              </View>
            );
          }
          // --- END MODIFIED LOGIC ---

          return (
            <TouchableOpacity
              key={tab.name}
              onPress={() => navigation.navigate(tab.name)}
              style={styles.tabItem}
              activeOpacity={0.7}
            >
              <Icon
                name={tab.icon}
                size={24}
                color={focused ? Colors.light.primaryGreen : Colors.light.darkNeutral}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: focused ? Colors.light.primaryGreen : Colors.light.darkNeutral }
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs tabBar={props => <CustomTabBar {...props} />} screenOptions={{
      // Hiding the header for the spotit screen in the layout itself
      headerShown: false 
    }}>
      <Tabs.Screen name="feed" />
      <Tabs.Screen name="spotit" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

// Add some basic styles if they aren't imported from elsewhere
const styles = StyleSheet.create({
  tabBarWrapper: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: 80,
    alignItems: 'center',
  },
  curveSvg: {
    position: 'absolute',
    top: 0,
  },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    width: '100%',
    height: '100%',
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 10, 
    height: 60,
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  centerTabContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  centerIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.light.primaryGreen,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateY: -20 }],
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  centerTabLabel: {
    fontSize: 12,
    color: Colors.light.darkNeutral,
    transform: [{ translateY: -15 }],
  },
});