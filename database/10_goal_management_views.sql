-- FLOWSTEP - Sprint 3 (gestion de objetivos, avisos y cuenta). Aplicar despues de 09.
-- Datos derivados: se calculan con vistas y funciones, no se almacenan.
-- CURRENT_DATE / CURRENT_TIMESTAMP usan la zona de la sesion (America/La_Paz en
-- docker-compose). Las vistas de avisos usan ademas la zona de cada usuario.
BEGIN;

-- ----------------------------------------------------------------------------
-- HU-49: preferencias efectivas. Usuarios sin fila reciben los valores por
-- defecto, igual que en la tabla. Incluye la duracion de sesion del Sprint 2.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_user_preferences AS
SELECT u.user_id,
       (p.user_id IS NOT NULL) AS has_saved_preferences,
       COALESCE(p.reminders_enabled, TRUE) AS reminders_enabled,
       COALESCE(p.reminder_minutes_before, 30) AS reminder_minutes_before,
       COALESCE(p.delay_alerts_enabled, TRUE) AS delay_alerts_enabled,
       COALESCE(p.periodic_summary_enabled, TRUE) AS periodic_summary_enabled,
       COALESCE(p.summary_frequency, 'weekly') AS summary_frequency,
       COALESCE(p.summary_day_of_week, 'sunday') AS summary_day_of_week,
       COALESCE(p.summary_time, TIME '18:00') AS summary_time,
       COALESCE(p.goals_sort_by, 'priority') AS goals_sort_by,
       COALESCE(p.timezone, 'America/La_Paz') AS timezone,
       COALESCE(ap.session_duration_minutes, 60) AS session_duration_minutes,
       p.updated_at
FROM "APP_USER" u
LEFT JOIN "USER_PREFERENCE" p ON p.user_id = u.user_id
LEFT JOIN "USER_AVAILABILITY_PREFERENCE" ap ON ap.user_id = u.user_id
WHERE u.deleted_at IS NULL;

-- ----------------------------------------------------------------------------
-- HU-32, HU-33: periodos de pausa. Cada paso a 'paused' abre un periodo que
-- termina en el siguiente cambio de estado. resumed_at NULL = sigue en pausa.
-- El backend puede usar paused_days para desplazar la agenda al reanudar.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_goal_pause_periods AS
WITH ordered AS (
    SELECT h.goal_id, h.new_status, h.changed_at,
           LEAD(h.changed_at) OVER (PARTITION BY h.goal_id
                                    ORDER BY h.changed_at, h.goal_status_history_id) AS next_change_at
    FROM "GOAL_STATUS_HISTORY" h
)
SELECT o.goal_id, g.user_id,
       o.changed_at AS paused_at,
       o.next_change_at AS resumed_at,
       (COALESCE(o.next_change_at, CURRENT_TIMESTAMP)::date - o.changed_at::date) AS paused_days
FROM ordered o
JOIN "GOAL" g ON g.goal_id = o.goal_id
WHERE o.new_status = 'paused' AND g.deleted_at IS NULL;

