import Session from '../models/Session.js';
import SimulationEvent from '../models/SimulationEvent.js';
import BehaviorScore from '../models/BehaviorScore.js';
import {
  validateTerminationRules,
  generateDefaultTerminationRules,
  PASSIVE_EVENTS
} from '../validators/terminationRulesValidator.js';
import { getRiskLevel } from '../config/scoringConfig.js';

export const FORMULA_VERSION = '2.0.0';

/**
 * Normalizes raw simulation events into canonical behavior event types.
 */
export function normalizeBehaviorEvent(event) {
  if (!event || !event.eventType) return null;
  const rawType = String(event.eventType).toLowerCase().trim();
  const metadata = event.metadata || {};

  switch (rawType) {
    case 'simulated_link_clicked':
    case 'virtual_link_clicked':
    case 'link_clicked':
      return {
        eventType: 'simulated_link_clicked',
        isRisky: metadata.targetPhish !== false,
        metadata
      };

    case 'credential_submitted':
      return {
        eventType: 'credential_submitted',
        isRisky: true,
        metadata
      };

    case 'simulated_form_submitted':
    case 'form_submitted':
      return {
        eventType: 'simulated_form_submitted',
        isRisky: metadata.hasProvidedInput !== false,
        metadata
      };

    case 'threat_reported':
    case 'user_reported_phish':
    case 'user_reported_chat':
    case 'user_reported_sms':
    case 'user_reported_page':
      return {
        eventType: 'threat_reported',
        isProtective: true,
        metadata
      };

    case 'safe_exit':
    case 'user_blocked_sender':
    case 'message_deleted':
    case 'message_archived':
      return {
        eventType: rawType,
        isProtective: true,
        metadata
      };

    case 'observation_window_elapsed':
      return {
        eventType: 'observation_window_elapsed',
        isProtective: true,
        metadata
      };

    default:
      return {
        eventType: rawType,
        isPassive: PASSIVE_EVENTS.includes(rawType),
        metadata
      };
  }
}

/**
 * Checks whether an event matches a termination condition rule.
 */
export function eventMatchesCondition(event, condition, channel) {
  if (!event || !condition) return false;

  const normalizedEvent = (event.eventType && (typeof event.isRisky === 'boolean' || typeof event.isProtective === 'boolean'))
    ? event
    : normalizeBehaviorEvent(event);

  if (!normalizedEvent) return false;

  // Never match passive events to risky terminal conditions
  if (normalizedEvent.isPassive) return false;

  // 1. Observation window conditions are strictly evaluated against server timestamps
  if (condition.trigger === 'observation_window_elapsed' || condition.eventType === 'observation_window_elapsed') {
    return false;
  }

  const targetType = condition.eventType;
  if (!targetType) return false;

  // Direct match
  if (normalizedEvent.eventType === targetType) return true;

  // Canonical aliases
  if (
    (targetType === 'simulated_link_clicked' || targetType === 'virtual_link_clicked') &&
    normalizedEvent.eventType === 'simulated_link_clicked'
  ) {
    return true;
  }

  if (
    (targetType === 'threat_reported' || targetType.startsWith('user_reported_')) &&
    normalizedEvent.eventType === 'threat_reported'
  ) {
    return true;
  }

  const safeExitGroup = ['safe_exit', 'user_blocked_sender', 'message_deleted', 'message_archived'];
  if (safeExitGroup.includes(targetType) && safeExitGroup.includes(normalizedEvent.eventType)) {
    return true;
  }

  if (
    (targetType === 'simulated_form_submitted' || targetType === 'credential_submitted') &&
    (normalizedEvent.eventType === 'simulated_form_submitted' || normalizedEvent.eventType === 'credential_submitted')
  ) {
    return true;
  }

  return false;
}

/**
 * Evaluates recorded simulation events against the scenario's termination rules.
 * Pure evaluation function testable independently of DB.
 * 
 * @param {Array} events - Chronological array of simulation events
 * @param {Object} terminationRules - Validated termination rules
 * @param {string} channel - Channel of simulation ('email'|'chat'|'sms'|'website')
 * @param {Object} options - { manualEnd, elapsedSeconds, observationStartedAt }
 * @returns {Object} { matched: boolean, outcome, condition, evidence, reason }
 */
