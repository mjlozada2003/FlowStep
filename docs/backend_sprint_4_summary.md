# Resumen Contextual del Backend - Sprint 4 (FlowStep)

Este documento resume el progreso, decisiones arquitectónicas, modelos de datos, endpoints, integración con la base de datos y pruebas desarrolladas exclusivamente para la capa de **Backend** de FlowStep durante el Sprint 4.

---

## 1. Arquitectura y Stack Tecnológico

- **Framework:** NestJS (Node.js / TypeScript) estructurado en arquitectura modular por capas (Controladores, Servicios, Repositorios, DTOs con `class-validator` y `class-transformer`).
- **Base de Datos & Integración:** PostgreSQL 16 sobre contenedor Docker, integrando las vistas analíticas, funciones y tablas del script oficial del equipo de base de datos (`database/10_goal_management_views.sql` traído desde la rama `feature/bd`).
- **ORM & Consultas Híbridas:** TypeORM gestionando entidades tipadas (`Goal`, `Activity`, `User`, `UserPreferences`, `AuthSession`, `GoalStatusHistory`) junto con consultas nativas optimizadas sobre vistas de alto rendimiento (`v_goal_history`, `v_calendar_day_summary`, `v_calendar_activities`, `v_goal_pace`) y funciones almacenadas (`fn_progress_summary`).
- **Control de Acceso y Sesiones:** Autenticación JWT (`JwtAuthGuard`) complementada con revocación de tokens y trazabilidad de sesión en tabla `AUTH_SESSION` para cierre de sesión seguro.
- **Documentación Swagger / OpenAPI:** Endpoints decorados con `@ApiTags`, `@ApiOperation`, `@ApiParam`, `@ApiQuery`, `@ApiResponse` y `@ApiBearerAuth`.

---

## 2. Historias de Usuario Implementadas (Backend)

### HU-12 — Eliminar actividades
- **Módulo:** `ActivitiesModule`
- **Controlador:** `ActivitiesController` (`DELETE /activities/:id`)
- **Servicio:** `ActivitiesService.deleteActivity(activityId, userId)`
- **Lógica de negocio:**
  - Valida que la actividad exista y pertenezca a un objetivo del usuario autenticado.
  - Verifica restricciones de integridad referencial.
  - Elimina de forma segura las referencias asociadas en cronogramas (`ACTIVITY_SCHEDULE`), sesiones (`WORK_SESSION`) e incidencias (`SCHEDULE_MISS`), permitiendo depurar el plan sin dejar inconsistencias.

---

### HU-23 — Recibir resumen periódico
- **Módulo:** `GoalsModule`
- **Controlador:** `GoalsController` (`GET /goals/weekly-summary`)
- **Servicio:** `GoalsService.getWeeklySummary(userId, query)`
- **DTO:** `WeeklySummaryQueryDto` con soporte para `start_date` y `end_date` opcionales (por defecto, los últimos 7 días).
- **Integración con BD:** Invoca directamente la función PostgreSQL `fn_progress_summary(p_user_id, p_start_date, p_end_date)` de `10_goal_management_views.sql`.
- **Estructura entregada:**
  - `period_start` y `period_end` (rango de evaluación).
  - `minutes_spent` (minutos totales dedicados en la semana).
  - `completion_rate` (tasa porcentual de finalización).
  - `daily` (desglose día a día de lunes a domingo para gráficos de actividad).
  - `goals` (listado de objetivos con minutos dedicados y actividades cumplidas durante la semana).

---

### HU-25 — Recibir alerta de retraso
- **Módulo:** `GoalsModule`
- **Controlador:** `GoalsController` (`GET /goals/delay-alerts` y dentro de `GET /goals/overview`)
- **Servicio:** `GoalsService.getDelayAlerts(userId)`
- **Integración con BD:** Consume la vista analítica `v_goal_pace`.
- **Lógica de negocio:**
  - Filtra objetivos activos donde `is_delayed = true`.
  - Calcula minutos de retraso acumulados (`delay_minutes`) y porcentaje de desviación respecto al plan (`delay_percentage`).
  - Identifica el objetivo afectado (`goal_id`, `goal_title`) y genera un mensaje proactivo con recomendación de acción correctiva.

---

