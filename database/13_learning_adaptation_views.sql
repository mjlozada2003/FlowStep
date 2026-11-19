-- FLOWSTEP - Sprint 5 (aprendizaje, evaluacion y adaptacion con IA). Aplicar despues de 12.
-- Datos derivados en vistas; no se almacenan. Umbrales: dominio >= 80 = tema
-- dominado; aciertos < 60 en una evaluacion = tema por mejorar.
BEGIN;

-- ----------------------------------------------------------------------------
-- HU-37: conocimientos que requiere cada objetivo y su estado.
-- El dominio sale de la ultima evaluacion (USER_TOPIC); si el tema aun no se
-- evaluo, del avance de sus actividades vinculadas o, si no tiene, de su etapa.
-- knowledge_status usa los valores que ya consume la app:
-- completed (dominado), current (el siguiente por trabajar) y pending.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_goal_knowledge AS
WITH linked AS (
    SELECT s.goal_id, atp.topic_id,
           COUNT(*) AS linked_activities,
           COUNT(*) FILTER (WHERE a.status = 'completed') AS completed_linked_activities
    FROM "ACTIVITY_TOPIC" atp
    JOIN "ACTIVITY" a ON a.activity_id = atp.activity_id AND a.deleted_at IS NULL
    JOIN "STAGE" s ON s.stage_id = a.stage_id
    GROUP BY s.goal_id, atp.topic_id
), base AS (
    SELECT gt.goal_id, g.user_id, gt.topic_id, t.name AS topic_name, t.description,
           gt.stage_id, st.name AS stage_name, gt.sort_order, gt.is_required,
           COALESCE(l.linked_activities, 0)::integer AS linked_activities,
           COALESCE(l.completed_linked_activities, 0)::integer AS completed_linked_activities,
           ut.mastery_percentage AS evaluated_mastery_percentage, ut.last_evaluated_at,
           ROUND(COALESCE(
               ut.mastery_percentage,
               CASE WHEN l.linked_activities > 0
                    THEN 100.0 * l.completed_linked_activities / l.linked_activities END,
               sp.progress_percentage,
               0), 2) AS mastery_percentage
    FROM "GOAL_TOPIC" gt
    JOIN "GOAL" g ON g.goal_id = gt.goal_id AND g.deleted_at IS NULL
    JOIN "TOPIC" t ON t.topic_id = gt.topic_id
    LEFT JOIN "STAGE" st ON st.stage_id = gt.stage_id
    LEFT JOIN v_stage_progress sp ON sp.stage_id = gt.stage_id
    LEFT JOIN linked l ON l.goal_id = gt.goal_id AND l.topic_id = gt.topic_id
    LEFT JOIN "USER_TOPIC" ut ON ut.user_id = g.user_id AND ut.topic_id = gt.topic_id
), ranked AS (
    SELECT b.*,
           (b.mastery_percentage >= 80) AS is_mastered,
           ROW_NUMBER() OVER (PARTITION BY b.goal_id, (b.mastery_percentage >= 80)
                              ORDER BY b.sort_order, b.topic_id) AS rank_in_group
    FROM base b
)
SELECT goal_id, user_id, topic_id, topic_name, description, stage_id, stage_name,
       sort_order, is_required, linked_activities, completed_linked_activities,
       evaluated_mastery_percentage, last_evaluated_at, mastery_percentage,
       CASE WHEN is_mastered THEN 'completed'
            WHEN rank_in_group = 1 THEN 'current'
            ELSE 'pending' END AS knowledge_status,
       (evaluated_mastery_percentage IS NOT NULL AND evaluated_mastery_percentage < 60) AS needs_review
FROM ranked;

