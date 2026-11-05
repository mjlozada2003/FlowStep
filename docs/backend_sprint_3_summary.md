# Resumen Contextual del Backend - Sprint 3 (FlowStep)

Este documento resume el progreso, decisiones arquitectónicas, modelos de datos, endpoints y pruebas desarrolladas para el backend de FlowStep durante el tercer Sprint de desarrollo.

---

## 1. Arquitectura y Stack Tecnológico
- **Framework:** NestJS (Node.js / TypeScript) con arquitectura modular por capas (Controladores, Servicios, Repositorios, DTOs con `class-validator` y `class-transformer`).
- **Base de Datos & Integración:** PostgreSQL 16 sobre Docker, integrando las migraciones y vistas analíticas oficiales del equipo de BD (`database/07_sprint3_tracking.sql` traído desde la rama `feature/bd`).
- **ORM:** TypeORM mapeando las tablas `WORK_SESSION`, `MISS_REASON` y `SCHEDULE_MISS`, con relaciones tipadas e integridad referencial (`user_id`, `activity_id`, `schedule_id`).
- **Motor de Consultas Analíticas:** Utilización eficiente de vistas de base de datos (`v_goal_progress`, `v_goal_pace`, `v_goal_weekly_progress`, `v_stage_progress` y `v_activity_timeline`) para reportes y visualización gráfica sin sobrecargar el servidor de aplicaciones.
- **Documentación Swagger / OpenAPI:** Endpoints decorados con `@ApiTags`, `@ApiOperation`, `@ApiParam`, `@ApiQuery`, `@ApiResponse` y `@ApiBearerAuth`.

---

## 2. Historias de Usuario Implementadas

### Seguimiento de Esfuerzo y Dificultad
- **HU-17 — Registrar tiempo dedicado & HU-18 — Registrar dificultades:**
  - **Módulo:** `ActivitiesModule`
  - **Entidad:** `WorkSession` (mapea tabla `WORK_SESSION`).
  - **DTO:** `CreateWorkSessionDto` con validaciones de:
    - `minutes_spent` (entero positivo mayor o igual a 1).
    - `session_date` (formato ISO 8601 YYYY-MM-DD).
    - `difficulty_level` (opcional, entero entre 1 y 5).
    - `difficulty_notes` (opcional, observaciones textuales del usuario).
  - **Endpoints:**
    - `POST /activities/:id/sessions`: Registra una sesión de trabajo verificando propiedad de la actividad y persistiendo el tiempo y la dificultad.
    - `GET /activities/:id/sessions`: Consulta el historial de sesiones de trabajo registradas para la actividad ordenadas cronológicamente (`session_date DESC`).

### Causas de Incumplimiento
- **HU-19 — Registrar causa de incumplimiento:**
  - **Módulo:** `ActivitiesModule`
  - **Entidades:** `MissReason` (catálogo `MISS_REASON`) y `ScheduleMiss` (tabla `SCHEDULE_MISS`).
  - **DTO:** `RecordActivityMissDto` con validación de:
    - `reason_id` (opcional, referencia al catálogo `MISS_REASON`).
    - `custom_reason` (opcional, justificación personalizada escrita por el usuario).
    - `miss_date` (opcional, fecha en que ocurrió el incumplimiento; por defecto la fecha actual).
    - Validación de regla de negocio: se requiere obligatoriamente `reason_id` o `custom_reason`.
  - **Endpoints:**
    - `GET /activities/miss-reasons`: Retorna el catálogo estándar de causas de incumplimiento (`Falta de tiempo`, `Imprevisto laboral/académico`, `Dificultad técnica mayor a la esperada`, `Problemas de salud / personales`, `Otro motivo`).
    - `POST /activities/:id/miss`: Asocia una causa de incumplimiento a la versión activa del cronograma (`ACTIVITY_SCHEDULE`) de la actividad del usuario.
    - `GET /activities/:id/misses`: Lista el historial de incumplimientos registrados para la actividad.

