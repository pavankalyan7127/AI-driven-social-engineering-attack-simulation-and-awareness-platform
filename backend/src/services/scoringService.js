import Session from '../models/Session.js';
import SimulationEvent from '../models/SimulationEvent.js';
import BehaviorScore from '../models/BehaviorScore.js';
import { SCORING_CONFIG, getRiskLevel } from '../config/scoringConfig.js';
import { computeScenarioScore, evaluateTerminationRules } from './outcomeService.js';

/**
 * Deterministically normalizes simulation events into behavior categories.
 */
function normalizeEventToCategory(event) {
  const eventType = (event.eventType || '').toLowerCase().trim();
  const metadata = event.metadata || {};

  switch (eventType) {
    case 'simulated_link_clicked':
    case 'virtual_link_clicked':
    case 'link_clicked':
      return 'malicious_link_clicked';

    case 'credential_submitted':
    case 'sensitive_info_disclosed':
    case 'information_shared':
    case 'sensitive_information_shared':
      return 'simulated_credentials_submitted';

    case 'simulated_form_submitted':
    case 'form_submitted':
      // Only count as credentials submitted if input was actually provided
      if (metadata.hasProvidedInput !== false) {
        return 'simulated_credentials_submitted';
      }
      return null;

    case 'reply_sent':
    case 'message_sent':
      if (metadata.isDefensiveReply || metadata.decision === 'positive_termination') {
        return 'safe_exit';
      }
      return 'risky_reply_sent';

    case 'voice_interaction':
      if (metadata.action === 'voice_message_sent') {
        return 'risky_reply_sent';
      }
      return null;

    case 'attachment_interaction':
    case 'attachment_opened':
      return 'suspicious_attachment_interacted';

    case 'warning_sign_selected':
      return 'warning_sign_identified';

    case 'threat_reported':
      return 'threat_reported';

    case 'safe_exit':
    case 'user_blocked_sender':
    case 'call_rejected':
    case 'call_declined':
    case 'call_hung_up':
      return 'safe_exit';

    case 'call_answered':
    case 'speech_input_provided':
    case 'dtmf_keypad_pressed':
    case 'scenario_viewed':
    case 'message_opened':
    case 'conversation_opened':
    case 'virtual_page_viewed':
    case 'page_navigated':
    case 'virtual_navigation':
    case 'browser_back':
    case 'browser_forward':
    case 'form_interaction':
    case 'inbox_refreshed':
    case 'pagination_clicked':
    case 'message_starred':
    case 'message_unstarred':
    case 'message_archived':
    case 'message_deleted':
    case 'message_snoozed':
    case 'added_to_tasks':
    case 'move_to_clicked':
    case 'labels_clicked':
    case 'forward_clicked':
    case 'side_tool_clicked':
    case 'simulation_started':
    case 'simulation_completed':
    case 'scenario_completed':
    case 'simulation_abandoned':
    case 'interaction_recorded':
    case 'view_changed':
      // Safe / neutral interactions
      return null;

    default:
      // Unknown or unallowlisted event types are ignored safely
      return null;
  }
}

/**
 * Pure deterministic calculation function:
 * Computes an explainable score between 0 and 100 based on authoritative session events.
 * Testable independently of Express and MongoDB.
 * 
 * @param {Array} events - List of simulation events
 * @param {Object} session - Session document or metadata
 * @returns {Object} { score, riskLevel, factors, eventCount, status, scoringVersion }
 */
