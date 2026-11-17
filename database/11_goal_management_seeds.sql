-- Demostracion del Sprint 3 (gestion de objetivos). Ejecutar despues de 10.
-- Usuario: gestion.demo@flowstep.test / Password123!
-- Las fechas se fijan en la primera ejecucion y se conservan al repetir el
-- script; no duplica filas. Solo para desarrollo y demostracion.
BEGIN;

-- Ayudante temporal (desaparece al cerrar la conexion).
CREATE OR REPLACE FUNCTION pg_temp.seed_activity(
    p_stage INTEGER, p_title TEXT, p_order INTEGER, p_minutes INTEGER, p_status TEXT,
    p_anchor DATE, p_schedule_offset INTEGER, p_session_minutes INTEGER,
    p_parent INTEGER DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
    v_activity INTEGER;
BEGIN
    SELECT activity_id INTO v_activity FROM "ACTIVITY"
    WHERE stage_id = p_stage AND title = p_title ORDER BY activity_id LIMIT 1;
    IF v_activity IS NULL THEN
        INSERT INTO "ACTIVITY" (stage_id, parent_activity_id, title, type, sort_order,
                                estimated_minutes, status, completed_at)
        VALUES (p_stage, p_parent, p_title, 'practice', p_order, p_minutes,
                p_status::"ACTIVITY_status_enum",
                CASE WHEN p_status = 'completed' THEN (p_anchor + p_schedule_offset) + TIME '19:00' END)
        RETURNING activity_id INTO v_activity;
    END IF;

    IF p_schedule_offset IS NOT NULL THEN
        INSERT INTO "ACTIVITY_SCHEDULE" (activity_id, version_number, scheduled_date,
                                        start_time, end_time, reason, created_at)
        VALUES (v_activity, 1, p_anchor + p_schedule_offset, '18:00',
                '18:00'::time + make_interval(mins => p_minutes), 'initial_plan',
                (p_anchor - 30) + TIME '09:00')
        ON CONFLICT (activity_id, version_number) DO NOTHING;
    END IF;

    IF p_session_minutes IS NOT NULL THEN
        INSERT INTO "WORK_SESSION" (activity_id, session_date, minutes_spent, difficulty_level, created_at)
        SELECT v_activity, p_anchor + p_schedule_offset, p_session_minutes, 3,
               (p_anchor + p_schedule_offset) + TIME '18:50'
        WHERE NOT EXISTS (SELECT 1 FROM "WORK_SESSION" WHERE activity_id = v_activity);
    END IF;

    IF p_status <> 'pending' THEN
        INSERT INTO "ACTIVITY_STATUS_HISTORY" (activity_id, previous_status, new_status, changed_at)
        SELECT v_activity, 'pending', p_status::"ACTIVITY_status_enum",
               (p_anchor + p_schedule_offset) + TIME '19:00'
        WHERE NOT EXISTS (SELECT 1 FROM "ACTIVITY_STATUS_HISTORY" WHERE activity_id = v_activity);
    END IF;
    RETURN v_activity;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION pg_temp.seed_goal(
    p_user INTEGER, p_title TEXT, p_priority TEXT, p_status TEXT,
    p_start DATE, p_due DATE, p_closed TIMESTAMP)
RETURNS INTEGER AS $$
DECLARE
    v_goal INTEGER;
BEGIN
    SELECT goal_id INTO v_goal FROM "GOAL"
    WHERE user_id = p_user AND title = p_title ORDER BY goal_id LIMIT 1;
    IF v_goal IS NULL THEN
        -- Se inserta directamente en su estado final; el historial de estados
        -- de la demostracion se agrega abajo con fechas fijas.
        INSERT INTO "GOAL" (user_id, title, user_description, start_date, due_date,
                            priority, status, closed_at)
        VALUES (p_user, p_title, 'Objetivo simulado para demostrar la gestión de objetivos.',
                p_start, p_due, p_priority::"GOAL_priority_enum", p_status::"GOAL_status_enum", p_closed)
        RETURNING goal_id INTO v_goal;
    END IF;
    RETURN v_goal;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION pg_temp.seed_stage(p_goal INTEGER, p_name TEXT)
RETURNS INTEGER AS $$
DECLARE
    v_stage INTEGER;
BEGIN
    SELECT stage_id INTO v_stage FROM "STAGE" WHERE goal_id = p_goal AND sort_order = 1
    ORDER BY stage_id LIMIT 1;
    IF v_stage IS NULL THEN
        INSERT INTO "STAGE" (goal_id, name, sort_order) VALUES (p_goal, p_name, 1)
        RETURNING stage_id INTO v_stage;
    END IF;
    RETURN v_stage;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION pg_temp.seed_status(
    p_goal INTEGER, p_prev TEXT, p_new TEXT, p_at TIMESTAMP, p_reason TEXT)
RETURNS VOID AS $$
    INSERT INTO "GOAL_STATUS_HISTORY" (goal_id, previous_status, new_status, reason, changed_at)
    SELECT p_goal, p_prev::"GOAL_status_enum", p_new::"GOAL_status_enum", p_reason, p_at
    WHERE NOT EXISTS (
        SELECT 1 FROM "GOAL_STATUS_HISTORY"
        WHERE goal_id = p_goal AND new_status = p_new::"GOAL_status_enum" AND changed_at = p_at);
$$ LANGUAGE sql;

DO $$
DECLARE
    demo_user INTEGER;
    a DATE;           -- fecha ancla de la demostracion
    g_portfolio INTEGER;
    g_english INTEGER;
    g_running INTEGER;
    g_photo INTEGER;
    g_cv INTEGER;
    st INTEGER;
    parent_activity INTEGER;
BEGIN
    PERFORM pg_advisory_xact_lock(hashtext('flowstep_goal_management_seeds'));

    INSERT INTO "APP_USER" (name, email, password_hash)
    VALUES ('Lucía Martínez', 'gestion.demo@flowstep.test',
        '$2b$10$U32/WmJ2O0skqgISjUHocOlArLXsEMgjjF.LVO3.0Wji0lO8XpyoS')
    ON CONFLICT (email) DO NOTHING;
    SELECT user_id INTO STRICT demo_user FROM "APP_USER" WHERE email = 'gestion.demo@flowstep.test';

    SELECT start_date + 21 INTO a FROM "GOAL"
    WHERE user_id = demo_user AND title = 'Construir mi portafolio web';
    a := COALESCE(a, CURRENT_DATE);

    -- HU-49: preferencias guardadas (resumen semanal el domingo a las 18:00).
    INSERT INTO "USER_PREFERENCE" (user_id, reminders_enabled, reminder_minutes_before,
        delay_alerts_enabled, periodic_summary_enabled, summary_frequency,
        summary_day_of_week, summary_time, goals_sort_by, timezone)
    VALUES (demo_user, TRUE, 30, TRUE, TRUE, 'weekly', 'sunday', '18:00', 'priority', 'America/La_Paz')
    ON CONFLICT (user_id) DO NOTHING;

    -- HU-44, HU-45, HU-25, HU-12: objetivo activo de prioridad alta con atraso.
    g_portfolio := pg_temp.seed_goal(demo_user, 'Construir mi portafolio web', 'high', 'active',
                                     a - 21, a + 30, NULL);
    st := pg_temp.seed_stage(g_portfolio, 'Fundamentos web');
    PERFORM pg_temp.seed_activity(st, 'Maquetar la página de inicio', 1, 60, 'completed', a, -10, 60);
    PERFORM pg_temp.seed_activity(st, 'Consumo de APIs', 2, 90, 'pending', a, -2, NULL);
    PERFORM pg_temp.seed_activity(st, 'Publicar en GitHub Pages', 3, 45, 'pending', a, 3, NULL);
    -- HU-12: actividad eliminada logicamente con su sub-actividad (cascada por trigger).
    parent_activity := pg_temp.seed_activity(st, 'Agregar animaciones 3D', 4, 60, 'pending', a, 6, NULL);
    PERFORM pg_temp.seed_activity(st, 'Elegir librería 3D', 5, 30, 'pending', a, 5, NULL, parent_activity);
    UPDATE "ACTIVITY"
    SET deleted_at = (a - 1) + TIME '20:00', deletion_reason = 'No aporta al objetivo principal'
    WHERE activity_id = parent_activity AND deleted_at IS NULL;

    -- HU-34: objetivo activo con la fecha limite ampliada.
    g_english := pg_temp.seed_goal(demo_user, 'Mejorar mi inglés', 'medium', 'active',
                                   a - 14, a + 45, NULL);
    INSERT INTO "GOAL_DEADLINE_HISTORY" (goal_id, previous_due_date, new_due_date, reason, changed_at)
    SELECT g_english, a + 20, a + 45, 'Necesito más semanas de práctica', (a - 4) + TIME '10:00'
    WHERE NOT EXISTS (SELECT 1 FROM "GOAL_DEADLINE_HISTORY" WHERE goal_id = g_english);
    st := pg_temp.seed_stage(g_english, 'Rutina diaria');
    PERFORM pg_temp.seed_activity(st, 'Vocabulario cotidiano', 1, 30, 'completed', a, -1, 30);
    PERFORM pg_temp.seed_activity(st, 'Listening de podcasts', 2, 30, 'pending', a, 1, NULL);

    -- HU-32, HU-33: objetivo pausado (se pauso, se reanudo y se volvio a pausar).
    -- Su actividad vencida no genera alerta mientras siga en pausa.
    g_running := pg_temp.seed_goal(demo_user, 'Correr mi primera 10K', 'low', 'paused',
                                   a - 30, a + 60, NULL);
    PERFORM pg_temp.seed_status(g_running, 'active', 'paused', (a - 20) + TIME '08:00', 'Lesión leve');
    PERFORM pg_temp.seed_status(g_running, 'paused', 'active', (a - 17) + TIME '08:00', NULL);
    PERFORM pg_temp.seed_status(g_running, 'active', 'paused', (a - 3) + TIME '08:00', 'Semana de exámenes');
    st := pg_temp.seed_stage(g_running, 'Base aeróbica');
    PERFORM pg_temp.seed_activity(st, 'Trote suave de 20 minutos', 1, 20, 'completed', a, -25, 20);
    PERFORM pg_temp.seed_activity(st, 'Intervalos de 400 metros', 2, 40, 'pending', a, -1, NULL);

    -- HU-46, HU-47: objetivo archivado.
    g_photo := pg_temp.seed_goal(demo_user, 'Aprender fotografía', 'medium', 'archived',
                                 a - 60, a - 10, (a - 5) + TIME '21:00');
    PERFORM pg_temp.seed_status(g_photo, 'active', 'archived', (a - 5) + TIME '21:00',
                                'Ya no es una prioridad');
    st := pg_temp.seed_stage(g_photo, 'Composición');
    PERFORM pg_temp.seed_activity(st, 'Regla de los tercios', 1, 45, 'completed', a, -50, 50);
    PERFORM pg_temp.seed_activity(st, 'Fotografía nocturna', 2, 90, 'pending', a, -40, NULL);

    -- HU-47: objetivo completado.
    g_cv := pg_temp.seed_goal(demo_user, 'Crear mi CV', 'high', 'completed',
                              a - 40, a - 7, (a - 7) + TIME '19:30');
    PERFORM pg_temp.seed_status(g_cv, 'active', 'completed', (a - 7) + TIME '19:30', NULL);
    st := pg_temp.seed_stage(g_cv, 'Redacción');
    PERFORM pg_temp.seed_activity(st, 'Redactar experiencia', 1, 60, 'completed', a, -9, 70);
    PERFORM pg_temp.seed_activity(st, 'Diseñar el formato', 2, 30, 'completed', a, -7, 25);

    -- HU-55: una sesion cerrada y una vigente.
    IF NOT EXISTS (SELECT 1 FROM "AUTH_SESSION" WHERE user_id = demo_user) THEN
        INSERT INTO "AUTH_SESSION" (user_id, created_at, expires_at, revoked_at, user_agent)
        VALUES (demo_user, (a - 2) + TIME '08:00', (a + 5) + TIME '08:00', (a - 2) + TIME '22:00', 'Expo Go demo'),
               (demo_user, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '7 days', NULL, 'Expo Go demo');
    END IF;

    -- HU-23: resumen semanal ya entregado de la semana anterior a la fecha ancla.
    INSERT INTO "NOTIFICATION" (user_id, type, title, body, payload, period_start, period_end, created_at)
    SELECT demo_user, 'periodic_summary', 'Tu resumen semanal',
           'Revisa lo que avanzaste la semana pasada.',
           fn_progress_summary(demo_user, date_trunc('week', a::timestamp)::date - 7,
                               date_trunc('week', a::timestamp)::date - 1),
           date_trunc('week', a::timestamp)::date - 7, date_trunc('week', a::timestamp)::date - 1,
           (date_trunc('week', a::timestamp)::date - 1) + TIME '18:00'
    ON CONFLICT (user_id, type, COALESCE(goal_id, 0), period_start)
        WHERE period_start IS NOT NULL DO NOTHING;
END $$;

COMMIT;
