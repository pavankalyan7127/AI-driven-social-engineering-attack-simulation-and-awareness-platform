import React, { useState } from 'react';
import EmailSimulation from './components/simulation/EmailSimulation';
import ChatSimulation from './components/simulation/ChatSimulation';
import SmsSimulation from './components/simulation/SmsSimulation';
import WebsiteSimulation from './components/simulation/WebsiteSimulation';
import { sampleScenario } from './data/sampleScenario';
import { sampleChatScenario } from './data/sampleChatScenario';
import { sampleSmsScenario } from './data/sampleSmsScenario';
import { sampleWebsiteScenario } from './data/sampleWebsiteScenario';
import { Activity, Terminal, Shield, Smartphone, Monitor, Mail, MessageSquare, Globe } from 'lucide-react';

export default function App() {
  const [activeChannel, setActiveChannel] = useState('website'); // 'website', 'sms', 'chat', or 'email'
  const [events, setEvents] = useState([]);
  const [showEventLog, setShowEventLog] = useState(false);
  const [simulationCompletedData, setSimulationCompletedData] = useState(null);
  const [deviceWidthMode, setDeviceWidthMode] = useState('full'); // 'full' or 'mobile'

  const handleAction = (event) => {
    console.log('[Simulation Event Dispatched]:', event);
    setEvents((prev) => [event, ...prev]);
  };

  const handleComplete = (result) => {
    console.log('[Simulation Finalized]:', result);
    setSimulationCompletedData(result);
  };

  const clearEvents = () => {
    setEvents([]);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-gray-900 font-sans">
      {/* Simulation Host Bar (Testing Harness Controls) */}
      <div className="h-10 bg-gray-950 border-b border-gray-800 px-4 flex items-center justify-between text-xs text-gray-300 shrink-0 z-30">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-bold text-white tracking-wide">
            <Shield className="w-3.5 h-3.5 text-blue-400" />
            CYBER SIMULATION HARNESS
          </span>

          {/* Channel Selector */}
          <div className="flex items-center bg-gray-900 rounded-lg p-0.5 border border-gray-800">
            <button
              onClick={() => {
                setActiveChannel('email');
                setSimulationCompletedData(null);
              }}
              className={`flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
                activeChannel === 'email'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Mail className="w-3 h-3" />
              <span>Email</span>
            </button>
            <button
              onClick={() => {
                setActiveChannel('chat');
                setSimulationCompletedData(null);
              }}
              className={`flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
                activeChannel === 'chat'
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <MessageSquare className="w-3 h-3" />
              <span>Chat</span>
            </button>
            <button
              onClick={() => {
                setActiveChannel('sms');
                setSimulationCompletedData(null);
              }}
              className={`flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
                activeChannel === 'sms'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3 h-3" />
              <span>SMS</span>
            </button>
            <button
              onClick={() => {
                setActiveChannel('website');
                setSimulationCompletedData(null);
              }}
              className={`flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
                activeChannel === 'website'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Globe className="w-3 h-3" />
              <span>Website</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
            className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 px-2.5 py-1 rounded text-xs text-gray-200 transition-colors"
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span>Event Telemetry ({events.length})</span>
          </button>
        </div>
      </div>

      {/* Main Container rendering active simulation component */}
      <div className="flex-1 overflow-hidden relative flex items-center justify-center bg-gray-900">
        <div
          className={`h-full transition-all duration-300 ${
            deviceWidthMode === 'mobile'
              ? 'w-[420px] shadow-2xl border-x border-gray-800 my-auto rounded-xl overflow-hidden'
              : 'w-full'
          }`}
        >
          {activeChannel === 'email' && (
            <EmailSimulation
              scenario={sampleScenario}
              sessionId="sess-sim-88392"
              onAction={handleAction}
              onComplete={handleComplete}
            />
          )}
          {activeChannel === 'chat' && (
            <ChatSimulation
              scenario={sampleChatScenario}
              sessionId="sess-chat-sim-9912"
              onAction={handleAction}
              onComplete={handleComplete}
            />
          )}
          {activeChannel === 'sms' && (
            <SmsSimulation
              scenario={sampleSmsScenario}
              sessionId="sess-sms-sim-7731"
              onAction={handleAction}
              onComplete={handleComplete}
            />
          )}
          {activeChannel === 'website' && (
            <WebsiteSimulation
              scenario={sampleWebsiteScenario}
              sessionId="sess-web-sim-6621"
              onAction={handleAction}
              onComplete={handleComplete}
            />
          )}
        </div>

        {/* Live Event Inspector Overlay */}
        {showEventLog && (
          <div className="absolute bottom-0 right-0 z-50 w-full sm:w-[500px] max-h-[380px] bg-gray-950/95 border-t sm:border-l border-gray-800 shadow-2xl flex flex-col text-xs text-gray-300 font-mono backdrop-blur-md">
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
