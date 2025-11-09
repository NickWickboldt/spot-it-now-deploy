import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, Keyboard, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { LoginScreenStyles } from '../../constants/LoginStyles';
import { useAuth } from '../../context/AuthContext';

export default function OnboardingProfileScreen() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [bio, setBio] = useState(user?.bio || '');
  const [profilePictureUrl, setProfilePictureUrl] = useState(user?.profilePictureUrl || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setProfilePictureUrl(asset.uri);
    }
  };

  const handleNext = () => {
    setError('');
    
    // Dismiss keyboard
    Keyboard.dismiss();
    
    console.log('Profile setup complete, navigating to animal selection');
    
    // Navigate to animal preferences screen with onboarding data
    setTimeout(() => {
      router.navigate({
        pathname: '/(user)/onboarding_animals',
        params: {
          bio: bio,
          profilePictureUrl: profilePictureUrl,
        },
      } as any);
    }, 200);
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: Colors.light.background }}
    >
      <View style={[LoginScreenStyles.container, { paddingBottom: 40, flex: 1 }]}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 10, color: Colors.light.darkNeutral }}>
          Complete Your Profile
        </Text>
        <Text style={{ fontSize: 14, color: Colors.light.darkNeutral, marginBottom: 30, textAlign: 'center' }}>
          Let other users get to know you better
        </Text>

        {error ? (
          <View style={{ marginBottom: 15, padding: 10, backgroundColor: '#ffebee', borderRadius: 8, width: '100%', maxWidth: 400 }}>
            <Text style={{ color: '#c62828', fontSize: 14 }}>{error}</Text>
          </View>
        ) : null}

        {/* Profile Picture Section */}
        <View style={{ width: '100%', maxWidth: 400, marginBottom: 30, alignItems: 'center' }}>
          <Pressable onPress={pickImage} style={{ marginBottom: 12 }}>
            {profilePictureUrl ? (
              <Image
                source={{ uri: profilePictureUrl }}
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  borderWidth: 3,
                  borderColor: Colors.light.primaryGreen,
                }}
              />
            ) : (
              <View
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  backgroundColor: Colors.light.cardBackground,
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 2,
                  borderColor: Colors.light.secondaryGreen,
                }}
              >
                <Ionicons name="camera-outline" size={40} color={Colors.light.primaryGreen} />
              </View>
            )}
          </Pressable>
          <Pressable onPress={pickImage}>
            <Text style={{ color: Colors.light.primaryGreen, fontSize: 14, fontWeight: '600' }}>
              {profilePictureUrl ? 'Change Photo' : 'Add Photo'}
            </Text>
          </Pressable>
        </View>

        {/* Bio Input */}
        <View style={{ width: '100%', maxWidth: 400, marginBottom: 30 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.light.darkNeutral, marginBottom: 8 }}>
            Bio (Optional)
          </Text>
          <TextInput
            style={{
              width: '100%',
              minHeight: 100,
              backgroundColor: Colors.light.cardBackground,
              borderRadius: 10,
              paddingHorizontal: 15,
              paddingVertical: 12,
              borderWidth: 2,
              borderColor: Colors.light.secondaryGreen,
              color: Colors.light.darkNeutral,
              fontSize: 16,
              textAlignVertical: 'top',
            }}
            placeholder="Tell us about yourself..."
            placeholderTextColor={Colors.light.darkNeutral}
            value={bio}
            onChangeText={setBio}
            multiline
            editable={!isLoading}
            blurOnSubmit={true}
          />
          <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
            {bio.length}/500
          </Text>
        </View>

        {/* Next Button */}
        <Pressable
          style={LoginScreenStyles.button}
          onPress={handleNext}
          disabled={isLoading}
        >
          {isLoading ? (
            <View style={LoginScreenStyles.buttonContent}>
              <ActivityIndicator color={Colors.light.buttonText} size="small" />
              <Text style={LoginScreenStyles.buttonTextLoading}>Next...</Text>
            </View>
          ) : (
            <View style={LoginScreenStyles.buttonContent}>
              <Text style={LoginScreenStyles.buttonText}>Next: Choose Animals</Text>
              <Ionicons name="arrow-forward" size={18} color={Colors.light.buttonText} />
            </View>
          )}
        </Pressable>

        {/* Skip Button */}
        <Pressable onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={[LoginScreenStyles.linkText, { textAlign: 'center' }]}>Back</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
