-- Demostracion del Sprint 5 (aprendizaje y adaptacion). Ejecutar despues de 13.
-- Usuario: aprendizaje.demo@flowstep.test / Password123!
-- Replica los ejemplos de docs/api_contract.md ("Docker y Despliegue").
-- Las fechas se fijan en la primera ejecucion; repetir el script no duplica filas.
BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.s5_activity(
    p_stage INTEGER, p_title TEXT, p_type TEXT, p_order INTEGER, p_minutes INTEGER, p_status TEXT,
    p_anchor DATE, p_offset INTEGER, p_session_minutes INTEGER,
    p_difficulty INTEGER DEFAULT NULL, p_notes TEXT DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
    v INTEGER;
BEGIN
    SELECT activity_id INTO v FROM "ACTIVITY" WHERE stage_id = p_stage AND title = p_title
    ORDER BY activity_id LIMIT 1;
    IF v IS NULL THEN
        INSERT INTO "ACTIVITY" (stage_id, title, type, sort_order, estimated_minutes, status, completed_at)
        VALUES (p_stage, p_title, p_type::"ACTIVITY_type_enum", p_order, p_minutes,
                p_status::"ACTIVITY_status_enum",
                CASE WHEN p_status = 'completed' THEN (p_anchor + p_offset) + TIME '19:00' END)
        RETURNING activity_id INTO v;
        IF p_offset IS NOT NULL THEN
            INSERT INTO "ACTIVITY_SCHEDULE" (activity_id, version_number, scheduled_date, start_time,
                                            end_time, reason, created_at)
            VALUES (v, 1, p_anchor + p_offset, '18:00', '18:00'::time + make_interval(mins => p_minutes),
                    'initial_plan', (p_anchor - 21) + TIME '09:00');
        END IF;
        IF p_session_minutes IS NOT NULL THEN
            INSERT INTO "WORK_SESSION" (activity_id, session_date, minutes_spent, difficulty_level,
                                        difficulty_notes, created_at)
            VALUES (v, p_anchor + p_offset, p_session_minutes, p_difficulty, p_notes,
                    (p_anchor + p_offset) + TIME '18:50');
        END IF;
    END IF;
    RETURN v;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION pg_temp.s5_topic(p_name TEXT, p_description TEXT)
RETURNS INTEGER AS $$
DECLARE
    v INTEGER;
BEGIN
    SELECT topic_id INTO v FROM "TOPIC" WHERE lower(btrim(name)) = lower(btrim(p_name));
    IF v IS NULL THEN
        INSERT INTO "TOPIC" (name, description) VALUES (p_name, p_description) RETURNING topic_id INTO v;
    END IF;
    RETURN v;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION pg_temp.s5_resource(
    p_topic INTEGER, p_title TEXT, p_type TEXT, p_category TEXT, p_minutes INTEGER,
    p_url TEXT, p_content TEXT, p_essential BOOLEAN)
RETURNS INTEGER AS $$
DECLARE
    v INTEGER;
BEGIN
    SELECT resource_id INTO v FROM "LEARNING_RESOURCE" WHERE title = p_title ORDER BY resource_id LIMIT 1;
    IF v IS NULL THEN
        INSERT INTO "LEARNING_RESOURCE" (topic_id, title, type, category, duration_minutes, url, content, is_essential)
        VALUES (p_topic, p_title, p_type::"LEARNING_RESOURCE_type_enum", p_category, p_minutes,
                p_url, p_content, p_essential)
        RETURNING resource_id INTO v;
    END IF;
    RETURN v;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION pg_temp.s5_weekday(p_from DATE, p_n INTEGER)
RETURNS DATE AS $$
    -- n-esimo dia habil (lunes a viernes) posterior a p_from.
    SELECT d::date FROM generate_series(p_from + 1, p_from + 30, INTERVAL '1 day') d
    WHERE EXTRACT(ISODOW FROM d) BETWEEN 1 AND 5
    ORDER BY d OFFSET p_n - 1 LIMIT 1;
$$ LANGUAGE sql;

DO $$
DECLARE
    u INTEGER;
    a DATE;
    g INTEGER;
    s1 INTEGER; s2 INTEGER;
    act_install INTEGER; act_dockerfile INTEGER; act_compose_doc INTEGER;
    act_compose_lab INTEGER; act_volumes INTEGER; act_reinforce INTEGER;
    t_containers INTEGER; t_dockerfile INTEGER; t_compose INTEGER; t_volumes INTEGER; t_cloud INTEGER;
    r_compose_guide INTEGER; r_compose_lab INTEGER; r_container_intro INTEGER;
    asm INTEGER; att INTEGER; q INTEGER;
    rec_delay INTEGER; rec_gap INTEGER; rec_old INTEGER;
    p_bal INTEGER; p_learn INTEGER;
    question RECORD;
BEGIN
    PERFORM pg_advisory_xact_lock(hashtext('flowstep_learning_adaptation_seeds'));

    INSERT INTO "APP_USER" (name, email, password_hash)
    VALUES ('Diego Rojas', 'aprendizaje.demo@flowstep.test',
            '$2b$10$U32/WmJ2O0skqgISjUHocOlArLXsEMgjjF.LVO3.0Wji0lO8XpyoS')
    ON CONFLICT (email) DO NOTHING;
    SELECT user_id INTO STRICT u FROM "APP_USER" WHERE email = 'aprendizaje.demo@flowstep.test';

    SELECT goal_id, start_date + 21 INTO g, a FROM "GOAL"
    WHERE user_id = u AND title = 'Docker y Despliegue' ORDER BY goal_id LIMIT 1;
    a := COALESCE(a, CURRENT_DATE);

    IF g IS NULL THEN
        INSERT INTO "GOAL" (user_id, title, user_description, start_date, due_date, priority)
        VALUES (u, 'Docker y Despliegue',
                'Quiero aprender a contenerizar y desplegar mis aplicaciones con Docker.',
                a - 21, a + 30, 'high')
        RETURNING goal_id INTO g;
        INSERT INTO "STAGE" (goal_id, name, sort_order) VALUES (g, 'Fundamentos de contenedores', 1);
        INSERT INTO "STAGE" (goal_id, name, sort_order) VALUES (g, 'Orquestación y persistencia', 2);
    END IF;
    SELECT stage_id INTO STRICT s1 FROM "STAGE" WHERE goal_id = g AND sort_order = 1;
    SELECT stage_id INTO STRICT s2 FROM "STAGE" WHERE goal_id = g AND sort_order = 2;

    -- HU-28: disponibilidad para replanificar (lunes a viernes de 18:00 a 20:00).
    INSERT INTO "AVAILABILITY" (user_id, day_of_week, start_time, end_time)
    VALUES (u, 'monday', '18:00', '20:00'), (u, 'tuesday', '18:00', '20:00'),
           (u, 'wednesday', '18:00', '20:00'), (u, 'thursday', '18:00', '20:00'),
           (u, 'friday', '18:00', '20:00')
    ON CONFLICT (user_id, day_of_week, start_time) DO NOTHING;

    -- Plan: dos actividades completadas (HU-29), una atrasada con dificultad (HU-04, HU-26).
    act_install := pg_temp.s5_activity(s1, 'Instalar Docker y ejecutar primeros contenedores', 'learning', 1, 30, 'completed', a, -14, 35, 2);
    act_dockerfile := pg_temp.s5_activity(s1, 'Escribir un Dockerfile para mi API', 'practice', 2, 60, 'completed', a, -9, 70, 3);
    act_compose_doc := pg_temp.s5_activity(s2, 'Leer documentación oficial de Docker Compose', 'learning', 1, 45, 'pending', a, -2, 20, 5,
                                           'Me costó entender la configuración de servicios y redes.');
    act_compose_lab := pg_temp.s5_activity(s2, 'Levantar la app y la base con Compose', 'practice', 2, 60, 'pending', a, 2, NULL);
    act_volumes := pg_temp.s5_activity(s2, 'Volúmenes y redes de Docker', 'learning', 3, 40, 'pending', a, 5, NULL);

    INSERT INTO "SCHEDULE_MISS" (schedule_id, reason_id, details, recorded_at)
    SELECT sc.schedule_id, mr.reason_id, 'No entendí cómo conectar los servicios.', (a - 2) + TIME '21:00'
    FROM "ACTIVITY_SCHEDULE" sc, "MISS_REASON" mr
    WHERE sc.activity_id = act_compose_doc AND sc.version_number = 1 AND mr.name = 'Dificultad con la actividad'
      AND NOT EXISTS (SELECT 1 FROM "SCHEDULE_MISS" m WHERE m.schedule_id = sc.schedule_id);

    -- HU-37: conocimientos del objetivo.
    t_containers := pg_temp.s5_topic('Contenedores vs VMs', 'Diferencias de aislamiento y consumo entre contenedores y máquinas virtuales.');
    t_dockerfile := pg_temp.s5_topic('Dockerfile e Imágenes', 'Construcción de imágenes reproducibles por capas.');
    t_compose := pg_temp.s5_topic('Docker Compose', 'Orquestación de servicios locales multicontenedor.');
    t_volumes := pg_temp.s5_topic('Volúmenes y Redes', 'Persistencia de datos y comunicación entre contenedores.');
    t_cloud := pg_temp.s5_topic('Despliegue en la nube', 'Publicar contenedores en un proveedor cloud.');
    INSERT INTO "GOAL_TOPIC" (goal_id, topic_id, stage_id, sort_order)
    VALUES (g, t_containers, s1, 1), (g, t_dockerfile, s1, 2), (g, t_compose, s2, 3),
           (g, t_volumes, s2, 4), (g, t_cloud, NULL, 5)
    ON CONFLICT (goal_id, topic_id) DO NOTHING;
    INSERT INTO "ACTIVITY_TOPIC" (activity_id, topic_id)
    VALUES (act_install, t_containers), (act_dockerfile, t_dockerfile), (act_compose_doc, t_compose),
           (act_compose_lab, t_compose), (act_volumes, t_volumes)
    ON CONFLICT DO NOTHING;

    -- HU-05, HU-38, HU-39: recursos y avance.
    r_container_intro := pg_temp.s5_resource(t_containers, 'Qué es un contenedor', 'reading', 'Conceptos', 5,
        'https://docs.docker.com/get-started/docker-concepts/the-basics/what-is-a-container/', NULL, FALSE);
    PERFORM pg_temp.s5_resource(t_dockerfile, 'Ejercicio: Dockerfile multietapa', 'exercise', 'Imágenes', 15, NULL,
        'Reduce el tamaño de la imagen de tu API usando una compilación en dos etapas.', FALSE);
    r_compose_guide := pg_temp.s5_resource(t_compose, 'Guía básica de Docker Compose', 'reading', 'Orquestación', 3,
        'https://docs.docker.com/compose/', NULL, TRUE);
    PERFORM pg_temp.s5_resource(t_volumes, 'Cómo enlazar contenedores y volúmenes', 'video', 'Práctica', 12,
        'https://docs.docker.com/engine/storage/volumes/', NULL, FALSE);
    r_compose_lab := pg_temp.s5_resource(NULL, 'Reto: levantar una app con Compose', 'practice', 'Práctica', 20, NULL,
        'Escribe un compose.yaml con la API y PostgreSQL, y verifica que se comuniquen.', TRUE);
    INSERT INTO "ACTIVITY_RESOURCE" (activity_id, resource_id, sort_order)
    VALUES (act_compose_doc, r_compose_guide, 1), (act_compose_lab, r_compose_lab, 1)
    ON CONFLICT DO NOTHING;
    INSERT INTO "RESOURCE_PROGRESS" (user_id, resource_id, activity_id, status, started_at, completed_at)
    VALUES (u, r_container_intro, act_install, 'completed', (a - 14) + TIME '18:00', (a - 14) + TIME '18:05'),
           (u, r_compose_guide, act_compose_doc, 'started', (a - 2) + TIME '18:00', NULL)
    ON CONFLICT (user_id, resource_id) DO NOTHING;

    -- HU-40, HU-41: evaluacion respondida (Compose 50 %, Volumenes 0 %).
    SELECT assessment_id INTO asm FROM "ASSESSMENT" WHERE goal_id = g ORDER BY assessment_id LIMIT 1;
    IF asm IS NULL THEN
        INSERT INTO "ASSESSMENT" (goal_id, title, created_at)
        VALUES (g, 'Diagnóstico: Docker y Despliegue', (a - 1) + TIME '19:00')
        RETURNING assessment_id INTO asm;
        FOR question IN
            SELECT * FROM (VALUES
                (1, t_containers, '¿Qué comparte un contenedor con el sistema anfitrión?',
                 'El kernel del sistema operativo', 'Su propio kernel completo', 'Un hipervisor dedicado', 'A',
                 'Los contenedores comparten el kernel del anfitrión; por eso son más livianos que una VM.'),
                (2, t_compose, '¿Qué archivo describe los servicios en Docker Compose?',
                 'compose.yaml', 'Dockerfile', 'package.json', 'A',
                 'Compose lee la definición de servicios, redes y volúmenes desde compose.yaml.'),
                (3, t_compose, '¿Qué comando levanta todos los servicios en segundo plano?',
                 'docker compose up -d', 'docker build .', 'docker run --all', 'A',
                 'up crea y arranca los servicios; -d los deja en segundo plano.'),
                (4, t_volumes, '¿Para qué sirve un volumen en Docker?',
                 'Persistir datos fuera del ciclo de vida del contenedor', 'Aumentar la memoria RAM',
                 'Compilar el código fuente', 'A',
                 'Los volúmenes guardan datos aunque el contenedor se elimine.')
            ) AS x(n, topic, text, opt_a, opt_b, opt_c, correct, explanation)
        LOOP
            INSERT INTO "ASSESSMENT_QUESTION" (assessment_id, topic_id, category, question_text, explanation, sort_order)
            VALUES (asm, question.topic, 'DOCKER', question.text, question.explanation, question.n)
            RETURNING question_id INTO q;
            INSERT INTO "QUESTION_OPTION" (question_id, option_key, option_text, is_correct)
            VALUES (q, 'A', question.opt_a, question.correct = 'A'),
                   (q, 'B', question.opt_b, question.correct = 'B'),
                   (q, 'C', question.opt_c, question.correct = 'C');
        END LOOP;

        INSERT INTO "ASSESSMENT_ATTEMPT" (assessment_id, user_id, started_at)
        VALUES (asm, u, (a - 1) + TIME '19:05') RETURNING attempt_id INTO att;
        INSERT INTO "ATTEMPT_ANSWER" (attempt_id, question_id, option_id, answered_at)
        SELECT att, qq.question_id, o.option_id, (a - 1) + TIME '19:10'
        FROM "ASSESSMENT_QUESTION" qq
        JOIN "QUESTION_OPTION" o ON o.question_id = qq.question_id
        WHERE qq.assessment_id = asm
          AND o.option_key = CASE qq.sort_order WHEN 1 THEN 'A' WHEN 2 THEN 'A' WHEN 3 THEN 'B' ELSE 'C' END;
        UPDATE "ASSESSMENT_ATTEMPT" SET submitted_at = (a - 1) + TIME '19:12' WHERE attempt_id = att;
    END IF;

    -- HU-42, HU-31: recomendacion por vacio de conocimiento aceptada, que agrego
    -- un refuerzo sobre Volumenes y Redes.
    SELECT recommendation_id INTO rec_gap FROM "AI_RECOMMENDATION"
    WHERE user_id = u AND type = 'knowledge_gap' ORDER BY recommendation_id LIMIT 1;
    IF rec_gap IS NULL THEN
        INSERT INTO "AI_RECOMMENDATION" (user_id, goal_id, type, alert_level, title, why_suggested,
            solution_focus, solutions, expected_benefit, metrics, ai_model, created_at)
        VALUES (u, g, 'knowledge_gap', 'info', 'Refuerza Volúmenes y Redes',
            'En la evaluación respondiste correctamente 0 de 1 preguntas sobre Volúmenes y Redes.',
            'Cerrar el vacío antes de la práctica con Compose',
            '["Agregar un refuerzo guiado de 30 minutos.", "Ver el video sobre volúmenes."]',
            'Llegar a la práctica de Compose con la base necesaria.',
            '{"weak_topic": "Volúmenes y Redes", "percentage": 0}', 'gemini-2.5-flash',
            (a - 1) + TIME '19:13')
        RETURNING recommendation_id INTO rec_gap;
        UPDATE "AI_RECOMMENDATION" SET status = 'accepted', responded_at = (a - 1) + TIME '19:15'
        WHERE recommendation_id = rec_gap;
    END IF;
    SELECT activity_id INTO act_reinforce FROM "ACTIVITY"
    WHERE stage_id = s2 AND title = 'Refuerzo guiado: Volúmenes y Redes';
    IF act_reinforce IS NULL THEN
        INSERT INTO "ACTIVITY" (stage_id, origin_recommendation_id, title, description, type, origin,
                                sort_order, estimated_minutes)
        VALUES (s2, rec_gap, 'Refuerzo guiado: Volúmenes y Redes',
                'Lectura breve y ejercicio guiado sobre persistencia de datos.', 'reinforcement',
                'ai_adjustment', 4, 30)
        RETURNING activity_id INTO act_reinforce;
        INSERT INTO "ACTIVITY_TOPIC" (activity_id, topic_id) VALUES (act_reinforce, t_volumes);
        INSERT INTO "ACTIVITY_SCHEDULE" (activity_id, recommendation_id, version_number, scheduled_date,
                                        start_time, end_time, reason)
        VALUES (act_reinforce, rec_gap, 1, pg_temp.s5_weekday(a, 1), '18:00', '18:30', 'ai_adjustment');
    END IF;

    -- HU-31: una propuesta anterior que el usuario rechazo.
    IF NOT EXISTS (SELECT 1 FROM "AI_RECOMMENDATION" WHERE user_id = u AND type = 'replan') THEN
        INSERT INTO "AI_RECOMMENDATION" (user_id, goal_id, type, alert_level, title, why_suggested,
            solution_focus, solutions, created_at)
        VALUES (u, g, 'replan', 'info', 'Concentrar las sesiones en fin de semana',
            'Registraste pocas sesiones entre semana.', 'Aprovechar el sábado',
            '["Mover dos actividades al sábado."]', (a - 7) + TIME '20:00')
        RETURNING recommendation_id INTO rec_old;
        INSERT INTO "REPLAN_PROPOSAL" (recommendation_id, proposal_type, title, tagline, description,
            session_info, changes, impact, is_recommended)
        VALUES (rec_old, 'balanced', 'Equilibrada', 'Usar el sábado', 'Mueve 2 actividades al sábado.',
            '2 sesiones · máx. 120 min', '["Mover al sábado"]', 'Menos sesiones entre semana.', TRUE);
        UPDATE "AI_RECOMMENDATION" SET status = 'rejected', responded_at = (a - 7) + TIME '20:10'
        WHERE recommendation_id = rec_old;
    END IF;

    -- HU-04, HU-26, HU-30, HU-51: recomendacion pendiente por retraso con sus
    -- tres alternativas (HU-52 se demuestra eligiendo una desde la app).
    IF NOT EXISTS (SELECT 1 FROM "AI_RECOMMENDATION" WHERE user_id = u AND type = 'delay_adjustment') THEN
        INSERT INTO "AI_RECOMMENDATION" (user_id, goal_id, activity_id, type, alert_level, title,
            why_suggested, solution_focus, solutions, expected_benefit, metrics, ai_model)
        VALUES (u, g, act_compose_doc, 'delay_adjustment', 'warning', 'Una actividad lleva 2 días de retraso',
            'La lectura de Docker Compose no se completó en la fecha estimada y registraste dificultad 5/5 con la configuración de servicios.',
            'Dar más espacio al aprendizaje',
            '["Conservar las 2 actividades completadas.", "Añadir un recurso breve sobre Compose.", "Reprogramar la lectura para tu próxima franja libre."]',
            'Recuperar el ritmo sin perder lo avanzado.',
            jsonb_build_object('progress_percentage', 33.33, 'completed_activities', 2,
                               'total_activities', 6, 'available_hours_weekly', 10),
            'gemini-2.5-flash')
        RETURNING recommendation_id INTO rec_delay;

        INSERT INTO "REPLAN_PROPOSAL" (recommendation_id, proposal_type, title, tagline, description,
            session_info, changes, impact, is_recommended)
        VALUES (rec_delay, 'balanced', 'Equilibrada', 'Redistribuir esta semana',
            'Mueve 2 actividades y mantiene la fecha límite.', '3 sesiones · máx. 60 min',
            '["Ajustar próxima sesión", "Mantener fecha"]',
            'Aprovecha tu disponibilidad sin cambiar la fecha de cierre.', TRUE)
        RETURNING proposal_id INTO p_bal;
        INSERT INTO "REPLAN_PROPOSAL" (recommendation_id, proposal_type, title, tagline, description,
            session_info, changes, impact)
        VALUES (rec_delay, 'learning', 'Más aprendizaje', 'Añadir refuerzo guiado',
            'Agrega un refuerzo de Compose y desplaza la práctica 2 días.', '4 sesiones · incluye refuerzo',
            '["+ 1 recurso", "Refuerzo"]', 'Ideal para afianzar conceptos clave.')
        RETURNING proposal_id INTO p_learn;
        INSERT INTO "REPLAN_PROPOSAL" (recommendation_id, proposal_type, title, tagline, description,
            session_info, changes, impact, new_due_date)
        VALUES (rec_delay, 'time', 'Más tiempo', 'Extender fecha límite',
            'Reduce la carga semanal y extiende el plazo 2 semanas.', '2 sesiones · máx. 45 min',
            '["Extensión +14 días", "- 1 sesión/sem"]', 'Distribuye mejor el esfuerzo diario.', a + 44);

        INSERT INTO "REPLAN_PROPOSAL_ITEM" (proposal_id, activity_id, action, new_scheduled_date,
                                            new_start_time, new_end_time)
        VALUES (p_bal, act_install, 'keep', NULL, NULL, NULL),
               (p_bal, act_dockerfile, 'keep', NULL, NULL, NULL),
               (p_bal, act_compose_doc, 'reschedule', pg_temp.s5_weekday(a, 1), '18:00', '18:45'),
               (p_bal, act_compose_lab, 'reschedule', pg_temp.s5_weekday(a, 2), '18:00', '19:00'),
               (p_learn, act_compose_doc, 'reschedule', pg_temp.s5_weekday(a, 2), '18:00', '18:45'),
               (p_learn, act_compose_lab, 'reschedule', pg_temp.s5_weekday(a, 4), '18:00', '19:00');
        INSERT INTO "REPLAN_PROPOSAL_ITEM" (proposal_id, action, new_title, estimated_minutes,
                                            new_scheduled_date, new_start_time, new_end_time)
        VALUES (p_learn, 'add', 'Refuerzo guiado: Docker Compose', 25, pg_temp.s5_weekday(a, 1), '18:00', '18:25');
    END IF;
END $$;

COMMIT;
