import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { LevelProgress, getLevelColor, getUserLevelInfo } from '../api/experience';
import { Colors } from '../constants/Colors';

interface LevelBadgeProps {
  userId?: string;
  levelInfo?: LevelProgress;
  size?: 'small' | 'medium' | 'large';
  showProgress?: boolean;
  showTitle?: boolean;
  onPress?: () => void;
}

export const LevelBadge: React.FC<LevelBadgeProps> = ({
  userId,
  levelInfo: providedLevelInfo,
  size = 'medium',
  showProgress = false,
  showTitle = true,
  onPress,
}) => {
  const [levelInfo, setLevelInfo] = useState<LevelProgress | null>(providedLevelInfo || null);
  const [loading, setLoading] = useState(!providedLevelInfo && !!userId);

  useEffect(() => {
    if (providedLevelInfo) {
      setLevelInfo(providedLevelInfo);
      setLoading(false);
      return;
    }

    if (userId) {
      loadLevelInfo();
    }
  }, [userId, providedLevelInfo]);

  const loadLevelInfo = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      const info = await getUserLevelInfo(userId);
      setLevelInfo(info);
    } catch (error) {
      console.error('Failed to load level info:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles[`container_${size}`]]}>
        <ActivityIndicator size="small" color={Colors.light.primaryGreen} />
      </View>
    );
  }

  if (!levelInfo) {
    return null;
  }

  const levelColor = getLevelColor(levelInfo.level);
  const sizeStyles = getSizeStyles(size);

  const content = (
    <View style={[styles.container, styles[`container_${size}`]]}>
      <View style={[styles.levelCircle, { borderColor: levelColor }, sizeStyles.circle]}>
        <Text style={[styles.levelNumber, { color: levelColor }, sizeStyles.levelText]}>
          {levelInfo.level}
        </Text>
      </View>
      
      {showTitle && (
        <View style={styles.infoContainer}>
          <Text style={[styles.title, sizeStyles.title]} numberOfLines={1}>
            {levelInfo.title}
          </Text>
          
          {showProgress && (
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, sizeStyles.progressBar]}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${levelInfo.progressPercentage}%`, backgroundColor: levelColor },
                  ]}
                />
              </View>
              <Text style={[styles.xpText, sizeStyles.xpText]}>
                {levelInfo.currentXP} XP
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

// Compact version for list items
export const LevelBadgeCompact: React.FC<{ level: number; size?: number }> = ({
  level,
  size = 24,
}) => {
  const levelColor = getLevelColor(level);

  return (
    <View
      style={[
        styles.compactBadge,
        { width: size, height: size, borderColor: levelColor },
      ]}
    >
      <Text style={[styles.compactLevel, { color: levelColor, fontSize: size * 0.5 }]}>
        {level}
      </Text>
    </View>
  );
};

const getSizeStyles = (size: 'small' | 'medium' | 'large') => {
  const sizes = {
    small: {
      circle: { width: 28, height: 28 },
      levelText: { fontSize: 12 },
      title: { fontSize: 11 },
      progressBar: { height: 3 },
      xpText: { fontSize: 9 },
    },
    medium: {
      circle: { width: 40, height: 40 },
      levelText: { fontSize: 16 },
      title: { fontSize: 13 },
      progressBar: { height: 4 },
      xpText: { fontSize: 10 },
    },
    large: {
      circle: { width: 56, height: 56 },
      levelText: { fontSize: 22 },
      title: { fontSize: 15 },
      progressBar: { height: 6 },
      xpText: { fontSize: 12 },
    },
  };
  return sizes[size];
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  container_small: {
    gap: 6,
  },
  container_medium: {
    gap: 10,
  },
  container_large: {
    gap: 14,
  },
  levelCircle: {
    borderRadius: 100,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  levelNumber: {
    fontWeight: 'bold',
  },
  infoContainer: {
    flex: 1,
  },
  title: {
    fontWeight: '600',
    color: '#333',
  },
  progressContainer: {
    marginTop: 4,
  },
  progressBar: {
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 10,
  },
  xpText: {
    color: '#666',
    marginTop: 2,
  },
  compactBadge: {
    borderRadius: 100,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  compactLevel: {
    fontWeight: 'bold',
  },
});

export default LevelBadge;
