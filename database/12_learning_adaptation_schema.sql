-- FLOWSTEP - Sprint 5 (aprendizaje, evaluacion y adaptacion con IA).
-- HU-04, HU-05, HU-08, HU-26, HU-27, HU-28, HU-29, HU-30, HU-31, HU-37, HU-38,
-- HU-39, HU-40, HU-41, HU-42, HU-43, HU-51 y HU-52.
-- Dominios del ER: Knowledge, Resources, Assessment y AI Adaptation.
-- Aplicar despues de 01 a 11. Migracion aditiva, transaccional y repetible.
BEGIN;

-- ----------------------------------------------------------------------------
-- 1. TIPOS ENUMERADOS
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    def RECORD;
BEGIN
    FOR def IN
        SELECT * FROM (VALUES
            ('LEARNING_RESOURCE_type_enum', $v$('reading', 'video', 'practice', 'exercise')$v$),
            ('RESOURCE_PROGRESS_status_enum', $v$('started', 'completed')$v$),
            ('AI_RECOMMENDATION_type_enum',
                $v$('delay_adjustment', 'difficulty_support', 'personalized', 'knowledge_gap', 'replan')$v$),
            ('AI_RECOMMENDATION_status_enum', $v$('pending', 'accepted', 'rejected', 'expired')$v$),
            ('REPLAN_PROPOSAL_type_enum', $v$('balanced', 'learning', 'time')$v$),
            ('REPLAN_PROPOSAL_status_enum', $v$('proposed', 'selected', 'discarded')$v$),
            ('REPLAN_PROPOSAL_ITEM_action_enum', $v$('reschedule', 'add', 'keep')$v$)
        ) AS t(name, labels)
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
            WHERE t.typname = def.name AND n.nspname = current_schema()
        ) THEN
            EXECUTE format('CREATE TYPE %I AS ENUM %s', def.name, def.labels);
        END IF;
    END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 2. KNOWLEDGE (HU-37, HU-41)
-- TOPIC es un catalogo comun; GOAL_TOPIC indica que conocimientos requiere
-- cada objetivo y en que etapa se trabajan; USER_TOPIC guarda el dominio
-- medido del usuario (lo actualiza la evaluacion).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "TOPIC" (
    topic_id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_topic_name CHECK (btrim(name) <> '')
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_topic_name ON "TOPIC" (lower(btrim(name)));

CREATE TABLE IF NOT EXISTS "GOAL_TOPIC" (
    goal_id INTEGER NOT NULL REFERENCES "GOAL"(goal_id) ON DELETE CASCADE,
    topic_id INTEGER NOT NULL REFERENCES "TOPIC"(topic_id) ON DELETE CASCADE,
    stage_id INTEGER REFERENCES "STAGE"(stage_id) ON DELETE SET NULL,
    sort_order INTEGER NOT NULL DEFAULT 1,
    is_required BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (goal_id, topic_id),
    CONSTRAINT chk_goal_topic_order CHECK (sort_order > 0)
);
CREATE INDEX IF NOT EXISTS idx_goal_topic_topic ON "GOAL_TOPIC" (topic_id);

CREATE TABLE IF NOT EXISTS "ACTIVITY_TOPIC" (
    activity_id INTEGER NOT NULL REFERENCES "ACTIVITY"(activity_id) ON DELETE CASCADE,
    topic_id INTEGER NOT NULL REFERENCES "TOPIC"(topic_id) ON DELETE CASCADE,
    PRIMARY KEY (activity_id, topic_id)
);
CREATE INDEX IF NOT EXISTS idx_activity_topic_topic ON "ACTIVITY_TOPIC" (topic_id);

CREATE TABLE IF NOT EXISTS "USER_TOPIC" (
    user_id INTEGER NOT NULL REFERENCES "APP_USER"(user_id) ON DELETE CASCADE,
    topic_id INTEGER NOT NULL REFERENCES "TOPIC"(topic_id) ON DELETE CASCADE,
    mastery_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
    last_evaluated_at TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, topic_id),
    CONSTRAINT chk_user_topic_mastery CHECK (mastery_percentage BETWEEN 0 AND 100)
);