### Historial y Trazabilidad de Actividades
- **HU-20 — Consultar historial de actividades:**
  - **Módulo:** `ActivitiesModule`
  - **DTO:** `ActivityHistoryFilterDto` para filtrado por `goal_id`, `activity_id`, `event_type` (`work_session`, `reschedule`, `miss`, `status_change`), fechas de rango (`from_date`, `to_date`), `limit` y `offset`.
  - **Vista utilizada:** `v_activity_timeline` (unifica sesiones de trabajo, reprogramaciones, incidencias y cambios de estado ordenados por fecha y hora).
  - **Endpoints:**
    - `GET /activities/history`: Línea de tiempo transversal del usuario autenticado con filtros dinámicos parametrizados (previene inyecciones SQL).
    - `GET /activities/:id/history`: Línea de tiempo específica para una actividad particular validando pertenencia al usuario.

### Analítica de Progreso y Ritmo
- **HU-22 — Consultar porcentaje de avance:**
  - **Módulo:** `GoalsModule`
  - **Vista utilizada:** `v_goal_progress` (calcula `progress_percentage` ponderado por minutos estimados de actividades completadas vs total).
  - **Endpoints:**
    - `GET /goals/progress`: Lista el progreso global de todos los objetivos del usuario autenticado.
    - `GET /goals/:id/progress`: Consulta el resumen de progreso de un objetivo específico con fallback seguro si aún no tiene actividades.

- **HU-24 — Comparar ritmo esperado y real:**
  - **Módulo:** `GoalsModule`
  - **Vista utilizada:** `v_goal_pace` (compara el tiempo completado real frente a las actividades que debieron estar listas según el cronograma a la fecha actual).
  - **Lógica de negocio:**
    - Clasificación en `pace_status`: `on_track`, `behind` o `no_schedule`.
    - Detección automática de retrasos (`is_delayed: boolean`).
    - Cálculo de minutos de retraso (`delay_minutes`) y brecha porcentual (`delay_percentage`).
    - Generación de mensajes y alertas proactivas informando al usuario sobre posibles desfases en su plan.
  - **Endpoints:**
    - `GET /goals/:id/pace`: Retorna la comparación detallada de ritmo para una meta con recomendación de acción.
    - `GET /goals/pace`: Listado consolidado del ritmo de todos los objetivos del usuario.

### Visualización Gráfica del Progreso
- **HU-21 — Visualizar progreso gráficamente:**
  - **Módulo:** `GoalsModule`
  - **Vistas utilizadas:** `v_goal_weekly_progress` (progreso semana a semana: minutos invertidos vs planificados) y `v_stage_progress` (avance por cada etapa/fase).
  - **Endpoints:**
    - `GET /goals/:id/weekly-progress`: Evolución temporal semanal para alimentar gráficos de línea y barras acumulativas.
    - `GET /goals/:id/charts`: Endpoint consolidado para dashboards que entrega:
      - `summary`: Avance general, totales de actividades, minutos estimados y minutos dedicados reales.
      - `weekly_progress`: Datos de avance semanal agrupados por `week_start`.
      - `stage_progress`: Desglose del porcentaje de cumplimiento y horas por etapa del objetivo.
      - `status_distribution`: Conteo y minutos de actividades por estado (`pending`, `in_progress`, `completed`, `skipped`) para gráficos tipo dona o torta.

---

## 3. Pruebas Unitarias y Calidad de Código
- Se crearon y actualizaron suites de pruebas exhaustivas para:
  - `ActivitiesController` y `ActivitiesService` (HU-17, HU-18, HU-19, HU-20).
  - `GoalsController` y `GoalsService` (HU-21, HU-22, HU-24).
- Cobertura con Jest: **4 suites aprobadas, 40 pruebas unitarias exitosas**.
- Compilación TypeScript: `nest build` completado con código 0 y sin errores de tipado.
- Contrato de API sincronizado y documentado en `docs/api_contract.md`.

---

## 4. Estado Final del Repositorio
- Rama de trabajo: `feature/backend`.
- Todos los commits siguen la convención semántica (`feat`, `docs`, `fix`, `test`).
- Código listo para ser probado en Swagger y para la integración con el frontend.
