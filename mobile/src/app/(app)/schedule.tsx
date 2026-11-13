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

import { BrandHeader } from '@/components/ui/BrandHeader';
import { Screen } from '@/components/ui/Screen';
import { BackButton } from '@/components/ui/BackButton';
import { useAuth } from '@/contexts/auth-context';
import {
  getActivitySchedules,
  type ActivityScheduleVersion,
} from '@/services/api/stages';
import {
  getAvailability,
  getWeeklyAvailabilityMinutes,
} from '@/services/api/availability';
import {
  getGoalById,
  getUserGoals,
} from '@/services/api/goals';

import { ScheduleMetricsCard } from '@/components/features/ScheduleMetricsCard';
import { ScheduleItemCard, type ScheduleItemData } from '@/components/features/ScheduleItemCard';
import { ScheduleFreeTimeCard } from '@/components/features/ScheduleFreeTimeCard';

const SPANISH_DAYS = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];

export default function ScheduleScreen() {
  const params = useLocalSearchParams<{ goalId?: string; fromSuccess?: string }>();
  const { token } = useAuth();

  const [scheduleItems, setScheduleItems] = useState<ScheduleItemData[]>([]);
  const [targetStageId, setTargetStageId] = useState<number | null>(null);
  const [activeGoalId, setActiveGoalId] = useState<number | null>(null);
  const [totalSessions, setTotalSessions] = useState<number | null>(null);
  const [plannedTimeStr, setPlannedTimeStr] = useState<string>('—');
  const [availableTimeStr, setAvailableTimeStr] = useState<string>('—');
  const [freeTimeStr, setFreeTimeStr] = useState<string>('—');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isEmpty, setIsEmpty] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      if (!token) {
        return () => {
          isMounted = false;
        };
      }

      const loadScheduleData = async () => {
        try {
          let activeGoalId: number | null = null;
          if (params.goalId && /^\d+$/.test(params.goalId)) {
            activeGoalId = Number(params.goalId);
          } else {
            const userGoals = await getUserGoals(token);
            if (userGoals.length > 0) {
              activeGoalId = userGoals[0].goal_id;
            }
          }

          if (!activeGoalId) {
            if (isMounted) {
              setIsEmpty(true);
              setActiveGoalId(null);
              setScheduleItems([]);
              setTotalSessions(0);
            }
            return;
          }

          const [goalData, availabilities] = await Promise.all([
            getGoalById(activeGoalId, token),
            getAvailability(token),
          ]);

          if (!isMounted) return;
          setLoadError(null);
          setIsEmpty(false);

          const now = new Date();
          const weekStart = new Date(now);
          weekStart.setHours(0, 0, 0, 0);
          weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 7);
          const mappedItems: (ScheduleItemData | null)[] = await Promise.all(
            (goalData.stages ?? []).flatMap((stage, stageIdx) =>
              (stage.activities ?? []).map(async (activity) => {
                const schedules: ActivityScheduleVersion[] = await getActivitySchedules(
                  activity.activity_id,
                  token,
                );
                const sortedSchedules = [...schedules].sort(
                  (left, right) => left.version_number - right.version_number,
                );
                const latestSchedule = sortedSchedules[sortedSchedules.length - 1];
                if (!latestSchedule?.scheduled_date) return null;

                const scheduledDate = new Date(`${latestSchedule.scheduled_date}T00:00:00`);
                if (
                  Number.isNaN(scheduledDate.getTime()) ||
                  scheduledDate < weekStart ||
                  scheduledDate >= weekEnd
                ) {
                  return null;
                }
                const minutes = activity.estimated_minutes;
                const startTime = latestSchedule.start_time?.slice(0, 5);
                return {
                  id: activity.activity_id,
                  day: SPANISH_DAYS[scheduledDate.getDay()],
                  date: String(scheduledDate.getDate()),
                  scheduledDate: latestSchedule.scheduled_date,
                  time: `${startTime ? `${startTime} · ` : ''}${minutes !== null && minutes !== undefined ? `${minutes} min` : 'Duración no indicada'}`,
                  title: activity.title,
                  stage: `Etapa ${stageIdx + 1} · ${stage.name}`,
                  stageId: stage.stage_id,
                  status: activity.status === 'completed' ? 'COMPLETADA' : null,
                  durationMinutes: minutes ?? null,
                } as ScheduleItemData;
              }),
            ),
          );

          const items = mappedItems
            .filter((item): item is ScheduleItemData => item !== null)
            .sort((left, right) => left.scheduledDate.localeCompare(right.scheduledDate));
          const weeklyAvailableMinutes = getWeeklyAvailabilityMinutes(availabilities);
          const canCalculatePlannedMinutes = items.every(
            (item) => item.durationMinutes !== null,
          );
          const plannedMinutes = canCalculatePlannedMinutes
            ? items.reduce((total, item) => total + (item.durationMinutes ?? 0), 0)
            : null;

          setActiveGoalId(activeGoalId);
          setIsEmpty(false);
          setScheduleItems(items);
          setTotalSessions(items.length);
          setTargetStageId(items[0]?.stageId ?? goalData.stages?.[0]?.stage_id ?? null);
          setAvailableTimeStr(`${Number((weeklyAvailableMinutes / 60).toFixed(2))} h`);
          setPlannedTimeStr(
            plannedMinutes === null
              ? '—'
              : `${Math.floor(plannedMinutes / 60)} h ${plannedMinutes % 60} min`,
          );
          const freeMinutes =
            plannedMinutes === null
              ? null
              : Math.max(0, weeklyAvailableMinutes - plannedMinutes);
          setFreeTimeStr(
            freeMinutes === null
              ? '—'
              : `${Math.floor(freeMinutes / 60)} h ${freeMinutes % 60} min libres`,
          );
        } catch (error) {
          if (!isMounted) return;
          setScheduleItems([]);
          setLoadError(
            error instanceof Error ? error.message : 'No se pudo cargar la agenda.',
          );
        } finally {
          if (isMounted) setIsLoading(false);
        }
      };

      loadScheduleData();

      return () => {
        isMounted = false;
      };
    }, [params.goalId, token]),
  );

  const isScheduleLoading = isLoading && Boolean(token);
  const displayLoadError =
    loadError ??
    (!token ? 'Inicia sesión para consultar tu agenda y disponibilidad.' : null);

  const handleNavigateToStage = (stageId?: number) => {
    const finalStageId = stageId || targetStageId;
    if (!finalStageId || !activeGoalId) return;
    router.push({
      pathname: '/stage-detail',
      params: {
        stageId: String(finalStageId),
        goalId: String(activeGoalId),
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
            <BackButton
              onPress={() => {
                if (params.fromSuccess === '1') {
                  if (activeGoalId) {
                    router.replace({
                      pathname: '/goal-plan',
                      params: { goalId: String(activeGoalId) },
                    });
                  } else {
                    router.replace('/(app)/(tabs)/home');
                  }
                } else {
                  router.back();
                }
              }}
            />
            <Text style={styles.weekIndicator}>SEMANA ACTUAL</Text>
            <BrandHeader showTagline={false} />
          </View>

          <View style={styles.titleSection}>
            <Text style={styles.badge}>AGENDA ADAPTADA</Text>
            <Text style={styles.mainTitle}>Tu semana, a tu ritmo</Text>
            <Text style={styles.subtitle}>
              Una vista adaptada de cómo se distribuyen las actividades en tus horarios disponibles.
            </Text>
          </View>

          {/* Tarjeta de métricas semanales sincronizadas */}
          <ScheduleMetricsCard
            totalSessions={totalSessions}
            plannedTimeStr={plannedTimeStr}
            availableTimeStr={availableTimeStr}
          />

          {/* Lista de actividades programadas */}
          <View style={styles.activitiesList}>
            {isScheduleLoading ? (
              <ActivityIndicator size="small" color="#174A62" style={{ marginVertical: 20 }} />
            ) : (
              <>
                {displayLoadError ? <Text style={styles.errorText}>{displayLoadError}</Text> : null}
                {isEmpty ? (
                  <Text style={styles.emptyText}>Aún no tienes objetivos con agenda.</Text>
                ) : null}
                {!displayLoadError && !isEmpty && scheduleItems.length === 0 ? (
                  <Text style={styles.emptyText}>No hay actividades programadas para esta semana.</Text>
                ) : null}
                {scheduleItems.map((item) => (
                  <ScheduleItemCard
                    key={item.id}
                    item={item}
                    onPress={() => handleNavigateToStage(item.stageId)}
                  />
                ))}
              </>
            )}
          </View>

          {/* Tarjeta de tiempo libre */}
          <ScheduleFreeTimeCard freeTimeStr={freeTimeStr} />

          <TouchableOpacity
            style={[styles.submitButton, (!targetStageId || !activeGoalId) && styles.submitButtonDisabled]}
            onPress={() => handleNavigateToStage()}
            disabled={!targetStageId || !activeGoalId || isScheduleLoading}
            activeOpacity={0.85}
          >
            <Text style={styles.submitButtonText}>Ver actividades de la etapa</Text>
            <Feather name="arrow-right" size={20} color="#FFFFFF" style={styles.buttonArrow} />
          </TouchableOpacity>
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
    gap: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  weekIndicator: {
    fontSize: 11,
    fontWeight: '800',
    color: '#627D98',
    letterSpacing: 1,
  },
  titleSection: {
    marginTop: 4,
  },
  badge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#174A62',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F2C40',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#627D98',
    lineHeight: 19,
  },
  activitiesList: {
    gap: 12,
  },
  submitButton: {
    backgroundColor: '#174A62',
    height: 52,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#174A62',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    elevation: 3,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  buttonArrow: {
    marginLeft: 8,
  },
  submitButtonDisabled: {
    opacity: 0.55,
  },
  errorText: {
    color: '#C53030',
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    paddingVertical: 12,
  },
  emptyText: {
    color: '#627D98',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    paddingVertical: 16,
  },
});