export function evaluateTerminationRules(events = [], terminationRules, channel = 'email', options = {}) {
  const { manualEnd = false, elapsedSeconds = null } = options;

  const validRules = terminationRules && Array.isArray(terminationRules.positiveConditions)
    ? terminationRules
    : generateDefaultTerminationRules(channel);

  const normalizedEvents = events
    .map(normalizeBehaviorEvent)
    .filter(Boolean);

  // Chronological inspection: First valid terminal outcome wins
  for (const evt of normalizedEvents) {
    // 1. Check negative conditions first for each event (active risky action)
    for (const negRule of validRules.negativeConditions || []) {
      if (eventMatchesCondition(evt, negRule, channel)) {
        // Confirm it's not a harmless passive viewing event
        if (!evt.isPassive) {
          return {
            matched: true,
            outcome: 'negative',
            condition: negRule,
            sessionStatus: 'completed',
            evidence: {
              triggerEvent: evt.eventType,
              metadata: evt.metadata,
              conditionId: negRule.id,
              points: negRule.points
            },
            reason: negRule.explanation || negRule.label || 'Negative risk condition triggered.'
          };
        }
      }
    }

    // 2. Check positive conditions for the event (active protective action)
    for (const posRule of validRules.positiveConditions || []) {
      if (eventMatchesCondition(evt, posRule, channel)) {
        let mappedStatus = 'completed';
        if (evt.eventType === 'threat_reported' || (typeof evt.eventType === 'string' && evt.eventType.startsWith('user_reported_'))) {
          mappedStatus = 'reported';
        } else if (
          evt.eventType === 'safe_exit' ||
          evt.eventType === 'user_blocked_sender' ||
          evt.eventType === 'message_deleted' ||
          evt.eventType === 'message_archived'
        ) {
          mappedStatus = 'safe_exit';
        }

        return {
          matched: true,
          outcome: 'positive',
          condition: posRule,
          sessionStatus: mappedStatus,
          evidence: {
            triggerEvent: evt.eventType,
            metadata: evt.metadata,
            conditionId: posRule.id,
            points: posRule.points
          },
          reason: posRule.explanation || posRule.label || 'Positive protective condition satisfied.'
        };
      }
    }
  }

  // 3. Check Observation Window Condition if elapsed
  const observationRule = (validRules.positiveConditions || []).find(
    (r) => r.trigger === 'observation_window_elapsed' || r.eventType === 'observation_window_elapsed'
  );

  const windowDuration = validRules.observationWindowSeconds ||
                         validRules.observationWindow?.durationSeconds ||
                         120;
  if (observationRule && elapsedSeconds !== null && elapsedSeconds >= windowDuration) {
    // Ensure no prior risky event was recorded during window
    const hadRiskyEvent = normalizedEvents.some((e) => e.isRisky);
    if (!hadRiskyEvent) {
      return {
        matched: true,
        outcome: 'positive',
        condition: observationRule,
        sessionStatus: 'safe_exit',
        evidence: {
          triggerEvent: 'observation_window_elapsed',
          elapsedSeconds,
          windowDuration,
          conditionId: observationRule.id,
          points: observationRule.points
        },
        reason: observationRule.explanation || 'Observation window elapsed without interacting with threat.'
      };
    }
  }

  // 4. Handle Manual End Simulation
  if (manualEnd) {
    return {
      matched: true,
      outcome: 'incomplete',
      condition: null,
      sessionStatus: 'completed',
      evidence: {
        triggerEvent: 'manual_end_simulation',
        eventCount: normalizedEvents.length
      },
      reason: 'Simulation ended manually before a scenario-defined outcome was reached.'
    };
  }

  // No terminal condition met yet
  return {
    matched: false,
    outcome: null,
    condition: null,
    sessionStatus: 'active',
    evidence: null,
    reason: 'Simulation active. No termination conditions satisfied.'
  };
}

