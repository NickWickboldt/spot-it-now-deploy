import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false, // Hide default labels to use our custom one
        tabBarInactiveTintColor: '#2e2e2e',
        tabBarActiveTintColor: '#000', // Color for the active icon and text

        // Style for the tab bar container
        tabBarStyle: {
          backgroundColor: '#ffffff',
          height: 80,
          borderTopWidth: 0,
          elevation: 5, // Shadow for Android
          shadowColor: '#000', // Shadow for iOS
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
        },

        // Custom tab bar icon component
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          let label = '';

          if (route.name === 'feed') {
            iconName = focused ? 'home' : 'home-outline';
            label = 'Feed';
          } else if (route.name === 'spotit') {
            iconName = focused ? 'search' : 'search-outline';
            label = 'Spot It';
          } else if (route.name === 'profile') {
            iconName = focused ? 'person' : 'person-outline';
            label = 'Profile';
          }

          // Render the pill-shaped component when focused
          if (focused) {
            return (
              <View style={styles.activeTabContainer}>
                <Ionicons name={iconName as any} size={22} color={color} />
                <Text style={[styles.activeTabText, { color }]}>{label}</Text>
              </View>
            );
          }

          // Render only the icon when not focused
          return <Ionicons name={iconName as any} size={26} color={color} />;
        },
      })}
    >
      {/* Define the screens for the tabs */}
      <Tabs.Screen name="feed" />
      <Tabs.Screen name="spotit" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

// Stylesheet for the custom components
const styles = StyleSheet.create({
  activeTabContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.btnColor, // Yellow background for the active tab
    borderRadius: 30, // Pill shape
    paddingHorizontal: 16,
    paddingVertical: 8, 
  },
  activeTabText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: "#fff",
  },
});


