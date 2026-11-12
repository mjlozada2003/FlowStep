import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/contexts/auth-context';

export default function AppLayout() {
  const { token } = useAuth();

  // Si no hay token, redirigimos al login de forma limpia
  if (!token) {
    return <Redirect href="/login" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="home" />
      <Stack.Screen name="schedule" />
      <Stack.Screen name="create-goal" />
      <Stack.Screen name="generating-plan" />
      <Stack.Screen name="goal-plan" />
      <Stack.Screen name="goal-success" />
      <Stack.Screen name="progress-analytics" />
      <Stack.Screen name="stage-detail" />
      <Stack.Screen name="activity-detail" />
    </Stack>
  );
}