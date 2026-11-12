import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import {
  getGoalById,
  getGoalProgress,
  getUserGoals,
  type CreatedGoal,
  type GoalProgress,
} from '@/services/api/goals';
import { HomeNextStepCard } from '@/components/features/HomeNextStepCard';
import { HomeGoalCard } from '@/components/features/HomeGoalCard';

interface HomeGoal {
  goal: CreatedGoal;
  detail: CreatedGoal | null;
  progress: GoalProgress | null;
}

export default function HomeScreen() {
  const { user, token, clearSession } = useAuth();
  const [goalRows, setGoalRows] = useState<HomeGoal[]>([]);
  const [isLoadingGoals, setIsLoadingGoals] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!token) {
        setGoalRows([]);
        setLoadError('Inicia sesión para consultar tus objetivos.');
        return () => {
          active = false;
        };
      }

      setIsLoadingGoals(true);
      setLoadError(null);
      getUserGoals(token)
        .then(async (serverGoals) => {
          const rows = await Promise.all(
            serverGoals.map(async (goal): Promise<HomeGoal> => {
              const [detailResult, progressResult] = await Promise.allSettled([
                getGoalById(goal.goal_id, token),
                getGoalProgress(goal.goal_id, token),
              ]);
              return {
                goal,
                detail: detailResult.status === 'fulfilled' ? detailResult.value : null,
                progress: progressResult.status === 'fulfilled' ? progressResult.value : null,
              };
            }),
          );
          if (!active) return;
          setGoalRows(rows);
          if (rows.some((row) => row.detail === null || row.progress === null)) {
            setLoadError('Algunos datos de progreso o etapas no están disponibles.');
          }
        })
        .catch((error: unknown) => {
          if (!active) return;
          setGoalRows([]);
          setLoadError(
            error instanceof Error ? error.message : 'No se pudieron cargar tus objetivos.',
          );
        })
        .finally(() => {
          if (active) setIsLoadingGoals(false);
        });

      return () => {
        active = false;
      };
    }, [token]),
  );

  const displayName = user?.name ? user.name.split(' ')[0] : '';
  const initial = displayName ? displayName.charAt(0).toUpperCase() : '?';

  const firstGoal = goalRows[0] ?? null;
  const nextActivity = firstGoal?.detail?.stages
    ?.flatMap((stage) => stage.activities ?? [])
    .find((activity) => activity.status !== 'completed');

  const nextStepTitle = isLoadingGoals
    ? 'Cargando tus objetivos…'
    : nextActivity?.title ??
      (firstGoal
        ? firstGoal.detail
          ? 'Sin actividades pendientes'
          : 'Actividades no disponibles'
        : 'Sin objetivos guardados');

  const nextStepStage =
    firstGoal?.detail?.stages?.find((stage) =>
      stage.activities?.some((activity) => activity.activity_id === nextActivity?.activity_id),
    )?.name ?? null;

  return (
    <Screen style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Encabezado con Logout */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              Hola{displayName ? `, ${displayName}` : ''} 👋
            </Text>
            <Text style={styles.question}>
              ¿Qué quieres lograr hoy?
            </Text>
          </View>

          <View style={styles.headerRight}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={() => {
                clearSession();
                router.replace('/login');
              }}
              accessibilityLabel="Cerrar sesión"
            >
              <Feather name="log-out" size={16} color="#627D98" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Próximo paso dinámico */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tu próximo paso</Text>
          <HomeNextStepCard
            nextStepTitle={nextStepTitle}
            nextStepDescription={
              nextActivity?.description ||
              (nextActivity
                ? 'Actividad pendiente de tu plan.'
                : isLoadingGoals
                  ? 'Consultando el siguiente paso de tu plan.'
                  : firstGoal?.detail
                    ? 'Aún no hay actividades pendientes en este objetivo.'
                    : firstGoal
                      ? 'No se pudo consultar el siguiente paso.'
                      : 'Crea un objetivo para comenzar.')
            }
            estimatedMinutes={nextActivity?.estimated_minutes}
            nextStepStage={nextStepStage}
            buttonText={firstGoal && nextActivity ? 'Continuar' : firstGoal ? 'Ver plan' : 'Crear un objetivo'}
            onPress={() => {
              if (firstGoal && nextActivity) {
                router.push({
                  pathname: '/activity-detail' as any,
                  params: {
                    activityId: String(nextActivity.activity_id),
                    title: nextActivity.title,
                    duration: String(nextActivity.estimated_minutes || 45),
                    stageTitle: nextStepStage || 'ETAPA 1',
                    description: nextActivity.description || '',
                  },
                });
              } else if (firstGoal) {
                router.push({
                  pathname: '/goal-plan',
                  params: {
                    goalId: String(firstGoal.goal.goal_id),
                    title: firstGoal.goal.title,
                  },
                });
              } else {
                router.push('/create-goal');
              }
            }}
          />
        </View>

        {/* Mis objetivos */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <Text style={styles.sectionTitle}>Mis objetivos</Text>
              {isLoadingGoals ? (
                <ActivityIndicator size="small" color={Colors.light.primary} />
              ) : null}
            </View>

            {/* Botón devuelto para crear un nuevo objetivo */}
            <TouchableOpacity
              style={styles.addGoalBtn}
              onPress={() => router.push('/create-goal')}
              activeOpacity={0.8}
            >
              <Feather name="plus" size={16} color="#FFFFFF" />
              <Text style={styles.addGoalText}>Nuevo objetivo</Text>
            </TouchableOpacity>
          </View>

          {loadError ? <Text style={styles.errorText}>{loadError}</Text> : null}
          {!isLoadingGoals && goalRows.length === 0 && !loadError ? (
            <Text style={styles.emptyText}>Aún no tienes objetivos guardados.</Text>
          ) : null}

          {goalRows.map((row) => (
            <HomeGoalCard
              key={row.goal.goal_id}
              goal={row.goal}
              detail={row.detail}
              progress={row.progress}
              onPress={() =>
                router.push({
                  pathname: '/goal-plan',
                  params: {
                    goalId: String(row.goal.goal_id),
                    title: row.goal.title,
                  },
                })
              }
            />
          ))}
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
  content: {
    paddingTop: 24,
    paddingBottom: 40,
    gap: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    marginBottom: 2,
    fontWeight: '600',
  },
  question: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.light.text,
    maxWidth: 240,
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#D8ECF8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.light.primary,
  },
  logoutBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    gap: Spacing.two,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.one,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.light.text,
  },
  addGoalBtn: {
    backgroundColor: Colors.light.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    shadowColor: '#174A62',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    elevation: 2,
  },
  addGoalText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  errorText: {
    fontSize: 12,
    lineHeight: 17,
    color: '#C53030',
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    paddingVertical: 16,
  },
});