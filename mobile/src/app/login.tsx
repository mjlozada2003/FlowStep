import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { Colors, Spacing } from '@/constants/theme';
import { validateDemoCredentials } from '@/services/demoAuth';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    form?: string;
  }>({});

  const handleLogin = () => {
    const newErrors: typeof errors = {};

    if (!email.trim()) {
      newErrors.email = 'Ingresa tu correo electrónico.';
    } else if (!EMAIL_REGEX.test(email.trim())) {
      newErrors.email = 'Ingresa un correo electrónico válido.';
    }

    if (!password) {
      newErrors.password = 'Ingresa tu contraseña.';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    const isValid = validateDemoCredentials(email, password);

    if (!isValid) {
      setErrors({
        form: 'Correo o contraseña incorrectos.',
      });
      return;
    }

    router.replace('/home');
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

              <Text style={styles.title}>FlowStep</Text>

              <Text style={styles.subtitle}>
                Convierte tus metas en pasos que puedes lograr.
              </Text>
            </View>

            <View style={styles.form}>
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
                    form: undefined,
                  }));
                }}
              />

              <Input
                label="Contraseña"
                placeholder="Tu contraseña"
                secureTextEntry
                autoCapitalize="none"
                value={password}
                error={errors.password}
                onChangeText={(value) => {
                  setPassword(value);
                  setErrors((current) => ({
                    ...current,
                    password: undefined,
                    form: undefined,
                  }));
                }}
              />

              {errors.form ? (
                <Text style={styles.formError}>{errors.form}</Text>
              ) : null}

              <Button
                title="Iniciar sesión"
                onPress={handleLogin}
              />
            </View>

            <View style={styles.demoContainer}>
              <Text style={styles.demoTitle}>Acceso de demostración</Text>
              <Text style={styles.demoText}>
                Correo: demo@flowstep.app
              </Text>
              <Text style={styles.demoText}>
                Contraseña: FlowStep123!
              </Text>
            </View>

            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>
                ¿No tienes una cuenta?
              </Text>

              <Pressable onPress={() => router.push('/register')}>
                <Text style={styles.registerLink}>Registrarse</Text>
              </Pressable>
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

  formError: {
    color: Colors.light.error,
    fontSize: 13,
    lineHeight: 18,
  },

  demoContainer: {
    alignItems: 'center',
    marginTop: Spacing.four,
    padding: Spacing.three,
    borderRadius: 16,
    backgroundColor: Colors.light.backgroundElement,
    gap: Spacing.one,
  },

  demoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.text,
  },

  demoText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },

  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.one,
    marginTop: Spacing.four,
  },

  registerText: {
    color: Colors.light.textSecondary,
    fontSize: 14,
  },

  registerLink: {
    color: Colors.light.primary,
    fontSize: 14,
    fontWeight: '700',
  },
});