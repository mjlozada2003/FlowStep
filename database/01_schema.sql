-- ============================================================================
-- FLOWSTEP - SPRINT 1 DATABASE SCHEMA (PostgreSQL)
-- Tablas del Sprint 1: APP_USER, GOAL, STAGE, ACTIVITY
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TIPOS ENUMERADOS
-- ----------------------------------------------------------------------------

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'GOAL_priority_enum') THEN
        CREATE TYPE "GOAL_priority_enum" AS ENUM ('high', 'medium', 'low');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'GOAL_status_enum') THEN
        CREATE TYPE "GOAL_status_enum" AS ENUM ('active', 'paused', 'completed', 'archived');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ACTIVITY_type_enum') THEN
        CREATE TYPE "ACTIVITY_type_enum" AS ENUM ('learning', 'practice', 'exercise', 'assessment', 'reinforcement');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ACTIVITY_priority_enum') THEN
        CREATE TYPE "ACTIVITY_priority_enum" AS ENUM ('high', 'medium', 'low');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ACTIVITY_status_enum') THEN
        CREATE TYPE "ACTIVITY_status_enum" AS ENUM ('pending', 'in_progress', 'completed', 'skipped');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ACTIVITY_origin_enum') THEN
        CREATE TYPE "ACTIVITY_origin_enum" AS ENUM ('initial_plan', 'ai_adjustment', 'manual');
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. TABLAS PRINCIPALES
-- ----------------------------------------------------------------------------

-- Tabla: APP_USER (Seguridad y cuentas de usuario - HU53, HU54)
CREATE TABLE IF NOT EXISTS "APP_USER" (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Tabla: GOAL (Gestión de objetivos - HU-01)
CREATE TABLE IF NOT EXISTS "GOAL" (
    goal_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES "APP_USER"(user_id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    user_description TEXT NOT NULL,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    priority "GOAL_priority_enum" NOT NULL DEFAULT 'medium',
    status "GOAL_status_enum" NOT NULL DEFAULT 'active',
    closed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    CONSTRAINT chk_goal_dates CHECK (due_date IS NULL OR due_date >= start_date)
);

-- Tabla: STAGE (División en etapas - HU-09)
CREATE TABLE IF NOT EXISTS "STAGE" (
    stage_id SERIAL PRIMARY KEY,
    goal_id INTEGER NOT NULL REFERENCES "GOAL"(goal_id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 1,
    estimated_start_date DATE,
    estimated_end_date DATE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_stage_sort_order CHECK (sort_order >= 1),
    CONSTRAINT chk_stage_dates CHECK (
        estimated_end_date IS NULL OR 
        estimated_start_date IS NULL OR 
        estimated_end_date >= estimated_start_date
    )
);

-- Tabla: ACTIVITY (Actividades del plan - HU-02, HU-10, HU-15)
CREATE TABLE IF NOT EXISTS "ACTIVITY" (
    activity_id SERIAL PRIMARY KEY,
    stage_id INTEGER NOT NULL REFERENCES "STAGE"(stage_id) ON DELETE CASCADE,
    parent_activity_id INTEGER REFERENCES "ACTIVITY"(activity_id) ON DELETE CASCADE,
    origin_recommendation_id INTEGER,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    type "ACTIVITY_type_enum" NOT NULL,
    priority "ACTIVITY_priority_enum" NOT NULL DEFAULT 'medium',
    status "ACTIVITY_status_enum" NOT NULL DEFAULT 'pending',
    origin "ACTIVITY_origin_enum" NOT NULL DEFAULT 'initial_plan',
    sort_order INTEGER NOT NULL DEFAULT 1,
    estimated_minutes INTEGER DEFAULT 0,
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    CONSTRAINT chk_activity_sort_order CHECK (sort_order >= 1),
    CONSTRAINT chk_activity_estimated_minutes CHECK (estimated_minutes IS NULL OR estimated_minutes >= 0),
    CONSTRAINT chk_activity_self_parent CHECK (parent_activity_id IS NULL OR parent_activity_id != activity_id)
);

-- ----------------------------------------------------------------------------
-- 3. ÍNDICES DE RENDIMIENTO
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS "idx_user_email" ON "APP_USER"(email);
CREATE INDEX IF NOT EXISTS "idx_goal_user_id" ON "GOAL"(user_id);
CREATE INDEX IF NOT EXISTS "idx_stage_goal_id" ON "STAGE"(goal_id);
CREATE INDEX IF NOT EXISTS "idx_activity_stage_id" ON "ACTIVITY"(stage_id);
CREATE INDEX IF NOT EXISTS "idx_activity_status" ON "ACTIVITY"(status);
CREATE INDEX IF NOT EXISTS "idx_activity_parent_id" ON "ACTIVITY"(parent_activity_id);

-- ----------------------------------------------------------------------------
-- 4. DISPARADORES (TRIGGERS) PARA AUDITORÍA DE TIMESTAMP (updated_at)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_app_user_updated_at') THEN
        CREATE TRIGGER trg_app_user_updated_at
        BEFORE UPDATE ON "APP_USER"
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_goal_updated_at') THEN
        CREATE TRIGGER trg_goal_updated_at
        BEFORE UPDATE ON "GOAL"
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_stage_updated_at') THEN
        CREATE TRIGGER trg_stage_updated_at
        BEFORE UPDATE ON "STAGE"
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_activity_updated_at') THEN
        CREATE TRIGGER trg_activity_updated_at
        BEFORE UPDATE ON "ACTIVITY"
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

