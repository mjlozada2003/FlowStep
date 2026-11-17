# Resumen Contextual del Backend - Sprint 5 (FlowStep)

Este documento detalla la arquitectura, decisiones de diseño, integración con vistas de base de datos, servicios de Inteligencia Artificial (Google Gemini) y endpoints desarrollados exclusivamente para la capa de **Backend** de FlowStep durante el **Sprint 5**, incluyendo la conexión con la aplicación móvil.

---

## 1. Arquitectura y Stack Tecnológico

- **Framework:** NestJS (Node.js / TypeScript) estructurado en arquitectura modular por capas (Controladores, Servicios, Repositorios, DTOs con `class-validator` y `class-transformer`).
- **Motor de Inteligencia Artificial:** `AiService` integrando Google Gemini API (`@google/genai`) con soporte para modelos de inferencia ágil (`gemini-2.5-flash`, `gemini-2.0-flash-lite`), generación de JSON estricto (`responseMimeType: 'application/json'`), sanitización robusta con expresiones regulares y planes pedagógicos de contingencia resilientes.
- **Base de Datos & Vistas Analíticas:** PostgreSQL 16 sobre contenedor Docker, consumiendo las vistas del script oficial del equipo de base de datos:
  - `v_goal_delay_alert`: Detección en tiempo real de retrasos acumulados en días, clasificación de criticidad (`warning`, `critical`, `info`), actividad más retrasada y ranking por prioridad de la meta.
  - `v_goal_pace`: Comparativa de ritmo estimado vs. real, minutos de desfase y cálculo de desviación porcentual.
  - `v_activity_timeline`: Cronología unificada de sesiones, cambios de estado, reprogramaciones e incidencias de incumplimiento con causas registradas.
- **Persistencia & Entidades:** TypeORM sobre entidades tipadas:
  - `GOAL`: Estados, prioridades, fechas límites adaptables y trazabilidad.
  - `ACTIVITY`: Tipos ampliados (`learning`, `practice`, `exercise`, `assessment`, `reinforcement`) y origen (`initial_plan`, `manual`, `ai_adjustment`).
  - `ACTIVITY_SCHEDULE`: Versiones históricas de programación con motivo `ai_adjustment`.
  - `WORK_SESSION`: Sesiones reales con `minutes_spent`, `difficulty_level` y `difficulty_notes`.
  - `SCHEDULE_MISS`: Registro de incidencias asociadas a motivos (`Falta de tiempo`, `Dificultad con la actividad`, etc.).
- **Documentación Swagger / OpenAPI:** Todos los endpoints decorados con `@ApiTags('Objetivos')` y `@ApiTags('Actividades')`, descriptores de operación, códigos HTTP y ejemplos de respuesta.

---

## 2. Historias de Usuario Implementadas (Backend)

### HU-04 — Recomendar ajustes & HU-30 — Explicar recomendaciones
- **Endpoint:** `GET /goals/:id/recommendations`
- **Módulo / Servicio:** `GoalsController` -> `GoalsService.getGoalRecommendations(userId, goalId)`
- **Lógica de negocio:**
  - Consulta `v_goal_delay_alert` para identificar días de retraso y actividad crítica no completada.
  - Analiza `WORK_SESSION` para extraer notas de dificultad cualitativa reportadas por el usuario.
  - Calcula las horas semanales disponibles y el porcentaje de progreso real.
  - Invoca `AiService.generateRecommendationDiagnostic()` para generar una recomendación comprensible y accionable.
  - Cumple los criterios de HU-30 al entregar un desglose transparente de **por qué** se originó la sugerencia (`why_suggested`), qué busca resolver (`solution_focus`), lista de cambios concretos (`solutions`) y el beneficio esperado.

### HU-26 — Recibir sugerencias ante dificultades
- **Endpoint:** `GET /activities/:id/suggestions`
- **Módulo / Servicio:** `ActivitiesController` -> `ActivitiesService.getActivitySuggestions(userId, activityId)`
- **Lógica de negocio:**
  - Valida pertenencia de la actividad al usuario autenticado.
  - Consolida el texto de dificultad a partir de notas de sesiones de trabajo (`WORK_SESSION.difficulty_notes`) e incidencias de incumplimiento (`SCHEDULE_MISS` / `MissReason`).
  - Llama a `AiService.generateActivitySuggestion()` para producir recomendaciones inmediatas de simplificación, división en bloques o reprogramación para horas de mayor concentración.

### HU-43 — Recibir recomendaciones personalizadas
- **Endpoint:** `GET /goals/personalized-recommendations`
- **Módulo / Servicio:** `GoalsController` -> `GoalsService.getPersonalizedRecommendations(userId)`
- **Lógica de negocio:**
  - Evalúa la cartera completa de metas activas del usuario ordenadas por nivel de urgencia (`v_goal_delay_alert`).
  - Si existen retrasos críticos o advertencias, selecciona la meta de mayor prioridad que requiera ajuste.
  - Si el usuario va al día, genera recomendaciones proactivas de aceleración o consolidación sobre su meta más activa.
  - Se consume directamente desde la tarjeta de recomendación personalizada de la pantalla de inicio (`HomeScreen`).

