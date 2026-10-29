import { apiRequest } from '@/services/api/client';

export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export interface AvailabilitySlot {
  availability_id?: number;
  day_of_week: DayOfWeek;
  start_time: string;
  end_time: string;
}

export async function saveBulkAvailability(
  token: string,
  availabilities: AvailabilitySlot[],
): Promise<AvailabilitySlot[]> {
  return apiRequest<AvailabilitySlot[]>('/availability/bulk', {
    method: 'POST',
    token,
    body: JSON.stringify({ availabilities }),
  });
}

export async function getAvailability(
  token: string,
): Promise<AvailabilitySlot[]> {
  return apiRequest<AvailabilitySlot[]>('/availability', {
    method: 'GET',
    token,
  });
}
