import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import type { ChallengeDTO } from '../api/challenge';
import { Colors } from '../constants/Colors';

export const ChallengesList = ({ challenges }: { challenges: ChallengeDTO[] }) => {
  if (!challenges?.length) {
    return (
      <View style={styles.emptyBox}>
        <View style={styles.emptyIconCircle}>
          <Icon name="map-marker" size={32} color={Colors.light.primaryGreen} />
        </View>
        <Text style={styles.emptyTitle}>No Challenges Nearby</Text>
        <Text style={styles.emptyText}>
          There are no active challenges in your area today.{'\n'}Check back tomorrow or explore a new location!
        </Text>
      </View>
    );
  }

  const renderTaskRow = (label: string, completed: number, required: number, key: string) => {
    const safeRequired = Math.max(1, required || 1);
    const safeCompleted = Math.max(0, Math.min(completed || 0, safeRequired));
    const ratio = safeCompleted / safeRequired;
    const widthPct = `${Math.round(ratio * 100)}%`;
    const isComplete = safeCompleted >= safeRequired;
    
    return (
      <View key={key} style={styles.taskRow}>
        <View style={styles.taskHeader}>
          <View style={styles.taskLabelRow}>
            <Icon 
              name={isComplete ? "check-circle" : "circle-o"} 
              size={16} 
              color={isComplete ? Colors.light.primaryGreen : '#999'} 
            />
            <Text style={[styles.taskLabel, isComplete && styles.taskLabelComplete]}>{label}</Text>
          </View>
          <Text style={[styles.taskCount, isComplete && styles.taskCountComplete]}>
            {safeCompleted}/{safeRequired}
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[
            styles.progressFill, 
            { width: widthPct as any },
            isComplete && styles.progressFillComplete
          ]} />
        </View>
      </View>
    );
  };

  return (
    <FlatList
      data={challenges}
      keyExtractor={(c) => c._id}
      contentContainerStyle={styles.listContainer}
      showsVerticalScrollIndicator={false}
      renderItem={({ item, index }) => {
        // Calculate completion based on tasks if not provided
        const isCompleted = item.completed ?? (
          Array.isArray(item.tasks) && item.tasks.length > 0 &&
          item.tasks.every(t => (t.completed ?? 0) >= t.required)
        );
        
        return (
          <View style={[styles.card, isCompleted && styles.cardCompleted]}>
            {/* Card Header */}
            <View style={styles.cardHeader}>
              <View style={styles.titleRow}>
                <View style={[styles.challengeIcon, isCompleted && styles.challengeIconCompleted]}>
                  <Icon 
                    name={isCompleted ? "trophy" : "flag"} 
                    size={18} 
                    color={isCompleted ? "#FFD700" : "#fff"} 
                  />
                </View>
                <View style={styles.titleContent}>
                  <Text style={styles.title}>{item.title}</Text>
                  {isCompleted && (
                    <View style={styles.completedBadge}>
                      <Icon name="check" size={10} color="#fff" />
                      <Text style={styles.completedText}>Completed</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* Description */}
            {item.description ? (
              <Text style={styles.desc}>{item.description}</Text>
            ) : null}

            {/* Location Info */}
            <View style={styles.locationRow}>
              <Icon name="map-marker" size={14} color={Colors.light.darkNeutral} />
              <Text style={styles.meta}>
                Within {(item.radiusMeters / 1000).toFixed(1)} km • {(item.distanceMeters / 1000).toFixed(2)} km away
              </Text>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Tasks */}
            {Array.isArray(item.tasks) && item.tasks.length > 0 ? (
              <View style={styles.tasksContainer}>
                <Text style={styles.tasksTitle}>Wildlife to Spot:</Text>
                {item.tasks.map((t) => renderTaskRow(t.animal.commonName, t.completed ?? 0, t.required, t.animal._id))}
              </View>
            ) : item.animals?.length ? (
              <View style={styles.tasksContainer}>
                <Text style={styles.tasksTitle}>Wildlife to Spot:</Text>
                {item.animals.map((a) => renderTaskRow(a.commonName, 0, 1, a._id))}
              </View>
            ) : null}
          </View>
        );
      }}
    />
  );
};

const styles = StyleSheet.create({
  listContainer: {
    padding: 16,
    paddingTop: 20,
    paddingBottom: 120,
  },
  emptyBox: { 
    flex: 1,
    padding: 40, 
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(64, 116, 61, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.mainText,
    marginBottom: 12,
  },
  emptyText: { 
    color: Colors.light.darkNeutral,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  cardCompleted: {
    borderColor: 'rgba(64, 116, 61, 0.2)',
    backgroundColor: 'rgba(64, 116, 61, 0.02)',
  },
  cardHeader: {
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  challengeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.light.primaryGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  challengeIconCompleted: {
    backgroundColor: 'rgba(64, 116, 61, 0.15)',
  },
  titleContent: {
    flex: 1,
  },
  title: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: Colors.light.mainText,
    marginBottom: 4,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.primaryGreen,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 4,
  },
  completedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  desc: { 
    marginTop: 4,
    marginBottom: 8,
    color: '#555',
    fontSize: 14,
    lineHeight: 20,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  meta: { 
    color: Colors.light.darkNeutral, 
    fontSize: 13,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginBottom: 14,
  },
  tasksContainer: {
    gap: 6,
  },
  tasksTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.darkNeutral,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  taskRow: {
    marginBottom: 10,
  },
  taskHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  taskLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  taskLabel: { 
    color: Colors.light.mainText,
    fontSize: 15,
    fontWeight: '500',
  },
  taskLabelComplete: {
    color: Colors.light.primaryGreen,
  },
  taskCount: { 
    color: Colors.light.darkNeutral, 
    fontSize: 13,
    fontWeight: '600',
  },
  taskCountComplete: {
    color: Colors.light.primaryGreen,
  },
  progressTrack: { 
    height: 8, 
    borderRadius: 4, 
    backgroundColor: '#f0f0f0', 
    overflow: 'hidden',
  },
  progressFill: { 
    height: '100%', 
    backgroundColor: Colors.light.primaryGreen,
    borderRadius: 4,
  },
  progressFillComplete: {
    backgroundColor: Colors.light.primaryGreen,
  },
});
