import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  // Altura dinámica que se adapta al espacio seguro de Android/iOS para evitar solapes
  const tabBarHeight = 60 + (Platform.OS === 'android' ? Math.max(insets.bottom, 8) : insets.bottom);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E2E8F0',
          height: tabBarHeight,
          paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, 8) : insets.bottom + 4,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#174A62',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ focused, size }) => (
            <Feather
              name="grid"
              size={size}
              color={focused ? '#174A62' : '#94A3B8'}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Agenda',
          tabBarIcon: ({ focused, size }) => (
            <Feather
              name="calendar"
              size={size}
              color={focused ? '#174A62' : '#94A3B8'}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="progress-analytics"
        options={{
          title: 'Progreso',
          tabBarIcon: ({ focused, size }) => (
            <Feather
              name="trending-up"
              size={size}
              color={focused ? '#174A62' : '#94A3B8'}
            />
          ),
        }}
      />
    </Tabs>
  );
}