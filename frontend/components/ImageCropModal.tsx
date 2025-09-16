import * as ImageManipulator from 'expo-image-manipulator';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, ImageStyle, StyleSheet, Text, TextStyle, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CROP_BOX_SIZE = SCREEN_WIDTH * 0.8;

interface ImageCropModalProps {
  isVisible: boolean;
  imageUri: string | null;
  onClose: () => void;
  onCropComplete: (uri: string) => void;
}

const AnimatedImage = Animated.createAnimatedComponent(Image);

export default function ImageCropModal({ isVisible, imageUri, onClose, onCropComplete }: ImageCropModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const minScale = useSharedValue(1);
  const startScale = useSharedValue(1);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const MAX_SCALE = 8;
  // Display geometry of the image when fit with 'contain'
  const [dispW, setDispW] = useState<number>(SCREEN_WIDTH);
  const [dispH, setDispH] = useState<number>(SCREEN_HEIGHT);
  const [offX, setOffX] = useState<number>(0);
  const [offY, setOffY] = useState<number>(0);
  const containScaleRef = useRef<number>(1);

  // Gestures using the modern API
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      startScale.value = scale.value;
    })
    .onUpdate((e) => {
      const next = startScale.value * e.scale;
      const clamped = Math.max(minScale.value, Math.min(next, MAX_SCALE));
      scale.value = clamped;
    });

  const panGesture = Gesture.Pan()
    .onStart(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
    })
    .onUpdate((e) => {
      translateX.value = startX.value + e.translationX;
      translateY.value = startY.value + e.translationY;
    });

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    // Apply scale around element center, then translate in screen pixels
    transform: [
      { scale: scale.value },
      { translateX: translateX.value },
      { translateY: translateY.value },
    ] as any,
  }));

  const handleCrop = async () => {
    if (!imageUri || isProcessing) return;
    setIsProcessing(true);

    try {
      const imageSize = await new Promise<{ width: number, height: number }>((resolve, reject) => {
        Image.getSize(imageUri, (width, height) => resolve({ width, height }), reject);
      });

      const s = scale.value;
      const tx = translateX.value;
      const ty = translateY.value;
      const cropLeft = (SCREEN_WIDTH - CROP_BOX_SIZE) / 2;
      const cropTop = (SCREEN_HEIGHT - CROP_BOX_SIZE) / 2;

      // Inverse transform with center-origin scaling:
      // p_screen = off + T + s * p_local + (1 - s) * center
      // => p_local = (p_screen - off - T - (1 - s) * center) / s
      const cx = dispW / 2;
      const cy = dispH / 2;
      const toLocal = (sx: number, sy: number) => ({
        x: (sx - offX - tx - (1 - s) * cx) / s,
        y: (sy - offY - ty - (1 - s) * cy) / s,
      });

      const tlLocal = toLocal(cropLeft, cropTop);
      const brLocal = toLocal(cropLeft + CROP_BOX_SIZE, cropTop + CROP_BOX_SIZE);

  const containScale = containScaleRef.current;
      // Map to original image coordinates
      let originX = tlLocal.x / containScale;
      let originY = tlLocal.y / containScale;
      let cropWidth = (brLocal.x - tlLocal.x) / containScale;
      let cropHeight = (brLocal.y - tlLocal.y) / containScale;

  // Tiny downward bias to counter any residual upward shift when zoomed
  const biasScreenY = 2; // in screen px
  originY += (biasScreenY / s) / containScale;

      // Clamp to image bounds
      originX = Math.max(0, Math.min(originX, imageSize.width));
      originY = Math.max(0, Math.min(originY, imageSize.height));
      cropWidth = Math.max(1, Math.min(cropWidth, imageSize.width - originX));
      cropHeight = Math.max(1, Math.min(cropHeight, imageSize.height - originY));

      const cropData = {
        originX,
        originY,
        width: cropWidth,
        height: cropHeight,
      };

      const manipResult = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ crop: cropData }],
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
      );
      onCropComplete(manipResult.uri);
    } catch (error) {
      console.error('Error cropping image:', error);
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  // Initialize geometry and min scale so that the image covers the crop box at start
  useEffect(() => {
    if (!isVisible || !imageUri) return;
    Image.getSize(imageUri, (iw, ih) => {
      // size under contain in full-screen container
      const containScale = Math.min(SCREEN_WIDTH / iw, SCREEN_HEIGHT / ih);
      const dW = iw * containScale;
      const dH = ih * containScale;
      const oX = (SCREEN_WIDTH - dW) / 2;
      const oY = (SCREEN_HEIGHT - dH) / 2;
      containScaleRef.current = containScale;
      setDispW(dW);
      setDispH(dH);
      setOffX(oX);
      setOffY(oY);

      const needW = CROP_BOX_SIZE / dW;
      const needH = CROP_BOX_SIZE / dH;
      const initial = Math.max(needW, needH) * 1.1; // slight zoom-in for comfort
      minScale.value = Math.max(1, initial);
      scale.value = Math.max(1, initial);
      translateX.value = 0;
      translateY.value = 0;
    }, () => {
      // fallback
      minScale.value = 1;
      scale.value = 1;
      translateX.value = 0;
      translateY.value = 0;
    });
  }, [isVisible, imageUri]);

  if (!isVisible || !imageUri) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Top header with Cancel (left) and Crop (right) */}
      <SafeAreaView edges={["top"]} style={styles.topHeader}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.headerBtn} onPress={onClose} disabled={isProcessing}>
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={handleCrop} disabled={isProcessing}>
            {isProcessing ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Crop</Text>}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={styles.flex}>
          <AnimatedImage
            source={{ uri: imageUri }}
            style={[
              // Display at contained size and position centered; transforms apply to this rect
              { position: 'absolute', width: dispW, height: dispH, left: offX, top: offY } as ImageStyle,
              animatedStyle,
            ]}
            resizeMode="cover"
          />
        </Animated.View>
      </GestureDetector>

      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.cropBox} />
      </View>

  {/* Removed bottom footer to avoid being hidden by nav bar */}
    </View>
  );
}

const styles = StyleSheet.create<{ 
  container: ViewStyle;
  flex: ViewStyle;
  image: ImageStyle;
  overlay: ViewStyle;
  topHeader: ViewStyle;
  headerRow: ViewStyle;
  headerBtn: ViewStyle;
  cropBox: ViewStyle;
  footer: ViewStyle; // kept for type compatibility, not used visually
  button: ViewStyle;
  buttonText: TextStyle;
}>({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'black',
    zIndex: 1000,
  },
  flex: {
    flex: 1,
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  topHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 1001,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  cropBox: {
    width: CROP_BOX_SIZE,
    height: CROP_BOX_SIZE,
    borderWidth: 2,
    borderColor: 'white',
    borderStyle: 'dashed',
  },
  footer: {
    // not used; reserved for type compatibility
  },
  button: {
    padding: 12,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
