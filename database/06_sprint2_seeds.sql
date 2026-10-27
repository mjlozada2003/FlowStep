-- FLOWSTEP - Demo aislada del Sprint 2; no depende de IDs del Sprint 1.
-- Usuario: sprint2.demo@flowstep.test / Password123! (bcrypt, costo 10).
-- El plan es un ejemplo determinista, no una respuesta real de Gemini.
BEGIN;

DO $$
DECLARE
    demo_user INTEGER;
    demo_goal INTEGER;
    demo_stage INTEGER;
    planned_activity INTEGER;
    manual_activity INTEGER;
    monday DATE;
BEGIN
    INSERT INTO "APP_USER" (name, email, password_hash)
    VALUES ('Demo Sprint 2', 'sprint2.demo@flowstep.test',
        '$2b$10$U32/WmJ2O0skqgISjUHocOlArLXsEMgjjF.LVO3.0Wji0lO8XpyoS')
    ON CONFLICT (email) DO NOTHING;
    SELECT user_id INTO demo_user FROM "APP_USER" WHERE email = 'sprint2.demo@flowstep.test';

    INSERT INTO "AVAILABILITY" (user_id, day_of_week, start_time, end_time)
    VALUES (demo_user, 'monday', '18:00', '19:00'),
           (demo_user, 'wednesday', '18:00', '19:00'),
           (demo_user, 'friday', '17:00', '17:30')
    ON CONFLICT (user_id, day_of_week, start_time) DO NOTHING;

    SELECT goal_id, start_date INTO demo_goal, monday FROM "GOAL"
    WHERE user_id = demo_user AND title = 'Sprint 2 - Plan adaptado a disponibilidad'
    ORDER BY goal_id LIMIT 1;
    IF demo_goal IS NULL THEN
        monday := CURRENT_DATE + ((8 - EXTRACT(ISODOW FROM CURRENT_DATE)::integer) % 7);
        INSERT INTO "GOAL" (user_id, title, user_description, start_date, due_date, priority)
        VALUES (demo_user, 'Sprint 2 - Plan adaptado a disponibilidad',
            'Practicar SQL con sesiones cortas compatibles con la rutina semanal.',
            monday, monday + 14, 'high')
        RETURNING goal_id INTO demo_goal;
    END IF;

    SELECT stage_id INTO demo_stage FROM "STAGE"
    WHERE goal_id = demo_goal AND sort_order = 1 ORDER BY stage_id LIMIT 1;
    IF demo_stage IS NULL THEN
        INSERT INTO "STAGE" (goal_id, name, description, sort_order)
        VALUES (demo_goal, 'Consultas y practica', 'Actividades breves y reprogramables.', 1)
        RETURNING stage_id INTO demo_stage;
    END IF;

    SELECT activity_id INTO planned_activity FROM "ACTIVITY"
    WHERE stage_id = demo_stage AND title = 'Repasar filtros SQL' ORDER BY activity_id LIMIT 1;
    IF planned_activity IS NULL THEN
        INSERT INTO "ACTIVITY" (stage_id, title, type, estimated_minutes, sort_order, origin)
        VALUES (demo_stage, 'Repasar filtros SQL', 'learning', 15, 1, 'initial_plan')
        RETURNING activity_id INTO planned_activity;
    END IF;

    SELECT activity_id INTO manual_activity FROM "ACTIVITY"
    WHERE stage_id = demo_stage AND title = 'Resolver mis ejercicios SQL' ORDER BY activity_id LIMIT 1;
    IF manual_activity IS NULL THEN
        INSERT INTO "ACTIVITY" (stage_id, title, description, type, priority,
                                estimated_minutes, sort_order, origin, status)
        VALUES (demo_stage, 'Resolver mis ejercicios SQL', 'Actividad propia del usuario.',
            'practice', 'high', 30, 2, 'manual', 'pending')
        RETURNING activity_id INTO manual_activity;
    END IF;

    INSERT INTO "ACTIVITY_SCHEDULE" (activity_id, version_number, scheduled_date,
                                    start_time, end_time, reason)
    VALUES (planned_activity, 1, monday, '18:00', '18:30', 'initial_plan'),
           (planned_activity, 2, monday + 2, '18:00', '18:30', 'user_reschedule'),
           (planned_activity, 3, monday + 4, '17:00', '17:15', 'ai_adjustment'),
           (manual_activity, 1, monday, '18:30', '19:00', 'initial_plan')
    ON CONFLICT (activity_id, version_number) DO NOTHING;
END $$;

COMMIT;
