import { apiRequest } from '@/services/api/client';

export interface CalendarDaySummary {
  scheduled_date: string;
  total_activities: number;
  completed_activities: number;
  pending_activities: number;
  day_status: 'completed' | 'pending' | 'mixed' | 'overdue' | 'none';
}

export interface CalendarActivityItem {
  activity_id: number;
  goal_id: number;
  goal_title: string;
  stage_title?: string;
  title: string;
  description?: string | null;
  scheduled_date: string;
  start_time?: string | null;
  end_time?: string | null;
  estimated_minutes?: number | null;
  status: 'pending' | 'completed' | 'in_progress' | 'cancelled' | 'overdue';
  priority?: string | null;
  is_overdue?: boolean;
}

export interface CalendarDataResponse {
  days: CalendarDaySummary[];
  activities: CalendarActivityItem[];
}

export interface CalendarQueryParams {
  month?: number;
  year?: number;
  date?: string;
  startDate?: string;
  endDate?: string;
}

// HU-50: Consultar planificación en calendario
export async function getCalendarData(
  token: string,
  params?: CalendarQueryParams,
): Promise<CalendarDataResponse> {
  const query = new URLSearchParams();
  if (params?.month) query.append('month', String(params.month));
  if (params?.year) query.append('year', String(params.year));
  if (params?.date) query.append('date', params.date);
  if (params?.startDate) query.append('startDate', params.startDate);
  if (params?.endDate) query.append('endDate', params.endDate);

  const qs = query.toString() ? `?${query.toString()}` : '';
  return apiRequest<CalendarDataResponse>(`/activities/calendar${qs}`, {
    method: 'GET',
    token,
  });
}
