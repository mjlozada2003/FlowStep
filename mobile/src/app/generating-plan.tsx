import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { BrandHeader } from '@/components/ui/BrandHeader';
import { Screen } from '@/components/ui/Screen';

const STEPS = [
  'Analizando tu objetivo y prioridad...',
  'Evaluando tus días y horarios disponibles...',
  'Distribuyendo las sesiones de estudio...',
  '¡Tu plan personalizado está listo!',
];

export default function GeneratingPlanScreen() {
  const params = useLocalSearchParams();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < STEPS.length - 1) {
          return prev + 1;
        } else {
          clearInterval(interval);
          // Al terminar la simulación, redirigimos automáticamente a la vista del plan adaptado (/schedule)
          setTimeout(() => {
            router.replace({
              pathname: '/schedule',
              params,
            });
          }, 800);
          return prev;
        }
      });
    }, 1200);

    return () => clearInterval(interval);
  }, []);

  return (
    <Screen style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <View style={styles.topRow}>
            <BrandHeader showTagline={false} />
          </View>

          <View style={styles.avatarContainer}>
            <View style={styles.avatarCircle}>
              <Feather name="cpu" size={32} color="#174A62" />
            </View>
          </View>

          <View style={styles.titleSection}>
            <Text style={styles.badge}>PROCESANDO CON IA</Text>
            <Text style={styles.mainTitle}>Estamos creando tu plan personalizado</Text>
            <Text style={styles.subtitle}>
              Analizando tu objetivo y ajustando las actividades y fechas que necesitas.
            </Text>
          </View>

          {/* Tarjeta de progreso de pasos simulados */}
          <View style={styles.card}>
            <View style={styles.stepsList}>
              {STEPS.map((step, index) => {
                const isCompleted = index < currentStepIndex;
                const isCurrent = index === currentStepIndex;

                return (
                  <View key={index} style={styles.stepRow}>
                    <View
                      style={[
                        styles.stepDot,
                        isCompleted && styles.stepDotCompleted,
                        isCurrent && styles.stepDotCurrent,
                      ]}
                    >
                      {isCompleted ? (
                        <Feather name="check" size={12} color="#FFFFFF" />
                      ) : null}
                    </View>
                    <Text
                      style={[
                        styles.stepText,
                        isCurrent && styles.stepTextCurrent,
                        isCompleted && styles.stepTextCompleted,
                      ]}
                    >
                      {step}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          <View style={styles.infoBanner}>
            <Feather name="sparkles" size={18} color="#174A62" style={styles.bannerIcon} />
            <View style={styles.bannerTextContainer}>
              <Text style={styles.bannerTitle}>Flujo adaptado en curso</Text>
              <Text style={styles.bannerSubtitle}>
                El sistema ya consultó tu disponibilidad para evitar sobrecargas.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#FAF6F0',
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
    justifyContent: 'center',
  },
  container: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    gap: 20,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
  },
  avatarContainer: {
    alignItems: 'center',
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#D8ECF8',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0px 4px 12px rgba(23, 74, 98, 0.1)',
    elevation: 3,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 4,
  },
  badge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#174A62',
    letterSpacing: 1.2,
    marginBottom: 6,
    textAlign: 'center',
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F2C40',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#627D98',
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    boxShadow: '0px 8px 16px rgba(23, 74, 98, 0.08)',
    elevation: 4,
  },
  stepsList: {
    gap: 16,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotCompleted: {
    backgroundColor: '#174A62',
  },
  stepDotCurrent: {
    backgroundColor: '#D8ECF8',
    borderWidth: 2,
    borderColor: '#174A62',
  },
  stepText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
  },
  stepTextCurrent: {
    color: '#0F2C40',
    fontWeight: '800',
  },
  stepTextCompleted: {
    color: '#627D98',
    textDecorationLine: 'line-through',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF5FB',
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  bannerIcon: {
    marginTop: 2,
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F2C40',
  },
  bannerSubtitle: {
    fontSize: 12,
    color: '#627D98',
    marginTop: 2,
  },
});