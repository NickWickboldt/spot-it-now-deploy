import React from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import Icon from 'react-native-vector-icons/FontAwesome';
import Svg, { Path } from 'react-native-svg';
import { Colors } from '../../constants/Colors';

const TAB_ICONS = [
  { name: 'feed', icon: 'file-text', label: 'Sightings' },      // FontAwesome "file-text" for posts
  { name: 'spotit', icon: 'camera', label: 'Post', isCenter: true },
  { name: 'profile', icon: 'user', label: 'Profile' },      // FontAwesome "user" for profile
];

const { width } = Dimensions.get('window');

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
            return (
              <View key={tab.name} style={styles.centerTabContainer}>
                <TouchableOpacity
                  onPress={() => navigation.navigate(tab.name)}
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
    <Tabs tabBar={props => <CustomTabBar {...props} />}>
      <Tabs.Screen name="feed" options={{ headerShown: false }} />
      <Tabs.Screen name="spotit" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 80,
    width: width,
    alignItems: 'center',
    justifyContent: 'center',
  },
  curveSvg: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 0,
    width: width,
  },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    width: width,
    height: 60,
    paddingHorizontal: 0,
    zIndex: 1,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1,
    marginBottom: 8,
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  centerTabContainer: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: 80,
    marginBottom: 8,
  },
  centerIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: Colors.light.shadow,
    shadowOpacity: 0.22,
    shadowRadius: 14,
    borderWidth: 4,
    borderColor: Colors.light.softBeige,
    position: 'absolute',
    top: -64,
    alignSelf: 'center',
    backgroundColor: Colors.light.shadow,
  },
  centerTabLabel: {
    fontSize: 16,
    marginTop: 20,
    fontWeight: '500',
    color: Colors.light.darkNeutral,
    textAlign: 'center',
  },
});