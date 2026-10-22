import express from 'express';
import { generateDetectiveChallenge, scoreDetectiveChallenge } from '../services/detectiveService.js';

const router = express.Router();

/**
 * POST /api/detective/generate
 * Generates a 3-round Cyber Detective Challenge (mix of REAL and FAKE communications).
 */
router.post('/generate', async (req, res, next) => {
  try {
    const { prompt, channel = 'auto', language = 'auto' } = req.body || {};

    const challenge = await generateDetectiveChallenge({
      prompt: typeof prompt === 'string' ? prompt.trim() : '',
      channel,
      language
    });

    return res.status(200).json({
      success: true,
      challenge
    });
  } catch (err) {
    console.error('[Detective Generation Error]:', err.message);
    return next(err);
  }
});

/**
 * POST /api/detective/score
 * Evaluates the user's answers across the 3 rounds and returns the forensic triage report.
 */
router.post('/score', async (req, res, next) => {
  try {
    const { challengeId, channel, scenarioTitle, rounds, answers } = req.body || {};

    if (!Array.isArray(rounds) || rounds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid "rounds" array for detective challenge evaluation.'
      });
    }

    if (!Array.isArray(answers)) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid "answers" array.'
      });
    }

    const report = scoreDetectiveChallenge({
      challengeId: challengeId || `det-${Date.now()}`,
      channel: channel || 'email',
      scenarioTitle: scenarioTitle || 'Cyber Detective Challenge',
      rounds,
      answers
    });

    return res.status(200).json({
      success: true,
      report
    });
  } catch (err) {
    console.error('[Detective Score Error]:', err.message);
    return next(err);
  }
});

export default router;