/**
 * Authoritative Scenario-Driven Score Formula:
 * 
 * Normalized 0–100 score based strictly on scenario rules and observed behavior:
 * - Positive Outcome:
 *     score = 75 + round(25 * (condition.points / maxPositivePoints)) -> [75, 100]
 * - Negative Outcome:
 *     score = max(0, 45 - round(45 * (condition.points / maxNegativePoints))) -> [0, 45]
 * - Incomplete Outcome:
 *     score = 50 (neutral, no penalty, no reward)
 * - Abandoned Outcome:
 *     score = 25 (uncompleted/early abandonment)
 * 
 * @param {Object} outcomeResult - Result from evaluateTerminationRules
 * @param {Object} terminationRules - Scenario termination rules
 * @param {Array} events - Simulation events
 * @returns {Object} Computed score breakdown
 */
export function computeScenarioScore(outcomeResult, terminationRules, events = []) {
  const outcome = outcomeResult?.outcome || 'incomplete';
  const condition = outcomeResult?.condition || null;

  const positiveRules = terminationRules?.positiveConditions || [];
  const negativeRules = terminationRules?.negativeConditions || [];

  const maxPosPoints = positiveRules.reduce((max, r) => Math.max(max, Number(r.points) || 25), 25);
  const maxNegPoints = negativeRules.reduce((max, r) => Math.max(max, Number(r.points) || 25), 25);

  let score = 50;
  const factors = [];

  if (outcome === 'positive') {
    const weight = typeof condition?.weight === 'number'
      ? condition.weight
      : Math.min(1, Math.max(0, (Number(condition?.points) || 25) / maxPosPoints));
    const bonus = Math.round(25 * weight);
    score = 75 + bonus;

    factors.push({
      category: condition?.id || 'positive_terminal_condition',
      eventCount: 1,
      scoreImpact: bonus + 25,
      description: outcomeResult.reason || 'Demonstrated vigilant security behavior.'
    });
  } else if (outcome === 'negative') {
    const weight = typeof condition?.weight === 'number'
      ? condition.weight
      : Math.min(1, Math.max(0, (Number(condition?.points) || 25) / maxNegPoints));
    score = Math.max(0, 45 - Math.round(45 * weight));

    factors.push({
      category: condition?.id || 'negative_terminal_condition',
      eventCount: 1,
      scoreImpact: score - 50,
      description: outcomeResult.reason || 'Fell for simulated social engineering vector.'
    });
  } else if (outcome === 'incomplete') {
    score = 50;
    factors.push({
      category: 'simulation_ended_incomplete',
      eventCount: events.length,
      scoreImpact: 0,
      description: 'Simulation concluded manually before a decisive attack interaction was recorded.'
    });
  } else if (outcome === 'abandoned') {
    score = 25;
    factors.push({
      category: 'simulation_abandoned',
      eventCount: events.length,
      scoreImpact: -25,
      description: 'Simulation was abandoned before completion.'
    });
  }

  // Strictly clamp between 0 and 100
  score = Math.max(0, Math.min(100, Math.round(score)));
  const riskLevel = getRiskLevel(score);

  return {
    score,
    riskLevel,
    factors,
    outcome,
    triggeredConditionId: condition?.id || null,
    formulaVersion: FORMULA_VERSION,
    outcomeEvidence: outcomeResult?.evidence || null,
    scoringVersion: FORMULA_VERSION,
    eventCount: events.length
  };
}

/**
 * Starts the observation window for a session if not already started.
 * Idempotent.
 */
export async function startObservationWindow(sessionId) {
  if (!sessionId) return null;

  const session = await Session.findOne({ sessionId });
  if (!session || session.status !== 'active') return session;

  if (!session.observationWindowStartedAt) {
    session.observationWindowStartedAt = new Date();
    await session.save();
  }

  return session;
}

/**
 * Evaluates and finalizes a session's outcome atomically on the backend.
 * Enforces single-outcome-wins: Once terminal, subsequent requests are idempotent.
 * 
 * @param {string} sessionId
 * @param {Object} options - { manualEnd, clientElapsedSeconds, rulesOverride }
 * @returns {Promise<Object>} { session, scoreRecord, finalizedOutcome }
 */
