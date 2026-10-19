import React, { useState, useRef } from 'react';
import Home from './pages/Home';
import SimulationRenderer from './components/simulation/SimulationRenderer';
import { sampleScenario } from './data/sampleScenario';
import { sampleChatScenario } from './data/sampleChatScenario';
import { sampleSmsScenario } from './data/sampleSmsScenario';
import { sampleWebsiteScenario } from './data/sampleWebsiteScenario';
import {
  Activity,
  Terminal,
  Shield,
  Smartphone,
  Monitor,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { sendTelemetryEvent } from './services/telemetryService';

/**
 * Maps channel-specific completion payloads to standardized session lifecycle statuses.
 * - Threat reported ('threat_reported', 'reported') -> 'reported'
 * - Safe exit ('safe_exit') -> 'safe_exit'
 * - Explicit abandonment ('abandoned') -> 'abandoned'
 * - Default -> 'completed'
 */
export function mapOutcomeToSessionStatus(result) {
  if (!result || typeof result !== 'object') return 'completed';

  const statusStr = (result.status || '').toLowerCase();
  const actionStr = (result.action || '').toLowerCase();

  if (statusStr === 'reported' || actionStr === 'threat_reported') {
    return 'reported';
  }
  if (statusStr === 'safe_exit' || actionStr === 'safe_exit') {
    return 'safe_exit';
  }
  if (statusStr === 'abandoned' || actionStr === 'abandoned') {
    return 'abandoned';
  }

  return 'completed';
}

export default function App() {
  const [activeView, setActiveView] = useState('home'); // 'home' | 'simulation'
  const [currentScenario, setCurrentScenario] = useState(sampleScenario);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [sessionStatus, setSessionStatus] = useState('active'); // 'active' | 'completed' | 'reported' | 'safe_exit' | 'abandoned'
  const [sessionSyncError, setSessionSyncError] = useState(null);
  const [generationMeta, setGenerationMeta] = useState(null);

  // Home state preservation
  const [savedPrompt, setSavedPrompt] = useState('');
  const [savedChannel, setSavedChannel] = useState('email');

  // Telemetry & testing harness state
  const [events, setEvents] = useState([]);
  const [showEventLog, setShowEventLog] = useState(false);
  const [simulationCompletedData, setSimulationCompletedData] = useState(null);
  const [deviceWidthMode, setDeviceWidthMode] = useState('full'); // 'full' | 'mobile'

  // Ref to guard against duplicate completion callbacks firing concurrently
  const terminalStatusRef = useRef(null);

  // Security behavior scoring state (Step 3)
  const [behaviorScore, setBehaviorScore] = useState(null);
  const scoreRequestedRef = useRef(false);

  const sampleScenariosByChannel = {
    email: sampleScenario,
    chat: sampleChatScenario,
    sms: sampleSmsScenario,
    website: sampleWebsiteScenario
  };

  const handleScenarioGenerated = (scenario, sessionId, meta) => {
    setCurrentScenario(scenario);
    setCurrentSessionId(sessionId);
    setSessionStatus('active');
    terminalStatusRef.current = null;
    scoreRequestedRef.current = false;
    setBehaviorScore(null);
    setSessionSyncError(null);
    setGenerationMeta(meta || null);

    if (meta?.prompt) setSavedPrompt(meta.prompt);
    if (meta?.channel) setSavedChannel(meta.channel);

    setSimulationCompletedData(null);
    setEvents([]);
    setActiveView('simulation');
  };

  const handleAction = (event) => {
    console.log('[Simulation Event Dispatched]:', event);
    setEvents((prev) => [event, ...prev]);
  };

  /**
   * Terminal completion handler:
   * Maps outcome to lifecycle status and updates backend session atomically via PATCH /api/sessions/:id/status.
   * Prevents duplicate or conflicting updates.
   */
  const handleComplete = async (result) => {
    console.log('[Simulation Finalized]:', result);

    const targetStatus = mapOutcomeToSessionStatus(result);

    // Guard: If already finalized, do not trigger conflicting or duplicate updates
    if (terminalStatusRef.current) {
      if (terminalStatusRef.current === targetStatus) {
        console.log(`[Session Lifecycle] Session ${currentSessionId} already marked as ${targetStatus} (ignoring duplicate).`);
        return;
      }
      console.warn(`[Session Lifecycle] Cannot transition from terminal state ${terminalStatusRef.current} to ${targetStatus}.`);
      return;
    }

    terminalStatusRef.current = targetStatus;

    if (!currentSessionId) {
      setSimulationCompletedData(result);
      setSessionStatus(targetStatus);
      return;
    }

    try {
      const response = await fetch(`/api/sessions/${currentSessionId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: targetStatus })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const errorMsg = data.error || `Status update failed with HTTP ${response.status}`;
        console.error('[Session Status Sync Error]:', errorMsg);
        setSessionSyncError(errorMsg);
        // Do not pretend backend update succeeded if it failed
        return;
      }

      setSessionStatus(data.session?.status || targetStatus);
      setSimulationCompletedData({
        ...result,
        session: data.session,
        backendStatus: data.session?.status || targetStatus
      });
      setSessionSyncError(null);

      // Trigger deterministic security scoring calculation after successful status synchronization
      if (currentSessionId && !scoreRequestedRef.current) {
        scoreRequestedRef.current = true;
        try {
          const scoreRes = await fetch(`/api/sessions/${currentSessionId}/score`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            }
          });
          const scoreData = await scoreRes.json();
          if (scoreRes.ok && scoreData.success && scoreData.scoreRecord) {
            setBehaviorScore(scoreData.scoreRecord);
          } else {
            console.warn('[Session Scoring Warning]:', scoreData.error || 'Failed to calculate behavior score');
          }
        } catch (scoreErr) {
          console.error('[Session Scoring Error]:', scoreErr);
        }
      }
    } catch (err) {
      console.error('[Session Network Error]:', err);
      setSessionSyncError(`Network failure: could not record session status on backend (${err.message}).`);
    }
  };

  const handleReturnToGenerator = async () => {
    // If returning while session is still active, mark as abandoned
    if (currentSessionId && sessionStatus === 'active' && !terminalStatusRef.current) {
      try {
        terminalStatusRef.current = 'abandoned';

        // Persist terminal telemetry event for abandonment
        sendTelemetryEvent({
          sessionId: currentSessionId,
          eventType: 'simulation_abandoned',
          metadata: { reason: 'user_navigated_away' }
        }).catch(() => {});

        await fetch(`/api/sessions/${currentSessionId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'abandoned' })
        });
      } catch (err) {
        console.warn('[Session Abandon Sync Error]:', err);
      }
    }

    setActiveView('home');
    setShowEventLog(false);
    setSessionSyncError(null);
    setBehaviorScore(null);
    scoreRequestedRef.current = false;
  };

  const clearEvents = () => {
    setEvents([]);
  };

  if (activeView === 'home') {
    return (
      <Home
        onGenerateScenario={handleScenarioGenerated}
        initialPrompt={savedPrompt}
        initialChannel={savedChannel}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-gray-900 font-sans">
      {/* Simulation Host Bar */}
      <div className="h-11 bg-gray-950 border-b border-gray-800 px-4 flex items-center justify-between text-xs text-gray-300 shrink-0 z-30">
        <div className="flex items-center gap-3">
          {/* Return to Generator */}
          <button
            onClick={handleReturnToGenerator}
            data-testid="return-to-generator-btn"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-900 hover:bg-gray-800 text-gray-200 border border-gray-700 transition-colors font-medium text-xs shadow-sm cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-blue-400" />
            <span>Return to Generator</span>
          </button>

          <span className="h-4 w-px bg-gray-800" />

          {/* Scenario Info */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white tracking-wide truncate max-w-[200px] sm:max-w-xs">
              {currentScenario?.title || 'Interactive Attack Simulation'}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-blue-950 text-blue-300 border border-blue-800">
              {currentScenario?.channel || 'simulation'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Session Status Indicator */}
          <div
            data-testid="session-status-badge"
            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase border ${
              sessionStatus === 'active'
                ? 'bg-blue-950/80 border-blue-800 text-blue-300'
                : sessionStatus === 'reported'
                ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
                : sessionStatus === 'safe_exit'
                ? 'bg-cyan-950/80 border-cyan-800 text-cyan-300'
                : sessionStatus === 'abandoned'
                ? 'bg-gray-800 border-gray-700 text-gray-400'
                : 'bg-purple-950/80 border-purple-800 text-purple-300'
            }`}
          >
            {sessionStatus === 'active' ? (
              <Clock className="w-3 h-3 text-blue-400 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            )}
            <span>Status: {sessionStatus}</span>
          </div>

          {/* Behavior Score Badge (Step 3) */}
          {behaviorScore && (
            <div
              data-testid="behavior-score-badge"
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase border ${
                behaviorScore.riskLevel === 'low'
                  ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
                  : behaviorScore.riskLevel === 'moderate'
                  ? 'bg-yellow-950/80 border-yellow-800 text-yellow-300'
                  : behaviorScore.riskLevel === 'high'
                  ? 'bg-orange-950/80 border-orange-800 text-orange-300'
                  : 'bg-red-950/80 border-red-800 text-red-300'
              }`}
            >
              <Shield className="w-3 h-3 text-emerald-400" />
              <span>Score: {behaviorScore.score}/100 ({behaviorScore.riskLevel})</span>
            </div>
          )}

          {/* Session Sync Error Notice */}
          {sessionSyncError && (
            <div
              data-testid="session-sync-error"
              className="hidden lg:flex items-center gap-1 px-2 py-0.5 rounded bg-red-950/80 border border-red-800 text-[11px] text-red-300"
              title={sessionSyncError}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <span className="truncate max-w-[180px]">{sessionSyncError}</span>
            </div>
          )}

          {/* Responsive Viewport Toggle */}
          <div className="flex items-center bg-gray-800 rounded-lg p-0.5 border border-gray-700">
            <button
              onClick={() => setDeviceWidthMode('full')}
              className={`p-1 rounded ${deviceWidthMode === 'full' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
              title="Desktop width"
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setDeviceWidthMode('mobile')}
              className={`p-1 rounded ${deviceWidthMode === 'mobile' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
              title="Mobile viewport simulation (420px)"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Event Log Toggle Button */}
          <button
            onClick={() => setShowEventLog((prev) => !prev)}
            data-testid="telemetry-toggle-btn"
            className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 px-2.5 py-1 rounded text-xs text-gray-200 transition-colors"
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span>Event Telemetry ({events.length})</span>
          </button>
        </div>
      </div>

      {/* Main Container rendering active simulation through SimulationRenderer */}
      <div className="flex-1 overflow-hidden relative flex items-center justify-center bg-gray-900">
        <div
          className={`h-full transition-all duration-300 ${
            deviceWidthMode === 'mobile'
              ? 'w-[420px] shadow-2xl border-x border-gray-800 my-auto rounded-xl overflow-hidden'
              : 'w-full'
          }`}
        >
          <SimulationRenderer
            scenario={currentScenario}
            sessionId={currentSessionId || 'sess-default'}
            onAction={handleAction}
            onComplete={handleComplete}
          />
        </div>

        {/* Live Event Inspector Overlay */}
        {showEventLog && (
          <div
            data-testid="telemetry-log-panel"
            className="absolute bottom-0 right-0 z-50 w-full sm:w-[500px] max-h-[380px] bg-gray-950/95 border-t sm:border-l border-gray-800 shadow-2xl flex flex-col text-xs text-gray-300 font-mono backdrop-blur-md"
          >
            <div className="h-8 bg-gray-900 px-3 flex items-center justify-between border-b border-gray-800">
              <div className="flex items-center gap-2 font-semibold text-emerald-400">
                <Activity className="w-3.5 h-3.5" />
                <span>Live Event Stream ({events.length})</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={clearEvents}
                  className="hover:text-white p-1 text-[11px] text-gray-400 underline"
                >
                  Clear
                </button>
                <button
                  onClick={() => setShowEventLog(false)}
                  className="hover:text-white p-1 text-gray-400"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {events.length === 0 ? (
                <div className="text-gray-500 italic text-center py-6">
                  No interactions captured yet. Interact with the simulation interface.
                </div>
              ) : (
                events.map((evt, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded bg-gray-900/90 border border-gray-800 text-[11px] leading-relaxed"
                  >
                    <div className="flex items-center justify-between text-blue-400 font-semibold mb-1">
                      <span>⚡ {evt.eventType}</span>
                      <span className="text-gray-500 font-normal text-[10px]">
                        {evt.timestamp ? new Date(evt.timestamp).toLocaleTimeString() : ''}
                      </span>
                    </div>
                    <div className="text-gray-400 text-[10px]">
                      Scenario: <span className="text-gray-300">{evt.scenarioId}</span> | Target:{' '}
                      <span className="text-gray-300">{evt.targetId}</span>
                    </div>
                    {evt.metadata && (
                      <pre className="mt-1 text-emerald-300/90 overflow-x-auto text-[10px] bg-black/40 p-1.5 rounded">
                        {JSON.stringify(evt.metadata, null, 2)}
                      </pre>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
