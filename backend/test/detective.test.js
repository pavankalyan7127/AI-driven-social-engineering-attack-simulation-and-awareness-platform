import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import {
  generateDetectiveChallenge,
  generateFallbackDetectiveChallenge,
  scoreDetectiveChallenge,
  sanitizeRealCommunication,
  normalizeRoundScenarioData
} from '../src/services/detectiveService.js';

describe('Cyber Detective Mode - Backend Service & API Tests', () => {
  describe('sanitizeRealCommunication and Golden Rule Enforcement', () => {
    it('strictly strips any URLs from REAL round communications and reinforces safe guidance', () => {
      const mockRealRound = {
        roundNumber: 2,
        type: 'REAL',
        title: 'Server Maintenance Notice',
        scenarioData: {
          emailData: {
            subject: 'Maintenance Notice',
            body: 'Please review schedule at https://intranet.company.net/status or visit www.company.com/portal'
          }
        },
        clues: {
          primaryIndicator: 'Sent with official link: https://intranet.company.net',
          redFlagsOrSafeguards: ['Check official link (https://intranet.company.net)'],
          forensicExplanation: 'You can verify at https://intranet.company.net'
        }
      };

      const sanitized = sanitizeRealCommunication(mockRealRound, 'email');
      expect(sanitized.scenarioData.emailData.body).not.toContain('https://intranet.company.net');
      expect(sanitized.scenarioData.emailData.body).not.toContain('www.company.com');
      expect(sanitized.clues.primaryIndicator).not.toContain('https://');
      expect(sanitized.clues.forensicExplanation).not.toContain('https://');
      expect(sanitized.clues.redFlagsOrSafeguards.some((s) => /Golden Rule|NO.*link|without.*link/i.test(s))).toBe(true);
    });

    it('ensures fallback REAL email communication contains ZERO links and valid sender object', () => {
      const challenge = generateFallbackDetectiveChallenge({
        prompt: 'Workplace cyber check',
        channel: 'email',
        language: 'English'
      });

      const realRound = challenge.rounds.find((r) => r.type === 'REAL');
      expect(realRound).toBeDefined();
      expect(realRound.scenarioData.emailData.body).not.toMatch(/https?:\/\//i);
      expect(realRound.scenarioData.emailData.sender).toBeDefined();
      expect(realRound.scenarioData.emailData.sender.email).toBe('it-operations@company.com');
      expect(realRound.scenarioData.emailData.senderName).toBe('Enterprise Infrastructure Team');
    });
  });

  describe('generateFallbackDetectiveChallenge', () => {
    it('generates a 3-round fallback challenge for CALL channel when requested or triggered', () => {
      const challenge = generateFallbackDetectiveChallenge({
        prompt: "I got a phone call from someone claiming to be from my bank's fraud prevention department. The caller said someone is trying to transfer $1,200 from my account right now, and they are asking me to confirm my 16-digit card number and CVV over the phone to stop it.",
        channel: 'call',
        language: 'English'
      });

      expect(challenge.channel).toBe('call');
      expect(challenge.rounds).toHaveLength(3);
      expect(challenge.rounds[0].scenarioData.callData).toBeDefined();
      expect(challenge.rounds[0].scenarioData.callData.callerName).toBeDefined();
      expect(challenge.rounds[0].scenarioData.callData.openingLine).toContain('16-digit card number');
      expect(challenge.rounds[0].type).toBe('FAKE');

      // REAL round in call
      const realRound = challenge.rounds.find((r) => r.type === 'REAL');
      expect(realRound).toBeDefined();
      expect(realRound.scenarioData.callData.callerName).toContain('Chase');
      expect(realRound.scenarioData.callData.openingLine).not.toMatch(/https?:\/\//i);
    });

    it('generates fallback challenges for whatsapp, instagram, telegram, chat and website channels', () => {
      const waChallenge = generateFallbackDetectiveChallenge({
        prompt: 'Manager WhatsApp message asking for gift cards',
        channel: 'whatsapp'
      });
      expect(waChallenge.channel).toBe('whatsapp');
      expect(waChallenge.platform).toBe('whatsapp_web');
      expect(waChallenge.rounds).toHaveLength(3);
      expect(waChallenge.rounds[0].scenarioData.conversations[0].contact).toBeDefined();
      expect(waChallenge.rounds[0].scenarioData.conversations[0].contact.name).toBe('David Miller (CEO)');

      const instaChallenge = generateFallbackDetectiveChallenge({
        prompt: 'Suspicious Instagram DM claiming copyright infringement',
        channel: 'instagram'
      });
      expect(instaChallenge.channel).toBe('instagram');
      expect(instaChallenge.platform).toBe('instagram_direct');
      expect(instaChallenge.rounds).toHaveLength(3);
      expect(instaChallenge.rounds[0].scenarioData.conversations[0].contact).toBeDefined();
      expect(instaChallenge.rounds[1].type).toBe('REAL');
      expect(instaChallenge.rounds[1].scenarioData.conversations[0].contact.isVerified).toBe(true);

      const teleChallenge = generateFallbackDetectiveChallenge({
        prompt: 'Movie download channel on Telegram with malware',
        channel: 'telegram'
      });
      expect(teleChallenge.channel).toBe('telegram');
      expect(teleChallenge.platform).toBe('telegram_web');
      expect(teleChallenge.rounds).toHaveLength(3);
      expect(teleChallenge.rounds[0].scenarioData.conversations[0].contact).toBeDefined();
      expect(teleChallenge.rounds[1].type).toBe('REAL');
      expect(teleChallenge.rounds[1].scenarioData.conversations[0].contact.isVerified).toBe(true);

      const chatChallenge = generateFallbackDetectiveChallenge({
        prompt: 'Internal company Slack message',
        channel: 'chat'
      });
      expect(chatChallenge.channel).toBe('chat');
      expect(chatChallenge.rounds).toHaveLength(3);

      const webChallenge = generateFallbackDetectiveChallenge({
        prompt: 'Phishing website login page',
        channel: 'website'
      });
      expect(webChallenge.channel).toBe('website');
      expect(webChallenge.rounds).toHaveLength(3);
      expect(webChallenge.rounds[0].scenarioData.pages).toBeDefined();
    });

    it('generates a 3-round fallback challenge for SMS channel with REAL and FAKE rounds', () => {
      const challenge = generateFallbackDetectiveChallenge({
        prompt: 'Bank KYC verification',
        channel: 'sms',
        language: 'English'
      });

      expect(challenge.channel).toBe('sms');
      expect(challenge.rounds).toHaveLength(3);
      expect(challenge.rounds[0].type).toBe('FAKE');
      expect(challenge.rounds[1].type).toBe('REAL');
      expect(challenge.rounds[2].type).toBe('FAKE');

      // Verify forensic clues structure
      for (const round of challenge.rounds) {
        expect(round.clues).toBeDefined();
        expect(round.clues.primaryIndicator).toBeDefined();
        expect(Array.isArray(round.clues.redFlagsOrSafeguards)).toBe(true);
        expect(round.clues.redFlagsOrSafeguards.length).toBeGreaterThan(0);
        expect(round.clues.forensicExplanation).toBeDefined();
      }

      // Verify channel cheat sheet
      expect(challenge.channelCheatSheet).toBeDefined();
      expect(challenge.channelCheatSheet.channel).toBe('sms');
      expect(challenge.channelCheatSheet.whatToLookFor.length).toBeGreaterThan(0);
    });

    it('generates email fallback challenge with authentic native script when requested in Tamil', () => {
      const challenge = generateFallbackDetectiveChallenge({
        prompt: 'வங்கி கணக்கு',
        channel: 'email',
        language: 'Tamil'
      });

      expect(challenge.channel).toBe('email');
      expect(challenge.rounds).toHaveLength(3);
      expect(challenge.rounds[0].scenarioData.emailData.body).toMatch(/[\u0B80-\u0BFF]/);
    });
  });

  describe('scoreDetectiveChallenge', () => {
    const mockRounds = [
      {
        roundNumber: 1,
        type: 'FAKE',
        title: 'Phishing Lure',
        clues: { primaryIndicator: 'Spoofed sender' }
      },
      {
        roundNumber: 2,
        type: 'REAL',
        title: 'Legitimate Notice',
        clues: { primaryIndicator: 'Official domain' }
      },
      {
        roundNumber: 3,
        type: 'FAKE',
        title: 'Invoice Lure',
        clues: { primaryIndicator: 'Double extension' }
      }
    ];

    it('awards a perfect score of 100 with sweep bonus when all 3 rounds are correctly triaged', () => {
      const answers = [
        { roundNumber: 1, userVerdict: 'attack' },     // Correct on FAKE (+30)
        { roundNumber: 2, userVerdict: 'legitimate' }, // Correct on REAL (+30)
        { roundNumber: 3, userVerdict: 'attack' }      // Correct on FAKE (+30)
      ];

      const report = scoreDetectiveChallenge({
        challengeId: 'det-test-1',
        channel: 'email',
        rounds: mockRounds,
        answers
      });

      expect(report.score).toBe(100);
      expect(report.correctCount).toBe(3);
      expect(report.sweepBonus).toBe(10);
      expect(report.accuracyPercentage).toBe(100);
      expect(report.badge.title).toBe('Master Cyber Detective');
      expect(report.badge.class).toBe('master');
      expect(report.metrics.attacksCaught).toBe(2);
      expect(report.metrics.attacksCompromised).toBe(0);
      expect(report.metrics.falseAlarms).toBe(0);
    });

    it('scores compromised outcome when user trusts a fake attack as legitimate', () => {
      const answers = [
        { roundNumber: 1, userVerdict: 'legitimate' }, // Compromised on FAKE (0 pts)
        { roundNumber: 2, userVerdict: 'legitimate' }, // Correct on REAL (+30)
        { roundNumber: 3, userVerdict: 'attack' }      // Correct on FAKE (+30)
      ];

      const report = scoreDetectiveChallenge({
        challengeId: 'det-test-2',
        channel: 'email',
        rounds: mockRounds,
        answers
      });

      expect(report.score).toBe(60);
      expect(report.correctCount).toBe(2);
      expect(report.sweepBonus).toBe(0);
      expect(report.badge.class).toBe('cautious');
      expect(report.metrics.attacksCompromised).toBe(1);
      expect(report.roundBreakdowns[0].verdictResult).toBe('compromised');
    });

    it('awards partial credit for a false positive when user flags a real notice as an attack', () => {
      const answers = [
        { roundNumber: 1, userVerdict: 'attack' }, // Correct on FAKE (+30)
        { roundNumber: 2, userVerdict: 'attack' }, // False Positive on REAL (+10)
        { roundNumber: 3, userVerdict: 'attack' }  // Correct on FAKE (+30)
      ];

      const report = scoreDetectiveChallenge({
        challengeId: 'det-test-3',
        channel: 'email',
        rounds: mockRounds,
        answers
      });

      expect(report.score).toBe(70);
      expect(report.correctCount).toBe(2);
      expect(report.metrics.falseAlarms).toBe(1);
      expect(report.badge.title).toBe('Proficient Security Analyst');
      expect(report.roundBreakdowns[1].verdictResult).toBe('false_positive');
    });
  });

  describe('API Endpoints Integration: /api/detective', () => {
    it('POST /api/detective/generate returns a 3-round challenge', async () => {
      const res = await request(app)
        .post('/api/detective/generate')
        .send({
          prompt: 'Urgent Bank KYC notice',
          channel: 'sms',
          language: 'English'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.challenge).toBeDefined();
      expect(res.body.challenge.rounds).toHaveLength(3);
      expect(res.body.challenge.channelCheatSheet).toBeDefined();
    }, 15000);

    it('POST /api/detective/score validates missing rounds and returns 400', async () => {
      const res = await request(app)
        .post('/api/detective/score')
        .send({ answers: [] });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/Missing or invalid "rounds" array/i);
    });

    it('POST /api/detective/score evaluates user answers and returns forensic triage report', async () => {
      const rounds = [
        { roundNumber: 1, type: 'REAL', clues: { primaryIndicator: 'Official header' } },
        { roundNumber: 2, type: 'FAKE', clues: { primaryIndicator: 'Malicious link' } },
        { roundNumber: 3, type: 'FAKE', clues: { primaryIndicator: 'Spoofed sender' } }
      ];

      const answers = [
        { roundNumber: 1, userVerdict: 'legitimate' },
        { roundNumber: 2, userVerdict: 'attack' },
        { roundNumber: 3, userVerdict: 'attack' }
      ];

      const res = await request(app)
        .post('/api/detective/score')
        .send({
          challengeId: 'det-api-test',
          channel: 'sms',
          scenarioTitle: 'Bank Fraud Triage',
          rounds,
          answers
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.report).toBeDefined();
      expect(res.body.report.score).toBe(100);
      expect(res.body.report.badge.title).toBe('Master Cyber Detective');
      expect(res.body.report.roundBreakdowns).toHaveLength(3);
    });
  });
});
