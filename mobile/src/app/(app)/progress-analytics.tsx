import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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
import { BackButton } from '@/components/ui/BackButton';
import { useAuth } from '@/contexts/auth-context';
import { getUserGoals, type CreatedGoal } from '@/services/api/goals';
import { trackingApi, type GoalChartData, type GoalPaceData } from '@/services/api/tracking';

import { GoalStageProgressSection } from '@/components/features/GoalStageProgressSection';
import { GoalEvolutionCard } from '@/components/features/GoalEvolutionCard';
import { GoalDistributionCard } from '@/components/features/GoalDistributionCard';
import { FlowMascotAvatar } from '@/components/features/FlowMascotAvatar';

const defaultEmptyChartData: GoalChartData = {
  goal_id: 0,
  goal_title: 'Cargando objetivo...',
  summary: {
    progress_percentage: '0.00',
    total_activities: 0,
    completed_activities: 0,
    total_estimated_minutes: 0,
    completed_estimated_minutes: 0,
    total_minutes_spent: 0,
  },
  weekly_progress: [],
  status_distribution: {
    completed: 0,
    in_progress: 0,
    pending: 0,
    skipped: 0,
  },
  stage_progress: [],
};

const defaultEmptyPaceData: GoalPaceData = {
  goal_id: 0,
  goal_title: '',
  progress_percentage: '0.00',
  expected_progress_percentage: '0.00',
  pace_status: 'on_track',
  is_delayed: false,
  delay_minutes: 0,
  delay_percentage: 0,
  alert_message: 'Estás dentro del ritmo planificado.',
};

