import express from 'express';
import multer from 'multer';
import { generateScenarioWithGroq } from '../services/groqService.js';

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

    // 2. Validate channel
    if (!channel || typeof channel !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Channel is required. Allowed channels: email, chat, sms, website.'
      });
    }

    const normalizedChannel = channel.toLowerCase().trim();
    const ALLOWED_CHANNELS = ['email', 'chat', 'sms', 'website'];
    if (!ALLOWED_CHANNELS.includes(normalizedChannel)) {
      return res.status(400).json({
        success: false,
        error: `Unsupported channel "${channel}". Supported channels: ${ALLOWED_CHANNELS.join(', ')}.`
      });
    }

    // 3. Generate Scenario via Groq Service
    const hasImages = Array.isArray(req.files) && req.files.length > 0;
    const result = await generateScenarioWithGroq({
      prompt: trimmedPrompt,
      channel: normalizedChannel,
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
    return res.status(statusCode).json({
      success: false,
      error: err.message || 'An error occurred during scenario generation.',
      validationErrors: err.validationErrors || undefined
    });
  }
});

export default router;