export function calculateSecurityScore(events = [], session = {}) {
  // 1. Deduplicate events
  const seenEventKeys = new Set();
  const deduplicatedEvents = [];

  for (const evt of events) {
    if (!evt || !evt.eventType) continue;

    // Build deduplication key
    const key = evt.eventId || evt.clientEventId || `${evt.eventType}:${JSON.stringify(evt.metadata || {})}`;
    if (!seenEventKeys.has(key)) {
      seenEventKeys.add(key);
      deduplicatedEvents.push(evt);
    }
  }

  // 2. Track category occurrences and distinct items
  const occurrencesByCategory = {
    malicious_link_clicked: 0,
    simulated_credentials_submitted: 0,
    risky_reply_sent: 0,
    suspicious_attachment_interacted: 0,
    warning_sign_identified: 0,
    threat_reported: 0,
    safe_exit: 0
  };

  const identifiedWarningKeys = new Set();

  for (const evt of deduplicatedEvents) {
    const category = normalizeEventToCategory(evt);
    if (!category) continue;

    if (category === 'warning_sign_identified') {
      const indicatorKey = evt.metadata?.indicatorKey || evt.metadata?.key;
      if (indicatorKey) {
        identifiedWarningKeys.add(indicatorKey);
      } else {
        occurrencesByCategory.warning_sign_identified++;
      }
    } else if (category === 'threat_reported') {
      occurrencesByCategory.threat_reported = 1;
      // Extract indicators from threat report metadata if present
      if (evt.metadata?.indicators && typeof evt.metadata.indicators === 'object') {
        Object.entries(evt.metadata.indicators).forEach(([indKey, selected]) => {
          if (selected) identifiedWarningKeys.add(indKey);
        });
      }
    } else {
      occurrencesByCategory[category] = (occurrencesByCategory[category] || 0) + 1;
    }
  }

  // Add distinct identified warning keys to warning sign count
  if (identifiedWarningKeys.size > 0) {
    occurrencesByCategory.warning_sign_identified = Math.max(
      occurrencesByCategory.warning_sign_identified,
      identifiedWarningKeys.size
    );
  }

  // Terminal safeguard: Do not double-reward both threat_reported and safe_exit
  // If session is terminal, favor the terminal outcome
  if (occurrencesByCategory.threat_reported > 0 && occurrencesByCategory.safe_exit > 0) {
    if (session.status === 'safe_exit') {
      occurrencesByCategory.threat_reported = 0;
    } else {
      occurrencesByCategory.safe_exit = 0;
    }
  }

  // 3. Compute Penalties
  let totalPenalty = 0;
  const factors = [];

function getContextualFactorDescription(category, channel, defaultDescription) {
  const norm = (channel || '').toLowerCase();
  if (category === 'simulated_credentials_submitted') {
    if (norm === 'call') {
      return 'Verbally disclosed credentials or sensitive information during the telephone call.';
    }
    if (['chat', 'sms', 'whatsapp', 'instagram', 'telegram'].includes(norm)) {
      return 'Disclosed sensitive credentials or security details in a message.';
    }
    if (norm === 'email') {
      return 'Disclosed sensitive credentials via email reply.';
    }
    return defaultDescription;
  }
  if (category === 'threat_reported' && norm === 'call') {
    return 'Reported the suspicious phone call as a voice phishing (vishing) threat.';
  }
  if (category === 'safe_exit' && norm === 'call') {
    return 'Safely hung up and terminated the call without complying with attacker demands.';
  }
  return defaultDescription;
}

  for (const [category, rule] of Object.entries(SCORING_CONFIG.penalties)) {
    const rawCount = occurrencesByCategory[category] || 0;
    if (rawCount > 0) {
      const counted = Math.min(rawCount, rule.maxOccurrences);
      const impact = -(counted * rule.points);
      totalPenalty += Math.abs(impact);

      factors.push({
        category,
        eventCount: counted,
        scoreImpact: impact,
        description: getContextualFactorDescription(category, session.channel, rule.description)
      });
    }
  }

  // 4. Compute Rewards
  let totalReward = 0;

  for (const [category, rule] of Object.entries(SCORING_CONFIG.rewards)) {
    const rawCount = occurrencesByCategory[category] || 0;
    if (rawCount > 0) {
      const counted = Math.min(rawCount, rule.maxOccurrences);
      const impact = counted * rule.points;
      totalReward += impact;

      factors.push({
        category,
        eventCount: counted,
        scoreImpact: impact,
        description: getContextualFactorDescription(category, session.channel, rule.description)
      });
    }
  }

  // 5. Calculate Final Score (Clamped strictly between 0 and 100)
  const baseline = SCORING_CONFIG.baselineScore;
  const rawScore = baseline - totalPenalty + totalReward;
  const finalScore = Math.max(0, Math.min(100, Math.round(rawScore)));

  // If no risky or protective actions were scored, explain baseline
  if (factors.length === 0) {
    factors.push({
      category: 'baseline_neutral',
      eventCount: deduplicatedEvents.length,
      scoreImpact: 0,
      description: 'Standard baseline score maintained. No high-risk or distinct defensive actions recorded.'
    });
  }

  const riskLevel = getRiskLevel(finalScore);
  const status = session.status === 'active' ? 'provisional' : 'final';

  return {
    score: finalScore,
    riskLevel,
    factors,
    eventCount: deduplicatedEvents.length,
    status,
    scoringVersion: SCORING_CONFIG.version
  };
}

/**
 * Computes and persists the security behavior score for a session in MongoDB.
 * Idempotent: recalculating updates the existing BehaviorScore document and increments revision.
 * 
 * @param {string} sessionId
 * @returns {Promise<Object>} Persisted BehaviorScore document
 */