export default function ProgressAnalyticsScreen() {
  const { token } = useAuth();
  const params = useLocalSearchParams<{ goalId?: string }>();
  const [activeGoalId, setActiveGoalId] = useState<number | null>(
    params.goalId && /^\d+$/.test(params.goalId) ? Number(params.goalId) : null,
  );
  const [availableGoals, setAvailableGoals] = useState<CreatedGoal[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [chartData, setChartData] = useState<GoalChartData>(defaultEmptyChartData);
  const [paceData, setPaceData] = useState<GoalPaceData>(defaultEmptyPaceData);

  useEffect(() => {
    if (params.goalId && /^\d+$/.test(params.goalId)) {
      setActiveGoalId(Number(params.goalId));
    }
  }, [params.goalId]);

  const loadData = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const goals = await getUserGoals(token);
      setAvailableGoals(goals);

      let targetGoalId = activeGoalId;
      if (!targetGoalId && goals.length > 0) {
        targetGoalId = goals[0].goal_id;
        setActiveGoalId(targetGoalId);
      } else if (
        targetGoalId &&
        goals.length > 0 &&
        !goals.some((g) => g.goal_id === targetGoalId)
      ) {
        targetGoalId = goals[0].goal_id;
        setActiveGoalId(targetGoalId);
      }

      if (targetGoalId) {
        const [chartsRes, paceRes] = await Promise.allSettled([
          trackingApi.getGoalCharts(targetGoalId, token),
          trackingApi.getGoalPace(targetGoalId, token),
        ]);

        if (chartsRes.status === 'fulfilled' && chartsRes.value) {
          setChartData(chartsRes.value);
        }
        if (paceRes.status === 'fulfilled' && paceRes.value) {
          setPaceData(paceRes.value);
        }
      }
    } catch {
      // Mantener datos previos
    } finally {
      setIsLoading(false);
    }
  }, [token, activeGoalId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const rawPercent = parseFloat(String(chartData.summary?.progress_percentage ?? 0));
  const displayPercent = Math.min(
    100,
    Math.max(0, Math.round(isNaN(rawPercent) ? 0 : rawPercent)),
  );

  const rawExpectedPercent = parseFloat(
    String(paceData?.expected_progress_percentage ?? 0),
  );
  const displayExpectedPercent = Math.min(
    100,
    Math.max(0, Math.round(isNaN(rawExpectedPercent) ? 0 : rawExpectedPercent)),
  );

  const isBehind = paceData.pace_status === 'behind' || paceData.is_delayed;
  const isOnTrack = paceData.pace_status === 'on_track';

  const motivationalMessage = isBehind
    ? {
        title: '¡No te desanimes!',
        desc:
          paceData.alert_message ||
          'Estás un poco por detrás del ritmo. Dedica unos minutos hoy para retomar el impulso.',
      }
    : displayPercent >= 50
    ? {
        title: '¡Increíble avance!',
        desc: 'Has superado la mitad de tu objetivo. Sigue con ese ritmo.',
      }
    : {
        title: '¡Vas avanzando!',
        desc: 'Cada actividad te acerca a tu objetivo. La constancia es la clave.',
      };

  return (
    <Screen style={styles.screenBg}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Cabecera superior con BackButton unificado */}
        <View style={styles.topBar}>
          <BackButton />
          <Text style={styles.topBarTitle}>SEGUIMIENTO</Text>
          <BrandHeader />
        </View>

        {/* Título de la vista */}
        <Text style={styles.categorySubLabel}>TU PROGRESO</Text>
        <Text style={styles.mainTitle}>Vas construyendo tu objetivo</Text>
        <Text style={styles.descriptionText}>
          Una mirada clara a todo lo que ya has avanzado.
        </Text>

        {/* Selector de Objetivos Horizontal (HU-44) */}
        {availableGoals.length > 1 && (
          <View style={styles.selectorWrapper}>
            <Text style={styles.selectorLabel}>SELECCIONAR OBJETIVO</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.goalSelectorContent}
              style={styles.goalSelectorScroll}
            >
              {availableGoals.map((g) => {
                const isSelected = g.goal_id === activeGoalId;
                return (
                  <TouchableOpacity
                    key={g.goal_id}
                    style={[styles.goalPill, isSelected && styles.goalPillActive]}
                    onPress={() => setActiveGoalId(g.goal_id)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.goalPillText,
                        isSelected && styles.goalPillTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {g.title}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {isLoading ? (
          <ActivityIndicator
            size="large"
            color="#174A62"
            style={{ marginVertical: 30 }}
          />
        ) : (
          <>
            {/* Tarjeta 1: Resumen del Objetivo */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.iconCircle}>
                  <Feather name="target" size={16} color="#174A62" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionCategory}>MI OBJETIVO</Text>
                  <Text style={styles.sectionTitle} numberOfLines={2}>
                    {chartData.goal_title || 'Objetivo'}
                  </Text>
                </View>
              </View>

              <View style={styles.percentageRow}>
                <Text style={styles.bigPercentage}>{displayPercent}%</Text>
                <Text style={styles.percentageSub}>del objetivo completado</Text>
              </View>

              <View style={styles.progressBarBg}>
                <View
                  style={[styles.progressBarFill, { width: `${displayPercent}%` }]}
                />
              </View>

              <View style={styles.statsSummaryRow}>
                <View style={styles.statMiniCol}>
                  <Text style={styles.statMiniNum}>
                    {chartData.summary?.completed_activities || 0}
                  </Text>
                  <Text style={styles.statMiniLabel}>completadas</Text>
                </View>
                <View style={styles.verticalDivider} />
                <View style={styles.statMiniCol}>
                  <Text style={styles.statMiniNum}>
                    {chartData.status_distribution?.pending ??
                      Math.max(
                        0,
                        (chartData.summary?.total_activities || 0) -
                          (chartData.summary?.completed_activities || 0),
                      )}
                  </Text>
                  <Text style={styles.statMiniLabel}>pendientes</Text>
                </View>
                <View style={styles.verticalDivider} />
                <View style={styles.statMiniCol}>
                  <Text style={styles.statMiniNum}>
                    {chartData.status_distribution?.skipped ?? 0}
                  </Text>
                  <Text style={styles.statMiniLabel}>no completada</Text>
                </View>
              </View>
            </View>

            {/* Mensaje motivacional con la carita Flow */}
            <View
              style={[
                styles.motivationalCard,
                isBehind && { backgroundColor: '#FEF3C7' },
              ]}
            >
              <View style={styles.avatarMiniContainer}>
                <FlowMascotAvatar />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.motivationalTitle,
                    isBehind && { color: '#92400E' },
                  ]}
                >
                  {motivationalMessage.title}
                </Text>
                <Text
                  style={[
                    styles.motivationalDesc,
                    isBehind && { color: '#B45309' },
                  ]}
                >
                  {motivationalMessage.desc}
                </Text>
              </View>
            </View>

            {/* Tarjeta 2: Ritmo de Avance (HU-25 / HU-24) */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRowSpace}>
                <View>
                  <Text style={styles.sectionCategory}>RITMO DE AVANCE</Text>
                  <Text style={styles.sectionTitle}>
                    {isBehind ? 'Alerta de retraso' : 'Vas según lo planificado'}
                  </Text>
                </View>
                <View
                  style={
                    isOnTrack
                      ? styles.badgeInRhythm
                      : isBehind
                      ? styles.badgeBehind
                      : styles.badgeNoSchedule
                  }
                >
                  <Text
                    style={
                      isOnTrack
                        ? styles.badgeInRhythmText
                        : isBehind
                        ? styles.badgeBehindText
                        : styles.badgeNoScheduleText
                    }
                  >
                    {isOnTrack
                      ? 'EN RITMO'
                      : isBehind
                      ? 'RETRASADO'
                      : 'SIN CRONOGRAMA'}
                  </Text>
                </View>
              </View>

              <View style={styles.paceBarContainer}>
                <View style={styles.paceLabelRow}>
                  <Text style={styles.paceLabelText}>Progreso actual</Text>
                  <Text style={styles.paceValueText}>{displayPercent}%</Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View
                    style={[styles.progressBarFill, { width: `${displayPercent}%` }]}
                  />
                </View>
              </View>

              <View style={styles.paceBarContainer}>
                <View style={styles.paceLabelRow}>
                  <Text style={styles.paceLabelText}>Progreso esperado</Text>
                  <Text style={styles.paceValueText}>{displayExpectedPercent}%</Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFillExpected,
                      { width: `${displayExpectedPercent}%` },
                    ]}
                  />
                </View>
              </View>

              <View
                style={[
                  styles.infoAlertBox,
                  isBehind && { backgroundColor: '#FEE2E2' },
                ]}
              >
                <Text
                  style={[
                    styles.infoAlertText,
                    isBehind && { color: '#991B1B' },
                  ]}
                >
                  {paceData.alert_message ||
                    (isOnTrack
                      ? 'Estás dentro del ritmo previsto para hoy. ¡Mantén tu constancia!'
                      : 'No hay cronogramas activos asignados aún para calcular el ritmo esperado.')}
                </Text>
              </View>
            </View>

            {/* Tarjeta 3: Evolución (Gráfica de Línea) */}
            <GoalEvolutionCard weeklyProgress={chartData.weekly_progress} />

            {/* Tarjeta 4: Distribución (Gráfica de Pastel / Donut) */}
            <GoalDistributionCard
              completed={chartData.summary?.completed_activities || 0}
              pending={
                chartData.status_distribution?.pending ??
                Math.max(
                  0,
                  (chartData.summary?.total_activities || 0) -
                    (chartData.summary?.completed_activities || 0),
                )
              }
              skipped={chartData.status_distribution?.skipped || 0}
              total={chartData.summary?.total_activities || 0}
            />

            {/* Componente reutilizado de Progreso por Etapa */}
            <GoalStageProgressSection
              stages={chartData.stage_progress}
              onPressHistory={() =>
                router.push({
                  pathname: '/activity-history',
                  params: { goalId: activeGoalId ? String(activeGoalId) : '' },
                })
              }
            />

            {/* Botón Inferior Principal */}
            <TouchableOpacity
              style={styles.bottomNavButton}
              onPress={() =>
                router.push({
                  pathname: '/activity-history',
                  params: { goalId: activeGoalId ? String(activeGoalId) : '' },
                })
              }
              activeOpacity={0.85}
            >
              <Text style={styles.bottomNavButtonText}>Ver historial de actividades</Text>
              <Feather
                name="arrow-right"
                size={18}
                color="#FFFFFF"
                style={{ marginLeft: 8 }}
              />
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenBg: {
    backgroundColor: '#FDFBF7',
    flex: 1,
  },
  container: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  topBarTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#627D98',
    letterSpacing: 0.5,
  },
  categorySubLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#174A62',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0F2C40',
    marginBottom: 6,
  },
  descriptionText: {
    fontSize: 13,
    color: '#627D98',
    marginBottom: 16,
  },
  selectorWrapper: {
    marginBottom: 16,
  },
  selectorLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#627D98',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  goalSelectorScroll: {
    flexGrow: 0,
  },
  goalSelectorContent: {
    gap: 8,
    paddingRight: 16,
  },
  goalPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D8ECF8',
  },
  goalPillActive: {
    backgroundColor: '#174A62',
    borderColor: '#174A62',
  },
  goalPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#174A62',
    maxWidth: 180,
  },
  goalPillTextActive: {
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E4E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardHeaderRowSpace: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E2EEF1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  sectionCategory: {
    fontSize: 10,
    fontWeight: '700',
    color: '#174A62',
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0F2C40',
  },
  percentageRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  bigPercentage: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0F2C40',
    marginRight: 8,
  },
  percentageSub: {
    fontSize: 13,
    color: '#627D98',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#EDF2F7',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#174A62',
    borderRadius: 4,
  },
  progressBarFillExpected: {
    height: '100%',
    backgroundColor: '#9FB3C8',
    borderRadius: 4,
  },
  statsSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F0F4F8',
    paddingTop: 14,
  },
  statMiniCol: {
    alignItems: 'center',
    flex: 1,
  },
  statMiniNum: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F2C40',
  },
  statMiniLabel: {
    fontSize: 10,
    color: '#627D98',
  },
  verticalDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E4E7EB',
  },
  motivationalCard: {
    backgroundColor: '#E2EEF1',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarMiniContainer: {
    marginRight: 12,
  },
  motivationalTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F2C40',
  },
  motivationalDesc: {
    fontSize: 12,
    color: '#334E68',
  },
  badgeInRhythm: {
    backgroundColor: '#E6FFFA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#38A169',
  },
  badgeInRhythmText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#234E52',
  },
  badgeBehind: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DC2626',
  },
  badgeBehindText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#991B1B',
  },
  badgeNoSchedule: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  badgeNoScheduleText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#4B5563',
  },
  paceBarContainer: {
    marginBottom: 10,
  },
  paceLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  paceLabelText: {
    fontSize: 12,
    color: '#627D98',
  },
  paceValueText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0F2C40',
  },
  infoAlertBox: {
    backgroundColor: '#F0F4F8',
    borderRadius: 10,
    padding: 12,
    marginTop: 6,
  },
  infoAlertText: {
    fontSize: 12,
    color: '#334E68',
    lineHeight: 16,
  },
  bottomNavButton: {
    backgroundColor: '#174A62',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#174A62',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    marginTop: 8,
  },
  bottomNavButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
