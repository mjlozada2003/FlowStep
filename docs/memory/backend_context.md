# Contexto del Backend: FlowStep

## Tecnologías Principales
- **Framework:** NestJS
- **Lenguaje:** TypeScript
- **Base de Datos:** PostgreSQL
- **ORM:** TypeORM
- **Autenticación:** JWT (JSON Web Tokens)
- **IA:** Integración con API de Gemini

## Arquitectura: Monolítico por Capas
El backend está estructurado como un monolito organizado por capas para asegurar la separación de responsabilidades:

1. **Capa de Presentación (Controllers):** 
   - Se encarga de recibir las peticiones HTTP (REST API) desde la aplicación móvil.
   - Valida los datos de entrada (DTOs).
   - Retorna las respuestas en formato JSON.

2. **Capa de Aplicación (Services):**
   - Coordina los flujos de trabajo.
   - Orquesta la comunicación entre los repositorios, la lógica de dominio y los servicios externos (como el servicio de IA de Gemini).
   - Prepara los prompts y procesa las respuestas del LLM antes de entregarlas a la presentación o guardarlas en base de datos.

3. **Capa de Dominio:**
   - Contiene las reglas de negocio puras.
   - Define las entidades y modelos principales del sistema (Metas, Actividades, Recomendaciones de IA).

4. **Capa de Infraestructura (Repositories / TypeORM):**
   - Maneja la persistencia de datos utilizando TypeORM y PostgreSQL.
   - Se encarga de la comunicación directa con la base de datos (queries, transacciones) manteniendo el resto del sistema agnóstico a la tecnología de base de datos específica.

## Responsabilidades Clave
- Procesar de forma centralizada la lógica de generación de planes.
- Comunicarse de forma segura con la API de Gemini (las credenciales nunca llegan al frontend).
- Mantener la persistencia del estado (auditorías, historial de actividades).
- Proveer una API REST stateless.
