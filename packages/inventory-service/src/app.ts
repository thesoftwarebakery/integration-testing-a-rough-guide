import express, { type Express } from 'express';
import type { Db } from 'mongodb';
import { createProductRoutes } from './routes/products.js';

// App factory: accepts dependencies, returns a configured Express app.
// Tests call createApp({ db }) with a testcontainer-backed DB — no mocking needed
// for the DB itself because we use the real thing.
export function createApp(deps: { db: Db }): Express {
  const app = express();
  app.use(express.json());
  app.use('/products', createProductRoutes(deps.db));
  return app;
}
