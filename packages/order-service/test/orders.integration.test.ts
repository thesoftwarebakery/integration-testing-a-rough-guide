import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setup, type TestContext } from './helpers.js';

// Each test here exercises the full integration:
//   - Real PostgreSQL via testcontainers
//   - Express app booted in-process
//   - inventory-service intercepted by MSW
//
// This lets us assert on HTTP responses, database state, AND business logic
// all within a single test — fast, granular, no process management.

describe('POST /orders', () => {
  let ctx: TestContext;
  let teardown: () => Promise<void>;

  beforeAll(async () => {
    ({ ctx, teardown } = await setup());
  });

  // Reset MSW to default handlers between tests so overrides don't bleed through.
  // This is the most common gotcha with MSW — forgetting this leads to subtle test
  // ordering bugs (see blog post: "MSW handler leakage").
  afterEach(() => {
    ctx.mswServer.resetHandlers();
  });

  afterAll(() => teardown());

  it('creates an order when stock is sufficient', async () => {
    // Arrange — MSW returns a product with plenty of stock.
    // The default handler (from the generated SDK) returns a faker-based product,
    // but we override here to be explicit about what the test depends on.
    ctx.mswServer.use(
      http.get('http://inventory.test/products/:id', () =>
        HttpResponse.json({ id: 'prod-1', name: 'Widget A', stock: 10, price: 9.99 })
      )
    );

    // Act — hit the real app server over HTTP
    const res = await fetch(`${ctx.baseUrl}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: 'prod-1', quantity: 2 }),
    });

    expect(res.status).toBe(201);
    const order = await res.json();
    expect(order).toMatchObject({ productId: 'prod-1', quantity: 2, status: 'confirmed' });
    expect(order.id).toBeTruthy();

    // Assert DB state — the order must exist in the real PostgreSQL DB
    const { rows } = await ctx.pool.query('SELECT * FROM orders WHERE id = $1', [order.id]);
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('confirmed');
  });

  it('rejects the order when stock is insufficient', async () => {
    // Arrange — inventory returns a product with zero stock.
    // Use a distinct productId so DB assertions are isolated from other tests in this suite.
    ctx.mswServer.use(
      http.get('http://inventory.test/products/:id', () =>
        HttpResponse.json({ id: 'prod-out-of-stock', name: 'Widget B', stock: 0, price: 9.99 })
      )
    );

    const res = await fetch(`${ctx.baseUrl}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: 'prod-out-of-stock', quantity: 1 }),
    });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ message: 'Insufficient stock' });

    // Assert no order was written for this productId
    const { rows } = await ctx.pool.query(
      'SELECT count(*) FROM orders WHERE product_id = $1',
      ['prod-out-of-stock']
    );
    expect(Number(rows[0].count)).toBe(0);
  });
});

describe('GET /orders/:id', () => {
  let ctx: TestContext;
  let teardown: () => Promise<void>;

  beforeAll(async () => {
    ({ ctx, teardown } = await setup());
  });

  afterAll(() => teardown());

  it('retrieves an existing order', async () => {
    // Seed an order directly into the DB — no need to go through the POST endpoint
    const { rows } = await ctx.pool.query<{ id: string }>(
      `INSERT INTO orders (product_id, quantity, status) VALUES ('prod-2', 3, 'confirmed') RETURNING id`
    );
    const orderId = rows[0]!.id;

    const res = await fetch(`${ctx.baseUrl}/orders/${orderId}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ id: orderId, productId: 'prod-2', quantity: 3 });
  });

  it('returns 404 for unknown order', async () => {
    const res = await fetch(`${ctx.baseUrl}/orders/00000000-0000-0000-0000-000000000000`);
    expect(res.status).toBe(404);
  });
});
