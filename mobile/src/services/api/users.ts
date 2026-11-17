import { apiRequest } from '@/services/api/client';

export interface UserPreferences {
  user_id: number;
  reminders_enabled: boolean;
  delay_alerts_enabled: boolean;
  weekly_digest_enabled: boolean;
  reminder_lead_minutes: number;
  max_active_goals: number;
  auto_reschedule_missed: boolean;
  preferred_work_days?: string[];
  preferred_start_time?: string;
  preferred_end_time?: string;
}

export interface UpdatePreferencesDto {
  reminders_enabled?: boolean;
  delay_alerts_enabled?: boolean;
  weekly_digest_enabled?: boolean;
  reminder_lead_minutes?: number;
  max_active_goals?: number;
  auto_reschedule_missed?: boolean;
  preferred_work_days?: string[];
  preferred_start_time?: string;
  preferred_end_time?: string;
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
