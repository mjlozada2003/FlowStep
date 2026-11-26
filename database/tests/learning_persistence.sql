-- Pruebas de la persistencia desde el backend (seccion 7 de 12 y vistas de 13). Requiere 01 a 13.
-- Ejecutar con psql -v ON_ERROR_STOP=1 sobre una base de prueba. Revierte sus filas.
BEGIN;
SET LOCAL timezone = 'America/La_Paz';

DO $$
DECLARE
    u INTEGER; g INTEGER; s INTEGER; a INTEGER; r1 INTEGER; r2 INTEGER; rec INTEGER; p INTEGER;
    row RECORD;
BEGIN
    INSERT INTO "APP_USER" (name, email, password_hash)
    VALUES ('Persistencia', 'persistencia-' || txid_current() || '@flowstep.test', 'x') RETURNING user_id INTO u;
    INSERT INTO "GOAL" (user_id, title, user_description, due_date)
    VALUES (u, 'Objetivo', 'Prueba', CURRENT_DATE + 30) RETURNING goal_id INTO g;
    INSERT INTO "STAGE" (goal_id, name) VALUES (g, 'Etapa') RETURNING stage_id INTO s;
    INSERT INTO "ACTIVITY" (stage_id, title, type, estimated_minutes) VALUES (s, 'Actividad', 'learning', 30)
    RETURNING activity_id INTO a;

    -- Recursos del objetivo (GOAL_RESOURCE) con contenido enriquecido.
    INSERT INTO "LEARNING_RESOURCE" (title, type, duration_minutes, details)
    VALUES ('Lectura guiada', 'reading', 5, '{"summary": "Resumen", "key_points": ["a", "b"], "duration": "5 min"}')
    RETURNING resource_id INTO r1;
    INSERT INTO "LEARNING_RESOURCE" (title, type) VALUES ('Video', 'video') RETURNING resource_id INTO r2;
    INSERT INTO "GOAL_RESOURCE" (goal_id, resource_id, sort_order) VALUES (g, r2, 1), (g, r1, 2);

    IF (SELECT array_agg(resource_id ORDER BY goal_sort_order) FROM v_goal_learning_resources WHERE goal_id = g)
       <> ARRAY[r2, r1] THEN
        RAISE EXCEPTION 'GOAL_RESOURCE: el objetivo debe listar sus recursos en orden';
    END IF;
    SELECT * INTO STRICT row FROM v_goal_learning_resources WHERE resource_id = r1;
    IF row.details->>'summary' <> 'Resumen' OR jsonb_array_length(row.details->'key_points') <> 2
       OR row.type_label <> 'LECTURA' THEN
        RAISE EXCEPTION 'details: el contenido enriquecido no llega a la vista';
    END IF;
    IF (SELECT details FROM v_goal_learning_resources WHERE resource_id = r2) <> '{}'::jsonb THEN
        RAISE EXCEPTION 'details: debe valer {} por defecto';
    END IF;
    BEGIN
        UPDATE "LEARNING_RESOURCE" SET details = '[]' WHERE resource_id = r1;
        RAISE EXCEPTION 'details: se acepto un arreglo';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    BEGIN
        INSERT INTO "GOAL_RESOURCE" (goal_id, resource_id, sort_order) VALUES (g, r1, 0);
        RAISE EXCEPTION 'GOAL_RESOURCE: se acepto un orden invalido';
    EXCEPTION WHEN check_violation OR unique_violation THEN NULL;
    END;

    -- Recursos de la actividad incluyen details.
    INSERT INTO "ACTIVITY_RESOURCE" (activity_id, resource_id) VALUES (a, r1);
    IF (SELECT details->>'summary' FROM v_activity_learning_resources WHERE activity_id = a) <> 'Resumen' THEN
        RAISE EXCEPTION 'v_activity_learning_resources: falta details';
    END IF;

    -- Presentacion de la propuesta y detalle del diagnostico.
    INSERT INTO "AI_RECOMMENDATION" (user_id, goal_id, type, title, why_suggested, details)
    VALUES (u, g, 'replan', 'Reorganizar', 'Motivo', '{"diagnostic": {"alert_message": "Hola"}}')
    RETURNING recommendation_id INTO rec;
    INSERT INTO "REPLAN_PROPOSAL" (recommendation_id, proposal_type, title, description, presentation)
    VALUES (rec, 'balanced', 'Equilibrada', 'x', '{"type_label": "Equilibrada", "rescheduled_count": 2}')
    RETURNING proposal_id INTO p;
    IF (SELECT presentation->>'rescheduled_count' FROM v_replan_proposal_detail WHERE proposal_id = p) <> '2' THEN
        RAISE EXCEPTION 'presentation: no llega a v_replan_proposal_detail';
    END IF;
    BEGIN
        UPDATE "AI_RECOMMENDATION" SET details = '"texto"' WHERE recommendation_id = rec;
        RAISE EXCEPTION 'AI_RECOMMENDATION.details: se acepto un valor que no es objeto';
    EXCEPTION WHEN check_violation THEN NULL;
    END;

    -- Borrar el objetivo elimina sus vinculos.
    DELETE FROM "GOAL" WHERE goal_id = g;
    IF EXISTS (SELECT 1 FROM "GOAL_RESOURCE" WHERE goal_id = g) THEN
        RAISE EXCEPTION 'GOAL_RESOURCE: no se elimino en cascada';
    END IF;

    RAISE NOTICE 'Persistencia del Sprint 5: todas las pruebas pasaron';
END $$;

ROLLBACK;
