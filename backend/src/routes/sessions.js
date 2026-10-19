import express from 'express';
import crypto from 'crypto';
import Session, { ALLOWED_CHANNELS, ALLOWED_TERMINAL_STATUSES } from '../models/Session.js';
import SimulationEvent from '../models/SimulationEvent.js';

const router = express.Router();

const SESSION_ID_REGEX = /^[a-zA-Z0-9_-]{3,128}$/;

/**
 * POST /api/sessions
 * Creates and persists a new simulation session in MongoDB.
 * Backend strictly controls sessionId, status ('active'), and timestamps.
 */
router.post('/', async (req, res, next) => {
  try {
    const { scenarioId, channel } = req.body;

    // 1. Validate scenarioId
    if (!scenarioId || typeof scenarioId !== 'string' || !scenarioId.trim()) {
      return res.status(400).json({
        success: false,
        error: 'scenarioId is required and must be a non-empty string.'
      });
    }

    // 2. Validate channel
    if (!channel || typeof channel !== 'string') {
      return res.status(400).json({
        success: false,
        error: `channel is required. Allowed channels: ${ALLOWED_CHANNELS.join(', ')}.`
      });
    }

    const normalizedChannel = channel.toLowerCase().trim();
    if (!ALLOWED_CHANNELS.includes(normalizedChannel)) {
      return res.status(400).json({
        success: false,
        error: `Unsupported channel "${channel}". Allowed channels: ${ALLOWED_CHANNELS.join(', ')}.`
      });
    }

    // 3. Generate backend-controlled Session ID & timestamps
    const randomSuffix = crypto.randomBytes(4).toString('hex');
    const sessionId = `sess-${normalizedChannel}-${Date.now()}-${randomSuffix}`;
    const now = new Date();

    // 4. Persist in MongoDB
    const session = await Session.create({
      sessionId,
      scenarioId: scenarioId.trim(),
      channel: normalizedChannel,
      status: 'active',
      startedAt: now,
      updatedAt: now,
      endedAt: null
    });

    return res.status(201).json({
      success: true,
      sessionId: session.sessionId,
      session
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/sessions/:sessionId
 * Retrieves an existing simulation session by its unique sessionId.
 */
router.get('/:sessionId', async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId || !SESSION_ID_REGEX.test(sessionId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid sessionId format.'
      });
    }

    const session = await Session.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({
        success: false,
        error: `Session "${sessionId}" not found.`
      });
    }

    return res.status(200).json({
      success: true,
      session
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/sessions/:sessionId/status
 * Updates a session's lifecycle status from active to a terminal status.
 * Enforces atomic state transition, idempotency, and terminal immutability.
 */
router.patch('/:sessionId/status', async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { status } = req.body;

    // 1. Validate sessionId format
    if (!sessionId || !SESSION_ID_REGEX.test(sessionId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid sessionId format.'
      });
    }

    // 2. Validate requested status
    if (!status || typeof status !== 'string') {
      return res.status(400).json({
        success: false,
        error: `status is required. Allowed terminal statuses: ${ALLOWED_TERMINAL_STATUSES.join(', ')}.`
      });
    }

    const requestedStatus = status.toLowerCase().trim();
    if (!ALLOWED_TERMINAL_STATUSES.includes(requestedStatus)) {
      return res.status(400).json({
        success: false,
        error: `Unsupported status "${status}". Allowed terminal transitions: ${ALLOWED_TERMINAL_STATUSES.join(', ')}.`
      });
    }

    const now = new Date();

    // 3. Atomic transition: only transition if current status is 'active'
    const updatedSession = await Session.findOneAndUpdate(
      { sessionId, status: 'active' },
      {
        $set: {
          status: requestedStatus,
          updatedAt: now,
          endedAt: now
        }
      },
      { new: true, runValidators: true }
    );

    if (updatedSession) {
      return res.status(200).json({
        success: true,
        session: updatedSession
      });
    }

    // 4. If no document was updated, inspect existing session
    const existingSession = await Session.findOne({ sessionId });
    if (!existingSession) {
      return res.status(404).json({
        success: false,
        error: `Session "${sessionId}" not found.`
      });
    }

    // Idempotent: repeating the exact same terminal status returns 200
    if (existingSession.status === requestedStatus) {
      return res.status(200).json({
        success: true,
        session: existingSession,
        message: 'Session status is already updated (idempotent).'
      });
    }

      // Conflict: attempting to transition from one terminal state to another, or reopen
      return res.status(409).json({
        success: false,
        error: `Cannot transition session from "${existingSession.status}" to "${requestedStatus}". Terminal sessions cannot be altered or reopened.`
      });
    } catch (err) {
      next(err);
    }
  });

/**
 * GET /api/sessions/:sessionId/events
 * Retrieves chronological persisted simulation events for a session.
 * Supports bounded pagination (default limit 50, max 200).
 */
router.get('/:sessionId/events', async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId || !SESSION_ID_REGEX.test(sessionId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid sessionId format.'
      });
    }

    // Verify that session exists
    const session = await Session.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({
        success: false,
        error: `Session "${sessionId}" not found.`
      });
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      SimulationEvent.find({ sessionId })
        .sort({ timestamp: 1, eventId: 1 })
        .skip(skip)
        .limit(limit),
      SimulationEvent.countDocuments({ sessionId })
    ]);

    return res.status(200).json({
      success: true,
      sessionId,
      count: events.length,
      total,
      page,
      limit,
      events
    });
  } catch (err) {
    next(err);
  }
});

export default router;
