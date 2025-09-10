import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { Colors } from '../../constants/Colors';

const TAB_ICONS = [
  { name: 'feed', icon: 'file-text', label: 'Sightings' },
  { name: 'map', icon: 'map', label: 'Map' },
  { name: 'spotit', icon: 'camera', label: 'Post', isCenter: true },
  { name: 'animal_index', icon: 'book', label: 'Index' },
  { name: 'profile', icon: 'user', label: 'Profile' },
];

function CustomTabBar({ state, navigation }) {
  return (
    <View style={styles.tabBarWrapper}>
      <View style={styles.tabRow}>
        {TAB_ICONS.map((tab, idx) => {
          const focused = state.index === idx;

          if (tab.isCenter) {
            const spotitRoute = state.routes.find(r => r.name === 'spotit');
            const takePictureFn = spotitRoute?.params?.takePicture;

            const handlePress = () => {
              if (focused && typeof takePictureFn === 'function') {
                takePictureFn();
              } else {
                navigation.navigate(tab.name);
              }
            };

            return (
              <View key={tab.name} style={styles.centerTabContainer}>
                <TouchableOpacity
                  onPress={handlePress}
                  activeOpacity={0.7}
                  style={styles.centerIconBg}
                >
                  <Icon name={tab.icon} size={32} color={Colors.light.buttonText} />
                </TouchableOpacity>
                <Text style={styles.centerTabLabel}>{tab.label}</Text>
              </View>
            );
          }

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
    <Tabs 
      tabBar={props => <CustomTabBar {...props} />} 
      screenOptions={{
        headerShown: false
      }}
      initialRouteName="feed"
    >
      <Tabs.Screen name="feed" />
      <Tabs.Screen name="map" />
      <Tabs.Screen name="spotit" />
      <Tabs.Screen name="animal_index"/>
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarWrapper: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: 120,
    backgroundColor: Colors.light.softBeige,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: Colors.light.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: 80,
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  centerTabContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.light.shadow,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 3.84,
    color: '#fff',               // <-- raise above tab bar
    zIndex: 2,
  },
  centerTabLabel: {
    fontSize: 12,
    color: Colors.light.darkNeutral,
    marginTop: 4,
    textAlign: 'center',
  },
});