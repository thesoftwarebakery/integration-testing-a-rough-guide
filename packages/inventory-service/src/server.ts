import { createApp } from './app.js';
import { createDb } from './db.js';

const uri = process.env['MONGODB_URI'] ?? 'mongodb://localhost:27017';
const dbName = process.env['MONGODB_DB'] ?? 'inventory';

const { db } = await createDb(uri, dbName);
const app = createApp({ db });
app.listen(3002, () => console.log('inventory-service on :3002'));
