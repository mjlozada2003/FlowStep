/**
 * Theme configuration for FlowStep.
 * Includes colors, typography, spacing and layout constants.
 */

// theme.ts
import '@/global.css';
import { Platform } from 'react-native';

export const Colors = {
  light: {
    // Base
    text: '#0F2C40',
    background: '#FAF6F0', // Fondo crema suave
    cardBackground: '#FFFFFF',
    textSecondary: '#627D98',
    textMuted: '#8FA3B8',

    // Brand
    primary: '#174A62', // Azul marino/petróleo del botón
    primaryHover: '#0E3345',
    accentBlue: '#D8ECF8', // Celeste para blobs de fondo

    // UI
    border: '#E2E8F0',

    // States
    success: '#69A98B',
    warning: '#E7A66B',
    error: '#D97A7A',
  },
  dark: {
    text: '#FAF6F0',
    background: '#0F2C40',
    cardBackground: '#174A62',
    textSecondary: '#A0AEC0',
    textMuted: '#718096',

    primary: '#78B9D6',
    primaryHover: '#4D8BC6',
    accentBlue: '#244B70',

    border: '#2D3748',

    success: '#78B99A',
    warning: '#E7B77F',
    error: '#E28C8C',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({
  ios: 50,
  android: 80,
}) ?? 0;

export const MaxContentWidth = 800;