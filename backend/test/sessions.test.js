import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import Session from '../src/models/Session.js';
import { validateDatabaseEnv } from '../src/config/db.js';

describe('Sessions API - Lifecycle and Management', () => {
  // In-memory mock database store to test atomic operations and persistence accurately
  let dbSessions = new Map();

  beforeEach(() => {
    vi.clearAllMocks();
    dbSessions.clear();

    // Mock Session.create
    vi.spyOn(Session, 'create').mockImplementation(async (doc) => {
      const savedDoc = {
        sessionId: doc.sessionId,
        scenarioId: doc.scenarioId,
        channel: doc.channel,
        status: doc.status || 'active',
        startedAt: doc.startedAt || new Date(),
        updatedAt: doc.updatedAt || new Date(),
        endedAt: doc.endedAt || null,
        toJSON: function () {
          const copy = { ...this };
          delete copy.toJSON;
          return copy;
        }
      };
      dbSessions.set(doc.sessionId, savedDoc);
      return savedDoc;
    });

    // Mock Session.findOne
    vi.spyOn(Session, 'findOne').mockImplementation(async (query) => {
      if (query.sessionId) {
        const found = dbSessions.get(query.sessionId);
        if (!found) return null;
        return {
          ...found,
          toJSON: function () {
            const copy = { ...this };
            delete copy.toJSON;
            return copy;
          }
        };
      }
      return null;
    });

    // Mock Session.findOneAndUpdate (atomic update)
    vi.spyOn(Session, 'findOneAndUpdate').mockImplementation(async (filter, update) => {
      const existing = dbSessions.get(filter.sessionId);
      if (!existing) return null;

      // Condition check: status must match filter.status
      if (filter.status && existing.status !== filter.status) {
        return null;
      }

      const setUpdates = update.$set || {};
      const updatedDoc = {
        ...existing,
        ...setUpdates,
        toJSON: function () {
          const copy = { ...this };
          delete copy.toJSON;
          return copy;
        }
      };
      dbSessions.set(filter.sessionId, updatedDoc);
      return updatedDoc;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // 1. POST /api/sessions
  describe('POST /api/sessions - Session Creation', () => {
    it('creates a new session with valid scenarioId and channel and returns 201', async () => {
      const res = await request(app)
        .post('/api/sessions')
        .send({
          scenarioId: 'scen-email-univ-01',
          channel: 'email'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.sessionId).toBeDefined();
      expect(res.body.sessionId).toMatch(/^sess-email-\d+-[a-f0-9]+$/);
      expect(res.body.session.scenarioId).toBe('scen-email-univ-01');
      expect(res.body.session.channel).toBe('email');
      expect(res.body.session.status).toBe('active');
      expect(res.body.session.startedAt).toBeDefined();
      expect(res.body.session.updatedAt).toBeDefined();
      expect(res.body.session.endedAt).toBeNull();
    });

    it('rejects missing or empty scenarioId with 400', async () => {
      const res1 = await request(app)
        .post('/api/sessions')
        .send({ channel: 'email' });

      expect(res1.status).toBe(400);
      expect(res1.body.success).toBe(false);
      expect(res1.body.error).toMatch(/scenarioId is required/i);

      const res2 = await request(app)
        .post('/api/sessions')
        .send({ scenarioId: '   ', channel: 'email' });

      expect(res2.status).toBe(400);
      expect(res2.body.success).toBe(false);
    });

    it('rejects missing or invalid channel with 400', async () => {
      const res1 = await request(app)
        .post('/api/sessions')
        .send({ scenarioId: 'scen-1' });

      expect(res1.status).toBe(400);
      expect(res1.body.success).toBe(false);
      expect(res1.body.error).toMatch(/channel is required/i);

      const res2 = await request(app)
        .post('/api/sessions')
        .send({ scenarioId: 'scen-1', channel: 'discord' });

      expect(res2.status).toBe(400);
      expect(res2.body.success).toBe(false);
      expect(res2.body.error).toMatch(/unsupported channel/i);
    });

    it('ignores client-supplied status, sessionId, or timestamps', async () => {
      const res = await request(app)
        .post('/api/sessions')
        .send({
          scenarioId: 'scen-chat-01',
          channel: 'chat',
          status: 'completed', // Client tries to forge status
          sessionId: 'client-forged-id', // Client tries to forge ID
          endedAt: new Date().toISOString()
        });

      expect(res.status).toBe(201);
      expect(res.body.sessionId).not.toBe('client-forged-id');
      expect(res.body.session.status).toBe('active');
      expect(res.body.session.endedAt).toBeNull();
    });

    it('accepts all 4 valid channels (email, chat, sms, website)', async () => {
      for (const ch of ['email', 'chat', 'sms', 'website']) {
        const res = await request(app)
          .post('/api/sessions')
          .send({ scenarioId: `scen-${ch}-01`, channel: ch });

        expect(res.status).toBe(201);
        expect(res.body.session.channel).toBe(ch);
      }
    });
  });

  // 2. GET /api/sessions/:sessionId
  describe('GET /api/sessions/:sessionId - Session Retrieval', () => {
    it('retrieves an existing session successfully with 200', async () => {
      // Seed a session
      const createRes = await request(app)
        .post('/api/sessions')
        .send({ scenarioId: 'scen-sms-01', channel: 'sms' });

      const { sessionId } = createRes.body;

      const getRes = await request(app).get(`/api/sessions/${sessionId}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.success).toBe(true);
      expect(getRes.body.session.sessionId).toBe(sessionId);
      expect(getRes.body.session.scenarioId).toBe('scen-sms-01');
      expect(getRes.body.session.channel).toBe('sms');
    });

    it('returns 404 for an unknown session ID', async () => {
      const res = await request(app).get('/api/sessions/sess-nonexistent-999');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/not found/i);
    });

    it('returns 400 for an invalid session ID format', async () => {
      const res = await request(app).get('/api/sessions/bad$session!id');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/invalid sessionId format/i);
    });
  });

  // 3. PATCH /api/sessions/:sessionId/status
  describe('PATCH /api/sessions/:sessionId/status - Status Lifecycle Transitions', () => {
    it.each([
      ['completed'],
      ['reported'],
      ['safe_exit'],
      ['abandoned']
    ])('transitions active -> %s successfully and sets endedAt and updatedAt', async (targetStatus) => {
      const createRes = await request(app)
        .post('/api/sessions')
        .send({ scenarioId: 'scen-web-01', channel: 'website' });

      const { sessionId } = createRes.body;
      const initialStartedAt = new Date(createRes.body.session.startedAt).getTime();

      const patchRes = await request(app)
        .patch(`/api/sessions/${sessionId}/status`)
        .send({ status: targetStatus });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.success).toBe(true);
      expect(patchRes.body.session.status).toBe(targetStatus);
      expect(patchRes.body.session.endedAt).not.toBeNull();
      expect(new Date(patchRes.body.session.endedAt).getTime()).toBeGreaterThanOrEqual(initialStartedAt);
      expect(new Date(patchRes.body.session.updatedAt).getTime()).toBeGreaterThanOrEqual(initialStartedAt);
      expect(patchRes.body.session.startedAt).toBe(createRes.body.session.startedAt);
    });

    it('rejects unsupported status values with 400', async () => {
      const createRes = await request(app)
        .post('/api/sessions')
        .send({ scenarioId: 'scen-01', channel: 'email' });

      const res = await request(app)
        .patch(`/api/sessions/${createRes.body.sessionId}/status`)
        .send({ status: 'compromised' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/unsupported status/i);
    });

    it('rejects attempting to reopen a terminal session back to active with 400', async () => {
      const createRes = await request(app)
        .post('/api/sessions')
        .send({ scenarioId: 'scen-01', channel: 'email' });

      const sessionId = createRes.body.sessionId;

      // Complete session
      await request(app)
        .patch(`/api/sessions/${sessionId}/status`)
        .send({ status: 'completed' });

      // Attempt to reopen to active
      const reopenRes = await request(app)
        .patch(`/api/sessions/${sessionId}/status`)
        .send({ status: 'active' });

      expect(reopenRes.status).toBe(400);
      expect(reopenRes.body.success).toBe(false);
      expect(reopenRes.body.error).toMatch(/unsupported status/i);
    });

    it('rejects replacing one terminal status with another with 409 Conflict', async () => {
      const createRes = await request(app)
        .post('/api/sessions')
        .send({ scenarioId: 'scen-01', channel: 'email' });

      const sessionId = createRes.body.sessionId;

      // Transition to 'reported'
      const firstRes = await request(app)
        .patch(`/api/sessions/${sessionId}/status`)
        .send({ status: 'reported' });
      expect(firstRes.status).toBe(200);

      // Attempt conflicting transition to 'safe_exit'
      const conflictRes = await request(app)
        .patch(`/api/sessions/${sessionId}/status`)
        .send({ status: 'safe_exit' });

      expect(conflictRes.status).toBe(409);
      expect(conflictRes.body.success).toBe(false);
      expect(conflictRes.body.error).toMatch(/cannot transition session/i);
    });

    it('is idempotent when repeating the identical terminal status and returns 200', async () => {
      const createRes = await request(app)
        .post('/api/sessions')
        .send({ scenarioId: 'scen-01', channel: 'chat' });

      const sessionId = createRes.body.sessionId;

      // First transition
      const firstRes = await request(app)
        .patch(`/api/sessions/${sessionId}/status`)
        .send({ status: 'reported' });
      expect(firstRes.status).toBe(200);

      // Second identical transition
      const secondRes = await request(app)
        .patch(`/api/sessions/${sessionId}/status`)
        .send({ status: 'reported' });

      expect(secondRes.status).toBe(200);
      expect(secondRes.body.success).toBe(true);
      expect(secondRes.body.session.status).toBe('reported');
      expect(secondRes.body.message).toMatch(/idempotent/i);
    });

    it('returns 404 when patching a nonexistent session', async () => {
      const res = await request(app)
        .patch('/api/sessions/sess-ghost-1234/status')
        .send({ status: 'completed' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // 4. Database Environment Configuration Validation
  describe('Database Environment Configuration Validation', () => {
    it('throws a descriptive error when MONGODB_URL is missing', () => {
      const originalUrl = process.env.MONGODB_URL;
      delete process.env.MONGODB_URL;

      expect(() => validateDatabaseEnv()).toThrow(/MONGODB_URL.*missing/i);

      process.env.MONGODB_URL = originalUrl;
    });

    it('throws a descriptive error when MONGO_DBNAME is missing', () => {
      const originalDb = process.env.MONGO_DBNAME;
      delete process.env.MONGO_DBNAME;

      expect(() => validateDatabaseEnv()).toThrow(/MONGO_DBNAME.*missing/i);

      process.env.MONGO_DBNAME = originalDb;
    });

    it('returns validated configuration when environment variables are present', () => {
      const config = validateDatabaseEnv();
      expect(config.mongoUrl).toBeDefined();
      expect(config.dbName).toBe('social_engineering_awareness_platform');
    });
  });
});