### HU-32 — Pausar objetivo & HU-33 — Reanudar objetivo
- **Módulo:** `GoalsModule`
- **Controlador:** `GoalsController`:
  - `PATCH /goals/:id/pause` (HU-32)
  - `PATCH /goals/:id/resume` (HU-33)
- **Servicio:** `GoalsService.pauseGoal(goalId, userId)` y `GoalsService.resumeGoal(goalId, userId)`
- **Lógica de negocio:**
  - **Pausar:** Transiciona el estado del objetivo en la tabla `GOAL` a `paused`. Detiene temporalmente la exigencia de cronogramas futuros sin alterar ni perder las sesiones registradas ni el porcentaje de avance acumulado.
  - **Reanudar:** Restaura el estado a `in_progress`, conservando íntegro el progreso previo y habilitando la recalendarización de actividades restantes.
  - **Trazabilidad:** Registra automáticamente cada transición en la tabla `GOAL_STATUS_HISTORY` con fecha, usuario y estado resultante.

---

### HU-34 — Modificar fecha límite
- **Módulo:** `GoalsModule`
- **Controlador:** `GoalsController` (`PATCH /goals/:id/due-date`)
- **Servicio:** `GoalsService.updateDueDate(goalId, userId, updateGoalDueDateDto)`
- **DTO:** `UpdateGoalDueDateDto` validando formato de fecha `YYYY-MM-DD` posterior a la fecha de inicio del objetivo.
- **Lógica de negocio:**
  - Actualiza `target_completion_date` en la tabla `GOAL`.
  - Conserva todas las actividades completadas y las horas invertidas.
  - Recalcula la ventana de tiempo para las actividades pendientes asociadas.
  - Registra el evento en el historial de trazabilidad del objetivo.

---

### HU-44 — Gestionar múltiples objetivos & HU-48 — Ver resumen de objetivos
- **Módulo:** `GoalsModule`
- **Controlador:** `GoalsController`:
  - `GET /goals/overview`: Tablero completo de múltiples objetivos del usuario.
  - `GET /goals/summary`: Resumen cuantitativo general de objetivos activos y globales.
- **Servicio:** `GoalsService.getGoalsOverview(userId, query)` y `GoalsService.getGoalsSummary(userId)`
- **Lógica de negocio:**
  - Consolida en una sola consulta estructurada todos los objetivos activos del usuario.
  - Cada objetivo incluye su propio porcentaje de progreso (vía `v_goal_progress`), ritmo de avance (vía `v_goal_pace`), total de actividades, horas estimadas vs. dedicadas y estado de retraso.
  - Permite al frontend acceder a cada objetivo individualmente con contexto completo.

---

### HU-45 — Ordenar objetivos por prioridad
- **Módulo:** `GoalsModule`
- **Controlador:** `GoalsController`:
  - `GET /goals/overview?order_by=priority&priority_order=desc|asc`: Ordenamiento dinámico de objetivos.
  - `PATCH /goals/:id/priority`: Actualización puntual del nivel de prioridad.
- **Servicio:** `GoalsService.updatePriority(goalId, userId, updatePriorityDto)` y lógica de ordenamiento en `getGoalsOverview`.
- **DTO:** `GoalQueryDto` (soporta `order_by`, `priority_order`, `status`) y `UpdateGoalPriorityDto` (`priority: 'high' | 'medium' | 'low'`).
- **Lógica de negocio:**
  - Mapea el orden de prioridad semántico: `high` (3) > `medium` (2) > `low` (1).
  - Permite ordenar tanto de mayor a menor prioridad como viceversa, facilitando al usuario enfocarse en las metas más críticas.

---

### HU-46 — Archivar objetivo & HU-47 — Consultar objetivos anteriores
- **Módulo:** `GoalsModule`
- **Controlador:** `GoalsController`:
  - `PATCH /goals/:id/archive` (HU-46): Archiva un objetivo activo o pausado.
  - `GET /goals/history` (HU-47): Consulta el historial de objetivos anteriores.
- **Servicio:** `GoalsService.archiveGoal(goalId, userId)` y `GoalsService.getGoalHistory(userId)`
- **Integración con BD:**
  - `PATCH /goals/:id/archive`: Actualiza `status = 'archived'` en tabla `GOAL` y registra en `GOAL_STATUS_HISTORY`.
  - `GET /goals/history`: Consulta la vista oficial `v_goal_history` que agrupa objetivos en estado `archived` y `completed`, entregando fecha de cierre (`closed_at`), estado final, total de actividades y minutos reales invertidos (`minutes_spent`).

