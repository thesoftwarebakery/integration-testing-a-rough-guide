import pg from 'pg';
import { setupServer } from 'msw/node';
import { configure, getInventoryServiceMock } from '@repo/inventory-service-sdk';
import { createApp } from '../src/app.js';
import { createServer, type Server } from 'node:http';
import { randomBytes } from 'node:crypto';

const { Pool } = pg;

type MswServer = ReturnType<typeof setupServer>;

export interface TestContext {
  pool: pg.Pool;
  baseUrl: string;
  mswServer: MswServer;
}

// Creates an isolated test environment per test file:
//   - A unique PostgreSQL database (no data bleed between test files)
//   - MSW server intercepting all outbound HTTP (inventory-service calls)
//   - The real Express app booted in-process on a random port
export async function setup(): Promise<{ ctx: TestContext; teardown: () => Promise<void> }> {
  const pgUri = process.env['POSTGRES_TEST_URI'];
  if (!pgUri) throw new Error('POSTGRES_TEST_URI not set — did globalSetup run?');

  // 1. Clone the template database (migrations already applied in globalSetup).
  //    Much faster than re-running migrations per suite — PostgreSQL copies the
  //    entire schema in a single operation. Teardown drops it entirely.
  const adminPool = new Pool({ connectionString: pgUri });
  const dbName = `test_${randomBytes(8).toString('hex')}`;
  await adminPool.query(`CREATE DATABASE "${dbName}" TEMPLATE "template_orders"`);
  await adminPool.end();

  const dbUri = pgUri.replace(/\/[^/]*$/, `/${dbName}`);
  const pool = new Pool({ connectionString: dbUri });

  // 2. Start MSW to intercept all outbound HTTP calls.
  //    Spin containers up BEFORE registering MSW — MSW can inadvertently intercept
  //    Docker socket traffic if started too early 
  //    getInventoryServiceMock() returns all Orval-generated handlers with faker defaults.
  const mswServer = setupServer(...getInventoryServiceMock());
  // 'bypass' = unhandled requests (e.g. the test's own fetch to localhost) pass through
  // silently. Requests with a handler (inventory.test) are still intercepted as expected.
  mswServer.listen({ onUnhandledRequest: 'bypass' });

  // 3. Point the generated SDK at a fake host — MSW intercepts every call to it.
  //    The generated handlers match '*/products/:id' (any origin), so any URL works here.
  configure('http://inventory.test');

  // 4. Boot the real app in-process on a random port.
  const app = createApp({ db: pool });
  const server: Server = await new Promise((resolve) => {
    const s = createServer(app);
    s.listen(0, () => resolve(s));
  });
  const { port } = server.address() as { port: number };

  return {
    ctx: { pool, baseUrl: `http://localhost:${port}`, mswServer },
    teardown: async () => {
      mswServer.close();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await pool.end();
      const cleanup = new Pool({ connectionString: pgUri });
      await cleanup.query(`DROP DATABASE IF EXISTS "${dbName}"`);
      await cleanup.end();
    },
  };
}
