import { MongoClient, Collection, Document } from "mongodb";

const uri = process.env.MONGO_URI ?? "mongo_uri";
const dbName = process.env.MONGO_DB ?? "tradecopia";
const collectionName = process.env.MONGO_COLLECTION ?? "vps_records";

type MongoCache = {
  client: MongoClient | null;
  promise: Promise<MongoClient> | null;
};

declare global {
  var _mongoCache: MongoCache | undefined;
}

const globalCache = globalThis._mongoCache ?? {
  client: null,
  promise: null,
};

if (!globalThis._mongoCache) {
  globalThis._mongoCache = globalCache;
}

async function connectMongoClient(): Promise<MongoClient> {
  if (!uri) {
    throw new Error("MONGO_URI environment variable is required");
  }

  if (globalCache.client) {
    return globalCache.client;
  }

  if (!globalCache.promise) {
    globalCache.promise = MongoClient.connect(uri, {
      monitorCommands: false,
    });
  }

  globalCache.client = await globalCache.promise;
  return globalCache.client;
}

export async function getVpsCollection(): Promise<Collection<Document>> {
  const client = await connectMongoClient();
  return client.db(dbName).collection(collectionName);
}
