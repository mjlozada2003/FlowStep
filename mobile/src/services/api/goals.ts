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
