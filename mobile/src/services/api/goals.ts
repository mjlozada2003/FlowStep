import { apiRequest, ApiHttpError, ApiResponseError } from '@/services/api/client';

export interface CreateGoalRequest {
  title: string;
  user_description: string;
  due_date?: string;
  priority?: 'high' | 'medium' | 'low';
}

export interface ActivityScheduleInfo {
  schedule_id: number;
  scheduled_date: string;
  start_time?: string | null;
  end_time?: string | null;
}

export interface GoalActivity {
  activity_id: number;
  title: string;
  type?: string;
  status?: string;
  estimated_minutes?: number | null;
  sort_order?: number;
  schedules?: ActivityScheduleInfo[] | null;
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
  priority?: 'high' | 'medium' | 'low';
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

  const record = value as Record<string, unknown>;

  const goalId = parseNumericValue(record.goal_id ?? record.goalId);
  const userId = parseNumericValue(record.user_id ?? record.userId);
  const goalTitle =
    typeof record.goal_title === 'string'
      ? record.goal_title
      : typeof record.title === 'string'
        ? record.title
        : 'Objetivo';
  const goalStatus =
    typeof record.goal_status === 'string'
      ? record.goal_status
      : typeof record.status === 'string'
        ? record.status
        : 'active';

  const totalActivities = parseNumericValue(record.total_activities ?? record.totalActivities) ?? 0;
  const completedActivities = parseNumericValue(record.completed_activities ?? record.completedActivities) ?? 0;
  const totalEstimatedMinutes = parseNumericValue(record.total_estimated_minutes ?? record.totalEstimatedMinutes) ?? 0;
  const completedEstimatedMinutes = parseNumericValue(record.completed_estimated_minutes ?? record.completedEstimatedMinutes) ?? 0;
  const progressPercentage = parseNumericValue(record.progress_percentage ?? record.progressPercentage) ?? 0;

  if (goalId === null || goalId <= 0) {
    return null;
  }

  return {
    goal_id: goalId,
    user_id: userId ?? 1,
    goal_title: goalTitle,
    goal_status: goalStatus,
    total_activities: Math.max(0, Math.round(totalActivities)),
    completed_activities: Math.max(0, Math.round(completedActivities)),
    total_estimated_minutes: Math.max(0, Math.round(totalEstimatedMinutes)),
    completed_estimated_minutes: Math.max(0, Math.round(completedEstimatedMinutes)),
    progress_percentage: Math.min(100, Math.max(0, progressPercentage)),
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
): Promise<GoalProgress | null> {
  if (!Number.isSafeInteger(goalId) || goalId <= 0) {
    return null;
  }

  try {
    const response = await apiRequest<unknown>(
      `/goals/${goalId}/progress`,
      {
        method: 'GET',
        token,
        signal,
      },
    );
    if (!response) {
      return null;
    }
    return parseGoalProgress(response);
  } catch (error) {
    if (error instanceof ApiHttpError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function getUserGoals(token: string): Promise<CreatedGoal[]> {
  const response = await apiRequest<CreatedGoal[]>('/goals', {
    method: 'GET',
    token,
  });

  if (!Array.isArray(response)) {
    throw new ApiResponseError('La lista de objetivos no tiene el formato esperado.');
  }

  return response;
}

export async function getGoalById(
  goalId: number,
  token: string,
): Promise<CreatedGoal> {
  const response = await apiRequest<CreatedGoal>(`/goals/${goalId}`, {
    method: 'GET',
    token,
  });

  if (!response || typeof response.goal_id !== 'number') {
    throw new ApiResponseError('El detalle del objetivo no tiene el formato esperado.');
  }

  return response;
}

export async function updateGoalPriority(
  goalId: number,
  token: string,
  priority: 'high' | 'medium' | 'low',
): Promise<CreatedGoal> {
  return apiRequest<CreatedGoal>(`/goals/${goalId}/priority`, {
    method: 'PATCH',
    token,
    body: JSON.stringify({ priority }),
  });
}
