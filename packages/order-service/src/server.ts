import { createApp } from './app.js';
import { createPool, runMigrations } from './db.js';
// configure() sets the base URL used by all generated inventory-service-sdk functions.
// Call it before createApp() so routes have the correct URL when handling requests.
import { configure } from '@repo/inventory-service-sdk';

configure(process.env['INVENTORY_SERVICE_URL'] ?? 'http://localhost:3002');

const pool = await createPool(process.env['DATABASE_URL'] ?? 'postgresql://localhost/orders');
await runMigrations(pool);

const app = createApp({ db: pool });
app.listen(3001, () => console.log('order-service on :3001'));