-- ----------------------------------------------------------------------------
-- HU-44, HU-45, HU-48: vision general de cada objetivo.
-- pace_status amplia el de v_goal_pace: 'paused' y 'closed' (completado o
-- archivado) no se evaluan como atrasados.
-- sort_position aplica la preferencia goals_sort_by (por defecto prioridad):
-- primero activos, luego pausados, completados y archivados.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_goal_overview AS
WITH sessions AS (
    SELECT s.goal_id, SUM(w.minutes_spent) AS minutes_spent,
           MAX(w.session_date) AS last_session_date
    FROM "WORK_SESSION" w
    JOIN "ACTIVITY" a ON a.activity_id = w.activity_id AND a.deleted_at IS NULL
    JOIN "STAGE" s ON s.stage_id = a.stage_id
    GROUP BY s.goal_id
), completions AS (
    SELECT s.goal_id, MAX(a.completed_at) AS last_completed_at
    FROM "ACTIVITY" a
    JOIN "STAGE" s ON s.stage_id = a.stage_id
    WHERE a.deleted_at IS NULL AND a.status = 'completed'
    GROUP BY s.goal_id
), agenda AS (
    SELECT sc.goal_id,
           COUNT(*) FILTER (WHERE sc.scheduled_date < CURRENT_DATE
                              AND sc.activity_status NOT IN ('completed', 'skipped')) AS overdue_activities,
           COUNT(*) FILTER (WHERE g.due_date IS NOT NULL AND sc.scheduled_date > g.due_date
                              AND sc.activity_status NOT IN ('completed', 'skipped')) AS activities_after_due_date
    FROM v_activity_current_schedule sc
    JOIN "GOAL" g ON g.goal_id = sc.goal_id
    GROUP BY sc.goal_id
), next_activity AS (
    SELECT DISTINCT ON (sc.goal_id)
           sc.goal_id, sc.activity_id, sc.activity_title, sc.scheduled_date, sc.start_time
    FROM v_activity_current_schedule sc
    WHERE sc.scheduled_date >= CURRENT_DATE
      AND sc.activity_status IN ('pending', 'in_progress')
    ORDER BY sc.goal_id, sc.scheduled_date, sc.start_time NULLS LAST, sc.activity_id
), pauses AS (
    SELECT goal_id, SUM(paused_days)::integer AS paused_days,
           MAX(paused_at) FILTER (WHERE resumed_at IS NULL) AS paused_since
    FROM v_goal_pause_periods
    GROUP BY goal_id
), base AS (
    SELECT g.goal_id, g.user_id, g.title, g.user_description, g.status, g.priority,
           CASE g.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END AS priority_rank,
           g.start_date, g.due_date,
           CASE WHEN g.due_date IS NOT NULL THEN g.due_date - CURRENT_DATE END AS days_remaining,
           (g.due_date IS NOT NULL AND g.due_date < CURRENT_DATE
               AND g.status IN ('active', 'paused')) AS deadline_passed,
           p.total_activities, p.completed_activities,
           (p.total_activities - p.completed_activities) AS remaining_activities,
           p.total_estimated_minutes, p.completed_estimated_minutes, p.progress_percentage,
           pc.expected_progress_percentage,
           CASE
               WHEN g.status = 'paused' THEN 'paused'
               WHEN g.status IN ('completed', 'archived') THEN 'closed'
               ELSE pc.pace_status
           END AS pace_status,
           COALESCE(se.minutes_spent, 0)::integer AS minutes_spent,
           COALESCE(ag.overdue_activities, 0)::integer AS overdue_activities,
           COALESCE(ag.activities_after_due_date, 0)::integer AS activities_after_due_date,
           na.activity_id AS next_activity_id, na.activity_title AS next_activity_title,
           na.scheduled_date AS next_scheduled_date, na.start_time AS next_start_time,
           GREATEST(se.last_session_date::timestamp, co.last_completed_at) AS last_activity_at,
           pa.paused_since, COALESCE(pa.paused_days, 0) AS total_paused_days,
           g.closed_at, g.created_at, g.updated_at,
           CASE g.status WHEN 'active' THEN 1 WHEN 'paused' THEN 2
                         WHEN 'completed' THEN 3 ELSE 4 END AS status_group,
           pr.goals_sort_by
    FROM "GOAL" g
    JOIN "APP_USER" u ON u.user_id = g.user_id AND u.deleted_at IS NULL
    JOIN v_goal_progress p ON p.goal_id = g.goal_id
    JOIN v_goal_pace pc ON pc.goal_id = g.goal_id
    JOIN v_user_preferences pr ON pr.user_id = g.user_id
    LEFT JOIN sessions se ON se.goal_id = g.goal_id
    LEFT JOIN completions co ON co.goal_id = g.goal_id
    LEFT JOIN agenda ag ON ag.goal_id = g.goal_id
    LEFT JOIN next_activity na ON na.goal_id = g.goal_id
    LEFT JOIN pauses pa ON pa.goal_id = g.goal_id
    WHERE g.deleted_at IS NULL
)
SELECT goal_id, user_id, title, user_description, status, priority, priority_rank,
       start_date, due_date, days_remaining, deadline_passed,
       total_activities, completed_activities, remaining_activities,
       total_estimated_minutes, completed_estimated_minutes, progress_percentage,
       expected_progress_percentage, pace_status, minutes_spent,
       overdue_activities, activities_after_due_date,
       next_activity_id, next_activity_title, next_scheduled_date, next_start_time,
       last_activity_at, paused_since, total_paused_days, closed_at, created_at, updated_at,
       ROW_NUMBER() OVER (
           PARTITION BY user_id
           ORDER BY status_group,
                    CASE WHEN goals_sort_by = 'priority' THEN priority_rank END,
                    CASE WHEN goals_sort_by = 'due_date' THEN due_date END NULLS LAST,
                    CASE WHEN goals_sort_by = 'progress' THEN progress_percentage END DESC NULLS LAST,
                    CASE WHEN goals_sort_by = 'created_at' THEN created_at END DESC,
                    priority_rank, due_date NULLS LAST, goal_id
       ) AS sort_position
