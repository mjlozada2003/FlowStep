-- Pruebas del Sprint 3 (gestion de objetivos). Requiere 01, 02, 04, 05, 07, 09 y 10.
-- Ejecutar con psql -v ON_ERROR_STOP=1 sobre una base de prueba. Revierte sus filas.
BEGIN;
SET LOCAL timezone = 'America/La_Paz';

DO $$
DECLARE
    t DATE := CURRENT_DATE;
    u INTEGER;
    other_user INTEGER;
    g_a INTEGER; g_b INTEGER; g_c INTEGER;
    st INTEGER;
    act1 INTEGER; act2 INTEGER; act3 INTEGER; act_parent INTEGER; act_child INTEGER; act_b INTEGER;
    sid UUID;
    r RECORD;
    j JSONB;
    n INTEGER;
    v_text TEXT;
BEGIN
    INSERT INTO "APP_USER" (name, email, password_hash, created_at)
    VALUES ('Prueba gestion', 'gestion-' || txid_current() || '@flowstep.test', 'x', CURRENT_TIMESTAMP - INTERVAL '90 days')
    RETURNING user_id INTO u;
    INSERT INTO "APP_USER" (name, email, password_hash)
    VALUES ('Otro usuario', 'otro-' || txid_current() || '@flowstep.test', 'x')
    RETURNING user_id INTO other_user;

    -- ------------------------------------------------------------------ HU-49
    SELECT * INTO STRICT r FROM v_user_preferences WHERE user_id = u;
    IF r.has_saved_preferences OR NOT r.reminders_enabled OR r.reminder_minutes_before <> 30
       OR r.summary_frequency <> 'weekly' OR r.summary_day_of_week <> 'sunday'
       OR r.goals_sort_by <> 'priority' OR r.timezone <> 'America/La_Paz'
       OR r.session_duration_minutes <> 60 THEN
        RAISE EXCEPTION 'HU-49: valores por defecto incorrectos para un usuario sin preferencias';
    END IF;

    INSERT INTO "USER_PREFERENCE" (user_id, reminder_minutes_before, delay_alerts_enabled)
    VALUES (u, 15, TRUE);
    IF (SELECT reminder_minutes_before FROM v_user_preferences WHERE user_id = u) <> 15 THEN
        RAISE EXCEPTION 'HU-49: no se reflejo la preferencia guardada';
    END IF;
    BEGIN
        UPDATE "USER_PREFERENCE" SET reminder_minutes_before = 7 WHERE user_id = u;
        RAISE EXCEPTION 'HU-49: se acepto un recordatorio fuera del catalogo';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    BEGIN
        UPDATE "USER_PREFERENCE" SET timezone = 'Marte/Olympus' WHERE user_id = u;
        RAISE EXCEPTION 'HU-49: se acepto una zona horaria inexistente';
    EXCEPTION WHEN check_violation THEN NULL;
    END;

    -- ---------------------------------------------------- Datos base del usuario
    INSERT INTO "GOAL" (user_id, title, user_description, start_date, due_date, priority)
    VALUES (u, 'A alta', 'Prueba', t - 30, t + 30, 'high') RETURNING goal_id INTO g_a;
    INSERT INTO "GOAL" (user_id, title, user_description, start_date, due_date, priority)
    VALUES (u, 'B baja', 'Prueba', t - 30, t + 10, 'low') RETURNING goal_id INTO g_b;
    INSERT INTO "GOAL" (user_id, title, user_description, start_date, due_date, priority)
    VALUES (u, 'C media', 'Prueba', t - 30, t + 20, 'medium') RETURNING goal_id INTO g_c;

    INSERT INTO "STAGE" (goal_id, name) VALUES (g_a, 'Etapa A') RETURNING stage_id INTO st;
    INSERT INTO "ACTIVITY" (stage_id, title, type, estimated_minutes, sort_order, status, completed_at)
    VALUES (st, 'Hecha', 'practice', 60, 1, 'completed', (t - 2) + TIME '19:00') RETURNING activity_id INTO act1;
    INSERT INTO "ACTIVITY" (stage_id, title, type, estimated_minutes, sort_order)
    VALUES (st, 'Vencida', 'practice', 30, 2) RETURNING activity_id INTO act2;
    INSERT INTO "ACTIVITY" (stage_id, title, type, estimated_minutes, sort_order)
    VALUES (st, 'Futura', 'practice', 30, 3) RETURNING activity_id INTO act3;
    INSERT INTO "ACTIVITY" (stage_id, title, type, estimated_minutes, sort_order)
    VALUES (st, 'Irrelevante', 'practice', 20, 4) RETURNING activity_id INTO act_parent;
    INSERT INTO "ACTIVITY" (stage_id, parent_activity_id, title, type, estimated_minutes, sort_order)
    VALUES (st, act_parent, 'Sub irrelevante', 'practice', 10, 5) RETURNING activity_id INTO act_child;

    INSERT INTO "ACTIVITY_SCHEDULE" (activity_id, version_number, scheduled_date, start_time, end_time)
    VALUES (act1, 1, t - 2, '18:00', '19:00'),
           (act2, 1, t - 5, '18:00', '18:30'),
           (act2, 2, t - 1, '18:00', '18:30'),   -- la version vigente es la 2
           (act3, 1, t + 2, '18:00', '18:30'),
           (act_parent, 1, t + 3, '18:00', '18:20'),
           (act_child, 1, t + 3, '18:30', '18:40');
    INSERT INTO "WORK_SESSION" (activity_id, session_date, minutes_spent) VALUES (act1, t - 2, 50);

    INSERT INTO "STAGE" (goal_id, name) VALUES (g_b, 'Etapa B') RETURNING stage_id INTO st;
    INSERT INTO "ACTIVITY" (stage_id, title, type, estimated_minutes)
    VALUES (st, 'Manana', 'practice', 60) RETURNING activity_id INTO act_b;
    INSERT INTO "ACTIVITY_SCHEDULE" (activity_id, version_number, scheduled_date) VALUES (act_b, 1, t + 1);

    INSERT INTO "STAGE" (goal_id, name) VALUES (g_c, 'Etapa C') RETURNING stage_id INTO st;
    INSERT INTO "ACTIVITY" (stage_id, title, type, estimated_minutes)
    VALUES (st, 'Vencida C', 'practice', 40) RETURNING activity_id INTO n;
    INSERT INTO "ACTIVITY_SCHEDULE" (activity_id, version_number, scheduled_date) VALUES (n, 1, t - 3);

    -- ------------------------------------------------------------------ HU-12
    IF (SELECT progress_percentage FROM v_goal_progress WHERE goal_id = g_a) <> 40.00 THEN
        RAISE EXCEPTION 'HU-12: progreso inicial esperado 40%%';
    END IF;
    UPDATE "ACTIVITY" SET deleted_at = CURRENT_TIMESTAMP, deletion_reason = 'No aporta al objetivo'
    WHERE activity_id = act_parent;
    SELECT deleted_at, deletion_reason INTO STRICT r FROM "ACTIVITY" WHERE activity_id = act_child;
    IF r.deleted_at IS NULL OR r.deletion_reason IS DISTINCT FROM 'No aporta al objetivo' THEN
        RAISE EXCEPTION 'HU-12: la sub-actividad no se elimino con su actividad padre';
    END IF;
    IF (SELECT progress_percentage FROM v_goal_progress WHERE goal_id = g_a) <> 50.00
       OR EXISTS (SELECT 1 FROM v_calendar_activities WHERE activity_id IN (act_parent, act_child))
       OR EXISTS (SELECT 1 FROM v_activity_current_schedule WHERE activity_id = act_parent) THEN
        RAISE EXCEPTION 'HU-12: una actividad eliminada sigue en progreso, agenda o calendario';
    END IF;
    UPDATE "ACTIVITY" SET deleted_at = NULL WHERE activity_id = act_parent;
    IF (SELECT deleted_at FROM "ACTIVITY" WHERE activity_id = act_child) IS NOT NULL
       OR (SELECT deletion_reason FROM "ACTIVITY" WHERE activity_id = act_parent) IS NOT NULL THEN
        RAISE EXCEPTION 'HU-12: restaurar no devolvio la sub-actividad o no limpio el motivo';
    END IF;
    UPDATE "ACTIVITY" SET deleted_at = CURRENT_TIMESTAMP WHERE activity_id = act_parent;

    -- ------------------------------------------------------- HU-44, HU-45, HU-48
    SELECT * INTO STRICT r FROM v_user_goal_summary WHERE user_id = u;
    IF r.open_goals <> 3 OR r.active_goals <> 3 OR r.goals_behind <> 2 THEN
        RAISE EXCEPTION 'HU-44: conteo de objetivos incorrecto (%, %, %)', r.open_goals, r.active_goals, r.goals_behind;
    END IF;
    IF (SELECT array_agg(goal_id ORDER BY sort_position) FROM v_goal_overview WHERE user_id = u)
       <> ARRAY[g_a, g_c, g_b] THEN
        RAISE EXCEPTION 'HU-45: el orden por prioridad debe ser alta, media, baja';
    END IF;
    UPDATE "USER_PREFERENCE" SET goals_sort_by = 'due_date' WHERE user_id = u;
    IF (SELECT array_agg(goal_id ORDER BY sort_position) FROM v_goal_overview WHERE user_id = u)
       <> ARRAY[g_b, g_c, g_a] THEN
        RAISE EXCEPTION 'HU-45/HU-49: la preferencia de orden por fecha limite no se aplico';
    END IF;
    UPDATE "USER_PREFERENCE" SET goals_sort_by = 'priority' WHERE user_id = u;
    IF EXISTS (SELECT 1 FROM v_goal_overview WHERE user_id = other_user) THEN
        RAISE EXCEPTION 'HU-44: la vision general mezcla usuarios';
    END IF;

    SELECT * INTO STRICT r FROM v_goal_overview WHERE goal_id = g_a;
    IF r.progress_percentage <> 50.00 OR r.pace_status <> 'behind' OR r.minutes_spent <> 50
       OR r.overdue_activities <> 1 OR r.next_activity_id <> act3 OR r.days_remaining <> 30
       OR r.remaining_activities <> 2 THEN
        RAISE EXCEPTION 'HU-48: datos de la vision general incorrectos';
    END IF;

    -- ------------------------------------------------------------------ HU-25
    SELECT * INTO STRICT r FROM v_goal_delay_alert WHERE goal_id = g_a;
    IF r.most_overdue_activity_id <> act2 OR r.max_days_late <> 1 OR r.delay_minutes <> 30
       OR r.alert_message <> '"Vencida" lleva 1 día de retraso.' THEN
        RAISE EXCEPTION 'HU-25: alerta incorrecta: %', r.alert_message;
    END IF;
    IF EXISTS (SELECT 1 FROM v_goal_delay_alert WHERE goal_id = g_b) THEN
        RAISE EXCEPTION 'HU-25: un objetivo al dia no debe generar alerta';
    END IF;
    IF (SELECT count(*) FROM v_pending_delay_alerts WHERE user_id = u) <> 2 THEN
        RAISE EXCEPTION 'HU-25: se esperaban dos alertas pendientes';
    END IF;
    INSERT INTO "NOTIFICATION" (user_id, goal_id, type, title, body, period_start)
    VALUES (u, g_a, 'delay_alert', 'Retraso', 'x', t);
    BEGIN
        INSERT INTO "NOTIFICATION" (user_id, goal_id, type, title, body, period_start)
        VALUES (u, g_a, 'delay_alert', 'Retraso', 'x', t);
        RAISE EXCEPTION 'HU-25: se duplico la alerta del dia';
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
    BEGIN
        INSERT INTO "NOTIFICATION" (user_id, type, title, body, period_start)
        VALUES (u, 'delay_alert', 'Retraso', 'x', t);
        RAISE EXCEPTION 'HU-25: se acepto una alerta sin objetivo';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    IF EXISTS (SELECT 1 FROM v_pending_delay_alerts WHERE goal_id = g_a) THEN
        RAISE EXCEPTION 'HU-25: una alerta ya entregada sigue pendiente';
    END IF;
    UPDATE "USER_PREFERENCE" SET delay_alerts_enabled = FALSE WHERE user_id = u;
    IF EXISTS (SELECT 1 FROM v_pending_delay_alerts WHERE user_id = u) THEN
        RAISE EXCEPTION 'HU-25/HU-49: se generan alertas con la preferencia desactivada';
    END IF;
    UPDATE "USER_PREFERENCE" SET delay_alerts_enabled = TRUE WHERE user_id = u;

    -- ------------------------------------------------------------------ HU-32
    PERFORM set_config('flowstep.change_reason', 'Semana de examenes', true);
    UPDATE "GOAL" SET status = 'paused' WHERE goal_id = g_c;
    PERFORM set_config('flowstep.change_reason', '', true);
    SELECT * INTO STRICT r FROM "GOAL_STATUS_HISTORY" WHERE goal_id = g_c;
    IF r.previous_status <> 'active' OR r.new_status <> 'paused' OR r.reason <> 'Semana de examenes' THEN
        RAISE EXCEPTION 'HU-32: no se registro la pausa en el historial';
    END IF;
    IF (SELECT pace_status FROM v_goal_overview WHERE goal_id = g_c) <> 'paused'
       OR (SELECT paused_since FROM v_goal_overview WHERE goal_id = g_c) IS NULL
       OR EXISTS (SELECT 1 FROM v_goal_delay_alert WHERE goal_id = g_c)
       OR EXISTS (SELECT 1 FROM v_calendar_day_summary WHERE user_id = u AND scheduled_date = t - 3) THEN
        RAISE EXCEPTION 'HU-32: un objetivo pausado se sigue evaluando como atrasado';
    END IF;
    BEGIN
        UPDATE "GOAL" SET status = 'completed' WHERE goal_id = g_c;
        RAISE EXCEPTION 'HU-32: se completo un objetivo pausado sin reanudarlo';
    EXCEPTION WHEN check_violation THEN NULL;
    END;

    -- ------------------------------------------------------------------ HU-33
    UPDATE "GOAL" SET status = 'active' WHERE goal_id = g_c;
    SELECT * INTO STRICT r FROM v_goal_pause_periods WHERE goal_id = g_c;
    IF r.resumed_at IS NULL OR r.paused_days <> 0 THEN
        RAISE EXCEPTION 'HU-33: el periodo de pausa no se cerro al reanudar';
    END IF;
    IF (SELECT count(*) FROM "GOAL_STATUS_HISTORY" WHERE goal_id = g_c) <> 2
       OR (SELECT closed_at FROM "GOAL" WHERE goal_id = g_c) IS NOT NULL THEN
        RAISE EXCEPTION 'HU-33: historial o fecha de cierre incorrectos al reanudar';
    END IF;

    -- ------------------------------------------------------------------ HU-34
    UPDATE "GOAL" SET due_date = t + 1 WHERE goal_id = g_a;
    SELECT * INTO STRICT r FROM "GOAL_DEADLINE_HISTORY" WHERE goal_id = g_a;
    IF r.previous_due_date <> t + 30 OR r.new_due_date <> t + 1 THEN
        RAISE EXCEPTION 'HU-34: no se registro el cambio de fecha limite';
    END IF;
    IF (SELECT activities_after_due_date FROM v_goal_overview WHERE goal_id = g_a) <> 1 THEN
        RAISE EXCEPTION 'HU-34: no se detectaron actividades posteriores a la nueva fecha';
    END IF;
    UPDATE "GOAL" SET due_date = t + 40 WHERE goal_id = g_a;
    UPDATE "GOAL" SET title = 'A alta' WHERE goal_id = g_a;   -- sin cambio de fecha
    IF (SELECT count(*) FROM "GOAL_DEADLINE_HISTORY" WHERE goal_id = g_a) <> 2 THEN
        RAISE EXCEPTION 'HU-34: el historial debe tener solo los cambios reales de fecha';
    END IF;
    BEGIN
        UPDATE "GOAL" SET due_date = t - 1 WHERE goal_id = g_a;
        RAISE EXCEPTION 'HU-34: se acepto una fecha limite en el pasado';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    BEGIN
        UPDATE "GOAL" SET start_date = t + 5, due_date = t + 2 WHERE goal_id = g_a;
        RAISE EXCEPTION 'HU-34: se acepto una fecha limite anterior al inicio';
    EXCEPTION WHEN check_violation THEN NULL;
    END;

    -- ------------------------------------------------------------ HU-46, HU-47
    UPDATE "GOAL" SET status = 'archived' WHERE goal_id = g_b;
    IF (SELECT closed_at FROM "GOAL" WHERE goal_id = g_b) IS NULL THEN
        RAISE EXCEPTION 'HU-46: archivar debe registrar la fecha de cierre';
    END IF;
    IF EXISTS (SELECT 1 FROM v_calendar_activities WHERE goal_id = g_b)
       OR EXISTS (SELECT 1 FROM v_goal_delay_alert WHERE goal_id = g_b) THEN
        RAISE EXCEPTION 'HU-46: un objetivo archivado sigue en calendario o alertas';
    END IF;
    BEGIN
        UPDATE "GOAL" SET due_date = t + 90 WHERE goal_id = g_b;
        RAISE EXCEPTION 'HU-34/HU-46: se cambio la fecha de un objetivo archivado';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    BEGIN
        UPDATE "GOAL" SET status = 'paused' WHERE goal_id = g_b;
        RAISE EXCEPTION 'HU-46: se paso de archivado a pausado';
    EXCEPTION WHEN check_violation THEN NULL;
    END;

    UPDATE "ACTIVITY" SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE activity_id = n;
    UPDATE "GOAL" SET status = 'completed' WHERE goal_id = g_c;
    IF (SELECT count(*) FROM v_goal_history WHERE user_id = u) <> 2 THEN
        RAISE EXCEPTION 'HU-47: se esperaban un objetivo archivado y uno completado';
    END IF;
    SELECT * INTO STRICT r FROM v_goal_history WHERE goal_id = g_c;
    IF r.progress_percentage <> 100.00 OR r.closed_at IS NULL OR r.status_before_closing <> 'active' THEN
        RAISE EXCEPTION 'HU-47: datos del objetivo completado incorrectos';
    END IF;
    IF (SELECT completed_goals FROM v_user_goal_summary WHERE user_id = u) <> 1
       OR (SELECT archived_goals FROM v_user_goal_summary WHERE user_id = u) <> 1 THEN
        RAISE EXCEPTION 'HU-44/HU-47: totales por estado incorrectos';
    END IF;

    UPDATE "GOAL" SET status = 'active' WHERE goal_id = g_b;   -- restaurar archivado
    IF (SELECT closed_at FROM "GOAL" WHERE goal_id = g_b) IS NOT NULL THEN
        RAISE EXCEPTION 'HU-46: restaurar un objetivo archivado debe limpiar closed_at';
    END IF;

    -- ------------------------------------------------------------------ HU-50
    SELECT * INTO STRICT r FROM v_calendar_activities WHERE activity_id = act2;
    IF r.scheduled_date <> t - 1 OR r.version_number <> 2 OR NOT r.is_overdue OR r.goal_title <> 'A alta' THEN
        RAISE EXCEPTION 'HU-50: el calendario no usa la version vigente';
    END IF;
    SELECT * INTO STRICT r FROM v_calendar_day_summary WHERE user_id = u AND scheduled_date = t - 2;
    IF r.day_status <> 'completed' OR r.total_activities <> 1 THEN
        RAISE EXCEPTION 'HU-50: resumen diario del calendario incorrecto';
    END IF;
    IF (SELECT day_status FROM v_calendar_day_summary WHERE user_id = u AND scheduled_date = t - 1) <> 'overdue'
       OR (SELECT day_status FROM v_calendar_day_summary WHERE user_id = u AND scheduled_date = t + 2) <> 'pending' THEN
        RAISE EXCEPTION 'HU-50: estados de dia incorrectos';
    END IF;

    -- ------------------------------------------------------------------ HU-23
    -- Planificadas en el periodo: act1 (hecha), act2 (vencida) y la de C (hecha).
    j := fn_progress_summary(u, t - 6, t);
    IF (j->>'planned_activities')::int <> 3 OR (j->>'completed_planned_activities')::int <> 2
       OR (j->>'pending_activities')::int <> 1 OR (j->>'completion_rate')::numeric <> 66.67
       OR (j->>'completed_activities')::int <> 2 OR (j->>'minutes_spent')::int <> 50 OR (j->>'active_days')::int < 1
       OR jsonb_array_length(j->'daily') <> 7 THEN
        RAISE EXCEPTION 'HU-23: resumen del periodo incorrecto: %', j;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(j->'goals') e
                   WHERE (e->>'goal_id')::int = g_a AND (e->>'minutes_spent')::int = 50) THEN
        RAISE EXCEPTION 'HU-23: falta el desglose por objetivo';
    END IF;
    BEGIN
        PERFORM fn_progress_summary(u, t, t - 1);
        RAISE EXCEPTION 'HU-23: se acepto un periodo invertido';
    EXCEPTION WHEN invalid_parameter_value THEN NULL;
    END;

    UPDATE "USER_PREFERENCE" SET summary_frequency = 'daily', summary_time = '00:00' WHERE user_id = u;
    SELECT * INTO STRICT r FROM v_pending_periodic_summaries WHERE user_id = u;
    IF r.period_start <> t OR r.period_end <> t THEN
        RAISE EXCEPTION 'HU-23: periodo diario incorrecto';
    END IF;

    v_text := CASE EXTRACT(ISODOW FROM t - 1)::int WHEN 1 THEN 'monday' WHEN 2 THEN 'tuesday'
              WHEN 3 THEN 'wednesday' WHEN 4 THEN 'thursday' WHEN 5 THEN 'friday'
              WHEN 6 THEN 'saturday' ELSE 'sunday' END;
    UPDATE "USER_PREFERENCE" SET summary_frequency = 'weekly',
        summary_day_of_week = v_text::"AVAILABILITY_day_of_week_enum" WHERE user_id = u;
    SELECT * INTO STRICT r FROM v_pending_periodic_summaries WHERE user_id = u;
    IF r.period_start <> t - 7 OR r.period_end <> t - 1 THEN
        RAISE EXCEPTION 'HU-23: periodo semanal incorrecto (% a %)', r.period_start, r.period_end;
    END IF;
    INSERT INTO "NOTIFICATION" (user_id, type, title, body, payload, period_start, period_end)
    VALUES (u, 'periodic_summary', 'Resumen', 'x', fn_progress_summary(u, r.period_start, r.period_end),
            r.period_start, r.period_end);
    IF EXISTS (SELECT 1 FROM v_pending_periodic_summaries WHERE user_id = u) THEN
        RAISE EXCEPTION 'HU-23: un resumen ya entregado sigue pendiente';
    END IF;

    UPDATE "USER_PREFERENCE" SET summary_frequency = 'monthly' WHERE user_id = u;
    SELECT * INTO STRICT r FROM v_pending_periodic_summaries WHERE user_id = u;
    IF r.period_start <> (date_trunc('month', t::timestamp) - INTERVAL '1 month')::date
       OR r.period_end <> (date_trunc('month', t::timestamp)::date - 1) THEN
        RAISE EXCEPTION 'HU-23: periodo mensual incorrecto';
    END IF;
    UPDATE "USER_PREFERENCE" SET periodic_summary_enabled = FALSE WHERE user_id = u;
    IF EXISTS (SELECT 1 FROM v_pending_periodic_summaries WHERE user_id = u) THEN
        RAISE EXCEPTION 'HU-23/HU-49: resumen pendiente con la preferencia desactivada';
    END IF;
    IF EXISTS (SELECT 1 FROM v_pending_periodic_summaries WHERE user_id = other_user
               AND period_end < (SELECT created_at::date FROM "APP_USER" WHERE user_id = other_user)) THEN
        RAISE EXCEPTION 'HU-23: resumen de un periodo anterior al registro';
    END IF;

    -- ------------------------------------------------------------------ HU-55
    INSERT INTO "AUTH_SESSION" (user_id, expires_at) VALUES (u, CURRENT_TIMESTAMP + INTERVAL '7 days')
    RETURNING session_id INTO sid;
    IF NOT EXISTS (SELECT 1 FROM v_active_auth_session WHERE session_id = sid AND user_id = u) THEN
        RAISE EXCEPTION 'HU-55: una sesion nueva debe estar vigente';
    END IF;
    UPDATE "AUTH_SESSION" SET revoked_at = CURRENT_TIMESTAMP WHERE session_id = sid;
    IF EXISTS (SELECT 1 FROM v_active_auth_session WHERE session_id = sid) THEN
        RAISE EXCEPTION 'HU-55: una sesion cerrada sigue vigente';
    END IF;
    INSERT INTO "AUTH_SESSION" (user_id, created_at, expires_at)
    VALUES (u, CURRENT_TIMESTAMP - INTERVAL '8 days', CURRENT_TIMESTAMP - INTERVAL '1 day')
    RETURNING session_id INTO sid;
    IF EXISTS (SELECT 1 FROM v_active_auth_session WHERE session_id = sid) THEN
        RAISE EXCEPTION 'HU-55: una sesion expirada sigue vigente';
    END IF;
    BEGIN
        INSERT INTO "AUTH_SESSION" (user_id, expires_at) VALUES (u, CURRENT_TIMESTAMP - INTERVAL '1 hour');
        RAISE EXCEPTION 'HU-55: se acepto una sesion que expira antes de crearse';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    INSERT INTO "AUTH_SESSION" (user_id, expires_at) VALUES (u, CURRENT_TIMESTAMP + INTERVAL '1 day')
    RETURNING session_id INTO sid;
    UPDATE "APP_USER" SET is_active = FALSE WHERE user_id = u;
    IF EXISTS (SELECT 1 FROM v_active_auth_session WHERE session_id = sid) THEN
        RAISE EXCEPTION 'HU-55: la sesion de un usuario desactivado sigue vigente';
    END IF;

    RAISE NOTICE 'Sprint 3 (gestion de objetivos): todas las pruebas pasaron';
END $$;

ROLLBACK;
