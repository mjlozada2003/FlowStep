import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View,} from 'react-native';
import { AuthCardLayout } from '@/components/ui/AuthCardLayout';
import { AuthInput } from '@/components/ui/AuthInput';
import { getAuthErrorMessage, registerUser } from '@/services/api/auth';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    form?: string;
  }>({});

  const handleRegister = async () => {
    const newErrors: typeof errors = {};

    if (!name.trim()) newErrors.name = 'Ingresa tu nombre.';
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
    if (Object.keys(newErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      await registerUser({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      Alert.alert(
        '¡Cuenta creada!',
        'Tu cuenta de FlowStep fue creada correctamente.',
        [{ text: 'Continuar', onPress: () => router.replace('/login') }]
      );
    } catch (error) {
      setErrors({ form: getAuthErrorMessage(error) });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCardLayout
      badge="EMPECEMOS"
      title="Crea tu cuenta"
      subtitle="Define lo que quieres lograr. Nosotros te ayudamos a llegar."
      footer={
        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>¿Ya tienes una cuenta? </Text>
          <TouchableOpacity onPress={() => router.push('/login')}>
            <Text style={styles.footerLink}>Inicia sesión</Text>
          </TouchableOpacity>
        </View>
      }
    >
      <AuthInput
        label="Nombre"
        icon="user"
        placeholder="Tu nombre"
        autoCapitalize="words"
        maxLength={100}
        value={name}
        onChangeText={(val) => {
          setName(val);
          setErrors((curr) => ({ ...curr, name: undefined, form: undefined }));
        }}
        error={errors.name}
      />

      <AuthInput
        label="Correo electrónico"
        icon="mail"
        placeholder="nombre@correo.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        value={email}
        onChangeText={(val) => {
          setEmail(val);
          setErrors((curr) => ({ ...curr, email: undefined, form: undefined }));
        }}
        error={errors.email}
      />

      <AuthInput
        label="Contraseña"
        icon="lock"
        placeholder="Mínimo 8 caracteres"
        isPassword
        showPassword={showPassword}
        onTogglePassword={() => setShowPassword(!showPassword)}
        autoCapitalize="none"
        value={password}
        onChangeText={(val) => {
          setPassword(val);
          setErrors((curr) => ({ ...curr, password: undefined, form: undefined }));
        }}
        error={errors.password}
      />

      {errors.form ? <Text style={styles.formError}>{errors.form}</Text> : null}

      <TouchableOpacity
        style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
        onPress={handleRegister}
        activeOpacity={0.85}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <ActivityIndicator color="#FFFFFF" />
            <Text style={styles.submitButtonText}>Creando cuenta...</Text>
          </>
        ) : (
          <>
            <Text style={styles.submitButtonText}>Crear cuenta</Text>
            <Feather name="arrow-right" size={20} color="#FFFFFF" style={styles.buttonArrow} />
          </>
        )}
      </TouchableOpacity>
    </AuthCardLayout>
  );
}

const styles = StyleSheet.create({
  formError: { fontSize: 13, color: '#D97A7A', textAlign: 'center' },
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
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  buttonArrow: { marginLeft: 8 },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: { color: '#627D98', fontSize: 13 },
  footerLink: { color: '#174A62', fontSize: 13, fontWeight: '800' },
});