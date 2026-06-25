import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setup, type TestContext } from './helpers.js';
import type { ProductDoc } from '../src/types.js';

// These tests hit a real MongoDB container via testcontainers.
// No HTTP mocking needed — inventory-service is a leaf with no outbound calls.
// Real DB, real app, no fakes.

describe('GET /products/:id', () => {
  let ctx: TestContext;
  let teardown: () => Promise<void>;

  beforeAll(async () => {
    ({ ctx, teardown } = await setup());
    // Seed directly into the isolated MongoDB — bypasses HTTP, tests the DB directly
    await ctx.db.collection<ProductDoc>('products').insertMany([
      { _id: 'prod-1', name: 'Widget A', stock: 100, price: 9.99 },
      { _id: 'prod-2', name: 'Widget B', stock: 0, price: 24.99 },
    ]);
  });

  afterAll(() => teardown());

  it('returns a product with its current stock level', async () => {
    const res = await fetch(`${ctx.baseUrl}/products/prod-1`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: 'prod-1', name: 'Widget A', stock: 100, price: 9.99 });
  });

  it('returns 404 for unknown product', async () => {
    const res = await fetch(`${ctx.baseUrl}/products/does-not-exist`);
    expect(res.status).toBe(404);
  });
});

describe('PUT /products/:id/stock', () => {
  let ctx: TestContext;
  let teardown: () => Promise<void>;

  beforeAll(async () => {
    ({ ctx, teardown } = await setup());
    await ctx.db.collection<ProductDoc>('products').insertOne({ _id: 'prod-1', name: 'Widget A', stock: 10, price: 9.99 });
  });

  afterAll(() => teardown());

  it('updates stock and returns the updated product', async () => {
    const res = await fetch(`${ctx.baseUrl}/products/prod-1/stock`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stock: 42 }),
    });

    expect(res.status).toBe(200);
    const product = await res.json();
    expect(product.stock).toBe(42);

    // Verify the write persisted in the real MongoDB
    const doc = await ctx.db.collection<ProductDoc>('products').findOne({ _id: 'prod-1' });
    expect(doc?.stock).toBe(42);
  });

  it('returns 404 when product does not exist', async () => {
    const res = await fetch(`${ctx.baseUrl}/products/ghost/stock`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stock: 10 }),
    });
    expect(res.status).toBe(404);
  });
});
