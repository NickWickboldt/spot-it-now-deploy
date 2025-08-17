// ==================================================================
// File: app/_layout.tsx
// ==================================================================
import { Stack } from 'expo-router';
import { AuthProvider } from '../context/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(admin)/manage-users" options={{ presentation: 'modal', title: 'Manage Users' }} />
        <Stack.Screen name="(admin)/create-user" options={{ presentation: 'modal', title: 'Create New User' }} />
      </Stack>
    </AuthProvider>
  );
}