---

### HU-49 — Configurar preferencias
- **Módulo:** `UsersModule`
- **Controlador:** `UsersController`:
  - `GET /users/preferences`: Consulta las preferencias del usuario autenticado.
  - `PATCH /users/preferences`: Actualiza o inicializa las preferencias.
- **Servicio:** `UsersService.getPreferences(userId)` y `UsersService.updatePreferences(userId, updatePreferencesDto)`
- **Entidad & Tabla:** `UserPreferences` mapeando la tabla `USER_PREFERENCES`.
- **DTO:** `UpdatePreferencesDto` con validaciones de:
  - `daily_reminder_enabled` (booleano).
  - `daily_reminder_time` (formato HH:mm:ss o HH:mm).
  - `weekly_digest_day` (entero entre 0 y 6, o nombre del día).
  - `difficulty_preference` (`balanced`, `easy_first`, `hard_first`).
  - `auto_reschedule` (booleano).
  - `notifications_enabled` (booleano).

---

### HU-50 — Consultar planificación en calendario
- **Módulo:** `ActivitiesModule`
- **Controlador:** `ActivitiesController` (`GET /activities/calendar`)
- **Servicio:** `ActivitiesService.getCalendar(userId, query)`
- **DTO:** `CalendarQueryDto` (soporta `month`, `year`, `startDate`, `endDate`).
- **Integración con BD:**
  - Consulta la vista `v_calendar_day_summary` cualificando columnas (`v.scheduled_date`) para retornar el resumen de cada día (`total_activities`, `completed_activities`, `pending_activities`, `day_status`: `completed`, `pending`, `mixed`, `overdue`).
  - Consulta la vista `v_calendar_activities` (`v.*`, `scheduled_date::text`, `activity_title AS title`, `activity_status AS status`, `start_time`, `goal_title`) para entregar el desglose completo de actividades del período.

---

### HU-55 — Cerrar sesión
- **Módulo:** `AuthModule`
- **Controlador:** `AuthController` (`POST /auth/logout`)
- **Servicio:** `AuthService.logout(sessionId)`
- **Integración con BD:**
  - Durante el login, se genera un registro en la tabla `AUTH_SESSION` (`session_id`, `user_id`, `is_active: true`, `login_at`).
  - Al ejecutar `POST /auth/logout`, el backend actualiza la sesión en `AUTH_SESSION` estableciendo `is_active = false` y `revoked_at = NOW()`.
  - Invalida la sesión activa para garantizar la protección de la información del usuario.

---

## 3. Pruebas Unitarias y Calidad del Backend

- **Suites de Pruebas Ejecutadas:**
  - `src/goals/goals.service.spec.ts` (Validación de lógica de negocio de objetivos, resumen semanal, alertas, pausas, reanudaciones y prioridades).
  - `src/goals/goals.controller.spec.ts` (Respuestas HTTP, mapeo de rutas y códigos de estado en controlador de metas).
  - `src/activities/activities.service.spec.ts` (Eliminación de actividades, consultas de calendario y manejo de vistas).
  - `src/activities/activities.controller.spec.ts` (Endpoints de actividades, filtros de calendario y eliminación).
- **Resultados de Jest:**
  - **Test Suites:** 4 passed, 4 total.
  - **Tests:** 42 passed, 42 total.
  - **Snapshots:** 0 total.
- **Compilación TypeScript:** `npm --prefix backend run build` (`nest build`) finalizado limpiamente con código de salida 0.

---

## 4. Estado Final de la Rama

- **Rama de Trabajo:** `feature/backend`.
- **Commits Registrados en el Sprint:** Estructurados de forma granular por cada historia de usuario (`feat:`, `fix:`, `test:`, `docs:`).
- **Integración con Frontend:** Todos los endpoints cuentan con validación de entrada, manejo de errores homogéneo (`400 Bad Request`, `401 Unauthorized`, `404 Not Found`) y respuestas JSON estructuradas compatibles con las interfaces de TypeScript de la aplicación cliente.
