import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { BrandHeader } from '@/components/ui/BrandHeader';
import { useAuth } from '@/contexts/auth-context';
import { getGoalsOverview, GoalOverviewItem } from '@/services/api/goals';
import {
  getGoalKnowledge,
  getGoalResources,
  GoalKnowledgeResponse,
  LearningResourceItem,
} from '@/services/api/learning';

export default function LearningScreen() {
  const { token } = useAuth();
  const params = useLocalSearchParams<{ goalId?: string }>();
  const [loading, setLoading] = useState<boolean>(true);
  const [switchingGoal, setSwitchingGoal] = useState<boolean>(false);
  const [goalsList, setGoalsList] = useState<GoalOverviewItem[]>([]);
  const [currentGoalId, setCurrentGoalId] = useState<number>(1);
  const [knowledge, setKnowledge] = useState<GoalKnowledgeResponse | null>(null);
  const [resources, setResources] = useState<LearningResourceItem[]>([]);

  const fetchGoalData = useCallback(
    async (goalId: number, userToken: string) => {
      try {
        const [knowRes, resRes] = await Promise.all([
          getGoalKnowledge(goalId, userToken).catch(() => null),
          getGoalResources(goalId, userToken).catch(() => null),
        ]);
        if (knowRes) setKnowledge(knowRes);
        if (resRes && resRes.length > 0) setResources(resRes);
      } catch (err) {
        console.warn('Error al cargar datos de aprendizaje:', err);
      }
    },
    [],
  );

  useEffect(() => {
    let isMounted = true;
    async function loadInitial() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const goals = await getGoalsOverview(token).catch(() => []);
        if (!isMounted) return;
        setGoalsList(goals);

        let targetId = 1;
        if (params.goalId && goals.some((g) => g.goal_id === Number(params.goalId))) {
          targetId = Number(params.goalId);
        } else if (goals && goals.length > 0) {
          targetId = Number(goals[0].goal_id);
        }

        setCurrentGoalId(targetId);
        await fetchGoalData(targetId, token);
      } catch (err) {
        console.warn('Error al inicializar pantalla de aprendizaje:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadInitial();
    return () => {
      isMounted = false;
    };
  }, [token, params.goalId, fetchGoalData]);

  const handleSelectGoal = async (goalId: number) => {
    if (goalId === currentGoalId || !token) return;
    try {
      setSwitchingGoal(true);
      setCurrentGoalId(goalId);
      await fetchGoalData(goalId, token);
    } finally {
      setSwitchingGoal(false);
    }
  };

  const activeGoalObj = goalsList.find((g) => g.goal_id === currentGoalId);
  const goalTitle = knowledge?.goal_title || activeGoalObj?.title || 'Objetivo de aprendizaje';
  const dominantCount = knowledge?.dominant_count ?? 1;
  const totalConcepts = knowledge?.total_concepts ?? (knowledge?.topics?.length || 4);
  const progressPercent = knowledge?.progress_percentage ?? (activeGoalObj?.progress_percentage || 0);

  const topics =
    knowledge?.topics && knowledge.topics.length > 0
      ? knowledge.topics.map((t, idx) => ({
          name: t.name,
          status:
            t.status ||
            (t.is_mastered
              ? ('completed' as const)
              : idx === (knowledge.dominant_count || 0)
              ? ('current' as const)
              : ('pending' as const)),
        }))
      : [
          { name: `Fundamentos de ${goalTitle}`, status: 'completed' as const },
          { name: 'Conceptos clave y práctica', status: 'current' as const },
          { name: 'Técnicas intermedias', status: 'pending' as const },
          { name: 'Dominio avanzado', status: 'pending' as const },
        ];

  const displayResources: LearningResourceItem[] =
    resources.length > 0
      ? resources
      : [
          {
            id: '1',
            type: 'LECTURA',
            duration: '5 min',
            title: `Guía introductoria: ${goalTitle}`,
            category: 'Fundamentos',
            badge_text: 'Esencial',
            icon_name: 'book-open',
            summary: `Conceptos introductorios y fundamentos clave para estructurar y dominar "${goalTitle}".`,
            key_points: [
              'Comprender los principios teóricos básicos.',
              'Configurar el flujo de trabajo inicial.',
              'Buenas prácticas y recomendaciones de estudio.',
            ],
          },
          {
            id: '2',
            type: 'VÍDEO',
            duration: '12 min',
            title: `Tutorial paso a paso de ${goalTitle}`,
            category: 'Conceptos clave',
            badge_text: 'Recomendado',
            icon_name: 'play',
            summary: `Explicación visual y resolución práctica de problemas para avanzar en "${goalTitle}".`,
            key_points: [
              'Demostración guiada del proceso.',
              'Resolución de errores frecuentes.',
              'Consejos para maximizar la retención.',
            ],
            video_timestamps: [
              { time: '00:00', title: `Introducción a ${goalTitle}` },
              { time: '03:30', title: 'Flujo de trabajo y demostración' },
              { time: '07:45', title: 'Resolución de errores comunes' },
              { time: '11:10', title: 'Resumen y conclusiones' },
            ],
          },
          {
            id: '3',
            type: 'PRÁCTICA',
            duration: '20 min',
            title: 'Taller guiado para aplicar lo aprendido',
            category: 'Práctica guiada',
            badge_text: 'Intermedio',
            icon_name: 'code',
            summary: `Ejercicio práctico diseñado para poner a prueba tus habilidades en "${goalTitle}".`,
            key_points: [
              'Planteamiento del reto práctico.',
              'Desarrollo e implementación paso a paso.',
              'Comprobación final del resultado obtenido.',
            ],
            practice_steps: [
              `Configurar el entorno inicial para ${goalTitle}.`,
              'Implementar la solución guiada paso a paso.',
              'Ejecutar las pruebas y verificar el resultado.',
            ],
            code_snippet: `# Taller práctico para: ${goalTitle}\n# 1. Iniciar sesión y preparar entorno\nflowstep init --goal "${goalTitle.toLowerCase().replace(/\\s+/g, '-')}"\n# 2. Ejecutar prueba del ejercicio\nflowstep run verify`,
          },
        ];

  return (
    <Screen style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Cabecera superior con etiqueta y BrandHeader */}
        <View style={styles.topHeader}>
          <View>
            <Text style={styles.headerTag}>APRENDIZAJE</Text>
            <Text style={styles.mainTitle}>Conocimientos</Text>
          </View>
          <View style={styles.dominanceBadge}>
            <Text style={styles.dominanceText}>{dominantCount}/{totalConcepts}</Text>
            <Text style={styles.dominanceSub}>dominados</Text>
          </View>
        </View>

        {/* Selector interactivo de objetivos si el usuario tiene más de uno */}
        {goalsList.length > 1 && (
          <View style={styles.goalSelectorContainer}>
            <Text style={styles.selectorLabel}>SELECCIONAR OBJETIVO</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.goalSelectorScroll}
            >
              {goalsList.map((g) => {
                const isSelected = g.goal_id === currentGoalId;
                return (
                  <TouchableOpacity
                    key={g.goal_id}
                    style={[
                      styles.goalSelectorPill,
                      isSelected && styles.goalSelectorPillActive,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => handleSelectGoal(g.goal_id)}
                  >
                    <Text
                      style={[
                        styles.goalSelectorText,
                        isSelected && styles.goalSelectorTextActive,
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

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#174A62" />
            <Text style={styles.loadingText}>Cargando conocimientos y recursos...</Text>
          </View>
        ) : (
          <View style={[switchingGoal && { opacity: 0.6 }]}>
            {/* Tarjeta Azul Oscura del Objetivo Actual */}
            <View style={styles.goalCardDark}>
              <View style={styles.goalCardTop}>
                <Text style={styles.goalLabel}>OBJETIVO</Text>
                <Text style={styles.goalPercent}>{progressPercent}%</Text>
              </View>
              <Text style={styles.goalTitle}>{goalTitle}</Text>

              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${Math.min(100, Math.max(5, progressPercent))}%` }]} />
              </View>

              {/* Píldoras de temas */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.pillsRow}
              >
                {topics.map((t, idx) => {
                  const isDone = t.status === 'completed';
                  const isActive = t.status === 'current';
                  return (
                    <View
                      key={idx}
                      style={[
                        styles.topicPill,
                        isDone && styles.topicDone,
                        isActive && styles.topicActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.topicText,
                          isDone && styles.topicDoneText,
                          isActive && styles.topicActiveText,
                        ]}
                      >
                        {isDone ? `✓ ${t.name}` : t.name}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
            </View>

            {/* Sección RECURSOS RECOMENDADOS */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionMainTitle}>Recursos recomendados</Text>
              <Text style={styles.sectionSubHint}>Según tus dificultades</Text>
            </View>

            <View style={styles.resourcesList}>
              {displayResources.map((res) => {
                const iconName: any = res.icon_name || 'book-open';
                return (
                  <TouchableOpacity
                    key={res.id}
                    style={styles.resourceCard}
                    activeOpacity={0.8}
                    onPress={() =>
                      router.push({
                        pathname: '/evaluation',
                        params: {
                          goalId: String(currentGoalId),
                          goalTitle,
                          resourceId: res.id,
                          resourceTitle: res.title,
                          resourceType: res.type,
                          resourceCategory: res.category,
                          resourceDuration: res.duration,
                          resourceBadge: res.badge_text,
                          resourceSummary: res.summary || '',
                          resourceKeyPoints: res.key_points ? JSON.stringify(res.key_points) : '',
                          videoTimestamps: res.video_timestamps ? JSON.stringify(res.video_timestamps) : '',
                          practiceSteps: res.practice_steps ? JSON.stringify(res.practice_steps) : '',
                          challengeTitle: res.challenge_title || res.title,
                        },
                      } as any)
                    }
                  >
                    <View style={styles.resourceIconBox}>
                      <Feather name={iconName} size={20} color="#174A62" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.resourceType}>{res.type} · {res.duration}</Text>
                      <Text style={styles.resourceTitle}>{res.title}</Text>
                      <View style={styles.resourceFooterRow}>
                        <Text style={styles.resourceCategory}>{res.category}</Text>
                        <View style={styles.miniBadge}>
                          <Text style={styles.miniBadgeText}>{res.badge_text || 'Esencial'}</Text>
                        </View>
                      </View>
                    </View>
                    <Feather name="chevron-right" size={18} color="#627D98" />
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Tarjeta de Evaluación Interactiva */}
            <TouchableOpacity
              style={styles.evaluationBanner}
              activeOpacity={0.85}
              onPress={() =>
                router.push({
                  pathname: '/evaluation',
                  params: { goalId: String(currentGoalId), goalTitle },
                } as any)
              }
            >
              <View style={styles.evalIconBox}>
                <Feather name="help-circle" size={22} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.evalTag}>COMPRUEBA LO APRENDIDO</Text>
                <Text style={styles.evalTitle}>Evaluación: {goalTitle}</Text>
                <Text style={styles.evalSubtitle}>Preguntas diagnósticas · Refuerzo con IA</Text>
              </View>
              <Text style={styles.evalAction}>Empezar</Text>
            </TouchableOpacity>

            {/* Enlace a plan conectado */}
            <TouchableOpacity
              style={styles.planConnectedCard}
              activeOpacity={0.8}
              onPress={() =>
                router.push({
                  pathname: '/goal-plan',
                  params: { goalId: String(currentGoalId) },
                } as any)
              }
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.planConnectedTitle}>Aprendizaje conectado a tu plan</Text>
                <Text style={styles.planConnectedDesc}>Las actividades de refuerzo se incorporan directamente a las etapas de tu objetivo.</Text>
              </View>
              <Text style={styles.planConnectedAction}>Ver plan</Text>
            </TouchableOpacity>
          </View>
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
    alignItems: 'flex-start',
  },
  headerTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#174A62',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F2C40',
    letterSpacing: -0.5,
  },
  dominanceBadge: {
    backgroundColor: '#EBF5FB',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D8ECF8',
  },
  dominanceText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#174A62',
  },
  dominanceSub: {
    fontSize: 9,
    color: '#627D98',
    fontWeight: '600',
  },
  goalSelectorContainer: {
    gap: 6,
    marginBottom: 4,
  },
  selectorLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#627D98',
    letterSpacing: 1,
  },
  goalSelectorScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  goalSelectorPill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#D8ECF8',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    maxWidth: 220,
  },
  goalSelectorPillActive: {
    backgroundColor: '#174A62',
    borderColor: '#174A62',
  },
  goalSelectorText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#627D98',
  },
  goalSelectorTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  goalCardDark: {
    backgroundColor: '#174A62',
    borderRadius: 24,
    padding: 20,
    gap: 12,
    shadowColor: '#174A62',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    elevation: 4,
  },
  goalCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#9FB3C8',
    letterSpacing: 1,
  },
  goalPercent: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: -4,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    width: '33%',
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
  },
  pillsRow: {
    gap: 8,
    paddingTop: 4,
  },
  topicPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  topicDone: {
    backgroundColor: '#335E75',
  },
  topicActive: {
    backgroundColor: '#FFFFFF',
  },
  topicText: {
    fontSize: 11,
    color: '#D8ECF8',
    fontWeight: '600',
  },
  topicDoneText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  topicActiveText: {
    fontSize: 11,
    color: '#174A62',
    fontWeight: '800',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 4,
  },
  sectionMainTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F2C40',
  },
  sectionSubHint: {
    fontSize: 11,
    color: '#627D98',
    fontWeight: '600',
  },
  resourcesList: {
    gap: 10,
  },
  resourceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#174A62',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    elevation: 2,
  },
  resourceIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#EBF5FB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resourceType: {
    fontSize: 10,
    fontWeight: '800',
    color: '#627D98',
    letterSpacing: 0.5,
  },
  resourceTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F2C40',
    marginVertical: 2,
  },
  resourceFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resourceCategory: {
    fontSize: 11,
    color: '#627D98',
  },
  miniBadge: {
    backgroundColor: '#EDF2F7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  miniBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#4A5568',
  },
  evaluationBanner: {
    backgroundColor: '#174A62',
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: '#174A62',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    elevation: 3,
  },
  evalIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  evalTag: {
    fontSize: 9,
    fontWeight: '800',
    color: '#9FB3C8',
    letterSpacing: 1,
  },
  evalTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginVertical: 1,
  },
  evalSubtitle: {
    fontSize: 11,
    color: '#D8ECF8',
  },
  evalAction: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  planConnectedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderStyle: 'dashed',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    marginTop: 4,
  },
  planConnectedTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F2C40',
  },
  planConnectedDesc: {
    fontSize: 11,
    color: '#627D98',
    marginTop: 2,
  },
  planConnectedAction: {
    fontSize: 12,
    fontWeight: '800',
    color: '#174A62',
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