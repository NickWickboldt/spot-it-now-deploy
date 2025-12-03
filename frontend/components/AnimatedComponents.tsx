import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, PressableProps, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../constants/Colors';

// ============================================
// ANIMATED PRESSABLE BUTTON
// Scales down on press with spring animation
// ============================================
interface AnimatedButtonProps extends PressableProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  scaleValue?: number;
}

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  children,
  style,
  scaleValue = 0.96,
  onPressIn,
  onPressOut,
  ...props
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = (e: any) => {
    Animated.spring(scaleAnim, {
      toValue: scaleValue,
      useNativeDriver: true,
      tension: 100,
      friction: 5,
    }).start();
    onPressIn?.(e);
  };

  const handlePressOut = (e: any) => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 5,
    }).start();
    onPressOut?.(e);
  };

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
      <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} {...props}>
        {children}
      </Pressable>
    </Animated.View>
  );
};

// ============================================
// FADE IN VIEW
// Fades in when mounted with optional delay
// ============================================
interface FadeInViewProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  delay?: number;
  duration?: number;
}

export const FadeInView: React.FC<FadeInViewProps> = ({
  children,
  style,
  delay = 0,
  duration = 400,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration,
      delay,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={[{ opacity: fadeAnim }, style]}>
      {children}
    </Animated.View>
  );
};

// ============================================
// SLIDE IN VIEW
// Slides in from a direction when mounted
// ============================================
interface SlideInViewProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  delay?: number;
  duration?: number;
  from?: 'left' | 'right' | 'top' | 'bottom';
  distance?: number;
}

export const SlideInView: React.FC<SlideInViewProps> = ({
  children,
  style,
  delay = 0,
  duration = 400,
  from = 'bottom',
  distance = 30,
}) => {
  const slideAnim = useRef(new Animated.Value(distance)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const getTransformStyle = () => {
    switch (from) {
      case 'left':
        return { transform: [{ translateX: Animated.multiply(slideAnim, -1) as any }] };
      case 'right':
        return { transform: [{ translateX: slideAnim }] };
      case 'top':
        return { transform: [{ translateY: Animated.multiply(slideAnim, -1) as any }] };
      case 'bottom':
      default:
        return { transform: [{ translateY: slideAnim }] };
    }
  };

  return (
    <Animated.View
      style={[
        { opacity: fadeAnim },
        getTransformStyle(),
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
};

// ============================================
// SCALE IN VIEW
// Scales up when mounted with bounce effect
// ============================================
interface ScaleInViewProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  delay?: number;
}

export const ScaleInView: React.FC<ScaleInViewProps> = ({
  children,
  style,
  delay = 0,
}) => {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setTimeout(() => {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 80,
          friction: 6,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);
  }, []);

  return (
    <Animated.View
      style={[
        { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
};

// ============================================
// PULSE VIEW
// Continuously pulses (great for attention)
// ============================================
interface PulseViewProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  minScale?: number;
  maxScale?: number;
  duration?: number;
}

export const PulseView: React.FC<PulseViewProps> = ({
  children,
  style,
  minScale = 1,
  maxScale = 1.05,
  duration = 1500,
}) => {
  const scaleAnim = useRef(new Animated.Value(minScale)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: maxScale,
          duration: duration / 2,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: minScale,
          duration: duration / 2,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
      {children}
    </Animated.View>
  );
};

// ============================================
// STAGGER CHILDREN
// Helper hook for staggered list animations
// ============================================
export const useStaggerAnimation = (itemCount: number, staggerDelay: number = 50) => {
  const animations = useRef<Animated.Value[]>([]).current;

  // Ensure we have enough animation values
  while (animations.length < itemCount) {
    animations.push(new Animated.Value(0));
  }

  useEffect(() => {
    const staggeredAnimations = animations.slice(0, itemCount).map((anim, index) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 400,
        delay: index * staggerDelay,
        useNativeDriver: true,
      })
    );

    Animated.stagger(staggerDelay, staggeredAnimations).start();
  }, [itemCount]);

  return animations.slice(0, itemCount);
};

// ============================================
// SHIMMER LOADING PLACEHOLDER
// Shimmer effect for loading states
// ============================================
interface ShimmerProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Shimmer: React.FC<ShimmerProps> = ({
  width,
  height,
  borderRadius = 8,
  style,
}) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, 100],
  });

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: Colors.light.lightGrey,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View
        style={{
          ...StyleSheet.absoluteFillObject,
          backgroundColor: 'rgba(255,255,255,0.3)',
          transform: [{ translateX }],
        }}
      />
    </Animated.View>
  );
};

// ============================================
// BOUNCE VIEW
// Single bounce animation on mount
// ============================================
interface BounceViewProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  delay?: number;
}

export const BounceView: React.FC<BounceViewProps> = ({
  children,
  style,
  delay = 0,
}) => {
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setTimeout(() => {
      Animated.spring(bounceAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 3,
      }).start();
    }, delay);
  }, []);

  const scale = bounceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      {children}
    </Animated.View>
  );
};

// ============================================
// SHAKE VIEW
// Shakes horizontally (great for errors)
// ============================================
interface ShakeViewProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  trigger?: boolean;
}

export const ShakeView: React.FC<ShakeViewProps> = ({
  children,
  style,
  trigger,
}) => {
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (trigger) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    }
  }, [trigger]);

  return (
    <Animated.View style={[{ transform: [{ translateX: shakeAnim }] }, style]}>
      {children}
    </Animated.View>
  );
};
