import { Slot } from 'expo-router';
import { AuthProvider } from '@/contexts/auth-context';
import '@/global.css';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Slot />
    </AuthProvider>
  );
}