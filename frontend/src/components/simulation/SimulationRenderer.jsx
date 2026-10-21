import React, { useRef, useCallback } from 'react';
import EmailSimulation from './EmailSimulation';
import ChatSimulation from './ChatSimulation';
import SmsSimulation from './SmsSimulation';
import WebsiteSimulation from './WebsiteSimulation';
import WhatsAppSimulation from './WhatsAppSimulation';
import InstagramSimulation from './InstagramSimulation';
import TelegramSimulation from './TelegramSimulation';
import VoiceCallSimulation from './VoiceCallSimulation';
import { AlertOctagon, HelpCircle } from 'lucide-react';
import { sendTelemetryEvent } from '../../services/telemetryService';

/**
 * Supported simulation channels allowlist
 */
const SUPPORTED_CHANNELS = {
  EMAIL: 'email',
  CHAT: 'chat',
  SMS: 'sms',
  WEBSITE: 'website',
  WHATSAPP: 'whatsapp',
  INSTAGRAM: 'instagram',
  TELEGRAM: 'telegram',
  CALL: 'call'
};

/**
 * Checks whether an event type string matches a condition's rule or canonical alias.
 */
function doesEventMatchRule(rawType, condTypeRaw) {
  if (!condTypeRaw) return false;
  const condType = String(condTypeRaw).toLowerCase().trim();

  // Direct match
  if (rawType === condType) return true;

  // Canonical aliases: links
  const linkEvents = ['simulated_link_clicked', 'virtual_link_clicked', 'link_clicked'];
  if (linkEvents.includes(condType) && linkEvents.includes(rawType)) return true;

  // Canonical aliases: form submission & credential entry
  const formEvents = [
    'simulated_form_submitted',
    'credential_submitted',
    'form_submitted',
    'sensitive_info_disclosed',
    'information_shared',
    'sensitive_information_shared'
  ];
  if (formEvents.includes(condType) && formEvents.includes(rawType)) return true;

  // Canonical aliases: messaging / replies
  const messageEvents = ['reply_sent', 'message_sent'];
  if (messageEvents.includes(condType) && messageEvents.includes(rawType)) return true;

  // Canonical aliases: attachments
  const attachmentEvents = ['attachment_opened', 'attachment_interaction'];
  if (attachmentEvents.includes(condType) && attachmentEvents.includes(rawType)) return true;

  // Canonical aliases: reporting
  if (
    (condType === 'threat_reported' || condType.startsWith('user_reported_')) &&
    (rawType === 'threat_reported' || rawType.startsWith('user_reported_'))
  ) {
    return true;
  }

  // Canonical aliases: safe exit & defensive message disposal
  const safeExitEvents = [
    'safe_exit',
    'user_blocked_sender',
    'message_deleted',
    'message_archived',
    'call_rejected',
    'call_declined',
    'call_hung_up'
  ];
  if (safeExitEvents.includes(condType) && safeExitEvents.includes(rawType)) {
    return true;
  }

  return false;
}

/**
 * Evaluates whether an interaction event matches a scenario termination condition.
 * Returns { condition, polarity: 'positive' | 'negative' } or null.
 */
