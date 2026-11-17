import { apiRequest } from '@/services/api/client';

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
    available_hours_weekly: number;
  };
  recommended_actions: string[];
}

export interface ReplanAlternativeItem {
  proposal_type: 'balanced' | 'learning' | 'time';
  title: string;
  tagline: string;
  recommended: boolean;
  description: string;
  session_info: string;
  changes: string[];
  impact: string;
  suggested_due_date?: string;
}

export interface ReplanAlternativesResponse {
  goal_id: number;
  goal_title: string;
  completed_count: number;
  recorded_hours: number;
  progress_percentage: number;
  alternatives: ReplanAlternativeItem[];
}

export interface ActivitySuggestionResponse {
  activity_id: number;
  activity_title: string;
  goal_id: number;
  goal_title: string;
  difficulty_detected?: string | null;
  suggestion: string;
  alternative_actions: string[];
}

/**
 * HU-04, HU-26, HU-30: Consultar diagnóstico y recomendaciones por retraso/dificultad
 */
export async function getGoalRecommendations(
  goalId: number,
  token: string,
): Promise<RecommendationDiagnostic> {
  return apiRequest<RecommendationDiagnostic>(`/goals/${goalId}/recommendations`, {
    method: 'GET',
    token,
  });
}

/**
 * HU-43: Consultar recomendación personalizada para el usuario según su progreso general
 */
export async function getPersonalizedRecommendations(
  token: string,
): Promise<RecommendationDiagnostic> {
  return apiRequest<RecommendationDiagnostic>('/goals/personalized-recommendations', {
    method: 'GET',
    token,
  });
}

/**
 * HU-27, HU-28, HU-29, HU-30, HU-51: Consultar alternativas de replanificación
 */
export async function getReplanAlternatives(
  goalId: number,
  token: string,
): Promise<ReplanAlternativesResponse> {
  return apiRequest<ReplanAlternativesResponse>(`/goals/${goalId}/alternatives`, {
    method: 'GET',
    token,
  });
}

/**
 * HU-31, HU-52, HU-08: Aplicar propuesta de replanificación seleccionada
 */
export async function applyReplanAlternative(
  goalId: number,
  proposalType: 'balanced' | 'learning' | 'time',
  token: string,
  targetDate?: string,
): Promise<{ message: string; proposal_type: string; goal_id: number }> {
  return apiRequest<{ message: string; proposal_type: string; goal_id: number }>(
    `/goals/${goalId}/alternatives/apply`,
    {
      method: 'POST',
      token,
      body: JSON.stringify({
        proposal_type: proposalType,
        target_date: targetDate,
      }),
    },
  );
}

/**
 * HU-31: Rechazar propuestas de replanificación y conservar el plan original
 */
export async function rejectReplanAlternative(
  goalId: number,
  token: string,
): Promise<{ message: string; status: string; goal_id: number }> {
  return apiRequest<{ message: string; status: string; goal_id: number }>(
    `/goals/${goalId}/alternatives/reject`,
    {
      method: 'POST',
      token,
    },
  );
}

/**
 * HU-26: Recibir sugerencias y alternativas ante dificultad en una actividad
 */
export async function getActivitySuggestions(
  activityId: number,
  token: string,
): Promise<ActivitySuggestionResponse> {
  return apiRequest<ActivitySuggestionResponse>(`/activities/${activityId}/suggestions`, {
    method: 'GET',
    token,
  });
}