CREATE OR REPLACE VIEW v_goal_knowledge_summary AS
SELECT g.goal_id, g.user_id, g.title AS goal_title,
       COUNT(k.topic_id) AS total_concepts,
       COUNT(k.topic_id) FILTER (WHERE k.knowledge_status = 'completed') AS dominant_count,
       CASE WHEN COUNT(k.topic_id) > 0 THEN
           ROUND(100.0 * COUNT(k.topic_id) FILTER (WHERE k.knowledge_status = 'completed')
                 / COUNT(k.topic_id), 2)
       ELSE 0.00 END AS progress_percentage,
       MAX(k.topic_id) FILTER (WHERE k.knowledge_status = 'current') AS current_topic_id,
       MAX(k.topic_name) FILTER (WHERE k.knowledge_status = 'current') AS current_topic_name,
       MAX(k.description) FILTER (WHERE k.knowledge_status = 'current') AS current_topic_description,
       MAX(k.mastery_percentage) FILTER (WHERE k.knowledge_status = 'current') AS current_mastery_percentage,
       COUNT(k.topic_id) FILTER (WHERE k.needs_review) AS topics_to_review
FROM "GOAL" g
JOIN "APP_USER" u ON u.user_id = g.user_id AND u.deleted_at IS NULL
LEFT JOIN v_goal_knowledge k ON k.goal_id = g.goal_id
WHERE g.deleted_at IS NULL
GROUP BY g.goal_id, g.user_id, g.title;

-- ----------------------------------------------------------------------------
-- HU-05, HU-38: recursos de aprendizaje del objetivo (por sus temas o por sus
-- actividades), con etiquetas listas para la app y el avance del usuario.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_goal_learning_resources AS
WITH links AS (
    SELECT gt.goal_id, r.resource_id, NULL::integer AS activity_id
    FROM "GOAL_TOPIC" gt
    JOIN "LEARNING_RESOURCE" r ON r.topic_id = gt.topic_id
    UNION
    SELECT s.goal_id, ar.resource_id, ar.activity_id
    FROM "ACTIVITY_RESOURCE" ar
    JOIN "ACTIVITY" a ON a.activity_id = ar.activity_id AND a.deleted_at IS NULL
    JOIN "STAGE" s ON s.stage_id = a.stage_id
), grouped AS (
    SELECT goal_id, resource_id,
           array_agg(DISTINCT activity_id) FILTER (WHERE activity_id IS NOT NULL) AS activity_ids
    FROM links
    GROUP BY goal_id, resource_id
)
SELECT gr.goal_id, g.user_id, r.resource_id, r.title, r.type,
       CASE r.type WHEN 'reading' THEN 'LECTURA' WHEN 'video' THEN 'VÍDEO'
                   WHEN 'practice' THEN 'PRÁCTICA' ELSE 'EJERCICIO' END AS type_label,
       CASE r.type WHEN 'reading' THEN 'book-open' WHEN 'video' THEN 'play'
                   WHEN 'practice' THEN 'code' ELSE 'edit-3' END AS icon_name,
       CASE WHEN r.is_essential THEN 'Esencial' ELSE 'Recomendado' END AS badge_text,
       r.is_essential, r.category, r.duration_minutes,
       CASE WHEN r.duration_minutes IS NOT NULL THEN r.duration_minutes || ' min' END AS duration_label,
       r.url, r.content, r.topic_id, t.name AS topic_name,
       COALESCE(gr.activity_ids, ARRAY[]::integer[]) AS activity_ids,
       COALESCE(rp.status::text, 'not_started') AS progress_status,
       rp.completed_at
FROM grouped gr
JOIN "GOAL" g ON g.goal_id = gr.goal_id AND g.deleted_at IS NULL
JOIN "LEARNING_RESOURCE" r ON r.resource_id = gr.resource_id AND r.deleted_at IS NULL
LEFT JOIN "TOPIC" t ON t.topic_id = r.topic_id
LEFT JOIN "RESOURCE_PROGRESS" rp ON rp.user_id = g.user_id AND rp.resource_id = r.resource_id;

