import express, { type Express } from 'express';
import type pg from 'pg';
import { createOrderRoutes } from './routes/orders.js';

// App factory: accepts dependencies, returns a configured Express app.
// Tests call createApp({ db }) with a testcontainer-backed DB; the inventory
// client URL is configured separately via configure() from the SDK before
// calling createApp — keeping dependency injection simple and types generated.
export function createApp(deps: { db: pg.Pool }): Express {
  const app = express();
  app.use(express.json());
  app.use('/orders', createOrderRoutes(deps));
  return app;
}
