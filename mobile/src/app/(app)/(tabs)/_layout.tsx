import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E2E8F0',
          height: 60,
          paddingBottom: 8,
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