FROM base;

-- ----------------------------------------------------------------------------
-- HU-44, HU-48: totales del usuario para el tablero.
-- overall_progress_percentage pondera por minutos estimados de los objetivos
-- abiertos (activos y pausados).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_user_goal_summary AS
SELECT pr.user_id,
       COUNT(o.goal_id) FILTER (WHERE o.status IN ('active', 'paused')) AS open_goals,
       COUNT(o.goal_id) FILTER (WHERE o.status = 'active') AS active_goals,
       COUNT(o.goal_id) FILTER (WHERE o.status = 'paused') AS paused_goals,
       COUNT(o.goal_id) FILTER (WHERE o.status = 'completed') AS completed_goals,
       COUNT(o.goal_id) FILTER (WHERE o.status = 'archived') AS archived_goals,
       COUNT(o.goal_id) FILTER (WHERE o.pace_status = 'behind'
                                   OR (o.status = 'active' AND o.overdue_activities > 0)) AS goals_behind,
       COALESCE(SUM(o.overdue_activities) FILTER (WHERE o.status = 'active'), 0)::integer AS overdue_activities,
       CASE WHEN SUM(o.total_estimated_minutes) FILTER (WHERE o.status IN ('active', 'paused')) > 0 THEN
           ROUND(100 * SUM(o.completed_estimated_minutes) FILTER (WHERE o.status IN ('active', 'paused'))::numeric
                 / SUM(o.total_estimated_minutes) FILTER (WHERE o.status IN ('active', 'paused')), 2)
       ELSE 0.00 END AS overall_progress_percentage,
       COALESCE(SUM(o.minutes_spent), 0)::integer AS total_minutes_spent
FROM v_user_preferences pr
LEFT JOIN v_goal_overview o ON o.user_id = pr.user_id
GROUP BY pr.user_id;

-- ----------------------------------------------------------------------------
-- HU-46, HU-47: objetivos anteriores (completados y archivados).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_goal_history AS
SELECT o.goal_id, o.user_id, o.title, o.status, o.priority,
       COALESCE(o.closed_at,
                (SELECT MAX(h.changed_at) FROM "GOAL_STATUS_HISTORY" h
                 WHERE h.goal_id = o.goal_id AND h.new_status = o.status),
                o.updated_at) AS closed_at,
       o.start_date, o.due_date,
       o.total_activities, o.completed_activities, o.progress_percentage,
       o.total_estimated_minutes, o.completed_estimated_minutes, o.minutes_spent,
       (SELECT h.previous_status FROM "GOAL_STATUS_HISTORY" h
        WHERE h.goal_id = o.goal_id AND h.new_status = o.status
        ORDER BY h.changed_at DESC, h.goal_status_history_id DESC LIMIT 1) AS status_before_closing
FROM v_goal_overview o
WHERE o.status IN ('completed', 'archived');

