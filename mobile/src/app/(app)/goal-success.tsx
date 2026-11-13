import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { BrandHeader } from '@/components/ui/BrandHeader';
import { BackButton } from '@/components/ui/BackButton';
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

  const handleContinue = useCallback(() => {
    if (goalId) {
      router.dismissTo({
        pathname: '/goal-plan',
        params: { goalId: String(goalId) },
      });
    } else {
      router.dismissAll();
    }
  }, [goalId]);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        handleContinue();
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }, [handleContinue]),
  );

  return (
    <Screen style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <View style={styles.topRow}>
            <BackButton onPress={handleContinue} />
            <BrandHeader showTagline={false} />
            <View style={styles.headerSpacer} />
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

          {/* Acción Principal: Continuar con mi plan / Volver a mis objetivos */}
          <TouchableOpacity
            style={[styles.submitButton, !isConfirmed && styles.submitButtonDisabled]}
            disabled={!isConfirmed}
            onPress={handleContinue}
            activeOpacity={0.85}
          >
            <Text style={styles.submitButtonText}>
              {goalId ? 'Continuar con mi plan' : 'Volver al inicio'}
            </Text>
            <Feather name="arrow-right" size={20} color="#FFFFFF" style={styles.buttonArrow} />
          </TouchableOpacity>

          {/* Acción Secundaria: Ver mi progreso */}
          <TouchableOpacity
            style={[styles.submitButton, styles.secondaryButton]}
            onPress={() =>
              router.replace({
                pathname: '/progress-analytics',
                params: {
                  goalId: goalId ? String(goalId) : '',
                  fromSuccess: '1',
                },
              })
            }
            activeOpacity={0.85}
          >
            <Text style={[styles.submitButtonText, styles.secondaryButtonText]}>Ver mi progreso</Text>
            <Feather name="bar-chart-2" size={18} color="#174A62" style={styles.buttonArrow} />
          </TouchableOpacity>

          {/* Acción Terciaria: Ver agenda adaptada */}
          <TouchableOpacity
            style={[styles.submitButton, styles.tertiaryButton]}
            onPress={() =>
              router.replace({
                pathname: '/schedule',
                params: {
                  goalId: goalId ? String(goalId) : '',
                  fromSuccess: '1',
                },
              })
            }
            activeOpacity={0.85}
          >
            <Text style={[styles.submitButtonText, styles.tertiaryButtonText]}>Ver agenda adaptada</Text>
            <Feather name="calendar" size={16} color="#627D98" style={styles.buttonArrow} />
          </TouchableOpacity>
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
    flexGrow: 1,
    paddingVertical: 24,
    justifyContent: 'center',
    paddingBottom: 40,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    gap: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  headerSpacer: {
    width: 38,
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
  tertiaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 8,
    shadowOpacity: 0,
    elevation: 0,
  },
  tertiaryButtonText: {
    color: '#627D98',
    fontWeight: '600',
  },
  buttonArrow: {
    marginLeft: 8,
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