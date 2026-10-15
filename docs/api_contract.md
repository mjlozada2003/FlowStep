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
    "El formato del correo es inválido",
    "La contraseña debe tener al menos 6 caracteres"
  ],
  "error": "Bad Request"
}
```

---

## 3. Endpoints de la API

### Módulo: Autenticación y Usuarios

#### 3.1 Registrar Usuario
- **Ruta:** `POST /users/register`
- **Historia de Usuario:** HU-53
- **Autenticación:** Pública (No requiere token)
- **Cuerpo de la Petición (`Request Body`):**
```json
{
  "name": "Juan Pérez",
  "email": "juan.perez@example.com",
  "password": "Password123!"
}
```
- **Respuesta Exitosa (`201 Created`):**
```json
{
  "message": "Usuario registrado exitosamente",
  "user": {
    "user_id": 1,
    "name": "Juan Pérez",
    "email": "juan.perez@example.com",
    "created_at": "2026-10-15T12:00:00.000Z"
  }
}
```
- **Códigos de Error:**
  - `400 Bad Request`: Formato de correo incorrecto, contraseña corta o el correo ya se encuentra en uso.

---

#### 3.2 Iniciar Sesión
- **Ruta:** `POST /auth/login`
- **Historia de Usuario:** HU-54
- **Autenticación:** Pública (No requiere token)
- **Cuerpo de la Petición (`Request Body`):**
```json
{
  "email": "juan.perez@example.com",
  "password": "Password123!"
}
```
- **Respuesta Exitosa (`200 OK`):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "user_id": 1,
    "name": "Juan Pérez",
    "email": "juan.perez@example.com"
  }
}
```
- **Códigos de Error:**
  - `401 Unauthorized`: "Credenciales inválidas" (correo o contraseña no coinciden).

---

### Módulo: Objetivos (Goals)

#### 3.3 Registrar Objetivo y Generar Plan con IA
- **Ruta:** `POST /goals`
- **Historias de Usuario:** HU-01, HU-02, HU-09
- **Autenticación:** Requiere `Bearer Token`
- **Cuerpo de la Petición (`Request Body`):**
```json
{
  "title": "Aprender Francés Básico",
  "user_description": "Quiero aprender frases esenciales para viajar y comunicarme en tiendas y hoteles.",
  "due_date": "2026-12-31",
  "priority": "medium"
}
```
*Campos opcionales:* `due_date` (YYYY-MM-DD), `priority` (`"high"` | `"medium"` | `"low"`, por defecto `"medium"`).

- **Respuesta Exitosa (`201 Created`):**
> **Nota:** La respuesta incluye el objetivo guardado junto con la estructura de etapas y actividades desglosadas por la Inteligencia Artificial (Gemini).
```json
{
  "goal_id": 1,
  "user_id": 1,
  "title": "Aprender Francés Básico",
  "user_description": "Quiero aprender frases esenciales para viajar y comunicarme en tiendas y hoteles.",
  "start_date": "2026-10-15",
  "due_date": "2026-12-31",
  "priority": "medium",
  "status": "active",
  "created_at": "2026-10-15T12:05:00.000Z",
  "stages": [
    {
      "stage_id": 1,
      "goal_id": 1,
      "name": "Etapa 1: Fundamentos y Saludos",
      "description": "Bases de pronunciación y vocabulario básico.",
      "sort_order": 1,
      "activities": [
        {
          "activity_id": 1,
          "stage_id": 1,
          "title": "Aprender el alfabeto y sonidos vocálicos",
          "type": "learning",
          "priority": "medium",
          "status": "pending",
          "estimated_minutes": 30,
          "sort_order": 1,
          "origin": "initial_plan"
        },
        {
          "activity_id": 2,
          "stage_id": 1,
          "title": "Practicar saludos y despedidas básicas",
          "type": "practice",
          "priority": "medium",
          "status": "pending",
          "estimated_minutes": 20,
          "sort_order": 2,
          "origin": "initial_plan"
        }
      ]
    }
  ]
}
```

