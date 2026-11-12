import { Feather } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface GoalMetricsRowProps {
  displayPriority: string;
  isUpdatingPriority: boolean;
  onPressPriority: () => void;
  isPriorityDisabled: boolean;
  weeklyHoursLabel: string;
  progressPercentage?: string | null;
  onPressProgress: () => void;
}

export function GoalMetricsRow({
  displayPriority,
  isUpdatingPriority,
  onPressPriority,
  isPriorityDisabled,
  weeklyHoursLabel,
  progressPercentage,
  onPressProgress,
}: GoalMetricsRowProps) {
  return (
    <View style={styles.metricsRow}>
      <TouchableOpacity
        style={styles.miniMetricCard}
        onPress={onPressPriority}
        disabled={isPriorityDisabled}
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
        <Text style={styles.miniMetricValue}>{weeklyHoursLabel}</Text>
        <Text style={styles.miniMetricLabel}>Por semana</Text>
      </View>

      <TouchableOpacity
        style={styles.miniMetricCard}
        activeOpacity={0.7}
        onPress={onPressProgress}
      >
        <Text style={styles.miniMetricValue}>
          {progressPercentage ? `${progressPercentage}%` : '—'}
        </Text>
        <Text style={styles.miniMetricLabel}>Progreso (ver)</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
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
});