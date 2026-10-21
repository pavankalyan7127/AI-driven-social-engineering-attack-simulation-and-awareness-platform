import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import Session from '../src/models/Session.js';
import SimulationEvent from '../src/models/SimulationEvent.js';
import BehaviorScore from '../src/models/BehaviorScore.js';
import { calculateSecurityScore } from '../src/services/scoringService.js';
import { getRiskLevel } from '../src/config/scoringConfig.js';

describe('Security Behavior Scoring Engine - Unit & Service Tests', () => {
  describe('calculateSecurityScore - Pure Deterministic Engine', () => {
    it('returns baseline 100 with Low Risk when no risky behavior occurred', () => {
      const events = [
        { eventType: 'scenario_viewed', metadata: {} },
        { eventType: 'message_opened', metadata: { emailId: 'msg-1' } }
      ];

      const result = calculateSecurityScore(events, { status: 'active', channel: 'email' });

      expect(result.score).toBe(100);
      expect(result.riskLevel).toBe('low');
      expect(result.status).toBe('provisional');
      expect(result.factors.some((f) => f.category === 'baseline_neutral')).toBe(true);
    });

    it('does not penalize opening a suspicious message alone', () => {
      const emailEvents = [{ eventType: 'message_opened' }];
      const chatEvents = [{ eventType: 'conversation_opened' }];
      const webEvents = [{ eventType: 'virtual_page_viewed' }];

      expect(calculateSecurityScore(emailEvents, { channel: 'email' }).score).toBe(100);
      expect(calculateSecurityScore(chatEvents, { channel: 'chat' }).score).toBe(100);
      expect(calculateSecurityScore(webEvents, { channel: 'website' }).score).toBe(100);
    });

    it('applies a 25-point penalty for clicking a malicious link', () => {
      const events = [
        { eventType: 'message_opened' },
        { eventType: 'simulated_link_clicked', metadata: { url: 'https://phish.net' } }
      ];

      const result = calculateSecurityScore(events, { status: 'active', channel: 'email' });

      expect(result.score).toBe(75);
      expect(result.riskLevel).toBe('moderate');
      const factor = result.factors.find((f) => f.category === 'malicious_link_clicked');
      expect(factor).toBeDefined();
      expect(factor.scoreImpact).toBe(-25);
    });

    it('applies a 40-point penalty for submitting simulated credentials', () => {
      const events = [
        { eventType: 'virtual_page_viewed' },
        {
          eventType: 'simulated_form_submitted',
          metadata: { hasProvidedInput: true }
        }
      ];

      const result = calculateSecurityScore(events, { status: 'active', channel: 'website' });

      expect(result.score).toBe(60);
      expect(result.riskLevel).toBe('moderate');
      const factor = result.factors.find((f) => f.category === 'simulated_credentials_submitted');
      expect(factor).toBeDefined();
      expect(factor.scoreImpact).toBe(-40);
    });

    it('does not penalize opening or interacting with form unless credentials/input are submitted', () => {
      const events = [
        { eventType: 'virtual_page_viewed' },
        { eventType: 'form_interaction', metadata: { focused: true } },
        { eventType: 'simulated_form_submitted', metadata: { hasProvidedInput: false } }
      ];

      const result = calculateSecurityScore(events, { status: 'active', channel: 'website' });
      expect(result.score).toBe(100);
    });

    it('rewards identifying warning signs (+5 points each, up to maxOccurrences)', () => {
      const events = [
        { eventType: 'warning_sign_selected', metadata: { indicatorKey: 'suspiciousSender' } },
        { eventType: 'warning_sign_selected', metadata: { indicatorKey: 'urgentThreat' } }
      ];

      // In combination with a link click (-25): 100 - 25 + 10 = 85
      const eventsWithLink = [
        ...events,
        { eventType: 'simulated_link_clicked', metadata: { url: 'https://bad.com' } }
      ];

      const result = calculateSecurityScore(eventsWithLink, { status: 'completed', channel: 'chat' });

      expect(result.score).toBe(85);
      const factor = result.factors.find((f) => f.category === 'warning_sign_identified');
      expect(factor).toBeDefined();
      expect(factor.scoreImpact).toBe(10); // 2 distinct indicators * 5
      expect(factor.eventCount).toBe(2);
    });

    it('rewards threat reporting (+15 points)', () => {
      const events = [
        { eventType: 'simulated_link_clicked' }, // -25
        { eventType: 'threat_reported', metadata: { indicators: {} } } // +15
      ];

      const result = calculateSecurityScore(events, { status: 'reported', channel: 'email' });

      // 100 - 25 + 15 = 90
      expect(result.score).toBe(90);
      expect(result.riskLevel).toBe('low');
      const factor = result.factors.find((f) => f.category === 'threat_reported');
      expect(factor.scoreImpact).toBe(15);
    });

    it('rewards safe exit (+10 points)', () => {
      const events = [
        { eventType: 'simulated_link_clicked' }, // -25
        { eventType: 'safe_exit', metadata: {} } // +10
      ];

      const result = calculateSecurityScore(events, { status: 'safe_exit', channel: 'sms' });

      // 100 - 25 + 10 = 85
      expect(result.score).toBe(85);
      const factor = result.factors.find((f) => f.category === 'safe_exit');
      expect(factor.scoreImpact).toBe(10);
    });

    it('deduplicates identical events and does not apply duplicate penalties', () => {
      const events = [
        { eventId: 'evt-1', eventType: 'simulated_link_clicked', metadata: { id: 'l1' } },
        { eventId: 'evt-1', eventType: 'simulated_link_clicked', metadata: { id: 'l1' } }, // Exact duplicate
        { eventId: 'evt-1', eventType: 'simulated_link_clicked', metadata: { id: 'l1' } }  // Exact duplicate
      ];

      const result = calculateSecurityScore(events, { channel: 'email' });
      // Only 1 click counted: 100 - 25 = 75
      expect(result.score).toBe(75);
      const factor = result.factors.find((f) => f.category === 'malicious_link_clicked');
      expect(factor.eventCount).toBe(1);
    });

    it('penalizes distinct repeated risky interactions up to maxOccurrences', () => {
      const events = [
        { eventId: 'evt-link-1', eventType: 'simulated_link_clicked', metadata: { url: 'https://bad1.com' } },
        { eventId: 'evt-link-2', eventType: 'simulated_link_clicked', metadata: { url: 'https://bad2.com' } },
        { eventId: 'evt-link-3', eventType: 'simulated_link_clicked', metadata: { url: 'https://bad3.com' } } // Exceeds maxOccurrences (2)
      ];

      const result = calculateSecurityScore(events, { channel: 'email' });
      // 2 * 25 = 50 penalty -> 50
      expect(result.score).toBe(50);
      const factor = result.factors.find((f) => f.category === 'malicious_link_clicked');
      expect(factor.eventCount).toBe(2);
      expect(factor.scoreImpact).toBe(-50);
    });

    it('clamps final score strictly between 0 and 100', () => {
      // Rewards test: baseline 100 + threat_reported (+15) should not exceed 100
      const rewardsEvents = [{ eventType: 'threat_reported', metadata: {} }];
      const highResult = calculateSecurityScore(rewardsEvents, { channel: 'email' });
      expect(highResult.score).toBe(100);

      // Penalties test: Multiple severe penalties should not drop below 0
      const severeEvents = [
        { eventId: 'e1', eventType: 'simulated_link_clicked' }, // -25
        { eventId: 'e2', eventType: 'simulated_link_clicked' }, // -25
        { eventId: 'e3', eventType: 'credential_submitted' },   // -40
        { eventId: 'e4', eventType: 'reply_sent' },             // -15
        { eventId: 'e5', eventType: 'reply_sent' },             // -15
        { eventId: 'e6', eventType: 'attachment_interaction' } // -20
      ];
      // Total penalties: 25+25+40+15+15+20 = 140 -> 100 - 140 = -40 -> clamped to 0
      const lowResult = calculateSecurityScore(severeEvents, { channel: 'email' });
      expect(lowResult.score).toBe(0);
      expect(lowResult.riskLevel).toBe('critical');
    });

    it('correctly classifies risk bands across boundaries', () => {
      expect(getRiskLevel(100)).toBe('low');
      expect(getRiskLevel(80)).toBe('low');
      expect(getRiskLevel(79)).toBe('moderate');
      expect(getRiskLevel(60)).toBe('moderate');
      expect(getRiskLevel(59)).toBe('high');
      expect(getRiskLevel(40)).toBe('high');
      expect(getRiskLevel(39)).toBe('critical');
      expect(getRiskLevel(0)).toBe('critical');
    });

    it('supports all 4 simulation channels consistently', () => {
      const emailRes = calculateSecurityScore([{ eventType: 'simulated_link_clicked' }], { channel: 'email' });
      const chatRes = calculateSecurityScore([{ eventType: 'simulated_link_clicked' }], { channel: 'chat' });
      const smsRes = calculateSecurityScore([{ eventType: 'simulated_link_clicked' }], { channel: 'sms' });
      const webRes = calculateSecurityScore([{ eventType: 'virtual_link_clicked' }], { channel: 'website' });

      expect(emailRes.score).toBe(75);
      expect(chatRes.score).toBe(75);
      expect(smsRes.score).toBe(75);
      expect(webRes.score).toBe(75);
    });

    it('ignores unknown or malformed events safely', () => {
      const events = [
        null,
        undefined,
        {},
        { eventType: 'unknown_custom_action' },
        { eventType: 'simulated_link_clicked' }
      ];

      const result = calculateSecurityScore(events, { channel: 'email' });
      expect(result.score).toBe(75);
    });

    it('produces identical deterministic output for identical input', () => {
      const events = [
        { eventId: 'e1', eventType: 'simulated_link_clicked' },
        { eventId: 'e2', eventType: 'threat_reported' }
      ];

      const run1 = calculateSecurityScore(events, { channel: 'email' });
      const run2 = calculateSecurityScore(events, { channel: 'email' });

      expect(run1).toEqual(run2);
    });
  });

  // API Route Tests
  describe('Scoring API Endpoints', () => {
    let mockSessions = new Map();
    let mockEvents = [];
    let mockScores = new Map();

    beforeEach(() => {
      mockSessions.clear();
      mockEvents = [];
      mockScores.clear();

      vi.spyOn(Session, 'findOne').mockImplementation(async (q) => mockSessions.get(q.sessionId) || null);

      vi.spyOn(SimulationEvent, 'find').mockImplementation((q) => {
        const filtered = mockEvents.filter((e) => e.sessionId === q.sessionId);
        return {
          sort: () => Promise.resolve(filtered)
        };
      });

      vi.spyOn(SimulationEvent, 'create').mockImplementation(async (data) => {
        const doc = { ...data };
        mockEvents.push(doc);
        return doc;
      });

      vi.spyOn(BehaviorScore, 'findOne').mockImplementation(async (q) => mockScores.get(q.sessionId) || null);

      vi.spyOn(BehaviorScore, 'findOneAndUpdate').mockImplementation(async (filter, update) => {
        const existing = mockScores.get(filter.sessionId);
        const saved = {
          ...(existing || {}),
          ...update.$set,
          revision: update.$set.revision || 1,
          toJSON: function () {
            const copy = { ...this };
            delete copy.toJSON;
            return copy;
          }
        };
        mockScores.set(filter.sessionId, saved);
        return saved;
      });

      // Seed session
      mockSessions.set('sess-score-test-1', {
        sessionId: 'sess-score-test-1',
        scenarioId: 'scen-score-01',
        channel: 'email',
        status: 'reported'
      });

      // Seed events
      mockEvents.push({
        eventId: 'evt-1',
        sessionId: 'sess-score-test-1',
        eventType: 'message_opened',
        metadata: {}
      });
      mockEvents.push({
        eventId: 'evt-2',
        sessionId: 'sess-score-test-1',
        eventType: 'threat_reported',
        metadata: {}
      });
    });

    it('calculates and persists score via POST /api/sessions/:sessionId/score', async () => {
      const res = await request(app).post('/api/sessions/sess-score-test-1/score');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.score.score).toBe(100);
      expect(res.body.score.riskLevel).toBe('low');
      expect(res.body.score.status).toBe('final');
      expect(res.body.score.factors.length).toBeGreaterThan(0);
      expect(res.body.score.revision).toBe(1);
    });

    it('returns 404 for nonexistent session on POST /score', async () => {
      const res = await request(app).post('/api/sessions/sess-ghost-000/score');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('synthesizes a terminal event and scores successfully when terminal session has 0 prior events', async () => {
      mockSessions.set('sess-terminal-call-empty', {
        sessionId: 'sess-terminal-call-empty',
        scenarioId: 'scen-call-01',
        channel: 'call',
        status: 'safe_exit'
      });

      const res = await request(app).post('/api/sessions/sess-terminal-call-empty/score');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.score).toBeDefined();
      expect(res.body.score.channel).toBe('call');
    });

    it('returns 400 when session has no interaction events', async () => {
      mockSessions.set('sess-empty-events', {
        sessionId: 'sess-empty-events',
        scenarioId: 'scen-02',
        channel: 'chat',
        status: 'active'
      });

      const res = await request(app).post('/api/sessions/sess-empty-events/score');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/no scoreable interaction events/i);
    });

    it('retrieves stored score via GET /api/sessions/:sessionId/score', async () => {
      // Calculate first
      await request(app).post('/api/sessions/sess-score-test-1/score');

      const res = await request(app).get('/api/sessions/sess-score-test-1/score');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.score.score).toBe(100);
      expect(res.body.score.riskLevel).toBe('low');
    });

    it('returns 404 on GET /score if score has not yet been calculated', async () => {
      mockSessions.set('sess-unscored', {
        sessionId: 'sess-unscored',
        scenarioId: 'scen-03',
        channel: 'sms',
        status: 'completed'
      });

      const res = await request(app).get('/api/sessions/sess-unscored/score');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/behavior score has not been calculated/i);
    });

    it('recalculating score updates existing document and increments revision', async () => {
      // First score calculation
      const res1 = await request(app).post('/api/sessions/sess-score-test-1/score');
      expect(res1.body.score.revision).toBe(1);

      // Add a link click event
      mockEvents.push({
        eventId: 'evt-3',
        sessionId: 'sess-score-test-1',
        eventType: 'simulated_link_clicked'
      });

      // Second score calculation
      const res2 = await request(app).post('/api/sessions/sess-score-test-1/score');
      expect(res2.body.score.revision).toBe(2);
      expect(res2.body.score.score).toBe(90); // 100 - 25 + 15 = 90
    });
  });
});
