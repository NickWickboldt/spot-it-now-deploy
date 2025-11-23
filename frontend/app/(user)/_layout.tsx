import { Stack } from 'expo-router';

export default function UserLayout() {
  return (
    <Stack>
      <Stack.Screen name="onboarding_register" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding_profile" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding_animals" options={{ headerShown: false }} />
      <Stack.Screen name="edit_profile" options={{ headerShown: false }} />
      <Stack.Screen name="user_profile" options={{ headerShown: false }} />
      <Stack.Screen name="user_sighting" options={{ headerShown: false }} />
      <Stack.Screen name="challenges" options={{ headerShown: false }} />
      <Stack.Screen name="notifications" options={{ headerShown: false }} />
    </Stack>
  );
}
