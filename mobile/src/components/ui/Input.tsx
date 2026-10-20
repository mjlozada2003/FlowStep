import { ReactNode, useState } from 'react';
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
  label?: string; //  Ahora es opcional para evitar el error TS(2741)
  error?: string;
  icon?: ReactNode; // Soporte opcional para iconos a la izquierda (Feather)
};

export function Input({
  label,
  error,
  icon,
  secureTextEntry,
  style,
  ...props
}: InputProps) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const isPassword = Boolean(secureTextEntry);

  return (
    <View style={styles.container}>
      {/* Solo renderiza la etiqueta si existe */}
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View
        style={[
          styles.inputWrapper,
          error ? styles.inputError : null,
        ]}
      >
        {/* Icono opcional a la izquierda */}
        {icon ? <View style={styles.iconContainer}>{icon}</View> : null}

        <TextInput
          {...props}
          secureTextEntry={isPassword ? !passwordVisible : false}
          style={[styles.input, style]}
          placeholderTextColor={Colors.light.textMuted}
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
    gap: 6,
  },

  label: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.text,
  },

  inputWrapper: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.2,
    borderColor: Colors.light.border,
    borderRadius: 16,
    backgroundColor: '#FFFFFF', // Blanco limpio según el Card de Figma
    paddingHorizontal: Spacing.three,
  },

  inputError: {
    borderColor: Colors.light.error,
    borderWidth: 1.5,
  },

  iconContainer: {
    marginRight: Spacing.two,
  },

  input: {
    flex: 1,
    minWidth: 0,
    height: 50,
    fontSize: 14,
    color: Colors.light.text,
    paddingHorizontal: 0,
  },

  passwordToggle: {
    paddingLeft: Spacing.two,
    paddingVertical: Spacing.two,
  },

  toggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },

  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    marginTop: 2,
  },

  errorIcon: {
    color: Colors.light.error,
    fontSize: 16,
    fontWeight: '700',
  },

  errorText: {
    flex: 1,
    color: Colors.light.error,
    fontSize: 12,
  },
});