-- HU-38: recursos de una actividad: los vinculados directamente y los de los
-- temas que trabaja la actividad.
CREATE OR REPLACE VIEW v_activity_learning_resources AS
WITH links AS (
    SELECT ar.activity_id, ar.resource_id, 'direct'::text AS link_source, ar.sort_order
    FROM "ACTIVITY_RESOURCE" ar
    UNION ALL
    SELECT atp.activity_id, r.resource_id, 'topic', 1000
    FROM "ACTIVITY_TOPIC" atp
    JOIN "LEARNING_RESOURCE" r ON r.topic_id = atp.topic_id
    WHERE NOT EXISTS (SELECT 1 FROM "ACTIVITY_RESOURCE" x
                      WHERE x.activity_id = atp.activity_id AND x.resource_id = r.resource_id)
), dedup AS (
    SELECT DISTINCT ON (activity_id, resource_id) *
    FROM links ORDER BY activity_id, resource_id, sort_order
)
SELECT d.activity_id, a.title AS activity_title, s.goal_id, g.title AS goal_title, g.user_id,
       d.link_source, d.sort_order, gr.resource_id, gr.title, gr.type, gr.type_label, gr.icon_name,
       gr.badge_text, gr.category, gr.duration_minutes, gr.duration_label, gr.url, gr.content,
       gr.topic_name, gr.progress_status
FROM dedup d
JOIN "ACTIVITY" a ON a.activity_id = d.activity_id AND a.deleted_at IS NULL
JOIN "STAGE" s ON s.stage_id = a.stage_id
JOIN "GOAL" g ON g.goal_id = s.goal_id AND g.deleted_at IS NULL
JOIN v_goal_learning_resources gr ON gr.goal_id = s.goal_id AND gr.resource_id = d.resource_id;

-- ----------------------------------------------------------------------------
-- HU-39: actividades de aprendizaje y refuerzo con sus temas y recursos.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_learning_activities AS
SELECT a.activity_id, a.title, a.type, a.status, a.origin, a.estimated_minutes, a.completed_at,
       s.stage_id, s.goal_id, g.user_id, g.title AS goal_title,
       sc.scheduled_date, sc.start_time, sc.end_time,
       COALESCE((SELECT array_agg(t.name ORDER BY t.name) FROM "ACTIVITY_TOPIC" atp
                 JOIN "TOPIC" t ON t.topic_id = atp.topic_id
                 WHERE atp.activity_id = a.activity_id), ARRAY[]::varchar[]) AS topics,
       (SELECT COUNT(*) FROM v_activity_learning_resources r WHERE r.activity_id = a.activity_id) AS resources_total,
       (SELECT COUNT(*) FROM v_activity_learning_resources r
        WHERE r.activity_id = a.activity_id AND r.progress_status = 'completed') AS resources_completed
FROM "ACTIVITY" a
JOIN "STAGE" s ON s.stage_id = a.stage_id
JOIN "GOAL" g ON g.goal_id = s.goal_id AND g.deleted_at IS NULL
LEFT JOIN v_activity_current_schedule sc ON sc.activity_id = a.activity_id
WHERE a.deleted_at IS NULL AND a.type IN ('learning', 'reinforcement');

-- ----------------------------------------------------------------------------
-- HU-40: resultado de cada intento (las preguntas sin responder cuentan como
-- incorrectas). HU-41: resultado por tema del intento.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_assessment_attempt_result AS
SELECT t.attempt_id, t.assessment_id, a.goal_id, t.user_id, t.started_at, t.submitted_at,
       COUNT(q.question_id) AS total_questions,
       COUNT(aa.question_id) AS answered_questions,
       COUNT(*) FILTER (WHERE o.is_correct) AS score,
       CASE WHEN COUNT(q.question_id) > 0 THEN
           ROUND(100.0 * COUNT(*) FILTER (WHERE o.is_correct) / COUNT(q.question_id), 2)
       ELSE 0.00 END AS percentage
