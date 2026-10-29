import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { BrandHeader } from '@/components/ui/BrandHeader';
import { Screen } from '@/components/ui/Screen';

interface GoalStagePreview {
  stage_id: number;
  name: string;
  activity_count: number;
}

function isGoalStagePreview(value: unknown): value is GoalStagePreview {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('stage_id' in value) ||
    typeof value.stage_id !== 'number' ||
    !('name' in value) ||
    typeof value.name !== 'string' ||
    !('activity_count' in value) ||
    typeof value.activity_count !== 'number' ||
    !Number.isInteger(value.activity_count) ||
    value.activity_count < 0
  ) {
    return false;
  }

  return true;
}

export default function GoalPlanScreen() {
  const params = useLocalSearchParams<{
    goalId?: string;
    title?: string;
    targetDate?: string;
    stages?: string;
  }>();
  const goalTitle = params.title || 'Objetivo';
  const goalDate = params.targetDate
    ? `Fecha límite: ${params.targetDate}`
    : 'Sin fecha límite';
  const parsedGoalId = /^\d+$/.test(params.goalId ?? '')
    ? Number(params.goalId)
    : null;
  const goalId =
    parsedGoalId !== null &&
    Number.isSafeInteger(parsedGoalId) &&
    parsedGoalId > 0
      ? parsedGoalId
      : null;
  const hasGoalId = goalId !== null;

  let stages: GoalStagePreview[] = [];
  let hasInvalidStages = false;
  if (params.stages) {
    try {
      const parsedStages: unknown = JSON.parse(params.stages);
      if (Array.isArray(parsedStages) && parsedStages.every(isGoalStagePreview)) {
        stages = parsedStages;
      } else {
        hasInvalidStages = true;
      }
    } catch {
      hasInvalidStages = true;
    }
  }

  const activityCount = stages.reduce(
    (count, stage) => count + stage.activity_count,
    0,
  );
  const hasPlan =
    hasGoalId && !hasInvalidStages && stages.length > 0 && activityCount > 0;

  return (
    <Screen style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <View style={styles.topRow}>
            <BrandHeader showTagline={false} />
            <View style={styles.avatarWrapper}>
              <View style={styles.avatarCircle}>
                <Feather name="smile" size={22} color="#174A62" />
              </View>
              <Text style={styles.avatarLabel}>¡Vamos!</Text>
            </View>
          </View>

          <View style={styles.titleSection}>
            <Text style={styles.badge}>TU PLAN PERSONALIZADO</Text>
            <Text style={styles.mainTitle}>
              {hasPlan ? 'Tu camino está listo' : 'Tu objetivo fue registrado'}
            </Text>
          </View>

          <View style={styles.goalCard}>
            <View style={styles.goalIconCircle}>
              <Feather name="target" size={24} color="#174A62" />
            </View>
            <View style={styles.goalTextContainer}>
              <Text style={styles.goalCardBadge}>TU OBJETIVO</Text>
              <Text style={styles.goalCardTitle}>{goalTitle}</Text>
              <Text style={styles.goalCardDate}>{goalDate}</Text>
            </View>
          </View>

          {hasPlan ? (
            <>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryText}>
                  <Text style={styles.summaryBold}>{stages.length}</Text>{' '}
                  {stages.length === 1 ? 'etapa' : 'etapas'}
                </Text>
                <Text style={styles.summaryDot}>•</Text>
                <Text style={styles.summaryText}>
                  <Text style={styles.summaryBold}>{activityCount}</Text>{' '}
                  {activityCount === 1 ? 'actividad' : 'actividades'}
                </Text>
              </View>

              <View style={styles.timelineContainer}>
                <View style={styles.timelineLine} />
                {stages.map((stage, index) => {
                  return (
                    <Pressable
                      key={stage.stage_id}
                      style={[styles.stageCard, styles.stageCardPending]}
                      onPress={() =>
                        router.push({
                          pathname: '/stage-detail',
                          params: {
                            stageId: String(stage.stage_id),
                            goalId: String(goalId),
                          },
                        })
                      }
                    >
                      <View style={styles.stageHeader}>
                        <View
                          style={[
                            styles.numberCircle,
                            styles.numberCirclePending,
                          ]}
                        >
                          <Text style={[styles.numberText, styles.numberTextPending]}>
                            {String(index + 1).padStart(2, '0')}
                          </Text>
                        </View>

                        <View style={styles.stageInfo}>
                          <Text style={[styles.stageBadge, styles.stageBadgePending]}>
                            ETAPA {String(index + 1).padStart(2, '0')}
                          </Text>
                          <Text style={styles.stageTitle}>{stage.name}</Text>
                          <Text style={styles.stageSubtitle}>
                            {stage.activity_count}{' '}
                            {stage.activity_count === 1 ? 'actividad' : 'actividades'}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : (
            <View style={styles.emptyPlanCard}>
              <Feather name="info" size={22} color="#174A62" />
              <Text style={styles.emptyPlanText}>
                {hasInvalidStages
                  ? 'No se pudieron leer las etapas recibidas para este objetivo.'
                  : !hasGoalId
                    ? 'No se recibió un identificador válido para este objetivo.'
                    : 'El objetivo se registró, pero la respuesta no incluye etapas y actividades para mostrar.'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.floatingMapBtn}
        activeOpacity={0.85}
        onPress={() => {}}
      >
        <Feather name="grid" size={18} color="#FFFFFF" />
        <Text style={styles.floatingMapText}>Mapa</Text>
      </TouchableOpacity>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#FAF6F0',
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    paddingBottom: 90,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    gap: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  avatarWrapper: {
    alignItems: 'center',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#174A62',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#174A62',
    marginTop: 2,
  },
  titleSection: {
    marginTop: 4,
  },
  badge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#174A62',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F2C40',
    letterSpacing: -0.5,
  },
  goalCard: {
    backgroundColor: '#174A62',
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    boxShadow: '0px 8px 16px rgba(23, 74, 98, 0.15)',
    elevation: 4,
  },
  goalIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalTextContainer: {
    flex: 1,
  },
  goalCardBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#90C2DE',
    letterSpacing: 1,
    marginBottom: 2,
  },
  goalCardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  goalCardDate: {
    fontSize: 12,
    color: '#D8ECF8',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  summaryText: {
    fontSize: 13,
    color: '#627D98',
  },
  summaryBold: {
    fontWeight: '800',
    color: '#0F2C40',
  },
  summaryDot: {
    color: '#94A3B8',
  },
  timelineContainer: {
    position: 'relative',
    gap: 16,
    paddingLeft: 12,
  },
  timelineLine: {
    position: 'absolute',
    left: 35,
    top: 24,
    bottom: 24,
    width: 2,
    backgroundColor: '#CBD5E1',
  },
  stageCard: {
    borderRadius: 20,
    padding: 18,
    boxShadow: '0px 4px 12px rgba(23, 74, 98, 0.05)',
    elevation: 2,
  },
  stageCardPending: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  numberCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberCirclePending: {
    backgroundColor: '#E2E8F0',
  },
  numberText: {
    fontSize: 14,
    fontWeight: '800',
  },
  numberTextPending: {
    color: '#627D98',
  },
  stageInfo: {
    flex: 1,
  },
  stageBadge: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 2,
  },
  stageBadgePending: {
    color: '#94A3B8',
  },
  stageTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F2C40',
    marginBottom: 2,
  },
  stageSubtitle: {
    fontSize: 12,
    color: '#627D98',
  },
  emptyPlanCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emptyPlanText: {
    flex: 1,
    fontSize: 13,
    color: '#627D98',
    lineHeight: 19,
  },
  floatingMapBtn: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    backgroundColor: '#174A62',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    boxShadow: '0px 8px 16px rgba(23, 74, 98, 0.3)',
    elevation: 5,
  },
  floatingMapText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});