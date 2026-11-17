-- FLOWSTEP - Sprint 3 (gestion de objetivos, avisos y cuenta).
-- HU-12, HU-23, HU-25, HU-32, HU-33, HU-34, HU-44, HU-45, HU-46, HU-47,
-- HU-48, HU-49, HU-50 y HU-55.
-- Aplicar despues de 01 a 08. Migracion aditiva, transaccional y repetible:
-- no borra tablas, no cambia enums existentes y no modifica filas existentes.
BEGIN;

-- ----------------------------------------------------------------------------
-- 1. TIPOS ENUMERADOS
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'USER_PREFERENCE_summary_frequency_enum' AND n.nspname = current_schema()
    ) THEN
        CREATE TYPE "USER_PREFERENCE_summary_frequency_enum" AS ENUM ('daily', 'weekly', 'monthly');
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'USER_PREFERENCE_goals_sort_by_enum' AND n.nspname = current_schema()
    ) THEN
        CREATE TYPE "USER_PREFERENCE_goals_sort_by_enum" AS ENUM
            ('priority', 'due_date', 'progress', 'created_at');
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'NOTIFICATION_type_enum' AND n.nspname = current_schema()
    ) THEN
        CREATE TYPE "NOTIFICATION_type_enum" AS ENUM
            ('periodic_summary', 'delay_alert', 'activity_reminder');
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. HU-49: PREFERENCIAS DEL USUARIO
-- Una fila por usuario. Si no existe, v_user_preferences devuelve los valores
-- por defecto, de modo que el backend puede crear la fila recien al guardar.
-- La duracion de sesion sigue en USER_AVAILABILITY_PREFERENCE (Sprint 2).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "USER_PREFERENCE" (
    user_id INTEGER PRIMARY KEY REFERENCES "APP_USER"(user_id) ON DELETE CASCADE,
    reminders_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    reminder_minutes_before INTEGER NOT NULL DEFAULT 30,
    delay_alerts_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    periodic_summary_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    summary_frequency "USER_PREFERENCE_summary_frequency_enum" NOT NULL DEFAULT 'weekly',
    summary_day_of_week "AVAILABILITY_day_of_week_enum" NOT NULL DEFAULT 'sunday',
    summary_time TIME NOT NULL DEFAULT '18:00',
    goals_sort_by "USER_PREFERENCE_goals_sort_by_enum" NOT NULL DEFAULT 'priority',
    timezone VARCHAR(64) NOT NULL DEFAULT 'America/La_Paz',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_user_preference_reminder_minutes
        CHECK (reminder_minutes_before IN (5, 10, 15, 30, 60, 120))
);

-- La zona horaria debe existir en PostgreSQL (un CHECK no puede consultarlo).
CREATE OR REPLACE FUNCTION fn_validate_user_preference()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = NEW.timezone) THEN
        RAISE EXCEPTION 'Zona horaria no valida: %', NEW.timezone
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 3. HU-32, HU-33, HU-46: HISTORIAL DE ESTADOS DEL OBJETIVO
-- El trigger lo llena automaticamente; el backend solo actualiza GOAL.status.
-- Motivo opcional: SET LOCAL flowstep.change_reason = '...'; antes del UPDATE.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "GOAL_STATUS_HISTORY" (
    goal_status_history_id SERIAL PRIMARY KEY,
    goal_id INTEGER NOT NULL REFERENCES "GOAL"(goal_id) ON DELETE CASCADE,
    previous_status "GOAL_status_enum" NOT NULL,
    new_status "GOAL_status_enum" NOT NULL,
    reason TEXT,
    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_goal_status_history_change CHECK (previous_status <> new_status)
);

CREATE INDEX IF NOT EXISTS idx_goal_status_history_goal_changed
    ON "GOAL_STATUS_HISTORY" (goal_id, changed_at);

-- ----------------------------------------------------------------------------
-- 4. HU-34: HISTORIAL DE CAMBIOS DE FECHA LIMITE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "GOAL_DEADLINE_HISTORY" (
    goal_deadline_history_id SERIAL PRIMARY KEY,
    goal_id INTEGER NOT NULL REFERENCES "GOAL"(goal_id) ON DELETE CASCADE,
    previous_due_date DATE,
    new_due_date DATE,
    reason TEXT,
    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_goal_deadline_history_change
        CHECK (previous_due_date IS DISTINCT FROM new_due_date)
);

CREATE INDEX IF NOT EXISTS idx_goal_deadline_history_goal_changed
    ON "GOAL_DEADLINE_HISTORY" (goal_id, changed_at);

