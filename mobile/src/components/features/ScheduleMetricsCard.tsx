import { StyleSheet, Text, View } from 'react-native';

interface ScheduleMetricsCardProps {
  totalSessions: number | null;
  plannedTimeStr: string;
  availableTimeStr: string;
}

export function ScheduleMetricsCard({
  totalSessions,
  plannedTimeStr,
  availableTimeStr,
}: ScheduleMetricsCardProps) {
  return (
    <View style={styles.metricsCard}>
      <View style={styles.metricItem}>
        <Text style={styles.metricValue}>{totalSessions ?? '—'}</Text>
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
  );
}

const styles = StyleSheet.create({
  metricsCard: {
    backgroundColor: '#174A62',
    borderRadius: 24,
    paddingVertical: 18,
    paddingHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: '#174A62',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
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
});