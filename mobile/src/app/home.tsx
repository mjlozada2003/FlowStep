import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Card } from '@/components/ui/Card';
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
        showsVerticalScrollIndicator={false}>
        
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

          <Card style={styles.nextStepCard}>
            <View style={styles.nextStepBadge}>
              <Text style={styles.nextStepBadgeText}>
                CONTINUAR
              </Text>
            </View>

            <Text style={styles.nextStepTitle}>
              {nextStepTitle}
            </Text>

            <Text style={styles.nextStepDescription}>
              {nextActivity?.description ||
                (nextActivity
                  ? 'Actividad pendiente de tu plan.'
                  : isLoadingGoals
                    ? 'Consultando el siguiente paso de tu plan.'
                    : firstGoal?.detail
                      ? 'Aún no hay actividades pendientes en este objetivo.'
                      : firstGoal
                        ? 'No se pudo consultar el siguiente paso.'
                        : 'Crea un objetivo para comenzar.')}
            </Text>

            <View style={styles.activityInfo}>
              <Text style={styles.infoText}>
                ⏱ {nextActivity?.estimated_minutes
                  ? `${nextActivity.estimated_minutes} min`
                  : 'Duración no indicada'}
              </Text>
              <Text style={styles.infoText}>•</Text>
              <Text style={styles.infoText}>{nextStepStage ?? 'Etapa no disponible'}</Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.pressed,
              ]}
              onPress={() => {
                if (firstGoal) {
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
              }}>
              <Text style={styles.primaryButtonText}>
                {firstGoal ? 'Continuar' : 'Crear un objetivo'}
              </Text>
            </Pressable>
          </Card>
        </View>

        {/* Objetivos */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Mis objetivos</Text>

            {isLoadingGoals ? (
              <ActivityIndicator size="small" color={Colors.light.primary} />
            ) : null}
          </View>

          {loadError ? <Text style={styles.errorText}>{loadError}</Text> : null}
          {!isLoadingGoals && goalRows.length === 0 && !loadError ? (
            <Text style={styles.emptyText}>Aún no tienes objetivos guardados.</Text>
          ) : null}

          {goalRows.map((row) => (
            <Pressable
              key={row.goal.goal_id}
              onPress={() =>
                router.push({
                  pathname: '/goal-plan',
                  params: {
                    goalId: String(row.goal.goal_id),
                    title: row.goal.title,
                  },
                })
              }
              style={({ pressed }) => pressed && styles.pressedCard}>
              <Card style={styles.goalCard}>
                <View style={styles.goalHeader}>
                  <View style={styles.goalIcon}>
                    <Text style={styles.goalIconText}>🎯</Text>
                  </View>

                  <View style={styles.goalInfo}>
                    <Text style={styles.goalTitle}>
                      {row.goal.title}
                    </Text>

                    <Text style={styles.goalStages}>
                      {row.detail?.stages
                        ? `${row.detail.stages.length} etapas`
                        : 'Etapas no disponibles'}
                    </Text>
                  </View>

                  <Text style={styles.progressText}>
                    {row.progress ? `${row.progress.progress_percentage}%` : '—'}
                  </Text>
                </View>

                <View style={styles.progressBackground}>
                  <View
                    style={[
                      styles.progressBar,
                      {
                        width: `${Math.min(100, Math.max(0, row.progress?.progress_percentage ?? 0))}%`,
                      },
                    ]}
                  />
                </View>
              </Card>
            </Pressable>
          ))}
        </View>

        {/* Crear objetivo */}
        <Pressable
          style={({ pressed }) => [
            styles.createButton,
            pressed && styles.pressed,
          ]}
          onPress={() => router.push('/create-goal')}>
          <Text style={styles.createButtonIcon}>＋</Text>

          <View style={styles.createButtonTextContainer}>
            <Text style={styles.createButtonTitle}>
              Nuevo objetivo
            </Text>

            <Text style={styles.createButtonDescription}>
              Convierte una meta en un plan concreto.
            </Text>
          </View>
        </Pressable>

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
    paddingHorizontal: 20,
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

  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.light.text,
  },

  seeAll: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.primary,
  },

  nextStepCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 24,
    padding: Spacing.four,
    borderWidth: 1.2,
    borderColor: Colors.light.border,
    boxShadow: '0px 4px 12px rgba(23, 74, 98, 0.05)',
    elevation: 3,
  },

  nextStepBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#D8ECF8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: Spacing.two,
  },

  nextStepBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.light.primary,
    letterSpacing: 0.8,
  },

  nextStepTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: Spacing.one,
  },

  nextStepDescription: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.three,
  },

  activityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },

  infoText: {
    fontSize: 13,
    color: Colors.light.textMuted,
    fontWeight: '500',
  },

  primaryButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  goalCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 20,
    padding: Spacing.three,
    marginBottom: Spacing.two,
    borderWidth: 1.2,
    borderColor: Colors.light.border,
    boxShadow: '0px 4px 10px rgba(23, 74, 98, 0.04)',
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

  createButton: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 22,
    padding: Spacing.three,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },

  createButtonIcon: {
    fontSize: 24,
    color: Colors.light.primary,
    fontWeight: '600',
    marginLeft: Spacing.one,
  },

  createButtonTextContainer: {
    flex: 1,
  },

  createButtonTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 2,
  },

  createButtonDescription: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },

  pressed: {
    opacity: 0.85,
  },

  pressedCard: {
    transform: [{ scale: 0.99 }],
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
