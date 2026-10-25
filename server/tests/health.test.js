import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('Health and System Endpoints', () => {
  it('GET /api/health returns healthy system status and environment transparency', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.product).toBe('WorkPilot');
    expect(res.body.database.status).toBe('connected');
    expect(res.body.aiEngine).toBeDefined();
    expect(res.body.limits.maxToolCalls).toBeGreaterThan(0);
    expect(res.body.limits.maxRetries).toBeGreaterThan(0);
  });

  it('GET /api/demo/status returns environment configuration and counts', async () => {
    const res = await request(app).get('/api/demo/status');

    expect(res.status).toBe(200);
    expect(res.body.environment).toBeDefined();
    expect(res.body.stats).toBeDefined();
    expect(res.body.stats.totalDocuments).toBeGreaterThanOrEqual(3);
  });
});
