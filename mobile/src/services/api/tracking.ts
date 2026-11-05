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

    return await apiRequest(endpoint, {
      method: 'GET',
      token,
    });
  },

  // HU-21, HU-22, HU-24: Obtener datos de progreso y ritmo
  getGoalProgress: async (token?: string) => {
    return await apiRequest('/goals/progress', {
      method: 'GET',
      token,
    });
  },
};