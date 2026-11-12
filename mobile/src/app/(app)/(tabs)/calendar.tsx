import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
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
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import {
  getCalendarData,
  type CalendarActivityItem,
  type CalendarDaySummary,
} from '@/services/api/calendar';

export default function CalendarScreen() {
  const { token } = useAuth();
  const [selectedDay, setSelectedDay] = useState(16);
  const [currentYear] = useState(2025);
  const [currentMonth] = useState(6); // Junio
  const [daySummaries, setDaySummaries] = useState<CalendarDaySummary[]>([]);
  const [allActivities, setAllActivities] = useState<CalendarActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!token) {
        setIsLoading(false);
        return;
      }

      getCalendarData(token, { month: currentMonth, year: currentYear })
        .then((res) => {
          if (!active) return;
          setDaySummaries(res.days || []);
          setAllActivities(res.activities || []);
        })
        .catch(() => {
          // Mantener estado previo
        })
        .finally(() => {
          if (active) setIsLoading(false);
        });

      return () => {
        active = false;
      };
    }, [token, currentMonth, currentYear]),
  );

  // Mapear los días del mes con el resumen de la base de datos
  const daysMap = useMemo(() => {
    const map = new Map<string, 'completed' | 'pending' | 'mixed' | 'none'>();
    for (const d of daySummaries) {
      const datePart = d.scheduled_date ? d.scheduled_date.slice(0, 10) : '';
      map.set(datePart, d.day_status);
    }
    return map;
  }, [daySummaries]);

  const calendarDays = useMemo(() => {
    return Array.from({ length: 30 }, (_, index) => {
      const day = index + 1;
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const status = daysMap.get(dateStr) || 'none';
      return { day, dateStr, status };
    });
  }, [currentYear, currentMonth, daysMap]);

  // Actividades para el día seleccionado
  const selectedDateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;

  const selectedDateActivities = useMemo(() => {
    const filtered = allActivities.filter(
      (a) => a.scheduled_date && a.scheduled_date.slice(0, 10) === selectedDateStr,
    );
    return filtered.map((act) => ({
      id: act.activity_id,
      goalId: act.goal_id,
      time: act.start_time ? act.start_time.slice(0, 5) : '18:00',
      title: act.title,
      subtitle: `${act.goal_title} · ${act.estimated_minutes || 30} min`,
      status: act.status,
    }));
  }, [allActivities, selectedDateStr]);

  const dayOfWeekNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const selectedDateObj = new Date(currentYear, currentMonth - 1, selectedDay);
  const selectedDayName = dayOfWeekNames[selectedDateObj.getDay()];

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
          <TouchableOpacity style={styles.todayButton} activeOpacity={0.8}>
            <Text style={styles.todayButtonText}>Hoy</Text>
          </TouchableOpacity>
        </View>

        {/* Título de Mes */}
        <View style={styles.monthTitleRow}>
          <Text style={styles.monthTitle}>Junio 2025</Text>
        </View>

        {/* Tarjeta del Calendario Mensual */}
        <View style={styles.calendarCard}>
          {/* Días de la semana */}
          <View style={styles.weekDaysRow}>
            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d, index) => (
              <Text key={index} style={styles.weekDayLabel}>{d}</Text>
            ))}
          </View>

          {/* Cuadrícula de días (Asumiendo inicio en Jueves para el 1 de junio de 2025 o simulación limpia) */}
          <View style={styles.daysGrid}>
            {/* Espacios vacíos iniciales para alinear el 1 de junio (ej. cae domingo o similar según prototipo) */}
            <View style={styles.dayCell} />
            <View style={styles.dayCell} />
            <View style={styles.dayCell} />
            <View style={styles.dayCell} />
            <View style={styles.dayCell} />
            <View style={styles.dayCell} />

            {calendarDays.map((item) => {
              const isSelected = selectedDay === item.day;
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
                  {/* Indicador de punto */}
                  {item.status === 'completed' ? (
                    <View style={[styles.dot, styles.dotCompleted, isSelected && styles.selectedDot]} />
                  ) : item.status === 'pending' ? (
                    <View style={[styles.dot, styles.dotPending, isSelected && styles.selectedDot]} />
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
          </View>
        </View>

        {/* Sección de Detalle del Día */}
        <View style={styles.dayDetailSection}>
          <Text style={styles.selectedDateTitle}>{selectedDayName}, {selectedDay} de junio</Text>
          <Text style={styles.activitiesCountText}>{selectedDateActivities.length} {selectedDateActivities.length === 1 ? 'actividad' : 'actividades'}</Text>

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
                <View style={[
                  styles.activityIndicatorBar,
                  act.status === 'completed' ? styles.barCompleted : styles.barPending
                ]} />
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
              <Text style={styles.noActivitiesText}>No hay actividades programadas para este día.</Text>
            )}
          </View>
        </View>

        {/* Banner Sincronizado */}
        <View style={styles.syncBanner}>
          <View style={styles.syncIconBox}>
            <Feather name="calendar" size={18} color="#174A62" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.syncTitle}>Calendario sincronizado</Text>
            <Text style={styles.syncSubtitle}>Los cambios de fecha y actividades se reflejan aquí.</Text>
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
  monthTitleRow: {
    marginTop: 4,
  },
  monthTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F2C40',
    letterSpacing: -0.5,
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
    gap: 24,
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