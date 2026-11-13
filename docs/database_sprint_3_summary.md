# Base de datos FlowStep - Sprint 3

## Alcance

HU-12, HU-23, HU-25, HU-32, HU-33, HU-34, HU-44, HU-45, HU-46, HU-47, HU-48, HU-49, HU-50 y HU-55,
sobre el esquema de los sprints anteriores (incluido el seguimiento de `07_sprint3_tracking.sql`).

## Entregables

- `database/09_goal_management_schema.sql`: tablas `USER_PREFERENCE`, `GOAL_STATUS_HISTORY`,
  `GOAL_DEADLINE_HISTORY`, `NOTIFICATION` y `AUTH_SESSION`; columna `ACTIVITY.deletion_reason`;
  índices; triggers de transición de estado y `closed_at`, de cambio de fecha límite con historial,
  de borrado lógico en cascada de sub-actividades y de validación de zona horaria.
- `database/10_goal_management_views.sql`: `v_user_preferences`, `v_goal_pause_periods`,
  `v_goal_overview`, `v_user_goal_summary`, `v_goal_history`, `v_goal_delay_alert`,
  `v_calendar_activities`, `v_calendar_day_summary`, `v_pending_periodic_summaries`,
  `v_pending_delay_alerts`, `v_active_auth_session` y la función `fn_progress_summary`.
- `database/11_goal_management_seeds.sql`: demo repetible `gestion.demo@flowstep.test`.
- `database/tests/goal_management.sql`: casos positivos y negativos de las 14 historias; revierte sus filas.

## Decisiones

- **Se reutiliza lo existente**: pausar, reanudar, archivar y completar usan `GOAL.status`
  (enum del Sprint 1); la fecha límite es `GOAL.due_date`; eliminar una actividad usa `deleted_at`.
  No se cambian enums ni columnas que el backend ya mapea.
- **La base garantiza la trazabilidad**: los historiales de estado y de fecha límite se llenan por
  trigger, así ningún camino del backend los omite. Las transiciones inválidas se rechazan con
  `check_violation`.
- **Datos derivados en vistas**: visión general, orden por prioridad, alertas, resúmenes y calendario
  no se almacenan. Solo se persiste lo que el usuario decide (preferencias) y lo que efectivamente
  se le entregó (`NOTIFICATION`), para no repetir avisos.
- **Pausa**: un objetivo pausado no se evalúa como atrasado. `v_goal_pace` (Sprint de seguimiento) no
  se modifica para no romper su contrato; `v_goal_overview.pace_status` agrega `paused` y `closed`.
- **Zona horaria**: las vistas usan la zona de la sesión (America/La_Paz en Docker); los avisos usan
  la zona guardada por el usuario.
- **Cierre de sesión**: el JWT es stateless; `AUTH_SESSION` permite revocarlo antes de su vencimiento.

## Pendiente para backend y frontend

Ver la sección 10 de `database/README.md` ("Indicaciones para el backend"): borrado lógico en
`DELETE /activities/:id`, mapeo de `23514` a 400, tarea programada de avisos, `sid` en el JWT y
endpoint de logout. Las pantallas del frontend de estas historias usan datos simulados y pueden
consumir las vistas a través de esos endpoints.

## Validación

Ejecutado sobre PostgreSQL 16 (el proyecto usa 15; no se usan funciones exclusivas de 16):
inicialización desde cero de `01` a `11`, segunda ejecución completa sin errores ni duplicados,
`tests/sprint3.sql` y `tests/goal_management.sql` aprobados. Se comprobó además que las pruebas fallan
si se desactivan los triggers principales.
