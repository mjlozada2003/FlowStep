import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
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
import { trackingApi } from '@/services/api/tracking';
import { completeActivity } from '@/services/api/stages';
import {
  getActivityResources,
  type LearningResourceItem,
} from '@/services/api/learning';
import { ActivityMissModal } from '@/components/features/ActivityMissModal';
import { ActivityTimeCard } from '@/components/features/ActivityTimeCard';
import { ActivityDifficultyCard } from '@/components/features/ActivityDifficultyCard';

interface MissReason {
  reason_id: number;
  name: string;
  description?: string;
}

const mockMissReasons: MissReason[] = [
  { reason_id: 1, name: 'Falta de tiempo' },
  { reason_id: 2, name: 'Dificultad con la actividad' },
  { reason_id: 3, name: 'Falta de conocimientos' },
  { reason_id: 4, name: 'Imprevistos' },
  { reason_id: 5, name: 'Otro' },
];

function buildFallbackActivityKnowledge(
  activityTitle: string,
  stageInfo: string,
  activityDesc: string,
): {
  summary: string;
  keyPoints: string[];
  resources: LearningResourceItem[];
} {
  return {
    summary: `Enfócate en dominar "${activityTitle}" dentro de ${stageInfo}. ${activityDesc}`,
    keyPoints: [
      `Identifica el resultado concreto que debes lograr en "${activityTitle}" antes de empezar.`,
      'Divide la tarea en bloques cortos para detectar dudas a tiempo.',
      'Anota qué parte te costó más para reforzarla o evaluarla al terminar.',
    ],
    resources: [
      {
        id: 'act-guide-1',
        type: 'LECTURA',
        duration: '5 min',
        title: `Guía conceptual: ${activityTitle}`,
        category: stageInfo,
        badge_text: 'Actividad',
        icon_name: 'book-open',
        summary: `Conceptos clave y enfoque práctico para resolver "${activityTitle}" con claridad.`,
        reading_content: `Enfoque de "${activityTitle}" (${stageInfo}):\n\n${activityDesc}\n\nRevisa primero los conceptos base, aplica un ejemplo pequeño y verifica que el resultado cumpla con lo esperado en la etapa.`,
        key_points: [
          `Comprender el propósito de "${activityTitle}".`,
          'Aplicar el concepto en un caso concreto.',
          'Validar el resultado antes de cerrar la sesión.',
        ],
      },
      {
        id: 'act-practice-2',
        type: 'PRÁCTICA',
        duration: '15 min',
        title: `Checklist de ejecución: ${activityTitle}`,
        category: stageInfo,
        badge_text: 'Práctica',
        icon_name: 'code',
        summary: `Pasos recomendados para ejecutar "${activityTitle}" sin bloqueos.`,
        practice_steps: [
          `Preparar lo necesario para "${activityTitle}".`,
          'Ejecutar el desarrollo paso a paso.',
          'Registrar notas o dudas en el bloque de dificultad.',
        ],
      },
    ],
  };
}

