-- Pruebas del Sprint 5 (aprendizaje, evaluacion y adaptacion). Requiere 01 a 13.
-- Ejecutar con psql -v ON_ERROR_STOP=1 sobre una base de prueba. Revierte sus filas.
BEGIN;
SET LOCAL timezone = 'America/La_Paz';

DO $$
DECLARE
    t DATE := CURRENT_DATE;
    sfx TEXT := ' #' || txid_current();
    u INTEGER; ou INTEGER;
    g INTEGER; og INTEGER;
    s1 INTEGER; s2 INTEGER; os INTEGER;
    a1 INTEGER; a2 INTEGER; a3 INTEGER; a4 INTEGER; a5 INTEGER; oa INTEGER;
    t1 INTEGER; t2 INTEGER; t3 INTEGER; t4 INTEGER;
    r1 INTEGER; r2 INTEGER; r3 INTEGER;
    asm INTEGER; q1 INTEGER; q2 INTEGER; q3 INTEGER; q4 INTEGER;
    att INTEGER; other_att INTEGER;
    rec INTEGER; rec2 INTEGER;
    p_bal INTEGER; p_learn INTEGER; p_time INTEGER; p2 INTEGER;
    sched INTEGER;
    r RECORD;
    n INTEGER;
BEGIN
    INSERT INTO "APP_USER" (name, email, password_hash, created_at)
    VALUES ('Prueba aprendizaje', 'aprendizaje' || sfx || '@flowstep.test', 'x', CURRENT_TIMESTAMP - INTERVAL '30 days')
    RETURNING user_id INTO u;
    INSERT INTO "APP_USER" (name, email, password_hash)
    VALUES ('Otro', 'otro-aprendizaje' || sfx || '@flowstep.test', 'x') RETURNING user_id INTO ou;

    INSERT INTO "GOAL" (user_id, title, user_description, start_date, due_date, priority)
    VALUES (u, 'Docker y Despliegue', 'Prueba', t - 20, t + 30, 'high') RETURNING goal_id INTO g;
    INSERT INTO "GOAL" (user_id, title, user_description, start_date, due_date)
    VALUES (ou, 'Ajeno', 'Prueba', t - 5, t + 30) RETURNING goal_id INTO og;
    INSERT INTO "STAGE" (goal_id, name, sort_order) VALUES (g, 'Fundamentos', 1) RETURNING stage_id INTO s1;
    INSERT INTO "STAGE" (goal_id, name, sort_order) VALUES (g, 'Orquestación', 2) RETURNING stage_id INTO s2;
    INSERT INTO "STAGE" (goal_id, name) VALUES (og, 'Ajena') RETURNING stage_id INTO os;

    INSERT INTO "ACTIVITY" (stage_id, title, type, estimated_minutes, sort_order, status, completed_at)
    VALUES (s1, 'Contenedores', 'learning', 30, 1, 'completed', CURRENT_TIMESTAMP - INTERVAL '10 days')
    RETURNING activity_id INTO a1;
    INSERT INTO "ACTIVITY" (stage_id, title, type, estimated_minutes, sort_order, status, completed_at)
    VALUES (s1, 'Dockerfile', 'practice', 60, 2, 'completed', CURRENT_TIMESTAMP - INTERVAL '5 days')
    RETURNING activity_id INTO a2;
    INSERT INTO "ACTIVITY" (stage_id, title, type, estimated_minutes, sort_order)
    VALUES (s2, 'Docker Compose', 'practice', 60, 1) RETURNING activity_id INTO a3;
    INSERT INTO "ACTIVITY" (stage_id, title, type, estimated_minutes, sort_order)
    VALUES (s2, 'Volúmenes', 'learning', 30, 2) RETURNING activity_id INTO a4;
    INSERT INTO "ACTIVITY" (stage_id, title, type, estimated_minutes)
    VALUES (os, 'Ajena', 'practice', 30) RETURNING activity_id INTO oa;

    INSERT INTO "ACTIVITY_SCHEDULE" (activity_id, version_number, scheduled_date, start_time, end_time)
    VALUES (a3, 1, t - 2, '18:00', '19:00') RETURNING schedule_id INTO sched;
    INSERT INTO "ACTIVITY_SCHEDULE" (activity_id, version_number, scheduled_date, start_time, end_time)
    VALUES (a4, 1, t + 2, '18:00', '18:30');
    INSERT INTO "WORK_SESSION" (activity_id, session_date, minutes_spent, difficulty_level, difficulty_notes)
    VALUES (a3, t - 2, 40, 5, 'Me costó la configuración');
    INSERT INTO "SCHEDULE_MISS" (schedule_id, reason_id, details)
    SELECT sched, reason_id, NULL FROM "MISS_REASON" WHERE name = 'Dificultad con la actividad';

    INSERT INTO "AVAILABILITY" (user_id, day_of_week, start_time, end_time)
    SELECT u, d::"AVAILABILITY_day_of_week_enum", '18:00', '20:00'
    FROM unnest(ARRAY['monday','tuesday','wednesday','thursday','friday','saturday','sunday']) d;

    -- --------------------------------------------------------------- HU-37
    INSERT INTO "TOPIC" (name, description) VALUES ('Contenedores vs VMs' || sfx, 'Aislamiento') RETURNING topic_id INTO t1;
    INSERT INTO "TOPIC" (name) VALUES ('Dockerfile e Imágenes' || sfx) RETURNING topic_id INTO t2;
    INSERT INTO "TOPIC" (name, description) VALUES ('Docker Compose' || sfx, 'Orquestación local') RETURNING topic_id INTO t3;
    INSERT INTO "TOPIC" (name) VALUES ('Volúmenes y Redes' || sfx) RETURNING topic_id INTO t4;
    BEGIN
        INSERT INTO "TOPIC" (name) VALUES ('  docker compose' || upper(sfx) || ' ');
        RAISE EXCEPTION 'HU-37: se duplico un tema';
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
    INSERT INTO "GOAL_TOPIC" (goal_id, topic_id, stage_id, sort_order)
    VALUES (g, t1, s1, 1), (g, t2, s1, 2), (g, t3, s2, 3), (g, t4, s2, 4);
    BEGIN
        INSERT INTO "GOAL_TOPIC" (goal_id, topic_id, stage_id) VALUES (og, t1, s1);
        RAISE EXCEPTION 'HU-37: se acepto una etapa de otro objetivo';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    INSERT INTO "ACTIVITY_TOPIC" (activity_id, topic_id) VALUES (a1, t1), (a2, t2), (a3, t3), (a4, t4);

    IF (SELECT array_agg(knowledge_status ORDER BY sort_order) FROM v_goal_knowledge WHERE goal_id = g)
       <> ARRAY['completed', 'completed', 'current', 'pending'] THEN
        RAISE EXCEPTION 'HU-37: estados de conocimiento incorrectos';
    END IF;
    SELECT * INTO STRICT r FROM v_goal_knowledge_summary WHERE goal_id = g;
    IF r.total_concepts <> 4 OR r.dominant_count <> 2 OR r.progress_percentage <> 50.00
       OR r.current_topic_id <> t3 OR r.current_topic_description <> 'Orquestación local' THEN
        RAISE EXCEPTION 'HU-37: resumen de conocimientos incorrecto';
    END IF;

    -- --------------------------------------------------------- HU-05, HU-38
    INSERT INTO "LEARNING_RESOURCE" (topic_id, title, type, category, duration_minutes, url, is_essential)
    VALUES (t3, 'Guía básica de Docker Compose', 'reading', 'Orquestación', 3, 'https://docs.docker.com/compose/', TRUE)
    RETURNING resource_id INTO r1;
    INSERT INTO "LEARNING_RESOURCE" (topic_id, title, type, category, duration_minutes)
    VALUES (t3, 'Enlazar contenedores', 'video', 'Práctica', 12) RETURNING resource_id INTO r2;
    INSERT INTO "LEARNING_RESOURCE" (title, type, duration_minutes, content)
    VALUES ('Reto: crear un volumen', 'practice', 15, 'Crea un volumen y móntalo.') RETURNING resource_id INTO r3;
    INSERT INTO "ACTIVITY_RESOURCE" (activity_id, resource_id) VALUES (a4, r3);
    BEGIN
        INSERT INTO "LEARNING_RESOURCE" (title, type, url) VALUES ('Mala', 'reading', 'ftp://x');
        RAISE EXCEPTION 'HU-05: se acepto una URL no web';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    IF (SELECT count(*) FROM v_goal_learning_resources WHERE goal_id = g) <> 3 THEN
        RAISE EXCEPTION 'HU-05: el objetivo debe tener tres recursos';
    END IF;
    SELECT * INTO STRICT r FROM v_goal_learning_resources WHERE resource_id = r1;
    IF r.type_label <> 'LECTURA' OR r.badge_text <> 'Esencial' OR r.icon_name <> 'book-open'
       OR r.duration_label <> '3 min' OR r.progress_status <> 'not_started' THEN
        RAISE EXCEPTION 'HU-05: etiquetas del recurso incorrectas';
    END IF;
    IF (SELECT array_agg(resource_id ORDER BY resource_id) FROM v_activity_learning_resources
        WHERE activity_id = a3) <> ARRAY[r1, r2]
       OR (SELECT link_source FROM v_activity_learning_resources WHERE activity_id = a4) <> 'direct' THEN
        RAISE EXCEPTION 'HU-38: recursos por actividad incorrectos';
    END IF;
    IF EXISTS (SELECT 1 FROM v_goal_learning_resources WHERE goal_id = og) THEN
        RAISE EXCEPTION 'HU-38: recursos de un objetivo ajeno';
    END IF;

    -- ------------------------------------------------------------------ HU-39
    INSERT INTO "RESOURCE_PROGRESS" (user_id, resource_id, activity_id) VALUES (u, r3, a4);
    BEGIN
        UPDATE "RESOURCE_PROGRESS" SET status = 'completed' WHERE user_id = u AND resource_id = r3;
        RAISE EXCEPTION 'HU-39: se completo un recurso sin fecha';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    UPDATE "RESOURCE_PROGRESS" SET status = 'completed', completed_at = CURRENT_TIMESTAMP
    WHERE user_id = u AND resource_id = r3;
    SELECT * INTO STRICT r FROM v_learning_activities WHERE activity_id = a4;
    IF r.resources_total <> 1 OR r.resources_completed <> 1 OR r.scheduled_date <> t + 2
       OR NOT (('Volúmenes y Redes' || sfx) = ANY (r.topics)) THEN
        RAISE EXCEPTION 'HU-39: actividad de aprendizaje incorrecta';
    END IF;
    IF EXISTS (SELECT 1 FROM v_learning_activities WHERE activity_id = a3) THEN
        RAISE EXCEPTION 'HU-39: una practica no es actividad de aprendizaje';
    END IF;

    -- ---------------------------------------------------------- HU-40, HU-41
    INSERT INTO "ASSESSMENT" (goal_id) VALUES (g) RETURNING assessment_id INTO asm;
    INSERT INTO "ASSESSMENT_QUESTION" (assessment_id, topic_id, category, question_text, sort_order)
    VALUES (asm, t1, 'DOCKER', '¿Qué aísla un contenedor?', 1) RETURNING question_id INTO q1;
    INSERT INTO "ASSESSMENT_QUESTION" (assessment_id, topic_id, question_text, sort_order)
    VALUES (asm, t3, '¿Qué archivo usa Compose?', 2) RETURNING question_id INTO q2;
    INSERT INTO "ASSESSMENT_QUESTION" (assessment_id, topic_id, question_text, sort_order)
    VALUES (asm, t3, '¿Cómo se levantan los servicios?', 3) RETURNING question_id INTO q3;
    INSERT INTO "ASSESSMENT_QUESTION" (assessment_id, topic_id, question_text, explanation, sort_order)
    VALUES (asm, t4, '¿Para qué sirve un volumen?', 'Persisten datos.', 4) RETURNING question_id INTO q4;
    INSERT INTO "QUESTION_OPTION" (question_id, option_key, option_text, is_correct)
    SELECT q, k, 'Opción ' || k, k = 'A'
    FROM unnest(ARRAY[q1, q2, q3, q4]) q, unnest(ARRAY['A', 'B', 'C']) k;
    BEGIN
        UPDATE "QUESTION_OPTION" SET is_correct = TRUE WHERE question_id = q1 AND option_key = 'B';
        RAISE EXCEPTION 'HU-40: una pregunta quedo con dos respuestas correctas';
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
    BEGIN
        INSERT INTO "QUESTION_OPTION" (question_id, option_key, option_text) VALUES (q1, 'Z', 'x');
        RAISE EXCEPTION 'HU-40: se acepto una clave de opcion invalida';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    BEGIN
        INSERT INTO "ASSESSMENT_ATTEMPT" (assessment_id, user_id) VALUES (asm, ou);
        RAISE EXCEPTION 'HU-40: otro usuario respondio la evaluacion';
    EXCEPTION WHEN check_violation THEN NULL;
    END;

    INSERT INTO "ASSESSMENT_ATTEMPT" (assessment_id, user_id) VALUES (asm, u) RETURNING attempt_id INTO att;
    INSERT INTO "ATTEMPT_ANSWER" (attempt_id, question_id, option_id)
    SELECT att, question_id, option_id FROM "QUESTION_OPTION"
    WHERE (question_id = q1 AND option_key = 'A') OR (question_id = q2 AND option_key = 'B')
       OR (question_id = q3 AND option_key = 'C');
    BEGIN
        INSERT INTO "ATTEMPT_ANSWER" (attempt_id, question_id, option_id)
        SELECT att, q4, option_id FROM "QUESTION_OPTION" WHERE question_id = q1 AND option_key = 'A';
        RAISE EXCEPTION 'HU-40: se acepto una opcion de otra pregunta';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    UPDATE "ASSESSMENT_ATTEMPT" SET submitted_at = CURRENT_TIMESTAMP WHERE attempt_id = att;
    BEGIN
        INSERT INTO "ATTEMPT_ANSWER" (attempt_id, question_id, option_id)
        SELECT att, q4, option_id FROM "QUESTION_OPTION" WHERE question_id = q4 AND option_key = 'A';
        RAISE EXCEPTION 'HU-40: se respondio un intento ya enviado';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    BEGIN
        UPDATE "ASSESSMENT_ATTEMPT" SET submitted_at = CURRENT_TIMESTAMP + INTERVAL '1 hour' WHERE attempt_id = att;
        RAISE EXCEPTION 'HU-40: se reenvio un intento';
    EXCEPTION WHEN check_violation THEN NULL;
    END;

    SELECT * INTO STRICT r FROM v_assessment_attempt_result WHERE attempt_id = att;
    IF r.total_questions <> 4 OR r.answered_questions <> 3 OR r.score <> 1 OR r.percentage <> 25.00 THEN
        RAISE EXCEPTION 'HU-40: calificacion incorrecta (% de %)', r.score, r.total_questions;
    END IF;
    IF (SELECT array_agg(topic_id ORDER BY topic_id) FROM v_attempt_topic_result WHERE attempt_id = att AND is_weak)
       <> ARRAY[t3, t4]
       OR (SELECT percentage FROM v_attempt_topic_result WHERE attempt_id = att AND topic_id = t1) <> 100.00 THEN
        RAISE EXCEPTION 'HU-41: temas por mejorar incorrectos';
    END IF;
    IF (SELECT mastery_percentage FROM "USER_TOPIC" WHERE user_id = u AND topic_id = t3) <> 0
       OR (SELECT mastery_percentage FROM "USER_TOPIC" WHERE user_id = u AND topic_id = t1) <> 100 THEN
        RAISE EXCEPTION 'HU-41: el dominio no se actualizo al enviar';
    END IF;
    IF NOT (SELECT needs_review FROM v_goal_knowledge WHERE goal_id = g AND topic_id = t3) THEN
        RAISE EXCEPTION 'HU-41: el tema debil no quedo marcado para repaso';
    END IF;

    -- ------------------------------------------------------------------ HU-42
    IF (SELECT count(*) FROM v_goal_weak_topics WHERE goal_id = g AND NOT has_pending_reinforcement) <> 2 THEN
        RAISE EXCEPTION 'HU-42: se esperaban dos temas sin refuerzo';
    END IF;
    INSERT INTO "ACTIVITY" (stage_id, title, type, origin, estimated_minutes, sort_order)
    VALUES (s2, 'Refuerzo guiado: Docker Compose', 'reinforcement', 'ai_adjustment', 30, 3)
    RETURNING activity_id INTO a5;
    INSERT INTO "ACTIVITY_TOPIC" (activity_id, topic_id) VALUES (a5, t3);
    IF NOT (SELECT has_pending_reinforcement FROM v_goal_weak_topics WHERE goal_id = g AND topic_id = t3)
       OR (SELECT has_pending_reinforcement FROM v_goal_weak_topics WHERE goal_id = g AND topic_id = t4)
       OR (SELECT suggested_title FROM v_goal_weak_topics WHERE goal_id = g AND topic_id = t4)
          <> 'Refuerzo guiado: Volúmenes y Redes' || sfx THEN
        RAISE EXCEPTION 'HU-42: estado de refuerzo incorrecto';
    END IF;

    -- ------------------------------------------------------------------ HU-26
    SELECT * INTO STRICT r FROM v_activity_difficulty WHERE activity_id = a3;
    IF NOT r.needs_support OR r.max_difficulty <> 5 OR r.difficulty_misses <> 1
       OR r.latest_note <> 'Me costó la configuración' THEN
        RAISE EXCEPTION 'HU-26: dificultad de la actividad no detectada';
    END IF;

    -- ------------------------------------------------------------ HU-43 (a)
    SELECT * INTO STRICT r FROM v_user_learning_profile WHERE user_id = u;
    IF r.recommended_focus <> 'recover_pace' OR r.focus_goal_id <> g OR r.goals_behind <> 1 THEN
        RAISE EXCEPTION 'HU-43: con retraso el foco debe ser recuperar el ritmo (%)', r.recommended_focus;
    END IF;

    -- --------------------------------------------------------- HU-04, HU-30
    BEGIN
        INSERT INTO "AI_RECOMMENDATION" (user_id, goal_id, type, title, why_suggested)
        VALUES (u, g, 'delay_adjustment', 'Ajuste', '  ');
        RAISE EXCEPTION 'HU-30: recomendacion sin explicacion';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    BEGIN
        INSERT INTO "AI_RECOMMENDATION" (user_id, goal_id, type, title, why_suggested)
        VALUES (u, og, 'delay_adjustment', 'Ajuste', 'x');
        RAISE EXCEPTION 'HU-04: recomendacion sobre un objetivo ajeno';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    BEGIN
        INSERT INTO "AI_RECOMMENDATION" (user_id, goal_id, activity_id, type, title, why_suggested)
        VALUES (u, g, oa, 'difficulty_support', 'Ajuste', 'x');
        RAISE EXCEPTION 'HU-26: recomendacion sobre una actividad ajena';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    BEGIN
        INSERT INTO "AI_RECOMMENDATION" (user_id, goal_id, type, title, why_suggested, solutions)
        VALUES (u, g, 'delay_adjustment', 'Ajuste', 'x', '{"a":1}');
        RAISE EXCEPTION 'HU-30: soluciones que no son lista';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    INSERT INTO "AI_RECOMMENDATION" (user_id, goal_id, activity_id, type, alert_level, title,
        why_suggested, solution_focus, solutions, expected_benefit, metrics, ai_model)
    VALUES (u, g, a3, 'delay_adjustment', 'warning', 'Una actividad lleva 2 días de retraso',
        'La actividad no pudo completarse en la fecha estimada.', 'Dar más espacio al aprendizaje',
        '["Conservar las actividades completadas.", "Añadir un recurso breve."]',
        'Recuperar el ritmo sin perder avance.', '{"progress_percentage": 50}', 'gemini-2.5-flash')
    RETURNING recommendation_id INTO rec;

    -- ------------------------------------------------- HU-27, HU-28, HU-29, HU-51
    SELECT * INTO STRICT r FROM v_goal_replan_context WHERE goal_id = g;
    IF r.completed_activities <> 2 OR r.pending_activities <> 3 OR r.pending_minutes <> 120
       OR r.overdue_activities <> 1 OR r.weekly_available_minutes <> 840 OR r.available_days <> 7
       OR r.capacity_status <> 'fits' OR r.pending_recommendation_id <> rec OR r.recorded_minutes <> 40 THEN
        RAISE EXCEPTION 'HU-27/28/29: contexto de replanificacion incorrecto';
    END IF;

    INSERT INTO "REPLAN_PROPOSAL" (recommendation_id, proposal_type, title, tagline, description,
        session_info, changes, impact, is_recommended)
    VALUES (rec, 'balanced', 'Equilibrada', 'Redistribuir esta semana', 'Mueve 1 actividad.',
        '3 sesiones · máx. 60 min', '["Ajustar próxima sesión"]', 'Mantiene la fecha.', TRUE)
    RETURNING proposal_id INTO p_bal;
    INSERT INTO "REPLAN_PROPOSAL" (recommendation_id, proposal_type, title, description, changes)
    VALUES (rec, 'learning', 'Más aprendizaje', 'Agrega refuerzo.', '["+ 1 recurso"]')
    RETURNING proposal_id INTO p_learn;
    INSERT INTO "REPLAN_PROPOSAL" (recommendation_id, proposal_type, title, description, new_due_date)
    VALUES (rec, 'time', 'Más tiempo', 'Extiende 14 días.', t + 44) RETURNING proposal_id INTO p_time;
    BEGIN
        UPDATE "REPLAN_PROPOSAL" SET is_recommended = TRUE WHERE proposal_id = p_learn;
        RAISE EXCEPTION 'HU-51: dos propuestas recomendadas';
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
    BEGIN
        INSERT INTO "REPLAN_PROPOSAL" (recommendation_id, proposal_type, title, description)
        VALUES (rec, 'balanced', 'Otra', 'x');
        RAISE EXCEPTION 'HU-51: tipo de propuesta repetido';
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
    BEGIN
        UPDATE "REPLAN_PROPOSAL" SET new_due_date = t - 1 WHERE proposal_id = p_time;
        RAISE EXCEPTION 'HU-08: fecha limite propuesta en el pasado';
    EXCEPTION WHEN check_violation THEN NULL;
    END;

    INSERT INTO "REPLAN_PROPOSAL_ITEM" (proposal_id, activity_id, action, new_scheduled_date, new_start_time, new_end_time)
    VALUES (p_bal, a3, 'reschedule', t + 1, '18:00', '19:00'),
           (p_bal, a1, 'keep', NULL, NULL, NULL),
           (p_learn, a4, 'reschedule', t + 3, '06:00', '07:00');
    INSERT INTO "REPLAN_PROPOSAL_ITEM" (proposal_id, action, new_title, estimated_minutes, new_scheduled_date)
    VALUES (p_learn, 'add', 'Refuerzo guiado', 25, t + 1);
    BEGIN
        INSERT INTO "REPLAN_PROPOSAL_ITEM" (proposal_id, activity_id, action, new_scheduled_date)
        VALUES (p_bal, a1, 'reschedule', t + 1);
        RAISE EXCEPTION 'HU-29: se reprogramo una actividad completada';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    BEGIN
        INSERT INTO "REPLAN_PROPOSAL_ITEM" (proposal_id, activity_id, action, new_scheduled_date)
        VALUES (p_bal, oa, 'reschedule', t + 1);
        RAISE EXCEPTION 'HU-27: se movio una actividad de otro objetivo';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    BEGIN
        INSERT INTO "REPLAN_PROPOSAL_ITEM" (proposal_id, activity_id, action, new_scheduled_date)
        VALUES (p_bal, a4, 'reschedule', t - 1);
        RAISE EXCEPTION 'HU-27: se propuso una fecha pasada';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    BEGIN
        INSERT INTO "REPLAN_PROPOSAL_ITEM" (proposal_id, action) VALUES (p_learn, 'add');
        RAISE EXCEPTION 'HU-27: actividad agregada sin titulo';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    IF (SELECT fits_availability FROM v_replan_item_availability WHERE proposal_id = p_bal AND activity_id = a3) IS NOT TRUE
       OR (SELECT fits_availability FROM v_replan_item_availability WHERE proposal_id = p_learn AND activity_id = a4) IS NOT FALSE
       OR (SELECT fits_availability FROM v_replan_item_availability WHERE proposal_id = p_bal AND action = 'keep') IS NOT NULL THEN
        RAISE EXCEPTION 'HU-28: control de disponibilidad incorrecto';
    END IF;
    SELECT * INTO STRICT r FROM v_replan_proposal_detail WHERE proposal_id = p_bal;
    IF r.activities_moved <> 1 OR r.activities_kept <> 1 OR r.completed_activities_preserved <> 2
       OR NOT r.recommended OR r.status <> 'proposed' THEN
        RAISE EXCEPTION 'HU-51: detalle de la propuesta incorrecto';
    END IF;
    IF (SELECT count(*) FROM v_replan_proposal_detail WHERE recommendation_id = rec) <> 3 THEN
        RAISE EXCEPTION 'HU-51: se esperaban tres alternativas';
    END IF;

    -- -------------------------------------------------------- HU-52, HU-08
    UPDATE "REPLAN_PROPOSAL" SET status = 'selected' WHERE proposal_id = p_time;
    SELECT * INTO STRICT r FROM v_recommendation_history WHERE recommendation_id = rec;
    IF r.status <> 'accepted' OR r.responded_at IS NULL OR r.selected_proposal_type <> 'time'
       OR r.proposals_count <> 3 THEN
        RAISE EXCEPTION 'HU-52: seleccionar no acepto la recomendacion';
    END IF;
    IF (SELECT count(*) FROM "REPLAN_PROPOSAL" WHERE recommendation_id = rec AND status = 'discarded') <> 2 THEN
        RAISE EXCEPTION 'HU-52: las otras propuestas no se descartaron';
    END IF;
    BEGIN
        UPDATE "REPLAN_PROPOSAL" SET status = 'selected' WHERE proposal_id = p_bal;
        RAISE EXCEPTION 'HU-52: se eligio una segunda propuesta';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    BEGIN
        UPDATE "REPLAN_PROPOSAL" SET status = 'discarded' WHERE proposal_id = p_time;
        RAISE EXCEPTION 'HU-52: se deshizo una propuesta ya elegida';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    -- Aplicar la propuesta elegida: nueva fecha limite (historial del Sprint 3)
    -- y nueva version del horario vinculada a la recomendacion.
    UPDATE "GOAL" SET due_date = (SELECT new_due_date FROM "REPLAN_PROPOSAL" WHERE proposal_id = p_time)
    WHERE goal_id = g;
    IF (SELECT new_due_date FROM "GOAL_DEADLINE_HISTORY" WHERE goal_id = g) <> t + 44 THEN
        RAISE EXCEPTION 'HU-08: no se registro la nueva fecha limite';
    END IF;
    INSERT INTO "ACTIVITY_SCHEDULE" (activity_id, recommendation_id, version_number, scheduled_date, reason)
    VALUES (a3, rec, 2, t + 1, 'ai_adjustment');
    UPDATE "ACTIVITY" SET origin_recommendation_id = rec WHERE activity_id = a5;
    BEGIN
        INSERT INTO "ACTIVITY_SCHEDULE" (activity_id, recommendation_id, version_number, scheduled_date, reason)
        VALUES (a4, 2147483000, 2, t + 4, 'ai_adjustment');
        RAISE EXCEPTION 'HU-27: horario vinculado a una recomendacion inexistente';
    EXCEPTION WHEN foreign_key_violation THEN NULL;
    END;

    -- ------------------------------------------------------------------ HU-31
    INSERT INTO "AI_RECOMMENDATION" (user_id, goal_id, type, title, why_suggested)
    VALUES (u, g, 'replan', 'Reorganizar', 'Hay poca disponibilidad.') RETURNING recommendation_id INTO rec2;
    INSERT INTO "REPLAN_PROPOSAL" (recommendation_id, proposal_type, title, description)
    VALUES (rec2, 'balanced', 'Equilibrada', 'x') RETURNING proposal_id INTO p2;
    UPDATE "AI_RECOMMENDATION" SET status = 'rejected' WHERE recommendation_id = rec2;
    IF (SELECT responded_at FROM "AI_RECOMMENDATION" WHERE recommendation_id = rec2) IS NULL
       OR (SELECT status FROM "REPLAN_PROPOSAL" WHERE proposal_id = p2) <> 'discarded' THEN
        RAISE EXCEPTION 'HU-31: rechazar no cerro la recomendacion ni sus propuestas';
    END IF;
    BEGIN
        UPDATE "AI_RECOMMENDATION" SET status = 'accepted' WHERE recommendation_id = rec2;
        RAISE EXCEPTION 'HU-31: se cambio una respuesta ya dada';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    BEGIN
        UPDATE "REPLAN_PROPOSAL" SET status = 'selected' WHERE proposal_id = p2;
        RAISE EXCEPTION 'HU-31: se eligio una propuesta de una recomendacion rechazada';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    IF (SELECT count(*) FROM v_recommendation_history WHERE user_id = u) <> 2 THEN
        RAISE EXCEPTION 'HU-30: historial de recomendaciones incompleto';
    END IF;

    -- ------------------------------------------------------------ HU-43 (b)
    -- Tras replanificar, a3 ya no esta vencida: el foco pasa a los temas debiles.
    SELECT * INTO STRICT r FROM v_user_learning_profile WHERE user_id = u;
    IF r.recommended_focus <> 'reinforce_topics' OR r.focus_goal_id <> g OR r.weak_topics <> 1 THEN
        RAISE EXCEPTION 'HU-43: sin retraso el foco debe ser reforzar temas (%)', r.recommended_focus;
    END IF;
    IF (SELECT recommended_focus FROM v_user_learning_profile WHERE user_id = ou) <> 'resume_activity' THEN
        RAISE EXCEPTION 'HU-43: perfil del usuario sin avance incorrecto';
    END IF;

    RAISE NOTICE 'Sprint 5 (aprendizaje y adaptacion): todas las pruebas pasaron';
END $$;

ROLLBACK;
