import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { registerDemoUser } from '@/services/demoAuth';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<'name' | 'email' | 'password' | null>(null);

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
    } else if (password.length < 8) {
      newErrors.password = 'La contraseña debe tener al menos 8 caracteres.';
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
            <View style={styles.brandHeader}>
              <View style={styles.logoRow}>
                <View style={styles.logoBars}>
                  <View style={[styles.bar, styles.bar1]} />
                  <View style={[styles.bar, styles.bar2]} />
                  <View style={[styles.bar, styles.bar3]} />
                </View>
                <Text style={styles.brandName}>FlowStep</Text>
              </View>
              <Text style={styles.brandTagline}>Tu camino, paso a paso.</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.badge}>EMPECEMOS</Text>
              <Text style={styles.title}>Crea tu cuenta</Text>
              <Text style={styles.subtitle}>
                Define lo que quieres lograr. Nosotros te ayudamos a llegar.
              </Text>

              <View style={styles.form}>
                {/* Field: Nombre */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Nombre</Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      focusedField === 'name' && styles.inputFocused,
                      errors.name ? styles.inputError : null,
                    ]}
                  >
                    <Feather
                      name="user"
                      size={18}
                      color={focusedField === 'name' ? '#174A62' : '#8FA3B8'}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      placeholder="Tu nombre"
                      autoCapitalize="words"
                      value={name}
                      onFocus={() => setFocusedField('name')}
                      onBlur={() => setFocusedField(null)}
                      onChangeText={(value) => {
                        setName(value);
                        setErrors((curr) => ({ ...curr, name: undefined }));
                      }}
                      style={styles.input}
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                  {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
                </View>

                {/* Field: Correo electrónico */}
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
                        setErrors((curr) => ({ ...curr, email: undefined }));
                      }}
                      style={styles.input}
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                  {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
                </View>

                {/* Field: Contraseña */}
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
                        setErrors((curr) => ({ ...curr, password: undefined }));
                      }}
                      style={styles.input}
                      placeholderTextColor="#94A3B8"
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                      <Feather
                        name={showPassword ? 'eye-off' : 'eye'}
                        size={18}
                        color="#8FA3B8"
                      />
                    </TouchableOpacity>
                  </View>
                  {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
                </View>

                <TouchableOpacity
                  style={styles.submitButton}
                  onPress= {() => router.push('/login')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.submitButtonText}>Crear cuenta</Text>
                  <Feather name="arrow-right" size={20} color="#FFFFFF" style={styles.buttonArrow} />
                </TouchableOpacity>
              </View>

              <View style={styles.loginContainer}>
                <Text style={styles.loginText}>¿Ya tienes una cuenta? </Text>
                <TouchableOpacity onPress={() => router.push('/login')}>
                  <Text style={styles.loginLink}>Inicia sesión</Text>
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
  brandHeader: {
    marginBottom: 20,
    paddingLeft: 4,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 22,
    marginRight: 4,
  },
  bar: {
    width: 5,
    borderRadius: 2.5,
    backgroundColor: '#174A62',
  },
  bar1: { height: 12 },
  bar2: { height: 17 },
  bar3: { height: 22 },
  brandName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F2C40',
    letterSpacing: -0.5,
  },
  brandTagline: {
    fontSize: 13,
    color: '#627D98',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    shadowColor: '#174A62',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
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
  submitButton: {
    backgroundColor: '#174A62',
    height: 52,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#174A62',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonArrow: {
    marginLeft: 8,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  loginText: {
    color: '#627D98',
    fontSize: 13,
  },
  loginLink: {
    color: '#174A62',
    fontSize: 13,
    fontWeight: '800',
  },
});