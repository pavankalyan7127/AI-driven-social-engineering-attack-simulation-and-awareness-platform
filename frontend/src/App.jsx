import React, { useState, useRef } from 'react';
import Home from './pages/Home';
import SimulationRenderer from './components/simulation/SimulationRenderer';
import { sampleScenario } from './data/sampleScenario';
import { sampleChatScenario } from './data/sampleChatScenario';
import { sampleSmsScenario } from './data/sampleSmsScenario';
import { sampleWebsiteScenario } from './data/sampleWebsiteScenario';
import { sampleWhatsAppScenario } from './data/sampleWhatsAppScenario';
import { sampleInstagramScenario } from './data/sampleInstagramScenario';
import { sampleTelegramScenario } from './data/sampleTelegramScenario';
import { sampleCallScenario } from './data/sampleCallScenario';
import {
  Activity,
  Terminal,
  Shield,
  Smartphone,
  Monitor,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  StopCircle
} from 'lucide-react';
import AwarenessReportView from './components/report/AwarenessReportView';
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

  // Awareness & Remediation Report state (Step 4)
  const [awarenessReport, setAwarenessReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState(null);
  const [reportIsStale, setReportIsStale] = useState(false);
  const reportRequestedRef = useRef(false);

  // Outcome Engine & Manual Termination state (Step 2)
  const [outcomeNotice, setOutcomeNotice] = useState(null); // { type: 'positive'|'negative'|'incomplete', message }
  const [showEndConfirmModal, setShowEndConfirmModal] = useState(false);
  const [isEndingSimulation, setIsEndingSimulation] = useState(false);
  const [isRedoingSimulation, setIsRedoingSimulation] = useState(false);
  const observationStartedRef = useRef(false);
  const outcomeNavTimerRef = useRef(null);

  const sampleScenariosByChannel = {
    email: sampleScenario,
    chat: sampleChatScenario,
    sms: sampleSmsScenario,
    website: sampleWebsiteScenario,
    whatsapp: sampleWhatsAppScenario,
    instagram: sampleInstagramScenario,
    telegram: sampleTelegramScenario,
    call: sampleCallScenario
  };

  const handleScenarioGenerated = (scenario, sessionId, meta) => {
    setCurrentScenario(scenario);
    setCurrentSessionId(sessionId);
    setSessionStatus('active');
    terminalStatusRef.current = null;
    scoreRequestedRef.current = false;
    reportRequestedRef.current = false;
    setBehaviorScore(null);
    setAwarenessReport(null);
    setReportLoading(false);
    setReportError(null);
    setReportIsStale(false);
    setSessionSyncError(null);
    setGenerationMeta(meta || null);

    if (meta?.prompt) setSavedPrompt(meta.prompt);
    if (meta?.channel) setSavedChannel(meta.channel);

    setOutcomeNotice(null);
    setSimulationCompletedData(null);
    setEvents([]);
    setActiveView('simulation');
  };

  const handleAction = (event) => {
    console.log('[Simulation Event Dispatched]:', event);
    setEvents((prev) => [event, ...prev]);

    // Start observation window countdown on backend upon first interaction/open event
    if (
      currentSessionId &&
      !observationStartedRef.current &&
      ['message_opened', 'conversation_opened', 'virtual_page_viewed', 'scenario_viewed'].includes(event?.eventType)
    ) {
      observationStartedRef.current = true;
      fetch(`/api/sessions/${currentSessionId}/observation-window`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }).catch((err) => {
        console.warn('[Observation Window Start Warning]:', err);
      });
    }
  };

  /**
   * Terminal completion handler:
   * Maps outcome to lifecycle status and updates backend session atomically via POST /api/sessions/:id/outcome or PATCH /status.
   * Enforces single-outcome-wins, displays outcome notification, and auto-navigates to report.
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
      // 1. Update session status
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
        return;
      }

      setSessionStatus(data.session?.status || targetStatus);
      setSimulationCompletedData({
        ...result,
        session: data.session,
        backendStatus: data.session?.status || targetStatus
      });
      setSessionSyncError(null);

      // 2. Trigger outcome evaluation and deterministic score calculation
      let resolvedOutcome = 'incomplete';
      if (currentSessionId && !scoreRequestedRef.current) {
        scoreRequestedRef.current = true;
        try {
          const scoreRes = await fetch(`/api/sessions/${currentSessionId}/score`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          const scoreData = await scoreRes.json();
          const scoreObj = scoreData.scoreRecord || scoreData.score;
          if (scoreRes.ok && scoreData.success && scoreObj) {
            setBehaviorScore(scoreObj);
            resolvedOutcome = scoreObj.outcome || (targetStatus === 'reported' || targetStatus === 'safe_exit' ? 'positive' : 'negative');
          }
        } catch (scoreErr) {
          console.error('[Session Scoring Error]:', scoreErr);
        }
      }

      // 3. Show brief outcome notification
      if (resolvedOutcome === 'positive' || targetStatus === 'reported' || targetStatus === 'safe_exit') {
        setOutcomeNotice({
          type: 'positive',
          message: 'Protective action recognized. Excellent security vigilance!'
        });
      } else if (resolvedOutcome === 'negative') {
        setOutcomeNotice({
          type: 'negative',
          message: "Risky action detected. Let's review what happened."
        });
      } else {
        setOutcomeNotice({
          type: 'incomplete',
          message: 'Simulation ended before a definitive attack outcome was established.'
        });
      }

      // 4. Prefetch awareness report and auto-open report view
      if (!reportRequestedRef.current) {
        reportRequestedRef.current = true;
        fetchOrGenerateReport(currentSessionId, false).catch(() => {});
      }

      // Auto-transition to report view after brief notification preview (~1200ms)
      if (outcomeNavTimerRef.current) {
        clearTimeout(outcomeNavTimerRef.current);
      }
      outcomeNavTimerRef.current = setTimeout(() => {
        setActiveView('report');
      }, 1200);

    } catch (err) {
      console.error('[Session Network Error]:', err);
      setSessionSyncError(`Network failure: could not record session status on backend (${err.message}).`);
    }
  };

  /**
   * Manual End Simulation Handler:
   * Prompts confirmation, evaluates outcome on backend, assigns 'incomplete' if no terminal condition met,
   * calculates final score, and transitions to report.
   */
  const handleManualEndSimulation = async () => {
    if (isEndingSimulation || sessionStatus !== 'active' || terminalStatusRef.current) return;
    setIsEndingSimulation(true);
    setShowEndConfirmModal(false);

    try {
      terminalStatusRef.current = 'completed';

      // Record telemetry event for manual end
      sendTelemetryEvent({
        sessionId: currentSessionId,
        eventType: 'simulation_completed',
        metadata: { trigger: 'manual_end_simulation' }
      }).catch(() => {});

      const outcomeRes = await fetch(`/api/sessions/${currentSessionId}/outcome`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manualEnd: true,
          rulesOverride: currentScenario?.terminationRules || null
        })
      });

      const data = await outcomeRes.json();
      if (!outcomeRes.ok || !data.success) {
        const errorMsg = data.error || 'Failed to finalize manual simulation end.';
        console.error('[Manual End Outcome Error]:', errorMsg);
        setSessionSyncError(errorMsg);
        setIsEndingSimulation(false);
        return;
      }

      setSessionStatus(data.session?.status || 'completed');
      if (data.scoreRecord) {
        setBehaviorScore(data.scoreRecord);
      }

      const outcomeType = data.outcome?.outcome || 'incomplete';
      if (outcomeType === 'positive') {
        setOutcomeNotice({
          type: 'positive',
          message: 'Protective action recognized.'
        });
      } else if (outcomeType === 'negative') {
        setOutcomeNotice({
          type: 'negative',
          message: "Risky action detected. Let's review what happened."
        });
      } else {
        setOutcomeNotice({
          type: 'incomplete',
          message: 'Simulation ended before a definitive attack outcome was established.'
        });
      }

      // Prefetch report & transition
      if (!reportRequestedRef.current) {
        reportRequestedRef.current = true;
        fetchOrGenerateReport(currentSessionId, false).catch(() => {});
      }

      if (outcomeNavTimerRef.current) {
        clearTimeout(outcomeNavTimerRef.current);
      }
      outcomeNavTimerRef.current = setTimeout(() => {
        setActiveView('report');
      }, 1200);

    } catch (err) {
      console.error('[Manual End Error]:', err);
      setSessionSyncError(`Failed to end simulation: ${err.message}`);
    } finally {
      setIsEndingSimulation(false);
    }
  };

  /**
   * Redo Simulation Handler:
   * Starts a brand new simulation session with a fresh sessionId in MongoDB,
   * cleanly resetting all telemetry, scoring, outcomes, and report states,
   * while preserving the existing scenario, rules, and attack classification.
   */
  const handleRedoSimulation = async () => {
    if (isRedoingSimulation) return;
    if (!currentScenario) {
      handleReturnToGenerator();
      return;
    }

    setIsRedoingSimulation(true);

    if (outcomeNavTimerRef.current) {
      clearTimeout(outcomeNavTimerRef.current);
      outcomeNavTimerRef.current = null;
    }

    try {
      const scenarioChannel = currentScenario?.channel || savedChannel || 'email';
      const scenarioId = currentScenario?.scenarioId || currentScenario?.id || `scen-${scenarioChannel}-${Date.now()}`;

      const sessionResponse = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          scenarioId,
          channel: scenarioChannel,
          terminationRules: currentScenario?.terminationRules || null,
          attackClassification: currentScenario?.attackClassification || null
        })
      });

      const sessionData = await sessionResponse.json();

      if (!sessionResponse.ok || !sessionData.success) {
        const errText = sessionData.error || `Session creation failed with status ${sessionResponse.status}`;
        console.error('[Redo Simulation Error]:', errText);
        setSessionSyncError(errText);
        setIsRedoingSimulation(false);
        return;
      }

      const newSessionId = sessionData.sessionId;

      // Cleanly reset lifecycle, scoring, telemetry and report states
      setCurrentSessionId(newSessionId);
      setSessionStatus('active');
      terminalStatusRef.current = null;
      scoreRequestedRef.current = false;
      reportRequestedRef.current = false;
      observationStartedRef.current = false;
      setBehaviorScore(null);
      setAwarenessReport(null);
      setReportLoading(false);
      setReportError(null);
      setReportIsStale(false);
      setSessionSyncError(null);
      setOutcomeNotice(null);
      setSimulationCompletedData(null);
      setEvents([]);

      // Transition immediately to simulation view
      setActiveView('simulation');
    } catch (err) {
      console.error('[Redo Simulation Network Error]:', err);
      setSessionSyncError(`Failed to restart simulation: ${err.message}`);
    } finally {
      setIsRedoingSimulation(false);
    }
  };

  /**
   * Generates or fetches awareness report from backend.
   */
  const fetchOrGenerateReport = async (sessionId, forceRetry = false) => {
    if (!sessionId) return;
    if (reportLoading && !forceRetry) return;

    setReportLoading(true);
    setReportError(null);

    try {
      // Ensure session is scored before generating awareness report
      if (!behaviorScore || forceRetry) {
        try {
          const scoreRes = await fetch(`/api/sessions/${sessionId}/score`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          if (scoreRes.ok) {
            const scoreData = await scoreRes.json();
            const scoreObj = scoreData?.scoreRecord || scoreData?.score;
            if (scoreObj) {
              setBehaviorScore(scoreObj);
            }
          }
        } catch (scoreErr) {
          console.warn('[Score resolution before report warning]:', scoreErr);
        }
      }

      const response = await fetch(`/api/sessions/${sessionId}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          scenarioMeta: {
            title: currentScenario?.title,
            category: currentScenario?.category
          }
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        const errorMsg = data.error || `Report generation failed (HTTP ${response.status})`;
        console.error('[Awareness Report Error]:', errorMsg);
        setReportError(errorMsg);
        setReportLoading(false);
        return;
      }

      setAwarenessReport(data.report);
      setReportIsStale(false);
      setReportLoading(false);
    } catch (err) {
      console.error('[Awareness Report Network Error]:', err);
      setReportError(`Network failure while generating report (${err.message}).`);
      setReportLoading(false);
    }
  };

  const handleOpenReport = () => {
    setActiveView('report');
    if (!awarenessReport && !reportError && currentSessionId && !reportLoading) {
      fetchOrGenerateReport(currentSessionId);
    }
  };

  const handleReturnToGenerator = async () => {
    if (outcomeNavTimerRef.current) {
      clearTimeout(outcomeNavTimerRef.current);
      outcomeNavTimerRef.current = null;
    }

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
    setAwarenessReport(null);
    setReportLoading(false);
    setReportError(null);
    setReportIsStale(false);
    scoreRequestedRef.current = false;
    reportRequestedRef.current = false;
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

  if (activeView === 'report') {
    return (
      <AwarenessReportView
        report={awarenessReport}
        score={behaviorScore}
        session={{
          sessionId: currentSessionId,
          status: sessionStatus,
          channel: currentScenario?.channel || savedChannel,
          attackClassification: currentScenario?.attackClassification || null
        }}
        attackClassification={awarenessReport?.attackClassification || currentScenario?.attackClassification || null}
        loading={reportLoading}
        error={reportError}
        isStale={reportIsStale}
        onRetry={() => fetchOrGenerateReport(currentSessionId, true)}
        onReturnToGenerator={handleReturnToGenerator}
        onRedoSimulation={handleRedoSimulation}
        isRedoing={isRedoingSimulation}
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

          {/* Manual End Simulation Button (Step 2) */}
          {sessionStatus === 'active' && (
            <button
              onClick={() => setShowEndConfirmModal(true)}
              data-testid="end-simulation-btn"
              disabled={isEndingSimulation || terminalStatusRef.current !== null}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                isEndingSimulation
                  ? 'bg-gray-800 text-gray-500 border-gray-700 cursor-not-allowed'
                  : 'bg-red-950/60 hover:bg-red-900/80 text-red-200 border-red-700/60 hover:border-red-600 shadow-sm cursor-pointer'
              }`}
            >
              <StopCircle className="w-3.5 h-3.5 text-red-400" />
              <span>{isEndingSimulation ? 'Ending...' : 'End Simulation'}</span>
            </button>
          )}

          {/* View Awareness Report Button (Step 4) */}
          {sessionStatus !== 'active' && (
            <button
              onClick={handleOpenReport}
              data-testid="view-report-btn"
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-sm transition-all cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>View Awareness Report</span>
            </button>
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

          {/* Responsive Viewport Toggle (Hidden for SMS & Call - Mobile Only) */}
          {currentScenario?.channel !== 'sms' && currentScenario?.channel !== 'call' && (
            <div data-testid="viewport-toggle-container" className="flex items-center bg-gray-800 rounded-lg p-0.5 border border-gray-700">
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
          )}

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
            currentScenario?.channel === 'sms' || currentScenario?.channel === 'call' || deviceWidthMode === 'mobile'
              ? 'w-full max-w-[420px] shadow-2xl border-x border-gray-800 my-auto rounded-xl overflow-hidden'
              : 'w-full'
          }`}
        >
          <SimulationRenderer
            scenario={currentScenario}
            sessionId={currentSessionId || 'sess-default'}
            deviceMode={deviceWidthMode}
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


        {/* Confirmation Modal for Manual End Simulation (Step 2) */}
        {showEndConfirmModal && (
          <div
            data-testid="end-confirm-modal"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
          >
            <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-950/80 border border-red-700/60 flex items-center justify-center text-red-400">
                  <StopCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">End Simulation Early?</h3>
                  <p className="text-xs text-gray-400">Confirmation required</p>
                </div>
              </div>

              <div className="text-xs text-gray-300 leading-relaxed bg-gray-950/60 p-3 rounded-lg border border-gray-800/80">
                Are you sure you want to end this simulation? Ending early before satisfying a protective or risky condition will result in an <strong>incomplete</strong> outcome.
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  data-testid="cancel-end-btn"
                  onClick={() => setShowEndConfirmModal(false)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 transition-colors"
                >
                  Cancel & Continue
                </button>
                <button
                  type="button"
                  data-testid="confirm-end-btn"
                  onClick={handleManualEndSimulation}
                  disabled={isEndingSimulation}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-red-600 hover:bg-red-500 transition-colors shadow-md shadow-red-600/30"
                >
                  {isEndingSimulation ? 'Finalizing...' : 'Confirm End'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
