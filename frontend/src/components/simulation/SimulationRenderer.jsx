import React, { useRef, useCallback } from 'react';
import EmailSimulation from './EmailSimulation';
import ChatSimulation from './ChatSimulation';
import SmsSimulation from './SmsSimulation';
import WebsiteSimulation from './WebsiteSimulation';
import { AlertOctagon, HelpCircle } from 'lucide-react';

/**
 * Supported simulation channels allowlist
 */
const SUPPORTED_CHANNELS = {
  EMAIL: 'email',
  CHAT: 'chat',
  SMS: 'sms',
  WEBSITE: 'website'
};

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
  const channel = (scenario.channel || '').toLowerCase().trim();

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

  // Normalized Action Event Handler
  const handleNormalizedAction = useCallback(
    (event) => {
      const activeCallback = onAction || onEvent;
      if (typeof activeCallback !== 'function') return;

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

      try {
        activeCallback(normalizedEvent);
      } catch (err) {
        console.error('[SimulationRenderer] Error dispatching event callback:', err);
      }
    },
    [channel, onAction, onEvent, scenario, sessionId]
  );

  // Normalized Completion Handler
  const handleNormalizedComplete = useCallback(
    (result = {}) => {
      if (typeof onComplete !== 'function') return;

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

  // 3. Explicit Channel Dispatcher Mapping
  switch (channel) {
    case SUPPORTED_CHANNELS.EMAIL:
      return (
        <EmailSimulation
          scenario={scenario}
          sessionId={sessionId}
          onAction={handleNormalizedAction}
          onComplete={handleNormalizedComplete}
        />
      );

    case SUPPORTED_CHANNELS.CHAT:
      return (
        <ChatSimulation
          scenario={scenario}
          sessionId={sessionId}
          onAction={handleNormalizedAction}
          onComplete={handleNormalizedComplete}
        />
      );

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
