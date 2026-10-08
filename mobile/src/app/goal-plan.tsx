import { router } from 'expo-router';
import { useState } from 'react';
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
      {
        title: 'Aprender vocabulario básico',
        status: 'completed',
      },
      {
        title: 'Practicar saludos y expresiones',
        status: 'pending',
      },
      {
        title: 'Trabajar la pronunciación',
        status: 'pending',
      },
    ],
  },
  {
    id: 2,
    number: '02',
    name: 'Construir vocabulario',
    description: 'Amplía las palabras y expresiones que puedes utilizar.',
    activities: [
      {
        title: 'Aprender palabras frecuentes',
        status: 'pending',
      },
      {
        title: 'Practicar frases cotidianas',
        status: 'pending',
      },
      {
        title: 'Repasar vocabulario',
        status: 'pending',
      },
    ],
  },
  {
    id: 3,
    number: '03',
    name: 'Conversación',
    description: 'Empieza a utilizar lo aprendido en situaciones reales.',
    activities: [
      {
        title: 'Presentarte en francés',
        status: 'pending',
      },
      {
        title: 'Practicar una conversación básica',
        status: 'pending',
      },
    ],
  },
];

export default function GoalPlanScreen() {
  const [expandedStage, setExpandedStage] = useState<number | null>(null);

  const toggleStage = (stageId: number) => {
    setExpandedStage(
      expandedStage === stageId ? null : stageId,
    );
  };

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

          {mockStages.map((stage, index) => {
            const isExpanded = expandedStage === stage.id;

            return (
              <View key={stage.id} style={styles.stageWrapper}>
                <Pressable
                  onPress={() => toggleStage(stage.id)}
                  style={({ pressed }) => [
                    styles.stagePressable,
                    pressed && styles.pressed,
                  ]}>

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

                      <Text style={styles.expandIcon}>
                        {isExpanded ? '⌃' : '⌄'}
                      </Text>
                    </View>

                    <View style={styles.stageFooter}>
                      <Text style={styles.activitiesCount}>
                        {stage.activities.length}{' '}
                        {stage.activities.length === 1
                          ? 'actividad'
                          : 'actividades'}
                      </Text>

                      <Text style={styles.viewText}>
                        {isExpanded
                          ? 'Ocultar'
                          : 'Ver actividades'}
                      </Text>
                    </View>

                    {isExpanded && (
                      <>
                        <View style={styles.divider} />

                        <View style={styles.activities}>
                          {stage.activities.map(
                            (activity, activityIndex) => {
                              const completed =
                                activity.status === 'completed';

                              return (
                                <Pressable
                                  key={`${stage.id}-${activityIndex}`}
                                  onPress={() => {}}
                                  style={({ pressed }) => [
                                    styles.activityRow,
                                    pressed && styles.activityPressed,
                                  ]}>

                                  <View
                                    style={[
                                      styles.statusIcon,
                                      completed &&
                                        styles.statusIconCompleted,
                                    ]}>
                                    <Text
                                      style={[
                                        styles.statusIconText,
                                        completed &&
                                          styles.statusIconTextCompleted,
                                      ]}>
                                      {completed ? '✓' : '○'}
                                    </Text>
                                  </View>

                                  <View style={styles.activityInfo}>
                                    <Text
                                      style={styles.activityText}>
                                      {activity.title}
                                    </Text>

                                    <Text
                                      style={[
                                        styles.activityStatus,
                                        completed &&
                                          styles.activityStatusCompleted,
                                      ]}>
                                      {completed
                                        ? 'Completada'
                                        : 'Pendiente'}
                                    </Text>
                                  </View>

                                  <Text style={styles.activityArrow}>
                                    ›
                                  </Text>
                                </Pressable>
                              );
                            },
                          )}
                        </View>
                      </>
                    )}
                  </Card>
                </Pressable>

                {index < mockStages.length - 1 && (
                  <View style={styles.connector}>
                    <View style={styles.connectorLine} />
                  </View>
                )}
              </View>
            );
          })}
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

  stagePressable: {
    width: '100%',
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

  expandIcon: {
    fontSize: 22,
    color: Colors.light.primary,
    marginLeft: Spacing.one,
  },

  stageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.three,
  },

  activitiesCount: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },

  viewText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.primary,
  },

  divider: {
    height: 1,
    backgroundColor: Colors.light.border,
    marginVertical: Spacing.three,
  },

  activities: {
    gap: Spacing.one,
  },

  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.one,
    borderRadius: 12,
  },

  activityPressed: {
    opacity: 0.65,
  },

  statusIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.light.backgroundSelected,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.two,
  },

  statusIconCompleted: {
    backgroundColor: Colors.light.success,
  },

  statusIconText: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.light.primary,
  },

  statusIconTextCompleted: {
    color: '#FFFFFF',
  },

  activityInfo: {
    flex: 1,
  },

  activityText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    lineHeight: 20,
  },

  activityStatus: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },

  activityStatusCompleted: {
    color: Colors.light.success,
  },

  activityArrow: {
    fontSize: 22,
    color: Colors.light.textSecondary,
    marginLeft: Spacing.two,
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