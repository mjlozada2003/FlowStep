import { apiRequest } from '@/services/api/client';

export interface UserPreferences {
  user_id?: number;
  reminders_enabled?: boolean;
  reminder_minutes_before?: number;
  delay_alerts_enabled?: boolean;
  periodic_summary_enabled?: boolean;
  goals_sort_by?: 'priority' | 'due_date' | 'progress' | 'created_at' | string;
  timezone?: string;
  session_duration_minutes?: number;
}

export interface UpdatePreferencesDto {
  reminders_enabled?: boolean;
  reminder_minutes_before?: number;
  delay_alerts_enabled?: boolean;
  periodic_summary_enabled?: boolean;
  goals_sort_by?: 'priority' | 'due_date' | 'progress' | 'created_at';
  timezone?: string;
  session_duration_minutes?: number;
}

// HU-49: Consultar y configurar preferencias del usuario
export async function getUserPreferences(token: string): Promise<UserPreferences> {
  return apiRequest<UserPreferences>('/users/preferences', {
    method: 'GET',
    token,
  });
}

export async function updateUserPreferences(
  token: string,
  dto: UpdatePreferencesDto,
): Promise<UserPreferences> {
  return apiRequest<UserPreferences>('/users/preferences', {
    method: 'PATCH',
    token,
    body: JSON.stringify(dto),
  });
}