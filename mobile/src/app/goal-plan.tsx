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

  const goalTitle = params.title || 'Crear una aplicación web';
  const goalDate = params.targetDate
    ? `Fecha límite: ${params.targetDate}`
    : 'Fecha límite - 30 jun 2025';

  const parsedGoalId = /^\d+$/.test(params.goalId ?? '')
    ? Number(params.goalId)
    : 1;
  const goalId = parsedGoalId !== null && parsedGoalId > 0 ? parsedGoalId : 1;

  // Mock de etapas por defecto para que la vista siempre luzca completa en la demo
  let stages: GoalStagePreview[] = [
    { stage_id: 1, name: 'Aprendizaje', activity_count: 4 },
    { stage_id: 2, name: 'Desarrollo', activity_count: 5 },
    { stage_id: 3, name: 'Pruebas', activity_count: 3 },
  ];

  if (params.stages) {
    try {
      const parsedStages: unknown = JSON.parse(params.stages);
      if (Array.isArray(parsedStages) && parsedStages.every(isGoalStagePreview)) {
        stages = parsedStages;
      }
    } catch {}
  }

  const activityCount = stages.reduce(
    (count, stage) => count + stage.activity_count,
    0,
  );

  return (
    <Screen style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* Header Superior */}
          <View style={styles.topRow}>
            <View>
              <Text style={styles.badge}>TU PLAN PERSONALIZADO</Text>
              <Text style={styles.mainTitle}>Tu camino está listo</Text>
            </View>

            <View style={styles.avatarWrapper}>
              <View style={styles.avatarCircle}>
                <Feather name="smile" size={20} color="#174A62" />
              </View>
              <Text style={styles.avatarLabel}>¡Vamos!</Text>
            </View>
          </View>

          {/* Tarjeta Principal del Objetivo */}
          <View style={styles.goalCard}>
            <View style={styles.goalIconCircle}>
              <Feather name="target" size={22} color="#174A62" />
            </View>
            <View style={styles.goalTextContainer}>
              <Text style={styles.goalCardBadge}>TU OBJETIVO</Text>
              <Text style={styles.goalCardTitle}>{goalTitle}</Text>
              <Text style={styles.goalCardDate}>{goalDate}</Text>
            </View>
          </View>

          {/* 3 Mini Tarjetas de Métricas (Igual al Prototipo) */}
          <View style={styles.metricsRow}>
            <View style={styles.miniMetricCard}>
              <Text style={styles.miniMetricValue}>MEDIA</Text>
              <Text style={styles.miniMetricLabel}>Prioridad</Text>
            </View>
            <View style={styles.miniMetricCard}>
              <Text style={styles.miniMetricValue}>4 H</Text>
              <Text style={styles.miniMetricLabel}>Por semana</Text>
            </View>
            <View style={styles.miniMetricCard}>
              <Text style={styles.miniMetricValue}>3 DÍAS</Text>
              <Text style={styles.miniMetricLabel}>Disponibles</Text>
            </View>
          </View>

          {/* Resumen de conteo */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>
              <Text style={styles.summaryBold}>{stages.length}</Text> etapas
            </Text>
            <Text style={styles.summaryDot}>•</Text>
            <Text style={styles.summaryText}>
              <Text style={styles.summaryBold}>{activityCount}</Text> actividades
            </Text>
            <Text style={styles.summaryDot}>•</Text>
            <Text style={styles.summaryText}>
              <Text style={styles.summaryBold}>4</Text> semanas
            </Text>
          </View>

          {/* Tarjeta de Acceso a la Agenda Adaptada */}
          <TouchableOpacity
            style={styles.scheduleAccessCard}
            activeOpacity={0.85}
            onPress={() => router.push('/schedule')}
          >
            <View style={styles.scheduleCardLeft}>
              <View style={styles.calendarIconBox}>
                <Feather name="calendar" size={18} color="#174A62" />
              </View>
              <View>
                <Text style={styles.scheduleCardTag}>PLAN ADAPTADO A TU DISPONIBILIDAD</Text>
                <Text style={styles.scheduleCardTitle}>Ver agenda de esta semana</Text>
              </View>
            </View>
            <Feather name="arrow-right" size={18} color="#174A62" />
          </TouchableOpacity>

          {/* Timeline de Etapas */}
          <View style={styles.timelineContainer}>
            <View style={styles.timelineLine} />
            {stages.map((stage, index) => {
              const isFirst = index === 0;
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
                    <View style={styles.numberCircle}>
                      <Text style={styles.numberText}>
                        {String(index + 1).padStart(2, '0')}
                      </Text>
                    </View>

                    <View style={styles.stageInfo}>
                      <Text style={styles.stageBadge}>
                        {isFirst ? 'LISTA PARA EMPEZAR' : index === 1 ? 'SIGUIENTE' : 'DESPUÉS'}
                      </Text>
                      <Text style={styles.stageTitle}>
                        Etapa {index + 1} — {stage.name}
                      </Text>
                      <Text style={styles.stageSubtitle}>
                        {stage.activity_count} actividades · {index === 0 ? '1 semana' : index === 1 ? '2 semanas' : '1 semana'}
                      </Text>
                    </View>

                    <Feather name="chevron-right" size={18} color="#94A3B8" />
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Botón flotante para Mapa */}
      <TouchableOpacity
        style={styles.floatingMapBtn}
        activeOpacity={0.85}
        onPress={() => router.push('/home')}
      >
        <Feather name="grid" size={18} color="#FFFFFF" />
        <Text style={styles.floatingMapText}>Inicio</Text>
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
    gap: 14,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  badge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#174A62',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F2C40',
    letterSpacing: -0.5,
  },
  avatarWrapper: {
    alignItems: 'center',
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#D8ECF8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#174A62',
    marginTop: 2,
  },
  goalCard: {
    backgroundColor: '#174A62',
    borderRadius: 22,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    boxShadow: '0px 8px 16px rgba(23, 74, 98, 0.15)',
    elevation: 4,
  },
  goalIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalTextContainer: {
    flex: 1,
  },
  goalCardBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#90C2DE',
    letterSpacing: 1,
    marginBottom: 2,
  },
  goalCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  goalCardDate: {
    fontSize: 11,
    color: '#D8ECF8',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  miniMetricCard: {
    flex: 1,
    backgroundColor: '#EBF5FB',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D8ECF8',
  },
  miniMetricValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#174A62',
    marginBottom: 2,
  },
  miniMetricLabel: {
    fontSize: 10,
    color: '#627D98',
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginVertical: 2,
  },
  summaryText: {
    fontSize: 12,
    color: '#627D98',
  },
  summaryBold: {
    fontWeight: '800',
    color: '#0F2C40',
  },
  summaryDot: {
    color: '#94A3B8',
  },
  scheduleAccessCard: {
    backgroundColor: '#EBF5FB',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D8ECF8',
  },
  scheduleCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  calendarIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scheduleCardTag: {
    fontSize: 9,
    fontWeight: '800',
    color: '#174A62',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  scheduleCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F2C40',
  },
  timelineContainer: {
    position: 'relative',
    gap: 12,
    paddingLeft: 8,
  },
  timelineLine: {
    position: 'absolute',
    left: 28,
    top: 20,
    bottom: 20,
    width: 2,
    backgroundColor: '#CBD5E1',
  },
  stageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    boxShadow: '0px 4px 12px rgba(23, 74, 98, 0.04)',
    elevation: 2,
  },
  stageCardPending: {},
  stageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  numberCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#D8ECF8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#174A62',
  },
  stageInfo: {
    flex: 1,
  },
  stageBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#627D98',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  stageTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F2C40',
    marginBottom: 2,
  },
  stageSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
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