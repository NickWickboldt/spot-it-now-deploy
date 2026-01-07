import { Stack } from 'expo-router';

export default function UserLayout() {
  return (
    <Stack
      screenOptions={{
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen name="onboarding_register" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding_profile" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding_animals" options={{ headerShown: false }} />
      <Stack.Screen name="edit_profile" options={{ headerShown: false }} />
      <Stack.Screen name="user_profile" options={{ headerShown: false, title: 'User Profile' }} />
      <Stack.Screen name="user_sighting" options={{ headerShown: false }} />
      <Stack.Screen name="challenges" options={{ headerShown: false }} />
      <Stack.Screen name="notifications" options={{ headerShown: false }} />
      <Stack.Screen name="animal_detail" options={{ headerShown: false }} />
      <Stack.Screen name="search" options={{ headerShown: false, animation: 'fade' }} />
      <Stack.Screen name="conversation" options={{ headerShown: false, title: 'Conversation' }} />
    </Stack>
  );
}
