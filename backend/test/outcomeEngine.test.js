import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import Session from '../src/models/Session.js';
import SimulationEvent from '../src/models/SimulationEvent.js';
import BehaviorScore from '../src/models/BehaviorScore.js';
import {
  normalizeBehaviorEvent,
  eventMatchesCondition,
  evaluateTerminationRules,
  computeScenarioScore,
  startObservationWindow,
  finalizeSessionOutcome,
  FORMULA_VERSION
} from '../src/services/outcomeService.js';
import { generateDefaultTerminationRules } from '../src/validators/terminationRulesValidator.js';

describe('Scenario-Driven Outcome Engine (Step 2)', () => {
  describe('normalizeBehaviorEvent & eventMatchesCondition', () => {
    it('normalizes simulated links, credentials, forms, and report events', () => {
      const linkNorm = normalizeBehaviorEvent({ eventType: 'simulated_link_clicked' });
      expect(linkNorm.eventType).toBe('simulated_link_clicked');
      expect(linkNorm.isRisky).toBe(true);

      const credNorm = normalizeBehaviorEvent({ eventType: 'credential_submitted' });
      expect(credNorm.eventType).toBe('credential_submitted');
      expect(credNorm.isRisky).toBe(true);

      const reportNorm = normalizeBehaviorEvent({ eventType: 'threat_reported' });
      expect(reportNorm.eventType).toBe('threat_reported');
      expect(reportNorm.isProtective).toBe(true);

      const windowNorm = normalizeBehaviorEvent({ eventType: 'observation_window_elapsed' });
      expect(windowNorm.eventType).toBe('observation_window_elapsed');
      expect(windowNorm.isProtective).toBe(true);
    });

    it('matches condition when eventType matches and non-passive criteria hold', () => {
      const condition = {
        id: 'neg-click',
        type: 'negative',
        eventType: 'simulated_link_clicked',
        description: 'Clicked phishing link'
      };

      expect(eventMatchesCondition({ eventType: 'simulated_link_clicked' }, condition)).toBe(true);
      expect(eventMatchesCondition({ eventType: 'message_opened' }, condition)).toBe(false);
    });

    it('never allows passive interaction events to satisfy terminal conditions', () => {
      const condition = {
        id: 'neg-open',
        type: 'negative',
        eventType: 'message_opened'
      };
      expect(eventMatchesCondition({ eventType: 'message_opened' }, condition)).toBe(false);
    });
  });

  describe('evaluateTerminationRules', () => {
    const sampleRules = {
      positiveConditions: [
        {
          id: 'pos-report',
          type: 'positive',
          eventType: 'threat_reported',
          weight: 1.0,
          description: 'Reported threat'
        },
        {
          id: 'pos-window',
          type: 'positive',
          eventType: 'observation_window_elapsed',
          weight: 0.8,
          description: 'No action taken during window'
        }
      ],
      negativeConditions: [
        {
          id: 'neg-link',
          type: 'negative',
          eventType: 'simulated_link_clicked',
          weight: 0.8,
          description: 'Clicked malicious link'
        }
      ],
      observationWindow: {
        durationSeconds: 30,
        postWindowDefaultOutcome: 'positive',
        requireExplicitAction: false
      }
    };

    it('matches positive threat_reported condition and maps to status reported', () => {
      const events = [
        { eventType: 'message_opened' },
        { eventType: 'threat_reported', metadata: {} }
      ];

      const res = evaluateTerminationRules(events, sampleRules, 'email');
      expect(res.matched).toBe(true);
      expect(res.outcome).toBe('positive');
      expect(res.condition.id).toBe('pos-report');
      expect(res.sessionStatus).toBe('reported');
    });

    it('matches negative condition when user clicks malicious link and maps to status completed', () => {
      const events = [
        { eventType: 'message_opened' },
        { eventType: 'simulated_link_clicked', metadata: {} }
      ];

      const res = evaluateTerminationRules(events, sampleRules, 'email');
      expect(res.matched).toBe(true);
      expect(res.outcome).toBe('negative');
      expect(res.condition.id).toBe('neg-link');
      expect(res.sessionStatus).toBe('completed');
    });

    it('evaluates observation window: does not trigger if elapsed time is less than window', () => {
      const events = [{ eventType: 'message_opened' }];
      const res = evaluateTerminationRules(events, sampleRules, 'email', { elapsedSeconds: 15 });
      expect(res.matched).toBe(false);
    });

    it('evaluates observation window: triggers positive condition when elapsed time meets durationSeconds', () => {
      const events = [{ eventType: 'message_opened' }];
      const res = evaluateTerminationRules(events, sampleRules, 'email', { elapsedSeconds: 35 });
      expect(res.matched).toBe(true);
      expect(res.outcome).toBe('positive');
      expect(res.condition.id).toBe('pos-window');
      expect(res.sessionStatus).toBe('safe_exit');
    });

    it('handles manualEnd option: returns incomplete outcome and completed sessionStatus', () => {
      const events = [{ eventType: 'message_opened' }];
      const res = evaluateTerminationRules(events, sampleRules, 'email', { manualEnd: true });
      expect(res.matched).toBe(true);
      expect(res.outcome).toBe('incomplete');
      expect(res.sessionStatus).toBe('completed');
    });
  });

  describe('computeScenarioScore Deterministic Formula', () => {
    const rules = {
      positiveConditions: [{ id: 'p1', weight: 1.0 }],
      negativeConditions: [{ id: 'n1', weight: 0.8 }]
    };

    it('calculates score for positive outcome with formula (75 + 25 * weight)', () => {
      const outcome = {
        outcome: 'positive',
        condition: { id: 'p1', weight: 1.0, description: 'Threat reported' },
        reason: 'Protected'
      };

      const result = computeScenarioScore(outcome, rules, []);
      expect(result.score).toBe(100);
      expect(result.riskLevel).toBe('low');
      expect(result.formulaVersion).toBe(FORMULA_VERSION);
    });

    it('calculates score for negative outcome with formula (45 - 45 * weight)', () => {
      const outcome = {
        outcome: 'negative',
        condition: { id: 'n1', weight: 0.8, description: 'Phish link clicked' },
        reason: 'Compromised'
      };

      const result = computeScenarioScore(outcome, rules, []);
      // 45 - (45 * 0.8) = 45 - 36 = 9
      expect(result.score).toBe(9);
      expect(result.riskLevel).toBe('critical');
      expect(result.formulaVersion).toBe(FORMULA_VERSION);
    });

    it('returns score 50 and moderate risk for incomplete outcome', () => {
      const outcome = {
        outcome: 'incomplete',
        reason: 'Manual end before outcome established.'
      };

      const result = computeScenarioScore(outcome, rules, []);
      expect(result.score).toBe(50);
      expect(result.riskLevel).toBe('high');
      expect(result.formulaVersion).toBe(FORMULA_VERSION);
    });

    it('returns score 25 and critical risk for abandoned outcome', () => {
      const outcome = {
        outcome: 'abandoned',
        reason: 'User abandoned session.'
      };

      const result = computeScenarioScore(outcome, rules, []);
      expect(result.score).toBe(25);
      expect(result.riskLevel).toBe('critical');
      expect(result.formulaVersion).toBe(FORMULA_VERSION);
    });

    it('clamps scores strictly between 0 and 100', () => {
      const highWeightPos = computeScenarioScore(
        { outcome: 'positive', condition: { weight: 2.0 } },
        rules,
        []
      );
      expect(highWeightPos.score).toBe(100);

      const highWeightNeg = computeScenarioScore(
        { outcome: 'negative', condition: { weight: 2.0 } },
        rules,
        []
      );
      expect(highWeightNeg.score).toBe(0);
    });
  });

  describe('Session Outcome Lifecycle & API Endpoints', () => {
    let mockSessions = new Map();
    let mockEvents = new Map();
    let mockScores = new Map();

    beforeEach(() => {
      mockSessions.clear();
      mockEvents.clear();
      mockScores.clear();

      vi.spyOn(Session, 'findOne').mockImplementation(async (query) => {
        const sess = mockSessions.get(query.sessionId);
        if (!sess) return null;
        return {
          ...sess,
          save: async function () {
            mockSessions.set(this.sessionId, { ...this });
            return this;
          }
        };
      });

      vi.spyOn(Session, 'findOneAndUpdate').mockImplementation(async (filter, update) => {
        const sess = mockSessions.get(filter.sessionId);
        if (!sess) return null;
        if (filter.status && sess.status !== filter.status) return null;

        const updated = {
          ...sess,
          ...update.$set
        };
        mockSessions.set(filter.sessionId, updated);
        return updated;
      });

      vi.spyOn(SimulationEvent, 'find').mockImplementation((query) => {
        const list = mockEvents.get(query.sessionId) || [];
        return {
          sort: () => Promise.resolve(list)
        };
      });

      vi.spyOn(BehaviorScore, 'findOne').mockImplementation(async (query) => {
        return mockScores.get(query.sessionId) || null;
      });

      vi.spyOn(BehaviorScore, 'findOneAndUpdate').mockImplementation(async (filter, update) => {
        const existing = mockScores.get(filter.sessionId);
        const revision = existing ? (existing.revision || 1) + 1 : 1;
        const saved = {
          ...update.$set,
          revision
        };
        mockScores.set(filter.sessionId, saved);
        return saved;
      });
    });

    it('POST /api/sessions/:sessionId/observation-window sets backend timestamp idempotently', async () => {
      const sessionId = 'sess-obs-100';
      mockSessions.set(sessionId, {
        sessionId,
        status: 'active',
        observationWindowStartedAt: null
      });

      const res1 = await request(app)
        .post(`/api/sessions/${sessionId}/observation-window`)
        .expect(200);

      expect(res1.body.success).toBe(true);
      expect(res1.body.observationWindowStartedAt).toBeDefined();

      const firstTimestamp = res1.body.observationWindowStartedAt;

      // Second call is idempotent
      const res2 = await request(app)
        .post(`/api/sessions/${sessionId}/observation-window`)
        .expect(200);

      expect(res2.body.observationWindowStartedAt).toBe(firstTimestamp);
    });

    it('POST /api/sessions/:sessionId/outcome finalizes positive outcome and creates BehaviorScore', async () => {
      const sessionId = 'sess-outcome-pos-200';
      const terminationRules = generateDefaultTerminationRules('email');

      mockSessions.set(sessionId, {
        sessionId,
        channel: 'email',
        status: 'active',
        terminationRules
      });

      mockEvents.set(sessionId, [
        { eventType: 'message_opened', sessionId },
        { eventType: 'threat_reported', sessionId, metadata: {} }
      ]);

      const res = await request(app)
        .post(`/api/sessions/${sessionId}/outcome`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.session.status).toBe('reported');
      expect(res.body.session.outcome).toBe('positive');
      expect(res.body.scoreRecord).toBeDefined();
      expect(res.body.scoreRecord.score).toBeGreaterThanOrEqual(75);
      expect(res.body.scoreRecord.formulaVersion).toBe(FORMULA_VERSION);
    });

    it('enforces single-outcome-wins idempotently on repeated outcome requests', async () => {
      const sessionId = 'sess-race-300';
      const terminationRules = generateDefaultTerminationRules('email');

      mockSessions.set(sessionId, {
        sessionId,
        channel: 'email',
        status: 'active',
        terminationRules
      });

      mockEvents.set(sessionId, [
        { eventType: 'simulated_link_clicked', sessionId, metadata: {} }
      ]);

      // First finalization
      const res1 = await request(app)
        .post(`/api/sessions/${sessionId}/outcome`)
        .expect(200);

      expect(res1.body.session.outcome).toBe('negative');
      const originalScore = res1.body.scoreRecord.score;

      // Second finalization attempts to finalize again with positive event added
      mockEvents.get(sessionId).push({ eventType: 'threat_reported', sessionId });

      const res2 = await request(app)
        .post(`/api/sessions/${sessionId}/outcome`)
        .expect(200);

      // Outcome and status remain locked
      expect(res2.body.session.outcome).toBe('negative');
      expect(res2.body.scoreRecord.score).toBe(originalScore);
    });

    it('POST /api/sessions/:sessionId/outcome handles manualEnd: true as incomplete outcome', async () => {
      const sessionId = 'sess-manual-end-400';
      const terminationRules = generateDefaultTerminationRules('chat');

      mockSessions.set(sessionId, {
        sessionId,
        channel: 'chat',
        status: 'active',
        terminationRules
      });

      mockEvents.set(sessionId, [
        { eventType: 'conversation_opened', sessionId }
      ]);

      const res = await request(app)
        .post(`/api/sessions/${sessionId}/outcome`)
        .send({ manualEnd: true })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.session.status).toBe('completed');
      expect(res.body.session.outcome).toBe('incomplete');
      expect(res.body.scoreRecord.score).toBe(50);
      expect(res.body.scoreRecord.riskLevel).toBe('high');
    });

    it('rejects client-fabricated observation window expiration before backend duration elapsed', async () => {
      const sessionId = 'sess-window-fake-500';
      const terminationRules = generateDefaultTerminationRules('email');
      terminationRules.observationWindowSeconds = 60; // 60 seconds required

      const startTime = new Date(); // started just now (0 seconds elapsed)

      mockSessions.set(sessionId, {
        sessionId,
        channel: 'email',
        status: 'active',
        observationWindowStartedAt: startTime,
        terminationRules
      });

      mockEvents.set(sessionId, [
        { eventType: 'observation_window_elapsed', sessionId }
      ]);

      const res = await request(app)
        .post(`/api/sessions/${sessionId}/outcome`)
        .expect(200);

      // Backend verifies that 60 seconds haven't passed, so simulation stays active
      expect(res.body.session.status).toBe('active');
      expect(res.body.outcome.isTerminal).toBe(false);
    });
  });
});
