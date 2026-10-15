import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';

import { Colors, Spacing } from '@/constants/theme';

type InputProps = TextInputProps & {
  label: string;
  error?: string;
};

export function Input({
  label,
  error,
  secureTextEntry,
  ...props
}: InputProps) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const isPassword = Boolean(secureTextEntry);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <View
        style={[
          styles.inputWrapper,
          error ? styles.inputError : null,
        ]}
      >
        <TextInput
          {...props}
          secureTextEntry={
            isPassword ? !passwordVisible : false
          }
          style={styles.input}
          placeholderTextColor={Colors.light.textSecondary}
        />

        {isPassword ? (
          <Pressable
            style={styles.passwordToggle}
            onPress={() => setPasswordVisible((visible) => !visible)}
            accessibilityRole="button"
            accessibilityLabel={
              passwordVisible
                ? 'Ocultar contraseña'
                : 'Mostrar contraseña'
            }
            hitSlop={8}
          >
            <Text style={styles.toggleText}>
              {passwordVisible ? 'Ocultar' : 'Mostrar'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>×</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
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

  inputWrapper: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 16,
    backgroundColor: Colors.light.backgroundElement,
  },

  inputError: {
    borderColor: Colors.light.error,
    borderWidth: 1.5,
  },

  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 50,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    color: Colors.light.text,
  },

  passwordToggle: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },

  toggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.primary,
  },

  errorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.one,
  },

  errorIcon: {
    color: Colors.light.error,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 18,
  },

  errorText: {
    flex: 1,
    color: Colors.light.error,
    fontSize: 13,
    lineHeight: 18,
  },
});