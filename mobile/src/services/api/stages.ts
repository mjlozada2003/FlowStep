import { apiRequest, ApiResponseError } from '@/services/api/client';

export interface StageActivity {
  activity_id: number;
  title: string;
  type: string;
  status: string;
  estimated_minutes: number | null;
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