FROM "ASSESSMENT_ATTEMPT" t
JOIN "ASSESSMENT" a ON a.assessment_id = t.assessment_id
LEFT JOIN "ASSESSMENT_QUESTION" q ON q.assessment_id = t.assessment_id
LEFT JOIN "ATTEMPT_ANSWER" aa ON aa.attempt_id = t.attempt_id AND aa.question_id = q.question_id
LEFT JOIN "QUESTION_OPTION" o ON o.option_id = aa.option_id
GROUP BY t.attempt_id, t.assessment_id, a.goal_id, t.user_id, t.started_at, t.submitted_at;

CREATE OR REPLACE VIEW v_attempt_topic_result AS
SELECT t.attempt_id, t.user_id, a.goal_id, t.submitted_at, q.topic_id,
       COALESCE(tp.name, NULLIF(btrim(q.category), ''), 'General') AS topic_name,
       COUNT(*) AS total_questions,
       COUNT(*) FILTER (WHERE o.is_correct) AS correct_answers,
       ROUND(100.0 * COUNT(*) FILTER (WHERE o.is_correct) / COUNT(*), 2) AS percentage,
       (100.0 * COUNT(*) FILTER (WHERE o.is_correct) / COUNT(*) < 60) AS is_weak
FROM "ASSESSMENT_ATTEMPT" t
JOIN "ASSESSMENT" a ON a.assessment_id = t.assessment_id
JOIN "ASSESSMENT_QUESTION" q ON q.assessment_id = t.assessment_id
LEFT JOIN "TOPIC" tp ON tp.topic_id = q.topic_id
LEFT JOIN "ATTEMPT_ANSWER" aa ON aa.attempt_id = t.attempt_id AND aa.question_id = q.question_id
LEFT JOIN "QUESTION_OPTION" o ON o.option_id = aa.option_id
GROUP BY t.attempt_id, t.user_id, a.goal_id, t.submitted_at, q.topic_id,
         COALESCE(tp.name, NULLIF(btrim(q.category), ''), 'General');

-- HU-41, HU-42: temas por mejorar segun la ultima evaluacion enviada de cada
-- objetivo. has_pending_reinforcement evita sugerir dos veces el mismo refuerzo.
CREATE OR REPLACE VIEW v_goal_weak_topics AS
WITH latest AS (
    SELECT DISTINCT ON (t.user_id, a.goal_id) t.attempt_id, t.user_id, a.goal_id
    FROM "ASSESSMENT_ATTEMPT" t
    JOIN "ASSESSMENT" a ON a.assessment_id = t.assessment_id
    WHERE t.submitted_at IS NOT NULL
    ORDER BY t.user_id, a.goal_id, t.submitted_at DESC, t.attempt_id DESC
)
SELECT r.user_id, r.goal_id, r.attempt_id, r.submitted_at, r.topic_id, r.topic_name,
       r.total_questions, r.correct_answers, r.percentage,
       EXISTS (
           SELECT 1 FROM "ACTIVITY" a
           JOIN "STAGE" s ON s.stage_id = a.stage_id
           JOIN "ACTIVITY_TOPIC" atp ON atp.activity_id = a.activity_id
           WHERE s.goal_id = r.goal_id AND atp.topic_id = r.topic_id AND a.deleted_at IS NULL
             AND a.type = 'reinforcement' AND a.status IN ('pending', 'in_progress')
       ) AS has_pending_reinforcement,
       format('Refuerzo guiado: %s', r.topic_name) AS suggested_title,
       30 AS suggested_minutes
FROM v_attempt_topic_result r
JOIN latest l ON l.attempt_id = r.attempt_id
JOIN "GOAL" g ON g.goal_id = r.goal_id AND g.deleted_at IS NULL
WHERE r.is_weak;