export default function ActivityDetailScreen() {
  const params = useLocalSearchParams<{
    activityId?: string;
    stageId?: string;
    goalId?: string;
    title?: string;
    duration?: string;
    stageTitle?: string;
    description?: string;
  }>();
  const { token } = useAuth();

  const activityId = params.activityId && /^\d+$/.test(params.activityId) ? Number(params.activityId) : 1;
  const stageId = params.stageId && /^\d+$/.test(params.stageId) ? Number(params.stageId) : null;
  const goalId = params.goalId && /^\d+$/.test(params.goalId) ? Number(params.goalId) : null;

  const activityTitle = params.title || 'Introducción a React';
  const stageInfo = params.stageTitle || 'ETAPA 1 · APRENDIZAJE';
  const activityDesc = params.description || 'Comprende los fundamentos y prepara tu entorno de trabajo.';
  const defaultDuration = params.duration ? Number(params.duration) : 45;

  const [hoursSpent, setHoursSpent] = useState('0');
  const [minutesSpent, setMinutesSpent] = useState(String(defaultDuration));
  const [selectedDifficultyTag, setSelectedDifficultyTag] = useState<string>('Falta de conocimientos');
  const [difficultyNotes, setDifficultyNotes] = useState('Me costó entender cómo se conectan los componentes.');

  const [knowledgeExpanded, setKnowledgeExpanded] = useState(true);
  const [loadingKnowledge, setLoadingKnowledge] = useState(false);
  const [activityResources, setActivityResources] = useState<LearningResourceItem[]>([]);
  const [expandedResourceId, setExpandedResourceId] = useState<string | null>(null);

  const [missModalVisible, setMissModalVisible] = useState(false);
  const [missReasons, setMissReasons] = useState<MissReason[]>(mockMissReasons);
  const [selectedReasonId, setSelectedReasonId] = useState<number | null>(null);
  const [missDetails, setMissDetails] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fallbackKnowledge = buildFallbackActivityKnowledge(
    activityTitle,
    stageInfo,
    activityDesc,
  );

  useEffect(() => {
    let active = true;
    if (!token || !activityId) {
      setActivityResources(fallbackKnowledge.resources);
      return;
    }

    setLoadingKnowledge(true);
    getActivityResources(activityId, token)
      .then((res) => {
        if (!active) return;
        if (Array.isArray(res?.resources) && res.resources.length > 0) {
          setActivityResources(res.resources);
        } else {
          setActivityResources(fallbackKnowledge.resources);
        }
      })
      .catch(() => {
        if (!active) return;
        setActivityResources(fallbackKnowledge.resources);
      })
      .finally(() => {
        if (active) setLoadingKnowledge(false);
      });

    return () => {
      active = false;
    };
  }, [activityId, token, activityTitle, stageInfo, activityDesc]);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else if (goalId) {
      router.navigate({
        pathname: '/goal-plan',
        params: { goalId: String(goalId) },
      } as any);
    } else {
      router.replace('/(tabs)/home' as any);
    }
  }, [goalId]);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        handleBack();
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }, [handleBack]),
  );

  const handleCompleteActivity = async () => {
    if (!token || !activityId || isSubmitting) return;

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      // 1. Guardamos la sesión de trabajo y dificultad
      await trackingApi.logWorkSession(
        activityId,
        {
          minutes_spent: (Number(hoursSpent) || 0) * 60 + (Number(minutesSpent) || 0),
          difficulty_notes: `[${selectedDifficultyTag}] ${difficultyNotes}`,
        },
        token,
      ).catch(() => {});

      // 2. Marcamos la actividad como completada
      await completeActivity(activityId, token);

      // 3. Navegamos a la pantalla de éxito reemplazando la vista para no volver al formulario
      router.replace({
        pathname: '/goal-success',
        params: {
          activityId: String(activityId),
          stageId: stageId ? String(stageId) : '',
          goalId: goalId ? String(goalId) : '',
          stageTitle: stageInfo,
        },
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'No se pudo completar la actividad.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenMissModal = async () => {
    setMissModalVisible(true);
    if (!token) return;
    try {
      const data = await trackingApi.getMissReasons(token);
      if (Array.isArray(data) && data.length > 0) setMissReasons(data);
    } catch {
      setMissReasons(mockMissReasons);
    }
  };

  const handleSubmitMiss = async () => {
    if (!selectedReasonId || isSubmitting) return;
    try {
      setIsSubmitting(true);
      if (token && activityId) {
        await trackingApi.recordActivityMiss(
          activityId,
          { reason_id: selectedReasonId, details: missDetails },
          token,
        ).catch(() => {});
      }
      setMissModalVisible(false);
      setTimeout(() => router.back(), 300);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenActivityEvaluation = (res?: LearningResourceItem) => {
    router.push({
      pathname: '/evaluation',
      params: {
        goalId: goalId ? String(goalId) : '1',
        goalTitle: stageInfo,
        resourceId: res?.id ?? `activity-${activityId}`,
        resourceTitle: res?.title ?? activityTitle,
        resourceType: res?.type ?? 'LECTURA',
        resourceCategory: res?.category ?? stageInfo,
        resourceDuration: res?.duration ?? '5 min',
        resourceBadge: res?.badge_text ?? 'Actividad',
        resourceSummary: res?.summary ?? activityDesc,
        readingContent: res?.reading_content ?? '',
        practicalExample: res?.practical_example ?? '',
        resourceKeyPoints: res?.key_points ? JSON.stringify(res.key_points) : JSON.stringify(fallbackKnowledge.keyPoints),
        practiceSteps: res?.practice_steps ? JSON.stringify(res.practice_steps) : '',
      },
    } as any);
  };

  return (
    <Screen style={styles.screenBg}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topBar}>
          <BackButton onPress={handleBack} />
          <Text style={styles.topBarTitle} numberOfLines={1}>DETALLE DE ACTIVIDAD</Text>
          <BrandHeader />
        </View>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <View style={styles.mainActivityCard}>
          <View style={styles.activityBadgeRow}>
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>D1</Text>
            </View>
            <Text style={styles.stageInfoText} numberOfLines={1}>{stageInfo}</Text>
          </View>
          <Text style={styles.activityMainTitle}>{activityTitle}</Text>
          <Text style={styles.activityDescText}>{activityDesc}</Text>
        </View>

        <View style={styles.metaInfoRow}>
          <View style={styles.metaItem}>
            <Feather name="calendar" size={14} color="#627D98" />
            <Text style={styles.metaText}>Sesión programada</Text>
          </View>
          <Text style={styles.metaText}>{defaultDuration} min estimados</Text>
        </View>

        {/* Bloque de Conocimiento y Recursos de esta Actividad */}
        <View style={styles.knowledgeCard}>
          <TouchableOpacity
            style={styles.knowledgeHeader}
            onPress={() => setKnowledgeExpanded((prev) => !prev)}
            activeOpacity={0.8}
          >
            <View style={styles.knowledgeTitleRow}>
              <View style={styles.knowledgeIconBox}>
                <Feather name="book-open" size={16} color="#174A62" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.knowledgeTag}>CONOCIMIENTO DE LA ACTIVIDAD</Text>
                <Text style={styles.knowledgeTitle}>Guía y recursos para este tema</Text>
              </View>
            </View>
            <Feather
              name={knowledgeExpanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color="#627D98"
            />
          </TouchableOpacity>

          {knowledgeExpanded ? (
            <View style={styles.knowledgeBody}>
              <Text style={styles.knowledgeSummary}>{fallbackKnowledge.summary}</Text>

              <View style={styles.keyPointsBox}>
                <Text style={styles.keyPointsHeading}>Puntos clave a tener en cuenta</Text>
                {fallbackKnowledge.keyPoints.map((pt, idx) => (
                  <View key={idx} style={styles.keyPointItem}>
                    <Feather name="check-circle" size={13} color="#174A62" style={{ marginTop: 2 }} />
                    <Text style={styles.keyPointText}>{pt}</Text>
                  </View>
                ))}
              </View>

              {loadingKnowledge ? (
                <ActivityIndicator size="small" color="#174A62" style={{ marginVertical: 4 }} />
              ) : (
                <View style={styles.resourceList}>
                  {activityResources.map((res) => {
                    const isOpen = expandedResourceId === res.id;
                    const bodyText =
                      res.reading_content ||
                      res.summary ||
                      (res.practice_steps ? res.practice_steps.join('\n• ') : '');

                    return (
                      <View key={res.id} style={styles.resourceItemCard}>
                        <TouchableOpacity
                          style={styles.resourceItemHeader}
                          onPress={() =>
                            setExpandedResourceId((prev) => (prev === res.id ? null : res.id))
                          }
                          activeOpacity={0.8}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={styles.resourceMeta}>
                              {res.type} · {res.duration}
                            </Text>
                            <Text style={styles.resourceTitle}>{res.title}</Text>
                          </View>
                          <Feather
                            name={isOpen ? 'chevron-up' : 'chevron-down'}
                            size={16}
                            color="#174A62"
                          />
                        </TouchableOpacity>

                        {isOpen && bodyText ? (
                          <View style={styles.resourceExpandedBox}>
                            <Text style={styles.resourceExpandedText}>
                              {res.practice_steps && !res.reading_content
                                ? `• ${bodyText}`
                                : bodyText}
                            </Text>
                            <TouchableOpacity
                              style={styles.miniEvalButton}
                              onPress={() => handleOpenActivityEvaluation(res)}
                              activeOpacity={0.85}
                            >
                              <Text style={styles.miniEvalButtonText}>Comprobar este tema</Text>
                              <Feather name="arrow-right" size={14} color="#174A62" />
                            </TouchableOpacity>
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              )}

              <TouchableOpacity
                style={styles.evalTopicButton}
                onPress={() => handleOpenActivityEvaluation()}
                activeOpacity={0.85}
              >
                <Feather name="help-circle" size={16} color="#174A62" />
                <Text style={styles.evalTopicButtonText}>Practicar o evaluar esta actividad</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        <ActivityTimeCard
          hoursSpent={hoursSpent}
          onChangeHours={setHoursSpent}
          minutesSpent={minutesSpent}
          onChangeMinutes={setMinutesSpent}
        />

        <ActivityDifficultyCard
          selectedTag={selectedDifficultyTag}
          onSelectTag={setSelectedDifficultyTag}
          notes={difficultyNotes}
          onChangeNotes={setDifficultyNotes}
        />

        <TouchableOpacity
          style={[styles.primaryActionButton, isSubmitting && styles.btnDisabled]}
          onPress={handleCompleteActivity}
          disabled={isSubmitting}
          activeOpacity={0.85}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Feather name="check" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.primaryActionText}>Marcar como completada</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.outlineActionButton}
          onPress={handleOpenMissModal}
          activeOpacity={0.8}
        >
          <Text style={styles.outlineActionText}>No pude completar esta actividad</Text>
        </TouchableOpacity>
      </ScrollView>

      <ActivityMissModal
        visible={missModalVisible}
        onClose={() => setMissModalVisible(false)}
        reasons={missReasons}
        selectedReasonId={selectedReasonId}
        onSelectReason={setSelectedReasonId}
        details={missDetails}
        onChangeDetails={setMissDetails}
        onSubmit={handleSubmitMiss}
        isSubmitting={isSubmitting}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenBg: { backgroundColor: '#FAF6F0' },
  container: { paddingVertical: 20, paddingBottom: 40, gap: 14 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  topBarTitle: { fontSize: 11, fontWeight: '800', color: '#627D98', letterSpacing: 0.8, flex: 1, textAlign: 'center', marginHorizontal: 8 },
  mainActivityCard: { backgroundColor: '#174A62', borderRadius: 20, padding: 18, shadowColor: '#174A62', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, elevation: 4 },
  activityBadgeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  badgeContainer: { backgroundColor: '#D8ECF8', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginRight: 8 },
  badgeText: { fontSize: 11, fontWeight: '800', color: '#174A62' },
  stageInfoText: { fontSize: 11, fontWeight: '700', color: '#94B8CD', letterSpacing: 0.5, flex: 1 },
  activityMainTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', marginBottom: 6 },
  activityDescText: { fontSize: 13, color: '#D8ECF8', lineHeight: 18 },
  metaInfoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4, marginVertical: -2 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12, color: '#627D98', fontWeight: '600' },
  knowledgeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  knowledgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  knowledgeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  knowledgeIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#EBF5FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  knowledgeTag: {
    fontSize: 9,
    fontWeight: '800',
    color: '#174A62',
    letterSpacing: 0.8,
  },
  knowledgeTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F2C40',
  },
  knowledgeBody: {
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  knowledgeSummary: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
  },
  keyPointsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  keyPointsHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#174A62',
    marginBottom: 2,
  },
  keyPointItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  keyPointText: {
    fontSize: 12,
    color: '#334155',
    flex: 1,
    lineHeight: 17,
  },
  resourceList: {
    gap: 8,
  },
  resourceItemCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 8,
  },
  resourceItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  resourceMeta: {
    fontSize: 10,
    fontWeight: '800',
    color: '#627D98',
  },
  resourceTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F2C40',
    marginTop: 2,
  },
  resourceExpandedBox: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 8,
    gap: 10,
  },
  resourceExpandedText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
  },
  miniEvalButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EBF5FB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  miniEvalButtonText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#174A62',
  },
  evalTopicButton: {
    backgroundColor: '#EBF5FB',
    borderWidth: 1,
    borderColor: '#D8ECF8',
    borderRadius: 14,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  evalTopicButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#174A62',
  },
  primaryActionButton: { backgroundColor: '#174A62', borderRadius: 16, height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: '#174A62', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, elevation: 3 },
  primaryActionText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  btnDisabled: { opacity: 0.7 },
  outlineActionButton: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 16, height: 50, alignItems: 'center', justifyContent: 'center' },
  outlineActionText: { color: '#627D98', fontSize: 14, fontWeight: '700' },
  errorText: { color: '#C53030', marginBottom: 8, fontSize: 13, fontWeight: '700', textAlign: 'center' },
});