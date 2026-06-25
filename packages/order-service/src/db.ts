import pg from 'pg';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));

export async function createPool(connectionString: string) {
  const pool = new Pool({ connectionString });
  return pool;
}

export async function runMigrations(pool: pg.Pool) {
  const sql = readFileSync(join(__dirname, '../migrations/001_create_orders.sql'), 'utf-8');
  await pool.query(sql);
}
