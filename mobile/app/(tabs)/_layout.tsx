import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';

import { useTema } from '@/lib/tema';

type IconeNome = ComponentProps<typeof Ionicons>['name'];

/**
 * O menu do web tem sete itens (Sidebar.tsx). Sete abas nao cabem numa barra
 * inferior, entao as quatro telas do dia a dia ficam visiveis e Lembretes,
 * Notificacoes e Perfil vivem atras da aba "Mais" — continuam sendo rotas
 * normais (`href: null` so as tira da barra), com a barra visivel por cima.
 */
function icone(nome: IconeNome, nomeAtivo: IconeNome) {
  const Icone = ({ color, focused }: { color: string; focused: boolean }) => (
    <Ionicons name={focused ? nomeAtivo : nome} size={22} color={color} />
  );
  Icone.displayName = `IconeAba(${nome})`;
  return Icone;
}

export default function TabLayout() {
  const { cores } = useTema();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: cores.accent,
        tabBarInactiveTintColor: cores.textMute,
        tabBarStyle: {
          backgroundColor: cores.surface1,
          borderTopColor: cores.edge1,
        },
        tabBarLabelStyle: { fontSize: 10.5, fontWeight: '600' },
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Início', tabBarIcon: icone('home-outline', 'home') }}
      />
      <Tabs.Screen
        name="transacoes"
        options={{
          title: 'Transações',
          tabBarIcon: icone('swap-horizontal-outline', 'swap-horizontal'),
        }}
      />
      <Tabs.Screen
        name="contas"
        options={{ title: 'Contas', tabBarIcon: icone('wallet-outline', 'wallet') }}
      />
      <Tabs.Screen
        name="metas"
        options={{ title: 'Metas', tabBarIcon: icone('flag-outline', 'flag') }}
      />
      <Tabs.Screen
        name="mais"
        options={{ title: 'Mais', tabBarIcon: icone('grid-outline', 'grid') }}
      />

      {/* Alcancaveis pela aba Mais, fora da barra. */}
      <Tabs.Screen name="lembretes" options={{ href: null }} />
      <Tabs.Screen name="notificacoes" options={{ href: null }} />
      <Tabs.Screen name="perfil" options={{ href: null }} />
    </Tabs>
  );
}
