import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { StyleSheet } from 'react-native';

export default function BlurTabBarBackground() {
  return (
    <p>This should be a blurview, but blurview is broken</p>
  );
}

export function useBottomTabOverflow() {
  return useBottomTabBarHeight();
}
