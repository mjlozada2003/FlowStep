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
    videoTimestamps?: string;
    practiceSteps?: string;
    codeSnippet?: string;
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
  const [userAnswers, setUserAnswers] = useState<
    {
      question_id: number;
      selected_option: string;
      selected_option_id: string;
      is_correct: boolean;
      category: string;
    }[]
  >([]);
  const [evaluationResult, setEvaluationResult] = useState<QuizEvaluationResult | null>(null);

  const resourceTitle = params.resourceTitle || 'Guía conceptual';
  const resourceType = (params.resourceType || 'LECTURA').toUpperCase();
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

  let videoTimestamps: { time: string; title: string }[] = [];
  if (params.videoTimestamps) {
    try {
      const parsed = JSON.parse(params.videoTimestamps);
      if (Array.isArray(parsed) && parsed.length > 0) videoTimestamps = parsed;
    } catch {}
  }
  if (videoTimestamps.length === 0) {
    videoTimestamps = [
      { time: '00:00', title: `Introducción a ${resourceCategory}` },
      { time: '03:15', title: 'Demostración práctica en pantalla' },
      { time: '07:40', title: 'Casos reales y resolución de dudas' },
      { time: '11:20', title: 'Resumen final y conclusiones' },
    ];
  }

  let practiceSteps: string[] = [];
  if (params.practiceSteps) {
    try {
      const parsed = JSON.parse(params.practiceSteps);
      if (Array.isArray(parsed) && parsed.length > 0) practiceSteps = parsed;
    } catch {}
  }
  if (practiceSteps.length === 0) {
    practiceSteps = [
      `Configura tu entorno de trabajo inicial para ${resourceCategory}.`,
      'Implementa el código o solución guiada paso a paso.',
      'Ejecuta las pruebas de verificación y comprueba que no existan errores.',
    ];
  }

  const codeSnippet =
    params.codeSnippet ||
    `# Taller guiado: ${resourceTitle}\n# 1. Configurar entorno y dependencias\nflowstep init --topic "${(params.resourceCategory || 'ejercicio').toLowerCase()}"\n# 2. Ejecutar y validar resultado\nflowstep run verify`;

  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(false);
  const [selectedTimestamp, setSelectedTimestamp] = useState<string>('00:00');
  const [completedPracticeSteps, setCompletedPracticeSteps] = useState<number[]>([0]);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

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
    setUserAnswers((prev) => [
      ...prev,
      {
        question_id: currentQ.id,
        selected_option: key,
        selected_option_id: key,
        is_correct: isCorrect,
        category: currentQ.category,
      },
    ]);
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

            {/* Contenido formativo adaptado al tipo de recurso */}
            {resourceType === 'LECTURA' && (
              <View style={styles.resourceContentCard}>
                <View style={styles.contentHeaderRow}>
                  <Feather name="book-open" size={16} color="#174A62" />
                  <Text style={styles.contentSectionTitle}>Guía de lectura y estudio</Text>
                </View>

                <Text style={styles.contentSummaryText}>
                  {resourceSummary ||
                    `En esta lectura aprenderás los fundamentos esenciales de "${resourceTitle}". Te permitirá comprender los conceptos clave antes de avanzar a la práctica.`}
                </Text>

                {/* Secciones estructuradas del artículo */}
                <View style={styles.articleSectionCard}>
                  <Text style={styles.articleSectionSubtitle}>1. Fundamentos y conceptos esenciales</Text>
                  <Text style={styles.articleSectionBody}>
                    Comprender los principios teóricos básicos es el paso necesario para no depender de soluciones improvisadas y resolver problemas con criterio.
                  </Text>
                </View>

                <View style={styles.articleSectionCard}>
                  <Text style={styles.articleSectionSubtitle}>2. Aplicación directa en tu objetivo</Text>
                  <Text style={styles.articleSectionBody}>
                    Aplica estos conceptos directamente en las actividades programadas en tu plan de trabajo para reducir el tiempo de ejecución y evitar bloqueos.
                  </Text>
                </View>

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
            )}

            {resourceType === 'VÍDEO' && (
              <View style={styles.resourceContentCard}>
                <View style={styles.contentHeaderRow}>
                  <Feather name="play-circle" size={16} color="#174A62" />
                  <Text style={styles.contentSectionTitle}>Reproductor de tutorial en vídeo</Text>
                </View>

                {/* Mock Interactivo de Reproductor de Vídeo */}
                <View style={styles.videoPlayerBox}>
                  <View style={styles.videoPlayerScreen}>
                    <TouchableOpacity
                      style={styles.videoPlayCircle}
                      activeOpacity={0.8}
                      onPress={() => setIsVideoPlaying((prev) => !prev)}
                    >
                      <Feather name={isVideoPlaying ? 'pause' : 'play'} size={28} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.videoOverlayTime}>
                      {isVideoPlaying ? '04:15' : selectedTimestamp} / {resourceDuration}
                    </Text>
                  </View>
                  <View style={styles.videoControlsRow}>
                    <TouchableOpacity onPress={() => setIsVideoPlaying((prev) => !prev)}>
                      <Feather name={isVideoPlaying ? 'pause' : 'play'} size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                    <View style={styles.videoProgressBarTrack}>
                      <View style={[styles.videoProgressBarFill, { width: isVideoPlaying ? '35%' : '0%' }]} />
                    </View>
                    <Feather name="volume-2" size={16} color="#9FB3C8" />
                    <Feather name="maximize" size={16} color="#9FB3C8" />
                  </View>
                </View>

                <Text style={styles.contentSummaryText}>
                  {resourceSummary ||
                    `Explicación audiovisual guiada paso a paso sobre "${resourceTitle}". Observa la demostración en pantalla y las recomendaciones prácticas.`}
                </Text>

                {/* Índice interactivo de marcas de tiempo del vídeo */}
                <View style={styles.timestampsBox}>
                  <Text style={styles.timestampsHeader}>Índice y marcas de tiempo del vídeo:</Text>
                  {videoTimestamps.map((ts, idx) => {
                    const isCurrentTime = selectedTimestamp === ts.time;
                    return (
                      <TouchableOpacity
                        key={idx}
                        style={[styles.timestampItem, isCurrentTime && styles.timestampItemActive]}
                        activeOpacity={0.7}
                        onPress={() => {
                          setSelectedTimestamp(ts.time);
                          setIsVideoPlaying(true);
                        }}
                      >
                        <View style={styles.timestampBadge}>
                          <Feather name="play" size={10} color="#174A62" />
                          <Text style={styles.timestampBadgeText}>{ts.time}</Text>
                        </View>
                        <Text style={[styles.timestampTitle, isCurrentTime && styles.timestampTitleActive]}>
                          {ts.title}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {resourceType === 'PRÁCTICA' && (
              <View style={styles.resourceContentCard}>
                <View style={styles.contentHeaderRow}>
                  <Feather name="code" size={16} color="#174A62" />
                  <Text style={styles.contentSectionTitle}>Taller y reto práctico guiado</Text>
                </View>

                <Text style={styles.contentSummaryText}>
                  {resourceSummary ||
                    `Este laboratorio práctico te guía a través de pasos reales para consolidar "${resourceTitle}". Sigue la lista de verificación y ejecuta los comandos correspondientes.`}
                </Text>

                {/* Terminal / Snippet de código con botón de copiar */}
                <View style={styles.terminalBox}>
                  <View style={styles.terminalHeader}>
                    <View style={styles.terminalDotsRow}>
                      <View style={[styles.terminalDot, { backgroundColor: '#EF4444' }]} />
                      <View style={[styles.terminalDot, { backgroundColor: '#F59E0B' }]} />
                      <View style={[styles.terminalDot, { backgroundColor: '#10B981' }]} />
                    </View>
                    <Text style={styles.terminalTitle}>bash · terminal</Text>
                    <TouchableOpacity
                      style={styles.terminalCopyBtn}
                      activeOpacity={0.7}
                      onPress={() => {
                        setCopiedCode(true);
                        setTimeout(() => setCopiedCode(false), 2000);
                      }}
                    >
                      <Feather name={copiedCode ? 'check' : 'copy'} size={12} color="#FFFFFF" />
                      <Text style={styles.terminalCopyText}>{copiedCode ? '¡Copiado!' : 'Copiar'}</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.terminalCode}>{codeSnippet}</Text>
                </View>

                {/* Checklist de pasos interactivos */}
                <View style={styles.practiceStepsBox}>
                  <Text style={styles.practiceStepsTitle}>Pasos del ejercicio (toca para marcar):</Text>
                  {practiceSteps.map((step, idx) => {
                    const isChecked = completedPracticeSteps.includes(idx);
                    return (
                      <TouchableOpacity
                        key={idx}
                        style={[styles.practiceStepItem, isChecked && styles.practiceStepItemChecked]}
                        activeOpacity={0.8}
                        onPress={() => {
                          if (isChecked) {
                            setCompletedPracticeSteps((prev) => prev.filter((i) => i !== idx));
                          } else {
                            setCompletedPracticeSteps((prev) => [...prev, idx]);
                          }
                        }}
                      >
                        <View style={[styles.practiceCheckbox, isChecked && styles.practiceCheckboxChecked]}>
                          {isChecked && <Feather name="check" size={12} color="#FFFFFF" />}
                        </View>
                        <Text style={[styles.practiceStepText, isChecked && styles.practiceStepTextChecked]}>
                          Paso {idx + 1}: {step}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Tarjeta explicativa sobre la evaluación posterior */}
            <View style={styles.evalPromptCard}>
              <Feather name="help-circle" size={20} color="#174A62" />
              <View style={{ flex: 1 }}>
                <Text style={styles.evalPromptTitle}>
                  {resourceType === 'LECTURA'
                    ? 'Comprobación de lectura'
                    : resourceType === 'VÍDEO'
                    ? 'Comprobación del vídeo'
                    : 'Validación del taller práctico'}
                </Text>
                <Text style={styles.evalPromptDesc}>
                  {resourceType === 'LECTURA'
                    ? 'Pon a prueba tu retención de lo leído con 3 preguntas clave y refuerzo con IA.'
                    : resourceType === 'VÍDEO'
                    ? 'Verifica los conceptos vistos en el tutorial con 3 preguntas clave.'
                    : 'Comprueba los conocimientos operativos adquiridos con 3 preguntas clave.'}
                </Text>
              </View>
            </View>

            {/* Botón para iniciar la evaluación */}
            <TouchableOpacity
              style={styles.startQuizButton}
              activeOpacity={0.85}
              onPress={() => setShowResourceIntro(false)}
            >
              <Text style={styles.startQuizButtonText}>
                {resourceType === 'LECTURA'
                  ? 'Comprobar lectura con cuestionario'
                  : resourceType === 'VÍDEO'
                  ? 'Evaluar lo aprendido en el vídeo'
                  : 'Validar práctica con cuestionario'}
              </Text>
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
                const isCorrectOption = Boolean(opt.is_correct ?? opt.isCorrect);

                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      styles.optionCard,
                      isAnswered && isCorrectOption && styles.cardCorrect,
                      isAnswered && isSelected && !isCorrectOption && styles.cardIncorrect,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => handleSelectOption(opt.key, isCorrectOption)}
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
              <View
                style={[
                  styles.feedbackBox,
                  (selectedObj?.is_correct ?? selectedObj?.isCorrect)
                    ? styles.feedbackSuccess
                    : styles.feedbackWarn,
                ]}
              >
                <Text
                  style={[
                    styles.feedbackTitle,
                    (selectedObj?.is_correct ?? selectedObj?.isCorrect)
                      ? styles.textSuccess
                      : styles.textWarn,
                  ]}
                >
                  {(selectedObj?.is_correct ?? selectedObj?.isCorrect)
                    ? '¡Correcto!'
                    : 'Casi. Repasemos este punto.'}
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
  articleSectionCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    gap: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#174A62',
  },
  articleSectionSubtitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#174A62',
  },
  articleSectionBody: {
    fontSize: 12,
    color: '#4A5568',
    lineHeight: 18,
  },
  videoPlayerBox: {
    backgroundColor: '#0F2C40',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    elevation: 4,
  },
  videoPlayerScreen: {
    height: 160,
    backgroundColor: '#0B1924',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  videoPlayCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(23, 74, 98, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  videoOverlayTime: {
    position: 'absolute',
    bottom: 8,
    right: 10,
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  videoControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#0F2C40',
  },
  videoProgressBarTrack: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  videoProgressBarFill: {
    height: '100%',
    backgroundColor: '#38BDF8',
    borderRadius: 2,
  },
  timestampsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  timestampsHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#174A62',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  timestampItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  timestampItemActive: {
    backgroundColor: '#EBF5FB',
  },
  timestampBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  timestampBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#174A62',
  },
  timestampTitle: {
    fontSize: 12,
    color: '#4A5568',
    fontWeight: '600',
    flex: 1,
  },
  timestampTitleActive: {
    color: '#174A62',
    fontWeight: '800',
  },
  terminalBox: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
  },
  terminalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  terminalDotsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  terminalDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  terminalTitle: {
    fontSize: 10,
    color: '#94A3B8',
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  terminalCopyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  terminalCopyText: {
    fontSize: 9,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  terminalCode: {
    padding: 12,
    fontSize: 11,
    color: '#38BDF8',
    fontFamily: 'monospace',
    lineHeight: 18,
  },
  practiceStepsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  practiceStepsTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#174A62',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  practiceStepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  practiceStepItemChecked: {
    opacity: 0.65,
  },
  practiceCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  practiceCheckboxChecked: {
    backgroundColor: '#174A62',
    borderColor: '#174A62',
  },
  practiceStepText: {
    fontSize: 12,
    color: '#1E293B',
    fontWeight: '600',
    flex: 1,
    lineHeight: 18,
  },
  practiceStepTextChecked: {
    textDecorationLine: 'line-through',
    color: '#64748B',
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