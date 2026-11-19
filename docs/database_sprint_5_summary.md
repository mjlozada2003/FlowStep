# Base de datos FlowStep - Sprint 5 (sprint final)

## Alcance

HU-04, HU-05, HU-08, HU-26, HU-27, HU-28, HU-29, HU-30, HU-31, HU-37, HU-38, HU-39, HU-40, HU-41,
HU-42, HU-43, HU-51 y HU-52. Completa los dominios del ER que faltaban: Knowledge, Resources,
Assessment y AI Adaptation.

## Entregables

- `database/12_learning_adaptation_schema.sql`: 15 tablas (`TOPIC`, `GOAL_TOPIC`, `ACTIVITY_TOPIC`,
  `USER_TOPIC`, `LEARNING_RESOURCE`, `ACTIVITY_RESOURCE`, `RESOURCE_PROGRESS`, `ASSESSMENT`,
  `ASSESSMENT_QUESTION`, `QUESTION_OPTION`, `ASSESSMENT_ATTEMPT`, `ATTEMPT_ANSWER`,
  `AI_RECOMMENDATION`, `REPLAN_PROPOSAL`, `REPLAN_PROPOSAL_ITEM`), las FK reservadas desde el
  Sprint 2 y 11 triggers de integridad.
- `database/13_learning_adaptation_views.sql`: 14 vistas (conocimientos, recursos, actividades de
  aprendizaje, resultados de evaluación, temas débiles, dificultad, contexto de replanificación,
  propuestas, disponibilidad, historial de recomendaciones y perfil para recomendaciones).
- `database/14_learning_adaptation_seeds.sql`: demo `aprendizaje.demo@flowstep.test`.
- `database/tests/learning_adaptation.sql`: casos válidos e inválidos de las 18 historias.
- `database/cloud/cloud_setup.sql` y `backend/scripts/db-setup.cjs`: base en la nube (Supabase).

## Decisiones

- **Se persiste lo que hoy genera la IA**: recomendaciones, propuestas, cuestionarios e intentos.
  Así hay trazabilidad (HU-30, HU-31), se califica contra las preguntas mostradas (HU-40) y el
  dominio por tema queda medido (HU-41).
- **Reglas en la base**: una sola respuesta correcta por pregunta; respuestas solo de opciones de su
  pregunta y solo antes de enviar; una recomendación se responde una sola vez; una sola propuesta
  recomendada y una sola elegida; no se reprograma trabajo completado (HU-29); fechas propuestas no
  pueden estar en el pasado (HU-08).
- **Se reutiliza lo existente**: `ACTIVITY.type = 'reinforcement'`, `origin = 'ai_adjustment'`,
  `ACTIVITY_SCHEDULE.reason = 'ai_adjustment'`, historial de fecha límite del Sprint 3.
- **Datos derivados en vistas**: dominio mostrado, estado de cada conocimiento, puntaje, temas
  débiles, capacidad semanal y foco recomendado no se almacenan.
- **Base en la nube con Supabase**: es PostgreSQL, así que se conservan todos los scripts, triggers,
  vistas y la conexión TypeORM. Firebase (NoSQL) obligaría a reescribir el modelo y el backend.

## Revisión del backend (rama `feature/backend`)

- El Sprint 5 del backend está en `feature/backend` y aún no se fusionó en `main`.
- Usa correctamente las vistas y triggers de los sprints 3 y 4 (`v_goal_delay_alert`, `v_goal_pace`,
  `fn_progress_summary`, `flowstep.change_reason`, `AUTH_SESSION`, `USER_PREFERENCE`).
- No persiste nada del Sprint 5; ver "Indicaciones para el backend" en la sección 11 de
  `database/README.md`.
- La alternativa "Más tiempo" suma 14 días a la fecha límite actual; si esa fecha ya pasó, el
  resultado puede seguir en el pasado y el trigger del Sprint 3 lo rechaza. Conviene partir de
  `GREATEST(due_date, CURRENT_DATE)`.

## Validación

Sobre PostgreSQL 16: inicialización desde cero de `01` a `14` dos veces sin errores ni duplicados;
pruebas `sprint3`, `goal_management` y `learning_adaptation` aprobadas; cada trigger principal
desactivado a propósito hace fallar su prueba. `db-setup.cjs` se probó de punta a punta con roles
`anon`/`authenticated` simulados: quedaron sin acceso a tablas y vistas, RLS activo en las 31
tablas y zona horaria `America/La_Paz` fijada en la base.
