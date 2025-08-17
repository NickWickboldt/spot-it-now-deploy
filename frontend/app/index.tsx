import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Link, useRouter } from 'expo-router';

export default function LoginScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SpotItNow</Text>
      <Text style={styles.subtitle}>Login Screen</Text>
      
      {/* This button will navigate to the main app layout */}
      <Pressable style={styles.button} onPress={() => router.replace('/feed')}>
        <Text style={styles.buttonText}>Login</Text>
      </Pressable>

      {/* Alternatively, you can use the <Link> component.
        'replace' is used to prevent the user from going back to the login screen.
      */}
      {/* <Link href="/feed" asChild replace>
        <Pressable style={styles.button}>
          <Text style={styles.buttonText}>Login with Link</Text>
        </Pressable>
      </Link> */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 24,
    color: '#666',
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});