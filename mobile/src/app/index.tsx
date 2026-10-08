import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing } from '@/constants/theme';

export default function WelcomeScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>F</Text>
        </View>

        <Text style={styles.title}>FlowStep</Text>

        <Text style={styles.subtitle}>
          Convierte tus metas en pasos que puedes lograr.
        </Text>

        <Text style={styles.description}>
          Aprende, actúa y avanza con un plan adaptado a ti.
        </Text>

        <Pressable
          style={styles.button}
          onPress={() => router.push('/login')}>
          <Text style={styles.buttonText}>Comenzar</Text>
        </Pressable>

        <Pressable
          style={styles.loginButton}
          onPress={() => router.push('/login')}>
          <Text style={styles.loginText}>Ya tengo una cuenta</Text>
        </Pressable>
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
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
  },

  logo: {
    width: 90,
    height: 90,
    borderRadius: 30,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.four,
  },

  logoText: {
    fontSize: 44,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  title: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: Spacing.two,
  },

  subtitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.light.text,
    textAlign: 'center',
    lineHeight: 28,
  },

  description: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: Spacing.three,
    marginBottom: Spacing.six,
  },

  button: {
    width: '100%',
    height: 54,
    borderRadius: 18,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  loginButton: {
    marginTop: Spacing.three,
    padding: Spacing.two,
  },

  loginText: {
    color: Colors.light.primary,
    fontSize: 15,
    fontWeight: '600',
  },
});