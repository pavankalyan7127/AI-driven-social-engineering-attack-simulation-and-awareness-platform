import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import Session from '../src/models/Session.js';
import SimulationEvent from '../src/models/SimulationEvent.js';

describe('Simulation Events API - Telemetry Persistence & Retrieval', () => {
  let dbSessions = new Map();
  let dbEvents = [];

  beforeEach(() => {
    vi.clearAllMocks();
    dbSessions.clear();
    dbEvents = [];

    // Mock Session.findOne
    vi.spyOn(Session, 'findOne').mockImplementation(async (query) => {
      if (query.sessionId) {
        return dbSessions.get(query.sessionId) || null;
      }
      return null;
    });

    // Mock SimulationEvent.create
    vi.spyOn(SimulationEvent, 'create').mockImplementation(async (doc) => {
      const savedDoc = {
        eventId: doc.eventId,
        sessionId: doc.sessionId,
        scenarioId: doc.scenarioId,
        channel: doc.channel,
        eventType: doc.eventType,
        timestamp: doc.timestamp || new Date(),
        clientTimestamp: doc.clientTimestamp || null,
        clientEventId: doc.clientEventId || null,
        metadata: doc.metadata || {},
        createdAt: doc.createdAt || new Date(),
        toJSON: function () {
          const copy = { ...this };
          delete copy.toJSON;
          return copy;
        }
      };
      dbEvents.push(savedDoc);
      return savedDoc;
    });

    // Mock SimulationEvent.findOne
    vi.spyOn(SimulationEvent, 'findOne').mockImplementation(async (query) => {
      if (query.sessionId && query.clientEventId) {
        return (
          dbEvents.find(
            (e) => e.sessionId === query.sessionId && e.clientEventId === query.clientEventId
          ) || null
        );
      }
      if (query.sessionId && query.eventType) {
        return (
          dbEvents.find(
            (e) => e.sessionId === query.sessionId && e.eventType === query.eventType
          ) || null
        );
      }
      return null;
    });

    // Mock SimulationEvent.find
    vi.spyOn(SimulationEvent, 'find').mockImplementation((query) => {
      const filtered = dbEvents.filter((e) => e.sessionId === query.sessionId);
      const queryObj = {
        sort: (sortObj) => {
          filtered.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
          return queryObj;
        },
        skip: (skipCount) => {
          queryObj._skip = skipCount;
          return queryObj;
        },
        limit: (limitCount) => {
          const start = queryObj._skip || 0;
          return Promise.resolve(filtered.slice(start, start + limitCount));
        }
      };
      return queryObj;
    });

    // Mock SimulationEvent.countDocuments
    vi.spyOn(SimulationEvent, 'countDocuments').mockImplementation(async (query) => {
      return dbEvents.filter((e) => e.sessionId === query.sessionId).length;
    });

    // Seed a standard active session
    dbSessions.set('sess-email-active-100', {
      sessionId: 'sess-email-active-100',
      scenarioId: 'scen-email-univ-01',
      channel: 'email',
      status: 'active',
      startedAt: new Date(Date.now() - 60000),
      updatedAt: new Date(Date.now() - 60000),
      endedAt: null
    });

    // Seed a terminal session
    dbSessions.set('sess-email-terminal-200', {
      sessionId: 'sess-email-terminal-200',
      scenarioId: 'scen-email-univ-01',
      channel: 'email',
      status: 'reported',
      startedAt: new Date(Date.now() - 120000),
      updatedAt: new Date(Date.now() - 10000),
      endedAt: new Date(Date.now() - 10000)
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // 1. POST /api/events - Validation & Persistence
  describe('POST /api/events - Persistence & Validation', () => {
    it('persists a valid simulation event and returns 201 Created', async () => {
      const res = await request(app)
        .post('/api/events')
        .send({
          sessionId: 'sess-email-active-100',
          eventType: 'message_opened',
          metadata: {
            messageId: 'msg-target-1',
            currentView: 'email'
          }
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.event.eventId).toMatch(/^evt-\d+-[a-f0-9]+$/);
      expect(res.body.event.sessionId).toBe('sess-email-active-100');
      expect(res.body.event.scenarioId).toBe('scen-email-univ-01'); // Derived from session
      expect(res.body.event.channel).toBe('email'); // Derived from session
      expect(res.body.event.eventType).toBe('message_opened');
      expect(res.body.event.timestamp).toBeDefined();
      expect(res.body.event.metadata).toEqual({
        messageId: 'msg-target-1',
        currentView: 'email'
      });
    });

    it('returns 404 for an unknown session ID', async () => {
      const res = await request(app)
        .post('/api/events')
        .send({
          sessionId: 'sess-unknown-999',
          eventType: 'simulated_link_clicked'
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/session.*not found/i);
    });

    it('rejects invalid or missing sessionId format with 400', async () => {
      const res1 = await request(app)
        .post('/api/events')
        .send({ eventType: 'message_opened' });

      expect(res1.status).toBe(400);
      expect(res1.body.success).toBe(false);

      const res2 = await request(app)
        .post('/api/events')
        .send({ sessionId: 'bad$id!', eventType: 'message_opened' });

      expect(res2.status).toBe(400);
      expect(res2.body.success).toBe(false);
    });

    it('rejects unsupported eventType with 400', async () => {
      const res = await request(app)
        .post('/api/events')
        .send({
          sessionId: 'sess-email-active-100',
          eventType: 'arbitrary_fake_event'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/unsupported eventType/i);
    });

    it('rejects non-object metadata with 400', async () => {
      const res = await request(app)
        .post('/api/events')
        .send({
          sessionId: 'sess-email-active-100',
          eventType: 'message_opened',
          metadata: 'string-instead-of-object'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/metadata must be a valid JSON object/i);
    });

    it('rejects oversized metadata exceeding key limit with 400', async () => {
      const hugeMeta = {};
      for (let i = 0; i < 30; i++) {
        hugeMeta[`key_${i}`] = `value_${i}`;
      }

      const res = await request(app)
        .post('/api/events')
        .send({
          sessionId: 'sess-email-active-100',
          eventType: 'message_opened',
          metadata: hugeMeta
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/maximum key count/i);
    });

    it('redacts sensitive credential keys in metadata without persisting secrets', async () => {
      const res = await request(app)
        .post('/api/events')
        .send({
          sessionId: 'sess-email-active-100',
          eventType: 'credential_submitted',
          metadata: {
            username: 'student@univ.edu',
            password: 'ActualPlaintextSecretPassword123!',
            authToken: 'secret_token_abc'
          }
        });

      expect(res.status).toBe(201);
      expect(res.body.event.metadata.username).toBe('student@univ.edu');
      expect(res.body.event.metadata.password).toBe('[REDACTED]');
      expect(res.body.event.metadata.authToken).toBe('[REDACTED]');
    });

    it('ignores client-supplied scenarioId, channel, or authoritative timestamps', async () => {
      const res = await request(app)
        .post('/api/events')
        .send({
          sessionId: 'sess-email-active-100',
          scenarioId: 'client-forged-scenario-id',
          channel: 'sms', // Real session is email
          eventType: 'message_opened',
          timestamp: '1999-01-01T00:00:00.000Z'
        });

      expect(res.status).toBe(201);
      // Strictly derived from session in database
      expect(res.body.event.scenarioId).toBe('scen-email-univ-01');
      expect(res.body.event.channel).toBe('email');
      expect(new Date(res.body.event.timestamp).getFullYear()).toBeGreaterThanOrEqual(2025);
    });

    it('supports idempotent submission when clientEventId is supplied', async () => {
      const firstRes = await request(app)
        .post('/api/events')
        .send({
          sessionId: 'sess-email-active-100',
          eventType: 'simulated_link_clicked',
          clientEventId: 'client-evt-unique-001',
          metadata: { url: 'https://verify.edu' }
        });

      expect(firstRes.status).toBe(201);
      const originalEventId = firstRes.body.event.eventId;

      // Duplicate submission with the same clientEventId
      const secondRes = await request(app)
        .post('/api/events')
        .send({
          sessionId: 'sess-email-active-100',
          eventType: 'simulated_link_clicked',
          clientEventId: 'client-evt-unique-001',
          metadata: { url: 'https://verify.edu' }
        });

      expect(secondRes.status).toBe(200);
      expect(secondRes.body.event.eventId).toBe(originalEventId);
      expect(secondRes.body.message).toMatch(/idempotent/i);
      expect(dbEvents.length).toBe(1); // No duplicate insertion
    });
  });

  // 2. Terminal Session & Race Condition Handling
  describe('Terminal Session Validation & Final Event Handling', () => {
    it('rejects ordinary interaction events on terminal session with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/events')
        .send({
          sessionId: 'sess-email-terminal-200',
          eventType: 'message_opened'
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/cannot record interaction events for a terminal session/i);
    });

    it('accepts matching authorized terminal event on terminal session (threat_reported on reported session)', async () => {
      const res = await request(app)
        .post('/api/events')
        .send({
          sessionId: 'sess-email-terminal-200',
          eventType: 'threat_reported',
          metadata: { indicatorCount: 2 }
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.event.eventType).toBe('threat_reported');
    });

    it('is idempotent when terminal event is repeated', async () => {
      // First submission of terminal event
      await request(app)
        .post('/api/events')
        .send({
          sessionId: 'sess-email-terminal-200',
          eventType: 'threat_reported',
          metadata: { indicatorCount: 2 }
        });

      // Repeat terminal event
      const repeatRes = await request(app)
        .post('/api/events')
        .send({
          sessionId: 'sess-email-terminal-200',
          eventType: 'threat_reported'
        });

      expect(repeatRes.status).toBe(200);
      expect(repeatRes.body.success).toBe(true);
      expect(repeatRes.body.message).toMatch(/idempotent/i);
    });
  });

  // 3. GET /api/sessions/:sessionId/events - Chronological Retrieval
  describe('GET /api/sessions/:sessionId/events - Event Retrieval', () => {
    it('retrieves chronological events for a valid session', async () => {
      // Seed 3 events
      await request(app).post('/api/events').send({
        sessionId: 'sess-email-active-100',
        eventType: 'scenario_viewed'
      });
      await request(app).post('/api/events').send({
        sessionId: 'sess-email-active-100',
        eventType: 'message_opened'
      });
      await request(app).post('/api/events').send({
        sessionId: 'sess-email-active-100',
        eventType: 'simulated_link_clicked'
      });

      const res = await request(app).get('/api/sessions/sess-email-active-100/events');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(3);
      expect(res.body.events.length).toBe(3);
      expect(res.body.events[0].eventType).toBe('scenario_viewed');
      expect(res.body.events[1].eventType).toBe('message_opened');
      expect(res.body.events[2].eventType).toBe('simulated_link_clicked');
    });

    it('returns 404 when retrieving events for a nonexistent session', async () => {
      const res = await request(app).get('/api/sessions/sess-ghost-000/events');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('supports pagination with limit and page parameters', async () => {
      // Seed 5 events
      for (let i = 0; i < 5; i++) {
        await request(app).post('/api/events').send({
          sessionId: 'sess-email-active-100',
          eventType: 'interaction_recorded',
          metadata: { step: i }
        });
      }

      const res = await request(app).get('/api/sessions/sess-email-active-100/events?limit=2&page=2');
      expect(res.status).toBe(200);
      expect(res.body.count).toBe(2);
      expect(res.body.total).toBe(5);
      expect(res.body.page).toBe(2);
      expect(res.body.limit).toBe(2);
    });
  });
});
