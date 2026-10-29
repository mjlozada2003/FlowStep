-- ============================================================================
-- FLOWSTEP - SPRINT 1 DATABASE VIEWS (PostgreSQL)
-- Vistas de Progreso y Derivación de Datos
-- Restricción de Arquitectura: "Derived data is NOT stored: it is computed with views"
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. VISTA: v_goal_progress / "V_GOAL_PROGRESS" (HU-03 - Progreso del objetivo)
-- ----------------------------------------------------------------------------
-- Regla de Negocio:
-- Suma los minutos estimados de las actividades completadas y los divide
-- entre el total de minutos estimados del objetivo (multiplicado por 100).
-- Si el total de minutos estimados es 0 o no tiene actividades, el progreso es 0.00%.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE VIEW v_goal_progress AS
SELECT 
    g.goal_id,
    g.user_id,
    g.title AS goal_title,
    g.status AS goal_status,
    COUNT(a.activity_id) AS total_activities,
    COUNT(CASE WHEN a.status = 'completed' THEN 1 END) AS completed_activities,
    COALESCE(SUM(COALESCE(a.estimated_minutes, 0)), 0)::integer AS total_estimated_minutes,
    COALESCE(SUM(CASE WHEN a.status = 'completed' THEN COALESCE(a.estimated_minutes, 0) ELSE 0 END), 0)::integer AS completed_estimated_minutes,
    CASE 
        WHEN COALESCE(SUM(COALESCE(a.estimated_minutes, 0)), 0) > 0 THEN 
            ROUND(
                (
                    COALESCE(SUM(CASE WHEN a.status = 'completed' THEN COALESCE(a.estimated_minutes, 0) ELSE 0 END), 0)::numeric
                    / 
                    SUM(COALESCE(a.estimated_minutes, 0))::numeric
                ) * 100, 
                2
            )
        ELSE 
            0.00 
    END AS progress_percentage
FROM "GOAL" g
LEFT JOIN "STAGE" s ON s.goal_id = g.goal_id
LEFT JOIN "ACTIVITY" a ON a.stage_id = s.stage_id AND a.deleted_at IS NULL
WHERE g.deleted_at IS NULL
GROUP BY g.goal_id, g.user_id, g.title, g.status;

-- Vista puente en mayúsculas para compatibilidad total con consultas entre comillas ("V_GOAL_PROGRESS")
CREATE OR REPLACE VIEW "V_GOAL_PROGRESS" AS 
SELECT * FROM v_goal_progress;

-- ----------------------------------------------------------------------------
-- 2. VISTA: v_stage_progress / "V_STAGE_PROGRESS" (Progreso por etapa)
-- ----------------------------------------------------------------------------
-- Calcula el progreso individual de cada etapa siguiendo la misma ponderación por minutos:
-- minutos completados / minutos totales de la etapa * 100.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE VIEW v_stage_progress AS
SELECT 
    s.stage_id,
    s.goal_id,
    s.name AS stage_name,
    s.sort_order,
    COUNT(a.activity_id) AS total_activities,
    COUNT(CASE WHEN a.status = 'completed' THEN 1 END) AS completed_activities,
    COALESCE(SUM(COALESCE(a.estimated_minutes, 0)), 0)::integer AS total_estimated_minutes,
    COALESCE(SUM(CASE WHEN a.status = 'completed' THEN COALESCE(a.estimated_minutes, 0) ELSE 0 END), 0)::integer AS completed_estimated_minutes,
    CASE 
        WHEN COALESCE(SUM(COALESCE(a.estimated_minutes, 0)), 0) > 0 THEN 
            ROUND(
                (
                    COALESCE(SUM(CASE WHEN a.status = 'completed' THEN COALESCE(a.estimated_minutes, 0) ELSE 0 END), 0)::numeric
                    / 
                    SUM(COALESCE(a.estimated_minutes, 0))::numeric
                ) * 100, 
                2
            )
        ELSE 
            0.00 
    END AS progress_percentage
FROM "STAGE" s
LEFT JOIN "ACTIVITY" a ON a.stage_id = s.stage_id AND a.deleted_at IS NULL
GROUP BY s.stage_id, s.goal_id, s.name, s.sort_order;

-- Vista puente en mayúsculas para compatibilidad total con consultas entre comillas ("V_STAGE_PROGRESS")
CREATE OR REPLACE VIEW "V_STAGE_PROGRESS" AS 
SELECT * FROM v_stage_progress;

-- ----------------------------------------------------------------------------
-- 3. VISTAS SINÓNIMAS EN MINÚSCULAS PARA CONSULTAS SQL NATURALES
-- ----------------------------------------------------------------------------
-- Permiten consultar "SELECT * FROM app_user;" o "SELECT * FROM goal;"
-- sin obligar al uso de comillas dobles en clientes interactivos como DBeaver/psql.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE VIEW app_user AS SELECT * FROM "APP_USER";
CREATE OR REPLACE VIEW goal AS SELECT * FROM "GOAL";
CREATE OR REPLACE VIEW stage AS SELECT * FROM "STAGE";
CREATE OR REPLACE VIEW activity AS SELECT * FROM "ACTIVITY";