---

### HU-27 — Ajustar actividades por retraso, HU-28 — Disponibilidad, HU-29 — Historial & HU-51 — Alternativas de replanificación
- **Endpoint:** `GET /goals/:id/alternatives`
- **Módulo / Servicio:** `GoalsController` -> `GoalsService.getReplanAlternatives(userId, goalId)`
- **Lógica de negocio:**
  - **HU-29 (Historial protegido):** Contabiliza las actividades ya finalizadas (`status = 'completed'`) y el tiempo real acumulado en `WORK_SESSION`. Todas las alternativas garantizan que el trabajo previo y el progreso alcanzado se conservan intactos.
  - **HU-28 (Disponibilidad respetada):** Cruza los días y horarios libres registrados por el usuario (`AVAILABILITY`) para no sobrecargar su rutina.
  - **HU-51 (3 Escenarios de Replanificación):**
    1. **`balanced` (Equilibrada - Recomendada):** Redistribuye las actividades pendientes dentro de la semana en bloques de máximo 60 minutos, conservando la fecha límite del objetivo.
    2. **`learning` (Más aprendizaje / Refuerzo):** Inserta recursos de apoyo conceptual y ejercicios guiados antes de retomar actividades complejas.
    3. **`time` (Más tiempo / Reducción de carga):** Extiende la fecha límite (habitualmente 14 días) y reduce las sesiones diarias para disminuir la exigencia semanal.

---

### HU-31 — Aceptar o rechazar cambios, HU-52 — Seleccionar propuesta & HU-08 — Fecha límite
- **Endpoints:**
  - `POST /goals/:id/alternatives/apply` (Aceptar y aplicar alternativa elegida)
  - `POST /goals/:id/alternatives/reject` (Rechazar cambios y conservar plan original)
- **DTO:** `ApplyAlternativeDto` (`proposal_type: 'balanced' | 'learning' | 'time'`, `target_date?: string`).
- **Módulo / Servicio:** `GoalsController` -> `GoalsService.applyReplanAlternative()` / `rejectReplanAlternative()`
- **Lógica de negocio:**
  - **HU-31 & HU-52:** El usuario mantiene autonomía total sobre su agenda. Si elige aplicar:
    - Escenario `balanced`: Reorganiza el calendario de actividades pendientes creando nuevas versiones en `ACTIVITY_SCHEDULE` con `reason = 'ai_adjustment'`.
    - Escenario `learning`: Incorpora al plan actividades de tipo `reinforcement` con origen `ai_adjustment` y las programa de forma inmediata.
    - Escenario `time`: Actualiza la fecha límite en `GOAL.due_date` respetando HU-08 y redistribuye las actividades en el nuevo período disponible.
  - Si elige rechazar: El backend confirma la retención del plan intacto (`status: 'rejected'`) sin mutar registros existentes.

---

### HU-05 — Acceder a recursos, HU-37 — Conocimientos, HU-38 — Recursos por actividad & HU-39 — Actividades de aprendizaje
- **Endpoints:**
  - `GET /goals/:id/knowledge` (HU-37)
  - `GET /goals/:id/resources` (HU-05, HU-38)
  - `GET /activities/:id/resources` (HU-38)
- **Módulo / Servicio:** `GoalsController` y `ActivitiesController`
- **Lógica de negocio:**
  - **HU-37:** Desglosa el objetivo en conceptos clave y calcula el índice de dominio (`dominant_count / total_concepts`) relacionándolos con las etapas completadas y pendientes (`topics: { name, status: 'completed' | 'current' | 'pending' }`).
  - **HU-05 & HU-38:** Retorna recursos educativos estructurados (`LECTURA`, `VÍDEO`, `PRÁCTICA`, `EJERCICIO`) con categoría conceptual, duración estimada, insignias (`Esencial`, `Recomendado`) e iconos listos para renderizar.
  - **HU-39:** Permite vincular recursos directamente a actividades prácticas de aprendizaje dentro del cronograma.

---

### HU-40 — Evaluar conocimientos, HU-41 — Detectar temas débiles & HU-42 — Agregar refuerzo
- **Endpoints:**
  - `GET /goals/:id/evaluation` (HU-40)
  - `POST /goals/:id/evaluation/submit` (HU-40, HU-41)
  - `POST /goals/:id/reinforcement` (HU-42, HU-39)
- **DTOs:** `SubmitEvaluationDto` (`answers: { question_id, selected_option_id }[]`), `AddReinforcementDto` (`topic, title, estimated_minutes`).
- **Módulo / Servicio:** `GoalsController` -> `GoalsService`
- **Lógica de negocio:**
  - **HU-40:** Genera dinámicamente un cuestionario diagnóstica de preguntas de opción múltiple (`key`, `text`, `is_correct`, `explanation`) enfocado en el objetivo del usuario.
  - **HU-41:** Al calificar el cuestionario (`/evaluation/submit`), calcula el porcentaje de aciertos e identifica temas con bajo desempeño (`weak_topics`).
  - **HU-42:** Si se detectan debilidades, sugiere recomendaciones de refuerzo y permite incorporarlas al plan en un solo paso (`/reinforcement`), creando una actividad de tipo `reinforcement` en la etapa correspondiente y programándola en `ACTIVITY_SCHEDULE`.

