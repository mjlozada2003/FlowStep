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
import { BrandHeader } from '@/components/ui/BrandHeader';
import { useAuth } from '@/contexts/auth-context';
import {
  addReinforcementActivity,
  getGoalEvaluation,
  QuizEvaluationResult,
  QuizQuestionItem,
  submitGoalEvaluation,
} from '@/services/api/learning';

// Preguntas de respaldo si la API aún no ha respondido o está sin conexión
const fallbackQuestions: QuizQuestionItem[] = [
  {
    id: 1,
    category: 'REACT BÁSICO',
    question: '¿Cuál es el objetivo principal de un componente?',
    options: [
      { key: 'A', text: 'Reutilizar una parte de la interfaz', is_correct: true },
      { key: 'B', text: 'Guardar todos los datos', is_correct: false },
      { key: 'C', text: 'Conectar directamente la base de datos', is_correct: false },
    ],
    explanation: 'Los componentes permiten modularizar y reutilizar estructura y comportamiento.',
  },
  {
    id: 2,
    category: 'REACT BÁSICO',
    question: '¿Qué se utiliza para enviar datos de un componente padre a un hijo?',
    options: [
      { key: 'A', text: 'Hooks', is_correct: false },
      { key: 'B', text: 'Props', is_correct: true },
      { key: 'C', text: 'CSS', is_correct: false },
    ],
    explanation: 'Las props permiten transferir datos unidireccionalmente hacia componentes secundarios.',
  },
  {
    id: 3,
    category: 'REACT BÁSICO',
    question: '¿Qué dato puede cambiar internamente en un componente con el tiempo?',
    options: [
      { key: 'A', text: 'El estado', is_correct: true },
      { key: 'B', text: 'El nombre del archivo', is_correct: false },
      { key: 'C', text: 'La etiqueta HTML', is_correct: false },
    ],
    explanation: 'El estado (state) maneja los valores reactivos internos del componente.',
  },
];

