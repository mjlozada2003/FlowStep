import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { BackButton } from '@/components/ui/BackButton';
import { Colors } from '@/constants/theme';

export default function CalendarScreen() {
  // Día seleccionado actualmente (mock inicial: 16 de junio)
  const [selectedDay, setSelectedDay] = useState(16);

  // Mock de días del mes de junio de 2025 que tienen actividades
  // types: 'completed' | 'pending' | 'none'
  const calendarDays = Array.from({ length: 30 }, (_, index) => {
    const day = index + 1;
    let status: 'completed' | 'pending' | 'none' = 'none';
    if ([10, 12].includes(day)) status = 'completed';
    if ([16, 18, 21, 23].includes(day)) status = 'pending';
    return { day, status };
  });

  // Actividades mock para el día seleccionado
  const selectedDateActivities = selectedDay === 16 ? [
    {
      id: 1,
      time: '18:00',
      title: 'Introducción a React',
      subtitle: 'Crear una aplicación web · 45 min',
      status: 'pending',
    },
    {
      id: 2,
      time: '18:00',
      title: 'Vocabulario cotidiano',
      subtitle: 'Mejorar mi inglés · 30 min',
      status: 'completed',
    },
  ] : [];

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
          <Text style={styles.selectedDateTitle}>Lunes, {selectedDay} de junio</Text>
          <Text style={styles.activitiesCountText}>{selectedDateActivities.length} actividades</Text>

          <View style={styles.activitiesList}>
            {selectedDateActivities.map((act) => (
              <TouchableOpacity
                key={act.id}
                style={styles.activityCard}
                activeOpacity={0.85}
                onPress={() => router.push('/activity-detail' as any)}
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