// Run once on container startup in tests to seed initial product data.
// In production, data comes from your own pipeline.
import { MongoClient } from 'mongodb';

export async function seedProducts(uri: string) {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('inventory');
  await db.collection('products').insertMany([
    { _id: 'prod-1', name: 'Widget A', stock: 100, price: 9.99 },
    { _id: 'prod-2', name: 'Widget B', stock: 5, price: 24.99 },
  ]);
  await client.close();
}
