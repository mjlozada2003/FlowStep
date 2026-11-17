import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';

export interface UserAvailabilitySlot {
  day_of_week: string;
  start_time: string;
  end_time: string;
}

export interface PlanActivity {
  title: string;
  type: string;
  estimated_minutes: number;
  sort_order: number;
}

export interface PlanStage {
  name: string;
  description: string;
  sort_order: number;
  activities: PlanActivity[];
}

export interface InitialPlanResponse {
  stages: PlanStage[];
}

export interface RecommendationDiagnostic {
  goal_id: number;
  goal_title: string;
  activity_title?: string;
  max_days_late?: number;
  alert_level: 'warning' | 'critical' | 'info';
  alert_message: string;
  difficulty_context?: string;
  why_suggested: string;
  solution_focus: string;
  solutions: string[];
  metrics: {
    progress_percentage: number;
    completed_activities: number;
    total_activities: number;
    available_hours?: number;
  };
}

export interface ReplanProposalItem {
  type: 'balanced' | 'learning' | 'time';
  type_label: string;
  title: string;
  badge_text: string;
  description: string;
  stats_summary: string;
  pills: string[];
  explanation: string;
  rescheduled_count: number;
  added_resources_count?: number;
  extended_days?: number;
}

export interface ReplanAlternativesResponse {
  goal_id: number;
  goal_title: string;
  current_progress_percentage: number;
  completed_count: number;
  completed_hours: number;
  proposals: ReplanProposalItem[];
}

export interface GoalTopicItem {
  id: string;
  name: string;
  is_mastered: boolean;
  status?: 'completed' | 'current' | 'pending';
  stage_name?: string;
}

export interface GoalKnowledgeResponse {
  goal_id: number;
  goal_title: string;
  dominant_count: number;
  total_concepts: number;
  progress_percentage: number;
  topics: GoalTopicItem[];
  current_concept?: {
    title: string;
    description: string;
    mastery_percentage: number;
  };
}

export interface LearningResourceItem {
  id: string;
  type: 'LECTURA' | 'VÍDEO' | 'PRÁCTICA';
  duration: string;
  title: string;
  category: string;
  badge_text: string;
  icon_name: 'book-open' | 'play' | 'code';
  url?: string;
  activity_id?: number;
  summary?: string;
  key_points?: string[];
  video_timestamps?: { time: string; title: string }[];
  practice_steps?: string[];
  code_snippet?: string;
}

export interface QuizOption {
  key: string;
  text: string;
  isCorrect: boolean;
  is_correct?: boolean;
}

export interface QuizQuestionItem {
  id: number;
  category: string;
  question: string;
  options: QuizOption[];
  explanation: string;
}

export interface QuizEvaluationResult {
  score: number;
  total_questions: number;
  percentage: number;
  weak_topics: string[];
  reinforcement_recommendations: {
    topic: string;
    suggested_title: string;
    estimated_minutes: number;
  }[];
}

@Injectable()
export class AiService {
  private ai: GoogleGenAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new InternalServerErrorException('API Key de Gemini no configurada');
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  private cleanJsonText(rawText?: string): string | null {
    if (!rawText) return null;
    let text = rawText.trim();
    if (text.startsWith('```')) {
      text = text.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/i, '').trim();
    }
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    const firstBracket = text.indexOf('[');
    const lastBracket = text.lastIndexOf(']');