---

## 3. Catálogo Consolidado de Endpoints - Sprint 5

| Método | Ruta | Historia de Usuario | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/goals/personalized-recommendations` | HU-43 | Recomendación proactiva general basada en progreso y alertas de retraso. |
| `GET` | `/goals/:id/recommendations` | HU-04, HU-26, HU-30 | Diagnóstico de retraso con explicación y propuesta de solución. |
| `GET` | `/goals/:id/alternatives` | HU-27, HU-28, HU-29, HU-51 | 3 alternativas de replanificación respetando historial y disponibilidad. |
| `POST` | `/goals/:id/alternatives/apply` | HU-08, HU-31, HU-52 | Aplica el escenario seleccionado (actualiza agenda o fecha límite). |
| `POST` | `/goals/:id/alternatives/reject` | HU-31 | Rechaza propuestas y conserva el plan original sin modificaciones. |
| `GET` | `/goals/:id/knowledge` | HU-37 | Consulta conceptos y temas requeridos clasificados por estado de dominio. |
| `GET` | `/goals/:id/resources` | HU-05, HU-38 | Listado de recursos de aprendizaje (lecturas, vídeos, guías) recomendados. |
| `GET` | `/goals/:id/evaluation` | HU-40 | Cuestionario interactivo de preguntas de opción múltiple adaptado al objetivo. |
| `POST` | `/goals/:id/evaluation/submit` | HU-40, HU-41 | Califica evaluación, genera puntaje y detecta temas por mejorar. |
| `POST` | `/goals/:id/reinforcement` | HU-42, HU-39 | Agrega y programa una actividad de aprendizaje de refuerzo en el plan. |
| `GET` | `/activities/:id/suggestions` | HU-26 | Sugerencias puntuales de IA ante dificultades registradas en una actividad. |
| `GET` | `/activities/:id/resources` | HU-38 | Recursos formativos específicos vinculados a una actividad concreta. |

---

## 4. Conexión Frontend Mobile Integrada

Las pantallas añadidas en `mobile/src/app/(app)/` se conectaron a los servicios de API oficiales (`mobile/src/services/api/recommendations.ts` y `mobile/src/services/api/learning.ts`):

1. **`recommendation.tsx` (HU-04, HU-26, HU-30):**
   - Consume `GET /goals/:id/recommendations`.
   - Renderiza tarjetas dinámicas de Flow Mascot, nivel de alerta, mini-métricas de progreso y checklist de soluciones.
2. **`alternatives.tsx` (HU-08, HU-27, HU-28, HU-29, HU-31, HU-51, HU-52):**
   - Consume `GET /goals/:id/alternatives`.
   - Muestra protección de trabajo realizado y permite seleccionar entre las 3 propuestas (`balanced`, `learning`, `time`).
   - Envía selección a `POST /goals/:id/alternatives/apply` o cancela con `POST /goals/:id/alternatives/reject`.
3. **`(tabs)/learning.tsx` (HU-05, HU-37, HU-38, HU-39):**
   - Consume `GET /goals/:id/knowledge` y `GET /goals/:id/resources`.
   - Muestra índice de conceptos dominados, píldoras horizontales de temas, lista de recursos multimedia y banner hacia la evaluación.
4. **`evaluation.tsx` (HU-40, HU-41, HU-42):**
   - Consume `GET /goals/:id/evaluation`.
   - Renderiza preguntas interactivas, barra de progreso y retroalimentación inmediata.
   - Envía respuestas a `POST /goals/:id/evaluation/submit` y ofrece agregar actividades de refuerzo con `POST /goals/:id/reinforcement`.
5. **`(tabs)/home.tsx` (HU-43):**
   - Consume `GET /goals/personalized-recommendations`.
   - Actualiza en vivo la tarjeta de recomendación personalizada con la causa y solución sugerida según el estado de las metas del usuario.

---

## 5. Pruebas y Validación Técnica

- **Pruebas Unitarias Backend:**
  - `src/goals/goals.service.spec.ts` (100% pasando)
  - `src/goals/goals.controller.spec.ts` (100% pasando)
  - `src/activities/activities.service.spec.ts` (100% pasando)
  - `src/activities/activities.controller.spec.ts` (100% pasando)
  - `src/ai/ai.service.spec.ts` (100% pasando)
  - **Resultado:** 60 pruebas unitarias ejecutadas satisfactoriamente con Jest.
- **Compilación de Backend:** `npm --prefix backend run build` sin errores TypeScript.
- **Verificación de Tipos Frontend:** `npx --prefix mobile tsc -p mobile/tsconfig.json --noEmit` completado con 0 errores de tipado.