export function matchesTerminationCondition(event, terminationRules) {
  if (!event || !event.eventType) return null;

  const rawType = String(event.eventType).toLowerCase().trim();

  // Passive viewing events must NEVER trigger automatic termination
  const passiveEvents = [
    'message_opened',
    'conversation_opened',
    'virtual_page_viewed',
    'scenario_viewed',
    'interaction_recorded',
    'warning_sign_selected'
  ];
  if (passiveEvents.includes(rawType)) return null;

  const rules = terminationRules || {};

  // 1. Negative conditions (risky behaviors that end the simulation)
  const negativeConditions = Array.isArray(rules.negativeConditions)
    ? rules.negativeConditions
    : (Array.isArray(rules.negativeRules) ? rules.negativeRules : []);

  for (const condition of negativeConditions) {
    if (!condition) continue;
    if (doesEventMatchRule(rawType, condition.eventType)) {
      return { condition, polarity: 'negative' };
    }
  }

  // 2. Positive conditions (defensive actions explicitly declared in scenario rules)
  const positiveConditions = Array.isArray(rules.positiveConditions)
    ? rules.positiveConditions
    : (Array.isArray(rules.positiveRules) ? rules.positiveRules : []);

  for (const condition of positiveConditions) {
    if (!condition) continue;
    if (doesEventMatchRule(rawType, condition.eventType)) {
      return { condition, polarity: 'positive' };
    }
  }

  // 3. Universal defensive/protective actions across all channels:
  // Even if the scenario's positiveConditions only declared 'threat_reported',
  // deleting or archiving the phishing email, blocking the suspicious contact/sender,
  // or safely exiting the simulation is an authoritative protective victory.
  const inherentProtectiveActions = {
    threat_reported: {
      id: 'rule_pos_threat_reported',
      eventType: 'threat_reported',
      points: 30,
      label: 'Reported security threat',
      explanation: 'User identified the simulated social engineering attack and reported it.'
    },
    message_deleted: {
      id: 'rule_pos_message_deleted',
      eventType: 'message_deleted',
      points: 25,
      label: 'Deleted suspicious email',
      explanation: 'User recognized the deceptive cues and deleted the suspicious email.'
    },
    message_archived: {
      id: 'rule_pos_message_archived',
      eventType: 'message_archived',
      points: 20,
      label: 'Archived suspicious email',
      explanation: 'User recognized and archived the deceptive email away from the inbox.'
    },
    safe_exit: {
      id: 'rule_pos_safe_exit',
      eventType: 'safe_exit',
      points: 25,
      label: 'Safely exited scenario',
      explanation: 'User safely exited without engaging with the deceptive attack vector.'
    },
    user_blocked_sender: {
      id: 'rule_pos_user_blocked_sender',
      eventType: 'user_blocked_sender',
      points: 25,
      label: 'Blocked suspicious contact',
      explanation: 'User blocked the sender to prevent further social engineering attempts.'
    }
  };

  if (inherentProtectiveActions[rawType]) {
    return {
      condition: inherentProtectiveActions[rawType],
      polarity: 'positive'
    };
  }

  return null;
}

/**
 * SimulationRenderer Component
 * 
 * Central dispatcher component that dynamically mounts the appropriate attack
 * simulation component based on the validated scenario's channel.
 * 
 * @param {Object} props
 * @param {Object} props.scenario - Validated scenario JSON object
 * @param {string} props.sessionId - Current simulation session ID
 * @param {Function} props.onAction - Callback for telemetry events
 * @param {Function} props.onEvent - Alias callback for telemetry events
 * @param {Function} props.onComplete - Callback for terminal simulation completion
 */
