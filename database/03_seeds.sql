-- ============================================================================
-- FLOWSTEP - SPRINT 1 DATABASE SEEDS (PostgreSQL)
-- Datos iniciales de prueba para verificación de Sprint 1 y la vista V_GOAL_PROGRESS
-- ============================================================================

-- Contraseña para todos los usuarios de prueba: "Password123!"
-- Hash bcrypt (salt rounds = 10):
-- $2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW

-- ----------------------------------------------------------------------------
-- 1. USUARIOS DE PRUEBA (APP_USER)
-- ----------------------------------------------------------------------------
INSERT INTO "APP_USER" (user_id, name, email, password_hash, is_active, created_at, updated_at)
VALUES 
    (1, 'Kathy Valenzuela', 'kathy@flowstep.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (2, 'Maria Lozada', 'maria@flowstep.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (email) DO NOTHING;

SELECT setval(
    pg_get_serial_sequence('"APP_USER"', 'user_id'),
    COALESCE((SELECT MAX(user_id) FROM "APP_USER"), 1),
    true
);

-- ----------------------------------------------------------------------------
-- 2. METAS DE PRUEBA (GOAL)
-- ----------------------------------------------------------------------------
-- Meta 1: Caso de avance al 50.00% (120 min completados / 240 min totales)
-- Meta 2: Caso de avance al 100.00% (120 min completados / 120 min totales)
-- Meta 3: Caso nuevo al 0.00% (0 min completados / 210 min totales)
-- NOTA: Se utiliza suma entera nativa de DATE (CURRENT_DATE + N) para evitar incompatibilidad de tipos con INTERVAL.
INSERT INTO "GOAL" (goal_id, user_id, title, user_description, start_date, due_date, priority, status, created_at, updated_at)
VALUES
    (1, 1, 'Dominar NestJS y Arquitectura Limpia', 'Construir el backend completo de una aplicación modular utilizando NestJS, TypeORM y PostgreSQL.', CURRENT_DATE, (CURRENT_DATE + 30), 'high', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (2, 1, 'Diseño de Vistas y Optimización en PostgreSQL', 'Implementar vistas analíticas, disparadores y consultas optimizadas para trazabilidad del sistema.', (CURRENT_DATE - 10), CURRENT_DATE, 'medium', 'completed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (3, 2, 'Diseño de Interfaz de Usuario para FlowStep Mobile', 'Diseñar la experiencia de usuario y componentes visuales en Expo y React Native.', CURRENT_DATE, (CURRENT_DATE + 15), 'medium', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (goal_id) DO NOTHING;

SELECT setval(
    pg_get_serial_sequence('"GOAL"', 'goal_id'),
    COALESCE((SELECT MAX(goal_id) FROM "GOAL"), 1),
    true
);

-- ----------------------------------------------------------------------------
-- 3. ETAPAS DE PRUEBA (STAGE)
-- ----------------------------------------------------------------------------
INSERT INTO "STAGE" (stage_id, goal_id, name, description, sort_order, estimated_start_date, estimated_end_date, created_at, updated_at)
VALUES
    -- Etapas para Meta 1
    (1, 1, 'Etapa 1: Fundamentos y Configuración', 'Aprender la estructura básica de NestJS, módulos y controladores.', 1, CURRENT_DATE, (CURRENT_DATE + 7), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (2, 1, 'Etapa 2: Seguridad y Autenticación', 'Implementar autenticación JWT, guards y encriptación con bcrypt.', 2, (CURRENT_DATE + 8), (CURRENT_DATE + 15), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    
    -- Etapas para Meta 2
    (3, 2, 'Etapa 1: Modelado y Vistas SQL', 'Crear el script DDL y vistas de avance ponderado.', 1, (CURRENT_DATE - 10), (CURRENT_DATE - 5), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    
    -- Etapas para Meta 3
    (4, 3, 'Etapa 1: Prototipado en Figma', 'Diseñar wireframes para pantallas de autenticación y metas.', 1, CURRENT_DATE, (CURRENT_DATE + 5), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (stage_id) DO NOTHING;

SELECT setval(
    pg_get_serial_sequence('"STAGE"', 'stage_id'),
    COALESCE((SELECT MAX(stage_id) FROM "STAGE"), 1),
    true
);

-- ----------------------------------------------------------------------------
-- 4. ACTIVIDADES DE PRUEBA (ACTIVITY)
-- ----------------------------------------------------------------------------
INSERT INTO "ACTIVITY" (
    activity_id, stage_id, title, description, type, priority, status, origin, sort_order, estimated_minutes, completed_at, created_at, updated_at
)
VALUES
    -- Actividades para Etapa 1 (Meta 1) - Ambas completadas: 60 + 60 = 120 min completados
    (1, 1, 'Sintaxis básica y arquitectura por módulos', 'Revisar la inyección de dependencias de NestJS y crear el primer módulo.', 'learning', 'high', 'completed', 'initial_plan', 1, 60, CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (2, 1, 'Mapeo de entidades con TypeORM', 'Crear entidades de base de datos con decoradores y relaciones.', 'practice', 'high', 'completed', 'initial_plan', 2, 60, CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

    -- Actividades para Etapa 2 (Meta 1) - Pendientes: 60 + 60 = 120 min pendientes
    (3, 2, 'Implementación de Passport y JWT', 'Configurar estrategia JWT y AuthGuard para protección de rutas.', 'exercise', 'high', 'in_progress', 'initial_plan', 1, 60, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (4, 2, 'Pruebas E2E de inicio de sesión', 'Crear suite de pruebas para verificar el registro y login.', 'practice', 'medium', 'pending', 'initial_plan', 2, 60, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

    -- Actividades para Etapa 1 (Meta 2) - Todas completadas (100% de progreso: 30 + 60 + 30 = 120 min)
    (5, 3, 'Diseñar sintaxis de CREATE VIEW', 'Escribir consulta agregada para cálculo de progreso.', 'learning', 'medium', 'completed', 'initial_plan', 1, 30, CURRENT_TIMESTAMP - INTERVAL '5 days', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (6, 3, 'Implementar vista V_GOAL_PROGRESS', 'Verificar agrupaciones, COUNT y CASE WHEN.', 'exercise', 'high', 'completed', 'initial_plan', 2, 60, CURRENT_TIMESTAMP - INTERVAL '4 days', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (7, 3, 'Validar integridad con seeds de prueba', 'Comprobar resultados matemáticos con datos controlados.', 'practice', 'medium', 'completed', 'initial_plan', 3, 30, CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

    -- Actividades para Etapa 1 (Meta 3) - Todas pendientes (0% de progreso: 90 + 120 = 210 min)
    (8, 4, 'Diseñar wireframes de Login y Registro', 'Crear pantallas en Figma para HU53 y HU54.', 'learning', 'medium', 'pending', 'initial_plan', 1, 90, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (9, 4, 'Diseñar componentes de visualización de metas', 'Crear tarjetas y barras de progreso basadas en la vista V_GOAL_PROGRESS.', 'practice', 'high', 'pending', 'initial_plan', 2, 120, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (activity_id) DO NOTHING;

SELECT setval(
    pg_get_serial_sequence('"ACTIVITY"', 'activity_id'),
    COALESCE((SELECT MAX(activity_id) FROM "ACTIVITY"), 1),
    true
);
