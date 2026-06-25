import { Router, type Router as RouterType } from 'express';
import type { Db } from 'mongodb';
import type { ProductDoc } from '../types.js';

function toResponse(doc: ProductDoc) {
  return { id: doc._id, name: doc.name, stock: doc.stock, price: doc.price };
}

export function createProductRoutes(db: Db): RouterType {
  const router = Router();
  // Typed with ProductDoc so MongoDB accepts string _id values
  const products = db.collection<ProductDoc>('products');

  router.get('/:id', async (req, res) => {
    const doc = await products.findOne({ _id: req.params['id'] });
    if (!doc) return res.status(404).json({ message: 'Product not found' });
    return res.json(toResponse(doc));
  });

  router.put('/:id/stock', async (req, res) => {
    const { stock } = req.body as { stock: number };
    const result = await products.findOneAndUpdate(
      { _id: req.params['id'] },
      { $set: { stock } },
      { returnDocument: 'after' }
    );
    if (!result) return res.status(404).json({ message: 'Product not found' });
    return res.json(toResponse(result));
  });

  return router;
}
