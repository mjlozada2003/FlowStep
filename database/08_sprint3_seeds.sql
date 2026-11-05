-- Demostracion del Sprint 3. Ejecutar despues de 07.
-- Usuario: sprint3.demo@flowstep.test / Password123!
-- Las fechas se fijan en la primera ejecucion y se conservan al repetir el script.
BEGIN;

DO $$
DECLARE
    demo_user INTEGER;
    demo_goal INTEGER;
    demo_stage INTEGER;
    demo_activity INTEGER;
    demo_schedule INTEGER;
    anchor_date DATE;
    example RECORD;
BEGIN
    -- Serializa ejecuciones simultaneas de esta demostracion.
    PERFORM pg_advisory_xact_lock(hashtext('flowstep_sprint3_seeds'));

    INSERT INTO "APP_USER" (name, email, password_hash)
    VALUES ('Demo Sprint 3', 'sprint3.demo@flowstep.test',
        '$2b$10$U32/WmJ2O0skqgISjUHocOlArLXsEMgjjF.LVO3.0Wji0lO8XpyoS')
    ON CONFLICT (email) DO NOTHING;
    SELECT user_id INTO STRICT demo_user
    FROM "APP_USER" WHERE email = 'sprint3.demo@flowstep.test';

    SELECT start_date + 14 INTO anchor_date FROM "GOAL"
    WHERE user_id = demo_user AND title = 'Sprint 3 - Practicar SQL'
    ORDER BY goal_id LIMIT 1;
    anchor_date := COALESCE(anchor_date, CURRENT_DATE);

    FOR example IN
        SELECT * FROM (VALUES
            ('Sprint 3 - Practicar SQL', 'Consultar y filtrar datos', 1, 60, 'completed', -9, 45, 2, 'Comprendi los filtros con ejercicios.'),
            ('Sprint 3 - Practicar SQL', 'Resolver consultas con JOIN', 2, 60, 'in_progress', -2, 20, 5, 'Me cuesta relacionar varias tablas.'),
            ('Sprint 3 - Practicar SQL', 'Practicar funciones de agregacion', 3, 120, 'pending', 7, 15, 3, 'Primera lectura del material.'),
            ('Sprint 3 - Aprender modelado', 'Identificar entidades y relaciones', 1, 30, 'completed', -3, 30, 2, 'Ejercicio completado sin dificultad.'),
            ('Sprint 3 - Aprender modelado', 'Normalizar el modelo', 2, 30, 'pending', 14, NULL, NULL, NULL),
            ('Sprint 3 - Meta sin agenda', 'Explorar indices de PostgreSQL', 1, 30, 'pending', NULL, NULL, NULL, NULL)
        ) AS examples(goal_title, activity_title, activity_order, estimated_minutes,
                      activity_status, schedule_offset, minutes_spent, difficulty, notes)
    LOOP
        SELECT goal_id INTO demo_goal FROM "GOAL"
        WHERE user_id = demo_user AND title = example.goal_title ORDER BY goal_id LIMIT 1;
        IF demo_goal IS NULL THEN
            INSERT INTO "GOAL" (user_id, title, user_description, start_date, due_date)
            VALUES (demo_user, example.goal_title, 'Datos simulados para demostrar el seguimiento.',
                    anchor_date - 14, anchor_date + 28)
            RETURNING goal_id INTO demo_goal;
        END IF;

        SELECT stage_id INTO demo_stage FROM "STAGE"
        WHERE goal_id = demo_goal AND sort_order = 1 ORDER BY stage_id LIMIT 1;
        IF demo_stage IS NULL THEN
            INSERT INTO "STAGE" (goal_id, name, sort_order)
            VALUES (demo_goal, 'Practica guiada', 1) RETURNING stage_id INTO demo_stage;
        END IF;

        SELECT activity_id INTO demo_activity FROM "ACTIVITY"
        WHERE stage_id = demo_stage AND title = example.activity_title ORDER BY activity_id LIMIT 1;
        IF demo_activity IS NULL THEN
            INSERT INTO "ACTIVITY" (stage_id, title, type, sort_order, estimated_minutes, status, completed_at)
            VALUES (demo_stage, example.activity_title, 'practice', example.activity_order,
                    example.estimated_minutes, example.activity_status::"ACTIVITY_status_enum",
                    CASE WHEN example.activity_status = 'completed'
                         THEN (anchor_date + example.schedule_offset) + TIME '19:00' END)
            RETURNING activity_id INTO demo_activity;
        END IF;

        IF example.schedule_offset IS NOT NULL THEN
            INSERT INTO "ACTIVITY_SCHEDULE" (activity_id, version_number, scheduled_date,
                                            start_time, end_time, reason, created_at)
            VALUES (demo_activity, 1, anchor_date + example.schedule_offset,
                    '18:00', '18:00'::time + make_interval(mins => example.estimated_minutes),
                    'initial_plan', (anchor_date - 14) + TIME '09:00')
            ON CONFLICT (activity_id, version_number) DO NOTHING;
        END IF;

        IF example.minutes_spent IS NOT NULL THEN
            INSERT INTO "WORK_SESSION" (activity_id, session_date, minutes_spent,
                                       difficulty_level, difficulty_notes, created_at)
            SELECT demo_activity,
                   anchor_date + LEAST(example.schedule_offset, -1), example.minutes_spent,
                   example.difficulty, example.notes,
                   (anchor_date + LEAST(example.schedule_offset, -1)) + TIME '18:45'
            WHERE NOT EXISTS (
                SELECT 1 FROM "WORK_SESSION"
                WHERE activity_id = demo_activity AND difficulty_notes = example.notes
            );
        END IF;

        IF example.activity_status <> 'pending' THEN
            INSERT INTO "ACTIVITY_STATUS_HISTORY" (activity_id, previous_status, new_status, changed_at)
            SELECT demo_activity, 'pending', example.activity_status::"ACTIVITY_status_enum",
                   (anchor_date + example.schedule_offset) + TIME '19:00'
            WHERE NOT EXISTS (
                SELECT 1 FROM "ACTIVITY_STATUS_HISTORY"
                WHERE activity_id = demo_activity AND previous_status = 'pending'
                  AND new_status = example.activity_status::"ACTIVITY_status_enum"
            );
        END IF;

        IF example.activity_title = 'Consultar y filtrar datos' THEN
            INSERT INTO "WORK_SESSION" (activity_id, session_date, minutes_spent,
                                       difficulty_level, difficulty_notes, created_at)
            SELECT demo_activity, anchor_date - 10, 15, 3, 'Repaso inicial de SELECT.',
                   (anchor_date - 10) + TIME '18:15'
            WHERE NOT EXISTS (
                SELECT 1 FROM "WORK_SESSION" WHERE activity_id = demo_activity
                AND difficulty_notes = 'Repaso inicial de SELECT.'
            );
        END IF;

        IF example.activity_title = 'Resolver consultas con JOIN' THEN
            SELECT schedule_id INTO STRICT demo_schedule FROM "ACTIVITY_SCHEDULE"
            WHERE activity_id = demo_activity AND version_number = 1;
            INSERT INTO "SCHEDULE_MISS" (schedule_id, reason_id, details, recorded_at)
            SELECT demo_schedule, reason_id, 'Necesite mas practica para comprender los JOIN.',
                   (anchor_date - 2) + TIME '19:10'
            FROM "MISS_REASON" WHERE name = 'Dificultad con la actividad'
            ON CONFLICT (schedule_id) DO NOTHING;

            INSERT INTO "ACTIVITY_SCHEDULE" (activity_id, version_number, scheduled_date,
                                            start_time, end_time, reason, created_at)
            VALUES (demo_activity, 2, anchor_date - 1, '18:00', '19:00',
                    'user_reschedule', (anchor_date - 2) + TIME '19:15')
            ON CONFLICT (activity_id, version_number) DO NOTHING;
        END IF;
    END LOOP;
END $$;

COMMIT;