-- ----------------------------------------------------------------------------
-- HU-26: dificultades registradas por actividad (sesiones con dificultad alta
-- o notas, e incumplimientos por dificultad).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_activity_difficulty AS
WITH sessions AS (
    SELECT w.activity_id,
           ROUND(AVG(w.difficulty_level), 2) AS avg_difficulty,
           MAX(w.difficulty_level) AS max_difficulty,
           COUNT(*) FILTER (WHERE NULLIF(btrim(w.difficulty_notes), '') IS NOT NULL) AS sessions_with_notes,
           (array_agg(w.difficulty_notes ORDER BY w.created_at DESC)
                FILTER (WHERE NULLIF(btrim(w.difficulty_notes), '') IS NOT NULL))[1] AS latest_note,
           MAX(w.created_at) AS last_session_at
    FROM "WORK_SESSION" w
    GROUP BY w.activity_id
), misses AS (
    SELECT sc.activity_id,
           COUNT(*) AS miss_count,
           COUNT(*) FILTER (WHERE r.name ILIKE '%dificultad%') AS difficulty_misses,
           (array_agg(COALESCE(NULLIF(btrim(m.details), ''), r.name) ORDER BY m.recorded_at DESC))[1] AS latest_miss,
           MAX(m.recorded_at) AS last_miss_at
    FROM "SCHEDULE_MISS" m
    JOIN "ACTIVITY_SCHEDULE" sc ON sc.schedule_id = m.schedule_id
    JOIN "MISS_REASON" r ON r.reason_id = m.reason_id
    GROUP BY sc.activity_id
)
SELECT a.activity_id, a.title AS activity_title, a.status, s.goal_id, g.title AS goal_title, g.user_id,
       se.avg_difficulty, se.max_difficulty, COALESCE(se.sessions_with_notes, 0) AS sessions_with_notes,
       se.latest_note, COALESCE(mi.miss_count, 0) AS miss_count,
       COALESCE(mi.difficulty_misses, 0) AS difficulty_misses, mi.latest_miss,
       GREATEST(se.last_session_at, mi.last_miss_at) AS last_reported_at,
       (COALESCE(se.max_difficulty, 0) >= 4 OR COALESCE(mi.difficulty_misses, 0) > 0
           OR COALESCE(se.sessions_with_notes, 0) > 0) AS needs_support
FROM "ACTIVITY" a
JOIN "STAGE" s ON s.stage_id = a.stage_id
JOIN "GOAL" g ON g.goal_id = s.goal_id AND g.deleted_at IS NULL
LEFT JOIN sessions se ON se.activity_id = a.activity_id
LEFT JOIN misses mi ON mi.activity_id = a.activity_id
WHERE a.deleted_at IS NULL AND (se.activity_id IS NOT NULL OR mi.activity_id IS NOT NULL);

