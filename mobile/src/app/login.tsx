import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { Colors, Spacing } from '@/constants/theme';

export default function LoginScreen() {
  return (
    <Screen>
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
            placeholder="mi-correo@ejemplo.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Input
            label="Contraseña"
            placeholder="Tu contraseña"
            secureTextEntry
          />

          <Button
            title="Iniciar sesión"
            onPress={() => {}}
          />
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