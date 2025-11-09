import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { LoginScreenStyles } from '../../constants/LoginStyles';
import { useAuth } from '../../context/AuthContext';

export default function OnboardingRegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    setError('');

    // Validation
    if (!username.trim() || !email.trim() || !password || !confirmPassword) {
      setError('All fields are required');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    try {
      // Register the user using the register function from auth context
      await register({ username, email, password });

      console.log('Registration successful, navigating to profile setup');
      
      // Add a small delay to ensure context is updated with user/token
      setTimeout(() => {
        router.navigate({
          pathname: '/(user)/onboarding_profile',
        } as any);
      }, 200);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={LoginScreenStyles.container}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 10, color: Colors.light.darkNeutral }}>
        Create Account
      </Text>

      {error ? (
        <View style={{ marginBottom: 15, padding: 10, backgroundColor: '#ffebee', borderRadius: 8 }}>
          <Text style={{ color: '#c62828', fontSize: 14 }}>{error}</Text>
        </View>
      ) : null}

      {/* Username Input */}
      <View style={LoginScreenStyles.inputContainer}>
        <Ionicons
          name="person-outline"
          size={18}
          color={Colors.light.primaryGreen}
          style={LoginScreenStyles.inputIcon}
        />
        <TextInput
          style={LoginScreenStyles.inputWithIcon}
          placeholder="Username"
          placeholderTextColor={Colors.light.darkNeutral}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          editable={!isLoading}
        />
      </View>

      {/* Email Input */}
      <View style={LoginScreenStyles.inputContainer}>
        <Ionicons
          name="mail-outline"
          size={18}
          color={Colors.light.primaryGreen}
          style={LoginScreenStyles.inputIcon}
        />
        <TextInput
          style={LoginScreenStyles.inputWithIcon}
          placeholder="Email"
          placeholderTextColor={Colors.light.darkNeutral}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!isLoading}
        />
      </View>

      {/* Password Input */}
      <View style={LoginScreenStyles.inputContainer}>
        <Ionicons
          name="key-outline"
          size={18}
          color={Colors.light.primaryGreen}
          style={LoginScreenStyles.inputIcon}
        />
        <TextInput
          style={LoginScreenStyles.inputWithIcon}
          placeholder="Password"
          placeholderTextColor={Colors.light.darkNeutral}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          editable={!isLoading}
        />
        <Pressable
          onPress={() => setShowPassword(!showPassword)}
          style={LoginScreenStyles.eyeIcon}
        >
          <Ionicons
            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
            size={18}
            color={Colors.light.primaryGreen}
          />
        </Pressable>
      </View>

      {/* Confirm Password Input */}
      <View style={LoginScreenStyles.inputContainer}>
        <Ionicons
          name="key-outline"
          size={18}
          color={Colors.light.primaryGreen}
          style={LoginScreenStyles.inputIcon}
        />
        <TextInput
          style={LoginScreenStyles.inputWithIcon}
          placeholder="Confirm Password"
          placeholderTextColor={Colors.light.darkNeutral}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showConfirmPassword}
          editable={!isLoading}
        />
        <Pressable
          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          style={LoginScreenStyles.eyeIcon}
        >
          <Ionicons
            name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
            size={18}
            color={Colors.light.primaryGreen}
          />
        </Pressable>
      </View>

      {/* Register Button */}
      <Pressable
        style={[LoginScreenStyles.button, { marginTop: 20 }]}
        onPress={handleRegister}
        disabled={isLoading}
      >
        {isLoading ? (
          <View style={LoginScreenStyles.buttonContent}>
            <ActivityIndicator color={Colors.light.buttonText} size="small" />
            <Text style={LoginScreenStyles.buttonTextLoading}>Creating account...</Text>
          </View>
        ) : (
          <View style={LoginScreenStyles.buttonContent}>
            <Text style={LoginScreenStyles.buttonText}>Create Account</Text>
            <Ionicons name="arrow-forward" size={18} color={Colors.light.buttonText} />
          </View>
        )}
      </Pressable>

      {/* Back to Login */}
      <Pressable onPress={() => router.back()} style={{ marginTop: 20 }}>
        <Text style={[LoginScreenStyles.linkText, { textAlign: 'center' }]}>Back to Login</Text>
      </Pressable>
    </View>
  );
}
