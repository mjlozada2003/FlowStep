# Resumen Contextual del Backend - Sprint 1 (FlowStep)

Este documento resume el progreso, decisiones arquitectónicas y módulos desarrollados para el backend de FlowStep durante el primer Sprint de desarrollo.

## 1. Arquitectura y Stack Tecnológico
- **Framework:** NestJS (Node.js) configurado bajo una arquitectura monolítica por capas (Controladores, Servicios, Repositorios).
- **Base de Datos:** PostgreSQL corriendo vía Docker (`docker-compose.yml`).
- **ORM:** TypeORM configurado con `synchronize: true` (para fase de desarrollo local), mapeando rigurosamente el diseño de base de datos DBML proporcionado (tipos de datos, longitudes, llaves primarias auto-incrementales enteras).
- **Inteligencia Artificial:** SDK Oficial de Google Gen AI (`@google/genai`) usando el modelo `gemini-3.5-flash` para la planificación automática.

## 2. Historias de Usuario Completadas

### Seguridad y Cuentas de Usuario
- **HU53 - Registrarse:**
  - **Módulo:** `UsersModule`
  - Se creó la entidad `APP_USER` y su DTO con validaciones (`class-validator`).
  - Las contraseñas se almacenan cifradas utilizando la librería `bcrypt`.
- **HU54 - Iniciar sesión:**
  - **Módulo:** `AuthModule`
  - Se implementó la autenticación con JWT (`@nestjs/jwt`, `passport-jwt`).
  - El token extrae las variables de entorno de forma segura usando `ConfigModule` de NestJS.
  - Se creó un `JwtAuthGuard` para proteger las rutas privadas.

### Gestión de Metas e Inteligencia Artificial
- **HU-01 - Registrar objetivo:**
  - **Módulo:** `GoalsModule`
  - Se creó la entidad `GOAL` relacionándola (`ManyToOne` con `ON DELETE CASCADE`) a `APP_USER`.
  - El endpoint `POST /goals` guarda el objetivo ingresado por el usuario usando el ID extraído de su token JWT.
- **HU-02 - Generar plan personalizado & HU-09 - Dividir en etapas:**
  - **Módulo:** `AiModule`
  - El servicio de metas invoca internamente al `AiService` pasándole el título y descripción de la meta.
  - Gemini procesa el requerimiento actuando como planificador y devuelve un JSON estricto con las Etapas (`STAGE`) y Actividades (`ACTIVITY`).
  - El backend guarda todo el árbol estructurado en la base de datos automáticamente.

### Seguimiento de Tareas
- **HU-10 - Consultar actividades por etapa:**
  - **Módulo:** `StagesModule`
  - Se desarrolló el endpoint `GET /stages/:id/activities` para devolver la lista ordenada de actividades asociadas a una etapa específica.
- **HU-15 - Completar actividad:**
  - **Módulo:** `ActivitiesModule`
  - Se desarrolló el endpoint `PATCH /activities/:id/complete` que cambia el `status` de la actividad a `completed` y almacena el `completed_at` exacto.
- **HU-03 - Registrar progreso:**
  - Desde el punto de vista del código de backend, se dejó preparada la actualización de estados de las actividades.
  - *Nota técnica:* El cálculo matemático del progreso de la meta quedará delegado a las Vistas de Base de Datos (ej. `V_GOAL_PROGRESS`), siguiendo la restricción de arquitectura definida ("Derived data is NOT stored: it is computed with views").

## 3. Variables de Entorno (.env)
Se dejó configurado un archivo `.env` (excluido en `.gitignore`) con las siguientes llaves clave:
- Variables de PostgreSQL (`DB_HOST`, `DB_PASSWORD`, etc.)
- `JWT_SECRET` para firmar los tokens de sesión.
- `GEMINI_API_KEY` conectada a la infraestructura de Google Cloud (con soporte para llaves `AQ...` modernas de la familia Gemini 3.x).

## 4. Estado Final del Repositorio
Todos estos avances se encuentran guardados en la rama de control de versiones `feature/backend`. El servidor Node.js y los servicios de base de datos responden de forma exitosa y están listos para integrarse con la UI del Frontend en el Sprint 2.
