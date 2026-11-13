import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
  getCalendarData,
  type CalendarActivityItem,
  type CalendarDaySummary,
} from '@/services/api/calendar';

function formatDateKey(val: any): string {
  if (!val) return '';
  if (typeof val === 'string') return val.slice(0, 10);
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(val).slice(0, 10);
}

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const DAY_OF_WEEK_NAMES = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
];

export default function CalendarScreen() {
  const { token } = useAuth();

  const initialDate = useMemo(() => new Date(), []);
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState(initialDate.getDate());
  const [daySummaries, setDaySummaries] = useState<CalendarDaySummary[]>([]);
  const [allActivities, setAllActivities] = useState<CalendarActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadCalendar = useCallback(() => {
    let active = true;
    if (!token) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    getCalendarData(token, { month: currentMonth, year: currentYear })
      .then((res) => {
        if (!active) return;
        setDaySummaries(res.days || []);
        setAllActivities(res.activities || []);
      })
      .catch(() => {
        // Mantener estado previo en caso de fallo
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token, currentMonth, currentYear]);

  useFocusEffect(
    useCallback(() => {
      const cleanup = loadCalendar();
      return cleanup;
    }, [loadCalendar]),
  );

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
    setSelectedDay(1);
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
    setSelectedDay(1);
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth() + 1);
    setSelectedDay(today.getDate());
  };

  const daysInMonth = useMemo(() => {
    return new Date(currentYear, currentMonth, 0).getDate();
  }, [currentYear, currentMonth]);

  const blankDaysCount = useMemo(() => {
    // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
    // Cuadrícula que inicia en Lunes: Lunes = 0, Domingo = 6
    const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay();
    return (firstDay + 6) % 7;
  }, [currentYear, currentMonth]);

  // Mapear los días del mes con el resumen de la base de datos (v_calendar_day_summary)
  const daysMap = useMemo(() => {
    const map = new Map<string, 'completed' | 'pending' | 'mixed' | 'overdue' | 'none'>();
    for (const d of daySummaries) {
      const datePart = formatDateKey(d.scheduled_date);
      if (datePart) {
        map.set(datePart, d.day_status as any);
      }
    }
    return map;
  }, [daySummaries]);

  const calendarDays = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const status = daysMap.get(dateStr) || 'none';
      return { day, dateStr, status };
    });
  }, [currentYear, currentMonth, daysInMonth, daysMap]);

  // Actividades para el día seleccionado
  const validSelectedDay = Math.min(selectedDay, daysInMonth);
  const selectedDateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(validSelectedDay).padStart(2, '0')}`;

  // Si hay actividades en el mes pero el día seleccionado no tiene ninguna, autoseleccionar el primer día con actividades
  useEffect(() => {
    if (allActivities.length > 0) {
      const monthPrefix = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
      const hasCurrent = allActivities.some(
        (a) => formatDateKey(a.scheduled_date) === selectedDateStr,
      );
      if (!hasCurrent) {
        const match = allActivities.find((a) => {
          const key = formatDateKey(a.scheduled_date);
          return key.startsWith(monthPrefix);
        });
        if (match) {
          const key = formatDateKey(match.scheduled_date);
          const dayNum = parseInt(key.slice(8, 10), 10);
          if (!isNaN(dayNum) && dayNum >= 1 && dayNum <= daysInMonth) {
            setSelectedDay(dayNum);
          }
        }
      }
    }
  }, [allActivities, currentMonth, currentYear, daysInMonth]);

  const selectedDateActivities = useMemo(() => {
    const filtered = allActivities.filter((a) => {
      const datePart = formatDateKey(a.scheduled_date);
      return datePart === selectedDateStr;
    });
    return filtered.map((act) => ({
      id: act.activity_id,
      goalId: act.goal_id,
      time: act.start_time ? String(act.start_time).slice(0, 5) : '18:00',
      title: act.title || (act as any).activity_title || 'Actividad programada',
      subtitle: `${act.goal_title || 'Objetivo'} · ${act.estimated_minutes || 30} min`,
      status: act.status || (act as any).activity_status || 'pending',
    }));
  }, [allActivities, selectedDateStr]);

  const selectedDateObj = new Date(currentYear, currentMonth - 1, validSelectedDay);
  const selectedDayName = DAY_OF_WEEK_NAMES[selectedDateObj.getDay()];
  const currentMonthName = MONTH_NAMES[currentMonth - 1];

  return (
    <Screen style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Cabecera superior */}
        <View style={styles.topHeader}>
          <BackButton />
          <Text style={styles.headerTag}>PLANIFICACIÓN</Text>
          <TouchableOpacity
            style={styles.todayButton}
            activeOpacity={0.8}
            onPress={handleToday}
          >
            <Text style={styles.todayButtonText}>Hoy</Text>
          </TouchableOpacity>
        </View>

        {/* Título de Mes con botones de navegación anterior / siguiente */}
        <View style={styles.monthHeaderRow}>
          <Text style={styles.monthTitle}>
            {currentMonthName} {currentYear}
          </Text>
          <View style={styles.monthNavButtons}>
            <TouchableOpacity
              style={styles.navIconButton}
              activeOpacity={0.7}
              onPress={handlePrevMonth}
              accessibilityLabel="Mes anterior"
            >
              <Feather name="chevron-left" size={20} color="#174A62" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.navIconButton}
              activeOpacity={0.7}
              onPress={handleNextMonth}
              accessibilityLabel="Mes siguiente"
            >
              <Feather name="chevron-right" size={20} color="#174A62" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tarjeta del Calendario Mensual */}
        <View style={styles.calendarCard}>
          {/* Días de la semana */}
          <View style={styles.weekDaysRow}>
            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d, index) => (
              <Text key={index} style={styles.weekDayLabel}>
                {d}
              </Text>
            ))}
          </View>

          {/* Cuadrícula de días calculada dinámicamente */}
          <View style={styles.daysGrid}>
            {Array.from({ length: blankDaysCount }).map((_, idx) => (
              <View key={`blank-${idx}`} style={styles.dayCell} />
            ))}

            {calendarDays.map((item) => {
              const isSelected = validSelectedDay === item.day;
              return (
                <TouchableOpacity
                  key={item.day}
                  style={[styles.dayCell, isSelected && styles.selectedDayCell]}
                  onPress={() => setSelectedDay(item.day)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.dayText, isSelected && styles.selectedDayText]}>
                    {item.day}
                  </Text>
                  {/* Indicador de punto según estado real de v_calendar_day_summary */}
                  {item.status === 'completed' ? (
                    <View
                      style={[
                        styles.dot,
                        styles.dotCompleted,
                        isSelected && styles.selectedDot,
                      ]}
                    />
                  ) : item.status === 'pending' ? (
                    <View
                      style={[
                        styles.dot,
                        styles.dotPending,
                        isSelected && styles.selectedDot,
                      ]}
                    />
                  ) : item.status === 'mixed' ? (
                    <View
                      style={[
                        styles.dot,
                        styles.dotMixed,
                        isSelected && styles.selectedDot,
                      ]}
                    />
                  ) : item.status === 'overdue' ? (
                    <View
                      style={[
                        styles.dot,
                        styles.dotOverdue,
                        isSelected && styles.selectedDot,
                      ]}
                    />
                  ) : (
                    <View style={styles.dotHidden} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Leyenda */}
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.dot, styles.dotPending]} />
              <Text style={styles.legendText}>Pendiente</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, styles.dotCompleted]} />
              <Text style={styles.legendText}>Completada</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, styles.dotMixed]} />
              <Text style={styles.legendText}>Mixto</Text>
            </View>
          </View>
        </View>

        {/* Sección de Detalle del Día */}
        <View style={styles.dayDetailSection}>
          <Text style={styles.selectedDateTitle}>
            {selectedDayName}, {validSelectedDay} de {currentMonthName.toLowerCase()}
          </Text>
          <Text style={styles.activitiesCountText}>
            {selectedDateActivities.length}{' '}
            {selectedDateActivities.length === 1 ? 'actividad' : 'actividades'}
          </Text>

          {isLoading ? (
            <ActivityIndicator size="small" color="#174A62" style={{ marginVertical: 16 }} />
          ) : (
            <View style={styles.activitiesList}>
              {selectedDateActivities.map((act) => (
                <TouchableOpacity
                  key={act.id}
                  style={styles.activityCard}
                  activeOpacity={0.85}
                  onPress={() =>
                    router.push({
                      pathname: '/goal-plan',
                      params: { goalId: String(act.goalId) },
                    })
                  }
                >
                  <View
                    style={[
                      styles.activityIndicatorBar,
                      act.status === 'completed'
                        ? styles.barCompleted
                        : styles.barPending,
                    ]}
                  />
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTime}>{act.time}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.activityTitle}>{act.title}</Text>
                      <Text style={styles.activitySubtitle}>{act.subtitle}</Text>
                    </View>
                  </View>
                  <Feather name="chevron-right" size={18} color="#627D98" />
                </TouchableOpacity>
              ))}

              {selectedDateActivities.length === 0 && (
                <Text style={styles.noActivitiesText}>
                  No hay actividades programadas para este día.
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Banner Sincronizado */}
        <View style={styles.syncBanner}>
          <View style={styles.syncIconBox}>
            <Feather name="calendar" size={18} color="#174A62" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.syncTitle}>Calendario sincronizado</Text>
            <Text style={styles.syncSubtitle}>
              Los cambios de fecha y actividades se reflejan aquí en tiempo real.
            </Text>
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
    paddingTop: 16,
    paddingBottom: 40,
    gap: 16,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#627D98',
    letterSpacing: 1.2,
  },
  todayButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D8ECF8',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
  },
  todayButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#174A62',
  },
  monthHeaderRow: {
    marginTop: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monthTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F2C40',
    letterSpacing: -0.5,
  },
  monthNavButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  navIconButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D8ECF8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#174A62',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    elevation: 2,
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  weekDayLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    width: 32,
    textAlign: 'center',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  dayCell: {
    width: '14.28%',
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    borderRadius: 12,
  },
  selectedDayCell: {
    backgroundColor: '#174A62',
  },
  dayText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F2C40',
  },
  selectedDayText: {
    color: '#FFFFFF',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  dotPending: {
    backgroundColor: '#3182CE',
  },
  dotCompleted: {
    backgroundColor: '#319795',
  },
  dotMixed: {
    backgroundColor: '#DD6B20',
  },
  dotOverdue: {
    backgroundColor: '#E53E3E',
  },
  selectedDot: {
    backgroundColor: '#90CDF4',
  },
  dotHidden: {
    height: 4,
    marginTop: 2,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 14,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendText: {
    fontSize: 11,
    color: '#627D98',
    fontWeight: '600',
  },
  dayDetailSection: {
    marginTop: 8,
    gap: 8,
  },
  selectedDateTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F2C40',
  },
  activitiesCountText: {
    fontSize: 11,
    color: '#627D98',
    fontWeight: '600',
    marginBottom: 4,
  },
  activitiesList: {
    gap: 10,
  },
  activityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  activityIndicatorBar: {
    width: 4,
    height: 32,
    borderRadius: 2,
  },
  barPending: {
    backgroundColor: '#3182CE',
  },
  barCompleted: {
    backgroundColor: '#319795',
  },
  activityContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 14,
  },
  activityTime: {
    fontSize: 13,
    fontWeight: '800',
    color: '#174A62',
  },
  activityTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F2C40',
  },
  activitySubtitle: {
    fontSize: 11,
    color: '#627D98',
    marginTop: 2,
  },
  noActivitiesText: {
    textAlign: 'center',
    color: '#627D98',
    fontSize: 12,
    paddingVertical: 12,
  },
  syncBanner: {
    backgroundColor: '#EBF5FB',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#D8ECF8',
    marginTop: 8,
  },
  syncIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  syncTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F2C40',
  },
  syncSubtitle: {
    fontSize: 11,
    color: '#627D98',
    marginTop: 2,
  },
});