-- ----------------------------------------------------------------------------
-- 3. RESOURCES (HU-05, HU-38, HU-39)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "LEARNING_RESOURCE" (
    resource_id SERIAL PRIMARY KEY,
    topic_id INTEGER REFERENCES "TOPIC"(topic_id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    type "LEARNING_RESOURCE_type_enum" NOT NULL,
    category VARCHAR(80),
    duration_minutes INTEGER,
    url TEXT,
    content TEXT,
    is_essential BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    CONSTRAINT chk_learning_resource_title CHECK (btrim(title) <> ''),
    CONSTRAINT chk_learning_resource_duration CHECK (duration_minutes IS NULL OR duration_minutes > 0),
    CONSTRAINT chk_learning_resource_url CHECK (url IS NULL OR url ~* '^https?://')
);
CREATE INDEX IF NOT EXISTS idx_learning_resource_topic
    ON "LEARNING_RESOURCE" (topic_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS "ACTIVITY_RESOURCE" (
    activity_id INTEGER NOT NULL REFERENCES "ACTIVITY"(activity_id) ON DELETE CASCADE,
    resource_id INTEGER NOT NULL REFERENCES "LEARNING_RESOURCE"(resource_id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (activity_id, resource_id),
    CONSTRAINT chk_activity_resource_order CHECK (sort_order > 0)
);
CREATE INDEX IF NOT EXISTS idx_activity_resource_resource ON "ACTIVITY_RESOURCE" (resource_id);

-- HU-39: el usuario abre y termina un recurso (lectura, video, practica).
CREATE TABLE IF NOT EXISTS "RESOURCE_PROGRESS" (
    user_id INTEGER NOT NULL REFERENCES "APP_USER"(user_id) ON DELETE CASCADE,
    resource_id INTEGER NOT NULL REFERENCES "LEARNING_RESOURCE"(resource_id) ON DELETE CASCADE,
    activity_id INTEGER REFERENCES "ACTIVITY"(activity_id) ON DELETE SET NULL,
    status "RESOURCE_PROGRESS_status_enum" NOT NULL DEFAULT 'started',
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    PRIMARY KEY (user_id, resource_id),
    CONSTRAINT chk_resource_progress_completed CHECK (
        (status = 'completed') = (completed_at IS NOT NULL)),
    CONSTRAINT chk_resource_progress_dates CHECK (completed_at IS NULL OR completed_at >= started_at)
);

-- ----------------------------------------------------------------------------
-- 4. ASSESSMENT (HU-40, HU-41)
-- Se guarda el cuestionario que realmente se mostro, para calificar contra
-- las mismas preguntas y conservar el historial de intentos.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "ASSESSMENT" (
    assessment_id SERIAL PRIMARY KEY,
    goal_id INTEGER NOT NULL REFERENCES "GOAL"(goal_id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL DEFAULT 'Evaluación de conocimientos',
    source VARCHAR(10) NOT NULL DEFAULT 'ai',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_assessment_source CHECK (source IN ('ai', 'manual'))
);
CREATE INDEX IF NOT EXISTS idx_assessment_goal ON "ASSESSMENT" (goal_id, created_at DESC);

CREATE TABLE IF NOT EXISTS "ASSESSMENT_QUESTION" (
    question_id SERIAL PRIMARY KEY,
    assessment_id INTEGER NOT NULL REFERENCES "ASSESSMENT"(assessment_id) ON DELETE CASCADE,
    topic_id INTEGER REFERENCES "TOPIC"(topic_id) ON DELETE SET NULL,
    category VARCHAR(80),
    question_text TEXT NOT NULL,
    explanation TEXT,
    sort_order INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT chk_assessment_question_text CHECK (btrim(question_text) <> ''),
    CONSTRAINT uq_assessment_question_order UNIQUE (assessment_id, sort_order)
);

CREATE TABLE IF NOT EXISTS "QUESTION_OPTION" (
    option_id SERIAL PRIMARY KEY,
    question_id INTEGER NOT NULL REFERENCES "ASSESSMENT_QUESTION"(question_id) ON DELETE CASCADE,
    option_key VARCHAR(1) NOT NULL,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT chk_question_option_key CHECK (option_key ~ '^[A-F]$'),
    CONSTRAINT uq_question_option_key UNIQUE (question_id, option_key)
);
-- Exactamente una respuesta correcta como maximo por pregunta.
CREATE UNIQUE INDEX IF NOT EXISTS uq_question_option_correct
    ON "QUESTION_OPTION" (question_id) WHERE is_correct;

CREATE TABLE IF NOT EXISTS "ASSESSMENT_ATTEMPT" (
    attempt_id SERIAL PRIMARY KEY,
    assessment_id INTEGER NOT NULL REFERENCES "ASSESSMENT"(assessment_id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES "APP_USER"(user_id) ON DELETE CASCADE,
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP,
    CONSTRAINT chk_assessment_attempt_dates CHECK (submitted_at IS NULL OR submitted_at >= started_at)
);
CREATE INDEX IF NOT EXISTS idx_assessment_attempt_user ON "ASSESSMENT_ATTEMPT" (user_id, submitted_at DESC);

CREATE TABLE IF NOT EXISTS "ATTEMPT_ANSWER" (
    attempt_id INTEGER NOT NULL REFERENCES "ASSESSMENT_ATTEMPT"(attempt_id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES "ASSESSMENT_QUESTION"(question_id) ON DELETE CASCADE,
    option_id INTEGER NOT NULL REFERENCES "QUESTION_OPTION"(option_id) ON DELETE CASCADE,
    answered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (attempt_id, question_id)
);

-- ----------------------------------------------------------------------------
-- 5. AI ADAPTATION (HU-04, HU-26, HU-27, HU-28, HU-29, HU-30, HU-31, HU-43,
-- HU-51, HU-52). Cada recomendacion guarda su explicacion (HU-30) y la
-- respuesta del usuario (HU-31). Las propuestas alternativas (HU-51) cuelgan
-- de una recomendacion y solo una puede seleccionarse (HU-52).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "AI_RECOMMENDATION" (
    recommendation_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES "APP_USER"(user_id) ON DELETE CASCADE,
    goal_id INTEGER REFERENCES "GOAL"(goal_id) ON DELETE CASCADE,
    activity_id INTEGER REFERENCES "ACTIVITY"(activity_id) ON DELETE SET NULL,
    type "AI_RECOMMENDATION_type_enum" NOT NULL,
    alert_level VARCHAR(10) NOT NULL DEFAULT 'info',
    title VARCHAR(150) NOT NULL,
    why_suggested TEXT NOT NULL,
    solution_focus VARCHAR(150),
    solutions JSONB NOT NULL DEFAULT '[]'::jsonb,
    expected_benefit TEXT,
    metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
    status "AI_RECOMMENDATION_status_enum" NOT NULL DEFAULT 'pending',
    ai_model VARCHAR(60),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP,
    CONSTRAINT chk_ai_recommendation_level CHECK (alert_level IN ('info', 'warning', 'critical')),
    CONSTRAINT chk_ai_recommendation_title CHECK (btrim(title) <> ''),
    CONSTRAINT chk_ai_recommendation_why CHECK (btrim(why_suggested) <> ''),
    CONSTRAINT chk_ai_recommendation_solutions CHECK (jsonb_typeof(solutions) = 'array'),
    CONSTRAINT chk_ai_recommendation_metrics CHECK (jsonb_typeof(metrics) = 'object'),
    CONSTRAINT chk_ai_recommendation_response CHECK (
        (status IN ('accepted', 'rejected')) = (responded_at IS NOT NULL)),
    CONSTRAINT chk_ai_recommendation_response_date CHECK (
        responded_at IS NULL OR responded_at >= created_at)
);
CREATE INDEX IF NOT EXISTS idx_ai_recommendation_user ON "AI_RECOMMENDATION" (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_recommendation_goal_pending
    ON "AI_RECOMMENDATION" (goal_id) WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS "REPLAN_PROPOSAL" (
    proposal_id SERIAL PRIMARY KEY,
    recommendation_id INTEGER NOT NULL REFERENCES "AI_RECOMMENDATION"(recommendation_id) ON DELETE CASCADE,
    proposal_type "REPLAN_PROPOSAL_type_enum" NOT NULL,
    title VARCHAR(100) NOT NULL,
    tagline VARCHAR(150),
    description TEXT NOT NULL,
    session_info VARCHAR(100),
    changes JSONB NOT NULL DEFAULT '[]'::jsonb,
    impact TEXT,
    is_recommended BOOLEAN NOT NULL DEFAULT FALSE,
    new_due_date DATE,
    status "REPLAN_PROPOSAL_status_enum" NOT NULL DEFAULT 'proposed',
    selected_at TIMESTAMP,
    CONSTRAINT uq_replan_proposal_type UNIQUE (recommendation_id, proposal_type),
    CONSTRAINT chk_replan_proposal_changes CHECK (jsonb_typeof(changes) = 'array'),
    CONSTRAINT chk_replan_proposal_selected CHECK ((status = 'selected') = (selected_at IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_replan_proposal_selected
    ON "REPLAN_PROPOSAL" (recommendation_id) WHERE status = 'selected';
CREATE UNIQUE INDEX IF NOT EXISTS uq_replan_proposal_recommended
    ON "REPLAN_PROPOSAL" (recommendation_id) WHERE is_recommended;

-- Detalle de cada propuesta: que actividad se mueve, cual se agrega, cual se
-- conserva. Permite mostrar y aplicar exactamente lo que el usuario acepto.
CREATE TABLE IF NOT EXISTS "REPLAN_PROPOSAL_ITEM" (
    item_id SERIAL PRIMARY KEY,
    proposal_id INTEGER NOT NULL REFERENCES "REPLAN_PROPOSAL"(proposal_id) ON DELETE CASCADE,
    activity_id INTEGER REFERENCES "ACTIVITY"(activity_id) ON DELETE CASCADE,
    action "REPLAN_PROPOSAL_ITEM_action_enum" NOT NULL,
    new_title VARCHAR(200),
    estimated_minutes INTEGER,
    new_scheduled_date DATE,
    new_start_time TIME,
    new_end_time TIME,
    CONSTRAINT chk_replan_item_target CHECK (
        (action = 'add' AND activity_id IS NULL AND new_title IS NOT NULL AND btrim(new_title) <> '')
        OR (action IN ('reschedule', 'keep') AND activity_id IS NOT NULL)),
    CONSTRAINT chk_replan_item_reschedule CHECK (action <> 'reschedule' OR new_scheduled_date IS NOT NULL),
    CONSTRAINT chk_replan_item_times CHECK (
        new_start_time IS NULL OR new_end_time IS NULL OR new_end_time > new_start_time),
    CONSTRAINT chk_replan_item_minutes CHECK (estimated_minutes IS NULL OR estimated_minutes > 0)
);
CREATE INDEX IF NOT EXISTS idx_replan_item_proposal ON "REPLAN_PROPOSAL_ITEM" (proposal_id);

-- FKs reservadas desde el Sprint 2 (columnas ya existentes y hoy vacias).
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_activity_origin_recommendation') THEN
        ALTER TABLE "ACTIVITY" ADD CONSTRAINT fk_activity_origin_recommendation
            FOREIGN KEY (origin_recommendation_id) REFERENCES "AI_RECOMMENDATION"(recommendation_id)
            ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_activity_schedule_recommendation') THEN
        ALTER TABLE "ACTIVITY_SCHEDULE" ADD CONSTRAINT fk_activity_schedule_recommendation
            FOREIGN KEY (recommendation_id) REFERENCES "AI_RECOMMENDATION"(recommendation_id)
            ON DELETE SET NULL;
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 6. TRIGGERS
-- ----------------------------------------------------------------------------

-- La etapa de GOAL_TOPIC debe pertenecer al mismo objetivo.
CREATE OR REPLACE FUNCTION fn_goal_topic_validate()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.stage_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM "STAGE" WHERE stage_id = NEW.stage_id AND goal_id = NEW.goal_id
    ) THEN
        RAISE EXCEPTION 'La etapa % no pertenece al objetivo %', NEW.stage_id, NEW.goal_id
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- El intento pertenece al duenio del objetivo evaluado.
CREATE OR REPLACE FUNCTION fn_assessment_attempt_validate()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM "ASSESSMENT" a JOIN "GOAL" g ON g.goal_id = a.goal_id
        WHERE a.assessment_id = NEW.assessment_id AND g.user_id = NEW.user_id
    ) THEN
        RAISE EXCEPTION 'El usuario % no puede responder la evaluacion %', NEW.user_id, NEW.assessment_id
            USING ERRCODE = 'check_violation';
    END IF;
    IF TG_OP = 'UPDATE' AND OLD.submitted_at IS NOT NULL
       AND NEW.submitted_at IS DISTINCT FROM OLD.submitted_at THEN
        RAISE EXCEPTION 'El intento % ya fue enviado', OLD.attempt_id
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- La respuesta corresponde a una pregunta del cuestionario del intento y a
-- una opcion de esa pregunta; no se cambian respuestas de un intento enviado.
CREATE OR REPLACE FUNCTION fn_attempt_answer_validate()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM "ASSESSMENT_ATTEMPT" t
        JOIN "ASSESSMENT_QUESTION" q ON q.assessment_id = t.assessment_id
        WHERE t.attempt_id = NEW.attempt_id AND q.question_id = NEW.question_id
    ) THEN
        RAISE EXCEPTION 'La pregunta % no pertenece al intento %', NEW.question_id, NEW.attempt_id
            USING ERRCODE = 'check_violation';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM "QUESTION_OPTION" WHERE option_id = NEW.option_id AND question_id = NEW.question_id
    ) THEN
        RAISE EXCEPTION 'La opcion % no pertenece a la pregunta %', NEW.option_id, NEW.question_id
            USING ERRCODE = 'check_violation';
    END IF;
    IF EXISTS (
        SELECT 1 FROM "ASSESSMENT_ATTEMPT" WHERE attempt_id = NEW.attempt_id AND submitted_at IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'El intento % ya fue enviado', NEW.attempt_id
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- HU-41: al enviar un intento se actualiza el dominio de cada tema evaluado
-- con el porcentaje de aciertos de ese intento (sin responder = incorrecta).
CREATE OR REPLACE FUNCTION fn_assessment_attempt_submitted()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.submitted_at IS NULL AND NEW.submitted_at IS NOT NULL THEN
        INSERT INTO "USER_TOPIC" (user_id, topic_id, mastery_percentage, last_evaluated_at, updated_at)
        SELECT NEW.user_id, q.topic_id,
               ROUND(100.0 * COUNT(*) FILTER (WHERE o.is_correct) / COUNT(*), 2),
               NEW.submitted_at, CURRENT_TIMESTAMP
        FROM "ASSESSMENT_QUESTION" q
        LEFT JOIN "ATTEMPT_ANSWER" aa ON aa.question_id = q.question_id AND aa.attempt_id = NEW.attempt_id
        LEFT JOIN "QUESTION_OPTION" o ON o.option_id = aa.option_id
        WHERE q.assessment_id = NEW.assessment_id AND q.topic_id IS NOT NULL
        GROUP BY q.topic_id
        ON CONFLICT (user_id, topic_id) DO UPDATE SET
            mastery_percentage = EXCLUDED.mastery_percentage,
            last_evaluated_at = EXCLUDED.last_evaluated_at,
            updated_at = CURRENT_TIMESTAMP;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- HU-04, HU-26, HU-31: objetivo y actividad del usuario; la respuesta solo se
-- da una vez (pending -> accepted | rejected | expired).
CREATE OR REPLACE FUNCTION fn_ai_recommendation_validate()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.goal_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM "GOAL" WHERE goal_id = NEW.goal_id AND user_id = NEW.user_id
    ) THEN
        RAISE EXCEPTION 'El objetivo % no pertenece al usuario %', NEW.goal_id, NEW.user_id
            USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.activity_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM "ACTIVITY" a JOIN "STAGE" s ON s.stage_id = a.stage_id
        JOIN "GOAL" g ON g.goal_id = s.goal_id
        WHERE a.activity_id = NEW.activity_id AND g.user_id = NEW.user_id
          AND (NEW.goal_id IS NULL OR g.goal_id = NEW.goal_id)
    ) THEN
        RAISE EXCEPTION 'La actividad % no pertenece al objetivo o usuario indicado', NEW.activity_id
            USING ERRCODE = 'check_violation';
    END IF;
    IF TG_OP = 'UPDATE' AND OLD.status <> 'pending' AND NEW.status IS DISTINCT FROM OLD.status THEN
        RAISE EXCEPTION 'La recomendacion % ya fue respondida (%)', OLD.recommendation_id, OLD.status
            USING ERRCODE = 'check_violation';
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.status IN ('accepted', 'rejected') AND OLD.status = 'pending'
       AND NEW.responded_at IS NULL THEN
        NEW.responded_at := CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- HU-31: al rechazar o expirar la recomendacion se descartan sus propuestas.
CREATE OR REPLACE FUNCTION fn_ai_recommendation_closed()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IN ('rejected', 'expired') AND OLD.status = 'pending' THEN
        UPDATE "REPLAN_PROPOSAL" SET status = 'discarded'
        WHERE recommendation_id = NEW.recommendation_id AND status = 'proposed';
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- HU-52: seleccionar una propuesta acepta la recomendacion y descarta las
-- demas. Solo se elige sobre una recomendacion pendiente.
CREATE OR REPLACE FUNCTION fn_replan_proposal_before()
RETURNS TRIGGER AS $$
DECLARE
    v_status "AI_RECOMMENDATION_status_enum";
BEGIN
    IF NEW.status = 'selected' AND OLD.status IS DISTINCT FROM 'selected' THEN
        SELECT status INTO v_status FROM "AI_RECOMMENDATION"
        WHERE recommendation_id = NEW.recommendation_id FOR UPDATE;
        IF v_status <> 'pending' THEN
            RAISE EXCEPTION 'No se puede seleccionar una propuesta de una recomendacion %', v_status
                USING ERRCODE = 'check_violation';
        END IF;
        IF NEW.selected_at IS NULL THEN
            NEW.selected_at := CURRENT_TIMESTAMP;
        END IF;
    ELSIF NEW.status <> 'selected' THEN
        IF OLD.status = 'selected' THEN
            RAISE EXCEPTION 'Una propuesta seleccionada no puede cambiar de estado'
                USING ERRCODE = 'check_violation';
        END IF;
        NEW.selected_at := NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_replan_proposal_selected()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'selected' AND OLD.status IS DISTINCT FROM 'selected' THEN
        UPDATE "REPLAN_PROPOSAL" SET status = 'discarded'
        WHERE recommendation_id = NEW.recommendation_id
          AND proposal_id <> NEW.proposal_id AND status = 'proposed';
        UPDATE "AI_RECOMMENDATION" SET status = 'accepted', responded_at = NEW.selected_at
        WHERE recommendation_id = NEW.recommendation_id AND status = 'pending';
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- HU-29: una propuesta no puede mover ni reprogramar trabajo ya completado,
-- y solo toca actividades del objetivo de la recomendacion. HU-08: la nueva
-- fecha limite propuesta no puede quedar en el pasado.
CREATE OR REPLACE FUNCTION fn_replan_item_validate()
RETURNS TRIGGER AS $$
DECLARE
    v_goal INTEGER;
    v_activity_goal INTEGER;
    v_activity_status "ACTIVITY_status_enum";
BEGIN
    SELECT r.goal_id INTO v_goal
    FROM "REPLAN_PROPOSAL" p JOIN "AI_RECOMMENDATION" r ON r.recommendation_id = p.recommendation_id
    WHERE p.proposal_id = NEW.proposal_id;

    IF NEW.activity_id IS NOT NULL THEN
        SELECT s.goal_id, a.status INTO v_activity_goal, v_activity_status
        FROM "ACTIVITY" a JOIN "STAGE" s ON s.stage_id = a.stage_id
        WHERE a.activity_id = NEW.activity_id;
        IF v_goal IS NULL OR v_activity_goal IS DISTINCT FROM v_goal THEN
            RAISE EXCEPTION 'La actividad % no pertenece al objetivo de la propuesta', NEW.activity_id
                USING ERRCODE = 'check_violation';
        END IF;
        IF NEW.action = 'reschedule' AND v_activity_status = 'completed' THEN
            RAISE EXCEPTION 'No se puede reprogramar la actividad completada % (HU-29)', NEW.activity_id
                USING ERRCODE = 'check_violation';
        END IF;
    END IF;
    IF NEW.new_scheduled_date IS NOT NULL AND NEW.new_scheduled_date < CURRENT_DATE THEN
        RAISE EXCEPTION 'La nueva fecha % ya paso', NEW.new_scheduled_date
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_replan_proposal_due_validate()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.new_due_date IS NOT NULL AND NEW.status = 'proposed'
       AND (TG_OP = 'INSERT' OR NEW.new_due_date IS DISTINCT FROM OLD.new_due_date)
       AND NEW.new_due_date < CURRENT_DATE THEN
        RAISE EXCEPTION 'La fecha limite propuesta % ya paso (HU-08)', NEW.new_due_date
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    def RECORD;
BEGIN
    FOR def IN
        SELECT * FROM (VALUES
            ('trg_goal_topic_validate', 'BEFORE INSERT OR UPDATE', '"GOAL_TOPIC"', 'fn_goal_topic_validate'),
            ('trg_user_topic_updated_at', 'BEFORE UPDATE', '"USER_TOPIC"', 'update_updated_at_column'),
            ('trg_assessment_attempt_validate', 'BEFORE INSERT OR UPDATE', '"ASSESSMENT_ATTEMPT"', 'fn_assessment_attempt_validate'),
            ('trg_assessment_attempt_submitted', 'AFTER UPDATE OF submitted_at', '"ASSESSMENT_ATTEMPT"', 'fn_assessment_attempt_submitted'),
            ('trg_attempt_answer_validate', 'BEFORE INSERT OR UPDATE', '"ATTEMPT_ANSWER"', 'fn_attempt_answer_validate'),
            ('trg_ai_recommendation_validate', 'BEFORE INSERT OR UPDATE', '"AI_RECOMMENDATION"', 'fn_ai_recommendation_validate'),
            ('trg_ai_recommendation_closed', 'AFTER UPDATE OF status', '"AI_RECOMMENDATION"', 'fn_ai_recommendation_closed'),
            ('trg_replan_proposal_before', 'BEFORE UPDATE OF status', '"REPLAN_PROPOSAL"', 'fn_replan_proposal_before'),
            ('trg_replan_proposal_selected', 'AFTER UPDATE OF status', '"REPLAN_PROPOSAL"', 'fn_replan_proposal_selected'),
            ('trg_replan_proposal_due_validate', 'BEFORE INSERT OR UPDATE OF new_due_date', '"REPLAN_PROPOSAL"', 'fn_replan_proposal_due_validate'),
            ('trg_replan_item_validate', 'BEFORE INSERT OR UPDATE', '"REPLAN_PROPOSAL_ITEM"', 'fn_replan_item_validate')
        ) AS t(trigger_name, timing, table_name, function_name)
    LOOP
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = def.trigger_name) THEN
            EXECUTE format('CREATE TRIGGER %I %s ON %s FOR EACH ROW EXECUTE FUNCTION %I()',
                           def.trigger_name, def.timing, def.table_name, def.function_name);
        END IF;
    END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 7. PERSISTENCIA DESDE EL BACKEND
--   * LEARNING_RESOURCE.details   : contenido enriquecido del recurso (resumen,
--                                   puntos clave, lectura, pasos, codigo...).
--   * GOAL_RESOURCE               : recursos asociados directamente a un objetivo.
--   * REPLAN_PROPOSAL.presentation: textos y contadores que muestra la app.
--   * AI_RECOMMENDATION.details   : datos del diagnostico que no son columnas
--                                   (mensaje de alerta, contexto de dificultad...).
-- Se agregan con ALTER para que el script siga siendo repetible en bases existentes.
-- ----------------------------------------------------------------------------
ALTER TABLE "LEARNING_RESOURCE" ADD COLUMN IF NOT EXISTS details JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE "REPLAN_PROPOSAL" ADD COLUMN IF NOT EXISTS presentation JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE "AI_RECOMMENDATION" ADD COLUMN IF NOT EXISTS details JSONB NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_learning_resource_details') THEN
        ALTER TABLE "LEARNING_RESOURCE" ADD CONSTRAINT chk_learning_resource_details
            CHECK (jsonb_typeof(details) = 'object');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_replan_proposal_presentation') THEN
        ALTER TABLE "REPLAN_PROPOSAL" ADD CONSTRAINT chk_replan_proposal_presentation
            CHECK (jsonb_typeof(presentation) = 'object');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_ai_recommendation_details') THEN
        ALTER TABLE "AI_RECOMMENDATION" ADD CONSTRAINT chk_ai_recommendation_details
            CHECK (jsonb_typeof(details) = 'object');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "GOAL_RESOURCE" (
    goal_id INTEGER NOT NULL REFERENCES "GOAL"(goal_id) ON DELETE CASCADE,
    resource_id INTEGER NOT NULL REFERENCES "LEARNING_RESOURCE"(resource_id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (goal_id, resource_id),
    CONSTRAINT chk_goal_resource_order CHECK (sort_order > 0)
);
CREATE INDEX IF NOT EXISTS idx_goal_resource_resource ON "GOAL_RESOURCE" (resource_id);

-- Alias en minusculas, como en los sprints anteriores.
CREATE OR REPLACE VIEW topic AS SELECT * FROM "TOPIC";
CREATE OR REPLACE VIEW goal_topic AS SELECT * FROM "GOAL_TOPIC";
CREATE OR REPLACE VIEW activity_topic AS SELECT * FROM "ACTIVITY_TOPIC";
CREATE OR REPLACE VIEW user_topic AS SELECT * FROM "USER_TOPIC";
CREATE OR REPLACE VIEW learning_resource AS SELECT * FROM "LEARNING_RESOURCE";
CREATE OR REPLACE VIEW activity_resource AS SELECT * FROM "ACTIVITY_RESOURCE";
CREATE OR REPLACE VIEW resource_progress AS SELECT * FROM "RESOURCE_PROGRESS";
CREATE OR REPLACE VIEW assessment AS SELECT * FROM "ASSESSMENT";
CREATE OR REPLACE VIEW assessment_question AS SELECT * FROM "ASSESSMENT_QUESTION";
CREATE OR REPLACE VIEW question_option AS SELECT * FROM "QUESTION_OPTION";
CREATE OR REPLACE VIEW assessment_attempt AS SELECT * FROM "ASSESSMENT_ATTEMPT";
CREATE OR REPLACE VIEW attempt_answer AS SELECT * FROM "ATTEMPT_ANSWER";
CREATE OR REPLACE VIEW ai_recommendation AS SELECT * FROM "AI_RECOMMENDATION";
CREATE OR REPLACE VIEW replan_proposal AS SELECT * FROM "REPLAN_PROPOSAL";
CREATE OR REPLACE VIEW replan_proposal_item AS SELECT * FROM "REPLAN_PROPOSAL_ITEM";
CREATE OR REPLACE VIEW goal_resource AS SELECT * FROM "GOAL_RESOURCE";

COMMIT;
