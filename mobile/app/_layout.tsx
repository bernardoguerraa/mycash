import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';

import { MyCash } from '@/constants/mycash';
import { AuthProvider, useAuth } from '@/lib/auth';

export const unstable_settings = {
  anchor: '(tabs)',
};

/**
 * Porteiro de navegacao: sem sessao, so a tela de login e alcancavel.
 * Com sessao, quem estiver fora da area logada e empurrado para o dashboard.
 */
function Gate() {
  const { session, carregando } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (carregando) return;

    const emAreaLogada = segments[0] === '(tabs)';

    if (!session && emAreaLogada) {
      router.replace('/login');
    } else if (session && !emAreaLogada) {
      router.replace('/(tabs)');
    }
  }, [session, carregando, segments, router]);

  if (carregando) {
    return (
      <View style={{ flex: 1, backgroundColor: MyCash.surface0, justifyContent: 'center' }}>
        <ActivityIndicator color={MyCash.accent} size="large" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: MyCash.surface0 },
      }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider value={DarkTheme}>
      <AuthProvider>
        <Gate />
        <StatusBar style="light" />
      </AuthProvider>
    </ThemeProvider>
  );
}
