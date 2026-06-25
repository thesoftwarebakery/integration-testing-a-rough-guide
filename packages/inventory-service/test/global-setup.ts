import { MongoDBContainer } from '@testcontainers/mongodb';
import type { StartedMongoDBContainer } from '@testcontainers/mongodb';

let container: StartedMongoDBContainer;

// globalSetup runs ONCE before all test files.
// Starting one container per run (not per test) is the key performance win:
// containers take a few seconds to boot, so pay the cost once and share it.
export async function setup() {
  container = await new MongoDBContainer('mongo:7').start();

  // Pass the connection URI to test workers via environment variable.
  // Simple and reliable — no framework-specific provide/inject needed.
  // MongoDB container starts as a replica set (rs0). Build the URI using the
  // host-mapped port + directConnection=true to bypass replica-set member resolution,
  // which would otherwise return the container's internal hostname.
  const host = container.getHost();
  const port = container.getMappedPort(27017);
  process.env['MONGODB_TEST_URI'] = `mongodb://${host}:${port}/?directConnection=true`;
}

export async function teardown() {
  await container?.stop();
}
