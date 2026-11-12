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
  description?: string | null;
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
    throw new ApiResponseError('El progreso del objetivo no tiene el formato esperado.');
  }

  const record = value as Record<string, unknown>;

  const goalId = parseNumericValue(record.goal_id ?? record.goalId);
  const userId = parseNumericValue(record.user_id ?? record.userId);
  const goalTitle =
    typeof record.goal_title === 'string'
      ? record.goal_title
      : typeof record.title === 'string'
        ? record.title
        : null;
  const goalStatus =
    typeof record.goal_status === 'string'
      ? record.goal_status
      : typeof record.status === 'string'
        ? record.status
        : null;

  const totalActivities = parseNumericValue(record.total_activities ?? record.totalActivities);
  const completedActivities = parseNumericValue(record.completed_activities ?? record.completedActivities);
  const totalEstimatedMinutes = parseNumericValue(record.total_estimated_minutes ?? record.totalEstimatedMinutes);
  const completedEstimatedMinutes = parseNumericValue(record.completed_estimated_minutes ?? record.completedEstimatedMinutes);
  const progressPercentage = parseNumericValue(record.progress_percentage ?? record.progressPercentage);

  if (
    goalId === null ||
    goalId <= 0 ||
    userId === null ||
    userId <= 0 ||
    goalTitle === null ||
    goalStatus === null ||
    totalActivities === null ||
    completedActivities === null ||
    totalEstimatedMinutes === null ||
    completedEstimatedMinutes === null ||
    progressPercentage === null ||
    totalActivities < 0 ||
    completedActivities < 0 ||
    totalEstimatedMinutes < 0 ||
    completedEstimatedMinutes < 0 ||
    progressPercentage < 0 ||
    progressPercentage > 100
  ) {
    throw new ApiResponseError('El progreso del objetivo no tiene el formato esperado.');
  }

  return {
    goal_id: goalId,
    user_id: userId,
    goal_title: goalTitle,
    goal_status: goalStatus,
    total_activities: Math.round(totalActivities),
    completed_activities: Math.round(completedActivities),
    total_estimated_minutes: Math.round(totalEstimatedMinutes),
    completed_estimated_minutes: Math.round(completedEstimatedMinutes),
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
  const response = await apiRequest<unknown>('/goals', {
    method: 'GET',
    token,
  });

  if (
    !Array.isArray(response) ||
    !response.every(
      (goal) =>
        typeof goal === 'object' &&
        goal !== null &&
        'goal_id' in goal &&
        typeof goal.goal_id === 'number' &&
        'title' in goal &&
        typeof goal.title === 'string',
    )
  ) {
    throw new ApiResponseError('La lista de objetivos no tiene el formato esperado.');
  }

  return response as CreatedGoal[];
}

export async function getGoalById(
  goalId: number,
  token: string,
): Promise<CreatedGoal> {
  const response = await apiRequest<unknown>(`/goals/${goalId}`, {
    method: 'GET',
    token,
  });

  if (
    typeof response !== 'object' ||
    response === null ||
    !('goal_id' in response) ||
    typeof response.goal_id !== 'number' ||
    !('title' in response) ||
    typeof response.title !== 'string' ||
    ('stages' in response &&
      response.stages != null &&
      (!Array.isArray(response.stages) || !response.stages.every(isGoalStage)))
  ) {
    throw new ApiResponseError('El detalle del objetivo no tiene el formato esperado.');
  }

  return response as CreatedGoal;
}

export async function updateGoalPriority(
  goalId: number,
  token: string,
  priority: 'high' | 'medium' | 'low',
): Promise<CreatedGoal> {
  const response = await apiRequest<unknown>(`/goals/${goalId}/priority`, {
    method: 'PATCH',
    token,
    body: JSON.stringify({ priority }),
  });
  if (
    typeof response !== 'object' ||
    response === null ||
    !('goal_id' in response) ||
    typeof response.goal_id !== 'number' ||
    !('title' in response) ||
    typeof response.title !== 'string' ||
    !('priority' in response) ||
    response.priority !== priority
  ) {
    throw new ApiResponseError('La respuesta al actualizar prioridad no tiene el formato esperado.');
  }
  return response as CreatedGoal;
}

// Sprint 4: Interfaces y funciones para gestión avanzada de objetivos

