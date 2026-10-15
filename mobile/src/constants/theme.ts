/**
 * Theme configuration for FlowStep.
 * Includes colors, typography, spacing and layout constants.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    // Base
    text: '#123061',
    background: '#F8F3E9',
    backgroundElement: '#EBF1F8',
    backgroundSelected: '#D2EDF2',
    textSecondary: '#6F7D91',

    // Brand
    primary: '#4D8BC6',
    secondary: '#78B9D6',

    // UI
    border: '#DCCEC1',

    // States
    success: '#69A98B',
    warning: '#E7A66B',
    error: '#D97A7A',
  },

  dark: {
    // Base
    text: '#F8F3E9',
    background: '#10233F',
    backgroundElement: '#183557',
    backgroundSelected: '#244B70',
    textSecondary: '#ACB5C4',

    // Brand
    primary: '#78B9D6',
    secondary: '#4D8BC6',

    // UI
    border: '#49627D',

    // States
    success: '#78B99A',
    warning: '#E7B77F',
    error: '#E28C8C',
  },
} as const;

export type ThemeColor =
  keyof typeof Colors.light & keyof typeof Colors.dark;

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