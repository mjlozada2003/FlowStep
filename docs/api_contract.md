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
