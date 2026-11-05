import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { BrandHeader } from '@/components/ui/BrandHeader';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/contexts/auth-context';
import { ApiHttpError } from '@/services/api/client';
import {
  getAuthErrorMessage,
  loginUser,
} from '@/services/api/auth';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);
  const { setSession } = useAuth();

  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    form?: string;
  }>({});

  const handleLogin = async () => {
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

    setIsSubmitting(true);
    try {
      const session = await loginUser({
        email: email.trim().toLowerCase(),
        password,
      });
      setSession(session);
      router.replace('/home');
    } catch (error) {
      setErrors({
        form:
          error instanceof ApiHttpError && error.status === 401
            ? 'Correo o contraseña incorrectos.'
            : getAuthErrorMessage(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen style={styles.screen}>
      <View style={styles.topBlob} />

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
          <View style={styles.container}>
            <BrandHeader />

            <View style={styles.card}>
              <Text style={styles.badge}>QUÉ BUENO VERTE</Text>
              <Text style={styles.title}>Bienvenido de nuevo</Text>
              <Text style={styles.subtitle}>
                Continúa avanzando hacia tu objetivo.
              </Text>

              <View style={styles.form}>
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Correo electrónico</Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      focusedField === 'email' && styles.inputFocused,
                      errors.email ? styles.inputError : null,
                    ]}
                  >
                    <Feather
                      name="mail"
                      size={18}
                      color={focusedField === 'email' ? '#174A62' : '#8FA3B8'}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      placeholder="nombre@correo.com"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      value={email}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                      onChangeText={(value) => {
                        setEmail(value);
                        setErrors((curr) => ({
                          ...curr,
                          email: undefined,
                          form: undefined,
                        }));
                      }}
                      style={styles.input}
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                  {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
                </View>

                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Contraseña</Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      focusedField === 'password' && styles.inputFocused,
                      errors.password ? styles.inputError : null,
                    ]}
                  >
                    <Feather
                      name="lock"
                      size={18}
                      color={focusedField === 'password' ? '#174A62' : '#8FA3B8'}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      placeholder="Mínimo 8 caracteres"
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      value={password}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      onChangeText={(value) => {
                        setPassword(value);
                        setErrors((curr) => ({
                          ...curr,
                          password: undefined,
                          form: undefined,
                        }));
                      }}
                      style={styles.input}
                      placeholderTextColor="#94A3B8"
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeBtn}
                    >
                      <Feather
                        name={showPassword ? 'eye-off' : 'eye'}
                        size={18}
                        color="#8FA3B8"
                      />
                    </TouchableOpacity>
                  </View>
                  {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
                </View>

                {errors.form ? (
                  <Text style={styles.formError}>{errors.form}</Text>
                ) : null}

                <TouchableOpacity
                  onPress={handleLogin}
                  activeOpacity={0.85}
                  disabled={isSubmitting}
                  style={[
                    styles.submitButton,
                    isSubmitting && styles.submitButtonDisabled,
                  ]}
                >
                  {isSubmitting ? (
                    <>
                      <ActivityIndicator color="#FFFFFF" />
                      <Text style={styles.submitButtonText}>Iniciando sesión...</Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.submitButtonText}>Iniciar sesión</Text>
                      <Feather name="arrow-right" size={20} color="#FFFFFF" style={styles.buttonArrow} />
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.registerContainer}>
                <Text style={styles.registerText}>¿Aún no tienes una cuenta? </Text>
                <TouchableOpacity onPress={() => router.push('/register')}>
                  <Text style={styles.registerLink}>Regístrate</Text>
                </TouchableOpacity>
              </View>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#FAF6F0',
    flex: 1,
  },
  topBlob: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#D8ECF8',
    opacity: 0.8,
  },
  keyboardContainer: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 32,
    justifyContent: 'center',
  },
  container: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    boxShadow: '0px 8px 16px rgba(23, 74, 98, 0.08)',
    elevation: 4,
  },
  badge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#174A62',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F2C40',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#627D98',
    lineHeight: 20,
    marginBottom: 20,
  },
  form: {
    gap: 16,
  },
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
  formError: {
    fontSize: 13,
    color: '#D97A7A',
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: '#174A62',
    height: 52,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    boxShadow: '0px 4px 8px rgba(23, 74, 98, 0.25)',
    elevation: 3,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonArrow: {
    marginLeft: 8,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  registerText: {
    color: '#627D98',
    fontSize: 13,
  },
  registerLink: {
    color: '#174A62',
    fontSize: 13,
    fontWeight: '800',
  },
});