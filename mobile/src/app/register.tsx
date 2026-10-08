import { router } from 'expo-router';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Colors, Spacing } from '@/constants/theme';

export default function RegisterScreen() {
  return (
    <View style={styles.container}>
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
          <Text style={styles.label}>Nombre</Text>

          <TextInput
            style={styles.input}
            placeholder="Tu nombre"
            placeholderTextColor={Colors.light.textSecondary}
          />

          <Text style={styles.label}>Correo electrónico</Text>

          <TextInput
            style={styles.input}
            placeholder="tu correo@example.com"
            placeholderTextColor={Colors.light.textSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Contraseña</Text>

          <TextInput
            style={styles.input}
            placeholder="Crea una contraseña"
            placeholderTextColor={Colors.light.textSecondary}
            secureTextEntry
          />

          <Pressable style={styles.button}>
            <Text style={styles.buttonText}>Crear cuenta</Text>
          </Pressable>
        </View>

        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>¿Ya tienes una cuenta?</Text>

          <Pressable onPress={() => router.back()}>
            <Text style={styles.loginLink}>Iniciar sesión</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
    justifyContent: 'center',
  },

  content: {
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
  },

  header: {
    alignItems: 'center',
    marginBottom: Spacing.six,
  },

  logo: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },

  logoText: {
    fontSize: 30,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  title: {
    fontSize: 30,
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
    gap: Spacing.two,
  },

  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    marginTop: Spacing.two,
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

  button: {
    height: 52,
    borderRadius: 16,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.three,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
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