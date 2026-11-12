import { StyleSheet, Text, View } from 'react-native';

interface GoalSuccessProgressCardProps {
  stageTitle?: string;
  progressPercent: number;
  completedCount: number;
  totalCount: number;
}

export function GoalSuccessProgressCard({
  stageTitle,
  progressPercent,
  completedCount,
  totalCount,
}: GoalSuccessProgressCardProps) {
  return (
    <View style={styles.progressCard}>
      <View style={styles.progressHeaderRow}>
        <Text style={styles.progressCardTitle}>
          ETAPA · {stageTitle || 'Aprendizaje'}
        </Text>
        <Text style={styles.progressPercentText}>{progressPercent}%</Text>
      </View>
      <View style={styles.progressBarBackground}>
        <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
      </View>
      <Text style={styles.progressFooterText}>
        {completedCount} de {totalCount} actividades completadas
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#174A62',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    elevation: 4,
    gap: 10,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressCardTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#174A62',
    letterSpacing: 1,
  },
  progressPercentText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#174A62',
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#174A62',
    borderRadius: 4,
  },
  progressFooterText: {
    fontSize: 11,
    color: '#627D98',
  },
});