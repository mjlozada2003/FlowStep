-- FLOWSTEP - Sprint 3. Aplicar despues de 04 y 05 del main integrado.
BEGIN;

CREATE TABLE IF NOT EXISTS "WORK_SESSION" (
    session_id SERIAL PRIMARY KEY,
    activity_id INTEGER NOT NULL REFERENCES "ACTIVITY"(activity_id) ON DELETE CASCADE,
    session_date DATE NOT NULL DEFAULT CURRENT_DATE,
    minutes_spent INTEGER NOT NULL CHECK (minutes_spent > 0),
    difficulty_level SMALLINT CHECK (difficulty_level BETWEEN 1 AND 5),
    difficulty_notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_work_session_activity_date
    ON "WORK_SESSION" (activity_id, session_date);

CREATE TABLE IF NOT EXISTS "MISS_REASON" (
    reason_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE CHECK (btrim(name) <> ''),
    description VARCHAR(255)
);

INSERT INTO "MISS_REASON" (name)
VALUES ('Falta de tiempo'), ('Dificultad con la actividad'), ('Imprevisto'), ('Otro')
ON CONFLICT (name) DO NOTHING;

-- Una incidencia por version programada. Una reprogramacion tiene su propio ID.
CREATE TABLE IF NOT EXISTS "SCHEDULE_MISS" (
    miss_id SERIAL PRIMARY KEY,
    schedule_id INTEGER NOT NULL UNIQUE REFERENCES "ACTIVITY_SCHEDULE"(schedule_id) ON DELETE CASCADE,
    reason_id INTEGER NOT NULL REFERENCES "MISS_REASON"(reason_id),
    details TEXT,
    recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- HU-20: una fila por evento, con datos especificos en details.
CREATE OR REPLACE VIEW v_activity_timeline AS
WITH events AS (
    SELECT activity_id, 'work_session'::text AS event_type, session_id AS event_id,
           session_date AS event_date, created_at AS recorded_at,
           jsonb_build_object('minutes_spent', minutes_spent, 'difficulty_level', difficulty_level,
                              'difficulty_notes', difficulty_notes) AS details
    FROM "WORK_SESSION"
    UNION ALL
    SELECT activity_id, 'status_change', activity_status_history_id, changed_at::date, changed_at,
           jsonb_build_object('previous_status', previous_status, 'new_status', new_status,
                              'previous_completed_at', previous_completed_at)
    FROM "ACTIVITY_STATUS_HISTORY"
    UNION ALL
    SELECT activity_id, 'schedule_version', schedule_id, created_at::date, created_at,
           jsonb_build_object('version_number', version_number, 'scheduled_date', scheduled_date,
                              'start_time', start_time, 'end_time', end_time, 'reason', reason)
    FROM "ACTIVITY_SCHEDULE"
    UNION ALL
    SELECT sc.activity_id, 'schedule_miss', m.miss_id, m.recorded_at::date, m.recorded_at,
           jsonb_build_object('schedule_id', sc.schedule_id, 'scheduled_date', sc.scheduled_date,
                              'reason_id', r.reason_id, 'reason', r.name, 'notes', m.details)
    FROM "SCHEDULE_MISS" m
    JOIN "ACTIVITY_SCHEDULE" sc ON sc.schedule_id = m.schedule_id
    JOIN "MISS_REASON" r ON r.reason_id = m.reason_id
)
SELECT g.user_id, g.goal_id, s.stage_id, a.title AS activity_title, e.*
FROM events e
JOIN "ACTIVITY" a ON a.activity_id = e.activity_id
JOIN "STAGE" s ON s.stage_id = a.stage_id
JOIN "GOAL" g ON g.goal_id = s.goal_id
JOIN "APP_USER" u ON u.user_id = g.user_id
WHERE u.deleted_at IS NULL AND g.deleted_at IS NULL AND a.deleted_at IS NULL;

-- HU-22 y HU-24: conserva el progreso de HU-03 y agrega la referencia de agenda.
CREATE OR REPLACE VIEW v_goal_pace AS
WITH planned AS (
    SELECT goal_id, SUM(estimated_minutes) AS scheduled_minutes,
           SUM(estimated_minutes) FILTER (WHERE scheduled_date <= CURRENT_DATE) AS due_minutes
    FROM v_activity_current_schedule
    GROUP BY goal_id
)
SELECT p.*, CURRENT_DATE AS as_of_date,
       COALESCE(pl.scheduled_minutes, 0) AS scheduled_estimated_minutes,
       COALESCE(pl.due_minutes, 0) AS expected_completed_minutes,
       CASE WHEN pl.scheduled_minutes > 0 THEN
           ROUND(100 * COALESCE(pl.due_minutes, 0)::numeric / NULLIF(p.total_estimated_minutes, 0), 2)
       END AS expected_progress_percentage,
       CASE
           WHEN COALESCE(pl.scheduled_minutes, 0) = 0 THEN 'no_schedule'
           WHEN p.completed_estimated_minutes < COALESCE(pl.due_minutes, 0) THEN 'behind'
           ELSE 'on_track'
       END AS pace_status
FROM v_goal_progress p
JOIN "APP_USER" u ON u.user_id = p.user_id AND u.deleted_at IS NULL
LEFT JOIN planned pl ON pl.goal_id = p.goal_id;

-- HU-21: serie semanal con unidades separadas para esfuerzo real y avance.
CREATE OR REPLACE VIEW v_goal_weekly_progress AS
WITH activities AS (
    SELECT g.user_id, g.goal_id, a.activity_id, a.status, a.completed_at, a.estimated_minutes
    FROM "ACTIVITY" a
    JOIN "STAGE" s ON s.stage_id = a.stage_id
    JOIN "GOAL" g ON g.goal_id = s.goal_id
    JOIN "APP_USER" u ON u.user_id = g.user_id
    WHERE a.deleted_at IS NULL AND g.deleted_at IS NULL AND u.deleted_at IS NULL
), metrics AS (
    SELECT a.user_id, a.goal_id, w.session_date AS metric_date,
           w.minutes_spent, 0 AS completed_minutes, 0 AS planned_minutes
    FROM activities a
    JOIN "WORK_SESSION" w ON w.activity_id = a.activity_id
    UNION ALL
    SELECT user_id, goal_id, completed_at::date, 0, COALESCE(estimated_minutes, 0), 0
    FROM activities
    WHERE status = 'completed' AND completed_at IS NOT NULL
    UNION ALL
    SELECT user_id, goal_id, scheduled_date, 0, 0, COALESCE(estimated_minutes, 0)
    FROM v_activity_current_schedule
)
SELECT user_id, goal_id, date_trunc('week', metric_date::timestamp)::date AS week_start,
       SUM(minutes_spent) AS minutes_spent,
       SUM(completed_minutes) AS completed_estimated_minutes,
       SUM(planned_minutes) AS planned_estimated_minutes
FROM metrics
GROUP BY user_id, goal_id, week_start;

COMMIT;