---

#### 3.4 Listar Objetivos del Usuario
- **Ruta:** `GET /goals`
- **Autenticación:** Requiere `Bearer Token`
- **Respuesta Exitosa (`200 OK`):**
```json
[
  {
    "goal_id": 1,
    "user_id": 1,
    "title": "Aprender Francés Básico",
    "user_description": "Quiero aprender frases esenciales para viajar...",
    "start_date": "2026-10-15",
    "due_date": "2026-12-31",
    "priority": "medium",
    "status": "active",
    "created_at": "2026-10-15T12:05:00.000Z"
  }
]
```

---

#### 3.5 Consultar Detalle de un Objetivo (con Etapas y Actividades)
- **Ruta:** `GET /goals/:id`
- **Autenticación:** Requiere `Bearer Token`
- **Parámetros de Ruta:** `id` (entero, ID del objetivo)
- **Respuesta Exitosa (`200 OK`):** Retorna el árbol completo de la meta con sus etapas y actividades ordenadas por `sort_order`.

---

#### 3.6 Consultar Progreso del Objetivo (Vista SQL)
- **Ruta:** `GET /goals/:id/progress`
- **Historia de Usuario:** HU-03 (Registrar y calcular progreso)
- **Autenticación:** Requiere `Bearer Token`
- **Parámetros de Ruta:** `id` (entero, ID del objetivo)
- **Respuesta Exitosa (`200 OK`):**
```json
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
```

---

### Módulo: Etapas (Stages)

#### 3.7 Consultar Actividades por Etapa
- **Ruta:** `GET /stages/:id/activities`
- **Historia de Usuario:** HU-10
- **Autenticación:** Requiere `Bearer Token`
- **Parámetros de Ruta:** `id` (entero, ID de la etapa)
- **Respuesta Exitosa (`200 OK`):**
```json
[
  {
    "activity_id": 1,
    "stage_id": 1,
    "title": "Aprender el alfabeto y sonidos vocálicos",
    "description": null,
    "type": "learning",
    "priority": "medium",
    "status": "pending",
    "estimated_minutes": 30,
    "sort_order": 1,
    "completed_at": null
  }
]
```

---

### Módulo: Actividades (Activities)

#### 3.8 Completar Actividad
- **Ruta:** `PATCH /activities/:id/complete`
- **Historia de Usuario:** HU-15
- **Autenticación:** Requiere `Bearer Token`
- **Parámetros de Ruta:** `id` (entero, ID de la actividad)
- **Respuesta Exitosa (`200 OK`):**
```json
{
  "activity_id": 1,
  "stage_id": 1,
  "title": "Aprender el alfabeto y sonidos vocálicos",
  "status": "completed",
  "completed_at": "2026-10-15T12:30:00.000Z",
  "updated_at": "2026-10-15T12:30:00.000Z"
}
```

---

## 4. Guía de Integración para el Frontend (Mobile)

Para que el equipo de frontend reemplace los datos simulados por llamadas reales, se sugiere la siguiente estructura en `mobile/src/services/api.ts`:

```typescript
// mobile/src/services/api.ts
const BASE_URL = 'http://localhost:3000'; // O tu IP local para dispositivos físicos

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Error en la petición');
  }

  return data;
}
```

### Mapeo de Pantallas a Endpoints:
| Pantalla en `mobile/src/app/` | Estado Actual | Endpoint a Conectar |
| :--- | :--- | :--- |
| `login.tsx` | Mock en `demoAuth.ts` | `POST /auth/login` |
| `register.tsx` | Mock en `demoAuth.ts` | `POST /users/register` |
| `home.tsx` | Lista vacía o estática | `GET /goals` |
| `create-goal.tsx` | Envía parámetros por URL | `POST /goals` |
| `goal-plan.tsx` | `mockStages` en memoria | `GET /goals/:id` y `PATCH /activities/:id/complete` |
