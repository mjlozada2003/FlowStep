# Resumen Contextual de Base de Datos - Sprint 1 (FlowStep)

Este documento resume el progreso, modelado relacional y objetos de base de datos desarrollados para FlowStep durante el primer Sprint de desarrollo.

## 1. Arquitectura y Decisiones Técnicas
- **Motor Relacional:** PostgreSQL 15 corriendo bajo contenedor Docker en `backend/docker-compose.yml`.
- **Estrategia de Inicialización:** Montaje automático del directorio `database/` en `/docker-entrypoint-initdb.d:ro` con scripts versionados numéricamente (`01_schema.sql`, `02_views.sql`, `03_seeds.sql`).
- **Principio Arquitectónico de Datos Derivados:** Respetando la restricción del proyecto *"Derived data is NOT stored: it is computed with views"*, los cálculos matemáticos de progreso no ocupan almacenamiento redundante y se delegan a vistas SQL.
- **Trazabilidad:** Disparadores (triggers) en lenguaje PL/pgSQL que gestionan automáticamente la columna `updated_at` en todas las tablas ante cualquier modificación.

## 2. Historias de Usuario Satisfechas en BD

### Seguridad y Cuentas de Usuario
- **HU53 - Registrarse & HU54 - Iniciar sesión:**
  - Tabla `"APP_USER"` con llave primaria secuencial (`user_id`), unicidad en `email`, soporte para hash de contraseñas de longitud segura (255 caracteres) y marcas de tiempo (`last_login_at`, `created_at`, `updated_at`, `deleted_at`).

### Planificación y Estructura Jerárquica
- **HU-01 - Registrar objetivo:**
  - Tabla `"GOAL"` relacionada a `"APP_USER"` con eliminación en cascada (`ON DELETE CASCADE`), restricciones de fecha (`due_date >= start_date`) y tipos enumerados para `priority` y `status`.
- **HU-09 - Dividir en etapas:**
  - Tabla `"STAGE"` vinculada a `"GOAL"`, con soporte para ordenación (`sort_order >= 1`) y fechas estimadas de fase.
- **HU-02 - Generar plan personalizado & HU-10 - Consultar actividades:**
  - Tabla `"ACTIVITY"` vinculada a `"STAGE"`, con relación reflexiva opcional (`parent_activity_id`) para sub-tareas, enumerados de tipo pedagógico, prioridad, estado y minutos estimados (`estimated_minutes >= 0`).

### Seguimiento y Avance
- **HU-15 - Completar actividad:**
  - Soporte de estado `'completed'` y fecha de finalización (`completed_at`).
- **HU-03 - Registrar progreso:**
  - Implementación de la vista **`v_goal_progress`** (con alias `"V_GOAL_PROGRESS"`).
  - **Fórmula de cálculo:** Ponderación exacta por tiempo estimado:
    $$\text{progreso} = \left(\frac{\sum \text{estimated\_minutes (completadas)}}{\sum \text{estimated\_minutes (totales)}}\right) \times 100$$
  - Manejo seguro de casos de borde (división entre 0 para objetivos sin actividades o con 0 minutos retorna `0.00%`).
  - Implementación complementaria de la vista `v_stage_progress` para cálculo proporcional por etapa.

## 3. Semillas de Prueba (Seeds)
Se crearon datos representativos en `database/03_seeds.sql` que validan el comportamiento del sistema y la exactitud matemática de las vistas:
- **Meta 1 (50.00%):** 240 minutos totales, 120 minutos completados.
- **Meta 2 (100.00%):** 120 minutos totales, 120 minutos completados.
- **Meta 3 (0.00%):** 210 minutos totales, 0 minutos completados.
- Usuarios con contraseñas encriptadas compatibles con el módulo de autenticación del backend (`Password123!`).

## 4. Observaciones Técnicas para el Backend
1. **Consumo de la vista de progreso:** Para el Sprint 2 o integración final, el backend debe habilitar una consulta o endpoint (`GET /goals/:id/progress`) que consuma `v_goal_progress`.
2. **Normalización de Enums:** En `goal.entity.ts` y `activity.entity.ts`, agregar `enumName: 'priority_level_enum'` para unificar el enum de prioridad en el ORM.
3. **Bandera synchronize:** Se aconseja cambiar `synchronize: true` a configurable por variable de entorno para evitar colisiones con los esquemas versionados.

## 5. Estado de la Rama
Todos los entregables de base de datos se encuentran completados en la rama `feature/bd`.
