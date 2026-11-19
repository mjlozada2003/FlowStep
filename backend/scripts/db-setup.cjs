#!/usr/bin/env node
/*
 * Aplica los scripts de database/ en orden sobre la base configurada en .env.
 * Sirve para la base en la nube (Supabase) y tambien para una base local.
 *
 *   npm run db:setup            -> esquema y vistas (01, 02, 04, 05, 07, 09, 10, 12, 13)
 *   npm run db:setup:demo       -> lo anterior + datos de demostracion (*_seeds.sql)
 *   npm run db:setup -- --tests -> ademas ejecuta database/tests (revierten sus filas)
 *
 * Los scripts son transaccionales y repetibles: volver a ejecutarlos no duplica datos.
 * Conexion: DATABASE_URL (+ DB_SSL=true) o DB_HOST/DB_PORT/DB_USERNAME/DB_PASSWORD/DB_NAME.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const BACKEND_DIR = path.resolve(__dirname, '..');
const DATABASE_DIR = path.resolve(BACKEND_DIR, '..', 'database');
const TIMEZONE = 'America/La_Paz';

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function connectionConfig() {
  const ssl = process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false;
  if (process.env.DATABASE_URL) {
    return { connectionString: process.env.DATABASE_URL, ssl };
  }
  return {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5433', 10),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'flowstep_db',
    ssl,
  };
}

function sqlFiles(dir, { seeds }) {
  return fs
    .readdirSync(dir)
    .filter((name) => /^\d{2}_.*\.sql$/.test(name))
    .filter((name) => seeds || !/seeds\.sql$/.test(name))
    .sort()
    .map((name) => path.join(dir, name));
}

function describeTarget(config) {
  if (config.connectionString) {
    try {
      const url = new URL(config.connectionString);
      return `${url.hostname}:${url.port || 5432}${url.pathname}`;
    } catch {
      return 'DATABASE_URL';
    }
  }
  return `${config.host}:${config.port}/${config.database}`;
}

async function runFile(client, file) {
  const label = path.relative(path.resolve(DATABASE_DIR, '..'), file).replace(/\\/g, '/');
  process.stdout.write(`  ${label} ... `);
  const sql = fs.readFileSync(file, 'utf8');
  const started = Date.now();
  try {
    await client.query(sql);
  } catch (error) {
    process.stdout.write('ERROR\n');
    // Si el script fallo a mitad de su transaccion, se cierra para no arrastrarla.
    await client.query('ROLLBACK').catch(() => {});
    throw new Error(`${label}: ${error.message}`);
  }
  process.stdout.write(`ok (${Date.now() - started} ms)\n`);
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const withSeeds = args.has('--seeds');
  const withTests = args.has('--tests');

  loadEnv(path.join(BACKEND_DIR, '.env'));
  const config = connectionConfig();
  const client = new Client(config);
  client.on('notice', (notice) => {
    if (/pruebas pasaron/i.test(notice.message)) console.log(`    ${notice.message}`);
  });

  console.log(`Conectando a ${describeTarget(config)}${config.ssl ? ' (SSL)' : ''}`);
  await client.connect();
  try {
    await client.query(`SET timezone TO '${TIMEZONE}'`);

    console.log(withSeeds ? 'Aplicando esquema, vistas y datos de demostracion:' : 'Aplicando esquema y vistas:');
    for (const file of sqlFiles(DATABASE_DIR, { seeds: withSeeds })) {
      await runFile(client, file);
    }

    console.log('Configuracion de la base (zona horaria y permisos en la nube):');
    await runFile(client, path.join(DATABASE_DIR, 'cloud', 'cloud_setup.sql'));

    if (withTests) {
      console.log('Pruebas (no dejan datos):');
      const testsDir = path.join(DATABASE_DIR, 'tests');
      for (const name of fs.readdirSync(testsDir).filter((n) => n.endsWith('.sql')).sort()) {
        await runFile(client, path.join(testsDir, name));
      }
    }
    console.log('Listo.');
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`\nNo se pudo preparar la base de datos:\n  ${error.message}`);
  process.exit(1);
});
