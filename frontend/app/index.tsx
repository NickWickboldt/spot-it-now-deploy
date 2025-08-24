import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Colors } from '../constants/Colors';

export default function LoginScreen() {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SpotItNow</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={Colors.light.darkNeutral}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor={Colors.light.darkNeutral}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Pressable
        style={styles.button}
        onPress={() => login({ 'username': email, password })}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color={Colors.light.buttonText} />
        ) : (
          <Text style={styles.buttonText}>Login</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.shadow,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 40,
    color: Colors.light.primaryGreen,
  },
  input: {
    width: '80%',
    height: 50,
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: Colors.light.secondaryGreen,
    color: Colors.light.darkNeutral,
    fontSize: 16,
  },
  button: {
    backgroundColor: Colors.light.primaryGreen,
    paddingVertical: 15,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
    shadowColor: Colors.light.shadow,
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  buttonText: {
    color: Colors.light.background,
    fontSize: 18,
    fontWeight: '600',
  },
});