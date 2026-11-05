-- FLOWSTEP - Sprint 3. Aplicar despues de 04 y 05 del main integrado.
BEGIN;

CREATE TABLE IF NOT EXISTS "WORK_SESSION" (
    session_id SERIAL PRIMARY KEY,
    activity_id INTEGER NOT NULL REFERENCES "ACTIVITY"(activity_id) ON DELETE CASCADE,
    session_date DATE NOT NULL DEFAULT CURRENT_DATE,
    minutes_spent INTEGER NOT NULL CHECK (minutes_spent > 0),
    difficulty_level SMALLINT CHECK (difficulty_level BETWEEN 1 AND 5),
    difficulty_notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_work_session_activity_date
    ON "WORK_SESSION" (activity_id, session_date);

CREATE TABLE IF NOT EXISTS "MISS_REASON" (
    reason_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE CHECK (btrim(name) <> ''),
    description VARCHAR(255)
);

INSERT INTO "MISS_REASON" (name)
VALUES ('Falta de tiempo'), ('Dificultad con la actividad'), ('Imprevisto'), ('Otro')
ON CONFLICT (name) DO NOTHING;

-- Una incidencia por version programada. Una reprogramacion tiene su propio ID.
CREATE TABLE IF NOT EXISTS "SCHEDULE_MISS" (
    miss_id SERIAL PRIMARY KEY,
    schedule_id INTEGER NOT NULL UNIQUE REFERENCES "ACTIVITY_SCHEDULE"(schedule_id) ON DELETE CASCADE,
    reason_id INTEGER NOT NULL REFERENCES "MISS_REASON"(reason_id),
    details TEXT,
    recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMIT;
