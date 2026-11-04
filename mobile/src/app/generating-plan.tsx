import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { BrandHeader } from '@/components/ui/BrandHeader';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/contexts/auth-context';
import { saveBulkAvailability, type AvailabilitySlot } from '@/services/api/availability';
import { createGoal, type CreatedGoal } from '@/services/api/goals';

const STEPS = [
  'Analizando tu objetivo y prioridad...',
  'Evaluando tus días y horarios disponibles...',
  'Distribuyendo las sesiones de estudio...',
  '¡Tu plan personalizado está listo!',
];

export default function GeneratingPlanScreen() {
  const params = useLocalSearchParams<{
    title?: string;
    description?: string;
    priority?: string;
    hours?: string;
    targetDate?: string;
    availabilities?: string;
  }>();

  const { token } = useAuth();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const hasTriggered = useRef(false);

  const startPlanGeneration = async () => {
    setErrorMessage(null);

    const goalTitle = (params.title || 'Mi objetivo').trim();
    const goalDescription = (params.description || goalTitle).trim();
    const dueDate = params.targetDate?.trim() || undefined;

    const priorityMap: Record<string, 'high' | 'medium' | 'low'> = {
      alta: 'high',
      high: 'high',
      baja: 'low',
      low: 'low',
      media: 'medium',
      medium: 'medium',
    };
    const mappedPriority = priorityMap[params.priority || 'media'] || 'medium';

    try {
      setCurrentStepIndex(0);

      // Si tenemos token y disponibilidad, persistimos disponibilidad (Paso 1)
      if (token && params.availabilities) {
        try {
          const parsedAvailabilities: AvailabilitySlot[] = JSON.parse(
            params.availabilities,
          );
          if (Array.isArray(parsedAvailabilities) && parsedAvailabilities.length > 0) {
            await saveBulkAvailability(token, parsedAvailabilities);
          }
        } catch (e) {
          console.warn('No se pudo guardar la disponibilidad en lote:', e);
        }
      }

      setCurrentStepIndex(1);
      await new Promise((resolve) => setTimeout(resolve, 800));

      setCurrentStepIndex(2);

      let createdGoal: CreatedGoal | null = null;

      if (token) {
        createdGoal = await createGoal(token, {
          title: goalTitle,
          user_description: goalDescription,
          priority: mappedPriority,
          due_date: dueDate,
        });
      } else {
        // Simulación offline si no hay token
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      setCurrentStepIndex(3);
      await new Promise((resolve) => setTimeout(resolve, 800));

      if (createdGoal) {
        router.replace({
          pathname: '/goal-plan',
          params: {
            goalId: String(createdGoal.goal_id),
            title: createdGoal.title,
            targetDate: createdGoal.due_date ?? '',
            priority: params.priority || 'media',
            hours: String(params.hours || '4'),
            stages: JSON.stringify(
              (createdGoal.stages ?? []).map((stage) => ({
                stage_id: stage.stage_id,
                name: stage.name,
                activity_count: stage.activities?.length ?? 0,
              })),
            ),
          },
        });
      } else {
        router.replace({
          pathname: '/goal-plan',
          params: {
            title: goalTitle,
            targetDate: dueDate ?? '',
            priority: params.priority || 'media',
            hours: String(params.hours || '4'),
          },
        });
      }
    } catch (error) {
      console.error('Error generando plan:', error);
      const msg =
        error instanceof Error
          ? error.message
          : 'Ocurrió un error al generar tu plan. Verifica tu conexión.';
      setErrorMessage(msg);
    }
  };

  useEffect(() => {
    if (!hasTriggered.current) {
      hasTriggered.current = true;
      startPlanGeneration();
    }
  }, []);

  const handleRetry = () => {
    setIsRetrying(true);
    startPlanGeneration().finally(() => setIsRetrying(false));
  };

  const handleSkipOffline = () => {
    router.replace({
      pathname: '/goal-plan',
      params: {
        title: params.title || 'Mi objetivo',
        targetDate: params.targetDate || '',
        priority: params.priority || 'media',
        hours: String(params.hours || '4'),
      },
    });
  };

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

          {/* Tarjeta de progreso */}
          <View style={styles.card}>
            <View style={styles.stepsList}>
              {STEPS.map((step, index) => {
                const isCompleted = index < currentStepIndex;
                const isCurrent = index === currentStepIndex && !errorMessage;

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
                      ) : isCurrent ? (
                        <ActivityIndicator size="small" color="#174A62" />
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

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Feather name="alert-circle" size={18} color="#D97A7A" />
              <Text style={styles.errorText}>{errorMessage}</Text>
              <View style={styles.errorButtonsRow}>
                <TouchableOpacity
                  style={styles.retryBtn}
                  onPress={handleRetry}
                  disabled={isRetrying}
                >
                  <Text style={styles.retryBtnText}>
                    {isRetrying ? 'Reintentando...' : 'Reintentar'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.skipBtn}
                  onPress={handleSkipOffline}
                >
                  <Text style={styles.skipBtnText}>Continuar en modo demo</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.infoBanner}>
              <Feather name="star" size={18} color="#174A62" style={styles.bannerIcon} />
              <View style={styles.bannerTextContainer}>
                <Text style={styles.bannerTitle}>Flujo adaptado en curso</Text>
                <Text style={styles.bannerSubtitle}>
                  El sistema conecta con la IA y sincroniza tu disponibilidad horaria.
                </Text>
              </View>
            </View>
          )}
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
  errorBox: {
    backgroundColor: '#FFF5F5',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#FED7D7',
    padding: 16,
    alignItems: 'center',
    gap: 10,
  },
  errorText: {
    fontSize: 13,
    color: '#C53030',
    textAlign: 'center',
  },
  errorButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  retryBtn: {
    backgroundColor: '#174A62',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  skipBtn: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  skipBtnText: {
    color: '#0F2C40',
    fontWeight: '600',
    fontSize: 13,
  },
});
