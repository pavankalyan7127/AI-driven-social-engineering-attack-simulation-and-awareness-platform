import express from 'express';
import multer from 'multer';
import {
  generateScenarioWithGroq,
  generateCallAttackerResponse,
  evaluateEmailReplyWithGroq,
  fallbackEmailReplyEvaluation
} from '../services/groqService.js';

const router = express.Router();

// Multer in-memory upload handler
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_FILES_COUNT = 3;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES_COUNT
  },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      const err = new Error(`Unsupported image type "${file.mimetype}". Allowed types: PNG, JPEG, WebP`);
      err.code = 'INVALID_MIME_TYPE';
      cb(err, false);
    }
  }
});

/**
 * POST /api/scenarios/generate
 * Generates an attack scenario using Groq AI.
 * Accepts JSON or multipart/form-data (with optional reference images).
 */
router.post('/generate', (req, res, next) => {
  upload.array('images', MAX_FILES_COUNT)(req, res, (uploadErr) => {
    if (uploadErr) {
      if (uploadErr.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: `File size exceeds the 5MB limit.`
        });
      }
      if (uploadErr.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          success: false,
          error: `Maximum ${MAX_FILES_COUNT} reference images allowed.`
        });
      }
      return res.status(400).json({
        success: false,
        error: uploadErr.message || 'Image upload error'
      });
    }
    next();
  });
}, async (req, res) => {
  try {
    const { prompt, channel } = req.body;

    // 1. Validate prompt
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required and must not be empty.'
      });
    }

    const trimmedPrompt = prompt.trim();
    if (trimmedPrompt.length < 5) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is too short. Please provide at least 5 characters describing the scenario.'
      });
    }

    if (trimmedPrompt.length > 2000) {
      return res.status(400).json({
        success: false,
        error: 'Prompt exceeds maximum limit of 2000 characters.'
      });
    }

    // 2. Validate channel (Optional: if omitted, AI automatically predicts channel)
    const ALLOWED_CHANNELS = ['email', 'chat', 'sms', 'website', 'whatsapp', 'instagram', 'telegram'];
    let normalizedChannel = null;

    if (channel !== undefined && channel !== null && String(channel).trim().length > 0) {
      if (typeof channel !== 'string') {
        return res.status(400).json({
          success: false,
          error: `Channel must be a string if provided. Allowed: ${ALLOWED_CHANNELS.join(', ')}.`
        });
      }

      normalizedChannel = channel.toLowerCase().trim();
      if (!ALLOWED_CHANNELS.includes(normalizedChannel)) {
        return res.status(400).json({
          success: false,
          error: `Unsupported channel "${channel}". Supported channels: ${ALLOWED_CHANNELS.join(', ')}.`
        });
      }
    }

    // 3. Generate Scenario via Groq Service
    const hasImages = Array.isArray(req.files) && req.files.length > 0;
    const result = await generateScenarioWithGroq({
      prompt: trimmedPrompt,
      channel: normalizedChannel,
      files: req.files,
      hasImages
    });

    return res.status(200).json({
      success: true,
      scenario: result.scenario,
      sessionId: result.sessionId,
      modelUsed: result.modelUsed,
      imageAnalysis: result.imageAnalysis
    });

  } catch (err) {
    console.error('[Scenario Route Error]:', err.message);
    const statusCode = err.statusCode || 500;
    let clientErrorMessage = err.message || 'An error occurred during scenario generation.';
    if (clientErrorMessage.includes('failed_generation') || clientErrorMessage.includes('json_validate_failed')) {
      const channelLabel = normalizedChannel ? normalizedChannel.charAt(0).toUpperCase() + normalizedChannel.slice(1) : 'Website';
      clientErrorMessage = `${channelLabel} scenario generation failed validation. Please retry.`;
    }

    return res.status(statusCode).json({
      success: false,
      error: clientErrorMessage,
      validationErrors: err.validationErrors || undefined
    });
  }
});

/**
 * POST /api/scenarios/call/respond
 * Dynamically analyzes user speech and generates real-time attacker dialogue
 * for active phone call simulations, checking for sensitive credential disclosure.
 */
router.post('/call/respond', async (req, res) => {
  try {
    const { userSpeech, dialogueHistory, callerName, personaContext, targetInformation } = req.body;

    if (!userSpeech || typeof userSpeech !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid "userSpeech" in request body.'
      });
    }

    const result = await generateCallAttackerResponse({
      userSpeech,
      dialogueHistory: Array.isArray(dialogueHistory) ? dialogueHistory : [],
      callerName: callerName || 'Fraud Investigation Agent',
      personaContext: personaContext || 'Authoritative fraud investigator demanding immediate verification.',
      targetInformation: targetInformation || 'credit card number, CVV, or PIN'
    });

    return res.status(200).json({
      success: true,
      attackerSpeech: result.attackerSpeech,
      sensitiveInfoDisclosed: result.sensitiveInfoDisclosed,
      explanation: result.explanation
    });
  } catch (err) {
    console.error('[Call Respond Route Error]:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to analyze user speech.',
      attackerSpeech: 'Sir, I need you to confirm your card details now or your account will be frozen.'
    });
  }
});

/**
 * POST /api/scenarios/email/evaluate-reply
 * Evaluates whether an email reply represents a positive termination (defense/confrontation),
 * a negative termination (compliance/credential disclosure), or should continue the simulation.
 */
router.post('/email/evaluate-reply', async (req, res) => {
  try {
    const { replyContent, emailSubject, emailBody, sender, scenarioContext } = req.body;

    if (!replyContent || typeof replyContent !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid "replyContent" in request body.'
      });
    }

    const result = await evaluateEmailReplyWithGroq({
      replyContent,
      emailSubject,
      emailBody,
      sender,
      scenarioContext
    });

    const statusMap = {
      positive_termination: 'safe_exit',
      negative_termination: 'completed',
      continue_simulation: null
    };

    const actionMap = {
      positive_termination: 'threat_confronted',
      negative_termination: 'risky_reply_sent',
      continue_simulation: 'reply_sent'
    };

    return res.status(200).json({
      success: true,
      decision: result.decision,
      explanation: result.explanation,
      confidence: result.confidence,
      status: statusMap[result.decision] || null,
      action: actionMap[result.decision] || 'reply_sent'
    });
  } catch (err) {
    console.error('[Email Evaluate Reply Route Error]:', err.message);
    const fallback = fallbackEmailReplyEvaluation(req.body?.replyContent);
    return res.status(200).json({
      success: true,
      decision: fallback.decision,
      explanation: fallback.explanation,
      confidence: fallback.confidence,
      status: fallback.decision === 'positive_termination' ? 'safe_exit' : (fallback.decision === 'negative_termination' ? 'completed' : null),
      action: fallback.decision === 'positive_termination' ? 'threat_confronted' : (fallback.decision === 'negative_termination' ? 'risky_reply_sent' : 'reply_sent')
    });
  }
});

export default router;
