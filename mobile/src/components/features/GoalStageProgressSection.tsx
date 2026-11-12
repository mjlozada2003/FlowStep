import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface StageProgressItem {
  stage_id?: number;
  stage_name: string;
  sort_order?: number;
  total_activities: number;
  completed_activities: number;
  progress_percentage: string;
}

interface GoalStageProgressSectionProps {
  stages: StageProgressItem[];
  onPressHistory: () => void;
}

export function GoalStageProgressSection({ stages, onPressHistory }: GoalStageProgressSectionProps) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRowSpace}>
        <Text style={styles.sectionTitle}>Progreso por etapa</Text>
        <TouchableOpacity onPress={onPressHistory}>
          <Text style={styles.linkText}>Ver historial</Text>
        </TouchableOpacity>
      </View>

      {stages && stages.length > 0 ? (
        stages.map((stage, idx) => {
          const stagePercent = Math.min(
            100,
            Math.max(0, Math.round(parseFloat(stage.progress_percentage || '0')))
          );
          return (
            <View key={stage.stage_id ?? idx} style={styles.stageProgressItem}>
              <View style={styles.stageProgressHeader}>
                <View style={styles.stageMiniBadge}>
                  <Text style={styles.stageMiniText}>
                    {String(stage.sort_order ?? idx + 1).padStart(2, '0')}
                  </Text>
                </View>
                <Text style={styles.stageNameText} numberOfLines={1}>
                  {stage.stage_name}
                </Text>
                <Text style={styles.stageCountText}>
                  {stage.completed_activities} de {stage.total_activities}
                </Text>
                <Text style={styles.stagePercentText}>{stagePercent}%</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View
                  style={[styles.progressBarFill, { width: `${stagePercent}%` }]}
                />
              </View>
            </View>
          );
        })
      ) : (
        <Text style={styles.emptyStagesText}>No hay etapas registradas para este objetivo.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E4E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeaderRowSpace: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0F2C40',
  },
  linkText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#174A62',
  },
  stageProgressItem: {
    marginBottom: 12,
  },
  stageProgressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  stageMiniBadge: {
    backgroundColor: '#E2EEF1',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 8,
  },
  stageMiniText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#174A62',
  },
  stageNameText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0F2C40',
    flex: 1,
  },
  stageCountText: {
    fontSize: 11,
    color: '#627D98',
    marginRight: 8,
  },
  stagePercentText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#174A62',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#EDF2F7',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#174A62',
    borderRadius: 4,
  },
  emptyStagesText: {
    fontSize: 12,
    color: '#627D98',
    fontStyle: 'italic',
    paddingVertical: 8,
  },
});