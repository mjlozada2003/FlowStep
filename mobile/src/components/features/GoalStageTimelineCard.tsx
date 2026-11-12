import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface StageItem {
  stage_id: number;
  name: string;
  activities?: any[];
}

interface GoalStageTimelineCardProps {
  stage: StageItem;
  index: number;
  onPress: () => void;
}

export function GoalStageTimelineCard({ stage, index, onPress }: GoalStageTimelineCardProps) {
  const isFirst = index === 0;
  const stageActivityCount = stage.activities?.length ?? 0;

  return (
    <TouchableOpacity
      style={styles.stageCard}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.stageHeader}>
        <View style={styles.numberCircle}>
          <Text style={styles.numberText}>
            {String(index + 1).padStart(2, '0')}
          </Text>
        </View>

        <View style={styles.stageInfo}>
          <Text style={styles.stageBadge}>
            {isFirst ? 'PRIMERA ETAPA' : `ETAPA ${index + 1}`}
          </Text>
          <Text style={styles.stageTitle}>
            Etapa {index + 1} — {stage.name}
          </Text>
          <Text style={styles.stageSubtitle}>
            {stageActivityCount} actividades
          </Text>
        </View>

        <Feather name="chevron-right" size={18} color="#94A3B8" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  stageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    shadowColor: '#174A62',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    elevation: 2,
  },
  stageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  numberCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#D8ECF8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#174A62',
  },
  stageInfo: {
    flex: 1,
  },
  stageBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#627D98',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  stageTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F2C40',
    marginBottom: 2,
  },
  stageSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
  },
});