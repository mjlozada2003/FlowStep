-- Ejecutar con psql -v ON_ERROR_STOP=1 sobre una base de prueba.
BEGIN;

DO $$
DECLARE
    test_user INTEGER;
    test_goal INTEGER;
    test_stage INTEGER;
    first_activity INTEGER;
    second_activity INTEGER;
    missed_schedule INTEGER;
    miss_reason INTEGER;
    pace RECORD;
    weekly RECORD;
    week_start_date DATE := date_trunc('week', CURRENT_DATE::timestamp)::date;
BEGIN
    INSERT INTO "APP_USER" (name, email, password_hash)
    VALUES ('Sprint 3 test', 'sprint3-' || txid_current() || '@flowstep.test', 'test')
    RETURNING user_id INTO test_user;

    INSERT INTO "GOAL" (user_id, title, user_description)
    VALUES (test_user, 'Meta de prueba', 'Seguimiento')
    RETURNING goal_id INTO test_goal;

    IF (SELECT pace_status FROM v_goal_pace WHERE goal_id = test_goal) IS DISTINCT FROM 'no_schedule' THEN
        RAISE EXCEPTION 'HU-24: una meta sin agenda debe quedar sin referencia';
    END IF;

    INSERT INTO "STAGE" (goal_id, name) VALUES (test_goal, 'Etapa') RETURNING stage_id INTO test_stage;
    INSERT INTO "ACTIVITY" (stage_id, title, type, estimated_minutes)
    VALUES (test_stage, 'Primera', 'practice', 60) RETURNING activity_id INTO first_activity;
    INSERT INTO "ACTIVITY" (stage_id, title, type, estimated_minutes)
    VALUES (test_stage, 'Segunda', 'practice', 60) RETURNING activity_id INTO second_activity;

    INSERT INTO "ACTIVITY_SCHEDULE" (activity_id, version_number, scheduled_date)
    VALUES (first_activity, 1, week_start_date) RETURNING schedule_id INTO missed_schedule;
    INSERT INTO "ACTIVITY_SCHEDULE" (activity_id, version_number, scheduled_date)
    VALUES (first_activity, 2, week_start_date), (second_activity, 1, week_start_date + 7);

    IF (SELECT pace_status FROM v_goal_pace WHERE goal_id = test_goal) IS DISTINCT FROM 'behind' THEN
        RAISE EXCEPTION 'HU-24: falta completar los minutos planificados a la fecha';
    END IF;

    INSERT INTO "WORK_SESSION" (activity_id, session_date, minutes_spent, difficulty_level, difficulty_notes)
    VALUES (first_activity, week_start_date, 15, 4, 'Práctica adicional'),
           (first_activity, week_start_date, 20, NULL, NULL);

    BEGIN
        INSERT INTO "WORK_SESSION" (activity_id, minutes_spent) VALUES (first_activity, 0);
        RAISE EXCEPTION 'HU-17: se aceptó una sesión sin minutos';
    EXCEPTION WHEN check_violation THEN
        NULL;
    END;
    BEGIN
        INSERT INTO "WORK_SESSION" (activity_id, minutes_spent, difficulty_level)
        VALUES (first_activity, 15, 6);
        RAISE EXCEPTION 'HU-18: se aceptó una dificultad fuera de escala';
    EXCEPTION WHEN check_violation THEN
        NULL;
    END;

    SELECT reason_id INTO STRICT miss_reason FROM "MISS_REASON" WHERE name = 'Imprevisto';
    INSERT INTO "SCHEDULE_MISS" (schedule_id, reason_id) VALUES (missed_schedule, miss_reason);
    BEGIN
        INSERT INTO "SCHEDULE_MISS" (schedule_id, reason_id) VALUES (missed_schedule, miss_reason);
        RAISE EXCEPTION 'HU-19: se aceptaron dos incidencias para la misma versión';
    EXCEPTION WHEN unique_violation THEN
        NULL;
    END;

    UPDATE "ACTIVITY" SET status = 'completed', completed_at = CURRENT_TIMESTAMP
    WHERE activity_id = first_activity;
    INSERT INTO "ACTIVITY_STATUS_HISTORY" (activity_id, previous_status, new_status)
    VALUES (first_activity, 'pending', 'completed');

    IF (SELECT count(*) FROM v_activity_timeline WHERE user_id = test_user AND activity_id = first_activity) <> 6
       OR (SELECT details->>'difficulty_level' FROM v_activity_timeline
           WHERE activity_id = first_activity AND event_type = 'work_session'
             AND details->>'minutes_spent' = '15') IS DISTINCT FROM '4' THEN
        RAISE EXCEPTION 'HU-20: faltan eventos o datos en la cronología';
    END IF;

    SELECT * INTO STRICT pace FROM v_goal_pace WHERE goal_id = test_goal;
    IF pace.progress_percentage IS DISTINCT FROM 50.00 OR pace.expected_progress_percentage IS DISTINCT FROM 50.00
       OR pace.pace_status IS DISTINCT FROM 'on_track' THEN
        RAISE EXCEPTION 'HU-22/HU-24: se esperaba 50%% real y planificado';
    END IF;

    SELECT * INTO STRICT weekly FROM v_goal_weekly_progress
    WHERE goal_id = test_goal AND week_start = week_start_date;
    IF weekly.minutes_spent IS DISTINCT FROM 35 OR weekly.completed_estimated_minutes IS DISTINCT FROM 60
       OR weekly.planned_estimated_minutes IS DISTINCT FROM 60 THEN
        RAISE EXCEPTION 'HU-21: se mezclaron esfuerzo real, avance y versiones de agenda';
    END IF;
END $$;

ROLLBACK;
