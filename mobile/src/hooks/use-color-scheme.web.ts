import { useColorScheme as useRNColorScheme } from 'react-native';

/** Uses the platform color scheme and defaults to light during static rendering. */
export function useColorScheme() {
  return useRNColorScheme() ?? 'light';
}
