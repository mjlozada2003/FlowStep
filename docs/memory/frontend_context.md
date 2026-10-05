# Contexto del Frontend (Mobile): FlowStep

## Tecnologías Principales
- **Framework:** React Native (utilizando Expo)
- **Lenguaje:** TypeScript
- **Enrutamiento:** Expo Router (Basado en el sistema de archivos `src/app`)

## Arquitectura: Arquitectura Limpia (Clean Architecture)
Para asegurar un código escalable, mantenible y testeable, la aplicación móvil adoptará los principios de Clean Architecture. Esto implica desacoplar la interfaz de usuario de la lógica de negocio y el acceso a datos.

Se organizará en las siguientes capas lógicas dentro de `src/`:

1. **Capa de Presentación (UI & Controllers):**
   - **Screens (`src/app`):** Pantallas principales gestionadas por Expo Router.
   - **Components (`src/components`):** Componentes visuales reutilizables (UI, animaciones).
   - **Hooks/View Models:** Lógica de presentación y gestión del estado local (ej. Zustand, React Context o hooks personalizados) para mantener las vistas libres de lógica compleja.

2. **Capa de Dominio (Use Cases & Entities):**
   - **Entities (`src/domain/entities` o `src/models`):** Definición estricta de las interfaces y tipos (ej. `Goal`, `Activity`, `User`) que reflejan el modelo del negocio y son independientes de frameworks.
   - **Use Cases:** Lógica de negocio específica del cliente, como cálculos simples para mostrar progreso o preparación de datos antes de enviar a la API.

3. **Capa de Infraestructura / Datos:**
   - **Repositories:** Implementación de interfaces de dominio para gestionar de dónde provienen los datos.
   - **Data Sources (`src/api` / `src/services`):** Clientes HTTP (ej. Axios o fetch) encargados de realizar las peticiones a la API REST del backend de NestJS.
   - **Local Storage:** Gestión de almacenamiento local (ej. AsyncStorage o SecureStore para guardar el JWT).

## Responsabilidades Clave
- Proveer una interfaz conversacional e intuitiva para el usuario.
- Gestionar la autenticación (guardado del JWT).
- Enviar solicitudes (stateless) al backend para operaciones complejas y peticiones de IA.
- Mostrar visualmente el progreso, planes y notificaciones sin realizar procesamiento pesado.
