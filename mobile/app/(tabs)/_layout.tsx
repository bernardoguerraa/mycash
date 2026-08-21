import { Tabs } from 'expo-router';
import { Text } from 'react-native';

import { MyCash } from '@/constants/mycash';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: MyCash.accent,
        tabBarInactiveTintColor: MyCash.textMute,
        tabBarStyle: {
          backgroundColor: MyCash.surface1,
          borderTopColor: MyCash.edge1,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>◈</Text>,
        }}
      />
    </Tabs>
  );
}
