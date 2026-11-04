import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
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
import { getUserGoals, type CreatedGoal } from '@/services/api/goals';

const mockGoals = [
  {
    id: 1,
    title: 'Aprender francés',
    progress: 70,
    stages: '3 de 5 etapas',
  },
  {
    id: 2,
    title: 'Crear una aplicación web',
    progress: 40,
    stages: '2 de 6 etapas',
  },
];

export default function HomeScreen() {
  const { user, token, clearSession } = useAuth();
  const [goals, setGoals] = useState<CreatedGoal[]>([]);
  const [isLoadingGoals, setIsLoadingGoals] = useState(false);

  useEffect(() => {
    if (!token) return;

    setIsLoadingGoals(true);
    getUserGoals(token)
      .then((serverGoals) => {
        if (serverGoals && serverGoals.length > 0) {
          setGoals(serverGoals);
        }
      })
      .catch((err) => {
        console.warn('No se pudieron cargar los objetivos del servidor:', err);
      })
      .finally(() => {
        setIsLoadingGoals(false);
      });
  }, [token]);

  const displayName = user?.name ? user.name.split(' ')[0] : 'Flora';
  const initial = displayName.charAt(0).toUpperCase();

  const firstGoal = goals.length > 0 ? goals[0] : null;
  const nextActivity = firstGoal?.stages?.[0]?.activities?.[0];
  const nextStepTitle = nextActivity?.title || 'Practicar saludos en francés';
  const nextStepStage = firstGoal?.stages?.[0]?.name || 'Fundamentos';
  const nextStepDuration = nextActivity?.estimated_minutes
    ? `${nextActivity.estimated_minutes} min`
    : '20 min';

  const displayGoals =
    goals.length > 0
      ? goals.map((g) => ({
          id: g.goal_id,
          title: g.title,
          progress: 25,
          stages: `${g.stages?.length || 0} etapas`,
        }))
      : mockGoals;

  return (
    <Screen style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        
        {/* Encabezado con Logout */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hola, {displayName} 👋</Text>
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
              Una actividad de práctica para avanzar en tu etapa actual.
            </Text>

            <View style={styles.activityInfo}>
              <Text style={styles.infoText}>⏱ {nextStepDuration}</Text>
              <Text style={styles.infoText}>•</Text>
              <Text style={styles.infoText}>{nextStepStage}</Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.pressed,
              ]}
              onPress={() =>
                router.push(
                  firstGoal
                    ? {
                        pathname: '/goal-plan',
                        params: {
                          goalId: String(firstGoal.goal_id),
                          title: firstGoal.title,
                        },
                      }
                    : '/goal-plan',
                )
              }>
              <Text style={styles.primaryButtonText}>
                Continuar
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
            ) : (
              <Pressable
                onPress={() =>
                  router.push(
                    firstGoal
                      ? {
                          pathname: '/goal-plan',
                          params: {
                            goalId: String(firstGoal.goal_id),
                            title: firstGoal.title,
                          },
                        }
                      : '/goal-plan',
                  )
                }>
                <Text style={styles.seeAll}>Ver todos</Text>
              </Pressable>
            )}
          </View>

          {displayGoals.map((goal) => (
            <Pressable
              key={goal.id}
              onPress={() =>
                router.push({
                  pathname: '/goal-plan',
                  params: {
                    goalId: String(goal.id),
                    title: goal.title,
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
                      {goal.title}
                    </Text>

                    <Text style={styles.goalStages}>
                      {goal.stages}
                    </Text>
                  </View>

                  <Text style={styles.progressText}>
                    {goal.progress}%
                  </Text>
                </View>

                <View style={styles.progressBackground}>
                  <View
                    style={[
                      styles.progressBar,
                      { width: `${goal.progress}%` },
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
});
