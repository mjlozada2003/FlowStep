export interface HistoryItem {
  id: number;
  stage_title: string;
  activity_title: string;
  date_str: string;
  duration_str?: string;
  status: 'completed' | 'pending' | 'missed';
  status_label: string;
}

export const mockItems: HistoryItem[] = [
  {
    id: 1,
    stage_title: 'Etapa 1 · Aprendizaje',
    activity_title: 'Introducción a React',
    date_str: '16 jun · 18:45',
    duration_str: '45 min',
    status: 'completed',
    status_label: 'Completada',
  },
  {
    id: 2,
    stage_title: 'Etapa 1 · Aprendizaje',
    activity_title: 'Componentes de React',
    date_str: '14 jun · 19:10',
    duration_str: '1 h 10 min',
    status: 'completed',
    status_label: 'Completada',
  },
  {
    id: 3,
    stage_title: 'Etapa 2 · Desarrollo',
    activity_title: 'Maquetar la vista principal',
    date_str: '12 jun · 16:30',
    duration_str: '65 min',
    status: 'completed',
    status_label: 'Completada',
  },
  {
    id: 4,
    stage_title: 'Etapa 1 · Aprendizaje',
    activity_title: 'Consumo de APIs',
    date_str: '10 jun · 18:00',
    status: 'missed',
    status_label: 'No completada',
  },
  {
    id: 5,
    stage_title: 'Etapa 1 · Aprendizaje',
    activity_title: 'Hooks',
    date_str: 'Programada · 21 jun',
    status: 'pending',
    status_label: 'Pendiente',
  },
];

export function formatDuration(minutes?: number | null): string | undefined {
  if (!minutes || minutes <= 0) return undefined;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  if (hours > 0 && remainingMins > 0) return `${hours} h ${remainingMins} min`;
  if (hours > 0) return `${hours} h`;
  return `${remainingMins} min`;
}

export function formatDateStr(dateStr?: string | null, recordedAt?: string | null): string {
  const dateToUse = recordedAt
    ? new Date(recordedAt)
    : dateStr
    ? new Date(`${dateStr}T12:00:00`)
    : new Date();

  if (isNaN(dateToUse.getTime())) return dateStr || 'Fecha reciente';
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const day = dateToUse.getDate();
  const month = months[dateToUse.getMonth()];
  const hours = String(dateToUse.getHours()).padStart(2, '0');
  const mins = String(dateToUse.getMinutes()).padStart(2, '0');
  return `${day} ${month} · ${hours}:${mins}`;
}

export function mapBackendEventToHistoryItem(event: any, index: number): HistoryItem {
  const details = event.details || {};
  let status: 'completed' | 'pending' | 'missed' = 'pending';
  let status_label = 'Registrada';
  let duration_str: string | undefined = undefined;

  if (event.event_type === 'work_session') {
    status = 'completed';
    status_label = 'Sesión realizada';
    duration_str = formatDuration(details.minutes_spent);
  } else if (event.event_type === 'status_change') {
    if (details.new_status === 'completed') {
      status = 'completed';
      status_label = 'Completada';
    } else if (details.new_status === 'in_progress') {
      status = 'pending';
      status_label = 'En progreso';
    } else {
      status = 'pending';
      status_label = 'Pendiente';
    }
  } else if (event.event_type === 'schedule_miss') {
    status = 'missed';
    status_label = details.reason_name ? `No completada: ${details.reason_name}` : 'No completada';
  } else if (event.event_type === 'schedule_version') {
    status = 'pending';
    status_label = 'Reprogramada';
  }

  return {
    id: event.event_id ?? index + 1,
    stage_title: event.stage_id ? `Etapa ${event.stage_id}` : 'General',
    activity_title: event.activity_title || 'Actividad',
    date_str: formatDateStr(event.event_date, event.recorded_at),
    duration_str,
    status,
    status_label,
  };
}