-- ----------------------------------------------------------------------------
-- HU-25: alerta de retraso de objetivos activos. Un objetivo pausado no se
-- considera atrasado. Se alerta si va detras del ritmo planificado, si tiene
-- actividades vencidas sin completar o si su fecha limite ya paso.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_goal_delay_alert AS
WITH worst AS (
    SELECT DISTINCT ON (sc.goal_id)
           sc.goal_id, sc.activity_id, sc.activity_title, sc.scheduled_date
    FROM v_activity_current_schedule sc
    WHERE sc.scheduled_date < CURRENT_DATE
      AND sc.activity_status NOT IN ('completed', 'skipped')
    ORDER BY sc.goal_id, sc.scheduled_date, sc.activity_id
)
SELECT o.user_id, o.goal_id, o.title AS goal_title, o.priority, o.priority_rank,
       o.progress_percentage, o.expected_progress_percentage,
       GREATEST(pc.expected_completed_minutes - pc.completed_estimated_minutes, 0)::integer AS delay_minutes,
       o.overdue_activities, o.deadline_passed, o.due_date,
       w.activity_id AS most_overdue_activity_id,
       w.activity_title AS most_overdue_activity_title,
       w.scheduled_date AS most_overdue_scheduled_date,
       COALESCE(CURRENT_DATE - w.scheduled_date, 0) AS max_days_late,
       CASE
           WHEN o.deadline_passed OR COALESCE(CURRENT_DATE - w.scheduled_date, 0) > 3 THEN 'critical'
           ELSE 'warning'
       END AS alert_level,
       CASE
           WHEN o.deadline_passed THEN
               format('La fecha límite de "%s" ya pasó y el avance es %s%%.', o.title, o.progress_percentage)
           WHEN w.activity_id IS NOT NULL THEN
               format('"%s" lleva %s %s de retraso.', w.activity_title, CURRENT_DATE - w.scheduled_date,
                      CASE WHEN CURRENT_DATE - w.scheduled_date = 1 THEN 'día' ELSE 'días' END)
           ELSE
               format('"%s" va por debajo del plan: %s%% real frente a %s%% esperado.',
                      o.title, o.progress_percentage, o.expected_progress_percentage)
       END AS alert_message
FROM v_goal_overview o
JOIN v_goal_pace pc ON pc.goal_id = o.goal_id
LEFT JOIN worst w ON w.goal_id = o.goal_id
WHERE o.status = 'active'
  AND (pc.pace_status = 'behind' OR o.overdue_activities > 0 OR o.deadline_passed);

-- ----------------------------------------------------------------------------
-- HU-50: planificacion para el calendario (version vigente de cada horario).
-- Excluye objetivos archivados y actividades eliminadas; incluye pausados con
-- su estado para que la app los muestre atenuados.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_calendar_activities AS
SELECT sc.user_id, sc.goal_id, g.title AS goal_title, g.status AS goal_status,
       g.priority AS goal_priority, sc.stage_id, sc.activity_id, sc.activity_title,
       a.type AS activity_type, sc.activity_status, sc.estimated_minutes,
       sc.schedule_id, sc.version_number, sc.reason, sc.scheduled_date,
       sc.start_time, sc.end_time,
       (sc.scheduled_date < CURRENT_DATE
           AND sc.activity_status NOT IN ('completed', 'skipped')) AS is_overdue
FROM v_activity_current_schedule sc
JOIN "GOAL" g ON g.goal_id = sc.goal_id
JOIN "ACTIVITY" a ON a.activity_id = sc.activity_id
WHERE g.status <> 'archived';

-- Un registro por dia con actividades, para los puntos del calendario mensual.
CREATE OR REPLACE VIEW v_calendar_day_summary AS
SELECT user_id, scheduled_date,
       COUNT(*) AS total_activities,
       COUNT(*) FILTER (WHERE activity_status = 'completed') AS completed_activities,
       COUNT(*) FILTER (WHERE activity_status IN ('pending', 'in_progress')) AS pending_activities,
       COUNT(*) FILTER (WHERE is_overdue) AS overdue_activities,
       COALESCE(SUM(estimated_minutes), 0)::integer AS planned_minutes,
       CASE
           WHEN COUNT(*) FILTER (WHERE is_overdue) > 0 THEN 'overdue'
           WHEN COUNT(*) FILTER (WHERE activity_status IN ('pending', 'in_progress')) = 0 THEN 'completed'
           ELSE 'pending'
       END AS day_status
FROM v_calendar_activities
WHERE goal_status <> 'paused'
GROUP BY user_id, scheduled_date;

-- ----------------------------------------------------------------------------
-- HU-23: resumen de progreso de cualquier periodo (dia, semana o mes).
-- Devuelve JSON listo para la pantalla y para NOTIFICATION.payload:
--   planned_activities / completed_planned_activities / completion_rate:
--       actividades cuya version vigente cae en el periodo.
--   completed_activities: completadas dentro del periodo (completed_at).
--   minutes_spent / active_days: sesiones de trabajo del periodo.
--   previous_period: mismo largo inmediatamente anterior, para la tendencia.
--   daily: una fila por dia (grafico de barras). goals: desglose por objetivo.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_progress_summary(p_user_id INTEGER, p_start DATE, p_end DATE)
RETURNS JSONB AS $$
DECLARE
    v_days INTEGER;
    v_prev_start DATE;
    v_prev_end DATE;
    v_result JSONB;
