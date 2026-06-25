import { Router, type Router as RouterType } from 'express';
import type pg from 'pg';
// The generated client is typed directly from the OpenAPI spec.
// If inventory-service changes its API, this import breaks at compile time —
// that's how you detect integration failures before they reach production.
import { getInventoryService } from '@repo/inventory-service-sdk';

// Instantiate once — the underlying axios instance is shared across requests.
// configure() in server.ts / test helpers sets the base URL on that instance.
const inventoryService = getInventoryService();

export function createOrderRoutes(deps: { db: pg.Pool }): RouterType {
  const router = Router();

  router.get('/', async (req, res) => {
    const status = req.query['status'] as string | undefined;

    let query = 'SELECT * FROM orders';
    const params: string[] = [];

    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const { rows } = await deps.db.query<{
      id: string; product_id: string; quantity: number; status: string; created_at: string;
    }>(query, params);

    return res.json(rows.map(row => ({
      id: row.id,
      productId: row.product_id,
      quantity: row.quantity,
      status: row.status,
      createdAt: row.created_at,
    })));
  });

  // POST /orders — the key integration point in this demo:
  //   1. Calls inventory-service via generated SDK (real HTTP in prod, intercepted by MSW in tests)
  //   2. Writes to PostgreSQL (real DB via testcontainers in tests)
  router.post('/', async (req, res) => {
    const { productId, quantity } = req.body as { productId: string; quantity: number };

    // axios throws AxiosError on non-2xx — no manual status check needed.
    // response.data is typed as Product directly from the OpenAPI schema.
    const { data: product } = await inventoryService.getProduct(productId);

    if (product.stock < quantity) {
      return res.status(400).json({ message: 'Insufficient stock' });
    }

    const { rows } = await deps.db.query<{
      id: string; product_id: string; quantity: number; status: string; created_at: string;
    }>(
      `INSERT INTO orders (product_id, quantity, status)
       VALUES ($1, $2, 'confirmed') RETURNING *`,
      [productId, quantity]
    );

    const row = rows[0]!;
    return res.status(201).json({
      id: row.id,
      productId: row.product_id,
      quantity: row.quantity,
      status: row.status,
      createdAt: row.created_at,
    });
  });

  router.get('/:id', async (req, res) => {
    const { rows } = await deps.db.query<{
      id: string; product_id: string; quantity: number; status: string; created_at: string;
    }>('SELECT * FROM orders WHERE id = $1', [req.params['id']]);

    if (!rows[0]) return res.status(404).json({ message: 'Order not found' });

    const row = rows[0];
    return res.json({
      id: row.id,
      productId: row.product_id,
      quantity: row.quantity,
      status: row.status,
      createdAt: row.created_at,
    });
  });

  return router;
}
