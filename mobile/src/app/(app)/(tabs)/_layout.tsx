import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false, // Ocultamos el header nativo para usar tus diseños personalizados
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E2E8F0',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#174A62', // Color de la pestaña activa (tu tono principal)
        tabBarInactiveTintColor: '#94A3B8', // Color de pestañas inactivas
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
        },
      }}
    >
      {/* Pestaña de Inicio */}
      <Tabs.Screen
        name="home"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => (
            <Feather name="grid" size={size} color={color} />
          ),
        }}
      />

      {/* Pestaña de Agenda */}
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Agenda',
          tabBarIcon: ({ color, size }) => (
            <Feather name="calendar" size={size} color={color} />
          ),
        }}
      />

      {/* Pestaña de Progreso / Estadísticas */}
      <Tabs.Screen
        name="progress-analytics"
        options={{
          title: 'Progreso',
          tabBarIcon: ({ color, size }) => (
            <Feather name="trending-up" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}