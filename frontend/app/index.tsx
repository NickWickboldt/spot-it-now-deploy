// ==================================================================
// File: app/index.tsx (Login Screen)
// ==================================================================
import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('admin@local.dev'); // Pre-fill for local admin
  const [password, setPassword] = useState('password');   // Pre-fill for local admin

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SpotItNow</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <Pressable style={styles.button} onPress={() => login({ email, password })} disabled={isLoading}>
        {isLoading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Login</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  title: { fontSize: 48, fontWeight: 'bold', marginBottom: 40 },
  input: { width: '80%', height: 50, backgroundColor: 'white', borderRadius: 10, paddingHorizontal: 15, marginBottom: 15, borderWidth: 1, borderColor: '#ddd' },
  button: { backgroundColor: '#007AFF', paddingVertical: 15, borderRadius: 10, width: '80%', alignItems: 'center' },
  buttonText: { color: 'white', fontSize: 18, fontWeight: '600' },
});