export async function finalizeSessionOutcome(sessionId, options = {}) {
  if (!sessionId || typeof sessionId !== 'string') {
    const err = new Error('Invalid sessionId parameter.');
    err.statusCode = 400;
    throw err;
  }

  // 1. Verify session exists
  const session = await Session.findOne({ sessionId });
  if (!session) {
    const err = new Error(`Session "${sessionId}" not found.`);
    err.statusCode = 404;
    throw err;
  }

  // 2. Single-outcome-wins guard:
  // If session is already terminal, return existing state idempotently
  if (session.status !== 'active') {
    let existingScore = await BehaviorScore.findOne({ sessionId });
    return {
      session,
      scoreRecord: existingScore,
      finalizedOutcome: {
        outcome: session.outcome || (session.status === 'abandoned' ? 'abandoned' : 'incomplete'),
        status: session.status,
        triggeredConditionId: session.triggeredConditionId || null,
        isIdempotent: true
      }
    };
  }

  // 3. Load authoritative persisted events for session
  const events = await SimulationEvent.find({ sessionId }).sort({ timestamp: 1 });

  // 4. Calculate elapsed observation time using backend timestamps
  let elapsedSeconds = null;
  if (session.observationWindowStartedAt) {
    const nowMs = Date.now();
    const startMs = new Date(session.observationWindowStartedAt).getTime();
    elapsedSeconds = Math.max(0, Math.floor((nowMs - startMs) / 1000));
  }

  // 5. Termination rules to evaluate
  const terminationRules = session.terminationRules || options.rulesOverride || generateDefaultTerminationRules(session.channel);

  // 6. Evaluate outcome
  const outcomeResult = evaluateTerminationRules(events, terminationRules, session.channel, {
    manualEnd: Boolean(options.manualEnd),
    elapsedSeconds
  });

  // If not matched and not manual end, simulation stays active
  if (!outcomeResult.matched) {
    return {
      session,
      scoreRecord: null,
      finalizedOutcome: {
        outcome: null,
        status: 'active',
        isTerminal: false
      }
    };
  }

  // 7. Atomic conditional update to finalize session (Single-outcome-wins)
  const now = new Date();
  const updatedSession = await Session.findOneAndUpdate(
    { sessionId, status: 'active' },
    {
      $set: {
        status: outcomeResult.sessionStatus,
        outcome: outcomeResult.outcome,
        triggeredConditionId: outcomeResult.condition?.id || null,
        updatedAt: now,
        endedAt: now
      }
    },
    { new: true, runValidators: true }
  );

  // If another request finalized the session concurrently, reload and return
  if (!updatedSession) {
    const existing = await Session.findOne({ sessionId });
    const existingScore = await BehaviorScore.findOne({ sessionId });
    return {
      session: existing,
      scoreRecord: existingScore,
      finalizedOutcome: {
        outcome: existing?.outcome,
        status: existing?.status,
        triggeredConditionId: existing?.triggeredConditionId,
        isIdempotent: true
      }
    };
  }

  // 8. Calculate deterministic score using new formula
  const scoreBreakdown = computeScenarioScore(outcomeResult, terminationRules, events);

  // 9. Upsert BehaviorScore document in MongoDB
  const existingScore = await BehaviorScore.findOne({ sessionId });
  const revision = existingScore ? (existingScore.revision || 1) + 1 : 1;

  const scoreRecord = await BehaviorScore.findOneAndUpdate(
    { sessionId },
    {
      $set: {
        sessionId,
        scenarioId: session.scenarioId,
        channel: session.channel,
        score: scoreBreakdown.score,
        riskLevel: scoreBreakdown.riskLevel,
        factors: scoreBreakdown.factors,
        scoringVersion: scoreBreakdown.scoringVersion,
        formulaVersion: scoreBreakdown.formulaVersion,
        outcome: scoreBreakdown.outcome,
        triggeredConditionId: scoreBreakdown.triggeredConditionId,
        outcomeEvidence: scoreBreakdown.outcomeEvidence,
        calculatedAt: now,
        eventCount: events.length,
        status: 'final',
        revision
      }
    },
    { new: true, upsert: true, runValidators: true }
  );

  return {
    session: updatedSession,
    scoreRecord,
    finalizedOutcome: {
      outcome: updatedSession.outcome,
      status: updatedSession.status,
      triggeredConditionId: updatedSession.triggeredConditionId,
      score: scoreRecord.score,
      riskLevel: scoreRecord.riskLevel,
      reason: outcomeResult.reason,
      isTerminal: true
    }
  };
}