-- ----------------------------------------------------------------------------
-- HU-27, HU-28, HU-29: contexto para replanificar un objetivo abierto.
-- Trabajo ya hecho (se conserva), carga pendiente, retraso, disponibilidad
-- semanal y si la carga cabe antes de la fecha limite.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_goal_replan_context AS
WITH availability AS (
    SELECT user_id,
           COALESCE(SUM(EXTRACT(EPOCH FROM (end_time - start_time)) / 60), 0)::integer AS weekly_available_minutes,
           COUNT(DISTINCT day_of_week) AS available_days
    FROM "AVAILABILITY"
    GROUP BY user_id
), work AS (
    SELECT s.goal_id,
           COUNT(*) FILTER (WHERE a.status = 'completed') AS completed_activities,
           COUNT(*) FILTER (WHERE a.status IN ('pending', 'in_progress')) AS pending_activities,
           COALESCE(SUM(a.estimated_minutes) FILTER (WHERE a.status IN ('pending', 'in_progress')), 0) AS pending_minutes
    FROM "ACTIVITY" a JOIN "STAGE" s ON s.stage_id = a.stage_id
    WHERE a.deleted_at IS NULL
    GROUP BY s.goal_id
), base AS (
    SELECT o.goal_id, o.user_id, o.title AS goal_title, o.status, o.priority, o.due_date,
           o.days_remaining, o.progress_percentage, o.pace_status,
           COALESCE(w.completed_activities, 0)::integer AS completed_activities,
           o.minutes_spent AS recorded_minutes,
           COALESCE(w.pending_activities, 0)::integer AS pending_activities,
           COALESCE(w.pending_minutes, 0)::integer AS pending_minutes,
           o.overdue_activities,
           COALESCE(av.weekly_available_minutes, 0) AS weekly_available_minutes,
           COALESCE(av.available_days, 0)::integer AS available_days,
           GREATEST(CEIL(GREATEST(COALESCE(o.days_remaining, 28), 1) / 7.0), 1)::integer AS weeks_left
    FROM v_goal_overview o
    LEFT JOIN work w ON w.goal_id = o.goal_id
    LEFT JOIN availability av ON av.user_id = o.user_id
    WHERE o.status IN ('active', 'paused')
)
SELECT b.*,
       CEIL(b.pending_minutes::numeric / b.weeks_left)::integer AS required_minutes_per_week,
       CASE
           WHEN b.pending_activities = 0 THEN 'nothing_pending'
           WHEN b.weekly_available_minutes = 0 THEN 'no_availability'
           WHEN b.days_remaining IS NOT NULL AND b.days_remaining < 0 THEN 'deadline_passed'
           WHEN CEIL(b.pending_minutes::numeric / b.weeks_left) > b.weekly_available_minutes THEN 'overloaded'
           ELSE 'fits'
       END AS capacity_status,
       (SELECT r.recommendation_id FROM "AI_RECOMMENDATION" r
        WHERE r.goal_id = b.goal_id AND r.status = 'pending'
        ORDER BY r.created_at DESC LIMIT 1) AS pending_recommendation_id
FROM base b;

-- ----------------------------------------------------------------------------
-- HU-51, HU-52: propuestas alternativas con su detalle y estado.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_replan_proposal_detail AS
SELECT p.proposal_id, p.recommendation_id, r.user_id, r.goal_id, g.title AS goal_title,
       p.proposal_type, p.title, p.tagline, p.description, p.session_info, p.changes, p.impact,
       p.is_recommended AS recommended, p.new_due_date, g.due_date AS current_due_date,
       p.status, p.selected_at, r.status AS recommendation_status,
       COUNT(i.item_id) FILTER (WHERE i.action = 'reschedule') AS activities_moved,
       COUNT(i.item_id) FILTER (WHERE i.action = 'add') AS activities_added,
       COUNT(i.item_id) FILTER (WHERE i.action = 'keep') AS activities_kept,
       (SELECT COUNT(*) FROM "ACTIVITY" a JOIN "STAGE" s ON s.stage_id = a.stage_id
        WHERE s.goal_id = r.goal_id AND a.deleted_at IS NULL AND a.status = 'completed') AS completed_activities_preserved,
       CASE p.proposal_type WHEN 'balanced' THEN 1 WHEN 'learning' THEN 2 ELSE 3 END AS display_order
FROM "REPLAN_PROPOSAL" p
JOIN "AI_RECOMMENDATION" r ON r.recommendation_id = p.recommendation_id
LEFT JOIN "GOAL" g ON g.goal_id = r.goal_id
LEFT JOIN "REPLAN_PROPOSAL_ITEM" i ON i.proposal_id = p.proposal_id
GROUP BY p.proposal_id, r.recommendation_id, r.user_id, r.goal_id, g.title, g.due_date;

