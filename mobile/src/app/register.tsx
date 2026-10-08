import { router } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { Colors, Spacing } from '@/constants/theme';

export default function RegisterScreen() {
  const handleRegister = () => {
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
          />

          <Input
            label="Correo electrónico"
            placeholder="tu-correo@ejemplo.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Input
            label="Contraseña"
            placeholder="Crea una contraseña"
            secureTextEntry
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
            onPress={() => router.back()}>
            Iniciar sesión
          </Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
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