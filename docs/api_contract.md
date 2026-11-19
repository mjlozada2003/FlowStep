# Contrato de Comunicación de la API (Backend ⇄ Frontend) - FlowStep

Este documento define el **contrato de comunicación oficial (OpenAPI / REST)** entre el Backend (NestJS + PostgreSQL) y el Frontend (React Native + Expo) de FlowStep.

---

## 1. Información General y Entorno

- **Versión de la API:** `1.0.0`
- **Formato de Intercambio:** `application/json`
- **Documentación Interactiva (Swagger UI):** `http://localhost:3000/api/docs`
- **Especificación OpenAPI (JSON):** `http://localhost:3000/api/docs-json`

### URLs Base según el entorno de prueba:
| Entorno | Base URL | Observaciones |
| :--- | :--- | :--- |
| **Web Browser / Postman** | `http://localhost:3000` | Pruebas locales directas |
| **Android Emulator** | `http://10.0.2.2:3000` | IP de puente del emulador de Android Studio |
| **Dispositivo Físico (Expo Go)** | `http://<TU_IP_LOCAL>:3000` | Ej. `http://192.168.1.15:3000` (Ambos dispositivos deben estar en la misma red Wi-Fi) |

---

## 2. Convenciones Globales y Autenticación

### Cabecera de Autorización
Los endpoints protegidos requieren el token JWT obtenido tras iniciar sesión en la cabecera HTTP:
```http
Authorization: Bearer <access_token>
```

### Estructura Estándar de Errores
Si una petición falla por validación o reglas de negocio, el backend responde con el formato estándar de NestJS:
```json
{
  "statusCode": 400,
  "message": [
    "La prioridad debe ser high, medium o low",
    "El formato del correo es inválido",
    "La contraseña debe tener al menos 6 caracteres"
  ],
  "error": "Bad Request"
}
```

---

## 3. Catálogo de Endpoints

### 3.1 Módulo: Autenticación y Usuarios

#### Registrar Usuario (HU-53)
- **Ruta:** `POST /users/register`
- **Autenticación:** Pública (No requiere token)
- **Body:**
```json
{
  "name": "Maria",
  "email": "maria@example.com",
  "password": "Password123!"
}
```
- **Respuesta (`201 Created`):**
```json
{
  "message": "Usuario registrado exitosamente",
  "user": {
    "user_id": 1,
    "name": "Maria",
    "email": "maria@example.com",
    "created_at": "2026-10-28T12:00:00.000Z"
  }
}
```

