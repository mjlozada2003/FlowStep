import { router } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Colors, Spacing } from '@/constants/theme';

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
  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        
        {/* Encabezado */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hola, Flo 👋</Text>
            <Text style={styles.question}>
              ¿Qué quieres lograr hoy?
            </Text>
          </View>

          <View style={styles.avatar}>
            <Text style={styles.avatarText}>F</Text>
          </View>
        </View>

        {/* Próximo paso */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tu próximo paso</Text>

          <Card style={styles.nextStepCard}>
            <View style={styles.nextStepBadge}>
              <Text style={styles.nextStepBadgeText}>
                CONTINUAR
              </Text>
            </View>

            <Text style={styles.nextStepTitle}>
              Practicar saludos en francés
            </Text>

            <Text style={styles.nextStepDescription}>
              Una actividad de práctica para avanzar en tu etapa actual.
            </Text>

            <View style={styles.activityInfo}>
              <Text style={styles.infoText}>⏱ 20 min</Text>
              <Text style={styles.infoText}>•</Text>
              <Text style={styles.infoText}>Fundamentos</Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.pressed,
              ]}
              onPress={() => {}}>
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

            <Pressable onPress={() => {}}>
              <Text style={styles.seeAll}>Ver todos</Text>
            </Pressable>
          </View>

          {mockGoals.map((goal) => (
            <Pressable
              key={goal.id}
              onPress={() => {}}
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
  content: {
    paddingTop: Spacing.three,
    paddingBottom: Spacing.six,
    gap: Spacing.four,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  greeting: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.one,
  },

  question: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.light.text,
    maxWidth: 280,
    lineHeight: 30,
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: Colors.light.backgroundSelected,
    justifyContent: 'center',
    alignItems: 'center',
  },

  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.primary,
  },

  section: {
    gap: Spacing.two,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: Colors.light.text,
  },

  seeAll: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.primary,
  },

  nextStepCard: {
    padding: Spacing.four,
  },

  nextStepBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.light.backgroundSelected,
    borderRadius: 8,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    marginBottom: Spacing.two,
  },

  nextStepBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.light.primary,
    letterSpacing: 0.5,
  },

  nextStepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
    lineHeight: 26,
  },

  nextStepDescription: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 21,
    marginTop: Spacing.two,
  },

  activityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    marginTop: Spacing.three,
  },

  infoText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },

  primaryButton: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.three,
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  goalCard: {
    padding: Spacing.three,
  },

  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  goalIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.light.backgroundSelected,
    justifyContent: 'center',
    alignItems: 'center',
  },

  goalIconText: {
    fontSize: 20,
  },

  goalInfo: {
    flex: 1,
    marginLeft: Spacing.two,
  },

  goalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
  },

  goalStages: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },

  progressText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.primary,
  },

  progressBackground: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.light.backgroundSelected,
    overflow: 'hidden',
    marginTop: Spacing.three,
  },

  progressBar: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: Colors.light.primary,
  },

  createButton: {
    minHeight: 72,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.light.primary,
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
  },

  createButtonIcon: {
    fontSize: 28,
    fontWeight: '300',
    color: Colors.light.primary,
    marginRight: Spacing.three,
  },

  createButtonTextContainer: {
    flex: 1,
  },

  createButtonTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
  },

  createButtonDescription: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },

  pressed: {
    opacity: 0.8,
  },

  pressedCard: {
    opacity: 0.8,
  },
});