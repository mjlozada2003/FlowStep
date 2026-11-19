-- FLOWSTEP - Ajustes para la base en la nube (Supabase u otro PostgreSQL administrado).
-- Aplicar despues de los scripts 01 a 14. Es repetible y en Docker local no cambia
-- permisos (los roles de Supabase no existen alli).
BEGIN;

-- 1. Zona horaria. Las vistas usan CURRENT_DATE; en la nube el servidor suele estar
--    en UTC, lo que adelantaria el "hoy" cuatro horas. Se fija para las nuevas
--    conexiones de esta base (equivalente al TZ/PGTZ de docker-compose).
DO $$
BEGIN
    EXECUTE format('ALTER DATABASE %I SET timezone TO %L', current_database(), 'America/La_Paz');
EXCEPTION WHEN insufficient_privilege THEN
    RAISE WARNING 'Sin permiso para fijar la zona horaria de la base; configurela desde el panel del proveedor.';
END $$;

-- 2. Supabase publica automaticamente el esquema public por su API REST con los
--    roles anon y authenticated. FlowStep solo se consulta desde el backend
--    (rol postgres), asi que se retira ese acceso y se activa RLS sin politicas:
--    el backend, duenio de las tablas, sigue leyendo y escribiendo normalmente.
DO $$
DECLARE
    tbl RECORD;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        RAISE NOTICE 'No es Supabase: no se modifican permisos.';
        RETURN;
    END IF;

    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
    REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;

    FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl.tablename);
    END LOOP;
END $$;

COMMIT;
