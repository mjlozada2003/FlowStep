import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface GoalNavigationCardsProps {
  onPressSchedule: () => void;
  onPressAnalytics: () => void;
}

export function GoalNavigationCards({ onPressSchedule, onPressAnalytics }: GoalNavigationCardsProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.scheduleAccessCard}
        activeOpacity={0.85}
        onPress={onPressSchedule}
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

      <TouchableOpacity
        style={styles.scheduleAccessCard}
        activeOpacity={0.85}
        onPress={onPressAnalytics}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
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
});