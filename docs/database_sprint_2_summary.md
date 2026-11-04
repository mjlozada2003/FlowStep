# Base de datos FlowStep - Sprint 2

## Alcance

HU-06, HU-07, HU-11, HU-13, HU-14, HU-16, HU-35 y HU-36, tomando como referencia el ER proporcionado y las entidades del backend integradas en `feature/bd`.

## Entregables

- `database/04_sprint2_schema.sql`: migración transaccional y aditiva para `AVAILABILITY` y `ACTIVITY_SCHEDULE`, enums compatibles con TypeORM, relaciones en cascada, índices únicos y CHECKs. Las comprobaciones también se agregan a las tablas nuevas si ya habían sido creadas por el ORM.
- `database/05_sprint2_views.sql`: minutos por franja, tiempo semanal por usuario, última programación por actividad y compatibilidad de la programación con la disponibilidad. Los datos derivados no se almacenan.
- `database/06_sprint2_seeds.sql`: demo independiente, repetible y sin IDs fijos; prioridad alta, actividad propia pendiente y tres versiones de una programación.
- `database/tests/sprint2.sql`: casos positivos y negativos de las ocho historias, progreso al editar/agregar/marcar pendiente, historial, soft delete y cascadas. Revierte sus filas.
- `database/tests/backend.integration.cjs`: integración con entidades y servicios reales, PostgreSQL y una respuesta de IA simulada. Revierte sus filas.
- Montaje de scripts en Docker Compose y sincronización de TypeORM configurable, desactivada por defecto.

## Decisiones de compatibilidad

Se conservan las tablas y vistas del Sprint 1. HU-06, HU-11, HU-13 y HU-16 reutilizan sus columnas y enums; no requieren estructuras redundantes. Se mantienen los nombres físicos de enums del backend, aunque el ER use nombres de dominio comunes.

`recommendation_id` queda opcional y sin FK hasta el sprint que implemente `AI_RECOMMENDATION`. No se implementan las demás tablas del ER fuera del alcance indicado.

Los cronogramas se insertan por versión desde el backend. La unicidad rechaza versiones duplicadas, y la vista vigente usa la versión mayor. El historial permanece ante borrado lógico; el borrado físico conserva la cascada que define el backend.

Los tiempos de cronogramas son opcionales. La comprobación contra disponibilidad es una vista, no una restricción histórica: un cambio de rutina no debe invalidar programaciones anteriores. La vista comprueba día, rango y duración de cada actividad; no detecta conflictos entre actividades ni ejecuta la adaptación con IA.

## Ejecución y validación

Consultar `database/README.md` para inicialización nueva, actualización sin eliminar volúmenes, consultas de demo y comandos de pruebas. Los scripts `04` y `05` se aplican sobre el Sprint 1; `06` es opcional en bases existentes. No se modifica automáticamente una base local ya existente como parte de la entrega.

La entrega incluye validación de TypeScript sin emitir archivos, lint del backend, sintaxis JavaScript y configuración de Compose. Las pruebas SQL y la integración con un servidor PostgreSQL quedan pendientes de ejecución: el acceso al motor de Docker fue rechazado en esta sesión. No se presentan como pruebas aprobadas.
