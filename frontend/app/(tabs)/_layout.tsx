import { LinearGradient } from 'expo-linear-gradient';
import { Tabs } from 'expo-router';
import React, { useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { Colors } from '../../constants/Colors';
import { getTakePictureRef, subscribeCaptureState, type CaptureState } from '../../utils/captureRegistry';

const TAB_ICONS = [
  { name: 'feed', icon: 'file-text', label: 'Feed' },
  { name: 'map', icon: 'map', label: 'Map' },
  { name: 'spotit', icon: 'camera', label: '', isCenter: true },
  { name: 'animal_index', icon: 'book', label: 'Index' },
  { name: 'profile', icon: 'user', label: 'Profile' },
];

// Animated Tab Button Component
const AnimatedTabButton = ({ 
  tab, 
  focused, 
  onPress, 
  capState 
}: { 
  tab: typeof TAB_ICONS[0]; 
  focused: boolean; 
  onPress: () => void;
  capState?: CaptureState;
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
      tension: 100,
      friction: 5,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 5,
    }).start();
  };

  if (tab.isCenter) {
    return (
      <TouchableOpacity
        key={tab.name}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={styles.tabItem}
      >
        <Animated.View style={[styles.iconWrapper, { transform: [{ scale: scaleAnim }] }]}>
          <LinearGradient
            colors={[Colors.light.primaryGreen, Colors.light.secondaryGreen]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.postGradient}
          >
            {capState?.isVideoMode ? (
              <Icon name={capState.isRecording ? 'stop' : 'dot-circle-o'} size={24} color={capState.isRecording ? '#ff4040' : Colors.light.softBeige} />
            ) : (
              <Icon name={tab.icon} size={24} color={Colors.light.softBeige} />
            )}
          </LinearGradient>
        </Animated.View>
        <Text style={[styles.tabLabel, { color: focused ? Colors.light.primaryGreen : Colors.light.darkNeutral }]}>
          {tab.label}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      key={tab.name}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.tabItem}
      activeOpacity={1}
    >
      <Animated.View style={[styles.iconWrapper, { transform: [{ scale: scaleAnim }] }]}>
        {focused && (
          <LinearGradient
            colors={[Colors.light.background, Colors.light.shadow]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.activeBackground}
          />
        )}
        <Icon
          name={tab.icon}
          size={24}
          color={focused ? Colors.light.primaryGreen : Colors.light.secondaryGreen}
        />
      </Animated.View>
      <Text
        style={[
          styles.tabLabel,
          { color: focused ? Colors.light.primaryGreen : Colors.light.secondaryGreen }
        ]}
      >
        {tab.label}
      </Text>
    </TouchableOpacity>
  );
};

function CustomTabBar({ state, navigation }) {
  const [capState, setCapState] = React.useState<CaptureState>({ isVideoMode: false, isRecording: false });
  React.useEffect(() => {
    const unsub = subscribeCaptureState(setCapState);
    return unsub;
  }, []);
  
  return (
    <View style={styles.tabBarWrapper}>
      <View style={styles.tabRow}>
        {TAB_ICONS.map((tab, idx) => {
          const focused = state.index === idx;

          const handlePress = () => {
            if (tab.isCenter) {
              const cb = getTakePictureRef();
              if (focused && typeof cb === 'function') {
                cb();
              } else {
                navigation.navigate(tab.name);
              }
            } else {
              navigation.navigate(tab.name);
            }
          };

          return (
            <AnimatedTabButton
              key={tab.name}
              tab={tab}
              focused={focused}
              onPress={handlePress}
              capState={tab.isCenter ? capState : undefined}
            />
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
    backgroundColor: Colors.light.softBeige,
    borderTopWidth: 1,
    borderTopColor: Colors.light.shadow,
    paddingBottom: 0,
  },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  iconWrapper: {
    position: 'relative',
    padding: 8,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 50,
  },
  postGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 4,
  },
});