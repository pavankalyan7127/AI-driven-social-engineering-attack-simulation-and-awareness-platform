import express from 'express';
import crypto from 'crypto';
import Session from '../models/Session.js';
import SimulationEvent, { ALLOWED_EVENT_TYPES } from '../models/SimulationEvent.js';
import { sanitizeMetadata, isAuthorizedTerminalEvent } from '../validators/eventValidator.js';

const router = express.Router();

const SESSION_ID_REGEX = /^[a-zA-Z0-9_-]{3,128}$/;
const CLIENT_EVENT_ID_REGEX = /^[a-zA-Z0-9_-]{3,128}$/;

/**
 * POST /api/events
 * Persists a simulation interaction telemetry event in MongoDB.
 * Enforces session existence, lifecycle rules, metadata bounding, and sanitization.
 */
router.post('/', async (req, res, next) => {
  try {
    const { sessionId, eventType, clientEventId, clientTimestamp, metadata } = req.body;

    // 1. Validate sessionId
    if (!sessionId || typeof sessionId !== 'string' || !SESSION_ID_REGEX.test(sessionId.trim())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or missing sessionId format.'
      });
    }

    const cleanSessionId = sessionId.trim();

    // 2. Validate eventType
    if (!eventType || typeof eventType !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'eventType is required and must be a valid string.'
      });
    }

    const cleanEventType = eventType.trim();
    if (!ALLOWED_EVENT_TYPES.includes(cleanEventType)) {
      return res.status(400).json({
        success: false,
        error: `Unsupported eventType "${eventType}".`
      });
    }

    // 3. Find Session in MongoDB
    const session = await Session.findOne({ sessionId: cleanSessionId });
    if (!session) {
      return res.status(404).json({
        success: false,
        error: `Session "${cleanSessionId}" not found.`
      });
    }

    // 4. Session lifecycle validation & terminal race condition handling
    if (session.status !== 'active') {
      // Check if this event is an authorized final event for the session's terminal status
      const isTerminalMatch = isAuthorizedTerminalEvent(session.status, cleanEventType);

      if (!isTerminalMatch) {
        return res.status(409).json({
          success: false,
          error: `Cannot record interaction events for a terminal session (current status: "${session.status}").`
        });
      }

      // Check if this specific terminal event was already recorded for this session
      const alreadyRecordedTerminal = await SimulationEvent.findOne({
        sessionId: cleanSessionId,
        eventType: cleanEventType
      });

      if (alreadyRecordedTerminal) {
        return res.status(200).json({
          success: true,
          event: alreadyRecordedTerminal,
          message: 'Terminal event already recorded (idempotent).'
        });
      }
    }

    // 5. Check idempotency if clientEventId is provided
    if (clientEventId && typeof clientEventId === 'string' && CLIENT_EVENT_ID_REGEX.test(clientEventId)) {
      const existingEvent = await SimulationEvent.findOne({
        sessionId: cleanSessionId,
        clientEventId: clientEventId.trim()
      });

      if (existingEvent) {
        return res.status(200).json({
          success: true,
          event: existingEvent,
          message: 'Event already recorded (idempotent).'
        });
      }
    }

    // 6. Validate & sanitize metadata
    const metaResult = sanitizeMetadata(metadata);
    if (!metaResult.valid) {
      return res.status(400).json({
        success: false,
        error: metaResult.error
      });
    }

    // 7. Derive authoritative scenarioId and channel from session
    const scenarioId = session.scenarioId;
    const channel = session.channel;

    // 8. Generate backend eventId & timestamps
    const randomHex = crypto.randomBytes(4).toString('hex');
    const eventId = `evt-${Date.now()}-${randomHex}`;
    const now = new Date();

    let validClientTimestamp = null;
    if (clientTimestamp) {
      const parsedTime = new Date(clientTimestamp);
      if (!isNaN(parsedTime.getTime())) {
        validClientTimestamp = parsedTime;
      }
    }

    // 9. Persist in MongoDB
    const newEvent = await SimulationEvent.create({
      eventId,
      sessionId: cleanSessionId,
      scenarioId,
      channel,
      eventType: cleanEventType,
      timestamp: now,
      clientTimestamp: validClientTimestamp,
      clientEventId: clientEventId ? clientEventId.trim() : null,
      metadata: metaResult.sanitized,
      createdAt: now
    });

    return res.status(201).json({
      success: true,
      event: newEvent
    });
  } catch (err) {
    next(err);
  }
});

export default router;