#### Iniciar Sesión (HU-54)
- **Ruta:** `POST /auth/login`
- **Autenticación:** Pública
- **Body:**
```json
{
  "email": "maria@example.com",
  "password": "Password123!"
}
```
- **Respuesta (`200 OK`):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsIn...",
  "user": {
    "user_id": 1,
    "name": "Maria",
    "email": "maria@example.com"
  }
}
```

---

### 3.2 Módulo: Metas y Objetivos (Goals)

#### Registrar Objetivo y Generar Plan con IA (HU-01, HU-02, HU-09, HU-36)
- **Ruta:** `POST /goals`
- **Autenticación:** Bearer Token
- **Body:**
```json
{
  "title": "Aprender Francés Básico",
  "user_description": "Quiero aprender frases esenciales para viajar a París.",
  "priority": "high",
  "due_date": "2026-12-31"
}
```
- **Respuesta (`201 Created`):** Retorna el objetivo con sus etapas, actividades y cronograma inicial adaptado a la disponibilidad del usuario.

#### Listar Objetivos
- **Ruta:** `GET /goals`
- **Autenticación:** Bearer Token

#### Consultar Detalle de Objetivo
- **Ruta:** `GET /goals/:id`
- **Autenticación:** Bearer Token

#### Establecer o Modificar Prioridad (HU-06)
- **Ruta:** `PATCH /goals/:id/priority`
- **Autenticación:** Bearer Token
- **Body:**
```json
{
  "priority": "high"
}
```

#### Actualizar Objetivo Parcialmente
- **Ruta:** `PATCH /goals/:id`
- **Autenticación:** Bearer Token
- **Body:**
```json
{
  "title": "Aprender Francés Intermedio",
  "priority": "low"
}
```

---

### Persistencia del Sprint 2

Aplicar `database/04_sprint_2_additions.sql` después de `database/01_schema.sql` en las bases existentes. El script es aditivo e idempotente: crea las tablas que faltan para disponibilidad, cronogramas, preferencias de duración de sesión e historial de estado, sin eliminar tablas ni columnas existentes.

El historial de cambios de estado se conserva en `ACTIVITY_STATUS_HISTORY`, pero no se expone una ruta HTTP separada para consultarlo.

### 3.3 Módulo: Disponibilidad de Tiempo (Availability)

#### Registrar Franja Horaria (HU-35, HU-07)
- **Ruta:** `POST /availability`
- **Autenticación:** Bearer Token
- **Body:**
```json
{
  "day_of_week": "monday",
  "start_time": "18:00",
  "end_time": "20:00"
}
```

#### Configurar Disponibilidad Semanal en Lote (HU-35, HU-07)
- **Ruta:** `POST /availability/bulk`
- **Autenticación:** Bearer Token
- **Body:**
```json
{
  "availabilities": [
    { "day_of_week": "monday", "start_time": "18:00", "end_time": "20:00" },
    { "day_of_week": "thursday", "start_time": "19:00", "end_time": "21:00" }
  ],
  "session_duration_minutes": 60
}
```

El reemplazo de disponibilidad es transaccional e incluye todas las franjas semanales del usuario autenticado. `session_duration_minutes` es opcional por compatibilidad y admite `30`, `60` o `120`; si se envía, las franjas y la preferencia se guardan en la misma transacción. Las franjas repetidas y solapadas se rechazan. Enviar una lista vacía elimina las franjas de disponibilidad del usuario.

#### Consultar Disponibilidad Semanal
- **Respuesta:** arreglo de objetos con `availability_id`, `user_id`, `day_of_week`, `start_time` y `end_time`.
- **Ruta:** `GET /availability`
- **Autenticación:** Bearer Token

#### Consultar Preferencia de Duración de Sesión (HU-07)
- **Ruta:** `GET /availability/preferences`
- **Autenticación:** Bearer JWT
- **Respuesta:**
```json
{
  "user_id": 1,
  "session_duration_minutes": 60
}
```
- Si el usuario aún no guardó una preferencia, se devuelve el valor inicial de `60` minutos. La pantalla calcula las horas semanales a partir de las franjas guardadas; no se mantiene un total redundante separado.
- La duración seleccionada se usa como límite al adaptar la duración estimada de cada actividad al generar el plan.

#### Eliminar Franja Horaria
- **Ruta:** `DELETE /availability/:id`
- **Autenticación:** Bearer Token

---

### 3.4 Módulo: Etapas (Stages)

#### Consultar Actividades por Etapa (HU-10)
- **Ruta:** `GET /stages/:id/activities`
- **Autenticación:** Bearer Token

#### Agregar Actividad Manual Propia (HU-13)
- **Ruta:** `POST /stages/:id/activities`
- **Autenticación:** Bearer Token
- **Body:**
```json
{
  "title": "Repasar tarjetas de vocabulario",
  "description": "Sesión de 30 minutos",
  "type": "practice",
  "priority": "medium",
  "estimated_minutes": 30
}
```

---

### 3.5 Módulo: Actividades (Activities)

#### Consultar Detalle de Actividad
- **Ruta:** `GET /activities/:id`
- **Autenticación:** Bearer Token

#### Modificar Actividad (HU-11)
- **Ruta:** `PATCH /activities/:id`
- **Autenticación:** Bearer Token
- **Body:**
```json
{
  "title": "Pronunciación avanzada",
  "estimated_minutes": 45
}
```

#### Completar Actividad (HU-15)
- **Ruta:** `PATCH /activities/:id/complete`
- **Autenticación:** Bearer Token

#### Mantener Actividad Pendiente (HU-16)
- **Efecto:** registra la transición de estado en `ACTIVITY_STATUS_HISTORY`, conserva allí la fecha de completado anterior y limpia `completed_at` en el estado actual.
- **Ruta:** `PATCH /activities/:id/pending`
- **Autenticación:** Bearer Token

#### Reprogramar Actividad sin Perder Historial (HU-14)
- **Ruta:** `POST /activities/:id/reschedule`
- **Autenticación:** Bearer Token
- **Body:**
```json
{
  "scheduled_date": "2026-11-15",
  "start_time": "15:00",
  "end_time": "16:30"
}
```

#### Consultar Historial de Reprogramaciones (HU-14)
- **Ruta:** `GET /activities/:id/schedules`
- **Autenticación:** Bearer Token

#### Eliminar Actividad
- **Ruta:** `DELETE /activities/:id`
- **Autenticación:** Bearer Token


#### Registrar Sesión de Trabajo y Dificultades (HU-17, HU-18)
- **Ruta:** `POST /activities/:id/sessions`
- **Autenticación:** Bearer Token
- **Body:**
```json
{
  "minutes_spent": 45,
  "session_date": "2026-11-04",
  "difficulty_level": 3,
  "difficulty_notes": "Me costó la conjugación de verbos irregulares pero logré avanzar."
}
```
- **Respuesta (`201 Created`):**
```json
{
  "session_id": 1,
  "activity_id": 1,
  "session_date": "2026-11-04",
  "minutes_spent": 45,
  "difficulty_level": 3,
  "difficulty_notes": "Me costó la conjugación de verbos irregulares pero logré avanzar.",
  "created_at": "2026-11-04T15:16:00.000Z"
}
```

#### Consultar Sesiones y Tiempo Total Dedicado (HU-17)
- **Ruta:** `GET /activities/:id/sessions`
- **Autenticación:** Bearer Token
- **Respuesta (`200 OK`):**
```json
{
  "activity_id": 1,
  "activity_title": "Estudiar gramática básica",
  "estimated_minutes": 60,
  "total_logged_minutes": 45,
  "sessions": [
    {
      "session_id": 1,
      "activity_id": 1,
      "minutes_spent": 45,
      "session_date": "2026-11-04",
      "difficulty_level": 3,
      "difficulty_notes": "Me costó la conjugación de verbos irregulares pero logré avanzar.",
      "created_at": "2026-11-04T15:16:00.000Z"
    }
  ]
}
```

#### Catálogo de Motivos de Incumplimiento (HU-19)
- **Ruta:** `GET /activities/miss-reasons`
- **Autenticación:** Bearer Token
- **Respuesta (`200 OK`):**
```json
[
  { "reason_id": 1, "name": "Falta de tiempo", "description": null },
  { "reason_id": 2, "name": "Dificultad con la actividad", "description": null },
  { "reason_id": 3, "name": "Imprevisto", "description": null },
  { "reason_id": 4, "name": "Otro", "description": null }
]
```

#### Registrar Causa de Incumplimiento (HU-19)
- **Ruta:** `POST /activities/:id/miss`
- **Autenticación:** Bearer Token
- **Body:**
```json
{
  "reason_id": 1,
  "details": "Tuve una reunión de trabajo imprevista y no alcancé a realizar la actividad."
}
```

#### Consultar Incidencias de Incumplimiento (HU-19)
- **Ruta:** `GET /activities/:id/misses`
- **Autenticación:** Bearer Token

#### Historial Cronológico Consolidado de Actividades (HU-20)
- **Ruta:** `GET /activities/history`
- **Autenticación:** Bearer Token
- **Query Params (Opcionales):** `goal_id`, `activity_id`, `event_type` (`work_session`, `status_change`, `schedule_version`, `schedule_miss`), `from` (`YYYY-MM-DD`), `to` (`YYYY-MM-DD`), `limit`, `offset`.
- **Respuesta (`200 OK`):**
```json
[
  {
    "user_id": 1,
    "goal_id": 1,
    "stage_id": 1,
    "activity_id": 2,
    "activity_title": "Estudiar vocabulario básico",
    "event_type": "work_session",
    "event_id": 1,
    "event_date": "2026-11-04",
    "recorded_at": "2026-11-04T15:00:00.000Z",
    "details": {
      "minutes_spent": 45,
      "difficulty_level": 3,
      "difficulty_notes": "Práctica fluida"
    }
  }
]
```

#### Historial Cronológico de Actividad Específica (HU-20)
- **Ruta:** `GET /activities/:id/history`
- **Autenticación:** Bearer Token

---

### 3.6 Módulo: Métricas, Ritmo y Gráficos de Objetivos

#### Consultar Avance de Todos los Objetivos (HU-22)
- **Ruta:** `GET /goals/progress`
- **Autenticación:** Bearer Token
- **Respuesta (`200 OK`):**
```json
[
  {
    "goal_id": 1,
    "user_id": 1,
    "goal_title": "Aprender Francés Básico",
    "goal_status": "active",
    "total_activities": 8,
    "completed_activities": 4,
    "total_estimated_minutes": 240,
    "completed_estimated_minutes": 120,
    "progress_percentage": "50.00"
  }
]
```

#### Consultar Ritmo de Todos los Objetivos (HU-24)
- **Ruta:** `GET /goals/pace`
- **Autenticación:** Bearer Token

#### Comparativa de Ritmo y Detección de Retraso de un Objetivo (HU-24)
- **Ruta:** `GET /goals/:id/pace`
- **Autenticación:** Bearer Token
- **Respuesta (`200 OK`):**
```json
{
  "goal_id": 1,
  "user_id": 1,
  "goal_title": "Aprender Francés Básico",
  "goal_status": "active",
  "total_activities": 8,
  "completed_activities": 2,
  "total_estimated_minutes": 240,
  "completed_estimated_minutes": 60,
  "progress_percentage": "25.00",
  "as_of_date": "2026-11-04",
  "scheduled_estimated_minutes": 240,
  "expected_completed_minutes": 120,
  "expected_progress_percentage": "50.00",
  "pace_status": "behind",
  "is_delayed": true,
  "delay_minutes": 60,
  "delay_percentage": 25.0,
  "alert_message": "Atención: Tienes un posible retraso de 60 minutos (25% por debajo del plan esperado a la fecha). Te recomendamos reprogramar o dedicar una sesión de estudio."
}
```

#### Visualización de Progreso para Gráficos Móviles (HU-21)
- **Ruta:** `GET /goals/:id/charts`
- **Autenticación:** Bearer Token
- **Respuesta (`200 OK`):**
```json
{
  "goal_id": 1,
  "goal_title": "Aprender Francés Básico",
  "summary": {
    "progress_percentage": "50.00",
    "total_activities": 8,
    "completed_activities": 4,
    "total_estimated_minutes": 240,
    "completed_estimated_minutes": 120,
    "total_minutes_spent": 105
  },
  "weekly_progress": [
    {
      "week_start": "2026-11-02",
      "minutes_spent": 45,
      "completed_estimated_minutes": 60,
      "planned_estimated_minutes": 60
    }
  ],
  "status_distribution": {
    "completed": 4,
    "in_progress": 0,
    "pending": 4,
    "skipped": 0
  },
  "stage_progress": [
    {
      "stage_id": 1,
      "stage_name": "Fundamentos de Francés",
      "sort_order": 1,
      "total_activities": 4,
      "completed_activities": 2,
      "progress_percentage": "50.00"
    }
  ]
}
```

#### Serie Semanal de Progreso (HU-21)
- **Ruta:** `GET /goals/:id/weekly-progress`
- **Autenticación:** Bearer Token
- **Respuesta (`200 OK`):**
```json
[
  {
    "week_start": "2026-11-02",
    "minutes_spent": 45,
    "completed_estimated_minutes": 60,
    "planned_estimated_minutes": 60
  }
]
```

---

### 3.5 Módulo: Sprint 4 (Gestión de Metas, Preferencias, Calendario y Sesión)

#### Cerrar Sesión (HU-55)
- **Ruta:** `POST /auth/logout`
- **Autenticación:** Bearer Token
- **Respuesta (`200 OK`):**
```json
{
  "message": "Sesión cerrada exitosamente"
}
```

#### Consultar Preferencias de Usuario (HU-49)
- **Ruta:** `GET /users/preferences`
- **Autenticación:** Bearer Token
- **Respuesta (`200 OK`):**
```json
{
  "daily_reminder_enabled": true,
  "daily_reminder_time": "18:00:00",
  "weekly_digest_day": 1,
  "difficulty_preference": "balanced",
  "auto_reschedule": true,
  "notifications_enabled": true
}
```

#### Actualizar Preferencias de Usuario (HU-49)
- **Ruta:** `PATCH /users/preferences`
- **Autenticación:** Bearer Token
- **Body:**
```json
{
  "daily_reminder_enabled": true,
  "daily_reminder_time": "19:00",
  "weekly_digest_day": 1,
  "difficulty_preference": "balanced",
  "auto_reschedule": true,
  "notifications_enabled": true
}
```
- **Respuesta (`200 OK`):** Retorna la entidad de preferencias actualizada.

#### Eliminar Actividad (HU-12)
- **Ruta:** `DELETE /activities/:id`
- **Autenticación:** Bearer Token
- **Respuesta (`200 OK`):**
```json
{
  "message": "Actividad eliminada exitosamente"
}
```

#### Consultar Planificación en Calendario (HU-50)
- **Ruta:** `GET /activities/calendar?month=11&year=2026`
- **Autenticación:** Bearer Token
- **Parámetros Query:** `month` (1-12), `year` (número), `date` (opcional), `startDate` y `endDate` (opcionales).
- **Respuesta (`200 OK`):**
```json
{
  "days": [
    {
      "scheduled_date": "2026-11-15",
      "total_activities": 1,
      "completed_activities": 0,
      "pending_activities": 1,
      "day_status": "pending"
    }
  ],
  "activities": [
    {
      "activity_id": 105,
      "goal_id": 2,
      "goal_title": "Docker y Despliegue",
      "stage_title": "Fundamentos",
      "title": "Leer documentación oficial de TypeORM y Migraciones",
      "scheduled_date": "2026-11-15",
      "start_time": "18:00:00",
      "estimated_minutes": 45,
      "status": "pending",
      "priority": "high"
    }
  ]
}
```

#### Visión General de Múltiples Objetivos (HU-44, HU-45, HU-48)
- **Ruta:** `GET /goals/overview`
- **Autenticación:** Bearer Token
- **Parámetros Query:** `order_by` (`priority`, `created_at`, `target_date`), `priority_order` (`desc`, `asc`), `status` (`in_progress`, `paused`, `all`).
- **Respuesta (`200 OK`):**
```json
{
  "active_goals": 2,
  "goals": [
    {
      "goal_id": 1,
      "title": "Certificación AWS Solutions Architect",
      "status": "in_progress",
      "priority": "high",
      "target_date": "2026-12-31",
      "progress_percentage": "35.50",
      "total_activities": 12,
      "completed_activities": 4,
      "total_minutes_spent": 180,
      "is_delayed": false,
      "pace_status": "on_track",
      "alert_message": "Estás dentro del ritmo planificado."
    }
  ]
}
```

#### Resumen Cuantitativo de Objetivos (HU-48)
- **Ruta:** `GET /goals/summary`
- **Autenticación:** Bearer Token
- **Respuesta (`200 OK`):**
```json
{
  "total_goals": 3,
  "active_goals": 2,
  "completed_goals": 1,
  "overall_progress_percentage": "45.00"
}
```

#### Historial de Objetivos Anteriores (HU-46, HU-47)
- **Ruta:** `GET /goals/history`
- **Autenticación:** Bearer Token
- **Respuesta (`200 OK`):**
```json
[
  {
    "goal_id": 3,
    "user_id": 2,
    "title": "Aprender Conceptos de SQL",
    "description": "Bases de datos relacionales",
    "status": "archived",
    "closed_at": "2026-11-10T14:30:00.000Z",
    "total_activities": 6,
    "completed_activities": 5,
    "minutes_spent": 210,
    "status_label": "Archivado"
  }
]
```

#### Resumen Semanal de Progreso (HU-23)
- **Ruta:** `GET /goals/weekly-summary`
- **Autenticación:** Bearer Token
- **Parámetros Query:** `start_date` (opcional), `end_date` (opcional).
- **Respuesta (`200 OK`):**
```json
{
  "period_start": "2026-11-07",
  "period_end": "2026-11-13",
  "minutes_spent": 150,
  "completion_rate": 75.0,
  "daily": [
    { "day_name": "Lunes", "date": "2026-11-09", "minutes": 45 },
    { "day_name": "Miércoles", "date": "2026-11-11", "minutes": 60 }
  ],
  "goals": [
    {
      "goal_id": 2,
      "goal_title": "Docker y Despliegue",
      "minutes_spent": 105,
      "completed_activities": 2
    }
  ]
}
```

#### Alertas de Retraso de Objetivos (HU-25)
- **Ruta:** `GET /goals/delay-alerts`
- **Autenticación:** Bearer Token
- **Respuesta (`200 OK`):**
```json
[
  {
    "goal_id": 2,
    "goal_title": "Docker y Despliegue",
    "is_delayed": true,
    "delay_minutes": 45,
    "delay_percentage": 18.5,
    "alert_message": "Tienes un posible retraso de 45 minutos respecto a tu plan."
  }
]
```

#### Pausar Objetivo (HU-32)
- **Ruta:** `PATCH /goals/:id/pause`
- **Autenticación:** Bearer Token
- **Respuesta (`200 OK`):**
```json
{
  "message": "Objetivo pausado exitosamente",
  "goal_id": 1,
  "status": "paused"
}
```

#### Reanudar Objetivo (HU-33)
- **Ruta:** `PATCH /goals/:id/resume`
- **Autenticación:** Bearer Token
- **Respuesta (`200 OK`):**
```json
{
  "message": "Objetivo reanudado exitosamente",
  "goal_id": 1,
  "status": "in_progress"
}
```

#### Archivar Objetivo (HU-46)
- **Ruta:** `PATCH /goals/:id/archive`
- **Autenticación:** Bearer Token
- **Respuesta (`200 OK`):**
```json
{
  "message": "Objetivo archivado exitosamente",
  "goal_id": 1,
  "status": "archived"
}
```

#### Modificar Fecha Límite (HU-34)
- **Ruta:** `PATCH /goals/:id/due-date`
- **Autenticación:** Bearer Token
- **Body:**
```json
{
  "target_completion_date": "2026-12-15"
}
```
- **Respuesta (`200 OK`):**
```json
{
  "message": "Fecha límite modificada exitosamente",
  "goal_id": 1,
  "target_completion_date": "2026-12-15"
}
```

#### Modificar Prioridad de Objetivo (HU-45)
- **Ruta:** `PATCH /goals/:id/priority`
- **Autenticación:** Bearer Token
- **Body:**
```json
{
  "priority": "high"
}
```
- **Respuesta (`200 OK`):**
```json
{
  "message": "Prioridad actualizada exitosamente",
  "goal_id": 1,
  "priority": "high"
}
```

---

### Sprint 5: Diagnóstico, Replanificación Adaptativa y Aprendizaje

#### Recomendaciones Personalizadas de Inicio (HU-43)
- **Ruta:** `GET /goals/personalized-recommendations`
- **Autenticación:** Bearer Token
- **Respuesta (`200 OK`):**
```json
{
  "goal_id": 11,
  "goal_title": "Docker y Despliegue",
  "activity_title": "Leer documentación oficial de TypeORM y Migraciones",
  "max_days_late": 2,
  "alert_level": "warning",
  "alert_message": "Una actividad lleva 2 días de retraso",
  "why_suggested": "La actividad no pudo completarse en la fecha estimada.",
  "solution_focus": "Dar más espacio al aprendizaje",
  "solutions": [
    "Conservar las actividades completadas.",
    "Añadir un recurso breve sobre migraciones.",
    "Reprogramar para el fin de semana."
  ],
  "metrics": {
    "progress_percentage": 25,
    "completed_activities": 3,
    "total_activities": 8,
    "available_hours_weekly": 4
  },
  "recommended_actions": [
    "Recuperar el ritmo manteniendo sesiones de máximo 60 minutos."
  ]
}
```

#### Diagnóstico y Recomendación de Objetivo (HU-04, HU-26, HU-30)
- **Ruta:** `GET /goals/:id/recommendations`
- **Autenticación:** Bearer Token
- **Respuesta (`200 OK`):** Mismo esquema detallado de `RecommendationDiagnostic`.

#### Comparar Propuestas de Replanificación (HU-27, HU-28, HU-29, HU-51)
- **Ruta:** `GET /goals/:id/alternatives`
- **Autenticación:** Bearer Token
- **Respuesta (`200 OK`):**
```json
{
  "goal_id": 11,
  "goal_title": "Docker y Despliegue",
  "completed_count": 3,
  "recorded_hours": 3,
  "progress_percentage": 25,
  "alternatives": [
    {
      "proposal_type": "balanced",
      "title": "Equilibrada",
      "tagline": "Redistribuir esta semana",
      "recommended": true,
      "description": "Mueve 2 actividades y mantiene la fecha límite.",
      "session_info": "3 sesiones · máx. 60 min",
      "changes": ["Ajustar próxima sesión", "Mantener fecha"],
      "impact": "Aprovecha tu disponibilidad sin cambiar fecha de cierre."
    },
    {
      "proposal_type": "learning",
      "title": "Más aprendizaje",
      "tagline": "Añadir refuerzo guiado",
      "recommended": false,
      "description": "Agrega 2 recursos y desplaza la práctica 3 días.",
      "session_info": "4 sesiones · Incluye refuerzo",
      "changes": ["+ 2 recursos", "Refuerzo"],
      "impact": "Ideal para afianzar conceptos clave."
    },
    {
      "proposal_type": "time",
      "title": "Más tiempo",
      "tagline": "Extender fecha límite",
      "recommended": false,
      "description": "Reduce la carga semanal y extiende el plazo 2 semanas.",
      "session_info": "2 sesiones · máx. 45 min",
      "changes": ["Extensión +14 días", "- 1 sesión/sem"],
      "impact": "Distribuye mejor el esfuerzo diario."
    }
  ]
}
```

#### Aplicar Propuesta de Replanificación (HU-08, HU-31, HU-52)
- **Ruta:** `POST /goals/:id/alternatives/apply`
- **Autenticación:** Bearer Token
- **Body:**
```json
{
  "proposal_type": "balanced"
}
```
- **Respuesta (`200 OK`):**
```json
{
  "message": "Propuesta de replanificación aplicada exitosamente",
  "proposal_type": "balanced",
  "goal_id": 11
}
```

#### Rechazar Propuesta de Replanificación (HU-31)
- **Ruta:** `POST /goals/:id/alternatives/reject`
- **Autenticación:** Bearer Token
- **Respuesta (`200 OK`):**
```json
{
  "message": "Propuesta rechazada. Se conserva la planificación original.",
  "status": "rejected",
  "goal_id": 11
}
```

#### Consultar Conocimientos Requeridos (HU-37)
- **Ruta:** `GET /goals/:id/knowledge`
- **Autenticación:** Bearer Token
- **Respuesta (`200 OK`):**
```json
{
  "goal_id": 11,
  "goal_title": "Docker y Despliegue",
  "dominant_count": 2,
  "total_concepts": 5,
  "progress_percentage": 40,
  "topics": [
    { "name": "Contenedores vs VMs", "status": "completed" },
    { "name": "Dockerfile e Imágenes", "status": "completed" },
    { "name": "Docker Compose", "status": "current" },
    { "name": "Volúmenes y Redes", "status": "pending" },
    { "name": "Despliegue Cloud", "status": "pending" }
  ],
  "current_concept": {
    "title": "Docker Compose",
    "description": "Orquestación de servicios locales multicontenedor.",
    "mastery_percentage": 50
  }
}
```

#### Recursos de Aprendizaje del Objetivo (HU-05, HU-38)
- **Ruta:** `GET /goals/:id/resources`
- **Autenticación:** Bearer Token
- **Respuesta (`200 OK`):**
```json
[
  {
    "id": "1",
    "type": "LECTURA",
    "duration": "3 min",
    "title": "Guía básica de Docker Compose",
    "category": "Orquestación",
    "badge_text": "Esencial",
    "icon_name": "book-open"
  },
  {
    "id": "2",
    "type": "VÍDEO",
    "duration": "12 min",
    "title": "Cómo enlazar contenedores y volúmenes",
    "category": "Práctica",
    "badge_text": "Recomendado",
    "icon_name": "play"
  }
]
```

#### Obtener Cuestionario de Evaluación Diagnóstica (HU-40)
- **Ruta:** `GET /goals/:id/evaluation`
- **Autenticación:** Bearer Token
- **Respuesta (`200 OK`):**
```json
[
  {
    "id": 1,
    "category": "DOCKER",
    "question": "¿Para qué sirve un volumen en Docker?",
    "options": [
      { "key": "A", "text": "Para persistir datos fuera del ciclo de vida del contenedor", "is_correct": true },
      { "key": "B", "text": "Para aumentar la memoria RAM", "is_correct": false },
      { "key": "C", "text": "Para compilar el código fuente", "is_correct": false }
    ],
    "explanation": "Los volúmenes permiten almacenar y persistir información de manera independiente al contenedor."
  }
]
```

#### Calificar Evaluación y Detectar Debilidades (HU-40, HU-41)
- **Ruta:** `POST /goals/:id/evaluation/submit`
- **Autenticación:** Bearer Token
- **Body:**
```json
{
  "answers": [
    { "question_id": 1, "selected_option_id": "A" }
  ]
}
```
- **Respuesta (`200 OK`):**
```json
{
  "goal_id": 11,
  "score": 1,
  "total_questions": 1,
  "percentage": 100,
  "weak_topics": [],
  "reinforcement_recommendations": []
}
```

#### Agregar Actividad de Aprendizaje de Refuerzo (HU-42, HU-39)
- **Ruta:** `POST /goals/:id/reinforcement`
- **Autenticación:** Bearer Token
- **Body:**
```json
{
  "topic": "Volúmenes y persistencia",
  "title": "Refuerzo guiado: Volúmenes en Docker",
  "estimated_minutes": 30
}
```
- **Respuesta (`201 Created`):**
```json
{
  "message": "Actividad de refuerzo añadida exitosamente al plan",
  "activity": {
    "activity_id": 201,
    "title": "Refuerzo guiado: Volúmenes en Docker",
    "type": "reinforcement",
    "origin": "ai_adjustment",
    "estimated_minutes": 30,
    "status": "pending"
  }
}
```

#### Sugerencias ante Dificultad en Actividad (HU-26)
- **Ruta:** `GET /activities/:id/suggestions`
- **Autenticación:** Bearer Token
- **Respuesta (`200 OK`):**
```json
{
  "activity_id": 105,
  "activity_title": "Leer documentación oficial de TypeORM",
  "goal_id": 11,
  "goal_title": "Docker y Despliegue",
  "difficulty_detected": "[Dificultad con la actividad] Me costó entender la configuración",
  "suggestion": "Divide la sesión en dos bloques de 20 minutos y apóyate en el tutorial introductorio.",
  "alternative_actions": [
    "Consultar lectura o video introductorio de 5 minutos.",
    "Reducir la complejidad del ejercicio inicial.",
    "Reprogramar la sesión para tu franja de mayor concentración."
  ]
}
```

#### Recursos de Aprendizaje Asociados a una Actividad (HU-38)
- **Ruta:** `GET /activities/:id/resources`
- **Autenticación:** Bearer Token
- **Respuesta (`200 OK`):**
```json
{
  "activity_id": 105,
  "activity_title": "Leer documentación oficial de TypeORM",
  "goal_id": 11,
  "goal_title": "Docker y Despliegue",
  "resources": [
    {
      "id": "1",
      "type": "LECTURA",
      "duration": "5 min",
      "title": "Configuración paso a paso de TypeORM",
      "category": "Documentación",
      "badge_text": "Esencial",
      "icon_name": "book-open"
    }
  ]
}
```
