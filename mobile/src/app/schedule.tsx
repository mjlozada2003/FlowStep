import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
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
import { getAvailability } from '@/services/api/availability';
import { getGoalById, getUserGoals } from '@/services/api/goals';

interface ScheduleItem {
  id: number;
  day: string;
  date: string;
  time: string;
  title: string;
  stage: string;
  stageId?: number;
  status: string | null;
}

const DEFAULT_SCHEDULE_ITEMS: ScheduleItem[] = [
  {
    id: 1,
    day: 'LUN',
    date: '16',
    time: '18:00 · 45 min',
    title: 'Introducción a React',
    stage: 'Etapa 1 · Aprendizaje',
    stageId: 1,
    status: 'PRÓXIMA',
  },
  {
    id: 2,
    day: 'MIÉ',
    date: '18',
    time: '18:00 · 60 min',
    title: 'Componentes de React',
    stage: 'Etapa 1 · Aprendizaje',
    stageId: 1,
    status: null,
  },
  {
    id: 3,
    day: 'SÁB',
    date: '21',
    time: '10:00 · 60 min',
    title: 'Hooks',
    stage: 'Etapa 1 · Aprendizaje',
    stageId: 1,
    status: null,
  },
];

const SPANISH_DAYS = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];

export default function ScheduleScreen() {
  const params = useLocalSearchParams<{ goalId?: string }>();
  const { token } = useAuth();

  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>(DEFAULT_SCHEDULE_ITEMS);
  const [targetStageId, setTargetStageId] = useState<number | null>(null);
  const [totalSessions, setTotalSessions] = useState<number>(3);
  const [plannedTimeStr, setPlannedTimeStr] = useState<string>('2 h 45');
  const [availableTimeStr, setAvailableTimeStr] = useState<string>('4 h');
  const [freeTimeStr, setFreeTimeStr] = useState<string>('1 h 15 min libres');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!token) return;

    let isMounted = true;
    setIsLoading(true);

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

        if (!activeGoalId) return;

        // Consultar objetivo completo con etapas y actividades
        const goalData = await getGoalById(activeGoalId, token);

        // Consultar disponibilidad configurada del usuario
        let weeklyAvailableHours = 4;
        try {
          const availabilities = await getAvailability(token);
          if (availabilities && availabilities.length > 0) {
            let totalAvailableMinutes = 0;
            for (const slot of availabilities) {
              const [startH, startM] = slot.start_time.split(':').map(Number);
              const [endH, endM] = slot.end_time.split(':').map(Number);
              const diff = (endH * 60 + (endM || 0)) - (startH * 60 + (startM || 0));
              if (diff > 0) totalAvailableMinutes += diff;
            }
            if (totalAvailableMinutes > 0) {
              weeklyAvailableHours = Math.round((totalAvailableMinutes / 60) * 10) / 10;
            }
          }
        } catch {}

        if (!isMounted) return;

        // Extraer actividades con fechas programadas
        const items: ScheduleItem[] = [];
        let totalPlannedMinutes = 0;
        let firstStageId: number | null = null;

        if (goalData?.stages) {
          goalData.stages.forEach((stage, stageIdx) => {
            if (!firstStageId && stage.stage_id) firstStageId = stage.stage_id;

            (stage.activities || []).forEach((act) => {
              const minutes = act.estimated_minutes || 30;
              totalPlannedMinutes += minutes;

              let itemDay = 'LUN';
              let itemDate = '16';
              let startTime = '18:00';

              if (act.schedules && act.schedules.length > 0) {
                const latestSchedule = act.schedules[act.schedules.length - 1];
                if (latestSchedule.scheduled_date) {
                  const dateObj = new Date(latestSchedule.scheduled_date + 'T00:00:00');
                  itemDay = SPANISH_DAYS[dateObj.getDay()] || 'LUN';
                  itemDate = String(dateObj.getDate());
                }
                if (latestSchedule.start_time) {
                  startTime = latestSchedule.start_time.slice(0, 5);
                }
              }

              items.push({
                id: act.activity_id,
                day: itemDay,
                date: itemDate,
                time: `${startTime} · ${minutes} min`,
                title: act.title,
                stage: `Etapa ${stageIdx + 1} · ${stage.name}`,
                stageId: stage.stage_id,
                status: act.status === 'completed' ? 'COMPLETADA' : items.length === 0 ? 'PRÓXIMA' : null,
              });
            });
          });
        }

        if (items.length > 0) {
          setScheduleItems(items.slice(0, 7)); // Mostrar las de esta semana
          setTotalSessions(items.length);
          if (firstStageId) setTargetStageId(firstStageId);

          const plannedHours = Math.floor(totalPlannedMinutes / 60);
          const plannedMins = totalPlannedMinutes % 60;
          setPlannedTimeStr(
            plannedHours > 0 ? `${plannedHours} h ${plannedMins > 0 ? `${plannedMins} m` : ''}` : `${plannedMins} min`,
          );

          setAvailableTimeStr(`${weeklyAvailableHours} h`);

          const freeMinutes = Math.max(0, weeklyAvailableHours * 60 - totalPlannedMinutes);
          const freeH = Math.floor(freeMinutes / 60);
          const freeM = freeMinutes % 60;
          setFreeTimeStr(
            freeH > 0
              ? `${freeH} h ${freeM > 0 ? `${freeM} min` : ''} libres`
              : `${freeM} min libres`,
          );
        }
      } catch (e) {
        console.warn('Error cargando la agenda adaptada del backend:', e);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadScheduleData();

    return () => {
      isMounted = false;
    };
  }, [params.goalId, token]);

  const handleNavigateToStage = (stageId?: number) => {
    const finalStageId = stageId || targetStageId || 1;
    router.push({
      pathname: '/stage-detail',
      params: {
        stageId: String(finalStageId),
        goalId: params.goalId || '',
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
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Feather name="chevron-left" size={24} color="#0F2C40" />
            </TouchableOpacity>
            <Text style={styles.weekIndicator}>SEMANA 1</Text>
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
          <View style={styles.metricsCard}>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{totalSessions}</Text>
              <Text style={styles.metricLabel}>sesiones</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{plannedTimeStr}</Text>
              <Text style={styles.metricLabel}>planificadas</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{availableTimeStr}</Text>
              <Text style={styles.metricLabel}>disponibles</Text>
            </View>
          </View>

          {/* Lista de actividades programadas */}
          <View style={styles.activitiesList}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#174A62" style={{ marginVertical: 20 }} />
            ) : (
              scheduleItems.map((item) => {
                const isNext = item.status === 'PRÓXIMA';
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.activityCard,
                      isNext && styles.activityCardNext,
                    ]}
                    activeOpacity={0.85}
                    onPress={() => handleNavigateToStage(item.stageId)}
                  >
                    <View style={styles.dateBox}>
                      <Text style={styles.dateBoxDay}>{item.day}</Text>
                      <Text style={styles.dateBoxNum}>{item.date}</Text>
                    </View>

                    <View style={styles.activityInfo}>
                      <View style={styles.activityHeaderRow}>
                        <Text style={styles.activityTime}>{item.time}</Text>
                        {item.status ? (
                          <View style={styles.statusBadge}>
                            <Text style={styles.statusBadgeText}>{item.status}</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.activityTitle}>{item.title}</Text>
                      <Text style={styles.activityStage}>{item.stage}</Text>
                    </View>

                    <Feather name="chevron-right" size={18} color="#94A3B8" />
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          <View style={styles.freeTimeCard}>
            <Text style={styles.freeTimeTitle}>{freeTimeStr}</Text>
            <Text style={styles.freeTimeSubtitle}>
              Tu semana conserva margen para avanzar sin sobrecarga.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={() => handleNavigateToStage()}
            activeOpacity={0.85}
          >
            <Text style={styles.submitButtonText}>Ver actividades de la etapa</Text>
            <Feather name="arrow-right" size={20} color="#FFFFFF" style={styles.buttonArrow} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Botón flotante para ver el mapa/roadmap general */}
      <TouchableOpacity
        style={styles.floatingMapBtn}
        activeOpacity={0.85}
        onPress={() => router.push('/goal-plan')}
      >
        <Feather name="grid" size={18} color="#FFFFFF" />
        <Text style={styles.floatingMapText}>Mapa</Text>
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
    gap: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.05)',
    elevation: 2,
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
  metricsCard: {
    backgroundColor: '#174A62',
    borderRadius: 24,
    paddingVertical: 18,
    paddingHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    boxShadow: '0px 8px 16px rgba(23, 74, 98, 0.15)',
    elevation: 4,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 11,
    color: '#90C2DE',
    fontWeight: '600',
  },
  metricDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  activitiesList: {
    gap: 12,
  },
  activityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    boxShadow: '0px 4px 12px rgba(23, 74, 98, 0.04)',
    elevation: 2,
  },
  activityCardNext: {
    borderColor: '#174A62',
    borderWidth: 1.5,
  },
  dateBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#D8ECF8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateBoxDay: {
    fontSize: 10,
    fontWeight: '800',
    color: '#174A62',
    letterSpacing: 0.5,
  },
  dateBoxNum: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F2C40',
  },
  activityInfo: {
    flex: 1,
  },
  activityHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 11,
    color: '#627D98',
    fontWeight: '600',
  },
  statusBadge: {
    backgroundColor: '#E6F4EA',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#137333',
    letterSpacing: 0.5,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F2C40',
    marginBottom: 2,
  },
  activityStage: {
    fontSize: 12,
    color: '#94A3B8',
  },
  freeTimeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 2,
  },
  freeTimeTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F2C40',
  },
  freeTimeSubtitle: {
    fontSize: 12,
    color: '#627D98',
  },
  submitButton: {
    backgroundColor: '#174A62',
    height: 52,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    boxShadow: '0px 4px 8px rgba(23, 74, 98, 0.25)',
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
