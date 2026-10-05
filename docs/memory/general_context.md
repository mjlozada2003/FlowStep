# Contexto General: FlowStep

## Descripción del Proyecto
FLOWSTEP es un sistema inteligente de planificación y gestión de objetivos que transforma metas expresadas en lenguaje natural en un proceso estructurado de aprendizaje y acción. Utiliza IA para identificar conocimientos, etapas y actividades necesarias, generando un plan personalizado. A medida que el usuario ejecuta su plan, el sistema registra su progreso y adapta la planificación inicial usando IA.

## Stack Tecnológico y Arquitectura
- **Arquitectura Global:** Cliente-Servidor.
- **Frontend (Mobile):** React Native (Expo) con TypeScript.
- **Backend:** NestJS con TypeScript.
- **Base de Datos:** PostgreSQL con **TypeORM**.
- **Inteligencia Artificial:** API de Gemini (LLM).
- **Comunicación:** API REST (Stateless) con autenticación JWT.

## Modelo de Datos
El sistema consta de 28 tablas agrupadas en 8 dominios principales:
1. **User:** Gestión de usuarios, preferencias y disponibilidad (ej. `APP_USER`, `USER_PREFERENCE`).
2. **Knowledge:** Temas y conocimientos (`TOPIC`, `USER_TOPIC`).
3. **Plan:** Metas, etapas, actividades y dependencias (`GOAL`, `STAGE`, `ACTIVITY`).
4. **Resources:** Recursos de aprendizaje asociados a actividades.
5. **Tracking:** Seguimiento y programación (`ACTIVITY_SCHEDULE`, `WORK_SESSION`).
6. **Assessment:** Evaluaciones y preguntas para medir el conocimiento.
7. **AI Adaptation:** Recomendaciones y alternativas de replanificación generadas por IA.
8. **Audit:** Historial de estados (metas y actividades) para trazabilidad.

## Metodología
Desarrollo ágil basado en Sprints e Historias de Usuario (User Stories).