BEGIN
    IF p_start IS NULL OR p_end IS NULL OR p_end < p_start THEN
        RAISE EXCEPTION 'Periodo de resumen no valido: % a %', p_start, p_end
            USING ERRCODE = 'invalid_parameter_value';
    END IF;
    v_days := p_end - p_start + 1;
    v_prev_end := p_start - 1;
    v_prev_start := p_start - v_days;

    WITH acts AS (
        SELECT g.goal_id, a.activity_id, a.status, a.completed_at, a.estimated_minutes
        FROM "ACTIVITY" a
        JOIN "STAGE" s ON s.stage_id = a.stage_id
        JOIN "GOAL" g ON g.goal_id = s.goal_id
        WHERE g.user_id = p_user_id AND g.deleted_at IS NULL AND a.deleted_at IS NULL
    ), planned AS (
        -- Objetivos pausados o archivados no cuentan como pendientes del periodo.
        SELECT sc.goal_id, sc.activity_id, sc.activity_status
        FROM v_activity_current_schedule sc
        JOIN "GOAL" g ON g.goal_id = sc.goal_id AND g.status IN ('active', 'completed')
        WHERE sc.user_id = p_user_id AND sc.scheduled_date BETWEEN p_start AND p_end
    ), sessions AS (
        SELECT ac.goal_id, w.session_date, w.minutes_spent
        FROM "WORK_SESSION" w
        JOIN acts ac ON ac.activity_id = w.activity_id
        WHERE w.session_date BETWEEN v_prev_start AND p_end
    ), done AS (
        SELECT goal_id, activity_id, completed_at::date AS done_date, COALESCE(estimated_minutes, 0) AS est
        FROM acts
        WHERE status = 'completed' AND completed_at IS NOT NULL
          AND completed_at::date BETWEEN v_prev_start AND p_end
    ), totals AS (
        SELECT
            (SELECT COUNT(*) FROM planned) AS planned_activities,
            (SELECT COUNT(*) FROM planned WHERE activity_status = 'completed') AS completed_planned,
            (SELECT COUNT(*) FROM planned WHERE activity_status IN ('pending', 'in_progress')) AS pending,
            (SELECT COUNT(*) FROM done WHERE done_date >= p_start) AS completed_activities,
            (SELECT COUNT(*) FROM done WHERE done_date < p_start) AS prev_completed,
            (SELECT COALESCE(SUM(minutes_spent), 0) FROM sessions WHERE session_date >= p_start) AS minutes_spent,
            (SELECT COALESCE(SUM(minutes_spent), 0) FROM sessions WHERE session_date < p_start) AS prev_minutes,
            (SELECT COUNT(DISTINCT d) FROM (
                SELECT session_date AS d FROM sessions WHERE session_date >= p_start
                UNION SELECT done_date FROM done WHERE done_date >= p_start) x) AS active_days
    ), daily AS (
        SELECT jsonb_agg(jsonb_build_object(
                   'date', d::date,
                   'iso_day_of_week', EXTRACT(ISODOW FROM d)::integer,
                   'minutes_spent', COALESCE((SELECT SUM(minutes_spent) FROM sessions WHERE session_date = d::date), 0),
                   'completed_activities', (SELECT COUNT(*) FROM done WHERE done_date = d::date)
               ) ORDER BY d) AS days
        FROM generate_series(p_start::timestamp, p_end::timestamp, INTERVAL '1 day') AS d
    ), goal_rows AS (
        SELECT jsonb_agg(jsonb_build_object(
                   'goal_id', o.goal_id,
                   'title', o.title,
                   'status', o.status,
                   'priority', o.priority,
                   'completed_activities', (SELECT COUNT(*) FROM done d WHERE d.goal_id = o.goal_id AND d.done_date >= p_start),
                   'pending_activities', (SELECT COUNT(*) FROM planned pl WHERE pl.goal_id = o.goal_id
                                           AND pl.activity_status IN ('pending', 'in_progress')),
                   'minutes_spent', (SELECT COALESCE(SUM(minutes_spent), 0) FROM sessions se
                                      WHERE se.goal_id = o.goal_id AND se.session_date >= p_start),
                   'progress_gain_percentage', CASE WHEN o.total_estimated_minutes > 0 THEN
                        ROUND(100 * (SELECT COALESCE(SUM(est), 0) FROM done d
                                     WHERE d.goal_id = o.goal_id AND d.done_date >= p_start)::numeric
                              / o.total_estimated_minutes, 2) ELSE 0 END,
                   'progress_percentage', o.progress_percentage,
                   'pace_status', o.pace_status
               ) ORDER BY o.sort_position) AS goals
        FROM v_goal_overview o
        WHERE o.user_id = p_user_id
          AND (o.status IN ('active', 'paused')
               OR EXISTS (SELECT 1 FROM done d WHERE d.goal_id = o.goal_id AND d.done_date >= p_start)
               OR EXISTS (SELECT 1 FROM sessions se WHERE se.goal_id = o.goal_id AND se.session_date >= p_start))
    )
    SELECT jsonb_build_object(
               'user_id', p_user_id,
               'period_start', p_start,
               'period_end', p_end,
               'planned_activities', t.planned_activities,
               'completed_planned_activities', t.completed_planned,
               'pending_activities', t.pending,
               'completion_rate', CASE WHEN t.planned_activities > 0 THEN
                    ROUND(100 * t.completed_planned::numeric / t.planned_activities, 2) END,
               'completed_activities', t.completed_activities,
               'minutes_spent', t.minutes_spent,
               'active_days', t.active_days,
               'previous_period', jsonb_build_object(
                    'period_start', v_prev_start, 'period_end', v_prev_end,
                    'completed_activities', t.prev_completed, 'minutes_spent', t.prev_minutes),
               'completed_activities_delta', t.completed_activities - t.prev_completed,
               'minutes_spent_delta', t.minutes_spent - t.prev_minutes,
               'goals_behind', (SELECT COUNT(*) FROM v_goal_delay_alert da WHERE da.user_id = p_user_id),
               'daily', COALESCE(dl.days, '[]'::jsonb),
               'goals', COALESCE(gr.goals, '[]'::jsonb))
    INTO v_result
    FROM totals t, daily dl, goal_rows gr;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE;

