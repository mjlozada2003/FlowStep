import { apiRequest, ApiResponseError } from '@/services/api/client';

export interface StageActivity {
  activity_id: number;
  title: string;
  type: string;
  status: string;
  estimated_minutes: number | null;
  completed_at?: string | null;
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

function isCompletedActivity(value: unknown): value is StageActivity {
  return (
    isStageActivity(value) &&
    value.status === 'completed' &&
    'completed_at' in value &&
    (typeof value.completed_at === 'string' || value.completed_at === null)
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

  if (!isCompletedActivity(activity)) {
    throw new ApiResponseError(
      'La respuesta al completar la actividad no tiene el formato esperado.',
    );
  }

  return activity;
}
