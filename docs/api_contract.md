# Contrato de Comunicación de la API (FlowStep Backend - Sprints 1 y 2)

Este documento define las rutas, modelos de datos, formatos de entrada y respuesta de la API REST de FlowStep para la integración con la aplicación móvil y el consumo mediante Swagger / OpenAPI.

---

## 1. Información General y Acceso

- **Entorno Local:** `http://localhost:3000`
- **Documentación Interactiva (Swagger UI):** `http://localhost:3000/api/docs`
- **Dispositivo Físico (Expo Go):** `http://<TU_IP_LOCAL>:3000` (ambos dispositivos en la misma red Wi-Fi)

---

## 2. Convenciones Globales y Autenticación

### Cabecera de Autorización
Los endpoints protegidos requieren el token JWT obtenido tras iniciar sesión:
```http
Authorization: Bearer <access_token>
```

### Estructura Estándar de Errores
```json
{
  "statusCode": 400,
  "message": [
    "La prioridad debe ser high, medium o low"
  ],
  "error": "Bad Request"
}
```

---

## 3. Catálogo de Endpoints

### 3.1 Módulo: Autenticación y Usuarios

#### Registrar Usuario (HU-53)
- **Ruta:** `POST /users/register`
- **Autenticación:** Pública
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
  ]
}
```

#### Consultar Disponibilidad Semanal
- **Ruta:** `GET /availability`
- **Autenticación:** Bearer Token

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
