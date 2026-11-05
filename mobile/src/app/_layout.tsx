import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';
import { AuthProvider } from '@/contexts/auth-context';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
          <Stack.Screen name="home" />
          <Stack.Screen name="create-goal" />
          <Stack.Screen name="availability" />
          <Stack.Screen name="generating-plan" />
          <Stack.Screen name="goal-plan" />
          <Stack.Screen name="schedule" />
          <Stack.Screen name="stage-detail" />
          <Stack.Screen name="activity-detail" />
          <Stack.Screen name="goal-success" />
          <Stack.Screen name="progress-analytics" />
          <Stack.Screen name="activity-history" />
        </Stack>
      </AuthProvider>
    </ThemeProvider>
  );
}