-- ----------------------------------------------------------------------------
-- HU-23: resumenes que ya corresponde entregar y aun no se generaron.
-- El momento de envio se calcula en la zona horaria del usuario:
--   daily   -> cada dia a summary_time; resume ese mismo dia.
--   weekly  -> summary_day_of_week a summary_time; resume los 7 dias que
--              terminan ese dia (domingo 18:00 = lunes a domingo).
--   monthly -> dia 1 a summary_time; resume el mes anterior.
-- El backend recorre esta vista, llama fn_progress_summary e inserta en
-- NOTIFICATION (type 'periodic_summary', period_start/period_end).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_pending_periodic_summaries AS
WITH clock AS (
    SELECT p.user_id, p.summary_frequency, p.summary_day_of_week, p.summary_time, p.timezone,
           CURRENT_TIMESTAMP AT TIME ZONE p.timezone AS local_now,
           u.created_at
    FROM v_user_preferences p
    JOIN "APP_USER" u ON u.user_id = p.user_id AND u.is_active
    WHERE p.periodic_summary_enabled
), anchor AS (
    SELECT c.*,
           CASE c.summary_frequency
               WHEN 'daily' THEN
                   c.local_now::date - CASE WHEN c.local_now::time < c.summary_time THEN 1 ELSE 0 END
               WHEN 'weekly' THEN
                   c.local_now::date
                   - ((EXTRACT(ISODOW FROM c.local_now)::integer
                       - CASE c.summary_day_of_week
                             WHEN 'monday' THEN 1 WHEN 'tuesday' THEN 2 WHEN 'wednesday' THEN 3
                             WHEN 'thursday' THEN 4 WHEN 'friday' THEN 5 WHEN 'saturday' THEN 6
                             ELSE 7 END + 7) % 7)
               ELSE date_trunc('month', c.local_now)::date
           END AS send_date
    FROM clock c
), adjusted AS (
    SELECT a.*,
           CASE
               WHEN a.send_date = a.local_now::date AND a.local_now::time < a.summary_time THEN
                   CASE a.summary_frequency
                       WHEN 'weekly' THEN a.send_date - 7
                       WHEN 'monthly' THEN (a.send_date - INTERVAL '1 month')::date
                       ELSE a.send_date
                   END
               ELSE a.send_date
           END AS effective_send_date
    FROM anchor a
), periods AS (
    SELECT ad.user_id, ad.summary_frequency, ad.timezone, ad.created_at,
           CASE ad.summary_frequency
               WHEN 'daily' THEN ad.effective_send_date
               WHEN 'weekly' THEN ad.effective_send_date - 6
               ELSE (ad.effective_send_date - INTERVAL '1 month')::date
           END AS period_start,
           CASE ad.summary_frequency
               WHEN 'monthly' THEN ad.effective_send_date - 1
               ELSE ad.effective_send_date
           END AS period_end,
           ad.effective_send_date + ad.summary_time AS scheduled_for_local
    FROM adjusted ad
)
SELECT pe.user_id, pe.summary_frequency, pe.period_start, pe.period_end,
       pe.scheduled_for_local, pe.timezone
