import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { BackButton } from '@/components/ui/BackButton';
import { useAuth } from '@/contexts/auth-context';
import {
  getGoalById,
  getGoalProgress,
  updateGoalPriority,
  type CreatedGoal,
  type GoalProgress,
} from '@/services/api/goals';
import { getAvailability, getWeeklyAvailabilityMinutes } from '@/services/api/availability';
import { GoalOverviewCard } from '@/components/features/GoalOverviewCard';
import { GoalStageTimelineCard } from '@/components/features/GoalStageTimelineCard';
import { FlowMascotAvatar } from '@/components/features/FlowMascotAvatar';

export default function GoalPlanScreen() {
  const params = useLocalSearchParams<{
    goalId?: string;
  }>();

  const { token } = useAuth();

  const parsedGoalId = /^\d+$/.test(params.goalId ?? '')
    ? Number(params.goalId)
    : null;
  const goalId = parsedGoalId !== null && parsedGoalId > 0 ? parsedGoalId : null;

  const [goal, setGoal] = useState<CreatedGoal | null>(null);
  const [progress, setProgress] = useState<GoalProgress | null>(null);
  const [priority, setPriority] = useState<string>('');
  const [isUpdatingPriority, setIsUpdatingPriority] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [weeklyHours, setWeeklyHours] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!goalId || !token) return undefined;

      getGoalById(goalId, token)
        .then((serverGoal) => {
          if (!active) return;
          setLoadError(null);
          setGoal(serverGoal);
          setPriority(serverGoal.priority ?? '');
        })
        .catch((error: unknown) => {
          if (!active) return;
          setLoadError(
            error instanceof Error ? error.message : 'No se pudo cargar el objetivo.',
          );
        })
        .finally(() => {
          if (active) setIsLoading(false);
        });

      getAvailability(token)
        .then((slots) => {
          if (active) {
            setAvailabilityError(null);
            setWeeklyHours(getWeeklyAvailabilityMinutes(slots) / 60);
          }
        })
        .catch((error: unknown) => {
          if (!active) return;
          setWeeklyHours(null);
          setAvailabilityError(
            error instanceof Error ? error.message : 'No se pudo cargar tu disponibilidad.',
          );
        });

      getGoalProgress(goalId, token)
        .then((value) => {
          if (active) {
            setProgressError(null);
            setProgress(value);
          }
        })
        .catch((error: unknown) => {
          if (!active) return;
          setProgressError(
            error instanceof Error
              ? `No se pudo consultar el progreso: ${error.message}`
              : 'No se pudo consultar el progreso del objetivo.',
          );
        });

      return () => {
        active = false;
      };
    }, [goalId, token]),
  );

  const handleCyclePriority = async () => {
    if (!goalId || !token || isUpdatingPriority || !priority) return;

    const cycle: Record<string, 'high' | 'medium' | 'low'> = {
      low: 'medium',
      medium: 'high',
      high: 'low',
    };

    const nextPriority = cycle[priority.toLowerCase()];
    if (!nextPriority) return;
    setLoadError(null);
    setIsUpdatingPriority(true);

    try {
      const updatedGoal = await updateGoalPriority(goalId, token, nextPriority);
      setGoal(updatedGoal);
      setPriority(updatedGoal.priority ?? nextPriority);
      const refreshedGoal = await getGoalById(goalId, token);
      setGoal(refreshedGoal);
      setPriority(refreshedGoal.priority ?? '');
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : 'No se pudo actualizar la prioridad.',
      );
    } finally {
      setIsUpdatingPriority(false);
    }
  };

  const isGoalLoading = isLoading && Boolean(goalId && token);
  const displayLoadError =
    loadError ??
    (!goalId || !token
      ? 'No se pudo identificar el objetivo. Abre un objetivo guardado desde el inicio.'
      : null);
  const stages = goal?.stages ?? [];
  const activityCount =
    progress?.total_activities ??
    stages.reduce((count, stage) => count + (stage.activities?.length ?? 0), 0);

  const displayPriority =
    priority.toLowerCase() === 'high'
      ? 'ALTA'
      : priority.toLowerCase() === 'low'
        ? 'BAJA'
        : priority.toLowerCase() === 'medium'
          ? 'MEDIA'
          : '—';
  const weeklyHoursLabel =
    weeklyHours === null
      ? '—'
      : `${Number(weeklyHours.toFixed(2))} H`;

  return (
    <Screen style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* Header Superior con BackButton unificado */}
          <View style={styles.topRow}>
            <View style={styles.headerLeftContainer}>
              <BackButton />
              <View>
                <Text style={styles.badge}>TU PLAN PERSONALIZADO</Text>
                <Text style={styles.mainTitle}>Tu plan personalizado</Text>
              </View>
            </View>

            <View style={styles.avatarWrapper}>
              <FlowMascotAvatar />
              <Text style={styles.avatarLabel}>¡Vamos!</Text>
            </View>
          </View>

          {/* Tarjeta Principal del Objetivo */}
          <GoalOverviewCard
            title={goal?.title}
            dueDate={goal?.due_date}
            isLoading={isGoalLoading}
          />

          {/* 3 Mini Tarjetas de Métricas (Interactivas) */}
          <View style={styles.metricsRow}>
            <TouchableOpacity
              style={styles.miniMetricCard}
              onPress={handleCyclePriority}
              disabled={!goal || !priority || isUpdatingPriority}
              activeOpacity={0.8}
            >
              {isUpdatingPriority ? (
                <ActivityIndicator size="small" color="#174A62" />
              ) : (
                <Text style={styles.miniMetricValue}>{displayPriority}</Text>
              )}
              <Text style={styles.miniMetricLabel}>Prioridad (toca)</Text>
            </TouchableOpacity>

            <View style={styles.miniMetricCard}>
              <Text style={styles.miniMetricValue}>
                {weeklyHoursLabel}
              </Text>
              <Text style={styles.miniMetricLabel}>Por semana</Text>
            </View>

            <TouchableOpacity
              style={styles.miniMetricCard}
              activeOpacity={0.7}
              onPress={() =>
                router.push({
                  pathname: '/progress-analytics',
                  params: {
                    goalId: goalId ? String(goalId) : '',
                  },
                })
              }
            >
              <Text style={styles.miniMetricValue}>
                {progress ? `${progress.progress_percentage}%` : '—'}
              </Text>
              <Text style={styles.miniMetricLabel}>
                Progreso (ver)
              </Text>
            </TouchableOpacity>
          </View>

          {/* Resumen de conteo */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>
              <Text style={styles.summaryBold}>{stages.length}</Text> etapas
            </Text>
            <Text style={styles.summaryDot}>•</Text>
            <Text style={styles.summaryText}>
              <Text style={styles.summaryBold}>{activityCount}</Text> actividades
            </Text>
            <Text style={styles.summaryDot}>•</Text>
            <Text style={styles.summaryText}>
              <Text style={styles.summaryBold}>
                {progress ? `${progress.completed_activities} listas` : '— listas'}
              </Text>
            </Text>
          </View>

          {/* Tarjeta de Acceso a la Agenda Adaptada */}
          <TouchableOpacity
            style={styles.scheduleAccessCard}
            activeOpacity={0.85}
            onPress={() =>
              router.push({
                pathname: '/schedule',
                params: {
                  goalId: goalId ? String(goalId) : '',
                },
              })
            }
          >
            <View style={styles.scheduleCardLeft}>
              <View style={styles.calendarIconBox}>
                <Feather name="calendar" size={18} color="#174A62" />
              </View>
              <View>
                <Text style={styles.scheduleCardTag}>PLAN ADAPTADO A TU DISPONIBILIDAD</Text>
                <Text style={styles.scheduleCardTitle}>Ver agenda de esta semana</Text>
              </View>
            </View>
            <Feather name="arrow-right" size={18} color="#174A62" />
          </TouchableOpacity>

          {/* Tarjeta de Acceso a Seguimiento y Métricas */}
          <TouchableOpacity
            style={styles.scheduleAccessCard}
            activeOpacity={0.85}
            onPress={() =>
              router.push({
                pathname: '/progress-analytics',
                params: {
                  goalId: goalId ? String(goalId) : '',
                },
              })
            }
          >
            <View style={styles.scheduleCardLeft}>
              <View style={[styles.calendarIconBox, { backgroundColor: '#E2EEF1' }]}>
                <Feather name="trending-up" size={18} color="#174A62" />
              </View>
              <View>
                <Text style={styles.scheduleCardTag}>SEGUIMIENTO Y RITMO</Text>
                <Text style={styles.scheduleCardTitle}>Ver progreso y estadísticas</Text>
              </View>
            </View>
            <Feather name="arrow-right" size={18} color="#174A62" />
          </TouchableOpacity>

          {/* Timeline de Etapas */}
          {isGoalLoading ? (
            <ActivityIndicator size="small" color="#174A62" />
          ) : null}
          {displayLoadError ? <Text style={styles.errorText}>{displayLoadError}</Text> : null}
          {availabilityError ? (
            <Text style={styles.errorText}>
              No se pudo consultar la disponibilidad semanal: {availabilityError}
            </Text>
          ) : null}
          {progressError ? <Text style={styles.errorText}>{progressError}</Text> : null}
          {!isGoalLoading && goal && stages.length === 0 ? (
            <Text style={styles.emptyText}>Este objetivo todavía no tiene etapas disponibles.</Text>
          ) : null}
          <View style={styles.timelineContainer}>
            <View style={styles.timelineLine} />
            {stages.map((stage, index) => (
              <GoalStageTimelineCard
                key={stage.stage_id}
                stage={stage}
                index={index}
                onPress={() =>
                  router.push({
                    pathname: '/stage-detail',
                    params: {
                      stageId: String(stage.stage_id),
                      goalId: goalId ? String(goalId) : '',
                      title: stage.name,
                    },
                  })
                }
              />
            ))}
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
    paddingVertical: 24,
    paddingBottom: 40,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    gap: 14,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  badge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#174A62',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F2C40',
    letterSpacing: -0.5,
  },
  avatarWrapper: {
    alignItems: 'center',
  },
  avatarLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#174A62',
    marginTop: 2,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  miniMetricCard: {
    flex: 1,
    backgroundColor: '#EBF5FB',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D8ECF8',
  },
  miniMetricValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#174A62',
    marginBottom: 2,
  },
  miniMetricLabel: {
    fontSize: 10,
    color: '#627D98',
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginVertical: 2,
  },
  summaryText: {
    fontSize: 12,
    color: '#627D98',
  },
  summaryBold: {
    fontWeight: '800',
    color: '#0F2C40',
  },
  summaryDot: {
    color: '#94A3B8',
  },
  scheduleAccessCard: {
    backgroundColor: '#EBF5FB',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D8ECF8',
  },
  scheduleCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  calendarIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scheduleCardTag: {
    fontSize: 9,
    fontWeight: '800',
    color: '#174A62',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  scheduleCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F2C40',
  },
  timelineContainer: {
    position: 'relative',
    gap: 12,
    paddingLeft: 8,
  },
  timelineLine: {
    position: 'absolute',
    left: 28,
    top: 20,
    bottom: 20,
    width: 2,
    backgroundColor: '#CBD5E1',
  },
  errorText: {
    color: '#C53030',
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
  emptyText: {
    color: '#627D98',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    paddingVertical: 16,
  },
});