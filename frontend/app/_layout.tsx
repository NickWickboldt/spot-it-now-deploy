// ==================================================================
// File: app/_layout.tsx
// ==================================================================
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NotificationDisplay } from '../components/NotificationDisplay';
import { AuthProvider } from '../context/AuthContext';
import { NotificationProvider } from '../context/NotificationContext';


export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <NotificationProvider>
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="(user)/edit_profile" options={{ headerShown: false }} />
            <Stack.Screen name="(user)/user_profile" options={{ headerShown: false }} />
            <Stack.Screen name="(user)/user_sighting" options={{ headerShown: false }} />
            <Stack.Screen name="(admin)/manage-users" options={{ presentation: 'modal', title: 'Manage Users' }} />
            <Stack.Screen name="(admin)/manage-sightings" options={{ presentation: 'modal', title: 'Manage Sightings' }} />
            <Stack.Screen name="(admin)/create-user" options={{ presentation: 'modal', title: 'Create New User' }} />
          </Stack>
          <NotificationDisplay />
        </NotificationProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
