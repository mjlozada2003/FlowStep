import { apiRequest } from '@/services/api/client';

export interface TopicItem {
  id?: string;
  name: string;
  is_mastered?: boolean;
  status?: 'completed' | 'current' | 'pending';
}

export interface GoalKnowledgeResponse {
  goal_id: number;
  goal_title: string;
  dominant_count: number;
  total_concepts: number;
  progress_percentage: number;
  topics: TopicItem[];
  current_concept: {
    title: string;
    description: string;
    mastery_percentage: number;
  };
}

export interface LearningResourceItem {
  id: string;
  type: 'LECTURA' | 'VÍDEO' | 'PRÁCTICA' | 'EJERCICIO';
  duration: string;
  title: string;
  category: string;
  badge_text: string;
  icon_name: 'book-open' | 'play' | 'code' | 'file-text' | 'check-circle' | 'award' | 'activity';
  url?: string;
  summary?: string;
  key_points?: string[];
  reading_content?: string;
  practical_example?: string;
  video_timestamps?: { time: string; title: string }[];
  practice_steps?: string[];
  challenge_title?: string;
  deliverable?: string;
  code_snippet?: string;
}

export interface QuizQuestionOption {
  key: string;
  text: string;
  is_correct: boolean;
  isCorrect?: boolean;
}

export interface QuizQuestionItem {
  id: number;
  category: string;
  question: string;
  options: QuizQuestionOption[];
  explanation: string;
}

export interface QuizEvaluationResult {
  goal_id: number;
  score: number;
  total_questions: number;
  percentage: number;
  weak_topics: string[];
  reinforcement_recommendations: Array<string | Record<string, unknown>>;
}

/**
 * HU-37: Consultar conocimientos y temas requeridos para el objetivo
 */
export async function getGoalKnowledge(
  goalId: number,
  token: string,
): Promise<GoalKnowledgeResponse> {
  return apiRequest<GoalKnowledgeResponse>(`/goals/${goalId}/knowledge`, {
    method: 'GET',
    token,
  });
}

/**
 * HU-05, HU-38: Consultar recursos de aprendizaje recomendados para el objetivo
 */
export async function getGoalResources(
  goalId: number,
  token: string,
): Promise<LearningResourceItem[]> {
  return apiRequest<LearningResourceItem[]>(`/goals/${goalId}/resources`, {
    method: 'GET',
    token,
  });
}

/**
 * HU-40: Obtener cuestionario de evaluación diagnóstica
 */
export async function getGoalEvaluation(
  goalId: number,
  token: string,
): Promise<QuizQuestionItem[]> {
  return apiRequest<QuizQuestionItem[]>(`/goals/${goalId}/evaluation`, {
    method: 'GET',
    token,
  });
}

/**
 * HU-40, HU-41, HU-42: Calificar respuestas del cuestionario y detectar áreas débiles
 */
export async function submitGoalEvaluation(
  goalId: number,
  answers: {
    question_id: number;
    selected_option?: string;
    selected_option_id?: string;
    is_correct?: boolean;
    category?: string;
  }[],
  token: string,
): Promise<QuizEvaluationResult> {
  const normalizedAnswers = answers.map((a) => ({
    question_id: a.question_id,
    selected_option: a.selected_option || a.selected_option_id || '',
    selected_option_id: a.selected_option_id || a.selected_option || '',
    is_correct: a.is_correct,
    category: a.category,
  }));
  return apiRequest<QuizEvaluationResult>(`/goals/${goalId}/evaluation/submit`, {
    method: 'POST',
    token,
    body: JSON.stringify({ answers: normalizedAnswers }),
  });
}

/**
 * HU-42, HU-39: Agregar actividad de aprendizaje de refuerzo al plan
 */
export async function addReinforcementActivity(
  goalId: number,
  dto: { topic: string; title?: string; estimated_minutes?: number; description?: string },
  token: string,
): Promise<{ message: string; activity: any }> {
  return apiRequest<{ message: string; activity: any }>(`/goals/${goalId}/reinforcement`, {
    method: 'POST',
    token,
    body: JSON.stringify(dto),
  });
}

/**
 * HU-38: Obtener recursos vinculados a una actividad puntual
 */
export async function getActivityResources(
  activityId: number,
  token: string,
): Promise<{ activity_id: number; activity_title: string; goal_id: number; resources: LearningResourceItem[] }> {
  return apiRequest<{ activity_id: number; activity_title: string; goal_id: number; resources: LearningResourceItem[] }>(
    `/activities/${activityId}/resources`,
    {
      method: 'GET',
      token,
    },
  );
}