-- FLOWSTEP - Sprint 2. Datos derivados, sin columnas redundantes.
BEGIN;

-- HU-07, HU-35: duracion exacta de cada franja, incluyendo segundos.
CREATE OR REPLACE VIEW v_availability_detail AS
SELECT av.availability_id, av.user_id, av.day_of_week, av.start_time, av.end_time,
       EXTRACT(EPOCH FROM (av.end_time - av.start_time)) / 60 AS available_minutes
FROM "AVAILABILITY" av
JOIN "APP_USER" u ON u.user_id = av.user_id
WHERE u.deleted_at IS NULL;

-- Incluye usuarios sin disponibilidad con cero minutos, dias y franjas.
CREATE OR REPLACE VIEW v_user_available_time AS
SELECT u.user_id,
       COUNT(av.availability_id) AS total_slots,
       COUNT(DISTINCT av.day_of_week) AS available_days,
       COALESCE(SUM(av.available_minutes), 0) AS weekly_available_minutes
FROM "APP_USER" u
LEFT JOIN v_availability_detail av ON av.user_id = u.user_id
WHERE u.deleted_at IS NULL
GROUP BY u.user_id;

-- HU-14: la version mayor es la vigente, aunque created_at tenga otro orden.
-- No une todas las versiones a las vistas de progreso (evita duplicar minutos).
CREATE OR REPLACE VIEW v_activity_current_schedule AS
SELECT DISTINCT ON (sc.activity_id)
       sc.schedule_id, sc.activity_id, sc.recommendation_id, sc.version_number,
       sc.scheduled_date, sc.start_time, sc.end_time, sc.reason, sc.created_at,
       s.stage_id, g.goal_id, g.user_id,
       a.title AS activity_title, a.status AS activity_status, a.estimated_minutes
FROM "ACTIVITY_SCHEDULE" sc
JOIN "ACTIVITY" a ON a.activity_id = sc.activity_id
JOIN "STAGE" s ON s.stage_id = a.stage_id
JOIN "GOAL" g ON g.goal_id = s.goal_id
JOIN "APP_USER" u ON u.user_id = g.user_id
WHERE a.deleted_at IS NULL AND g.deleted_at IS NULL AND u.deleted_at IS NULL
ORDER BY sc.activity_id, sc.version_number DESC;

-- HU-36: permite verificar si la programacion vigente cabe en una franja real.
-- NULL indica que falta disponibilidad, horario completo o duracion estimada.
-- No bloquea historiales ni invalida planes al modificar la rutina semanal.
CREATE OR REPLACE VIEW v_activity_availability_fit AS
SELECT sc.*,
       CASE
           WHEN sc.start_time IS NULL OR sc.end_time IS NULL
             OR sc.estimated_minutes IS NULL
             OR NOT EXISTS (SELECT 1 FROM "AVAILABILITY" av WHERE av.user_id = sc.user_id)
           THEN NULL::boolean
           ELSE EXISTS (
               SELECT 1 FROM "AVAILABILITY" av
               WHERE av.user_id = sc.user_id
                 AND av.day_of_week::text = CASE EXTRACT(ISODOW FROM sc.scheduled_date)::integer
                     WHEN 1 THEN 'monday' WHEN 2 THEN 'tuesday' WHEN 3 THEN 'wednesday'
                     WHEN 4 THEN 'thursday' WHEN 5 THEN 'friday' WHEN 6 THEN 'saturday'
                     WHEN 7 THEN 'sunday' END
                 AND sc.start_time >= av.start_time AND sc.end_time <= av.end_time
                 AND sc.estimated_minutes <= EXTRACT(EPOCH FROM (sc.end_time - sc.start_time)) / 60
           )
       END AS fits_availability
FROM v_activity_current_schedule sc;

CREATE OR REPLACE VIEW "V_AVAILABILITY_DETAIL" AS SELECT * FROM v_availability_detail;
CREATE OR REPLACE VIEW "V_USER_AVAILABLE_TIME" AS SELECT * FROM v_user_available_time;
CREATE OR REPLACE VIEW "V_ACTIVITY_CURRENT_SCHEDULE" AS SELECT * FROM v_activity_current_schedule;
CREATE OR REPLACE VIEW "V_ACTIVITY_AVAILABILITY_FIT" AS SELECT * FROM v_activity_availability_fit;
CREATE OR REPLACE VIEW availability AS SELECT * FROM "AVAILABILITY";
CREATE OR REPLACE VIEW activity_schedule AS SELECT * FROM "ACTIVITY_SCHEDULE";

COMMIT;
