import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { ChallengeDTO } from '../api/challenge';
import { Colors } from '../constants/Colors';

export const ChallengesList = ({ challenges }: { challenges: ChallengeDTO[] }) => {
  if (!challenges?.length) {
    return (
      <View style={styles.emptyBox}>
        <Text style={styles.emptyText}>No active challenges nearby today.</Text>
      </View>
    );
  }

  const renderTaskRow = (label: string, completed: number, required: number, key: string) => {
    const safeRequired = Math.max(1, required || 1);
    const safeCompleted = Math.max(0, Math.min(completed || 0, safeRequired));
    const ratio = safeCompleted / safeRequired;
    const widthPct = `${Math.round(ratio * 100)}%`;
    return (
      <View key={key} style={{ marginTop: 8 }}>
        <View style={styles.rowBetween}>
          <Text style={styles.taskLabel}>{label}</Text>
          <Text style={styles.taskCount}>{safeCompleted}/{safeRequired}</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: widthPct as any }]} />
        </View>
      </View>
    );
  };

  return (
    <FlatList
      data={challenges}
      keyExtractor={(c) => c._id}
      contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.title}>{item.title}</Text>
          {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}
          <Text style={styles.meta}>Within {(item.radiusMeters / 1000).toFixed(1)} km • {(item.distanceMeters / 1000).toFixed(2)} km away</Text>

          {/* Tasks with progress bars */}
          {Array.isArray(item.tasks) && item.tasks.length > 0 ? (
            <View style={{ marginTop: 10 }}>
              {item.tasks.map((t) => renderTaskRow(t.animal.commonName, t.completed ?? 0, t.required, t.animal._id))}
            </View>
          ) : item.animals?.length ? (
            <View style={{ marginTop: 10 }}>
              {item.animals.map((a) => renderTaskRow(a.commonName, 0 /* completed placeholder */, 1, a._id))}
            </View>
          ) : null}
        </View>
      )}
    />
  );
};

const styles = StyleSheet.create({
  emptyBox: { padding: 24, alignItems: 'center' },
  emptyText: { color: Colors.light.darkNeutral },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  title: { fontSize: 18, fontWeight: '600', color: Colors.light.primaryGreen },
  desc: { marginTop: 6, color: '#333' },
  meta: { marginTop: 8, color: Colors.light.darkNeutral, fontSize: 12 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  taskLabel: { color: Colors.light.mainText },
  taskCount: { color: Colors.light.darkNeutral, fontSize: 12 },
  progressTrack: { height: 8, borderRadius: 6, backgroundColor: '#eee', marginTop: 6, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.light.primaryGreen },
});
