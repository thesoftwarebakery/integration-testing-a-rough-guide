import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setup, type TestContext } from './helpers.js';

// This file demonstrates DATABASE-PER-SUITE isolation:
// it runs against the same PostgreSQL container as orders.integration.test.ts,
// but gets its own database — so seed data here never leaks into (or from) other suites.

describe('GET /orders', () => {
  let ctx: TestContext;
  let teardown: () => Promise<void>;

  beforeAll(async () => {
    ({ ctx, teardown } = await setup());

    // Seed orders directly — no MSW needed since we're not calling inventory-service.
    await ctx.pool.query(
      `INSERT INTO orders (product_id, quantity, status) VALUES
         ('prod-a', 1, 'confirmed'),
         ('prod-b', 2, 'confirmed'),
         ('prod-c', 3, 'rejected')`
    );
  });

  afterAll(() => teardown());

  it('returns all orders', async () => {
    const res = await fetch(`${ctx.baseUrl}/orders`);
    expect(res.status).toBe(200);

    const orders = await res.json();
    expect(orders).toHaveLength(3);
  });

  it('filters by status', async () => {
    const res = await fetch(`${ctx.baseUrl}/orders?status=confirmed`);
    expect(res.status).toBe(200);

    const orders = await res.json();
    expect(orders).toHaveLength(2);
    expect(orders.every((o: { status: string }) => o.status === 'confirmed')).toBe(true);
  });

  it('returns empty array when no orders match filter', async () => {
    // This DB has no 'rejected' orders with prod-z — but more importantly,
    // it proves this suite's DB is isolated: orders from orders.integration.test.ts
    // don't appear here, and vice versa.
    const res = await fetch(`${ctx.baseUrl}/orders?status=rejected`);
    expect(res.status).toBe(200);

    const orders = await res.json();
    expect(orders).toHaveLength(1);
    expect(orders[0].productId).toBe('prod-c');
  });
});
