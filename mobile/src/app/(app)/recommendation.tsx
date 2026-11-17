import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { BackButton } from '@/components/ui/BackButton';
import { FlowMascotAvatar } from '@/components/features/FlowMascotAvatar';
import { useAuth } from '@/contexts/auth-context';
import {
  getGoalRecommendations,
  RecommendationDiagnostic,
} from '@/services/api/recommendations';

export default function RecommendationScreen() {
  const { token } = useAuth();
  const params = useLocalSearchParams<{ goalId?: string; activityTitle?: string; goalTitle?: string }>();
  const [loading, setLoading] = useState<boolean>(true);
  const [diagnostic, setDiagnostic] = useState<RecommendationDiagnostic | null>(null);

  const goalIdNum = params.goalId ? Number(params.goalId) : 1;

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const data = await getGoalRecommendations(goalIdNum, token);
        if (isMounted && data) {
          setDiagnostic(data);
        }
      } catch (err) {
        console.warn('No se pudo cargar diagnóstico del backend:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [goalIdNum, token]);

  const goalTitle = diagnostic?.goal_title || params.goalTitle || 'Objetivo actual';
  const activityTitle = diagnostic?.activity_title || params.activityTitle || 'Actividad pendiente';
  const progressPercent = diagnostic?.metrics?.progress_percentage ?? 25;
  const completedCount = diagnostic?.metrics?.completed_activities ?? 3;
  const availableHours = diagnostic?.metrics?.available_hours_weekly ?? 4;
  const solutionTitle = diagnostic?.solution_focus || 'Dar más espacio al aprendizaje';
  const solutions = diagnostic?.solutions?.length
    ? diagnostic.solutions
    : [
        `Conservar las ${completedCount} actividades ya completadas.`,
        'Añadir un recurso breve sobre conceptos clave.',
        `Reprogramar "${activityTitle}" a tu horario de mayor concentración.`,
      ];
  const benefitText =
    diagnostic?.recommended_actions?.[0] ||
    'Recuperar el ritmo manteniendo sesiones adaptadas a tu disponibilidad.';

  const handleKeepCurrentPlan = () => {
    router.replace('/home' as any);
  };

  const handleCompareProposals = () => {
    router.push({
      pathname: '/alternatives',
      params: { goalId: String(goalIdNum) },
    } as any);
  };

  return (
    <Screen style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Cabecera superior */}
        <View style={styles.topHeader}>
          <BackButton />
          <Text style={styles.headerTag}>RECOMENDACIÓN</Text>
          <View style={styles.brandContainer}>
            <Feather name="bar-chart-2" size={16} color="#174A62" />
            <Text style={styles.brandText}>FlowStep</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#174A62" />
            <Text style={styles.loadingText}>Analizando tu progreso con Flow AI...</Text>
          </View>
        ) : (
          <>
            {/* Tarjeta Destacada de Mascota / Título */}
            <View style={styles.highlightCard}>
              <View style={styles.mascotContainer}>
                <FlowMascotAvatar />
              </View>
              <Text style={styles.highlightSubTag}>RECOMENDACIÓN DE FLOW</Text>
              <Text style={styles.highlightTitle}>Recupera el ritmo sin sobrecargarte</Text>
              <Text style={styles.highlightDesc}>
                Detectamos una oportunidad para ajustar tu plan de "{goalTitle}".
              </Text>
            </View>

            {/* Alerta de Retraso / Diagnóstico */}
            <View style={styles.alertCard}>
              <View style={styles.alertIconBox}>
                <Feather
                  name={diagnostic?.alert_level === 'critical' ? 'alert-triangle' : 'alert-circle'}
                  size={20}
                  color={diagnostic?.alert_level === 'critical' ? '#E53E3E' : '#C53030'}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.alertCategory}>¿POR QUÉ TE LA SUGERIMOS?</Text>
                <Text style={styles.alertTitle}>
                  {diagnostic?.alert_message || `Una actividad lleva ${diagnostic?.max_days_late ?? 2} días de retraso`}
                </Text>
                <Text style={styles.alertDesc}>
                  {diagnostic?.why_suggested ||
                    `"${activityTitle}" no pudo completarse en la fecha estimada y registraste notas de dificultad.`}
                </Text>
              </View>
            </View>

            {/* Mini Métricas del Estado */}
            <View style={styles.metricsRow}>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>{progressPercent}%</Text>
                <Text style={styles.metricLabel}>progreso actual</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>{completedCount}</Text>
                <Text style={styles.metricLabel}>completadas</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>{availableHours} h</Text>
                <Text style={styles.metricLabel}>disponibles</Text>
              </View>
            </View>

            {/* Caja de lo que busca solucionar */}
            <View style={styles.solutionCard}>
              <Text style={styles.solutionCategory}>QUÉ BUSCA SOLUCIONAR</Text>
              <Text style={styles.solutionTitle}>{solutionTitle}</Text>

              <View style={styles.checkList}>
                {solutions.map((item, idx) => (
                  <View key={idx} style={styles.checkRow}>
                    <Feather name="check" size={14} color="#2F855A" />
                    <Text style={styles.checkText}>{item}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.benefitBox}>
                <Feather name="zap" size={14} color="#174A62" />
                <Text style={styles.benefitText}>
                  Beneficio esperado: {benefitText}
                </Text>
              </View>
            </View>

            {/* Botón principal: Comparar propuestas */}
            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.85}
              onPress={handleCompareProposals}
            >
              <Text style={styles.primaryButtonText}>Comparar propuestas</Text>
              <Feather name="arrow-right" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
            </TouchableOpacity>

            {/* Botón secundario: Mantener plan actual */}
            <TouchableOpacity
              style={styles.secondaryButton}
              activeOpacity={0.7}
              onPress={handleKeepCurrentPlan}
            >
              <Text style={styles.secondaryButtonText}>Mantener mi plan actual</Text>
            </TouchableOpacity>
          </>
        )}
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
    paddingTop: 16,
    paddingBottom: 40,
    gap: 16,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#627D98',
    letterSpacing: 1.2,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  brandText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#174A62',
  },
  highlightCard: {
    backgroundColor: '#EBF5FB',
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D8ECF8',
    gap: 6,
  },
  mascotContainer: {
    marginBottom: 4,
  },
  highlightSubTag: {
    fontSize: 9,
    fontWeight: '800',
    color: '#174A62',
    letterSpacing: 1,
  },
  highlightTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F2C40',
    textAlign: 'center',
  },
  highlightDesc: {
    fontSize: 12,
    color: '#627D98',
    textAlign: 'center',
    lineHeight: 18,
  },
  alertCard: {
    backgroundColor: '#FDF2F2',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    gap: 14,
    borderWidth: 1,
    borderColor: '#F8D7CD',
  },
  alertIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  alertCategory: {
    fontSize: 9,
    fontWeight: '800',
    color: '#C53030',
    letterSpacing: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#742A2A',
    marginVertical: 2,
  },
  alertDesc: {
    fontSize: 12,
    color: '#9B2C2C',
    lineHeight: 17,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F2C40',
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 10,
    color: '#627D98',
    fontWeight: '600',
  },
  solutionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  solutionCategory: {
    fontSize: 10,
    fontWeight: '800',
    color: '#174A62',
    letterSpacing: 1,
  },
  solutionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F2C40',
  },
  checkList: {
    gap: 8,
    marginVertical: 4,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkText: {
    fontSize: 12,
    color: '#334E68',
    fontWeight: '600',
  },
  benefitBox: {
    backgroundColor: '#F0F4F8',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  benefitText: {
    fontSize: 11,
    color: '#174A62',
    flex: 1,
    fontWeight: '600',
    lineHeight: 16,
  },
  primaryButton: {
    backgroundColor: '#174A62',
    borderRadius: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#174A62',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    elevation: 3,
    marginTop: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: '#627D98',
    fontSize: 13,
    fontWeight: '700',
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#627D98',
    fontWeight: '600',
  },
});