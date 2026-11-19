import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
    readingContent?: string;
    practicalExample?: string;
    resourceKeyPoints?: string;
    videoTimestamps?: string;
    practiceSteps?: string;
    challengeTitle?: string;
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
  const [addingReinforcement, setAddingReinforcement] = useState(false);
  const [reinforcementAdded, setReinforcementAdded] = useState(false);

  const resourceTitle = params.resourceTitle || 'Guía conceptual';
  const resourceType = (params.resourceType || 'LECTURA').toUpperCase();
  const resourceCategory = params.resourceCategory || 'Conceptos clave';
  const resourceDuration = params.resourceDuration || '5 min';
  const resourceBadge = params.resourceBadge || 'Esencial';
  const resourceSummary = params.resourceSummary || '';
  const readingContent =
    params.readingContent ||
    `📖 1. Fundamentos y Principios Clave\nComprender los principios conceptuales y el contexto operativo de "${resourceTitle}" es indispensable para avanzar con solvencia en tu objetivo "${params.goalTitle || 'de aprendizaje'}". Al abordar este conocimiento, la clave reside en entender la arquitectura conceptual: qué problema resuelve, cómo se organiza y qué papel juega dentro de la ejecución general.\n\n🛠️ 2. Flujo de Trabajo y Buenas Prácticas\nPara asimilar este contenido sin abrumarte, adopta un enfoque iterativo: primero analiza el modelo conceptual y familiarízate con la terminología clave; luego, asocia cada concepto con un ejemplo tangible. Trabajar con pequeños bloques verificables previene bloqueos cognitivos y consolida la retención a largo plazo.\n\n⚠️ 3. Errores Frecuentes y Cómo Prevenirlos\nEl error más habitual es memorizar definiciones superficiales sin comprender su aplicación operativa o saltarse los fundamentos para ir directamente a casos complejos. Si experimentas fricción, descompón el tema en partes elementales y valida cada paso antes de continuar.`;
  const practicalExample =
    params.practicalExample ||
    `Por ejemplo, al abordar "${resourceCategory}", estructurar primero tus materiales y revisar los requerimientos te ahorra hasta un 40% del tiempo de ejecución posterior.`;
  const challengeTitle = params.challengeTitle || `Reto práctico: ${resourceTitle}`;

  const [practiceNotes, setPracticeNotes] = useState('');
  const [practicePerception, setPracticePerception] = useState<'easy' | 'good' | 'hard'>('good');
  const [completedPracticeSteps, setCompletedPracticeSteps] = useState<number[]>([0]);

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
      { time: '03:15', title: 'Demostración paso a paso' },
      { time: '07:40', title: 'Casos reales y resolución guiada' },
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
      `Revisa los conceptos esenciales y prepara tu contexto para ${resourceCategory}.`,
      'Desarrolla la actividad o ejercicio aplicando la técnica sugerida.',
      'Comprueba tu resultado frente a los criterios y anota tus conclusiones.',
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
      try {
        setSubmitting(true);
        let result: QuizEvaluationResult | null = null;
        if (token) {
          try {
            result = await submitGoalEvaluation(goalIdNum, userAnswers, token);
          } catch (err) {
            console.warn('Error al enviar respuestas:', err);
          }
        }
        if (!result) {
          // Fallback de cálculo local para garantizar que siempre se muestren los resultados
          const correctCount = userAnswers.filter((a) => a.is_correct).length;
          const weakTopics = Array.from(
            new Set(userAnswers.filter((a) => !a.is_correct).map((a) => a.category).filter(Boolean)),
          );
          const totalQ = userAnswers.length || questions.length || 3;
          result = {
            goal_id: goalIdNum,
            score: correctCount,
            total_questions: totalQ,
            percentage: Math.round((correctCount / totalQ) * 100),
            weak_topics: weakTopics.length > 0 ? weakTopics : (correctCount < totalQ ? [resourceCategory] : []),
            reinforcement_recommendations: (weakTopics.length > 0 ? weakTopics : (correctCount < totalQ ? [resourceCategory] : [])).map((t) => `Refuerzo: ${t}`),
          };
        }
        setEvaluationResult(result);
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleAddReinforcement = async () => {
    if (!token || !evaluationResult?.weak_topics?.[0] || addingReinforcement) return;
    try {
      setAddingReinforcement(true);
      const topic = evaluationResult.weak_topics[0];
      await addReinforcementActivity(
        goalIdNum,
        {
          topic,
          title: `Refuerzo guiado: ${topic}`,
          estimated_minutes: 30,
          description:
            `🎯 Objetivo: Superar dudas y consolidar conocimientos en "${topic}".\n` +
            `• Paso 1 (10 min): Repaso conceptual y revisión de notas de ${topic}.\n` +
            `• Paso 2 (15 min): Práctica guiada con ejercicio paso a paso enfocado en las dudas detectadas.\n` +
            `• Paso 3 (5 min): Verificación de asimilación y autoevaluación de resultados.`,
        },
        token,
      );
      setReinforcementAdded(true);
    } catch (err) {
      console.warn('Error al agregar actividad de refuerzo:', err);
    } finally {
      setAddingReinforcement(false);
    }
  };

  const handleOpenVideo = async (specificQuery?: string) => {
    try {
      const q = encodeURIComponent(
        specificQuery || `${resourceTitle} ${params.goalTitle || ''} tutorial`,
      );
      await openBrowserAsync(`https://www.youtube.com/results?search_query=${q}`, {
        presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
      });
    } catch (error) {
      console.warn('No se pudo abrir el navegador de video:', error);
    }
  };

  const handleBack = useCallback(() => {
    if (evaluationResult) {
      router.replace('/(tabs)/learning' as any);
      return true;
    }
    if (!showResourceIntro && hasResourceInfo) {
      setShowResourceIntro(true);
      return true;
    }
    if (userAnswers.length > 0 && !evaluationResult) {
      Alert.alert(
        '¿Salir de la evaluación?',
        'Tienes respuestas en progreso. Si sales ahora, deberás iniciarla nuevamente.',
        [
          { text: 'Quedarme', style: 'cancel' },
          {
            text: 'Salir',
            style: 'destructive',
            onPress: () => router.replace('/(tabs)/learning' as any),
          },
        ],
      );
      return true;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/learning' as any);
    }
    return true;
  }, [evaluationResult, showResourceIntro, hasResourceInfo, userAnswers.length]);

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

  const selectedObj = currentQ?.options?.find((o) => o.key === selectedOption);

  return (
    <Screen style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Cabecera superior */}
        <View style={styles.topHeader}>
          <BackButton onPress={handleBack} />
          <Text style={styles.headerStep}>
            {evaluationResult
              ? 'RESULTADOS DE EVALUACIÓN'
              : showResourceIntro
              ? 'RECURSO DE APRENDIZAJE'
              : `PREGUNTA ${currentIndex + 1} DE ${questions.length}`}
          </Text>
          <BrandHeader showTagline={false} />
        </View>

        {evaluationResult ? (
          <View style={styles.resultsContainer}>
            {/* Tarjeta de Puntuación Hero */}
            <View style={styles.resultsHeroCard}>
              <View style={styles.scoreCircle}>
                <Text style={styles.scoreNumber}>
                  {evaluationResult.score}/{evaluationResult.total_questions}
                </Text>
                <Text style={styles.scorePercentLabel}>{evaluationResult.percentage}% acierto</Text>
              </View>

              <Text style={styles.resultsHeroTitle}>
                {evaluationResult.percentage >= 80 ? '¡Excelente desempeño!' : '¡Evaluación completada!'}
              </Text>
              <Text style={styles.resultsHeroDesc}>
                {evaluationResult.percentage >= 80
                  ? `Dominas los conocimientos esenciales sobre "${resourceTitle}". Estás preparado para continuar con las actividades de tu plan.`
                  : `Has completado el cuestionario de "${resourceTitle}". Identificamos temas clave que te recomendamos reforzar.`}
              </Text>
            </View>

            {/* HU-41: Detectar conocimientos por mejorar */}
            {evaluationResult.weak_topics && evaluationResult.weak_topics.length > 0 ? (
              <View style={styles.weakTopicsCard}>
                <View style={styles.weakTopicsHeader}>
                  <Feather name="alert-circle" size={18} color="#D97706" />
                  <Text style={styles.weakTopicsTitle}>Temas detectados por mejorar</Text>
                </View>
                <Text style={styles.weakTopicsDesc}>
                  El sistema detectó que los siguientes conceptos presentan oportunidad de refuerzo:
                </Text>
                {evaluationResult.weak_topics.map((topic, idx) => (
                  <View key={idx} style={styles.weakTopicRow}>
                    <View style={styles.weakTopicDot} />
                    <Text style={styles.weakTopicName}>{topic}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {/* HU-42: Agregar aprendizaje de refuerzo */}
            {evaluationResult.weak_topics && evaluationResult.weak_topics.length > 0 ? (
              <View style={styles.reinforcementCard}>
                <View style={styles.reinforcementHeader}>
                  <Feather name="book-open" size={18} color="#174A62" />
                  <Text style={styles.reinforcementTitle}>Refuerzo adaptativo recomendado</Text>
                </View>
                <Text style={styles.reinforcementDesc}>
                  La IA propone añadir una sesión de aprendizaje focalizada en "{evaluationResult.weak_topics[0]}".
                </Text>

                {reinforcementAdded ? (
                  <View style={styles.reinforcementSuccessBox}>
                    <Feather name="check-circle" size={16} color="#166534" />
                    <Text style={styles.reinforcementSuccessText}>
                      ¡Actividad de refuerzo añadida a tu cronograma!
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.addReinforcementBtn}
                    onPress={handleAddReinforcement}
                    disabled={addingReinforcement}
                    activeOpacity={0.85}
                  >
                    {addingReinforcement ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Feather name="plus-circle" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                        <Text style={styles.addReinforcementBtnText}>
                          Añadir actividad de refuerzo al plan
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            ) : null}

            {/* Botones de acción final */}
            <TouchableOpacity
              style={styles.primaryResultsBtn}
              onPress={() =>
                router.navigate({
                  pathname: '/goal-plan',
                  params: { goalId: String(goalIdNum) },
                } as any)
              }
              activeOpacity={0.85}
            >
              <Text style={styles.primaryResultsBtnText}>Ir a mi plan de actividades</Text>
              <Feather name="arrow-right" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryResultsBtn}
              onPress={() => router.replace('/(tabs)/learning' as any)}
              activeOpacity={0.85}
            >
              <Text style={styles.secondaryResultsBtnText}>Volver a recursos de Aprender</Text>
              <Feather name="book-open" size={16} color="#174A62" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>
        ) : showResourceIntro ? (
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
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Feather name="book-open" size={18} color="#174A62" />
                    <Text style={styles.contentSectionTitle}>Artículo formativo de lectura</Text>
                  </View>
                  <View style={styles.miniDurationBadge}>
                    <Feather name="clock" size={12} color="#174A62" />
                    <Text style={styles.miniDurationText}>{resourceDuration}</Text>
                  </View>
                </View>

                {/* Resumen pedagógico inicial */}
                <View style={styles.readingIntroCard}>
                  <Text style={styles.readingIntroLabel}>PROPÓSITO DE LA LECTURA</Text>
                  <Text style={styles.contentSummaryText}>
                    {resourceSummary ||
                      `En esta lectura aprenderás los fundamentos esenciales de "${resourceTitle}". Te permitirá comprender los conceptos clave antes de avanzar a la práctica.`}
                  </Text>
                </View>

                {/* Texto completo y desarrollado del artículo de lectura */}
                <View style={styles.articleBodyContainer}>
                  <Text style={styles.articleSectionSubtitle}>Contenido completo del tema</Text>
                  {readingContent.split('\n\n').map((paragraph, pIdx) => (
                    <Text key={pIdx} style={styles.articleParagraph}>
                      {paragraph.trim()}
                    </Text>
                  ))}
                </View>

                {/* Recuadro de Ejemplo Práctico en la Vida Real */}
                <View style={styles.exampleCard}>
                  <View style={styles.exampleHeader}>
                    <Feather name="zap" size={15} color="#D97706" />
                    <Text style={styles.exampleTitle}>Caso de aplicación práctica</Text>
                  </View>
                  <Text style={styles.exampleText}>{practicalExample}</Text>
                </View>

                {/* Puntos clave y conclusiones destacadas */}
                <View style={styles.keyPointsContainer}>
                  <Text style={styles.keyPointsTitle}>Conclusiones y puntos clave:</Text>
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
                  <Feather name="play-circle" size={18} color="#174A62" />
                  <Text style={styles.contentSectionTitle}>Tutorial en vídeo guiado</Text>
                </View>

                {/* Banner Interactivo de Video con Botón de Reproducción Real */}
                <View style={styles.videoPlayerBox}>
                  <View style={styles.videoThumbnailCard}>
                    <TouchableOpacity
                      style={styles.videoPlayCircleLarge}
                      activeOpacity={0.85}
                      onPress={() => handleOpenVideo()}
                    >
                      <Feather name="play" size={32} color="#FFFFFF" style={{ marginLeft: 4 }} />
                    </TouchableOpacity>
                    <View style={styles.videoDurationBadge}>
                      <Feather name="clock" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                      <Text style={styles.videoDurationBadgeText}>{resourceDuration}</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.openRealVideoButton}
                    activeOpacity={0.85}
                    onPress={() => handleOpenVideo()}
                  >
                    <Feather name="play" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.openRealVideoButtonText}>Ver video tutorial en YouTube</Text>
                    <Feather name="external-link" size={14} color="#90C2DE" style={{ marginLeft: 8 }} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.contentSummaryText}>
                  {resourceSummary ||
                    `Explicación audiovisual guiada paso a paso sobre "${resourceTitle}".`}
                </Text>

                {/* Índice interactivo de capítulos del vídeo */}
                <View style={styles.timestampsBox}>
                  <Text style={styles.timestampsHeader}>Capítulos y marcas de tiempo del vídeo:</Text>
                  {videoTimestamps.map((ts, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.timestampItem}
                      activeOpacity={0.7}
                      onPress={() => handleOpenVideo(`${resourceTitle} ${ts.title}`)}
                    >
                      <View style={styles.timestampBadge}>
                        <Feather name="play" size={10} color="#174A62" />
                        <Text style={styles.timestampBadgeText}>{ts.time}</Text>
                      </View>
                      <Text style={styles.timestampTitle}>{ts.title}</Text>
                      <Feather name="external-link" size={12} color="#94A3B8" />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {resourceType === 'PRÁCTICA' && (
              <View style={styles.resourceContentCard}>
                <View style={styles.contentHeaderRow}>
                  <Feather name="check-circle" size={18} color="#2F855A" />
                  <Text style={styles.contentSectionTitle}>Taller y reto práctico guiado</Text>
                </View>

                <View style={styles.challengeHeroBox}>
                  <Text style={styles.challengeCategoryTag}>DESAFÍO PRÁCTICO</Text>
                  <Text style={styles.challengeMainTitle}>{challengeTitle}</Text>
                  <Text style={styles.challengeDescription}>
                    {resourceSummary ||
                      `Aplica los conocimientos de "${resourceTitle}" en una actividad práctica real para asegurar tu avance.`}
                  </Text>
                </View>

                {/* Checklist de pasos interactivos con contador de progreso */}
                <View style={styles.practiceStepsBox}>
                  <View style={styles.practiceStepsHeaderRow}>
                    <Text style={styles.practiceStepsTitle}>Pasos del ejercicio:</Text>
                    <Text style={styles.practiceStepsCount}>
                      {completedPracticeSteps.length} de {practiceSteps.length} listos
                    </Text>
                  </View>

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
                          {isChecked && <Feather name="check" size={13} color="#FFFFFF" />}
                        </View>
                        <Text style={[styles.practiceStepText, isChecked && styles.practiceStepTextChecked]}>
                          <Text style={{ fontWeight: '700' }}>Paso {idx + 1}: </Text>
                          {step}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Registro de Resultados y Notas de la Práctica (Cumple HU-39) */}
                <View style={styles.practiceNotesContainer}>
                  <Text style={styles.practiceNotesLabel}>
                    Registro de tus resultados o reflexiones (HU-39):
                  </Text>
                  <TextInput
                    style={styles.practiceNotesInput}
                    placeholder="Anota aquí qué lograste, qué aprendiste o cualquier conclusión de tu práctica..."
                    placeholderTextColor="#94A3B8"
                    value={practiceNotes}
                    onChangeText={setPracticeNotes}
                    multiline
                    numberOfLines={3}
                  />

                  <Text style={styles.practicePerceptionLabel}>¿Cómo sentiste la dificultad del reto?</Text>
                  <View style={styles.perceptionRow}>
                    {[
                      { key: 'easy', label: 'Fácil' },
                      { key: 'good', label: 'Adecuado' },
                      { key: 'hard', label: 'Desafiante' },
                    ].map((item) => (
                      <TouchableOpacity
                        key={item.key}
                        style={[
                          styles.perceptionBtn,
                          practicePerception === item.key && styles.perceptionBtnActive,
                        ]}
                        onPress={() => setPracticePerception(item.key as any)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.perceptionBtnText,
                            practicePerception === item.key && styles.perceptionBtnTextActive,
                          ]}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
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
                    ? 'Pon a prueba tu retención de lo leído con preguntas diagnósticas adaptativas y refuerzo con IA.'
                    : resourceType === 'VÍDEO'
                    ? 'Verifica los conceptos vistos en el tutorial con preguntas diagnósticas adaptativas.'
                    : 'Comprueba los conocimientos operativos adquiridos con preguntas diagnósticas adaptativas.'}
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
  videoThumbnailCard: {
    height: 150,
    backgroundColor: '#091E2A',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  videoPlayCircleLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#174A62',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    elevation: 4,
  },
  videoDurationBadge: {
    position: 'absolute',
    bottom: 10,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  videoDurationBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  openRealVideoButton: {
    backgroundColor: '#C53030',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  openRealVideoButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
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
  challengeHeroBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    padding: 14,
    gap: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#2F855A',
  },
  challengeCategoryTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2F855A',
    letterSpacing: 0.8,
  },
  challengeMainTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F2C40',
  },
  challengeDescription: {
    fontSize: 12,
    color: '#4A5568',
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
  practiceStepsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  practiceStepsTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#174A62',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  practiceStepsCount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2F855A',
  },
  practiceStepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  practiceStepItemChecked: {
    opacity: 0.7,
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
    backgroundColor: '#2F855A',
    borderColor: '#2F855A',
  },
  practiceStepText: {
    fontSize: 12,
    color: '#1E293B',
    fontWeight: '500',
    flex: 1,
    lineHeight: 18,
  },
  practiceStepTextChecked: {
    textDecorationLine: 'line-through',
    color: '#64748B',
  },
  practiceNotesContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  practiceNotesLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#174A62',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  practiceNotesInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 10,
    fontSize: 12,
    color: '#0F2C40',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  practicePerceptionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#627D98',
    marginTop: 2,
  },
  perceptionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  perceptionBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  perceptionBtnActive: {
    backgroundColor: '#174A62',
    borderColor: '#174A62',
  },
  perceptionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#627D98',
  },
  perceptionBtnTextActive: {
    color: '#FFFFFF',
  },
  resultsContainer: {
    gap: 16,
  },
  resultsHeroCard: {
    backgroundColor: '#174A62',
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#174A62',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    elevation: 4,
    gap: 12,
  },
  scoreCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreNumber: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  scorePercentLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#90C2DE',
    letterSpacing: 0.5,
  },
  resultsHeroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  resultsHeroDesc: {
    fontSize: 13,
    color: '#D8ECF8',
    textAlign: 'center',
    lineHeight: 19,
  },
  weakTopicsCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 18,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  weakTopicsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  weakTopicsTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
  },
  weakTopicsDesc: {
    fontSize: 12,
    color: '#78350F',
    lineHeight: 17,
  },
  weakTopicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 3,
  },
  weakTopicDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D97706',
  },
  weakTopicName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  reinforcementCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    shadowColor: '#174A62',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    elevation: 2,
  },
  reinforcementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reinforcementTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#174A62',
  },
  reinforcementDesc: {
    fontSize: 12,
    color: '#4A5568',
    lineHeight: 17,
  },
  reinforcementSuccessBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  reinforcementSuccessText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
  addReinforcementBtn: {
    backgroundColor: '#174A62',
    height: 46,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  addReinforcementBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  primaryResultsBtn: {
    backgroundColor: '#174A62',
    height: 52,
    borderRadius: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#174A62',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    elevation: 3,
    marginTop: 6,
  },
  primaryResultsBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryResultsBtn: {
    backgroundColor: '#FFFFFF',
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryResultsBtnText: {
    color: '#174A62',
    fontSize: 14,
    fontWeight: '700',
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
  miniDurationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EBF5FB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  miniDurationText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#174A62',
  },
  readingIntroCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#174A62',
    gap: 4,
  },
  readingIntroLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#627D98',
    letterSpacing: 0.8,
  },
  articleBodyContainer: {
    gap: 10,
    paddingVertical: 4,
  },
  articleParagraph: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 20,
  },
  exampleCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 6,
  },
  exampleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  exampleTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 0.3,
  },
  exampleText: {
    fontSize: 12,
    color: '#78350F',
    lineHeight: 18,
  },
  finishReadingBtn: {
    backgroundColor: '#174A62',
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  finishReadingBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});