import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import Session from '../src/models/Session.js';
import SimulationEvent from '../src/models/SimulationEvent.js';
import BehaviorScore from '../src/models/BehaviorScore.js';
import AwarenessReport from '../src/models/AwarenessReport.js';
import {
  sanitizeEventsForReport,
  validateReportPayload,
  generateAwarenessReport,
  getAwarenessReport,
  REPORT_VERSION
} from '../src/services/awarenessReportService.js';

describe('AI Awareness and Remediation Report Service & API Tests', () => {
  describe('sanitizeEventsForReport', () => {
    it('sanitizes events and strips raw passwords, full URLs, and sensitive tokens', () => {
      const rawEvents = [
        {
          eventType: 'message_opened',
          timestamp: new Date().toISOString(),
          metadata: { subject: 'Urgent notice', email: 'victim@target.edu' }
        },
        {
          eventType: 'simulated_link_clicked',
          timestamp: new Date().toISOString(),
          metadata: {
            url: 'https://malicious-credential-harvesting-site.xyz/login?token=secret123456'
          }
        },
        {
          eventType: 'simulated_form_submitted',
          timestamp: new Date().toISOString(),
          metadata: {
            username: 'alice',
            password: 'SuperSecretPassword99!',
            otp: '883921'
          }
        },
        {
          eventType: 'threat_reported',
          timestamp: new Date().toISOString(),
          metadata: {
            indicators: {
              suspiciousSender: true,
              credentialHarvestLink: true,
              urgentDeadline: false
            }
          }
        }
      ];

      const sanitized = sanitizeEventsForReport(rawEvents);
      expect(sanitized).toHaveLength(4);

      // Verify no passwords or tokens leaked
      const stringified = JSON.stringify(sanitized);
      expect(stringified).not.toContain('SuperSecretPassword99!');
      expect(stringified).not.toContain('secret123456');
      expect(stringified).not.toContain('https://malicious-credential-harvesting-site.xyz');
      expect(stringified).not.toContain('883921');

      // Verify descriptions are educational and safe
      expect(sanitized[1].description).toMatch(/clicked an unverified simulated link/i);
      expect(sanitized[2].description).toMatch(/submitted input into a simulated deceptive form/i);
      expect(sanitized[3].metadata.indicatorsReported).toContain('suspiciousSender');
      expect(sanitized[3].metadata.indicatorsReported).toContain('credentialHarvestLink');
    });

    it('handles empty or malformed events gracefully', () => {
      expect(sanitizeEventsForReport([])).toEqual([]);
      expect(sanitizeEventsForReport(null)).toEqual([]);
      expect(sanitizeEventsForReport(undefined)).toEqual([]);
    });
  });

  describe('validateReportPayload', () => {
    it('accepts a valid report object', () => {
      const valid = {
        summary: 'The user recognized urgent threat cues and reported the email.',
        strengths: ['Identified mismatched sender domain', 'Did not submit credentials'],
        riskyBehaviors: ['Clicked on the initial simulated phishing link'],
        threatIndicators: ['Urgent deadline pressure', 'Unfamiliar external domain'],
        recommendations: [
          'Verify sender identities using internal directory.',
          'Never submit credentials on unverified third-party pages.'
        ],
        keyEvents: [
          { eventType: 'message_opened', description: 'Opened suspicious email' }
        ]
      };

      const result = validateReportPayload(valid);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.sanitized.summary).toBe(valid.summary);
      expect(result.sanitized.strengths).toEqual(valid.strengths);
    });

    it('rejects missing summary', () => {
      const invalid = {
        strengths: [],
        riskyBehaviors: [],
        threatIndicators: [],
        recommendations: ['Do not click unknown links.']
      };

      const result = validateReportPayload(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('summary is required'))).toBe(true);
    });

    it('rejects non-array list fields', () => {
      const invalid = {
        summary: 'Good attempt.',
        strengths: 'Strong passwords',
        riskyBehaviors: []
      };

      const result = validateReportPayload(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('strengths must be an array'))).toBe(true);
    });

    it('provides sensible fallback recommendations if none supplied', () => {
      const data = {
        summary: 'Awareness evaluation summary.',
        strengths: [],
        riskyBehaviors: [],
        threatIndicators: [],
        recommendations: []
      };

      const result = validateReportPayload(data);
      expect(result.valid).toBe(true);
      expect(result.sanitized.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Service & API Endpoints Integration', () => {
    let mockSessions;
    let mockEvents;
    let mockScores;
    let mockReports;
    let mockGroqClient;

    beforeEach(() => {
      mockSessions = new Map();
      mockEvents = [];
      mockScores = new Map();
      mockReports = new Map();

      // Mock Session.findOne
      vi.spyOn(Session, 'findOne').mockImplementation(async (filter) => {
        return mockSessions.get(filter.sessionId) || null;
      });

      // Mock SimulationEvent.find
      vi.spyOn(SimulationEvent, 'find').mockImplementation((filter) => {
        const events = mockEvents.filter((e) => e.sessionId === filter.sessionId);
        return {
          sort: () => Promise.resolve(events)
        };
      });

      // Mock BehaviorScore.findOne
      vi.spyOn(BehaviorScore, 'findOne').mockImplementation(async (filter) => {
        return mockScores.get(filter.sessionId) || null;
      });

      // Mock AwarenessReport.findOne
      vi.spyOn(AwarenessReport, 'findOne').mockImplementation(async (filter) => {
        return mockReports.get(filter.sessionId) || null;
      });

      // Mock AwarenessReport.findOneAndUpdate
      vi.spyOn(AwarenessReport, 'findOneAndUpdate').mockImplementation(async (filter, update) => {
        const existing = mockReports.get(filter.sessionId);
        const saved = {
          ...(existing || {}),
          ...update.$set,
          toJSON: function () {
            const copy = { ...this };
            delete copy.toJSON;
            return copy;
          }
        };
        mockReports.set(filter.sessionId, saved);
        return saved;
      });

      // Seed valid session
      mockSessions.set('sess-rep-test-01', {
        sessionId: 'sess-rep-test-01',
        scenarioId: 'scen-email-01',
        channel: 'email',
        status: 'reported'
      });

      // Seed valid score
      mockScores.set('sess-rep-test-01', {
        sessionId: 'sess-rep-test-01',
        scenarioId: 'scen-email-01',
        channel: 'email',
        score: 90,
        riskLevel: 'low',
        factors: [
          { category: 'threat_reported', scoreImpact: 15, description: 'Threat reported' },
          { category: 'malicious_link_clicked', scoreImpact: -25, description: 'Clicked link' }
        ],
        scoringVersion: '1.0.0',
        revision: 1
      });

      // Seed events
      mockEvents.push({
        eventId: 'evt-1',
        sessionId: 'sess-rep-test-01',
        eventType: 'message_opened',
        timestamp: new Date()
      });
      mockEvents.push({
        eventId: 'evt-2',
        sessionId: 'sess-rep-test-01',
        eventType: 'threat_reported',
        timestamp: new Date()
      });

      // Default mock Groq client
      mockGroqClient = {
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue({
              choices: [
                {
                  message: {
                    content: JSON.stringify({
                      summary: 'You demonstrated strong security vigilance by reporting this phishing attempt.',
                      strengths: ['Identified deceptive sender and reported the threat.'],
                      riskyBehaviors: [],
                      threatIndicators: ['Urgent IT account verification request.'],
                      recommendations: [
                        'Always verify unsolicited emails through internal directory.',
                        'Forward suspected phishing to infosec.'
                      ],
                      keyEvents: [
                        { eventType: 'threat_reported', description: 'Reported threat' }
                      ]
                    })
                  }
                }
              ]
            })
          }
        }
      };
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('returns 404 for nonexistent session on POST /api/sessions/:sessionId/report', async () => {
      const res = await request(app).post('/api/sessions/sess-ghost/report');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/session "sess-ghost" not found/i);
    });

    it('returns 400 if session is still in active state', async () => {
      mockSessions.set('sess-active-01', {
        sessionId: 'sess-active-01',
        scenarioId: 'scen-01',
        channel: 'chat',
        status: 'active'
      });

      const res = await request(app).post('/api/sessions/sess-active-01/report');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/active session/i);
    });

    it('returns 400 if session has not yet been scored', async () => {
      mockSessions.set('sess-no-score', {
        sessionId: 'sess-no-score',
        scenarioId: 'scen-02',
        channel: 'sms',
        status: 'completed'
      });

      const res = await request(app).post('/api/sessions/sess-no-score/report');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/not been scored yet/i);
    });

    it('generates and persists report via service with valid Groq client', async () => {
      const { report, cached } = await generateAwarenessReport({
        sessionId: 'sess-rep-test-01',
        customGroqClient: mockGroqClient
      });

      expect(cached).toBe(false);
      expect(report.sessionId).toBe('sess-rep-test-01');
      expect(report.score).toBe(90);
      expect(report.riskLevel).toBe('low');
      expect(report.scoreRevision).toBe(1);
      expect(report.status).toBe('completed');
      expect(report.summary).toContain('strong security vigilance');
      expect(report.strengths).toHaveLength(1);
      expect(mockGroqClient.chat.completions.create).toHaveBeenCalledTimes(1);
    });

    it('returns matching cached report without calling Groq a second time', async () => {
      // First generation
      const first = await generateAwarenessReport({
        sessionId: 'sess-rep-test-01',
        customGroqClient: mockGroqClient
      });
      expect(first.cached).toBe(false);
      expect(mockGroqClient.chat.completions.create).toHaveBeenCalledTimes(1);

      // Second call for same session & score revision
      const second = await generateAwarenessReport({
        sessionId: 'sess-rep-test-01',
        customGroqClient: mockGroqClient
      });

      expect(second.cached).toBe(true);
      expect(second.report.sessionId).toBe('sess-rep-test-01');
      expect(mockGroqClient.chat.completions.create).toHaveBeenCalledTimes(1); // Not called again!
    });

    it('generates a new report if scoreRevision changes (e.g. re-scoring)', async () => {
      // First generation (scoreRevision = 1)
      await generateAwarenessReport({
        sessionId: 'sess-rep-test-01',
        customGroqClient: mockGroqClient
      });
      expect(mockGroqClient.chat.completions.create).toHaveBeenCalledTimes(1);

      // Score updated to revision 2
      const score = mockScores.get('sess-rep-test-01');
      score.revision = 2;
      score.score = 65;
      score.riskLevel = 'moderate';

      // Second call generates new report for updated score revision
      const updated = await generateAwarenessReport({
        sessionId: 'sess-rep-test-01',
        customGroqClient: mockGroqClient
      });

      expect(updated.cached).toBe(false);
      expect(updated.report.scoreRevision).toBe(2);
      expect(updated.report.score).toBe(65);
      expect(mockGroqClient.chat.completions.create).toHaveBeenCalledTimes(2);
    });

    it('safely handles concurrent generation calls with in-flight deduplication', async () => {
      let resolveGroq;
      const delayedPromise = new Promise((resolve) => {
        resolveGroq = resolve;
      });

      mockGroqClient.chat.completions.create = vi.fn().mockImplementation(() => delayedPromise);

      // Trigger two parallel requests
      const p1 = generateAwarenessReport({
        sessionId: 'sess-rep-test-01',
        customGroqClient: mockGroqClient
      });
      const p2 = generateAwarenessReport({
        sessionId: 'sess-rep-test-01',
        customGroqClient: mockGroqClient
      });

      // Complete the Groq call
      resolveGroq({
        choices: [
          {
            message: {
              content: JSON.stringify({
                summary: 'Concurrent report summary.',
                strengths: ['Vigilant response'],
                riskyBehaviors: [],
                threatIndicators: ['Phishing cue'],
                recommendations: ['Follow company guidelines']
              })
            }
          }
        ]
      });

      const [r1, r2] = await Promise.all([p1, p2]);

      expect(r1.report.sessionId).toBe('sess-rep-test-01');
      expect(r2.report.sessionId).toBe('sess-rep-test-01');
      expect(mockGroqClient.chat.completions.create).toHaveBeenCalledTimes(1);
    });

    it('rejects malformed JSON from Groq with 422', async () => {
      mockGroqClient.chat.completions.create.mockResolvedValueOnce({
        choices: [{ message: { content: 'Not valid JSON at all.' } }]
      });

      await expect(
        generateAwarenessReport({
          sessionId: 'sess-rep-test-01',
          customGroqClient: mockGroqClient
        })
      ).rejects.toMatchObject({
        statusCode: 422,
        message: expect.stringMatching(/malformed json/i)
      });

      // Verify BehaviorScore and events remain intact in MongoDB
      expect(mockScores.get('sess-rep-test-01')).toBeDefined();
      expect(mockEvents.length).toBe(2);
    });

    it('rejects invalid report schema from Groq with 422', async () => {
      mockGroqClient.chat.completions.create.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                summary: '', // Invalid empty summary
                strengths: 'not an array'
              })
            }
          }
        ]
      });

      await expect(
        generateAwarenessReport({
          sessionId: 'sess-rep-test-01',
          customGroqClient: mockGroqClient
        })
      ).rejects.toMatchObject({
        statusCode: 422,
        message: expect.stringMatching(/failed schema validation/i)
      });
    });

    it('handles provider failures safely with 502/503 and allows subsequent retry', async () => {
      mockGroqClient.chat.completions.create.mockRejectedValueOnce(
        new Error('Groq rate limit exceeded')
      );

      // First attempt fails
      await expect(
        generateAwarenessReport({
          sessionId: 'sess-rep-test-01',
          customGroqClient: mockGroqClient
        })
      ).rejects.toMatchObject({
        statusCode: 502,
        message: expect.stringMatching(/rate limit/i)
      });

      // Score and events remain preserved
      expect(mockScores.get('sess-rep-test-01')).toBeDefined();

      // Retry succeeds
      mockGroqClient.chat.completions.create.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                summary: 'Report generated successfully on retry.',
                strengths: ['Identified threat'],
                riskyBehaviors: [],
                threatIndicators: ['Mismatched domain'],
                recommendations: ['Double-check URLs']
              })
            }
          }
        ]
      });

      const retryResult = await generateAwarenessReport({
        sessionId: 'sess-rep-test-01',
        customGroqClient: mockGroqClient
      });

      expect(retryResult.report.summary).toContain('Report generated successfully on retry');
    });

    it('retrieves saved report via GET /api/sessions/:sessionId/report without calling Groq', async () => {
      // Seed a stored report
      mockReports.set('sess-rep-test-01', {
        sessionId: 'sess-rep-test-01',
        scenarioId: 'scen-email-01',
        channel: 'email',
        score: 90,
        riskLevel: 'low',
        scoreRevision: 1,
        scoringVersion: '1.0.0',
        reportVersion: REPORT_VERSION,
        summary: 'Existing saved report summary.',
        strengths: ['Reported attack'],
        riskyBehaviors: [],
        threatIndicators: ['Urgency'],
        recommendations: ['Stay vigilant'],
        keyEvents: [],
        status: 'completed',
        toJSON: function () {
          return { ...this };
        }
      });

      const res = await request(app).get('/api/sessions/sess-rep-test-01/report');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.report.summary).toBe('Existing saved report summary.');
      expect(res.body.isStale).toBe(false);
      expect(mockGroqClient.chat.completions.create).not.toHaveBeenCalled();
    });

    it('returns 404 on GET /report when no report exists for session', async () => {
      const res = await request(app).get('/api/sessions/sess-rep-test-01/report');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/awareness report not found/i);
    });

    it('indicates isStale = true on GET /report if score revision has been incremented', async () => {
      // Seed report for revision 1
      mockReports.set('sess-rep-test-01', {
        sessionId: 'sess-rep-test-01',
        scenarioId: 'scen-email-01',
        channel: 'email',
        score: 90,
        riskLevel: 'low',
        scoreRevision: 1,
        scoringVersion: '1.0.0',
        reportVersion: REPORT_VERSION,
        summary: 'Revision 1 report summary.',
        strengths: [],
        riskyBehaviors: [],
        threatIndicators: [],
        recommendations: ['Be careful'],
        keyEvents: [],
        status: 'completed',
        toJSON: function () {
          return { ...this };
        }
      });

      // Score has incremented to revision 2
      const score = mockScores.get('sess-rep-test-01');
      score.revision = 2;

      const res = await request(app).get('/api/sessions/sess-rep-test-01/report');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.isStale).toBe(true);
      expect(res.body.report.scoreRevision).toBe(1);
    });
  });
});
