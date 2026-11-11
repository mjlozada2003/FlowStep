import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';

interface AuthInputProps extends TextInputProps {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  error?: string;
  isPassword?: boolean;
  showPassword?: boolean;
  onTogglePassword?: () => void;
}

export function AuthInput({
  label,
  icon,
  error,
  isPassword,
  showPassword,
  onTogglePassword,
  ...props
}: AuthInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputWrapper,
          isFocused && styles.inputFocused,
          error ? styles.inputError : null,
        ]}
      >
        <Feather
          name={icon}
          size={18}
          color={isFocused ? '#174A62' : '#8FA3B8'}
          style={styles.inputIcon}
        />
        <TextInput
          {...props}
          secureTextEntry={isPassword && !showPassword}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={styles.input}
          placeholderTextColor="#94A3B8"
        />
        {isPassword && onTogglePassword && (
          <TouchableOpacity onPress={onTogglePassword} style={styles.eyeBtn}>
            <Feather
              name={showPassword ? 'eye-off' : 'eye'}
              size={18}
              color="#8FA3B8"
            />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  fieldContainer: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F2C40',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
    backgroundColor: '#FFFFFF',
  },
  inputFocused: {
    borderColor: '#174A62',
    borderWidth: 1.5,
  },
  inputError: {
    borderColor: '#D97A7A',
  },
  inputIcon: {
    marginRight: 10,
  },
  eyeBtn: {
    padding: 4,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    color: '#0F2C40',
    ...(Platform.OS === 'web'
      ? ({
          outlineStyle: 'none',
          outlineWidth: 0,
          outlineColor: 'transparent',
        } as any)
      : {}),
  },
  errorText: {
    fontSize: 12,
    color: '#D97A7A',
    marginTop: 2,
  },
});