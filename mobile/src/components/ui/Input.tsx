import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';

import { Colors, Spacing } from '@/constants/theme';

type InputProps = TextInputProps & {
  label: string;
};

export function Input({ label, ...props }: InputProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <TextInput
        {...props}
        style={[styles.input, props.style]}
        placeholderTextColor={Colors.light.textSecondary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.one,
  },

  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },

  input: {
    height: 52,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 16,
    backgroundColor: Colors.light.backgroundElement,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
    color: Colors.light.text,
  },
});