FROM periods pe
WHERE pe.period_end >= pe.created_at::date
  AND NOT EXISTS (
      SELECT 1 FROM "NOTIFICATION" n
      WHERE n.user_id = pe.user_id AND n.type = 'periodic_summary'
        AND n.goal_id IS NULL AND n.period_start = pe.period_start
  );

-- ----------------------------------------------------------------------------
-- HU-25: alertas de retraso pendientes de entregar (una por objetivo y dia
-- local del usuario), solo si el usuario mantiene activadas las alertas.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_pending_delay_alerts AS
SELECT da.*, (CURRENT_TIMESTAMP AT TIME ZONE p.timezone)::date AS alert_date
FROM v_goal_delay_alert da
JOIN v_user_preferences p ON p.user_id = da.user_id AND p.delay_alerts_enabled
WHERE NOT EXISTS (
    SELECT 1 FROM "NOTIFICATION" n
    WHERE n.user_id = da.user_id AND n.type = 'delay_alert' AND n.goal_id = da.goal_id
      AND n.period_start = (CURRENT_TIMESTAMP AT TIME ZONE p.timezone)::date
);

-- ----------------------------------------------------------------------------
-- HU-55: sesiones vigentes. JwtStrategy consulta esta vista con el sid del
-- token; si no hay fila, la sesion se cerro o expiro.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_active_auth_session AS
SELECT s.session_id, s.user_id, s.created_at, s.expires_at, s.user_agent
FROM "AUTH_SESSION" s
JOIN "APP_USER" u ON u.user_id = s.user_id AND u.deleted_at IS NULL AND u.is_active
WHERE s.revoked_at IS NULL AND s.expires_at > CURRENT_TIMESTAMP;

-- Alias entre comillas en mayusculas, como en los sprints anteriores.
CREATE OR REPLACE VIEW "V_USER_PREFERENCES" AS SELECT * FROM v_user_preferences;
CREATE OR REPLACE VIEW "V_GOAL_PAUSE_PERIODS" AS SELECT * FROM v_goal_pause_periods;
CREATE OR REPLACE VIEW "V_GOAL_OVERVIEW" AS SELECT * FROM v_goal_overview;
CREATE OR REPLACE VIEW "V_USER_GOAL_SUMMARY" AS SELECT * FROM v_user_goal_summary;
CREATE OR REPLACE VIEW "V_GOAL_HISTORY" AS SELECT * FROM v_goal_history;
CREATE OR REPLACE VIEW "V_GOAL_DELAY_ALERT" AS SELECT * FROM v_goal_delay_alert;
CREATE OR REPLACE VIEW "V_CALENDAR_ACTIVITIES" AS SELECT * FROM v_calendar_activities;
CREATE OR REPLACE VIEW "V_CALENDAR_DAY_SUMMARY" AS SELECT * FROM v_calendar_day_summary;
CREATE OR REPLACE VIEW "V_PENDING_PERIODIC_SUMMARIES" AS SELECT * FROM v_pending_periodic_summaries;
CREATE OR REPLACE VIEW "V_PENDING_DELAY_ALERTS" AS SELECT * FROM v_pending_delay_alerts;
CREATE OR REPLACE VIEW "V_ACTIVE_AUTH_SESSION" AS SELECT * FROM v_active_auth_session;

COMMIT;
