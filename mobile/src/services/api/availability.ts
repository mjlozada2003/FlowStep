import { apiRequest, ApiResponseError } from '@/services/api/client';

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
  user_id?: number;
  day_of_week: DayOfWeek;
  start_time: string;
  end_time: string;
}

export interface AvailabilityPreferences {
  user_id: number;
  session_duration_minutes: 30 | 60 | 120;
}

const DAYS_OF_WEEK: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

function isAvailabilitySlot(value: unknown): value is AvailabilitySlot {
  return (
    typeof value === 'object' &&
    value !== null &&
    'day_of_week' in value &&
    DAYS_OF_WEEK.includes(value.day_of_week as DayOfWeek) &&
    'start_time' in value &&
    typeof value.start_time === 'string' &&
    'end_time' in value &&
    typeof value.end_time === 'string'
  );
}

function validateAvailabilitySlots(value: unknown): AvailabilitySlot[] {
  if (!Array.isArray(value) || !value.every(isAvailabilitySlot)) {
    throw new ApiResponseError(
      'La respuesta de disponibilidad no tiene el formato esperado.',
    );
  }
  return value;
}

function validateAvailabilityPreferences(value: unknown): AvailabilityPreferences {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('user_id' in value) ||
    typeof value.user_id !== 'number' ||
    !('session_duration_minutes' in value) ||
    ![30, 60, 120].includes(value.session_duration_minutes as number)
  ) {
    throw new ApiResponseError(
      'La respuesta de preferencias de disponibilidad no tiene el formato esperado.',
    );
  }

  return {
    user_id: value.user_id,
    session_duration_minutes: value.session_duration_minutes as 30 | 60 | 120,
  };
}

function timeToMinutes(time: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/.exec(time);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function getWeeklyAvailabilityMinutes(
  availabilities: AvailabilitySlot[],
): number {
  const intervals = new Map<DayOfWeek, { start: number; end: number }[]>();
  for (const slot of availabilities) {
    const start = timeToMinutes(slot.start_time);
    const end = timeToMinutes(slot.end_time);
    if (start === null || end === null || end <= start) continue;
    const dayIntervals = intervals.get(slot.day_of_week) ?? [];
    dayIntervals.push({ start, end });
    intervals.set(slot.day_of_week, dayIntervals);
  }

  let total = 0;
  for (const dayIntervals of intervals.values()) {
    dayIntervals.sort((left, right) => left.start - right.start);
    let start = -1;
    let end = -1;
    for (const interval of dayIntervals) {
      if (start === -1) {
        start = interval.start;
        end = interval.end;
      } else if (interval.start <= end) {
        end = Math.max(end, interval.end);
      } else {
        total += end - start;
        start = interval.start;
        end = interval.end;
      }
    }
    if (start !== -1) total += end - start;
  }
  return total;
}

export async function createAvailability(
  token: string,
  availability: AvailabilitySlot,
): Promise<AvailabilitySlot> {
  const response = await apiRequest<unknown>('/availability', {
    method: 'POST',
    token,
    body: JSON.stringify({
      day_of_week: availability.day_of_week,
      start_time: availability.start_time,
      end_time: availability.end_time,
    }),
  });
  if (!isAvailabilitySlot(response)) {
    throw new ApiResponseError(
      'La respuesta al guardar la disponibilidad no tiene el formato esperado.',
    );
  }
  return response;
}

export async function saveBulkAvailability(
  token: string,
  availabilities: AvailabilitySlot[],
  sessionDurationMinutes?: AvailabilityPreferences['session_duration_minutes'],
): Promise<AvailabilitySlot[]> {
  const response = await apiRequest<unknown>('/availability/bulk', {
    method: 'POST',
    token,
    body: JSON.stringify({
      availabilities,
      ...(sessionDurationMinutes === undefined
        ? {}
        : { session_duration_minutes: sessionDurationMinutes }),
    }),
  });
  return validateAvailabilitySlots(response);
}

export async function getAvailabilityPreferences(
  token: string,
): Promise<AvailabilityPreferences> {
  const response = await apiRequest<unknown>('/availability/preferences', {
    method: 'GET',
    token,
  });
  return validateAvailabilityPreferences(response);
}

export async function getAvailability(
  token: string,
): Promise<AvailabilitySlot[]> {
  const response = await apiRequest<unknown>('/availability', {
    method: 'GET',
    token,
  });
  return validateAvailabilitySlots(response);
}

export async function deleteAvailability(
  availabilityId: number,
  token: string,
): Promise<void> {
  if (!Number.isSafeInteger(availabilityId) || availabilityId <= 0) {
    throw new ApiResponseError(
      'El identificador de disponibilidad debe ser un entero positivo.',
    );
  }

  await apiRequest<unknown>(`/availability/${availabilityId}`, {
    method: 'DELETE',
    token,
  });
}
