import { MongoClient, type Db } from 'mongodb';
import { createApp } from '../src/app.js';
import { createServer, type Server } from 'node:http';

export interface TestContext {
  db: Db;
  baseUrl: string;
}

// Creates an isolated test environment per test file:
//   - A unique MongoDB database (no data bleed between test files)
//   - The real app booted in-process on a random port
//
// Returns a teardown function — call it in afterAll().
export async function setup(): Promise<{ ctx: TestContext; teardown: () => Promise<void> }> {
  const mongoUri = process.env['MONGODB_TEST_URI'];
  if (!mongoUri) throw new Error('MONGODB_TEST_URI not set — did globalSetup run?');

  // Each test file gets its own database within the shared container.
  // Unique name prevents concurrent test files from stepping on each other.
  const dbName = `test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db(dbName);

  // Boot the real Express app in-process. No network hop, no process management —
  // just a server listening on a random OS-assigned port.
  const app = createApp({ db });
  const server: Server = await new Promise((resolve) => {
    const s = createServer(app);
    s.listen(0, () => resolve(s));
  });
  const { port } = server.address() as { port: number };

  return {
    ctx: { db, baseUrl: `http://localhost:${port}` },
    teardown: async () => {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await client.db(dbName).dropDatabase();
      await client.close();
    },
  };
}
