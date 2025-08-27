import { View, Text, Pressable, TextInput, ActivityIndicator, Image } from 'react-native';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Colors } from '../constants/Colors';
import { LoginScreenStyles } from '../constants/LoginStyles';

export default function LoginScreen() {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <View style={LoginScreenStyles.container}>
      <Image style={LoginScreenStyles.logo} source={require('../assets/images/logo.png')} />
      <TextInput
        style={LoginScreenStyles.input}
        placeholder="Email"
        placeholderTextColor={Colors.light.darkNeutral}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={LoginScreenStyles.input}
        placeholder="Password"
        placeholderTextColor={Colors.light.darkNeutral}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Pressable
        style={LoginScreenStyles.button}
        onPress={() => login({ 'username': email, password })}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color={Colors.light.buttonText} />
        ) : (
          <Text style={LoginScreenStyles.buttonText}>Login</Text>
        )}
      </Pressable>
    </View>
  );
}
