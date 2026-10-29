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
    <Screen style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        
        {/* Encabezado */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hola, Flora 👋</Text>
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
              onPress={() => router.push('/goal-plan')}>
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

            <Pressable onPress={() => router.push('/goal-plan')}>
              <Text style={styles.seeAll}>Ver todos</Text>
            </Pressable>
          </View>

          {mockGoals.map((goal) => (
            <Pressable
              key={goal.id}
              onPress={() => router.push('/goal-plan')}
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
    maxWidth: 280,
    letterSpacing: -0.5,
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

  section: {
    gap: 12,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  nextStepBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#D8ECF8',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },

  nextStepBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.light.primary,
    letterSpacing: 0.5,
  },

  nextStepTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.light.text,
  },

  nextStepDescription: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },

  activityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },

  infoText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    fontWeight: '600',
  },

  primaryButton: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  goalCard: {
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  goalIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#D8ECF8',
    justifyContent: 'center',
    alignItems: 'center',
  },

  goalIconText: {
    fontSize: 18,
  },

  goalInfo: {
    flex: 1,
    marginLeft: 12,
  },

  goalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.text,
  },

  goalStages: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },

  progressText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.light.primary,
  },

  progressBackground: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
    marginTop: 12,
  },

  progressBar: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: Colors.light.primary,
  },

  createButton: {
    minHeight: 64,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.light.primary,
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: 'rgba(23, 74, 98, 0.02)',
  },

  createButtonIcon: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.light.primary,
    marginRight: 12,
  },

  createButtonTextContainer: {
    flex: 1,
  },

  createButtonTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.light.text,
  },

  createButtonDescription: {
    fontSize: 12,
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