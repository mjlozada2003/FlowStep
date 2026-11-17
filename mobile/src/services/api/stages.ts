import { apiRequest, ApiResponseError } from '@/services/api/client';

export interface ActivityScheduleVersion {
  schedule_id: number;
  activity_id: number;
  version_number: number;
  scheduled_date: string;
  start_time?: string | null;
  end_time?: string | null;
  reason: string;
  created_at: string;
}

export interface StageActivity {
  activity_id: number;
  stage_id?: number;
  title: string;
  description?: string | null;
  type: string;
  priority?: string | null;
  status: string;
  estimated_minutes: number | null;
  completed_at?: string | null;
  sort_order?: number;
  date?: string;
  schedules?: ActivityScheduleVersion[] | null;
}

export interface CreateActivityRequest {
  title: string;
  description?: string;
  type: 'learning' | 'practice' | 'exercise' | 'assessment' | 'reinforcement';
  priority?: 'high' | 'medium' | 'low';
  estimated_minutes: number;
}

export interface UpdateActivityRequest {
  title?: string;
  description?: string;
  type?: 'learning' | 'practice' | 'exercise' | 'assessment' | 'reinforcement';
  priority?: 'high' | 'medium' | 'low';
  estimated_minutes?: number;
}

export interface RescheduleActivityRequest {
  scheduled_date: string;
  start_time?: string;
  end_time?: string;
}

function isActivityScheduleVersion(
  value: unknown,
): value is ActivityScheduleVersion {
  return (
    typeof value === 'object' &&
    value !== null &&
    'schedule_id' in value &&
    typeof value.schedule_id === 'number' &&
    'activity_id' in value &&
    typeof value.activity_id === 'number' &&
    'version_number' in value &&
    typeof value.version_number === 'number' &&
    'scheduled_date' in value &&
    typeof value.scheduled_date === 'string' &&
    'reason' in value &&
    typeof value.reason === 'string' &&
    'created_at' in value &&
    typeof value.created_at === 'string'
  );
}

function isStageActivity(value: unknown): value is StageActivity {
  return (
    typeof value === 'object' &&
    value !== null &&
    'activity_id' in value &&
    typeof value.activity_id === 'number' &&
    'title' in value &&
    typeof value.title === 'string' &&
    'type' in value &&
    typeof value.type === 'string' &&
    'status' in value &&
    typeof value.status === 'string' &&
    'estimated_minutes' in value &&
    (typeof value.estimated_minutes === 'number' ||
      value.estimated_minutes === null)
  );
}

export async function getStageActivities(
  stageId: number,
  token: string,
  signal?: AbortSignal,
): Promise<StageActivity[]> {
  const activities = await apiRequest<unknown>(
    `/stages/${stageId}/activities`,
    {
      method: 'GET',
      token,
      signal,
    },
  );

  if (!Array.isArray(activities) || !activities.every(isStageActivity)) {
    throw new ApiResponseError(
      'La respuesta de actividades de la etapa no tiene el formato esperado.',
    );
  }

  return activities;
}

export async function createStageActivity(
  stageId: number,
  token: string,
  activity: CreateActivityRequest,
): Promise<StageActivity> {
  const response = await apiRequest<unknown>(
    `/stages/${stageId}/activities`,
    {
      method: 'POST',
      token,
      body: JSON.stringify(activity),
    },
  );

  if (!isStageActivity(response)) {
    throw new ApiResponseError(
      'La respuesta al agregar la actividad no tiene el formato esperado.',
    );
  }

  return response;
}

export async function updateActivity(
  activityId: number,
  token: string,
  changes: UpdateActivityRequest,
): Promise<StageActivity> {
  const response = await apiRequest<unknown>(
    `/activities/${activityId}`,
    {
      method: 'PATCH',
      token,
      body: JSON.stringify(changes),
    },
  );

  if (!isStageActivity(response)) {
    throw new ApiResponseError(
      'La respuesta al actualizar la actividad no tiene el formato esperado.',
    );
  }

  return response;
}

export async function completeActivity(
  activityId: number,
  token: string,
): Promise<StageActivity> {
  if (!Number.isInteger(activityId) || activityId <= 0) {
    throw new ApiResponseError('El identificador de actividad debe ser un entero positivo.');
  }

  const activity = await apiRequest<unknown>(
    `/activities/${activityId}/complete`,
    {
      method: 'PATCH',
      token,
    },
  );

  if (!isStageActivity(activity)) {
    throw new ApiResponseError(
      'La respuesta al completar la actividad no tiene el formato esperado.',
    );
  }

  return activity;
}

export async function markActivityPending(
  activityId: number,
  token: string,
): Promise<StageActivity> {
  if (!Number.isInteger(activityId) || activityId <= 0) {
    throw new ApiResponseError('El identificador de actividad debe ser un entero positivo.');
  }

  const activity = await apiRequest<unknown>(
    `/activities/${activityId}/pending`,
    {
      method: 'PATCH',
      token,
    },
  );

  if (!isStageActivity(activity)) {
    throw new ApiResponseError(
      'La respuesta al marcar la actividad como pendiente no tiene el formato esperado.',
    );
  }

  return activity;
}

export async function rescheduleActivity(
  activityId: number,
  token: string,
  data: RescheduleActivityRequest,
): Promise<ActivityScheduleVersion> {
  const schedule = await apiRequest<unknown>(
    `/activities/${activityId}/reschedule`,
    {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    },
  );
  if (!isActivityScheduleVersion(schedule)) {
    throw new ApiResponseError(
      'La respuesta al reprogramar la actividad no tiene el formato esperado.',
    );
  }
  return schedule;
}

export async function getActivitySchedules(
  activityId: number,
  token: string,
): Promise<ActivityScheduleVersion[]> {
  const schedules = await apiRequest<unknown>(
    `/activities/${activityId}/schedules`,
    {
      method: 'GET',
      token,
    },
  );
  if (!Array.isArray(schedules) || !schedules.every(isActivityScheduleVersion)) {
    throw new ApiResponseError(
      'El historial de horarios no tiene el formato esperado.',
    );
  }
  return schedules;
}

// HU-12: Eliminar actividades que no sean relevantes para el objetivo
export async function deleteActivity(
  activityId: number,
  token: string,
  reason?: string,
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/activities/${activityId}`, {
    method: 'DELETE',
    token,
    body: reason ? JSON.stringify({ reason }) : undefined,
  });
}
