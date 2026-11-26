# Base de datos FlowStep - Sprint 5 (sprint final)

## Alcance

HU-04, HU-05, HU-08, HU-26, HU-27, HU-28, HU-29, HU-30, HU-31, HU-37, HU-38, HU-39, HU-40, HU-41,
HU-42, HU-43, HU-51 y HU-52. Completa los dominios del ER que faltaban: Knowledge, Resources,
Assessment y AI Adaptation.

## Entregables

- `database/12_learning_adaptation_schema.sql`: 16 tablas (`TOPIC`, `GOAL_TOPIC`, `ACTIVITY_TOPIC`,
  `USER_TOPIC`, `LEARNING_RESOURCE`, `ACTIVITY_RESOURCE`, `RESOURCE_PROGRESS`, `ASSESSMENT`,
  `ASSESSMENT_QUESTION`, `QUESTION_OPTION`, `ASSESSMENT_ATTEMPT`, `ATTEMPT_ANSWER`,
  `AI_RECOMMENDATION`, `REPLAN_PROPOSAL`, `REPLAN_PROPOSAL_ITEM`, `GOAL_RESOURCE`), las FK reservadas desde el
  Sprint 2 y 11 triggers de integridad.
- `database/13_learning_adaptation_views.sql`: 14 vistas (conocimientos, recursos, actividades de
  aprendizaje, resultados de evaluación, temas débiles, dificultad, contexto de replanificación,
  propuestas, disponibilidad, historial de recomendaciones y perfil para recomendaciones).
- `database/14_learning_adaptation_seeds.sql`: demo `aprendizaje.demo@flowstep.test`.
- `database/tests/learning_adaptation.sql`: casos válidos e inválidos de las 18 historias.
- `database/tests/learning_persistence.sql`: columnas, tabla y vistas que usa el backend para persistir.
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

## Persistencia desde el backend

El backend guarda en estas tablas lo que genera la IA, sin cambiar el contrato de la API
(`backend/src/learning/learning-store.service.ts`; detalle en la sección 11 de `database/README.md`):

- Conocimientos, recursos y cuestionarios se generan una sola vez y luego se leen de la base.
- La evaluación se califica en el servidor contra las opciones guardadas y actualiza el dominio
  por tema (`USER_TOPIC`).
- Recomendaciones, sugerencias por dificultad y alternativas quedan registradas con su explicación
  y la decisión del usuario (aceptar, elegir propuesta o rechazar).
- "Equilibrada" guarda y aplica el cambio real de cada actividad pendiente según la disponibilidad;
  "Más tiempo" extiende desde hoy si la fecha límite ya venció (antes producía un error 500).
- Si la base no tiene las tablas, cada endpoint responde como antes (solo IA).

Para esto se agregaron `LEARNING_RESOURCE.details`, `REPLAN_PROPOSAL.presentation`,
`AI_RECOMMENDATION.details` y la tabla `GOAL_RESOURCE` (sección 7 de `12_learning_adaptation_schema.sql`),
y las vistas de recursos y propuestas de `13` las exponen. Una base existente se actualiza con
`npm run db:setup` (los scripts se pueden repetir).

## Validación

Sobre PostgreSQL 16: inicialización desde cero de `01` a `14` dos veces sin errores ni duplicados;
pruebas `sprint3`, `goal_management` y `learning_adaptation` aprobadas; cada trigger principal
desactivado a propósito hace fallar su prueba. `db-setup.cjs` se probó de punta a punta con roles
`anon`/`authenticated` simulados: quedaron sin acceso a tablas y vistas, RLS activo en las 31
tablas y zona horaria `America/La_Paz` fijada en la base.
