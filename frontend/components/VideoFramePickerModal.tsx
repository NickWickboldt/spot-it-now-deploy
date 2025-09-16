import { AVPlaybackStatus, ResizeMode, Video } from 'expo-av';
import * as VideoThumbnails from 'expo-video-thumbnails';
import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type Props = {
  isVisible: boolean;
  videoUri: string | null;
  onClose: () => void;
  onPickFrame: (frameUri: string) => void;
};

export default function VideoFramePickerModal({ isVisible, videoUri, onClose, onPickFrame }: Props) {
  const videoRef = useRef<Video | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const lastPosition = useRef<number>(0);
  const duration = useRef<number>(0);
  const insets = useSafeAreaInsets();

  const onStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    // Track current position and duration in millis
    lastPosition.current = status.positionMillis ?? lastPosition.current;
    duration.current = status.durationMillis ?? duration.current;
  }, []);

  const handleUseFrame = useCallback(async () => {
    if (!videoUri || isBusy) return;
    setIsBusy(true);
    try {
      const time = Math.max(0, Math.min(lastPosition.current || 0, duration.current || Number.MAX_SAFE_INTEGER));
      const thumb = await VideoThumbnails.getThumbnailAsync(videoUri, { time });
      onPickFrame(thumb.uri);
    } catch (e) {
      console.error('Failed generating thumbnail', e);
      onClose();
    } finally {
      setIsBusy(false);
    }
  }, [videoUri, onPickFrame, onClose, isBusy]);

  if (!isVisible || !videoUri) return null;

  // Work around type friction by aliasing Video to any for JSX usage
  const VideoComponent: any = Video as any;

  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top"]} style={styles.safeHeader}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.headerBtn} onPress={onClose} disabled={isBusy}>
            <Text style={styles.headerBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={handleUseFrame} disabled={isBusy}>
            {isBusy ? <ActivityIndicator color="#fff" /> : <Text style={styles.headerBtnText}>Use This Frame</Text>}
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <View style={[styles.videoWrapper, { paddingBottom: insets.bottom + 100 }]}>
        <VideoComponent
          ref={(r) => (videoRef.current = r)}
          source={{ uri: videoUri }}
          style={styles.video}
          resizeMode={ResizeMode.CONTAIN}
          useNativeControls
          onPlaybackStatusUpdate={onStatusUpdate}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'black',
    zIndex: 1000,
    justifyContent: 'flex-start',
    alignItems: 'stretch',
  },
  safeHeader: {
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  headerRow: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  headerBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  videoWrapper: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
});
