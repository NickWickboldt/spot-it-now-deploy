import React from 'react';
import { StyleSheet, Text, View, StatusBar } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

// This is the main component for the "Coming Soon" screen.
// It's a functional component that returns a styled view.
const ComingSoonScreen = () => {
  return (
    // The main container view. It's styled to take up the full screen
    // and center its content both horizontally and vertically.
    <View style={styles.container}>
      {/* This sets the status bar text color to light, which looks better
          on a dark background. */}
      <StatusBar barStyle="light-content" />

      {/* The rocket icon from FontAwesome. It adds a nice visual touch
          to indicate a launch is coming. */}
      <Icon name="rocket" size={80} color="#fff" style={styles.icon} />

      {/* The main heading text. */}
      <Text style={styles.title}>Coming Soon!</Text>

      {/* A descriptive subtitle that gives a bit more context to the user. */}
      <Text style={styles.subtitle}>
        We're working hard to bring you something amazing.
      </Text>
      <Text style={styles.subtitle}>
        Stay tuned!
      </Text>
    </View>
  );
};

// StyleSheet.create is used for performance optimization.
// It creates a stylesheet object to style the components.
const styles = StyleSheet.create({
  // Style for the main container
  container: {
    flex: 1, // Makes the container take up the full screen
    backgroundColor: '#1c1c1e', // A dark, modern background color
    alignItems: 'center', // Centers children horizontally
    justifyContent: 'center', // Centers children vertically
    paddingHorizontal: 20, // Adds some horizontal padding
  },
  // Style for the icon
  icon: {
    marginBottom: 30, // Adds space below the icon
  },
  // Style for the main title
  title: {
    fontSize: 36, // Large font size for the main title
    fontWeight: 'bold', // Makes the text bold
    color: '#fff', // White color for high contrast
    textAlign: 'center', // Ensures the text is centered
    marginBottom: 15, // Adds space below the title
  },
  // Style for the subtitle text
  subtitle: {
    fontSize: 18, // A smaller font size for the subtitle
    color: '#a1a1a6', // A slightly off-white color for a softer look
    textAlign: 'center', // Ensures the text is centered
    lineHeight: 26, // Improves readability with more line spacing
  },
});

// Export the component so it can be used in other parts of the app
export default ComingSoonScreen;