    if (firstBracket !== -1 && lastBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
      return text.slice(firstBracket, lastBracket + 1);
    }
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      return text.slice(firstBrace, lastBrace + 1);
    }
    return text;
  }

  private async callGeminiJson<T>(prompt: string): Promise<T | null> {
    const candidateModels = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-3.5-flash-lite', 'gemini-flash-lite-latest'];
    for (const model of candidateModels) {
      try {
        const response = await this.ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });
        const cleaned = this.cleanJsonText(response?.text);
        if (cleaned) {
          return JSON.parse(cleaned) as T;
        }
      } catch (err: any) {
        // Continuar con el siguiente modelo candidato
      }
    }
    return null;
  }

  private generateFallbackPlan(
    goalTitle: string,
    goalDescription: string,
    userAvailabilities?: UserAvailabilitySlot[],
    sessionDurationMinutes = 60,
  ): InitialPlanResponse {
    let defaultDuration = sessionDurationMinutes;
    if (userAvailabilities && userAvailabilities.length > 0) {
      const slot = userAvailabilities[0];
      if (slot.start_time && slot.end_time) {
        const [sh, sm] = slot.start_time.split(':').map(Number);
        const [eh, em] = slot.end_time.split(':').map(Number);
        const diffMinutes = eh * 60 + em - (sh * 60 + sm);
        if (diffMinutes > 0 && diffMinutes <= 180) {
          defaultDuration = Math.min(diffMinutes, sessionDurationMinutes);
        }
      }
    }

    const cleanTitle = (goalTitle || 'Objetivo').trim();

    return {
      stages: [
        {
          name: `Fundamentos de ${cleanTitle}`,
          description: 'Bases teóricas, conceptos esenciales y configuración inicial.',
          sort_order: 1,
          activities: [
            {
              title: `Introducción y conceptos clave de ${cleanTitle}`,
              type: 'learning',
              estimated_minutes: defaultDuration,
              sort_order: 1,
            },
            {
              title: 'Configuración de herramientas y entorno de práctica',
              type: 'practice',
              estimated_minutes: defaultDuration,
              sort_order: 2,
            },
            {
              title: 'Primer ejercicio guiado de asimilación',
              type: 'exercise',
              estimated_minutes: defaultDuration,
              sort_order: 3,
            },
          ],
        },
        {
          name: `Desarrollo y Práctica de ${cleanTitle}`,
          description: 'Aplicación práctica de conocimientos y resolución de problemas.',
          sort_order: 2,
          activities: [
            {
              title: 'Práctica guiada: Ejercicios de nivel intermedio',
              type: 'practice',
              estimated_minutes: defaultDuration,
              sort_order: 1,
            },
            {
              title: 'Desarrollo de un caso práctico o proyecto base',
              type: 'exercise',
              estimated_minutes: defaultDuration,
              sort_order: 2,
            },
            {
              title: 'Revisión y corrección de dudas comunes',
              type: 'learning',
              estimated_minutes: defaultDuration,
              sort_order: 3,
            },
          ],
        },
        {
          name: `Consolidación y Evaluación de ${cleanTitle}`,
          description: 'Evaluación final, optimización y consolidación del aprendizaje.',
          sort_order: 3,
          activities: [
            {
              title: 'Autoevaluación de conocimientos adquiridos',
              type: 'assessment',
              estimated_minutes: defaultDuration,
              sort_order: 1,
            },
            {
              title: 'Refuerzo de conceptos y optimización del proyecto',
              type: 'reinforcement',
              estimated_minutes: defaultDuration,
              sort_order: 2,
            },
            {
              title: 'Cierre y consolidación del objetivo',
              type: 'assessment',
              estimated_minutes: defaultDuration,
              sort_order: 3,
            },
          ],
        },
      ],
    };
  }

  async generateInitialPlan(
    goalTitle: string,
    goalDescription: string,
    userAvailabilities?: UserAvailabilitySlot[],
    sessionDurationMinutes = 60,
  ): Promise<InitialPlanResponse | null> {
    const availabilitySection =
      userAvailabilities && userAvailabilities.length > 0
        ? `
      DISPONIBILIDAD HORARIA DEL USUARIO (HU-35, HU-07, HU-36):
      El usuario cuenta con la siguiente disponibilidad horaria semanal:
      ${userAvailabilities.map((slot) => `- ${slot.day_of_week}: de ${slot.start_time} a ${slot.end_time}`).join('\n')}

      CRITERIOS OBLIGATORIOS DE ADAPTACIÓN (HU-36 y HU-07):
      1. Adapta la duración estimada ("estimated_minutes") de cada actividad para que sea compatible con los bloques de tiempo del usuario.
      2. La duración máxima elegida por sesión es ${sessionDurationMinutes} minutos, y ninguna actividad puede superar ese valor ni la duración de su franja disponible.
      3. Si un conocimiento o práctica es extenso, divídelo en varias actividades progresivas y digeribles que encajen dentro de sus horarios disponibles.
      `
        : `
      CRITERIOS DE TIEMPO:
      - Asigna duraciones estimadas realistas ("estimated_minutes" entre 15 y 60 minutos por actividad).
      `;

    const prompt = `
      Actúa como un experto planificador y educador. 
      Tengo el siguiente objetivo: "${goalTitle}"
      Descripción detallada: "${goalDescription}"

      ${availabilitySection}

      Por favor, divide este objetivo en etapas lógicas (stages).
      Para cada etapa, define las actividades necesarias (activities).
      Para cada actividad, indica un título, tipo (learning, practice, exercise, assessment, reinforcement), y minutos estimados adaptados.
      
      Devuelve la respuesta ESTRICTAMENTE en este formato JSON (sin texto adicional, sin bloques de código markdown, solo el JSON puro):
      {
        "stages": [
          {
            "name": "Nombre de la etapa",
            "description": "Descripción de la etapa",
            "sort_order": 1,
            "activities": [
              {
                "title": "Título de la actividad",
                "type": "learning",
                "estimated_minutes": 30,
                "sort_order": 1
              }
            ]
          }
        ]
      }
    `;

    // Modelos candidatos en orden de preferencia y resiliencia ante alta demanda
    const candidateModels = ['gemini-3.5-flash-lite', 'gemini-flash-lite-latest', 'gemini-3.5-flash'];

    for (const model of candidateModels) {
      try {
        const response = await this.ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        const cleaned = this.cleanJsonText(response?.text);
        if (cleaned) {
          const parsed = JSON.parse(cleaned);
          if (Array.isArray(parsed?.stages) && parsed.stages.length > 0) {
            return parsed;
          }
        }
      } catch (error: any) {
        console.warn(`Aviso de IA (${model}): ${error?.message || error}. Probando alternativa...`);
      }
    }

    // Si la API de Gemini tiene picos de saturación (503/429) o fallas de red, aplicamos el plan pedagógico base adaptable
    console.warn('Gemini experimenta alta demanda o inaccesibilidad temporal. Aplicando plan pedagógico adaptable base.');
    return this.generateFallbackPlan(
      goalTitle,
      goalDescription,
      userAvailabilities,
      sessionDurationMinutes,
    );
  }

  /**
   * HU-04, HU-26, HU-30: Generar diagnóstico y recomendación asistida por IA
   */
  async generateRecommendationDiagnostic(
    goalId: number,
    goalTitle: string,
    overdueActivityTitle?: string,
    maxDaysLate = 0,
    difficultyNotes?: string,
    missReason?: string,
    progressPercentage = 0,
    completedActivities = 0,
    totalActivities = 0,
    availableHours = 4,
  ): Promise<RecommendationDiagnostic> {
    const isDelayed = maxDaysLate > 0;
    const hasDifficulty = Boolean(difficultyNotes || missReason);

    const prompt = `
      Actúa como un mentor educativo y pedagógico empático de la aplicación FlowStep.
      El usuario tiene el objetivo: "${goalTitle}"
      Progreso actual: ${progressPercentage}%, actividades completadas: ${completedActivities} de ${totalActivities}.
      Horas disponibles estimadas esta semana: ${availableHours}h.
      ${isDelayed ? `Actividad con retraso: "${overdueActivityTitle}" con ${maxDaysLate} días de atraso.` : 'El objetivo no presenta retrasos críticos.'}
      ${hasDifficulty ? `Dificultad o causa registrada: "${difficultyNotes || missReason}".` : 'No se registraron dificultades severas.'}

      Genera un diagnóstico constructivo que explique claramente la razón de la recomendación y qué busca solucionar.
      Devuelve ESTRICTAMENTE un JSON con:
      {
        "why_suggested": "Explicación breve de 1 o 2 oraciones de por qué se sugiere",
        "solution_focus": "Enfoque de la solución (ej: Dar más espacio al aprendizaje, Optimizar carga)",
        "solutions": [
          "Conservar las ${completedActivities} actividades ya completadas.",
          "Segunda acción propuesta...",
          "Tercera acción propuesta..."
        ]
      }
    `;

    try {
      const parsed = await this.callGeminiJson<{
        why_suggested?: string;
        solution_focus?: string;
        solutions?: string[];
      }>(prompt);

      if (parsed?.why_suggested && parsed?.solution_focus && Array.isArray(parsed?.solutions)) {
        return {
          goal_id: goalId,
          goal_title: goalTitle,
          activity_title: overdueActivityTitle || 'Actividad programada',
          max_days_late: maxDaysLate,
          alert_level: maxDaysLate > 3 ? 'critical' : isDelayed ? 'warning' : 'info',
          alert_message: isDelayed
            ? `"${overdueActivityTitle || 'Una actividad'}" lleva ${maxDaysLate} ${maxDaysLate === 1 ? 'día' : 'días'} de retraso.`
            : 'Estás al día con tu planificación.',
          difficulty_context: difficultyNotes || missReason || undefined,
          why_suggested: parsed.why_suggested,
          solution_focus: parsed.solution_focus,
          solutions: parsed.solutions,
          metrics: {
            progress_percentage: Number(progressPercentage),
            completed_activities: completedActivities,
            total_activities: totalActivities,
            available_hours: availableHours,
          },
        };
      }
    } catch {
      // Usar fallback
    }

    // Fallback pedagógico contextual
    const defaultWhy = isDelayed
      ? `"${overdueActivityTitle || 'Una actividad'}" no pudo completarse dentro del plazo${hasDifficulty ? ` y registraste: ${difficultyNotes || missReason}` : ''}.`
      : 'Mantén el buen ritmo actual asegurando sesiones de repaso para consolidar tu avance.';

    return {
      goal_id: goalId,
      goal_title: goalTitle,
      activity_title: overdueActivityTitle || 'Actividad del plan',
      max_days_late: maxDaysLate,
      alert_level: maxDaysLate > 3 ? 'critical' : isDelayed ? 'warning' : 'info',
      alert_message: isDelayed
        ? `"${overdueActivityTitle || 'Una actividad'}" lleva ${maxDaysLate} ${maxDaysLate === 1 ? 'día' : 'días'} de retraso.`
        : 'Estás al día con tu planificación.',
      difficulty_context: difficultyNotes || missReason || undefined,
      why_suggested: defaultWhy,
      solution_focus: isDelayed ? 'Dar más espacio al aprendizaje' : 'Consolidar el progreso alcanzado',
      solutions: [
        `Conservar las ${completedActivities} actividades ya completadas y tu avance registrado.`,
        isDelayed
          ? 'Reorganizar las actividades restantes según tu disponibilidad horaria real.'
          : 'Continuar con las actividades programadas en tus bloques disponibles.',
        'Ofrecer refuerzos guiados si encuentras conceptos complejos en las siguientes sesiones.',
      ],
      metrics: {
        progress_percentage: Number(progressPercentage),
        completed_activities: completedActivities,
        total_activities: totalActivities,
        available_hours: availableHours,
      },
    };
  }

  /**
   * HU-27, HU-28, HU-29, HU-30, HU-51: Generar alternativas comparativas de replanificación
   */
  async generateReplanAlternatives(
    goalId: number,
    goalTitle: string,
    progressPercentage: number,
    completedCount: number,
    completedHours: number,
    pendingActivitiesCount: number,
  ): Promise<ReplanAlternativesResponse> {
    const proposals: ReplanProposalItem[] = [
      {
        type: 'balanced',
        type_label: 'Equilibrada',
        title: 'Redistribuir esta semana',
        badge_text: 'RECOMENDADA',
        description: `Mueve ${Math.min(pendingActivitiesCount, 2)} actividades a franjas libres y mantiene la fecha límite.`,
        stats_summary: '3 sesiones · máx. 60 min',
        pills: ['Ajuste semanal', 'Sin cambiar fecha'],
        explanation: 'Aprovecha tu disponibilidad de fin de semana para resolver el retraso sin alterar la fecha límite original.',
        rescheduled_count: Math.min(pendingActivitiesCount, 2),
      },
      {
        type: 'learning',
        type_label: 'Más aprendizaje',
        title: 'Añadir refuerzo guiado',
        badge_text: 'MÁS APOYO',
        description: 'Agrega 2 recursos de refuerzo y desplaza la práctica 3 días.',
        stats_summary: '4 sesiones · Incluye refuerzo',
        pills: ['+ 2 recursos', 'Práctica guiada'],
        explanation: 'Ideal si necesitas afianzar conceptos clave antes de avanzar con ejercicios prácticos más complejos.',
        rescheduled_count: Math.min(pendingActivitiesCount, 3),
        added_resources_count: 2,
      },
      {
        type: 'time',
        type_label: 'Más tiempo',
        title: 'Extender fecha límite',
        badge_text: 'MENOR CARGA',
        description: 'Reduce la carga semanal y extiende el cierre 14 días.',
        stats_summary: '2 sesiones · máx. 45 min',
        pills: ['+ 14 días', '- 1 sesión/sem'],
        explanation: 'Distribuye mejor el esfuerzo diario si tienes una agenda apretada en las próximas semanas.',
        rescheduled_count: pendingActivitiesCount,
        extended_days: 14,
      },
    ];

    return {
      goal_id: goalId,
      goal_title: goalTitle,
      current_progress_percentage: progressPercentage,
      completed_count: completedCount,
      completed_hours: completedHours,
      proposals,
    };
  }

  /**
   * HU-37: Consultar conocimientos necesarios del objetivo
   */
  async generateGoalKnowledge(
    goalId: number,
    goalTitle: string,
    completedRatio = 0.33,
    stageNames: string[] = [],
  ): Promise<GoalKnowledgeResponse> {
    const stageContext =
      stageNames && stageNames.length > 0
        ? `Las etapas planificadas son: ${stageNames.map((s, i) => `${i + 1}. ${s}`).join(', ')}.`
        : '';

    const prompt = `
      Para el objetivo: "${goalTitle}".
      ${stageContext}
      Lista entre 4 y 6 temas o conocimientos técnicos/teóricos clave ordenados de lo básico a lo avanzado, coherentes con este objetivo y sus etapas.
      Responde ESTRICTAMENTE con un array JSON de strings con los nombres cortos de los temas, por ejemplo:
      ["Fundamentos de ${goalTitle.split(' ')[0] || 'Objetivo'}", "Sintaxis básica", "Herramientas principales", "Práctica intermedia", "Dominio avanzado"]
    `;

    let topicNames: string[] = [];
    try {
      const parsed = await this.callGeminiJson<string[]>(prompt);
      if (Array.isArray(parsed) && parsed.length >= 3) {
        topicNames = parsed.map((item) => String(item).trim()).filter(Boolean);
      }
    } catch {
      // Fallback
    }

    if (topicNames.length === 0) {
      if (stageNames && stageNames.length >= 3) {
        topicNames = stageNames;
      } else {
        topicNames = [
          `Fundamentos de ${goalTitle}`,
          `Conceptos clave y configuración`,
          `Desarrollo de habilidades prácticas`,
          `Técnicas avanzadas y optimización`,
          `Evaluación e integración final`,
        ];
      }
    }

    const total = topicNames.length;
    const dominantCount = Math.max(0, Math.min(Math.round(total * completedRatio), total));

    const topics: GoalTopicItem[] = topicNames.map((name, index) => {
      let status: 'completed' | 'current' | 'pending' = 'pending';
      if (index < dominantCount) {
        status = 'completed';
      } else if (index === dominantCount) {
        status = 'current';
      } else {
        status = 'pending';
      }

      return {
        id: String(index + 1),
        name,
        is_mastered: index < dominantCount,
        status,
        stage_name: stageNames[index] || name,
      };
    });

    const currentConceptIndex = Math.min(dominantCount, total - 1);
    const currentTopicName = topicNames[currentConceptIndex] || topicNames[0] || goalTitle;

    return {
      goal_id: goalId,
      goal_title: goalTitle,
      dominant_count: dominantCount,
      total_concepts: total,
      progress_percentage: Math.round(completedRatio * 100),
      topics,
      current_concept: {
        title: currentTopicName,
        description: `Conceptos clave en desarrollo para consolidar las actividades de "${goalTitle}".`,
        mastery_percentage: Math.round(completedRatio * 100),
      },
    };
  }

  /**
   * HU-05, HU-38: Recursos de aprendizaje asociados al objetivo y sus actividades
   */
  async generateLearningResources(
    goalId: number,
    goalTitle: string,
    stageNames: string[] = [],
  ): Promise<LearningResourceItem[]> {
    const stageContext =
      stageNames && stageNames.length > 0
        ? `Las etapas planificadas son: ${stageNames.map((s, i) => `${i + 1}. ${s}`).join(', ')}.`
        : '';

    const prompt = `
      Para el objetivo: "${goalTitle}".
      ${stageContext}
      Genera 3 o 4 recursos de aprendizaje recomendados específicos para este objetivo y sus temas.
      Cada recurso debe incluir información pedagógica: un resumen informativo del tema (summary) y entre 2 y 3 puntos clave destacados (key_points).
      Devuelve ESTRICTAMENTE un array JSON con esta estructura:
      [
        {
          "id": "1",
          "type": "LECTURA",
          "duration": "5 min",
          "title": "Título del recurso",
          "category": "Categoría conceptual",
          "badge_text": "Esencial",
          "icon_name": "book-open",
          "summary": "Resumen claro y didáctico que proporciona la información esencial sobre este tema...",
          "key_points": [
            "Punto clave o concepto fundamental 1",
            "Punto clave o aplicación práctica 2",
            "Buenas prácticas recomendadas 3"
          ]
        },
        {
          "id": "2",
          "type": "VÍDEO",
          "duration": "12 min",
          "title": "Tutorial en vídeo: Nombre del tema",
          "category": "Categoría",
          "badge_text": "Recomendado",
          "icon_name": "play",
          "summary": "Explicación audiovisual paso a paso de los aspectos operativos más importantes...",
          "key_points": [
            "Demostración guiada del proceso",
            "Errores comunes y cómo evitarlos"
          ],
          "video_timestamps": [
            { "time": "00:00", "title": "Introducción y fundamentos" },
            { "time": "03:45", "title": "Demostración paso a paso" },
            { "time": "08:30", "title": "Buenas prácticas y aplicación real" }
          ]
        },
        {
          "id": "3",
          "type": "PRÁCTICA",
          "duration": "20 min",
          "title": "Reto aplicado: Nombre del ejercicio",
          "category": "Práctica",
          "badge_text": "Intermedio",
          "icon_name": "check-circle",
          "summary": "Taller enfocado en aplicar directamente una solución concreta relacionada al objetivo...",
          "challenge_title": "Desafío de aplicación real",
          "key_points": [
            "Puesta en práctica de los conceptos adquiridos",
            "Validación y comprobación de resultados"
          ],
          "practice_steps": [
            "Paso 1: Preparación del escenario o contexto de trabajo",
            "Paso 2: Ejecución guiada de la actividad",
            "Paso 3: Revisión y comprobación del resultado"
          ]
        }
      ]
      IMPORTANTE: Para el recurso PRÁCTICA, NO generes comandos de terminal bash ni código informático a menos que el objetivo sea explícitamente programación; genera pasos prácticos y retos accionables para cualquier meta.
    `;

    try {
      const parsed = await this.callGeminiJson<LearningResourceItem[]>(prompt);
      if (Array.isArray(parsed) && parsed.length >= 2) {
        return parsed.map((item, idx) => ({
          id: String(idx + 1),
          type: item.type || 'LECTURA',
          duration: item.duration || '10 min',
          title: item.title || `Recurso ${idx + 1}`,
          category: item.category || 'Aprendizaje',
          badge_text: item.badge_text || 'Recomendado',
          icon_name: item.type === 'VÍDEO' ? 'play' : item.type === 'PRÁCTICA' ? 'check-circle' : 'book-open',
          summary:
            item.summary ||
            `Información esencial sobre "${item.title || 'este tema'}" para fortalecer los conocimientos necesarios para tu objetivo.`,
          key_points:
            Array.isArray(item.key_points) && item.key_points.length > 0
              ? item.key_points
              : [
                  `Fundamentos y terminología básica de ${item.category || goalTitle}.`,
                  'Buenas prácticas y flujo de trabajo recomendado.',
                  'Cómo aplicar este concepto en tus actividades planificadas.',
                ],
          video_timestamps:
            Array.isArray(item.video_timestamps) && item.video_timestamps.length > 0
              ? item.video_timestamps
              : [
                  { time: '00:00', title: `Introducción a ${item.title}` },
                  { time: '04:15', title: 'Explicación y demostración práctica' },
                  { time: '09:30', title: 'Puntos clave y resumen' },
                ],
          practice_steps:
            Array.isArray(item.practice_steps) && item.practice_steps.length > 0
              ? item.practice_steps
              : [
                  `Prepara el contexto o materiales necesarios para ${item.category || goalTitle}.`,
                  'Aplica la técnica o solución propuesta desarrollando el ejercicio.',
                  'Revisa y registra tu resultado frente al objetivo propuesto.',
                ],
          challenge_title: (item as any).challenge_title || `Reto práctico: ${item.title}`,
        }));
      }
    } catch {
      // Fallback
    }

    const t1 = stageNames[0] || `Fundamentos de ${goalTitle}`;
    const t2 = stageNames[1] || `Guía práctica de ${goalTitle}`;
    const t3 = stageNames[2] || `Ejercicios y proyectos de ${goalTitle}`;

    return [
      {
        id: '1',
        type: 'LECTURA',
        duration: '5 min',
        title: `Guía esencial: ${t1}`,
        category: t1,
        badge_text: 'Esencial',
        icon_name: 'book-open',
        summary: `En esta guía se introducen los conceptos y fundamentos de "${t1}", explicando su importancia conceptual y cómo aplicarlo paso a paso.`,
        key_points: [
          `Comprender los principios base de ${t1}.`,
          'Identificar las herramientas y flujo de trabajo recomendados.',
          'Buenas prácticas para evitar errores comunes durante la ejecución.',
        ],
      },
      {
        id: '2',
        type: 'VÍDEO',
        duration: '15 min',
        title: `Tutorial en vídeo: ${t2}`,
        category: t2,
        badge_text: 'Recomendado',
        icon_name: 'play',
        summary: `Demostración visual y resolución guiada de problemas centrada en "${t2}".`,
        key_points: [
          'Demostración visual y flujo de trabajo guiado.',
          'Resolución de casos y ejemplos reales.',
          'Recomendaciones para afianzar el aprendizaje.',
        ],
        video_timestamps: [
          { time: '00:00', title: `Introducción a ${t2}` },
          { time: '04:15', title: 'Demostración práctica paso a paso' },
          { time: '09:30', title: 'Errores comunes y optimización' },
          { time: '13:50', title: 'Resumen y conclusiones clave' },
        ],
      },
      {
        id: '3',
        type: 'PRÁCTICA',
        duration: '25 min',
        title: `Taller aplicado: ${t3}`,
        category: t3,
        badge_text: 'Intermedio',
        icon_name: 'check-circle',
        summary: `Ejercicio práctico estructurado para consolidar las habilidades operativas de "${t3}".`,
        key_points: [
          'Planteamiento del desafío práctico.',
          'Desarrollo e implementación guiada del ejercicio.',
          'Verificación de resultados y autoevaluación.',
        ],
        practice_steps: [
          `Revisa los conceptos base y prepara tu espacio para ${t3}.`,
          'Desarrolla el ejercicio siguiendo los criterios de calidad recomendados.',
          'Verifica tus resultados y anota tus conclusiones.',
        ],
        challenge_title: `Reto práctico: ${t3}`,
      },
    ];
  }

  /**
   * HU-40: Cuestionario de evaluación de conocimientos
   */
  async generateEvaluationQuiz(
    goalId: number,
    goalTitle: string,
    stageNames: string[] = [],
  ): Promise<QuizQuestionItem[]> {
    const stageContext =
      stageNames && stageNames.length > 0
        ? `Las etapas y conceptos del plan son: ${stageNames.join(', ')}.`
        : '';

    const prompt = `
      Para el objetivo: "${goalTitle}".
      ${stageContext}
      Crea 3 preguntas diagnósticas de opción múltiple (A, B, C) con una sola respuesta correcta y explicación, específicas para evaluar los conceptos de este objetivo.
      Devuelve ESTRICTAMENTE un array JSON con:
      [
        {
          "id": 1,
          "category": "CATEGORÍA",
          "question": "¿Pregunta?",
          "options": [
            { "key": "A", "text": "Opción correcta...", "isCorrect": true },
            { "key": "B", "text": "Opción incorrecta...", "isCorrect": false },
            { "key": "C", "text": "Opción incorrecta...", "isCorrect": false }
          ],
          "explanation": "Explicación breve de por qué es la correcta."
        }
      ]
    `;

    try {
      const parsed = await this.callGeminiJson<QuizQuestionItem[]>(prompt);
      if (Array.isArray(parsed) && parsed.length >= 2) {
        return parsed.map((item, idx) => ({
          id: item.id || idx + 1,
          category: item.category || 'Conceptos clave',
          question: item.question,
          options: (item.options || []).map((opt) => {
            const isCorr = Boolean(opt.isCorrect ?? (opt as any).is_correct);
            return {
              key: opt.key,
              text: opt.text,
              isCorrect: isCorr,
              is_correct: isCorr,
            };
          }),
          explanation: item.explanation || 'Respuesta orientada a reforzar los conceptos clave.',
        }));
      }
    } catch {
      // Fallback
    }

    const firstTopic = stageNames[0] || goalTitle;
    return [
      {
        id: 1,
        category: 'CONCEPTOS BÁSICOS',
        question: `¿Cuál es el primer principio fundamental para dominar "${firstTopic}"?`,
        options: [
          { key: 'A', text: 'Comprender los fundamentos y practicar de forma constante', isCorrect: true, is_correct: true },
          { key: 'B', text: 'Memorizar todos los conceptos sin practicar', isCorrect: false, is_correct: false },
          { key: 'C', text: 'Saltar directamente a proyectos complejos sin base', isCorrect: false, is_correct: false },
        ],
        explanation: 'La comprensión conceptual combinada con práctica progresiva garantiza retención duradera.',
      },
      {
        id: 2,
        category: 'METODOLOGÍA',
        question: '¿Qué acción se recomienda cuando encuentras una dificultad alta en una actividad?',
        options: [
          { key: 'A', text: 'Abandonar la actividad y pasar a otra', isCorrect: false, is_correct: false },
          { key: 'B', text: 'Desglosarla en pasos más pequeños y consultar recursos de apoyo', isCorrect: true, is_correct: true },
          { key: 'C', text: 'Ignorar el problema y continuar', isCorrect: false, is_correct: false },
        ],
        explanation: 'La descomposición de problemas y el refuerzo puntual facilitan superar bloqueos técnicos.',
      },
      {
        id: 3,
        category: 'APLICACIÓN PRÁCTICA',
        question: `¿Cómo se consolida de mejor forma el aprendizaje adquirido en "${goalTitle}"?`,
        options: [
          { key: 'A', text: 'Aplicándolo en un ejercicio práctico o proyecto real', isCorrect: true, is_correct: true },
          { key: 'B', text: 'Leyendo la teoría una sola vez', isCorrect: false, is_correct: false },
          { key: 'C', text: 'Postergando la práctica indefinidamente', isCorrect: false, is_correct: false },
        ],
        explanation: 'La práctica deliberada transfiere el conocimiento teórico a habilidades operativas reales.',
      },
    ];
  }

  /**
   * HU-40, HU-41, HU-42: Evaluar respuestas y detectar temas por reforzar
   */
  evaluateQuizAnswers(
    questions: QuizQuestionItem[],
    answers: { question_id: number; selected_option?: string; selected_option_id?: string; is_correct?: boolean; category?: string }[],
  ): QuizEvaluationResult {
    let score = 0;
    const weakTopicsSet = new Set<string>();

    for (const q of questions) {
      const userAns = answers.find((a) => a.question_id === q.id);
      const correctOpt = q.options.find((o) => o.isCorrect || o.is_correct);

      const userChoice = userAns?.selected_option || userAns?.selected_option_id;
      const isCorrect =
        typeof userAns?.is_correct === 'boolean'
          ? userAns.is_correct
          : Boolean(userAns && correctOpt && userChoice === correctOpt.key);

      if (isCorrect) {
        score++;
      } else {
        weakTopicsSet.add(q.category || userAns?.category || 'General');
      }
    }

    const total = questions.length || answers.length || 1;
    const percentage = Math.round((score / total) * 100);
    const weak_topics = Array.from(weakTopicsSet);

    const reinforcement_recommendations = weak_topics.map((topic) => ({
      topic,
      suggested_title: `Refuerzo guiado: ${topic}`,
      estimated_minutes: 30,
    }));

    return {
      score,
      total_questions: total,
      percentage,
      weak_topics,
      reinforcement_recommendations,
    };
  }

  /**
   * HU-26: Sugerencia puntual ante dificultad de una actividad
   */
  async generateActivitySuggestion(
    activityTitle: string,
    difficultyNotes?: string,
  ): Promise<{ suggestion: string; alternative_actions: string[] }> {
    return {
      suggestion: `Para abordar "${activityTitle}" tras registrar dificultad${difficultyNotes ? ` ("${difficultyNotes}")` : ''}, te sugerimos dividirla en dos sesiones cortas de 20 minutos y revisar el material introductorio.`,
      alternative_actions: [
        'Consultar lectura o video introductorio de 5 minutos.',
        'Reducir la complejidad del ejercicio inicial.',
        'Reprogramar la sesión para tu franja de mayor concentración.',
      ],
    };
  }
}
