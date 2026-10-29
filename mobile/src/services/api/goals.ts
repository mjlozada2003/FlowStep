import { apiRequest, ApiResponseError } from '@/services/api/client';

export interface CreateGoalRequest {
  title: string;
  user_description: string;
  due_date?: string;
}

export interface GoalActivity {
  activity_id: number;
  title: string;
  type?: string;
  status?: string;
  estimated_minutes?: number | null;
  sort_order?: number;
}

export interface GoalStage {
  stage_id: number;
  name: string;
  description?: string | null;
  sort_order?: number;
  activities?: GoalActivity[] | null;
}

export interface CreatedGoal {
  goal_id: number;
  title: string;
  user_description: string;
  start_date?: string;
  due_date?: string | null;
  stages?: GoalStage[] | null;
}

export interface GoalProgress {
  goal_id: number;
  user_id: number;
  goal_title: string;
  goal_status: string;
  total_activities: number;
  completed_activities: number;
  total_estimated_minutes: number;
  completed_estimated_minutes: number;
  progress_percentage: number;
}

function parseNumericValue(value: unknown): number | null {
  if (
    typeof value !== 'number' &&
    (typeof value !== 'string' || value.trim() === '')
  ) {
    return null;
  }

  const parsedValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function parseGoalProgress(value: unknown): GoalProgress | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  if (
    !('goal_id' in value) ||
    !('user_id' in value) ||
    !('goal_title' in value) ||
    typeof value.goal_title !== 'string' ||
    !('goal_status' in value) ||
    typeof value.goal_status !== 'string' ||
    !('total_activities' in value) ||
    !('completed_activities' in value) ||
    !('total_estimated_minutes' in value) ||
    !('completed_estimated_minutes' in value) ||
    !('progress_percentage' in value)
  ) {
    return null;
  }

  const goalId = parseNumericValue(value.goal_id);
  const userId = parseNumericValue(value.user_id);
  const totalActivities = parseNumericValue(value.total_activities);
  const completedActivities = parseNumericValue(value.completed_activities);
  const totalEstimatedMinutes = parseNumericValue(value.total_estimated_minutes);
  const completedEstimatedMinutes = parseNumericValue(
    value.completed_estimated_minutes,
  );
  const progressPercentage = parseNumericValue(value.progress_percentage);
  const integerMetrics = [
    goalId,
    userId,
    totalActivities,
    completedActivities,
    totalEstimatedMinutes,
    completedEstimatedMinutes,
  ];

  if (
    integerMetrics.some(
      (metric) => metric === null || !Number.isSafeInteger(metric),
    ) ||
    goalId === null ||
    goalId <= 0 ||
    userId === null ||
    userId <= 0 ||
    totalActivities === null ||
    totalActivities < 0 ||
    completedActivities === null ||
    completedActivities < 0 ||
    totalEstimatedMinutes === null ||
    totalEstimatedMinutes < 0 ||
    completedEstimatedMinutes === null ||
    completedEstimatedMinutes < 0 ||
    progressPercentage === null ||
    progressPercentage < 0 ||
    progressPercentage > 100
  ) {
    return null;
  }

  return {
    goal_id: goalId,
    user_id: userId,
    goal_title: value.goal_title,
    goal_status: value.goal_status,
    total_activities: totalActivities,
    completed_activities: completedActivities,
    total_estimated_minutes: totalEstimatedMinutes,
    completed_estimated_minutes: completedEstimatedMinutes,
    progress_percentage: progressPercentage,
  };
}

function isGoalStage(value: unknown): value is GoalStage {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('stage_id' in value) ||
    typeof value.stage_id !== 'number' ||
    !('name' in value) ||
    typeof value.name !== 'string'
  ) {
    return false;
  }

  if (!('activities' in value) || value.activities == null) {
    return true;
  }

  return (
    Array.isArray(value.activities) &&
    value.activities.every(
      (activity) =>
        typeof activity === 'object' &&
        activity !== null &&
        'activity_id' in activity &&
        typeof activity.activity_id === 'number' &&
        'title' in activity &&
        typeof activity.title === 'string',
    )
  );
}

export async function createGoal(
  token: string,
  goal: CreateGoalRequest,
): Promise<CreatedGoal> {
  const response = await apiRequest<CreatedGoal | null>('/goals', {
    method: 'POST',
    token,
    body: JSON.stringify(goal),
  });

  if (
    !response ||
    typeof response.goal_id !== 'number' ||
    typeof response.title !== 'string' ||
    (response.stages != null &&
      (!Array.isArray(response.stages) || !response.stages.every(isGoalStage)))
  ) {
    throw new ApiResponseError('La respuesta de creación del objetivo no tiene el formato esperado.');
  }

  return response;
}

export async function getGoalProgress(
  goalId: number,
  token: string,
  signal?: AbortSignal,
): Promise<GoalProgress> {
  if (!Number.isSafeInteger(goalId) || goalId <= 0) {
    throw new ApiResponseError('El identificador del objetivo debe ser un entero positivo.');
  }

  const response = await apiRequest<unknown>(
    `/goals/${goalId}/progress`,
    {
      method: 'GET',
      token,
      signal,
    },
  );
  const progress = parseGoalProgress(response);

  if (!progress) {
    throw new ApiResponseError(
      'La respuesta del progreso del objetivo no tiene el formato esperado.',
    );
  }

  return progress;
}
