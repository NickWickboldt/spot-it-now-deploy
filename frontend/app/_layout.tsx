// File: app/_layout.tsx
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      {/* The login screen is presented here initially */}
      <Stack.Screen name="index" options={{ headerShown: false }} />

      {/* The main tab layout is also part of the stack */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}