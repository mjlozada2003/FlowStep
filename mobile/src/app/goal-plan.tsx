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

const mockStages = [
  {
    id: 1,
    number: '01',
    name: 'Fundamentos',
    description: 'Aprende las bases necesarias para comenzar.',
    activities: [
      'Aprender vocabulario básico',
      'Practicar saludos y expresiones',
      'Trabajar la pronunciación',
    ],
  },
  {
    id: 2,
    number: '02',
    name: 'Construir vocabulario',
    description: 'Amplía las palabras y expresiones que puedes utilizar.',
    activities: [
      'Aprender palabras frecuentes',
      'Practicar frases cotidianas',
      'Repasar vocabulario',
    ],
  },
  {
    id: 3,
    number: '03',
    name: 'Conversación',
    description: 'Empieza a utilizar lo aprendido en situaciones reales.',
    activities: [
      'Presentarte en francés',
      'Practicar una conversación básica',
    ],
  },
];

export default function GoalPlanScreen() {
  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        
        {/* Encabezado */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.pressed,
            ]}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>

          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>TU PLAN</Text>

            <Text style={styles.title}>Aprender francés</Text>

            <Text style={styles.subtitle}>
              Este es el camino que puedes seguir para alcanzar tu objetivo.
            </Text>
          </View>
        </View>

        {/* Progreso */}
        <Card style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <View>
              <Text style={styles.progressLabel}>
                Progreso general
              </Text>

              <Text style={styles.progressDescription}>
                Tu plan acaba de comenzar
              </Text>
            </View>

            <Text style={styles.progressPercentage}>0%</Text>
          </View>

          <View style={styles.progressBackground}>
            <View style={styles.progressBar} />
          </View>
        </Card>

        {/* Etapas */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Tu camino</Text>

              <Text style={styles.sectionDescription}>
                Avanza por cada etapa en orden.
              </Text>
            </View>

            <Text style={styles.stageCount}>
              {mockStages.length} etapas
            </Text>
          </View>

          {mockStages.map((stage, index) => (
            <View key={stage.id} style={styles.stageWrapper}>
              <Card style={styles.stageCard}>
                <View style={styles.stageHeader}>
                  <View style={styles.stageNumber}>
                    <Text style={styles.stageNumberText}>
                      {stage.number}
                    </Text>
                  </View>

                  <View style={styles.stageInfo}>
                    <Text style={styles.stageTitle}>
                      {stage.name}
                    </Text>

                    <Text style={styles.stageDescription}>
                      {stage.description}
                    </Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <Text style={styles.activitiesLabel}>
                  Actividades
                </Text>

                <View style={styles.activities}>
                  {stage.activities.map((activity, activityIndex) => (
                    <View
                      key={`${stage.id}-${activityIndex}`}
                      style={styles.activityRow}>
                      <View style={styles.activityBullet} />

                      <Text style={styles.activityText}>
                        {activity}
                      </Text>
                    </View>
                  ))}
                </View>
              </Card>

              {index < mockStages.length - 1 && (
                <View style={styles.connector}>
                  <View style={styles.connectorLine} />
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Acción */}
        <Pressable
          style={({ pressed }) => [
            styles.startButton,
            pressed && styles.pressed,
          ]}
          onPress={() => {}}>
          <Text style={styles.startButtonText}>
            Empezar mi plan
          </Text>
        </Pressable>

        <Text style={styles.footerText}>
          Podrás ajustar tu plan conforme avances.
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: Spacing.two,
    paddingBottom: Spacing.six,
    gap: Spacing.four,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: Colors.light.backgroundElement,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.two,
  },

  backText: {
    fontSize: 32,
    lineHeight: 32,
    color: Colors.light.text,
    marginTop: -3,
  },

  headerText: {
    flex: 1,
  },

  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    color: Colors.light.primary,
    marginBottom: Spacing.one,
  },

  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.light.text,
  },

  subtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 21,
    marginTop: Spacing.one,
  },

  progressCard: {
    padding: Spacing.four,
  },

  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  progressLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.text,
  },

  progressDescription: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 3,
  },

  progressPercentage: {
    fontSize: 22,
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
    width: '0%',
    height: '100%',
    borderRadius: 4,
    backgroundColor: Colors.light.primary,
  },

  section: {
    gap: Spacing.two,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: Colors.light.text,
  },

  sectionDescription: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginTop: 3,
  },

  stageCount: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.primary,
  },

  stageWrapper: {
    alignItems: 'center',
  },

  stageCard: {
    width: '100%',
    padding: Spacing.three,
  },

  stageHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  stageNumber: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: Colors.light.backgroundSelected,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.two,
  },

  stageNumberText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.primary,
  },

  stageInfo: {
    flex: 1,
  },

  stageTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.light.text,
  },

  stageDescription: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    lineHeight: 19,
    marginTop: 3,
  },

  divider: {
    height: 1,
    backgroundColor: Colors.light.border,
    marginVertical: Spacing.three,
  },

  activitiesLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.two,
  },

  activities: {
    gap: Spacing.two,
  },

  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  activityBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.light.secondary,
    marginRight: Spacing.two,
  },

  activityText: {
    flex: 1,
    fontSize: 14,
    color: Colors.light.text,
    lineHeight: 20,
  },

  connector: {
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },

  connectorLine: {
    width: 2,
    height: '100%',
    backgroundColor: Colors.light.border,
  },

  startButton: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  startButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  footerText: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: -Spacing.two,
  },

  pressed: {
    opacity: 0.75,
  },
});