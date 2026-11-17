import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { BackButton } from '@/components/ui/BackButton';
import { useAuth } from '@/contexts/auth-context';
import {
  applyReplanAlternative,
  getReplanAlternatives,
  rejectReplanAlternative,
  ReplanAlternativesResponse,
} from '@/services/api/recommendations';

type ProposalType = 'balanced' | 'learning' | 'time';

export default function AlternativesScreen() {
  const { token } = useAuth();
  const params = useLocalSearchParams<{ goalId?: string }>();
  const [selectedProposal, setSelectedProposal] = useState<ProposalType>('balanced');
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [alternativesData, setAlternativesData] = useState<ReplanAlternativesResponse | null>(null);

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
        const res = await getReplanAlternatives(goalIdNum, token);
        if (isMounted && res) {
          setAlternativesData(res);
        }
      } catch (err) {
        console.warn('No se pudieron obtener alternativas del backend:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [goalIdNum, token]);

  const handleApplyProposal = async () => {
    if (!token) {
      router.push({
        pathname: '/goal-success',
        params: { goalId: String(goalIdNum), fromSuccess: '1', isReplan: '1' },
      } as any);
      return;
    }

    try {
      setSubmitting(true);
      await applyReplanAlternative(goalIdNum, selectedProposal, token);
      router.push({
        pathname: '/goal-success',
        params: { goalId: String(goalIdNum), fromSuccess: '1', isReplan: '1' },
      } as any);
    } catch (err: any) {
      Alert.alert(
        'Aviso',
        err?.message || 'No se pudo aplicar la propuesta. Intenta nuevamente.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectChanges = async () => {
    if (token) {
      try {
        await rejectReplanAlternative(goalIdNum, token);
      } catch {}
    }
    router.replace('/home' as any);
  };

  const completedCount = alternativesData?.completed_count ?? 3;
  const recordedHours = alternativesData?.recorded_hours ?? 3;
  const progressPct = alternativesData?.progress_percentage ?? 25;

  const balancedAlt = alternativesData?.alternatives?.find((a) => a.proposal_type === 'balanced');
  const learningAlt = alternativesData?.alternatives?.find((a) => a.proposal_type === 'learning');
  const timeAlt = alternativesData?.alternatives?.find((a) => a.proposal_type === 'time');

  return (
    <Screen style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Cabecera superior */}
        <View style={styles.topHeader}>
          <BackButton />
          <Text style={styles.headerTag}>COMPARAR PROPUESTAS</Text>
          <View style={styles.brandContainer}>
            <Feather name="bar-chart-2" size={16} color="#174A62" />
            <Text style={styles.brandText}>FlowStep</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#174A62" />
            <Text style={styles.loadingText}>Calculando escenarios de ajuste adaptativo...</Text>
          </View>
        ) : (
          <>
            {/* Título de la sección */}
            <View style={styles.titleSection}>
              <Text style={styles.sectionCategory}>ADAPTAR PLAN</Text>
              <Text style={styles.mainTitle}>Elige cómo continuar</Text>
              <Text style={styles.subtitle}>
                Todas las opciones conservan tus actividades realizadas y el {progressPct}% de progreso.
              </Text>
            </View>

            {/* Tarjeta de Protección de Progreso */}
            <View style={styles.protectedCard}>
              <Feather name="check-circle" size={16} color="#2F855A" />
              <View style={{ flex: 1 }}>
                <Text style={styles.protectedTitle}>Tu trabajo está protegido</Text>
                <Text style={styles.protectedDesc}>
                  {completedCount} completadas · {recordedHours} h registradas · dificultades guardadas
                </Text>
              </View>
            </View>

            {/* Opciones de Propuestas */}
            <View style={styles.proposalsList}>
              {/* Opción 1: Equilibrada (Recomendada) */}
              <TouchableOpacity
                style={[
                  styles.proposalCard,
                  selectedProposal === 'balanced' && styles.proposalCardActive,
                ]}
                activeOpacity={0.85}
                onPress={() => setSelectedProposal('balanced')}
              >
                <View style={styles.proposalHeaderRow}>
                  <View style={styles.radioContainer}>
                    <View style={[styles.radioOuter, selectedProposal === 'balanced' && styles.radioOuterActive]}>
                      {selectedProposal === 'balanced' && <View style={styles.radioInner} />}
                    </View>
                    <View>
                      <Text style={styles.proposalTypeLabel}>{balancedAlt?.title || 'Equilibrada'}</Text>
                      <Text style={styles.proposalTitle}>{balancedAlt?.tagline || 'Redistribuir esta semana'}</Text>
                    </View>
                  </View>
                  <View style={styles.badgeRecommended}>
                    <Text style={styles.badgeRecommendedText}>RECOMENDADA</Text>
                  </View>
                </View>

                <Text style={styles.proposalDesc}>
                  {balancedAlt?.description || 'Mueve 2 actividades y mantiene la fecha límite.'}
                </Text>

                <View style={styles.proposalStatsRow}>
                  <View style={styles.miniTag}>
                    <Text style={styles.miniTagText}>{balancedAlt?.session_info || '3 sesiones · máx. 60 min'}</Text>
                  </View>
                </View>

                <View style={styles.proposalPillsRow}>
                  {(balancedAlt?.changes || ['Redistribuir próximas sesiones', 'Mantener fecha']).map((ch, idx) => (
                    <View key={idx} style={styles.actionPill}>
                      <Text style={styles.actionPillText}>{ch}</Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>

              {/* Opción 2: Más aprendizaje */}
              <TouchableOpacity
                style={[
                  styles.proposalCard,
                  selectedProposal === 'learning' && styles.proposalCardActive,
                ]}
                activeOpacity={0.85}
                onPress={() => setSelectedProposal('learning')}
              >
                <View style={styles.proposalHeaderRow}>
                  <View style={styles.radioContainer}>
                    <View style={[styles.radioOuter, selectedProposal === 'learning' && styles.radioOuterActive]}>
                      {selectedProposal === 'learning' && <View style={styles.radioInner} />}
                    </View>
                    <View>
                      <Text style={styles.proposalTypeLabel}>{learningAlt?.title || 'Más aprendizaje'}</Text>
                      <Text style={styles.proposalTitle}>{learningAlt?.tagline || 'Añadir refuerzo guiado'}</Text>
                    </View>
                  </View>
                  <View style={styles.badgeSupport}>
                    <Text style={styles.badgeSupportText}>MÁS APOYO</Text>
                  </View>
                </View>

                <Text style={styles.proposalDesc}>
                  {learningAlt?.description || 'Agrega 2 recursos y desplaza la práctica 3 días.'}
                </Text>

                <View style={styles.proposalStatsRow}>
                  <View style={styles.miniTag}>
                    <Text style={styles.miniTagText}>{learningAlt?.session_info || '4 sesiones · Incluye refuerzo'}</Text>
                  </View>
                </View>

                <View style={styles.proposalPillsRow}>
                  {(learningAlt?.changes || ['+ 2 recursos', 'Reforzar conceptos']).map((ch, idx) => (
                    <View key={idx} style={styles.actionPill}>
                      <Text style={styles.actionPillText}>{ch}</Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>

              {/* Opción 3: Más tiempo */}
              <TouchableOpacity
                style={[
                  styles.proposalCard,
                  selectedProposal === 'time' && styles.proposalCardActive,
                ]}
                activeOpacity={0.85}
                onPress={() => setSelectedProposal('time')}
              >
                <View style={styles.proposalHeaderRow}>
                  <View style={styles.radioContainer}>
                    <View style={[styles.radioOuter, selectedProposal === 'time' && styles.radioOuterActive]}>
                      {selectedProposal === 'time' && <View style={styles.radioInner} />}
                    </View>
                    <View>
                      <Text style={styles.proposalTypeLabel}>{timeAlt?.title || 'Más tiempo'}</Text>
                      <Text style={styles.proposalTitle}>{timeAlt?.tagline || 'Extender fecha límite'}</Text>
                    </View>
                  </View>
                  <View style={styles.badgeLight}>
                    <Text style={styles.badgeLightText}>MENOR CARGA</Text>
                  </View>
                </View>

                <Text style={styles.proposalDesc}>
                  {timeAlt?.description || 'Reduce la carga semanal y extiende el plazo 2 semanas.'}
                </Text>

                <View style={styles.proposalStatsRow}>
                  <View style={styles.miniTag}>
                    <Text style={styles.miniTagText}>{timeAlt?.session_info || '2 sesiones · máx. 45 min'}</Text>
                  </View>
                </View>

                <View style={styles.proposalPillsRow}>
                  {(timeAlt?.changes || ['Extensión +14 días', '- 1 sesión/sem']).map((ch, idx) => (
                    <View key={idx} style={styles.actionPill}>
                      <Text style={styles.actionPillText}>{ch}</Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            </View>

            {/* Caja de explicación de la opción seleccionada */}
            <View style={styles.reasonBox}>
              <Text style={styles.reasonCategory}>¿POR QUÉ ESTÁ OPCIÓN?</Text>
              <Text style={styles.reasonText}>
                {selectedProposal === 'balanced' &&
                  (balancedAlt?.impact || 'Aprovecha tu disponibilidad semanal para resolver el retraso sin cambiar la fecha límite.')}
                {selectedProposal === 'learning' &&
                  (learningAlt?.impact || 'Ideal si necesitas afianzar conceptos clave antes de avanzar con la programación.')}
                {selectedProposal === 'time' &&
                  (timeAlt?.impact || 'Distribuye mejor el esfuerzo diario si tienes una agenda apretada esta semana.')}
              </Text>
            </View>

            {/* Botón principal: Aplicar propuesta */}
            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.85}
              disabled={submitting}
              onPress={handleApplyProposal}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Aplicar propuesta seleccionada</Text>
              )}
            </TouchableOpacity>

            {/* Botón secundario: Rechazar cambios */}
            <TouchableOpacity
              style={styles.secondaryButton}
              activeOpacity={0.7}
              disabled={submitting}
              onPress={handleRejectChanges}
            >
              <Text style={styles.secondaryButtonText}>Rechazar cambios</Text>
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
    paddingHorizontal: 16,
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
  titleSection: {
    gap: 2,
    marginTop: 2,
  },
  sectionCategory: {
    fontSize: 10,
    fontWeight: '800',
    color: '#174A62',
    letterSpacing: 1.2,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F2C40',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    color: '#627D98',
    lineHeight: 18,
  },
  protectedCard: {
    backgroundColor: '#E6FFFA',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#B2F5EA',
  },
  protectedTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#234E52',
  },
  protectedDesc: {
    fontSize: 11,
    color: '#2C7A7B',
    marginTop: 1,
  },
  proposalsList: {
    gap: 12,
  },
  proposalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  proposalCardActive: {
    borderColor: '#174A62',
    backgroundColor: '#FFFFFF',
    shadowColor: '#174A62',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    elevation: 3,
  },
  proposalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  radioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterActive: {
    borderColor: '#174A62',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#174A62',
  },
  proposalTypeLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#627D98',
    letterSpacing: 0.8,
  },
  proposalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F2C40',
  },
  badgeRecommended: {
    backgroundColor: '#EBF5FB',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D8ECF8',
  },
  badgeRecommendedText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#174A62',
  },
  badgeSupport: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeSupportText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#276749',
  },
  badgeLight: {
    backgroundColor: '#EDF2F7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeLightText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#4A5568',
  },
  proposalDesc: {
    fontSize: 12,
    color: '#627D98',
    marginLeft: 34,
  },
  proposalStatsRow: {
    marginLeft: 34,
    marginTop: 2,
  },
  miniTag: {
    backgroundColor: '#F8FAFC',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  miniTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#334E68',
  },
  proposalPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 34,
    marginTop: 4,
  },
  actionPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  actionPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  reasonBox: {
    backgroundColor: '#EBF5FB',
    borderRadius: 16,
    padding: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: '#D8ECF8',
  },
  reasonCategory: {
    fontSize: 9,
    fontWeight: '800',
    color: '#174A62',
    letterSpacing: 1,
  },
  reasonText: {
    fontSize: 12,
    color: '#334E68',
    lineHeight: 18,
  },
  primaryButton: {
    backgroundColor: '#174A62',
    borderRadius: 18,
    paddingVertical: 16,
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
    paddingVertical: 10,
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