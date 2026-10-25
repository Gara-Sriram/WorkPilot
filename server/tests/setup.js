import { beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { seedDemoData } from '../src/services/demoSeeder.js';

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  await connectDB();
  await seedDemoData({ reset: true });
}, 60000);

afterAll(async () => {
  await disconnectDB();
}, 20000);
