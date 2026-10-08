import { router } from 'expo-router';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Colors, Spacing } from '@/constants/theme';

export default function LoginScreen() {
  return (
    <View style={styles.container}>
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
            placeholder="Tu contraseña"
            placeholderTextColor={Colors.light.textSecondary}
            secureTextEntry
          />

          <Pressable style={styles.button}>
            <Text style={styles.buttonText}>Iniciar sesión</Text>
          </Pressable>
        </View>

        <View style={styles.registerContainer}>
          <Text style={styles.registerText}>¿No tienes una cuenta?</Text>

          <Pressable onPress={() => router.push('/register')}>
            <Text style={styles.registerLink}>Registrarse</Text>
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