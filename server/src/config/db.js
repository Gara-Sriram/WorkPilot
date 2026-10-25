import mongoose from 'mongoose';
import { env } from './env.js';

let mongodInstance = null;
let activeUri = '';

export async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // 1. Try configured MONGODB_URI if provided
  if (env.MONGODB_URI && env.MONGODB_URI.trim()) {
    try {
      console.log(`[Database] Attempting connection to MongoDB at: ${env.MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
      await mongoose.connect(env.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
      });
      activeUri = env.MONGODB_URI;
      console.log('[Database] Connected to external MongoDB successfully.');
      return mongoose.connection;
    } catch (err) {
      console.warn(`[Database] Failed to connect to specified MONGODB_URI: ${err.message}`);
      if (env.isProd) {
        throw err;
      }
      console.log('[Database] Falling back to high-performance in-memory MongoDB instance for local execution...');
    }
  }

  // 2. In-memory MongoDB fallback for reliable dev and testing
  try {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    mongodInstance = await MongoMemoryServer.create();
    activeUri = mongodInstance.getUri();
    await mongoose.connect(activeUri);
    console.log(`[Database] High-performance in-memory MongoDB started at: ${activeUri}`);
    return mongoose.connection;
  } catch (memErr) {
    console.error('[Database Fatal] Could not connect to any MongoDB instance:', memErr.message);
    throw memErr;
  }
}

export async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongodInstance) {
    await mongodInstance.stop();
    mongodInstance = null;
  }
  activeUri = '';
}

export function getActiveDbUri() {
  return activeUri;
}
