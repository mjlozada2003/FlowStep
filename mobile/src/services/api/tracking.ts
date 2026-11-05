import { apiRequest } from './client';

export interface WorkSessionPayload {
  minutes_spent: number;
  session_date?: string;
  difficulty_level?: number;
  difficulty_notes?: string;
}

export interface ActivityMissPayload {
  reason_id: number;
  details?: string;
  schedule_id?: number;
}

export interface GoalChartData {
  goal_id: number;
  goal_title: string;
  summary: {
    progress_percentage: string;
    total_activities: number;
    completed_activities: number;
    total_estimated_minutes: number;
    completed_estimated_minutes: number;
    total_minutes_spent: number;
  };
  weekly_progress: Array<{
    week_start: string;
    minutes_spent: number;
    completed_estimated_minutes: number;
    planned_estimated_minutes: number;
  }>;
  status_distribution: {
    completed: number;
    in_progress: number;
    pending: number;
    skipped: number;
  };
  stage_progress: Array<{
    stage_id: number;
    stage_name: string;
    sort_order: number;
    total_activities: number;
    completed_activities: number;
    progress_percentage: string;
  }>;
}

export interface GoalPaceData {
  goal_id: number;
  goal_title: string;
  progress_percentage: string;
  expected_progress_percentage: string;
  pace_status: 'on_track' | 'behind' | 'no_schedule';
  is_delayed: boolean;
  delay_minutes: number;
  delay_percentage: number;
  alert_message?: string;
}

export const trackingApi = {
  // HU-17 & HU-18: Registrar sesión de tiempo y dificultades
  logWorkSession: async (activityId: number, data: WorkSessionPayload, token?: string) => {
    return await apiRequest(`/activities/${activityId}/sessions`, {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    });
  },

  // Obtener sesiones registradas de la actividad
  getActivitySessions: async (activityId: number, token?: string) => {
    return await apiRequest(`/activities/${activityId}/sessions`, {
      method: 'GET',
      token,
    });
  },

  // Obtener catálogo de motivos de no completado
  getMissReasons: async (token?: string) => {
    return await apiRequest('/activities/miss-reasons', {
      method: 'GET',
      token,
    });
  },

  // HU-19: Registrar motivo de no completado
  recordActivityMiss: async (activityId: number, data: ActivityMissPayload, token?: string) => {
    return await apiRequest(`/activities/${activityId}/miss`, {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    });
  },

  // HU-20: Obtener historial de actividades
  getActivityHistory: async (
    params?: {
      goal_id?: number;
      activity_id?: number;
      event_type?: string;
      limit?: number;
      offset?: number;
    },
    token?: string
  ) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query.append(key, String(value));
        }
      });
    }
    const queryString = query.toString();
    const endpoint = queryString ? `/activities/history?${queryString}` : '/activities/history';

    return await apiRequest<any[]>(endpoint, {
      method: 'GET',
      token,
    });
  },

  // HU-21: Obtener métricas y series para gráficas del objetivo
  getGoalCharts: async (goalId: number, token?: string): Promise<GoalChartData> => {
    return await apiRequest<GoalChartData>(`/goals/${goalId}/charts`, {
      method: 'GET',
      token,
    });
  },

  // HU-22, HU-24: Obtener datos de ritmo y alertas de retraso del objetivo
  getGoalPace: async (goalId: number, token?: string): Promise<GoalPaceData> => {
    return await apiRequest<GoalPaceData>(`/goals/${goalId}/pace`, {
      method: 'GET',
      token,
    });
  },

  // HU-21, HU-22, HU-24: Obtener datos de progreso de todos los objetivos
  getGoalProgress: async (token?: string) => {
    return await apiRequest('/goals/progress', {
      method: 'GET',
      token,
    });
  },
};
