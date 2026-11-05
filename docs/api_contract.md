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