export interface GoalOverviewItem {
  goal_id: number;
  title: string;
  description?: string;
  priority: 'high' | 'medium' | 'low';
  status: 'in_progress' | 'paused' | 'completed' | 'cancelled' | 'archived';
  due_date?: string | null;
  start_date?: string;
  total_stages?: number;
  total_activities: number;
  completed_activities: number;
  progress_percentage: number;
}

export interface GoalHistoryItem {
  goal_id: number;
  title: string;
  description?: string;
  priority?: string;
  status: string;
  start_date?: string;
  end_date?: string;
  due_date?: string;
  status_changed_at?: string;
  total_activities: number;
  completed_activities: number;
  progress_percentage: number;
  total_minutes_invested?: number;
  last_reason?: string;
}

export interface DelayAlert {
  goal_id: number;
  goal_title: string;
  activity_id?: number;
  activity_title?: string;
  due_date?: string;
  days_delayed: number;
  alert_message: string;
}

export interface WeeklySummaryData {
  period: string;
  tagline: string;
  title: string;
  description: string;
  completionRate: number;
  completedCount: number;
  pendingCount: number;
  hoursSpent: string;
  daysActivity: Array<{ day: string; active: boolean; height: number }>;
  goalsBreakdown: Array<{ id: number; title: string; detail: string; progress: string }>;
  mascotTip: string;
}

export async function getGoalsOverview(
  token: string,
  sortBy?: 'priority' | 'due_date' | 'progress',
): Promise<GoalOverviewItem[]> {
  const query = sortBy ? `?sortBy=${encodeURIComponent(sortBy)}` : '';
  const response = await apiRequest<unknown>(`/goals/overview${query}`, {
    method: 'GET',
    token,
  });

  if (!Array.isArray(response)) {
    throw new ApiResponseError('La lista de resumen de objetivos no tiene el formato esperado.');
  }

  return response as GoalOverviewItem[];
}

export async function getGoalHistory(token: string): Promise<GoalHistoryItem[]> {
  const response = await apiRequest<unknown>('/goals/history', {
    method: 'GET',
    token,
  });

  if (!Array.isArray(response)) {
    throw new ApiResponseError('El historial de objetivos no tiene el formato esperado.');
  }

  return response as GoalHistoryItem[];
}

export async function getDelayAlerts(token: string): Promise<DelayAlert[]> {
  const response = await apiRequest<unknown>('/goals/delay-alerts', {
    method: 'GET',
    token,
  });

  if (!Array.isArray(response)) {
    return [];
  }

  return response as DelayAlert[];
}

export async function getWeeklySummary(
  token: string,
  startDate?: string,
  endDate?: string,
): Promise<WeeklySummaryData> {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  const query = params.toString() ? `?${params.toString()}` : '';

  const response = await apiRequest<WeeklySummaryData>(`/goals/weekly-summary${query}`, {
    method: 'GET',
    token,
  });

  return response;
}

export async function pauseGoal(
  goalId: number,
  token: string,
  reason?: string,
): Promise<{ message: string; goal: any }> {
  return apiRequest<{ message: string; goal: any }>(`/goals/${goalId}/pause`, {
    method: 'PATCH',
    token,
    body: JSON.stringify({ reason }),
  });
}

export async function resumeGoal(
  goalId: number,
  token: string,
  reason?: string,
): Promise<{ message: string; goal: any }> {
  return apiRequest<{ message: string; goal: any }>(`/goals/${goalId}/resume`, {
    method: 'PATCH',
    token,
    body: JSON.stringify({ reason }),
  });
}

export async function archiveGoal(
  goalId: number,
  token: string,
  reason?: string,
): Promise<{ message: string; goal: any }> {
  return apiRequest<{ message: string; goal: any }>(`/goals/${goalId}/archive`, {
    method: 'PATCH',
    token,
    body: JSON.stringify({ reason }),
  });
}

export async function updateGoalDueDate(
  goalId: number,
  token: string,
  dueDate: string,
  reason?: string,
): Promise<{ message: string; goal: any }> {
  return apiRequest<{ message: string; goal: any }>(`/goals/${goalId}/due-date`, {
    method: 'PATCH',
    token,
    body: JSON.stringify({ due_date: dueDate, reason }),
  });
}