-- HU-28: si cada cambio propuesto cae dentro de la disponibilidad del usuario.
CREATE OR REPLACE VIEW v_replan_item_availability AS
SELECT i.item_id, i.proposal_id, p.recommendation_id, r.user_id, i.activity_id, i.action,
       COALESCE(i.new_title, a.title) AS activity_title,
       i.estimated_minutes, i.new_scheduled_date, i.new_start_time, i.new_end_time,
       CASE
           WHEN i.new_scheduled_date IS NULL THEN NULL
           ELSE EXISTS (
               SELECT 1 FROM "AVAILABILITY" av
               WHERE av.user_id = r.user_id
                 AND av.day_of_week = (CASE EXTRACT(ISODOW FROM i.new_scheduled_date)::int
                     WHEN 1 THEN 'monday' WHEN 2 THEN 'tuesday' WHEN 3 THEN 'wednesday'
                     WHEN 4 THEN 'thursday' WHEN 5 THEN 'friday' WHEN 6 THEN 'saturday'
                     ELSE 'sunday' END)::"AVAILABILITY_day_of_week_enum"
                 AND (i.new_start_time IS NULL OR av.start_time <= i.new_start_time)
                 AND (i.new_end_time IS NULL OR av.end_time >= i.new_end_time))
       END AS fits_availability
FROM "REPLAN_PROPOSAL_ITEM" i
JOIN "REPLAN_PROPOSAL" p ON p.proposal_id = i.proposal_id
JOIN "AI_RECOMMENDATION" r ON r.recommendation_id = p.recommendation_id
LEFT JOIN "ACTIVITY" a ON a.activity_id = i.activity_id;

-- ----------------------------------------------------------------------------
-- HU-04, HU-26, HU-30, HU-31: historial de recomendaciones con su explicacion
-- y la decision del usuario.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_recommendation_history AS
SELECT r.recommendation_id, r.user_id, r.goal_id, g.title AS goal_title,
       r.activity_id, a.title AS activity_title, r.type, r.alert_level, r.title,
       r.why_suggested, r.solution_focus, r.solutions, r.expected_benefit, r.metrics,
       r.status, r.created_at, r.responded_at, r.ai_model,
       (SELECT COUNT(*) FROM "REPLAN_PROPOSAL" p WHERE p.recommendation_id = r.recommendation_id) AS proposals_count,
       (SELECT p.proposal_type FROM "REPLAN_PROPOSAL" p
        WHERE p.recommendation_id = r.recommendation_id AND p.status = 'selected') AS selected_proposal_type
FROM "AI_RECOMMENDATION" r
LEFT JOIN "GOAL" g ON g.goal_id = r.goal_id
LEFT JOIN "ACTIVITY" a ON a.activity_id = r.activity_id
WHERE g.deleted_at IS NULL OR r.goal_id IS NULL;

