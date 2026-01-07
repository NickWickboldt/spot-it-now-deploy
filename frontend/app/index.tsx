import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, Text, TextInput, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { SlideInView } from '../components/AnimatedComponents';
import { Colors } from '../constants/Colors';
import { LoginScreenStyles } from '../constants/LoginStyles';
import { useAuth } from '../context/AuthContext';

// Google Logo Component using SVG
const GoogleLogo = ({ size = 20 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <Path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <Path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <Path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </Svg>
);

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Animations
  const floatAnim = useRef(new Animated.Value(0)).current;
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;
  const googleButtonScaleAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim1 = useRef(new Animated.Value(0)).current;
  const shakeAnim2 = useRef(new Animated.Value(0)).current;
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  useEffect(() => {
    // Floating logo animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -10,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Button press animations
  const handleButtonPressIn = (anim: Animated.Value) => {
    Animated.spring(anim, {
      toValue: 0.96,
      useNativeDriver: true,
      tension: 100,
      friction: 5,
    }).start();
  };

  const handleButtonPressOut = (anim: Animated.Value) => {
    Animated.spring(anim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 5,
    }).start();
  };

  // Shake animation for validation errors
  const shakeInput = (shakeAnim: Animated.Value) => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 5, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  // Handle login with validation
  const handleLogin = async () => {
    let hasError = false;
    
    if (!email.trim()) {
      setEmailError(true);
      shakeInput(shakeAnim1);
      hasError = true;
    } else {
      setEmailError(false);
    }
    
    if (!password.trim()) {
      setPasswordError(true);
      shakeInput(shakeAnim2);
      hasError = true;
    } else {
      setPasswordError(false);
    }
    
    if (hasError) return;
    
    setErrorMessage(''); // Clear previous errors
    try {
      await login({ username: email, password });
    } catch (error: any) {
      // Login failed - shake both inputs
      setEmailError(true);
      setPasswordError(true);
      setErrorMessage(error.message || 'Login failed. Please check your credentials.');
      shakeInput(shakeAnim1);
      shakeInput(shakeAnim2);
    }
  };

  const getInputBorderColor = (hasError: boolean, isFocused: boolean) => {
    if (hasError) return '#ef4444'; // Red for error
    if (isFocused) return Colors.light.primaryGreen;
    return Colors.light.secondaryGreen;
  };

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
      <SlideInView delay={100} from="bottom" distance={20} style={{ width: '100%', maxWidth: 400 }}>
        <Animated.View style={{ transform: [{ translateX: shakeAnim1 }] }}>
          <View style={[
            LoginScreenStyles.inputContainer,
            { borderColor: getInputBorderColor(emailError, emailFocused) }
          ]}>
            <Ionicons 
              name="mail-outline" 
              size={18} 
              color={emailError ? '#ef4444' : Colors.light.primaryGreen} 
              style={LoginScreenStyles.inputIcon}
            />
            <TextInput
              style={LoginScreenStyles.inputWithIcon}
              placeholder="Email or Username"
              placeholderTextColor={Colors.light.darkNeutral}
              value={email}
              onChangeText={(text) => { setEmail(text); setEmailError(false); }}
              keyboardType="email-address"
              autoCapitalize="none"
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
            />
          </View>
        </Animated.View>
      </SlideInView>

      {/* Password Input with Icon and Toggle */}
      <SlideInView delay={150} from="bottom" distance={20} style={{ width: '100%', maxWidth: 400 }}>
        <Animated.View style={{ transform: [{ translateX: shakeAnim2 }] }}>
          <View style={[
            LoginScreenStyles.inputContainer,
            { borderColor: getInputBorderColor(passwordError, passwordFocused) }
          ]}>
            <Ionicons 
              name="key-outline" 
              size={18} 
              color={passwordError ? '#ef4444' : Colors.light.primaryGreen} 
              style={LoginScreenStyles.inputIcon}
            />
            <TextInput
              style={LoginScreenStyles.inputWithIcon}
              placeholder="Password"
              placeholderTextColor={Colors.light.darkNeutral}
              value={password}
              onChangeText={(text) => { setPassword(text); setPasswordError(false); }}
              secureTextEntry={!showPassword}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
            />
            <Pressable 
              onPress={() => setShowPassword(!showPassword)}
              style={LoginScreenStyles.eyeIcon}
            >
              <Ionicons 
                name={showPassword ? "eye-off-outline" : "eye-outline"} 
                size={18} 
                color={passwordError ? '#ef4444' : Colors.light.primaryGreen}
              />
            </Pressable>
          </View>
        </Animated.View>
      </SlideInView>

      {/* Error Message */}
      {errorMessage ? (
        <SlideInView delay={100} from="top" distance={10} style={{ width: '100%', maxWidth: 400, marginBottom: 10 }}>
          <Text style={{ color: '#ef4444', textAlign: 'center', fontSize: 14, fontWeight: '500' }}>
            {errorMessage}
          </Text>
        </SlideInView>
      ) : null}

      {/* Login Button */}
      <SlideInView delay={200} from="bottom" distance={20} style={{ width: '100%', maxWidth: 400 }}>
        <Animated.View style={{ transform: [{ scale: buttonScaleAnim }] }}>
          <Pressable
            style={LoginScreenStyles.button}
            onPress={handleLogin}
            onPressIn={() => handleButtonPressIn(buttonScaleAnim)}
            onPressOut={() => handleButtonPressOut(buttonScaleAnim)}
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
              </View>
            )}
          </Pressable>
        </Animated.View>
      </SlideInView>

      {/* Divider */}
      <SlideInView delay={250} from="bottom" distance={20} style={{ width: '100%', maxWidth: 400 }}>
        <View style={LoginScreenStyles.dividerContainer}>
          <View style={LoginScreenStyles.dividerLine} />
          <Text style={LoginScreenStyles.dividerText}>or</Text>
          <View style={LoginScreenStyles.dividerLine} />
        </View>
      </SlideInView>

      {/* Google Sign In Button */}
      <SlideInView delay={300} from="bottom" distance={20} style={{ width: '100%', maxWidth: 400 }}>
        <Animated.View style={{ transform: [{ scale: googleButtonScaleAnim }] }}>
          <Pressable
            style={LoginScreenStyles.googleButton}
            onPressIn={() => handleButtonPressIn(googleButtonScaleAnim)}
            onPressOut={() => handleButtonPressOut(googleButtonScaleAnim)}
            onPress={() => {
              // Handle Google login
            }}
          >
            <View style={LoginScreenStyles.googleIcon}>
              <GoogleLogo size={20} />
            </View>
            <Text style={LoginScreenStyles.googleButtonText}>Continue with Google</Text>
          </Pressable>
        </Animated.View>
      </SlideInView>

      {/* Footer Links */}
      <SlideInView delay={350} from="bottom" distance={20} style={{ width: '100%', maxWidth: 400 }}>
        <View style={LoginScreenStyles.footerLinks}>
          <Pressable onPress={() => {/* Handle forgot password */}}>
            <Text style={LoginScreenStyles.linkText}>Forgot password?</Text>
          </Pressable>
          <Pressable onPress={() => router.navigate({ pathname: '/(user)/onboarding_register' } as any)}>
            <Text style={LoginScreenStyles.linkText}>Create account</Text>
          </Pressable>
        </View>
      </SlideInView>
    </View>
  );
}