export default function SimulationRenderer({
  scenario,
  sessionId = 'sess-sim-default',
  deviceMode = 'full',
  onAction,
  onEvent,
  onComplete
}) {
  // 1. Validate scenario presence
  if (!scenario || typeof scenario !== 'object') {
    return (
      <div
        data-testid="simulation-renderer-fallback"
        className="flex items-center justify-center h-full min-h-[400px] p-6 bg-gray-50 text-gray-700 font-sans"
      >
        <div className="text-center p-8 bg-white border border-gray-200 rounded-2xl shadow-sm max-w-md">
          <AlertOctagon className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-gray-900 mb-1.5">No Scenario Data</h2>
          <p className="text-xs text-gray-600 leading-relaxed mb-4">
            No valid attack scenario configuration was provided to the simulation renderer.
          </p>
        </div>
      </div>
    );
  }

  // 2. Validate channel specification
  let channel = (scenario.channel || '').toLowerCase().trim();
  if (channel === 'voice_call' || channel === 'phone_call' || channel === 'vishing') {
    channel = 'call';
  }

  if (!channel) {
    return (
      <div
        data-testid="simulation-renderer-fallback"
        className="flex items-center justify-center h-full min-h-[400px] p-6 bg-gray-50 text-gray-700 font-sans"
      >
        <div className="text-center p-8 bg-white border border-gray-200 rounded-2xl shadow-sm max-w-md">
          <AlertOctagon className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-gray-900 mb-1.5">Missing Simulation Channel</h2>
          <p className="text-xs text-gray-600 leading-relaxed mb-4">
            The provided scenario does not specify an attack channel (e.g. <code>email</code>, <code>chat</code>, <code>sms</code>, or <code>website</code>).
          </p>
        </div>
      </div>
    );
  }

  // Guard against duplicate completion callbacks across rerenders
  const hasCompletedRef = useRef(false);
  const isTerminatingRef = useRef(false);

  // Normalized Completion Handler
  const handleNormalizedComplete = useCallback(
    (result = {}) => {
      if (typeof onComplete !== 'function' || hasCompletedRef.current) return;

      const normalizedResult = {
        status: result.status || 'completed',
        action: result.action || result.status || 'scenario_completed',
        channel,
        scenarioId: result.scenarioId || scenario.scenarioId || scenario.id || 'unnamed-scenario',
        sessionId: result.sessionId || sessionId || scenario.sessionId || 'default-session',
        timestamp: result.timestamp || new Date().toISOString(),
        ...result
      };

      try {
        hasCompletedRef.current = true;
        onComplete(normalizedResult);
      } catch (err) {
        console.error('[SimulationRenderer] Error invoking onComplete callback:', err);
      }
    },
    [channel, onComplete, scenario, sessionId]
  );

  // Normalized Action Event Handler
  const handleNormalizedAction = useCallback(
    (event) => {
      const activeCallback = onAction || onEvent;

      const normalizedEvent = {
        ...event,
        scenarioId: event?.scenarioId || scenario.scenarioId || scenario.id || 'unnamed-scenario',
        sessionId: event?.sessionId || sessionId || scenario.sessionId || 'default-session',
        targetId: event?.targetId || scenario.targetId,
        timestamp: event?.timestamp || new Date().toISOString(),
        metadata: {
          channel,
          ...event?.metadata
        }
      };

      // Dispatch telemetry event to backend if a valid sessionId exists
      let telemetryPromise = Promise.resolve();
      if (sessionId && sessionId !== 'sess-sim-default' && event?.eventType) {
        telemetryPromise = sendTelemetryEvent({
          sessionId,
          eventType: event.eventType,
          metadata: normalizedEvent.metadata,
          clientTimestamp: normalizedEvent.timestamp
        }).catch((err) => {
          console.warn('[SimulationRenderer] Telemetry send error:', err);
        });
      }

      if (typeof activeCallback === 'function') {
        try {
          activeCallback(normalizedEvent);
        } catch (err) {
          console.error('[SimulationRenderer] Error dispatching event callback:', err);
        }
      }

      // Check if event triggers a scenario termination rule (e.g., form submit, phishing link click, reply)
      const terminationRules = scenario?.terminationRules;
      const matchedTerm = matchesTerminationCondition(normalizedEvent, terminationRules);

      if (matchedTerm && !isTerminatingRef.current && !hasCompletedRef.current) {
        isTerminatingRef.current = true;
        let targetStatus = 'completed';
        if (matchedTerm.polarity === 'positive') {
          targetStatus = (normalizedEvent.eventType === 'threat_reported' || String(normalizedEvent.eventType).startsWith('user_reported_'))
            ? 'reported'
            : 'safe_exit';
        }

        // Ensure telemetry event is committed to backend MongoDB before completing
        telemetryPromise.finally(() => {
          setTimeout(() => {
            handleNormalizedComplete({
              status: targetStatus,
              action: normalizedEvent.eventType,
              scenarioId: normalizedEvent.scenarioId,
              sessionId: normalizedEvent.sessionId,
              matchedCondition: matchedTerm.condition,
              reason: matchedTerm.condition.reason || matchedTerm.condition.explanation || matchedTerm.condition.label || 'Scenario termination condition triggered.'
            });
          }, 200);
        });
      }
    },
    [channel, handleNormalizedComplete, onAction, onEvent, scenario, sessionId]
  );

  // 3. Explicit Channel Dispatcher Mapping
  switch (channel) {
    case SUPPORTED_CHANNELS.EMAIL:
      return (
        <EmailSimulation
          scenario={scenario}
          sessionId={sessionId}
          deviceMode={deviceMode}
          onAction={handleNormalizedAction}
          onComplete={handleNormalizedComplete}
        />
      );

    case SUPPORTED_CHANNELS.WHATSAPP:
      return (
        <WhatsAppSimulation
          scenario={scenario}
          sessionId={sessionId}
          deviceMode={deviceMode}
          onAction={handleNormalizedAction}
          onComplete={handleNormalizedComplete}
        />
      );

    case SUPPORTED_CHANNELS.INSTAGRAM:
      return (
        <InstagramSimulation
          scenario={scenario}
          sessionId={sessionId}
          deviceMode={deviceMode}
          onAction={handleNormalizedAction}
          onComplete={handleNormalizedComplete}
        />
      );

    case SUPPORTED_CHANNELS.TELEGRAM:
      return (
        <TelegramSimulation
          scenario={scenario}
          sessionId={sessionId}
          deviceMode={deviceMode}
          onAction={handleNormalizedAction}
          onComplete={handleNormalizedComplete}
        />
      );

    case SUPPORTED_CHANNELS.CHAT: {
      const platform = (scenario.platform || '').toLowerCase();
      const title = (scenario.title || '').toLowerCase();
      const desc = (scenario.description || '').toLowerCase();
      const category = (scenario.category || '').toLowerCase();
      const combinedText = `${platform} ${title} ${desc} ${category}`;

      if (combinedText.includes('whatsapp')) {
        return (
          <WhatsAppSimulation
            scenario={scenario}
            sessionId={sessionId}
            deviceMode={deviceMode}
            onAction={handleNormalizedAction}
            onComplete={handleNormalizedComplete}
          />
        );
      }

      if (combinedText.includes('instagram') || combinedText.includes('insta') || combinedText.includes(' ig ')) {
        return (
          <InstagramSimulation
            scenario={scenario}
            sessionId={sessionId}
            deviceMode={deviceMode}
            onAction={handleNormalizedAction}
            onComplete={handleNormalizedComplete}
          />
        );
      }

      if (combinedText.includes('telegram')) {
        return (
          <TelegramSimulation
            scenario={scenario}
            sessionId={sessionId}
            deviceMode={deviceMode}
            onAction={handleNormalizedAction}
            onComplete={handleNormalizedComplete}
          />
        );
      }

      return (
        <ChatSimulation
          scenario={scenario}
          sessionId={sessionId}
          onAction={handleNormalizedAction}
          onComplete={handleNormalizedComplete}
        />
      );
    }

    case SUPPORTED_CHANNELS.SMS:
      return (
        <SmsSimulation
          scenario={scenario}
          sessionId={sessionId}
          onAction={handleNormalizedAction}
          onComplete={handleNormalizedComplete}
        />
      );

    case SUPPORTED_CHANNELS.WEBSITE:
      return (
        <WebsiteSimulation
          scenario={scenario}
          sessionId={sessionId}
          onAction={handleNormalizedAction}
          onComplete={handleNormalizedComplete}
        />
      );

    case SUPPORTED_CHANNELS.CALL:
      return (
        <VoiceCallSimulation
          scenario={scenario}
          sessionId={sessionId}
          onAction={handleNormalizedAction}
          onComplete={handleNormalizedComplete}
        />
      );

    default:
      // 4. Unsupported Channel Fallback
      return (
        <div
          data-testid="simulation-renderer-fallback"
          className="flex items-center justify-center h-full min-h-[400px] p-6 bg-gray-50 text-gray-700 font-sans"
        >
          <div className="text-center p-8 bg-white border border-gray-200 rounded-2xl shadow-sm max-w-md">
            <HelpCircle className="w-12 h-12 text-blue-500 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-gray-900 mb-1.5">Unsupported Simulation Channel</h2>
            <p className="text-xs text-gray-600 leading-relaxed mb-4">
              Channel <code className="bg-gray-100 px-1 py-0.5 rounded text-red-600 font-mono font-bold">"{channel}"</code> is not recognized.
            </p>
            <div className="text-[11px] text-gray-500 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
              Supported channels: <code>email</code>, <code>chat</code>, <code>sms</code>, <code>website</code>.
            </div>
          </div>
        </div>
      );
  }
}