-- ----------------------------------------------------------------------------
-- HU-43: perfil de progreso para recomendaciones personalizadas.
-- recommended_focus: recover_pace (hay retraso), reinforce_topics (temas por
-- mejorar sin refuerzo), resume_activity (7+ dias sin avanzar), create_goal
-- (sin objetivos abiertos) o keep_momentum. focus_goal_id indica sobre que
-- objetivo actuar.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_user_learning_profile AS
WITH open_goals AS (
    SELECT * FROM v_goal_overview WHERE status IN ('active', 'paused')
), stats AS (
    SELECT p.user_id,
           (SELECT COUNT(*) FROM open_goals o WHERE o.user_id = p.user_id) AS open_goals,
           (SELECT COUNT(*) FROM v_goal_delay_alert d WHERE d.user_id = p.user_id) AS goals_behind,
           (SELECT ROUND(AVG(k.mastery_percentage), 2) FROM v_goal_knowledge k
            JOIN open_goals o ON o.goal_id = k.goal_id WHERE k.user_id = p.user_id) AS avg_mastery_percentage,
           (SELECT COUNT(*) FROM v_goal_weak_topics w
            JOIN open_goals o ON o.goal_id = w.goal_id
            WHERE w.user_id = p.user_id AND NOT w.has_pending_reinforcement) AS weak_topics,
           (SELECT COUNT(*) FROM v_learning_activities la JOIN open_goals o ON o.goal_id = la.goal_id
            WHERE la.user_id = p.user_id AND la.status IN ('pending', 'in_progress')) AS pending_learning_activities,
           (SELECT MAX(o.last_activity_at) FROM v_goal_overview o WHERE o.user_id = p.user_id) AS last_activity_at,
           (SELECT d.goal_id FROM v_goal_delay_alert d WHERE d.user_id = p.user_id
            ORDER BY (d.alert_level = 'critical') DESC, d.priority_rank, d.max_days_late DESC LIMIT 1) AS delayed_goal_id,
           (SELECT w.goal_id FROM v_goal_weak_topics w JOIN open_goals o ON o.goal_id = w.goal_id
            WHERE w.user_id = p.user_id AND NOT w.has_pending_reinforcement
            ORDER BY w.percentage, o.priority_rank LIMIT 1) AS weak_goal_id,
           (SELECT o.goal_id FROM open_goals o WHERE o.user_id = p.user_id AND o.status = 'active'
            ORDER BY o.sort_position LIMIT 1) AS top_goal_id
    FROM v_user_preferences p
)
SELECT user_id, open_goals, goals_behind, COALESCE(avg_mastery_percentage, 0) AS avg_mastery_percentage,
       weak_topics, pending_learning_activities, last_activity_at,
       CASE
           WHEN goals_behind > 0 THEN 'recover_pace'
           WHEN weak_topics > 0 THEN 'reinforce_topics'
           WHEN open_goals = 0 THEN 'create_goal'
           WHEN last_activity_at IS NULL OR last_activity_at < CURRENT_TIMESTAMP - INTERVAL '7 days' THEN 'resume_activity'
           ELSE 'keep_momentum'
       END AS recommended_focus,
       CASE
           WHEN goals_behind > 0 THEN delayed_goal_id
           WHEN weak_topics > 0 THEN weak_goal_id
           ELSE top_goal_id
       END AS focus_goal_id
FROM stats;

-- Alias entre comillas en mayusculas, como en los sprints anteriores.
CREATE OR REPLACE VIEW "V_GOAL_KNOWLEDGE" AS SELECT * FROM v_goal_knowledge;
CREATE OR REPLACE VIEW "V_GOAL_KNOWLEDGE_SUMMARY" AS SELECT * FROM v_goal_knowledge_summary;
CREATE OR REPLACE VIEW "V_GOAL_LEARNING_RESOURCES" AS SELECT * FROM v_goal_learning_resources;
CREATE OR REPLACE VIEW "V_ACTIVITY_LEARNING_RESOURCES" AS SELECT * FROM v_activity_learning_resources;
CREATE OR REPLACE VIEW "V_LEARNING_ACTIVITIES" AS SELECT * FROM v_learning_activities;
CREATE OR REPLACE VIEW "V_ASSESSMENT_ATTEMPT_RESULT" AS SELECT * FROM v_assessment_attempt_result;
CREATE OR REPLACE VIEW "V_ATTEMPT_TOPIC_RESULT" AS SELECT * FROM v_attempt_topic_result;
CREATE OR REPLACE VIEW "V_GOAL_WEAK_TOPICS" AS SELECT * FROM v_goal_weak_topics;
CREATE OR REPLACE VIEW "V_ACTIVITY_DIFFICULTY" AS SELECT * FROM v_activity_difficulty;
CREATE OR REPLACE VIEW "V_GOAL_REPLAN_CONTEXT" AS SELECT * FROM v_goal_replan_context;
CREATE OR REPLACE VIEW "V_REPLAN_PROPOSAL_DETAIL" AS SELECT * FROM v_replan_proposal_detail;
CREATE OR REPLACE VIEW "V_REPLAN_ITEM_AVAILABILITY" AS SELECT * FROM v_replan_item_availability;
CREATE OR REPLACE VIEW "V_RECOMMENDATION_HISTORY" AS SELECT * FROM v_recommendation_history;
CREATE OR REPLACE VIEW "V_USER_LEARNING_PROFILE" AS SELECT * FROM v_user_learning_profile;

COMMIT;
