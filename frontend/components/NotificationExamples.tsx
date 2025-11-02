import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/Colors';
import { useNotification } from '../hooks/useNotification';

/**
 * NOTIFICATION SYSTEM EXAMPLE COMPONENT
 * 
 * This component demonstrates all the different ways to use the notification system.
 * You can copy and modify these patterns for your own use cases.
 */

export const NotificationExamples: React.FC = () => {
  const notification = useNotification();

  const examples = [
    {
      label: 'Success',
      onPress: () => notification.success('Sighting Posted!'),
    },
    {
      label: 'Success with Message',
      onPress: () =>
        notification.success(
          'Sighting Posted!',
          'Your discovery has been shared with the community'
        ),
    },
    {
      label: 'Error',
      onPress: () => notification.error('Upload Failed'),
    },
    {
      label: 'Error with Message',
      onPress: () =>
        notification.error(
          'Upload Failed',
          'Please check your internet connection and try again'
        ),
    },
    {
      label: 'Warning',
      onPress: () => notification.warning('Slow Connection'),
    },
    {
      label: 'Warning with Message',
      onPress: () =>
        notification.warning(
          'Weak Signal',
          'Upload may take longer than expected'
        ),
    },
    {
      label: 'Info',
      onPress: () => notification.info('New Feature Available'),
    },
    {
      label: 'Info with Message',
      onPress: () =>
        notification.info(
          'Tips & Tricks',
          'Swipe left on sightings to save them to a collection'
        ),
    },
    {
      label: 'Persistent (6 seconds)',
      onPress: () =>
        notification.info(
          'Important Notice',
          'This notification will stay for 6 seconds',
          6000
        ),
    },
    {
      label: 'Persistent Forever',
      onPress: () =>
        notification.info(
          'Click X to Close',
          'This notification will not auto-dismiss',
          0
        ),
    },
    {
      label: 'Clear All Notifications',
      onPress: () => notification.clearAll(),
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Notification System Examples</Text>
      <Text style={styles.subtitle}>
        Tap any button to see different notification styles
      </Text>

      <View style={styles.buttonsContainer}>
        {examples.map((example, index) => (
          <TouchableOpacity
            key={index}
            style={styles.button}
            onPress={example.onPress}
          >
            <Text style={styles.buttonText}>{example.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.info}>
        <Text style={styles.infoTitle}>How to Use:</Text>
        <Text style={styles.infoText}>
          1. Import the hook: {'\n'}
          <Text style={styles.code}>
            import {`{`} useNotification {`}`} from '../hooks/useNotification'
          </Text>
        </Text>
        <Text style={styles.infoText}>
          2. Use in your component: {'\n'}
          <Text style={styles.code}>
            const notification = useNotification()
          </Text>
        </Text>
        <Text style={styles.infoText}>
          3. Show notifications: {'\n'}
          <Text style={styles.code}>
            notification.success('Title', 'Message')
          </Text>
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.light.darkNeutral,
    marginBottom: 8,
    marginTop: 20,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  buttonsContainer: {
    gap: 10,
    marginBottom: 32,
  },
  button: {
    backgroundColor: Colors.light.primaryGreen,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  info: {
    backgroundColor: '#f0f0f0',
    padding: 16,
    borderRadius: 12,
    marginBottom: 32,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.darkNeutral,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 10,
    lineHeight: 20,
  },
  code: {
    fontSize: 12,
    fontFamily: 'monospace',
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
});
