import React, { useState } from 'react';
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
  Mail,
  MessageSquare,
  Globe,
  ArrowLeft,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function App() {
  const [activeView, setActiveView] = useState('home'); // 'home' | 'simulation'
  const [currentScenario, setCurrentScenario] = useState(sampleScenario);
  const [currentSessionId, setCurrentSessionId] = useState('sess-demo-1');
  const [generationMeta, setGenerationMeta] = useState(null);

  // Home state preservation
  const [savedPrompt, setSavedPrompt] = useState('');
  const [savedChannel, setSavedChannel] = useState('email');

  // Telemetry & testing harness state
  const [events, setEvents] = useState([]);
  const [showEventLog, setShowEventLog] = useState(false);
  const [simulationCompletedData, setSimulationCompletedData] = useState(null);
  const [deviceWidthMode, setDeviceWidthMode] = useState('full'); // 'full' | 'mobile'

  const sampleScenariosByChannel = {
    email: sampleScenario,
    chat: sampleChatScenario,
    sms: sampleSmsScenario,
    website: sampleWebsiteScenario
  };

  const handleScenarioGenerated = (scenario, sessionId, meta) => {
    setCurrentScenario(scenario);
    setCurrentSessionId(sessionId || `sess-${scenario?.channel || 'gen'}-${Date.now()}`);
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

  const handleComplete = (result) => {
    console.log('[Simulation Finalized]:', result);
    setSimulationCompletedData(result);
  };

  const handleReturnToGenerator = () => {
    setActiveView('home');
    setShowEventLog(false);
  };

  const handleLoadSampleScenario = (channel) => {
    const sample = sampleScenariosByChannel[channel] || sampleScenario;
    setCurrentScenario(sample);
    setCurrentSessionId(`sess-${channel}-sample`);
    setSavedChannel(channel);
    setGenerationMeta({
      prompt: `Sample ${channel} scenario preview`,
      channel,
      modelUsed: 'sample-predefined'
    });
    setSimulationCompletedData(null);
    setEvents([]);
    setActiveView('simulation');
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
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-900 hover:bg-gray-800 text-gray-200 border border-gray-700 transition-colors font-medium text-xs shadow-sm"
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
          {/* Completed Indicator */}
          {simulationCompletedData && (
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800 text-[11px] text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                Outcome: {simulationCompletedData?.outcome || simulationCompletedData?.result?.outcome || 'Completed'}
              </span>
            </div>
          )}

          {/* Responsive test toggle */}
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
            sessionId={currentSessionId}
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