export default function EvaluationScreen() {
  const { token } = useAuth();
  const params = useLocalSearchParams<{
    goalId?: string;
    goalTitle?: string;
    resourceId?: string;
    resourceTitle?: string;
    resourceType?: string;
    resourceCategory?: string;
    resourceDuration?: string;
    resourceBadge?: string;
    resourceSummary?: string;
    resourceKeyPoints?: string;
  }>();
  const goalIdNum = params.goalId ? Number(params.goalId) : 1;
  const hasResourceInfo = Boolean(params.resourceTitle || params.resourceId);

  const [showResourceIntro, setShowResourceIntro] = useState<boolean>(hasResourceInfo);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [questions, setQuestions] = useState<QuizQuestionItem[]>(fallbackQuestions);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [userAnswers, setUserAnswers] = useState<{ question_id: number; selected_option_id: string }[]>([]);
  const [evaluationResult, setEvaluationResult] = useState<QuizEvaluationResult | null>(null);

  const resourceTitle = params.resourceTitle || 'Guía conceptual';
  const resourceType = params.resourceType || 'LECTURA';
  const resourceCategory = params.resourceCategory || 'Conceptos clave';
  const resourceDuration = params.resourceDuration || '5 min';
  const resourceBadge = params.resourceBadge || 'Esencial';
  const resourceSummary = params.resourceSummary || '';

  let keyPoints: string[] = [];
  if (params.resourceKeyPoints) {
    try {
      const parsed = JSON.parse(params.resourceKeyPoints);
      if (Array.isArray(parsed) && parsed.length > 0) {
        keyPoints = parsed;
      }
    } catch {}
  }
  if (keyPoints.length === 0) {
    keyPoints = [
      `Fundamentos esenciales y terminología básica de ${resourceCategory}.`,
      'Principios metodológicos y buenas prácticas para avanzar sin bloqueos.',
      'Aplicación práctica de los conocimientos en tus actividades planificadas.',
    ];
  }

  useEffect(() => {
    let isMounted = true;
    async function fetchQuiz() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const res = await getGoalEvaluation(goalIdNum, token);
        if (isMounted && res && res.length > 0) {
          setQuestions(res);
        }
      } catch (err) {
        console.warn('Error al cargar preguntas:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchQuiz();
    return () => {
      isMounted = false;
    };
  }, [goalIdNum, token]);

  const currentQ = questions[currentIndex] || questions[0];
  const progressPercent = ((currentIndex + 1) / questions.length) * 100;

  const handleSelectOption = (key: string, isCorrect: boolean) => {
    if (isAnswered) return;
    setSelectedOption(key);
    setIsAnswered(true);
    if (isCorrect) {
      setScore((prev) => prev + 1);
    }
    setUserAnswers((prev) => [...prev, { question_id: currentQ.id, selected_option_id: key }]);
  };

  const handleNext = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      // Finalizó el cuestionario, enviar resultados al backend
      if (token) {
        try {
          setSubmitting(true);
          const result = await submitGoalEvaluation(goalIdNum, userAnswers, token);
          setEvaluationResult(result);
          promptReinforcement(result);
          return;
        } catch (err) {
          console.warn('Error al enviar respuestas:', err);
        } finally {
          setSubmitting(false);
        }
      }
      router.replace('/learning' as any);
    }
  };

  const promptReinforcement = (result: QuizEvaluationResult) => {
    if (result.weak_topics && result.weak_topics.length > 0) {
      const topic = result.weak_topics[0];
      Alert.alert(
        'Resultados de la evaluación',
        `Puntaje: ${result.score}/${result.total_questions} (${result.percentage}%).\n\nDetectamos oportunidad de refuerzo en: "${topic}".\n\n¿Deseas agregar una sesión de aprendizaje de refuerzo a tu plan?`,
        [
          {
            text: 'Volver a Aprendizaje',
            style: 'cancel',
            onPress: () => router.replace('/learning' as any),
          },
          {
            text: 'Añadir refuerzo',
            onPress: async () => {
              if (token) {
                try {
                  await addReinforcementActivity(
                    goalIdNum,
                    { topic, title: `Refuerzo: ${topic}`, estimated_minutes: 30 },
                    token,
                  );
                  Alert.alert('¡Excelente!', 'Actividad de refuerzo añadida a tu cronograma.');
                } catch {}
              }
              router.replace('/learning' as any);
            },
          },
        ],
      );
    } else {
      Alert.alert(
        '¡Felicitaciones!',
        `Puntaje perfecto: ${result.score}/${result.total_questions} (100%). ¡Dominas estos conocimientos!`,
        [{ text: 'Continuar', onPress: () => router.replace('/learning' as any) }],
      );
    }
  };

  const selectedObj = currentQ?.options?.find((o) => o.key === selectedOption);

  return (
    <Screen style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Cabecera superior */}
        <View style={styles.topHeader}>
          <BackButton
            onPress={() => {
              if (!showResourceIntro && hasResourceInfo) {
                setShowResourceIntro(true);
              } else {
                router.back();
              }
            }}
          />
          <Text style={styles.headerStep}>
            {showResourceIntro
              ? 'RECURSO DE APRENDIZAJE'
              : `PREGUNTA ${currentIndex + 1} DE ${questions.length}`}
          </Text>
          <BrandHeader showTagline={false} />
        </View>

        {showResourceIntro ? (
          <View style={styles.resourceIntroContainer}>
            {/* Tarjeta destacada con información del recurso */}
            <View style={styles.resourceHeroCard}>
              <View style={styles.resourceBadgeRow}>
                <View style={styles.resourceTypeTag}>
                  <Feather
                    name={
                      resourceType === 'VÍDEO'
                        ? 'play'
                        : resourceType === 'PRÁCTICA'
                        ? 'code'
                        : 'book-open'
                    }
                    size={13}
                    color="#174A62"
                  />
                  <Text style={styles.resourceTypeTagText}>
                    {resourceType} · {resourceDuration}
                  </Text>
                </View>
                {resourceBadge ? (
                  <View style={styles.resourceHeroBadge}>
                    <Text style={styles.resourceHeroBadgeText}>{resourceBadge}</Text>
                  </View>
                ) : null}
              </View>

              <Text style={styles.resourceHeroTitle}>{resourceTitle}</Text>
              <Text style={styles.resourceHeroCategory}>{resourceCategory}</Text>
            </View>

            {/* Contenido didáctico y conceptos clave del tema */}
            <View style={styles.resourceContentCard}>
              <View style={styles.contentHeaderRow}>
                <Feather name="info" size={16} color="#174A62" />
                <Text style={styles.contentSectionTitle}>Información y conceptos clave</Text>
              </View>

              <Text style={styles.contentSummaryText}>
                {resourceSummary ||
                  `Este recurso te brinda los conocimientos teóricos y prácticos fundamentales sobre "${resourceTitle}". Comprenderás su aplicación práctica para avanzar con seguridad en tu objetivo.`}
              </Text>

              <View style={styles.keyPointsContainer}>
                <Text style={styles.keyPointsTitle}>Puntos clave a recordar:</Text>
                {keyPoints.map((pt, idx) => (
                  <View key={idx} style={styles.keyPointRow}>
                    <View style={styles.bulletCheck}>
                      <Feather name="check" size={12} color="#174A62" />
                    </View>
                    <Text style={styles.keyPointText}>{pt}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Tarjeta explicativa sobre la evaluación posterior */}
            <View style={styles.evalPromptCard}>
              <Feather name="help-circle" size={20} color="#174A62" />
              <View style={{ flex: 1 }}>
                <Text style={styles.evalPromptTitle}>Comprobación de conocimientos</Text>
                <Text style={styles.evalPromptDesc}>
                  Pon a prueba lo aprendido con 3 preguntas clave. Recibirás retroalimentación inmediata y recomendaciones de refuerzo adaptativo.
                </Text>
              </View>
            </View>

            {/* Botón para iniciar la evaluación */}
            <TouchableOpacity
              style={styles.startQuizButton}
              activeOpacity={0.85}
              onPress={() => setShowResourceIntro(false)}
            >
              <Text style={styles.startQuizButtonText}>Comenzar evaluación</Text>
              <Feather name="arrow-right" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          </View>
        ) : loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#174A62" />
            <Text style={styles.loadingText}>Generando evaluación diagnóstica...</Text>
          </View>
        ) : (
          <>
            {/* Barra de progreso */}
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
            </View>

            {/* Categoría */}
            <Text style={styles.categoryLabel}>{currentQ.category}</Text>

            {/* Enunciado de la pregunta */}
            <Text style={styles.questionTitle}>{currentQ.question}</Text>

            {/* Opciones de respuesta */}
            <View style={styles.optionsList}>
              {currentQ.options.map((opt) => {
                const isSelected = selectedOption === opt.key;
                const isCorrectOption = opt.is_correct;

                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      styles.optionCard,
                      isAnswered && isCorrectOption && styles.cardCorrect,
                      isAnswered && isSelected && !isCorrectOption && styles.cardIncorrect,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => handleSelectOption(opt.key, opt.is_correct)}
                  >
                    <View
                      style={[
                        styles.optionBadge,
                        isAnswered && isCorrectOption && styles.badgeCorrect,
                        isAnswered && isSelected && !isCorrectOption && styles.badgeIncorrect,
                      ]}
                    >
                      <Text style={styles.badgeKey}>{opt.key}</Text>
                    </View>
                    <Text style={styles.optionText}>{opt.text}</Text>
                    {isAnswered && isCorrectOption && (
                      <Feather name="check" size={18} color="#2F855A" style={{ marginLeft: 'auto' }} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Caja de explicación / retroalimentación inmediata */}
            {isAnswered && (
              <View style={[styles.feedbackBox, selectedObj?.is_correct ? styles.feedbackSuccess : styles.feedbackWarn]}>
                <Text style={[styles.feedbackTitle, selectedObj?.is_correct ? styles.textSuccess : styles.textWarn]}>
                  {selectedObj?.is_correct ? '¡Correcto!' : 'Casi. Repasemos este punto.'}
                </Text>
                <Text style={styles.feedbackDesc}>{currentQ.explanation}</Text>
              </View>
            )}

            {/* Botón Siguiente pregunta */}
            {isAnswered && (
              <TouchableOpacity
                style={styles.nextButton}
                activeOpacity={0.85}
                disabled={submitting}
                onPress={handleNext}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.nextButtonText}>
                      {currentIndex < questions.length - 1 ? 'Siguiente pregunta' : 'Ver resultados'}
                    </Text>
                    <Feather name="arrow-right" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                  </>
                )}
              </TouchableOpacity>
            )}
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
  headerStep: {
    fontSize: 10,
    fontWeight: '800',
    color: '#627D98',
    letterSpacing: 1,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#174A62',
    borderRadius: 3,
  },
  categoryLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#174A62',
    letterSpacing: 1.2,
    marginTop: 4,
  },
  questionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F2C40',
    lineHeight: 30,
  },
  optionsList: {
    gap: 12,
    marginTop: 4,
  },
  optionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 14,
  },
  cardCorrect: {
    backgroundColor: '#F0FDF4',
    borderColor: '#34D399',
  },
  cardIncorrect: {
    backgroundColor: '#FEF2F2',
    borderColor: '#F87171',
  },
  optionBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#EDF2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeCorrect: {
    backgroundColor: '#D1FAE5',
  },
  badgeIncorrect: {
    backgroundColor: '#FEE2E2',
  },
  badgeKey: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4A5568',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F2C40',
    flex: 1,
  },
  feedbackBox: {
    borderRadius: 16,
    padding: 16,
    gap: 4,
    borderWidth: 1,
  },
  feedbackSuccess: {
    backgroundColor: '#E6FFFA',
    borderColor: '#B2F5EA',
  },
  feedbackWarn: {
    backgroundColor: '#FDF2F8',
    borderColor: '#FCE7F3',
  },
  feedbackTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  textSuccess: {
    color: '#234E52',
  },
  textWarn: {
    color: '#9B2C2C',
  },
  feedbackDesc: {
    fontSize: 12,
    color: '#4A5568',
    lineHeight: 18,
  },
  nextButton: {
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
    marginTop: 8,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
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
  resourceIntroContainer: {
    gap: 16,
    marginTop: 4,
  },
  resourceHeroCard: {
    backgroundColor: '#174A62',
    borderRadius: 22,
    padding: 20,
    gap: 10,
    shadowColor: '#174A62',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    elevation: 3,
  },
  resourceBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resourceTypeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EBF5FB',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  resourceTypeTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#174A62',
    letterSpacing: 0.8,
  },
  resourceHeroBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  resourceHeroBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  resourceHeroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 24,
  },
  resourceHeroCategory: {
    fontSize: 12,
    color: '#D8ECF8',
    fontWeight: '600',
  },
  resourceContentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#174A62',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    elevation: 2,
  },
  contentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contentSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F2C40',
  },
  contentSummaryText: {
    fontSize: 13,
    color: '#4A5568',
    lineHeight: 20,
  },
  keyPointsContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  keyPointsTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#174A62',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  keyPointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bulletCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EBF5FB',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  keyPointText: {
    fontSize: 12,
    color: '#2D3748',
    flex: 1,
    lineHeight: 18,
  },
  evalPromptCard: {
    backgroundColor: '#EBF5FB',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#D8ECF8',
  },
  evalPromptTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#174A62',
  },
  evalPromptDesc: {
    fontSize: 11,
    color: '#627D98',
    marginTop: 2,
    lineHeight: 16,
  },
  startQuizButton: {
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
  startQuizButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});