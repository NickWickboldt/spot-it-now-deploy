import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Image, Pressable, Text, TextInput, View } from 'react-native';
import { Colors } from '../constants/Colors';
import { LoginScreenStyles } from '../constants/LoginStyles';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -10,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <View style={LoginScreenStyles.container}>
      <Animated.Image 
        style={[
          LoginScreenStyles.logo,
          { transform: [{ translateY: floatAnim }] }
        ]} 
        source={require('../assets/images/logo.png')} 
      />
      
      {/* Email Input with Icon */}
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
        />
      </View>

      {/* Password Input with Icon and Toggle */}
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
        />
        <Pressable 
          onPress={() => setShowPassword(!showPassword)}
          style={LoginScreenStyles.eyeIcon}
        >
          <Ionicons 
            name={showPassword ? "eye-off-outline" : "eye-outline"} 
            size={18} 
            color={Colors.light.primaryGreen}
          />
        </Pressable>
      </View>

      {/* Login Button */}
      <Pressable
        style={LoginScreenStyles.button}
        onPress={() => login({ 'username': email, password })}
        disabled={isLoading}
      >
        {isLoading ? (
          <View style={LoginScreenStyles.buttonContent}>
            <ActivityIndicator color={Colors.light.buttonText} size="small" />
            <Text style={LoginScreenStyles.buttonTextLoading}>Logging in...</Text>
          </View>
        ) : (
          <View style={LoginScreenStyles.buttonContent}>
            <Text style={LoginScreenStyles.buttonText}>Login</Text>
            <Ionicons name="arrow-forward" size={18} color={Colors.light.buttonText} />
          </View>
        )}
      </Pressable>

      {/* Divider */}
      <View style={LoginScreenStyles.dividerContainer}>
        <View style={LoginScreenStyles.dividerLine} />
        <Text style={LoginScreenStyles.dividerText}>or</Text>
        <View style={LoginScreenStyles.dividerLine} />
      </View>

      {/* Google Sign In Button */}
      <Pressable
        style={LoginScreenStyles.googleButton}
        onPress={() => {
          // Handle Google login
        }}
      >
        <Image 
          source={{ uri: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBmaWxsPSIjNDI4NUY0IiBkPSJNMjIuNTYgMTIuMjVjMC0uNzgtLjA3LTEuNTMtLjItMi4yNUgxMnY0LjI2aDUuOTJjLS4yNiAxLjM3LTEuMDQgMi41My0yLjIxIDMuMzF2Mi43N2gzLjU3YzIuMDgtMS45MiAzLjI4LTQuNzQgMy4yOC04LjA5eiIvPjxwYXRoIGZpbGw9IiMzNEE4NTMiIGQ9Ik0xMiAyM2MyLjk3IDAgNS40Ni0uOTggNy4yOC0yLjY2bC0zLjU3LTIuNzdjLS45OC42Ni0yLjIzIDEuMDYtMy43MSAxLjA2LTIuODYgMC01LjI5LTEuOTMtNi4xNi00LjUzSDIuMTh2Mi44NEMzLjk5IDIwLjUzIDcuNyAyMyAxMiAyM3oiLz48cGF0aCBmaWxsPSIjRkJCQzA1IiBkPSJNNS44NCAxNC4wOWMtLjIyLS42Ni0uMzUtMS4zNi0uMzUtMi4wOXMuMTMtMS40My4zNS0yLjA5VjcuMDdIMi4xOEMxLjQzIDguNTUgMSAxMC4yMiAxIDEyczLjQzIDMuNDUgMS4xOCA0LjkzbDIuODUtMi4yMi44MS0uNjJ6Ii8+PHBhdGggZmlsbD0iI0VBNDMzNSIgZD0iTTEyIDUuMzhjMS42MiAwIDMuMDYuNTYgNC4yMSAxLjY0bDMuMTUtMy4xNUMxNy40NSAyLjA5IDE0Ljk3IDEgMTIgMSA3LjcgMSAzLjk5IDMuNDcgMi4xOCA3LjA3bDMuNjYgMi44NGMuODctMi42IDMuMy00LjUzIDYuMTYtNC41M3oiLz48L3N2Zz4=' }}
          style={LoginScreenStyles.googleIcon}
        />
        <Text style={LoginScreenStyles.googleButtonText}>Continue with Google</Text>
      </Pressable>

      {/* Footer Links */}
      <View style={LoginScreenStyles.footerLinks}>
        <Pressable onPress={() => {/* Handle forgot password */}}>
          <Text style={LoginScreenStyles.linkText}>Forgot password?</Text>
        </Pressable>
        <Pressable onPress={() => router.navigate({ pathname: '/(user)/onboarding_register' } as any)}>
          <Text style={LoginScreenStyles.linkText}>Create account</Text>
        </Pressable>
      </View>
    </View>
  );
}
