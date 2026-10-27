# Resumen Contextual del Backend - Sprint 2 (FlowStep)

Este documento resume el progreso, decisiones arquitectónicas y módulos desarrollados para el backend de FlowStep durante el segundo Sprint de desarrollo.

## 1. Arquitectura y Stack Tecnológico
- **Framework:** NestJS (Node.js) con arquitectura monolítica por capas (Controladores, Servicios, Repositorios).
- **Base de Datos:** PostgreSQL en Docker (`docker-compose.yml`).
- **ORM:** TypeORM mapeando rigurosamente el diseño DBML v3 (tablas `AVAILABILITY`, `ACTIVITY_SCHEDULE`, enums y relaciones en cascada).
- **Inteligencia Artificial:** Google Gen AI (`gemini-3.5-flash`), enriquecido con la disponibilidad horaria del usuario para generar planes personalizados compatibles con su rutina real.

## 2. Historias de Usuario Completadas

### Priorización de Objetivos
- **HU-06 — Establecer prioridad:**
  - **Módulo:** `GoalsModule`
  - Se implementó el endpoint `PATCH /goals/:id/priority` con el DTO `UpdateGoalPriorityDto` validando los niveles `high`, `medium`, `low`.
  - Se implementó además `PATCH /goals/:id` para actualización integral de metas.
  - Se incluyeron pruebas unitarias completas.

### Disponibilidad de Tiempo
- **HU-35 — Configurar disponibilidad & HU-07 — Indicar disponibilidad de tiempo:**
  - **Módulo:** `AvailabilityModule`
  - Se creó la entidad TypeORM `Availability` mapeando la tabla `AVAILABILITY` con índice compuesto único `(user_id, day_of_week, start_time)` y el enum `DayOfWeek`.
  - Se implementaron los endpoints:
    - `POST /availability`: Registro de franjas horarias con validación de horas y verificación de `end_time > start_time`.
    - `POST /availability/bulk`: Registro en lote de la rutina semanal del usuario.
    - `GET /availability`: Consulta de la disponibilidad del usuario ordenada cronológicamente.
    - `DELETE /availability/:id`: Eliminación de franjas horarias.

### Gestión y Ciclo de Vida de Actividades
- **HU-13 — Agregar actividades:**
  - **Módulo:** `StagesModule` / `ActivitiesModule`
  - Se desarrolló el endpoint `POST /stages/:id/activities` para crear actividades manuales (`origin: ActivityOrigin.MANUAL`, `status: ActivityStatus.PENDING`), calculando dinámicamente el `sort_order`.
- **HU-11 — Modificar actividades:**
  - **Módulo:** `ActivitiesModule`
  - Se desarrolló el endpoint `PATCH /activities/:id` con `UpdateActivityDto` para actualizar título, descripción, tipo, prioridad o duración estimada.
- **HU-16 — Mantener actividad pendiente:**
  - **Módulo:** `ActivitiesModule`
  - Se desarrolló el endpoint `PATCH /activities/:id/pending` que restablece el estado a `pending` y limpia `completed_at: null`.

### Reprogramación con Trazabilidad
- **HU-14 — Reprogramar actividades:**
  - **Módulo:** `ActivitiesModule`
  - Se creó la entidad `ActivitySchedule` mapeando la tabla `ACTIVITY_SCHEDULE` con el enum `ScheduleReason` (`initial_plan`, `user_reschedule`, `ai_adjustment`).
  - Se desarrolló el endpoint `POST /activities/:id/reschedule`:
    - Incrementa `version_number = versión_anterior + 1`.
    - Garantiza el criterio de aceptación: *"No se pierde el estado anterior de la actividad"*.
  - Se desarrolló el endpoint `GET /activities/:id/schedules` para auditar el historial de reprogramaciones.

### IA Adaptada a Disponibilidad
- **HU-36 — Adaptar actividades a disponibilidad:**
  - **Módulos:** `GoalsModule` y `AiModule`
  - `GoalsService` consulta la disponibilidad configurada del usuario en `AvailabilityService`.
  - `AiService` inyecta las franjas horarias del usuario en el prompt de Gemini para que las actividades no excedan la duración disponible y se fragmenten de manera realista.
  - Al generar el plan, el backend crea automáticamente la versión 1 en `ACTIVITY_SCHEDULE` asignando las actividades a los días y horarios reales del usuario.

## 3. Estado Final del Repositorio
- Todos los cambios se encuentran probados, linted con `oxlint` (0 errores, 0 warnings) y versionados con commits semánticos en la rama `feature/backend`.
