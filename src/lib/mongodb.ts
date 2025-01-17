// src/lib/mongodb.ts
import { MongoClient, MongoClientOptions } from 'mongodb';

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your MongoDB URI to .env.local');
}

const uri = process.env.MONGODB_URI;
const options: MongoClientOptions = {
  maxPoolSize: 10,
  minPoolSize: 5,
  retryWrites: true,
  w: 'majority',
  wtimeoutMS: 2500,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  serverSelectionTimeoutMS: 10000,
  ssl: true,
  tls: true
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect()
      .then(client => {
        console.log('MongoDB connected successfully');
        return client;
      })
      .catch(err => {
        console.error('MongoDB connection error:', err);
        throw err;
      });
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
  clientPromise = client.connect()
    .then(client => {
      console.log('MongoDB connected successfully');
      return client;
    })
    .catch(err => {
      console.error('MongoDB connection error:', err);
      throw err;
    });
}

// Export a module-scoped MongoClient promise
export default clientPromise;

// Add a function to test the connection
export async function testConnection() {
  try {
    const client = await clientPromise;
    await client.db().command({ ping: 1 });
    console.log("MongoDB connection test successful");
    return true;
  } catch (error) {
    console.error("MongoDB connection test failed:", error);
    return false;
  }
}