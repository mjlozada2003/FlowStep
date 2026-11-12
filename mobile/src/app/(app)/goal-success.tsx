import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { BrandHeader } from '@/components/ui/BrandHeader';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/contexts/auth-context';
import { getStageActivities, type StageActivity } from '@/services/api/stages';
import { SuccessAnimationBox } from '@/components/features/SuccessAnimationBox';
import { GoalSuccessHeader } from '@/components/features/GoalSuccessHeader';
import { GoalSuccessProgressCard } from '@/components/features/GoalSuccessProgressCard';
import { GoalSuccessMascotCard } from '@/components/features/GoalSuccessMascotCard';

export default function GoalSuccessScreen() {
  const params = useLocalSearchParams<{
    activityId?: string;
    stageId?: string;
    goalId?: string;
    stageTitle?: string;
  }>();
  const { token } = useAuth();
  const [activities, setActivities] = useState<StageActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const activityId = /^\d+$/.test(params.activityId ?? '')
    ? Number(params.activityId)
    : null;
  const stageId = /^\d+$/.test(params.stageId ?? '')
    ? Number(params.stageId)
    : null;
  const goalId = /^\d+$/.test(params.goalId ?? '')
    ? Number(params.goalId)
    : null;

  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!token || !stageId || !activityId) return undefined;

      getStageActivities(stageId, token)
        .then((serverActivities) => {
          if (!active) return;
          setActivities(serverActivities);
          const activity = serverActivities.find(
            (item) => item.activity_id === activityId && item.status === 'completed',
          );
          setLoadError(
            activity
              ? null
              : 'No se pudo confirmar que la actividad esté completada.',
          );
        })
        .catch((error: unknown) => {
          if (!active) return;
          setLoadError(
            error instanceof Error ? error.message : 'No se pudo consultar la actividad.',
          );
        })
        .finally(() => {
          if (active) setIsLoading(false);
        });

      return () => {
        active = false;
      };
    }, [activityId, stageId, token]),
  );

  const completedActivity = activities.find(
    (activity) =>
      activity.activity_id === activityId && activity.status === 'completed',
  );
  const completedCount = activities.filter(
    (activity) => activity.status === 'completed',
  ).length;
  const totalCount = activities.length;
  const progressPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : null;
  const isScreenLoading = isLoading && Boolean(token && stageId && activityId);
  const displayLoadError =
    loadError ??
    (!token || !stageId || !activityId
      ? 'Inicia sesión y vuelve a abrir la actividad completada.'
      : null);
  const isConfirmed = Boolean(completedActivity && !displayLoadError);

  return (
    <Screen style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <View style={styles.topRow}>
            <BrandHeader showTagline={false} />
          </View>

          <SuccessAnimationBox />

          <GoalSuccessHeader
            isLoading={isScreenLoading}
            isConfirmed={isConfirmed}
            completedActivityTitle={completedActivity?.title}
            errorMessage={displayLoadError}
          />

          {isScreenLoading ? (
            <ActivityIndicator size="small" color="#174A62" />
          ) : null}
          {displayLoadError && !isScreenLoading ? (
            <Text style={styles.errorText}>{displayLoadError}</Text>
          ) : null}

          {progressPercent !== null ? (
            <GoalSuccessProgressCard
              stageTitle={params.stageTitle}
              progressPercent={progressPercent}
              completedCount={completedCount}
              totalCount={totalCount}
            />
          ) : null}

          <GoalSuccessMascotCard />

          <TouchableOpacity
            style={[styles.submitButton, !isConfirmed && styles.submitButtonDisabled]}
            disabled={!isConfirmed}
            onPress={() =>
              router.push({
                pathname: '/progress-analytics',
                params: { goalId: goalId ? String(goalId) : '' },
              })
            }
            activeOpacity={0.85}
          >
            <Text style={styles.submitButtonText}>Ver mi progreso</Text>
            <Feather name="arrow-right" size={20} color="#FFFFFF" style={styles.buttonArrow} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submitButton, styles.secondaryButton]}
            onPress={() =>
              router.push({
                pathname: '/schedule',
                params: { goalId: goalId ? String(goalId) : '' },
              })
            }
            activeOpacity={0.85}
          >
            <Text style={[styles.submitButtonText, styles.secondaryButtonText]}>Ver agenda adaptada</Text>
            <Feather name="calendar" size={18} color="#174A62" style={styles.buttonArrow} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.floatingMapBtn}
        activeOpacity={0.85}
        onPress={() => {
          if (goalId) {
            router.push({
              pathname: '/goal-plan',
              params: { goalId: String(goalId) },
            });
          }
        }}
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
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
    justifyContent: 'center',
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
    justifyContent: 'center',
    marginBottom: 4,
  },
  submitButton: {
    backgroundColor: '#174A62',
    height: 52,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#174A62',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    elevation: 3,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginTop: 10,
    shadowOpacity: 0.05,
  },
  secondaryButtonText: {
    color: '#174A62',
  },
  buttonArrow: {
    marginLeft: 8,
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
    shadowColor: '#174A62',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    elevation: 5,
  },
  floatingMapText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  submitButtonDisabled: {
    opacity: 0.55,
  },
  errorText: {
    color: '#C53030',
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
});