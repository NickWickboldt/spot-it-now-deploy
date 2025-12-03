import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Dimensions,
    Easing,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { XPResult, getRarityColor } from '../api/experience';
import { Colors } from '../constants/Colors';

interface XPGainPopupProps {
  visible: boolean;
  xpResult: XPResult | null;
  onClose: () => void;
  autoCloseDelay?: number;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const XPGainPopup: React.FC<XPGainPopupProps> = ({
  visible,
  xpResult,
  onClose,
  autoCloseDelay = 4000,
}) => {
  const slideAnim = useRef(new Animated.Value(-200)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const xpCountAnim = useRef(new Animated.Value(0)).current;
  const starRotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && xpResult) {
      // Reset animations
      slideAnim.setValue(-200);
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);
      xpCountAnim.setValue(0);
      starRotate.setValue(0);

      // Animate in
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
        }),
      ]).start();

      // Animate XP count
      Animated.timing(xpCountAnim, {
        toValue: xpResult.xpAwarded,
        duration: 1000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();

      // Star rotation for level up
      if (xpResult.leveledUp) {
        Animated.loop(
          Animated.timing(starRotate, {
            toValue: 1,
            duration: 2000,
            easing: Easing.linear,
            useNativeDriver: true,
          })
        ).start();
      }

      // Auto close
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: -200,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => onClose());
      }, autoCloseDelay);

      return () => clearTimeout(timer);
    }
  }, [visible, xpResult]);

  if (!visible || !xpResult) return null;

  const rarityColor = getRarityColor(xpResult.rarityLevel);
  const spin = starRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <Animated.View
          style={[
            styles.container,
            {
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim },
              ],
              opacity: fadeAnim,
            },
          ]}
        >
          <LinearGradient
            colors={[Colors.light.primaryGreen, '#5a9a55', '#7FA37C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >
            {/* Close button */}
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={20} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>

            {/* Header with XP */}
            <View style={styles.header}>
              {xpResult.leveledUp ? (
                <Animated.View style={{ transform: [{ rotate: spin }] }}>
                  <Icon name="star" size={32} color="#FFD700" />
                </Animated.View>
              ) : (
                <Icon name="star" size={28} color="#FFD700" />
              )}
              <AnimatedXPText xpValue={xpCountAnim} />
              <Text style={styles.xpLabel}>XP</Text>
            </View>

            {/* Discovery Type Banner */}
            <View style={[
              styles.discoveryBanner,
              xpResult.isFirstDiscovery ? styles.firstDiscoveryBanner : styles.repeatBanner
            ]}>
              <Icon 
                name={xpResult.isFirstDiscovery ? "trophy" : "refresh"} 
                size={14} 
                color="#fff" 
              />
              <Text style={styles.discoveryText}>
                {xpResult.isFirstDiscovery ? 'NEW DISCOVERY!' : 'Spotted Again'}
              </Text>
            </View>

            {/* Animal Info */}
            <Text style={styles.animalName}>{xpResult.animalName}</Text>
            
            <View style={[styles.rarityBadge, { backgroundColor: rarityColor }]}>
              <Text style={styles.rarityText}>{xpResult.rarityLevel}</Text>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Level Progress Section */}
            <View style={styles.levelSection}>
              {xpResult.leveledUp && (
                <View style={styles.levelUpBanner}>
                  <Ionicons name="arrow-up-circle" size={22} color="#FFD700" />
                  <Text style={styles.levelUpText}>LEVEL UP!</Text>
                </View>
              )}
              
              <View style={styles.levelRow}>
                <View style={styles.levelBadge}>
                  <Text style={styles.levelNumber}>Lv.{xpResult.newLevel}</Text>
                </View>
                <Text style={styles.levelTitle}>
                  {xpResult.levelProgress?.title || 'Spotter'}
                </Text>
              </View>

              {/* Progress Bar */}
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBar}>
                  <Animated.View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.max(xpResult.levelProgress?.progressPercentage || 0, 3)}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>
                  {xpResult.levelProgress?.xpInLevel || 0} / {xpResult.levelProgress?.xpForNextLevel || 100} XP
                </Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
};

// Animated XP count component
const AnimatedXPText: React.FC<{ xpValue: Animated.Value }> = ({ xpValue }) => {
  const [displayValue, setDisplayValue] = React.useState(0);

  useEffect(() => {
    const listener = xpValue.addListener(({ value }) => {
      setDisplayValue(Math.round(value));
    });
    return () => xpValue.removeListener(listener);
  }, [xpValue]);

  return <Text style={styles.xpValue}>+{displayValue}</Text>;
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 100,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  container: {
    width: SCREEN_WIDTH - 48,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  gradient: {
    padding: 24,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  xpValue: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  xpLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
  },
  discoveryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 12,
    gap: 6,
  },
  firstDiscoveryBanner: {
    backgroundColor: '#FFD700',
  },
  repeatBanner: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  discoveryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  animalName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  rarityBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 14,
  },
  rarityText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  divider: {
    width: '80%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: 16,
  },
  levelSection: {
    width: '100%',
    alignItems: 'center',
  },
  levelUpBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.25)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 12,
    gap: 8,
  },
  levelUpText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
    letterSpacing: 1,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  levelBadge: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  levelNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.primaryGreen,
  },
  levelTitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    fontStyle: 'italic',
  },
  progressBarContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 10,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 5,
  },
  progressText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 6,
    fontWeight: '500',
  },
});

export default XPGainPopup;
