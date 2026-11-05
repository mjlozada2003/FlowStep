-- FLOWSTEP - Sprint 2. Aplicar despues del esquema del Sprint 1.
-- Migracion aditiva y transaccional: no borra ni reemplaza datos existentes.
-- Los nombres de enums coinciden con las entidades actuales de TypeORM.
BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'AVAILABILITY_day_of_week_enum' AND n.nspname = current_schema()
    ) THEN
        CREATE TYPE "AVAILABILITY_day_of_week_enum" AS ENUM
            ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'ACTIVITY_SCHEDULE_reason_enum' AND n.nspname = current_schema()
    ) THEN
        CREATE TYPE "ACTIVITY_SCHEDULE_reason_enum" AS ENUM
            ('initial_plan', 'user_reschedule', 'ai_adjustment');
    END IF;
END $$;

-- HU-07, HU-35: varias franjas por usuario y dia. La duracion es derivada.
CREATE TABLE IF NOT EXISTS "AVAILABILITY" (
    availability_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES "APP_USER"(user_id) ON DELETE CASCADE,
    day_of_week "AVAILABILITY_day_of_week_enum" NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_availability_user_day_start
    ON "AVAILABILITY" (user_id, day_of_week, start_time);

-- HU-07: guarda la duracion elegida por sesion; el total semanal sigue derivandose
-- de las franjas de AVAILABILITY.
CREATE TABLE IF NOT EXISTS "USER_AVAILABILITY_PREFERENCE" (
    user_id INTEGER PRIMARY KEY REFERENCES "APP_USER"(user_id) ON DELETE CASCADE,
    session_duration_minutes INTEGER NOT NULL DEFAULT 60,
    CONSTRAINT chk_user_availability_session_duration
        CHECK (session_duration_minutes IN (30, 60, 120))
);

-- HU-14, HU-36: cada reprogramacion agrega una version; no reemplaza la anterior.
-- recommendation_id se reserva para AI_RECOMMENDATION (otro sprint del ER).
CREATE TABLE IF NOT EXISTS "ACTIVITY_SCHEDULE" (
    schedule_id SERIAL PRIMARY KEY,
    activity_id INTEGER NOT NULL REFERENCES "ACTIVITY"(activity_id) ON DELETE CASCADE,
    recommendation_id INTEGER,
    version_number INTEGER NOT NULL DEFAULT 1,
    scheduled_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    reason "ACTIVITY_SCHEDULE_reason_enum" NOT NULL DEFAULT 'initial_plan',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_activity_schedule_version
    ON "ACTIVITY_SCHEDULE" (activity_id, version_number);
CREATE INDEX IF NOT EXISTS idx_activity_schedule_date
    ON "ACTIVITY_SCHEDULE" (scheduled_date);

-- HU-16: conserva transiciones y la fecha anterior de completado al volver a pendiente.
CREATE TABLE IF NOT EXISTS "ACTIVITY_STATUS_HISTORY" (
    activity_status_history_id SERIAL PRIMARY KEY,
    activity_id INTEGER NOT NULL REFERENCES "ACTIVITY"(activity_id) ON DELETE CASCADE,
    previous_status "ACTIVITY_status_enum" NOT NULL,
    new_status "ACTIVITY_status_enum" NOT NULL,
    previous_completed_at TIMESTAMP,
    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "IDX_ACTIVITY_STATUS_HISTORY_ACTIVITY_CHANGED"
    ON "ACTIVITY_STATUS_HISTORY" (activity_id, changed_at);

-- Tambien agrega CHECKs si TypeORM habia creado previamente las tablas.
-- Si existen datos invalidos, la migracion falla completa sin corregirlos en silencio.
DO $$
DECLARE
    rule RECORD;
BEGIN
    FOR rule IN
        SELECT * FROM (VALUES
            ('AVAILABILITY', 'chk_availability_time_range', 'end_time > start_time'),
            ('USER_AVAILABILITY_PREFERENCE', 'chk_user_availability_session_duration',
                'session_duration_minutes IN (30, 60, 120)'),
            ('ACTIVITY_SCHEDULE', 'chk_schedule_version', 'version_number >= 1'),
            ('ACTIVITY_SCHEDULE', 'chk_schedule_time_range',
                'start_time IS NULL OR end_time IS NULL OR end_time > start_time'),
            ('ACTIVITY', 'chk_activity_sort_order', 'sort_order >= 1'),
            ('ACTIVITY', 'chk_activity_estimated_minutes',
                'estimated_minutes IS NULL OR estimated_minutes >= 0'),
            ('ACTIVITY', 'chk_activity_self_parent',
                'parent_activity_id IS NULL OR parent_activity_id <> activity_id')
        ) AS rules(table_name, constraint_name, expression)
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conrelid = to_regclass(format('%I', rule.table_name))
              AND conname = rule.constraint_name
        ) THEN
            EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I CHECK (%s)',
                rule.table_name, rule.constraint_name, rule.expression);
        END IF;
    END LOOP;
END $$;

COMMIT;
