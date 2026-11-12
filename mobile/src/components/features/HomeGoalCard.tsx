import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Colors, Spacing } from '@/constants/theme';
import type { CreatedGoal, GoalProgress } from '@/services/api/goals';

interface HomeGoalCardProps {
  goal: CreatedGoal;
  detail: CreatedGoal | null;
  progress: GoalProgress | null;
  onPress: () => void;
}

export function HomeGoalCard({ goal, detail, progress, onPress }: HomeGoalCardProps) {
  const progressPercent = progress?.progress_percentage ?? 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressedCard}
    >
      <Card style={styles.goalCard}>
        <View style={styles.goalHeader}>
          <View style={styles.goalIcon}>
            <Text style={styles.goalIconText}>🎯</Text>
          </View>

          <View style={styles.goalInfo}>
            <Text style={styles.goalTitle}>{goal.title}</Text>
            <Text style={styles.goalStages}>
              {detail?.stages ? `${detail.stages.length} etapas` : 'Etapas no disponibles'}
            </Text>
          </View>

          <Text style={styles.progressText}>
            {progress ? `${progressPercent}%` : '—'}
          </Text>
        </View>

        <View style={styles.progressBackground}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${Math.min(100, Math.max(0, progressPercent))}%`,
              },
            ]}
          />
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  goalCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 20,
    padding: Spacing.three,
    marginBottom: Spacing.two,
    borderWidth: 1.2,
    borderColor: Colors.light.border,
    shadowColor: '#174A62',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  goalIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FAF6F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.two,
  },
  goalIconText: {
    fontSize: 20,
  },
  goalInfo: {
    flex: 1,
  },
  goalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 2,
  },
  goalStages: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.light.primary,
  },
  progressBackground: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.light.primary,
    borderRadius: 3,
  },
  pressedCard: {
    transform: [{ scale: 0.99 }],
  },
});