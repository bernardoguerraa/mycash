import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/lib/auth';
import { NotificacoesProvider } from '@/lib/notificacoes-contexto';
import { TemaProvider, useTema } from '@/lib/tema';

export const unstable_settings = {
  anchor: '(tabs)',
};

/**
 * Porteiro de navegacao: sem sessao, so a tela de login e alcancavel.
 * Com sessao, quem estiver fora da area logada e empurrado para o dashboard.
 */
function Gate() {
  const { session, carregando } = useAuth();
  const { cores, escuro } = useTema();
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
      <View style={{ flex: 1, backgroundColor: cores.surface0, justifyContent: 'center' }}>
        <ActivityIndicator color={cores.accent} size="large" />
      </View>
    );
  }

  return (
    <ThemeProvider value={escuro ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: cores.surface0 },
        }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      {/* A barra de status inverte junto com o tema. */}
      <StatusBar style={escuro ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <TemaProvider>
      <AuthProvider>
        <NotificacoesProvider>
          <Gate />
        </NotificacoesProvider>
      </AuthProvider>
    </TemaProvider>
  );
}