export async function scoreSession(sessionId) {
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

  // 2. Load authoritative persisted events for session
  let events = await SimulationEvent.find({ sessionId }).sort({ timestamp: 1 });

  if (!events || events.length === 0) {
    if (session.status && session.status !== 'active') {
      const syntheticEventType =
        session.status === 'reported'
          ? 'threat_reported'
          : session.status === 'safe_exit'
          ? 'safe_exit'
          : 'credential_submitted';

      const syntheticEvent = await SimulationEvent.create({
        eventId: `evt-synth-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        sessionId,
        scenarioId: session.scenarioId,
        channel: session.channel || 'call',
        eventType: syntheticEventType,
        timestamp: new Date(),
        metadata: { channel: session.channel || 'call', autoGenerated: true }
      });
      events = [syntheticEvent];
    } else {
      const err = new Error(`No scoreable interaction events found for session "${sessionId}".`);
      err.statusCode = 400;
      throw err;
    }
  }

  // 3. Compute deterministic score
  // If session has been evaluated with an outcome or terminationRules, compute scenario-driven score
  let computed;
  if (session.outcome || session.terminationRules) {
    let outcomeVal = session.outcome;
    let matchedCondition = null;
    let outcomeReason = '';

    if (!outcomeVal && session.terminationRules) {
      const evalResult = evaluateTerminationRules(events, session.terminationRules, session.channel);
      if (evalResult.matched) {
        outcomeVal = evalResult.outcome;
        matchedCondition = evalResult.condition;
        outcomeReason = evalResult.reason;
      }
    }

    if (!outcomeVal) {
      if (session.status === 'safe_exit' || session.status === 'reported') {
        outcomeVal = 'positive';
      } else if (session.status === 'completed') {
        outcomeVal = 'negative';
      } else if (session.status === 'abandoned') {
        outcomeVal = 'abandoned';
      } else {
        outcomeVal = 'incomplete';
      }
    }

    const outcomeResult = {
      outcome: outcomeVal,
      condition: matchedCondition ||
                 session.terminationRules?.positiveConditions?.find(c => c.id === session.triggeredConditionId) ||
                 session.terminationRules?.negativeConditions?.find(c => c.id === session.triggeredConditionId) || null,
      reason: outcomeReason || (outcomeVal === 'positive'
        ? 'Demonstrated defensive security behavior.'
        : outcomeVal === 'negative'
        ? 'Fell for simulated threat vector.'
        : 'Session concluded without critical attack interaction.')
    };
    computed = computeScenarioScore(outcomeResult, session.terminationRules, events);

    if (!session.outcome) {
      session.outcome = outcomeVal;
      if (outcomeResult.condition?.id) {
        session.triggeredConditionId = outcomeResult.condition.id;
      }
      await session.save();
    }
  } else {
    computed = calculateSecurityScore(events, session);
  }
  const now = new Date();

  // 4. Upsert BehaviorScore in MongoDB
  const existingScore = await BehaviorScore.findOne({ sessionId });
  const revision = existingScore ? (existingScore.revision || 1) + 1 : 1;

  const scoreDoc = await BehaviorScore.findOneAndUpdate(
    { sessionId },
    {
      $set: {
        sessionId,
        scenarioId: session.scenarioId,
        channel: session.channel,
        score: computed.score,
        riskLevel: computed.riskLevel,
        factors: computed.factors,
        scoringVersion: computed.scoringVersion,
        formulaVersion: computed.formulaVersion || '1.0.0',
        outcome: computed.outcome || session.outcome || null,
        triggeredConditionId: computed.triggeredConditionId || session.triggeredConditionId || null,
        outcomeEvidence: computed.outcomeEvidence || null,
        calculatedAt: now,
        eventCount: computed.eventCount,
        status: computed.status,
        revision
      }
    },
    { new: true, upsert: true, runValidators: true }
  );

  return scoreDoc;
}

/**
 * Retrieves the stored behavior score for a session without recomputing.
 * 
 * @param {string} sessionId
 * @returns {Promise<Object>} BehaviorScore document
 */
export async function getScoreForSession(sessionId) {
  if (!sessionId || typeof sessionId !== 'string') {
    const err = new Error('Invalid sessionId parameter.');
    err.statusCode = 400;
    throw err;
  }

  const session = await Session.findOne({ sessionId });
  if (!session) {
    const err = new Error(`Session "${sessionId}" not found.`);
    err.statusCode = 404;
    throw err;
  }

  const scoreDoc = await BehaviorScore.findOne({ sessionId });
  if (!scoreDoc) {
    const err = new Error(`Behavior score has not been calculated for session "${sessionId}".`);
    err.statusCode = 404;
    throw err;
  }

  return scoreDoc;
}
