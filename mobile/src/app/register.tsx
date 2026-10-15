import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { Colors, Spacing } from '@/constants/theme';
import { registerDemoUser } from '@/services/demoAuth';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
  }>({});

  const handleRegister = () => {
    const newErrors: typeof errors = {};

    if (!name.trim()) {
      newErrors.name = 'Ingresa tu nombre.';
    }

    if (!email.trim()) {
      newErrors.email = 'Ingresa tu correo electrónico.';
    } else if (!EMAIL_REGEX.test(email.trim())) {
      newErrors.email = 'Ingresa un correo electrónico válido.';
    }

    if (!password) {
      newErrors.password = 'Ingresa una contraseña.';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    const result = registerDemoUser({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
    });

    if (result === 'exists') {
      setErrors({
        email: 'Este correo ya está registrado. Inicia sesión.',
      });
      return;
    }

    Alert.alert(
      '¡Cuenta creada!',
      'Tu cuenta de FlowStep fue creada correctamente.',
      [
        {
          text: 'Continuar',
          onPress: () => router.replace('/login'),
        },
      ],
    );
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <View style={styles.logo}>
                <Text style={styles.logoText}>F</Text>
              </View>

              <Text style={styles.title}>Crear cuenta</Text>

              <Text style={styles.subtitle}>
                Empieza a convertir tus objetivos en pasos concretos.
              </Text>
            </View>

            <View style={styles.form}>
              <Input
                label="Nombre"
                placeholder="Juan Pérez"
                autoCapitalize="words"
                value={name}
                error={errors.name}
                onChangeText={(value) => {
                  setName(value);
                  setErrors((current) => ({
                    ...current,
                    name: undefined,
                  }));
                }}
              />

              <Input
                label="Correo electrónico"
                placeholder="tu-correo@ejemplo.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                error={errors.email}
                onChangeText={(value) => {
                  setEmail(value);
                  setErrors((current) => ({
                    ...current,
                    email: undefined,
                  }));
                }}
              />

              <Input
                label="Contraseña"
                placeholder="Crea una contraseña"
                secureTextEntry
                autoCapitalize="none"
                value={password}
                error={errors.password}
                onChangeText={(value) => {
                  setPassword(value);
                  setErrors((current) => ({
                    ...current,
                    password: undefined,
                  }));
                }}
              />

              <Button
                title="Crear cuenta"
                onPress={handleRegister}
              />
            </View>

            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>
                ¿Ya tienes una cuenta?
              </Text>

              <Text
                style={styles.loginLink}
                onPress={() => router.back()}
              >
                Iniciar sesión
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },

  scroll: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
  },

  content: {
    flexGrow: 1,
    justifyContent: 'center',
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
    paddingVertical: Spacing.four,
  },

  header: {
    alignItems: 'center',
    marginBottom: Spacing.six,
  },

  logo: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },

  logoText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  title: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: Spacing.two,
  },

  subtitle: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },

  form: {
    gap: Spacing.three,
  },

  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.one,
    marginTop: Spacing.four,
  },

  loginText: {
    color: Colors.light.textSecondary,
    fontSize: 14,
  },

  loginLink: {
    color: Colors.light.primary,
    fontSize: 14,
    fontWeight: '700',
  },
});