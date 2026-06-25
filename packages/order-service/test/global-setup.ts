import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import pg from 'pg';
import { runMigrations } from '../src/db.js';

const { Pool } = pg;

let container: StartedPostgreSqlContainer;

// Starts a single PostgreSQL container for the entire test run, then creates
// a template database with migrations already applied. Each test suite clones
// this template — much faster than re-running migrations per suite.
export async function setup() {
  container = await new PostgreSqlContainer('postgres:16-alpine').start();

  const pgUri = container.getConnectionUri();
  const templatePool = new Pool({ connectionString: pgUri });

  await templatePool.query('CREATE DATABASE "template_orders"');
  await templatePool.end();

  const templateUri = pgUri.replace(/\/[^/]*$/, '/template_orders');
  const migrationPool = new Pool({ connectionString: templateUri });
  await runMigrations(migrationPool);
  await migrationPool.end();

  process.env['POSTGRES_TEST_URI'] = pgUri;
}

export async function teardown() {
  await container?.stop();
}
