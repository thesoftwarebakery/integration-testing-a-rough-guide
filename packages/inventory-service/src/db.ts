import { MongoClient, type Db } from 'mongodb';

export async function createDb(uri: string, dbName: string): Promise<{ db: Db; close: () => Promise<void> }> {
  const client = new MongoClient(uri);
  await client.connect();
  return {
    db: client.db(dbName),
    close: () => client.close(),
  };
}