-- ----------------------------------------------------------------------------
-- 5. HU-23, HU-25: AVISOS ENTREGADOS AL USUARIO
-- El backend (tarea programada) inserta una fila por aviso usando las vistas
-- v_pending_periodic_summaries y v_pending_delay_alerts. El indice unico
-- evita duplicar el mismo resumen o la misma alerta del mismo periodo.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "NOTIFICATION" (
    notification_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES "APP_USER"(user_id) ON DELETE CASCADE,
    goal_id INTEGER REFERENCES "GOAL"(goal_id) ON DELETE CASCADE,
    type "NOTIFICATION_type_enum" NOT NULL,
    title VARCHAR(150) NOT NULL,
    body TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    period_start DATE,
    period_end DATE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP,
    CONSTRAINT chk_notification_title CHECK (btrim(title) <> ''),
    CONSTRAINT chk_notification_period CHECK (
        period_start IS NULL OR period_end IS NULL OR period_end >= period_start),
    CONSTRAINT chk_notification_read CHECK (read_at IS NULL OR read_at >= created_at),
    CONSTRAINT chk_notification_summary_period CHECK (
        type <> 'periodic_summary' OR (period_start IS NOT NULL AND period_end IS NOT NULL)),
    CONSTRAINT chk_notification_delay_goal CHECK (
        type <> 'delay_alert' OR (goal_id IS NOT NULL AND period_start IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_notification_period
    ON "NOTIFICATION" (user_id, type, COALESCE(goal_id, 0), period_start)
    WHERE period_start IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notification_user_created
    ON "NOTIFICATION" (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_user_unread
    ON "NOTIFICATION" (user_id) WHERE read_at IS NULL;

-- ----------------------------------------------------------------------------
-- 6. HU-55: SESIONES DE AUTENTICACION
-- Cada login crea una fila; su session_id viaja en el JWT (claim "sid").
-- Cerrar sesion marca revoked_at y el token deja de ser valido aunque no
-- haya expirado. v_active_auth_session indica si un sid sigue vigente.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "AUTH_SESSION" (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES "APP_USER"(user_id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP,
    user_agent VARCHAR(255),
    CONSTRAINT chk_auth_session_expiry CHECK (expires_at > created_at),
    CONSTRAINT chk_auth_session_revoked CHECK (revoked_at IS NULL OR revoked_at >= created_at)
);

CREATE INDEX IF NOT EXISTS idx_auth_session_user_open
    ON "AUTH_SESSION" (user_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_auth_session_expires
    ON "AUTH_SESSION" (expires_at);

-- ----------------------------------------------------------------------------
-- 7. HU-12: MOTIVO DEL BORRADO LOGICO DE UNA ACTIVIDAD
-- El borrado de HU-12 es logico (deleted_at). Las vistas de progreso, ritmo,
-- agenda y calendario ya excluyen actividades con deleted_at.
-- ----------------------------------------------------------------------------
ALTER TABLE "ACTIVITY" ADD COLUMN IF NOT EXISTS deletion_reason VARCHAR(255);

-- ----------------------------------------------------------------------------
-- 8. INDICES PARA HU-44, HU-45, HU-47, HU-48 Y HU-50
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_goal_user_status_priority
    ON "GOAL" (user_id, status, priority, due_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_activity_completed_at
    ON "ACTIVITY" (completed_at) WHERE completed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_work_session_date
    ON "WORK_SESSION" (session_date);

-- ----------------------------------------------------------------------------
-- 9. TRIGGERS
-- ----------------------------------------------------------------------------

-- HU-32, HU-33, HU-46: transiciones validas y fecha de cierre.
--   active    -> paused | completed | archived
--   paused    -> active | archived          (reanudar o archivar)
--   completed -> active | archived          (reabrir o archivar)
--   archived  -> active                     (restaurar)
-- closed_at se fija al completar o archivar y se limpia al volver a abrir.
CREATE OR REPLACE FUNCTION fn_goal_status_before()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.status IN ('completed', 'archived') AND NEW.closed_at IS NULL THEN
            NEW.closed_at := CURRENT_TIMESTAMP;
        ELSIF NEW.status IN ('active', 'paused') THEN
            NEW.closed_at := NULL;
        END IF;
        RETURN NEW;
    END IF;

    IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
        RETURN NEW;
    END IF;

    IF NOT (
        (OLD.status = 'active'    AND NEW.status IN ('paused', 'completed', 'archived')) OR
        (OLD.status = 'paused'    AND NEW.status IN ('active', 'archived')) OR
        (OLD.status = 'completed' AND NEW.status IN ('active', 'archived')) OR
        (OLD.status = 'archived'  AND NEW.status = 'active')
    ) THEN
        RAISE EXCEPTION 'Transicion de estado no permitida para el objetivo %: % -> %',
            OLD.goal_id, OLD.status, NEW.status
            USING ERRCODE = 'check_violation';
    END IF;

    IF NEW.status IN ('completed', 'archived') THEN
        NEW.closed_at := CURRENT_TIMESTAMP;
    ELSE
        NEW.closed_at := NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_goal_status_history()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        INSERT INTO "GOAL_STATUS_HISTORY" (goal_id, previous_status, new_status, reason)
        VALUES (NEW.goal_id, OLD.status, NEW.status,
                NULLIF(current_setting('flowstep.change_reason', true), ''));
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- HU-34: la nueva fecha limite no puede quedar en el pasado y solo se cambia
-- en objetivos activos o pausados. chk_goal_dates (Sprint 1) exige ademas
-- due_date >= start_date. CURRENT_DATE usa la zona de la sesion (America/La_Paz
-- en docker-compose).
CREATE OR REPLACE FUNCTION fn_goal_deadline_before()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.due_date IS NOT DISTINCT FROM OLD.due_date THEN
        RETURN NEW;
    END IF;
    IF OLD.status NOT IN ('active', 'paused') OR NEW.status NOT IN ('active', 'paused') THEN
        RAISE EXCEPTION 'Solo se puede cambiar la fecha limite de un objetivo activo o pausado'
            USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.due_date IS NOT NULL AND NEW.due_date < CURRENT_DATE THEN
        RAISE EXCEPTION 'La nueva fecha limite (%) no puede ser anterior a hoy (%)',
            NEW.due_date, CURRENT_DATE
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_goal_deadline_history()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.due_date IS DISTINCT FROM OLD.due_date THEN
        INSERT INTO "GOAL_DEADLINE_HISTORY" (goal_id, previous_due_date, new_due_date, reason)
        VALUES (NEW.goal_id, OLD.due_date, NEW.due_date,
                NULLIF(current_setting('flowstep.change_reason', true), ''));
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- HU-12: al eliminar logicamente una actividad, sus sub-actividades tambien
-- salen del plan. Al restaurarla vuelven solo las que se borraron con ella.
CREATE OR REPLACE FUNCTION fn_activity_soft_delete_before()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.deleted_at IS NULL THEN
        NEW.deletion_reason := NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_activity_soft_delete_cascade()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
        UPDATE "ACTIVITY"
        SET deleted_at = NEW.deleted_at,
            deletion_reason = COALESCE(deletion_reason, NEW.deletion_reason)
        WHERE parent_activity_id = NEW.activity_id AND deleted_at IS NULL;
    ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
        UPDATE "ACTIVITY"
        SET deleted_at = NULL
        WHERE parent_activity_id = NEW.activity_id AND deleted_at = OLD.deleted_at;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_user_preference_updated_at') THEN
        CREATE TRIGGER trg_user_preference_updated_at
        BEFORE UPDATE ON "USER_PREFERENCE"
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_user_preference_validate') THEN
        CREATE TRIGGER trg_user_preference_validate
        BEFORE INSERT OR UPDATE OF timezone ON "USER_PREFERENCE"
        FOR EACH ROW EXECUTE FUNCTION fn_validate_user_preference();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_goal_status_before') THEN
        CREATE TRIGGER trg_goal_status_before
        BEFORE INSERT OR UPDATE OF status ON "GOAL"
        FOR EACH ROW EXECUTE FUNCTION fn_goal_status_before();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_goal_status_history') THEN
        CREATE TRIGGER trg_goal_status_history
        AFTER UPDATE OF status ON "GOAL"
        FOR EACH ROW EXECUTE FUNCTION fn_goal_status_history();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_goal_deadline_before') THEN
        CREATE TRIGGER trg_goal_deadline_before
        BEFORE UPDATE OF due_date ON "GOAL"
        FOR EACH ROW EXECUTE FUNCTION fn_goal_deadline_before();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_goal_deadline_history') THEN
        CREATE TRIGGER trg_goal_deadline_history
        AFTER UPDATE OF due_date ON "GOAL"
        FOR EACH ROW EXECUTE FUNCTION fn_goal_deadline_history();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_activity_soft_delete_before') THEN
        CREATE TRIGGER trg_activity_soft_delete_before
        BEFORE UPDATE OF deleted_at ON "ACTIVITY"
        FOR EACH ROW EXECUTE FUNCTION fn_activity_soft_delete_before();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_activity_soft_delete_cascade') THEN
        CREATE TRIGGER trg_activity_soft_delete_cascade
        AFTER UPDATE OF deleted_at ON "ACTIVITY"
        FOR EACH ROW EXECUTE FUNCTION fn_activity_soft_delete_cascade();
    END IF;
END $$;

-- Alias en minusculas, como en los sprints anteriores.
CREATE OR REPLACE VIEW user_preference AS SELECT * FROM "USER_PREFERENCE";
CREATE OR REPLACE VIEW goal_status_history AS SELECT * FROM "GOAL_STATUS_HISTORY";
CREATE OR REPLACE VIEW goal_deadline_history AS SELECT * FROM "GOAL_DEADLINE_HISTORY";
CREATE OR REPLACE VIEW notification AS SELECT * FROM "NOTIFICATION";
CREATE OR REPLACE VIEW auth_session AS SELECT * FROM "AUTH_SESSION";

COMMIT;
