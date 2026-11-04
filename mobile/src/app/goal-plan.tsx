import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { BrandHeader } from '@/components/ui/BrandHeader';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/contexts/auth-context';
import {
  getGoalById,
  getGoalProgress,
  updateGoalPriority,
  type CreatedGoal,
  type GoalProgress,
} from '@/services/api/goals';

interface GoalStagePreview {
  stage_id: number;
  name: string;
  activity_count: number;
}

function isGoalStagePreview(value: unknown): value is GoalStagePreview {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('stage_id' in value) ||
    typeof value.stage_id !== 'number' ||
    !('name' in value) ||
    typeof value.name !== 'string' ||
    !('activity_count' in value) ||
    typeof value.activity_count !== 'number' ||
    !Number.isInteger(value.activity_count) ||
    value.activity_count < 0
  ) {
    return false;
  }
  return true;
}

export default function GoalPlanScreen() {
  const params = useLocalSearchParams<{
    goalId?: string;
    title?: string;
    targetDate?: string;
    stages?: string;
    priority?: string;
    hours?: string;
  }>();

  const { token } = useAuth();

  const parsedGoalId = /^\d+$/.test(params.goalId ?? '')
    ? Number(params.goalId)
    : null;
  const goalId = parsedGoalId !== null && parsedGoalId > 0 ? parsedGoalId : null;

  const [goal, setGoal] = useState<CreatedGoal | null>(null);
  const [progress, setProgress] = useState<GoalProgress | null>(null);
  const [priority, setPriority] = useState<string>(params.priority || 'media');
  const [isUpdatingPriority, setIsUpdatingPriority] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Etapas por defecto o cargadas desde parámetros
  const defaultStages: GoalStagePreview[] = [
    { stage_id: 1, name: 'Aprendizaje', activity_count: 4 },
    { stage_id: 2, name: 'Desarrollo', activity_count: 5 },
    { stage_id: 3, name: 'Pruebas', activity_count: 3 },
  ];

  let initialStages = defaultStages;
  if (params.stages) {
    try {
      const parsedStages: unknown = JSON.parse(params.stages);
      if (Array.isArray(parsedStages) && parsedStages.every(isGoalStagePreview)) {
        initialStages = parsedStages;
      }
    } catch {}
  }

  const [stages, setStages] = useState<GoalStagePreview[]>(initialStages);

  // 1. Cargar el detalle del objetivo desde la API (HU-01, HU-02)
  useEffect(() => {
    if (!goalId || !token) return;

    setIsLoading(true);
    getGoalById(goalId, token)
      .then((serverGoal) => {
        if (serverGoal) {
          setGoal(serverGoal);
          if (serverGoal.priority) {
            setPriority(serverGoal.priority);
          }
          if (serverGoal.stages && serverGoal.stages.length > 0) {
            setStages(
              serverGoal.stages.map((st) => ({
                stage_id: st.stage_id,
                name: st.name,
                activity_count: st.activities?.length || 0,
              })),
            );
          }
        }
      })
      .catch((err) => {
        console.warn('No se pudo cargar el objetivo del servidor:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [goalId, token]);

  // 2. Cargar progreso del objetivo desde la API (HU-03)
  useEffect(() => {
    if (!goalId || !token) return;

    getGoalProgress(goalId, token)
      .then(setProgress)
      .catch((err) => {
        console.warn('No se pudo consultar el progreso de la meta:', err);
      });
  }, [goalId, token]);

  // 3. Modificar prioridad del objetivo (HU-06)
  const handleCyclePriority = async () => {
    if (!goalId || !token || isUpdatingPriority) return;

    const cycle: Record<string, 'high' | 'medium' | 'low'> = {
      baja: 'medium',
      low: 'medium',
      media: 'high',
      medium: 'high',
      alta: 'low',
      high: 'low',
    };

    const nextPriority = cycle[priority.toLowerCase()] || 'medium';
    setPriority(nextPriority);
    setIsUpdatingPriority(true);

    try {
      await updateGoalPriority(goalId, token, nextPriority);
    } catch (e) {
      console.warn('No se pudo actualizar la prioridad:', e);
    } finally {
      setIsUpdatingPriority(false);
    }
  };

  const goalTitle = goal?.title || params.title || 'Crear una aplicación web';
  const goalDueDate = goal?.due_date || params.targetDate;
  const goalDate = goalDueDate
    ? `Fecha límite: ${goalDueDate}`
    : 'Fecha límite - 30 jun 2025';

  const activityCount =
    progress?.total_activities ??
    stages.reduce((count, stage) => count + stage.activity_count, 0);

  const displayPriority =
    priority.toLowerCase() === 'high' || priority.toLowerCase() === 'alta'
      ? 'ALTA'
      : priority.toLowerCase() === 'low' || priority.toLowerCase() === 'baja'
        ? 'BAJA'
        : 'MEDIA';

  return (
    <Screen style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* Header Superior */}
          <View style={styles.topRow}>
            <View>
              <Text style={styles.badge}>TU PLAN PERSONALIZADO</Text>
              <Text style={styles.mainTitle}>Tu camino está listo</Text>
            </View>

            <View style={styles.avatarWrapper}>
              <View style={styles.avatarCircle}>
                <Feather name="smile" size={20} color="#174A62" />
              </View>
              <Text style={styles.avatarLabel}>¡Vamos!</Text>
            </View>
          </View>

          {/* Tarjeta Principal del Objetivo */}
          <View style={styles.goalCard}>
            <View style={styles.goalIconCircle}>
              <Feather name="target" size={22} color="#174A62" />
            </View>
            <View style={styles.goalTextContainer}>
              <Text style={styles.goalCardBadge}>TU OBJETIVO</Text>
              <Text style={styles.goalCardTitle}>{goalTitle}</Text>
              <Text style={styles.goalCardDate}>{goalDate}</Text>
            </View>
          </View>

          {/* 3 Mini Tarjetas de Métricas (Interactivas) */}
          <View style={styles.metricsRow}>
            <TouchableOpacity
              style={styles.miniMetricCard}
              onPress={handleCyclePriority}
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
                {params.hours ? `${params.hours} H` : '4 H'}
              </Text>
              <Text style={styles.miniMetricLabel}>Por semana</Text>
            </View>

            <View style={styles.miniMetricCard}>
              <Text style={styles.miniMetricValue}>
                {progress ? `${progress.progress_percentage}%` : '3 DÍAS'}
              </Text>
              <Text style={styles.miniMetricLabel}>
                {progress ? 'Progreso' : 'Disponibles'}
              </Text>
            </View>
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
                {progress ? `${progress.completed_activities} listas` : '4 semanas'}
              </Text>
            </Text>
          </View>

          {/* Tarjeta de Acceso a la Agenda Adaptada (HU-36) */}
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

          {/* Timeline de Etapas */}
          <View style={styles.timelineContainer}>
            <View style={styles.timelineLine} />
            {stages.map((stage, index) => {
              const isFirst = index === 0;
              return (
                <Pressable
                  key={stage.stage_id}
                  style={[styles.stageCard, styles.stageCardPending]}
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
                >
                  <View style={styles.stageHeader}>
                    <View style={styles.numberCircle}>
                      <Text style={styles.numberText}>
                        {String(index + 1).padStart(2, '0')}
                      </Text>
                    </View>

                    <View style={styles.stageInfo}>
                      <Text style={styles.stageBadge}>
                        {isFirst ? 'LISTA PARA EMPEZAR' : index === 1 ? 'SIGUIENTE' : 'DESPUÉS'}
                      </Text>
                      <Text style={styles.stageTitle}>
                        Etapa {index + 1} — {stage.name}
                      </Text>
                      <Text style={styles.stageSubtitle}>
                        {stage.activity_count} actividades · {index === 0 ? '1 semana' : index === 1 ? '2 semanas' : '1 semana'}
                      </Text>
                    </View>

                    <Feather name="chevron-right" size={18} color="#94A3B8" />
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Botón flotante para Volver al Inicio */}
      <TouchableOpacity
        style={styles.floatingMapBtn}
        activeOpacity={0.85}
        onPress={() => router.push('/home')}
      >
        <Feather name="grid" size={18} color="#FFFFFF" />
        <Text style={styles.floatingMapText}>Inicio</Text>
      </TouchableOpacity>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#FAF6F0',
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    paddingBottom: 90,
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
    alignItems: 'flex-start',
  },
  badge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#174A62',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F2C40',
    letterSpacing: -0.5,
  },
  avatarWrapper: {
    alignItems: 'center',
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#D8ECF8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#174A62',
    marginTop: 2,
  },
  goalCard: {
    backgroundColor: '#174A62',
    borderRadius: 22,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    boxShadow: '0px 8px 16px rgba(23, 74, 98, 0.15)',
    elevation: 4,
  },
  goalIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalTextContainer: {
    flex: 1,
  },
  goalCardBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#90C2DE',
    letterSpacing: 1,
    marginBottom: 2,
  },
  goalCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  goalCardDate: {
    fontSize: 11,
    color: '#D8ECF8',
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
  stageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    boxShadow: '0px 4px 12px rgba(23, 74, 98, 0.04)',
    elevation: 2,
  },
  stageCardPending: {},
  stageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  numberCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#D8ECF8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#174A62',
  },
  stageInfo: {
    flex: 1,
  },
  stageBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#627D98',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  stageTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F2C40',
    marginBottom: 2,
  },
  stageSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
  },
  floatingMapBtn: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    backgroundColor: '#174A62',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    boxShadow: '0px 8px 16px rgba(23, 74, 98, 0.3)',
    elevation: 5,
  },
  floatingMapText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
