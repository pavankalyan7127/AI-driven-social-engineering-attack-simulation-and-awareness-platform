import React from 'react';
import {
  Mail,
  MessageSquare,
  Smartphone,
  Globe,
  Phone,
  Send,
  Camera,
  Layers,
  Sparkles,
  Bot,
  Cpu,
  ArrowRight
} from 'lucide-react';

const CHANNELS_DATA = [
  {
    id: 'email',
    name: 'Email (Desktop & Mobile)',
    icon: Mail,
    color: 'text-blue-400 bg-blue-950/60 border-blue-800/60',
    description: 'Pixel-perfect webmail interface with interactive folders, sender inspection, attachment security flags, and simulated reply evaluation.',
    baseFeatures: 'Static responsive inbox layout, folder navigation, read/unread states, reporting drawer, attachment analyzer.',
    aiDynamics: 'Groq synthesizes brand lookalike headers, phishing urgency lures, dynamic reply feedback, and fake or verified corporate signatures.'
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Web',
    icon: MessageSquare,
    color: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60',
    description: 'Authentic WhatsApp Web replica with chat pane, contact status, verified green business badges, and interactive message bubbles.',
    baseFeatures: 'Split-view contact lists, chat status headers, profile details drawer, block contact termination modals.',
    aiDynamics: 'Generates conversational social engineering baits, multi-turn reply chains, spoofed phone numbers, or genuine bank debit advisories.'
  },
  {
    id: 'instagram',
    name: 'Instagram Direct (DM)',
    icon: Camera,
    color: 'text-pink-400 bg-pink-950/60 border-pink-800/60',
    description: 'Dark-mode Instagram Direct replica featuring DM message threads, blue verification checkmarks, and Details side-drawers.',
    baseFeatures: 'Instagram header bar, verified account badging, profile info panel, message input with heart & sticker placeholders.',
    aiDynamics: 'Synthesizes influencer sponsorship scams, copyright takedown baits, vote competitions, and phishing appeal URLs.'
  },
  {
    id: 'telegram',
    name: 'Telegram Web',
    icon: Send,
    color: 'text-sky-400 bg-sky-950/60 border-sky-800/60',
    description: 'Modern Telegram Web client with pinned alerts, channel broadcast formatting, file download lures, and member lists.',
    baseFeatures: 'Sidebar chat list, file preview cards with simulated progress, 3-dot threat reporting menu.',
    aiDynamics: 'Builds urgent crypto trading pitches, leaked documents, bot token prompts, or authentic administrative broadcasts.'
  },
  {
    id: 'sms',
    name: 'SMS / Text Messages',
    icon: Smartphone,
    color: 'text-amber-400 bg-amber-950/60 border-amber-800/60',
    description: 'Native smartphone SMS thread replica with Indian telecom alpha-headers (e.g. AX-HDFCBK) vs. spoofed 10-digit mobile numbers.',
    baseFeatures: 'Mobile device wrapper, timestamped bubbles, carrier info tags, and click-tracking links.',
    aiDynamics: 'Crafts lottery winning lures, urgent electricity bill disconnect notices, parcel tracking baits, or legitimate bank alerts.'
  },
  {
    id: 'call',
    name: 'Voice Call (Vishing)',
    icon: Phone,
    color: 'text-red-400 bg-red-950/60 border-red-800/60',
    description: 'Full smartphone dialer and active in-call screen with live Web Speech Synthesis (TTS) and Web Speech Recognition (STT).',
    baseFeatures: 'Incoming ring animation, DTMF touch tone keypad, call timer, audio controls, and caller identification.',
    aiDynamics: 'Generates aggressive or calm caller personas, authoritative bank fraud prevention dialogue, and multi-turn voice responses.'
  },
  {
    id: 'chat',
    name: 'Enterprise Workplace Chat',
    icon: MessageSquare,
    color: 'text-indigo-400 bg-indigo-950/60 border-indigo-800/60',
    description: 'Slack and Microsoft Teams style workplace messaging replica for executive impersonation and IT helpdesk social engineering.',
    baseFeatures: 'Channel sidebar, online presence indicators, system alerts, user profiles, and interactive reply box.',
    aiDynamics: 'Simulates CEO urgent gift card requests, payroll updates, emergency MFA bypasses, and IT server maintenance broadcasts.'
  },
  {
    id: 'website',
    name: 'Web Portal / Cloned SSO',
    icon: Globe,
    color: 'text-purple-400 bg-purple-950/60 border-purple-800/60',
    description: 'Simulated web browser with address bar, SSL security lock indicator, and multi-page credential harvesting or intranet pages.',
    baseFeatures: 'Interactive Chrome-like browser chrome, URL bar, navigation history, form fields, and simulated submission handlers.',
    aiDynamics: 'Constructs typosquatted domain names, cloned Microsoft 365 / Google SSO login portals, or official internal directories.'
  }
];

export default function SimulationsView({ onBackToHome }) {
  return (
    <div className="min-h-screen bg-[#0b0f17] text-gray-100 flex flex-col font-sans select-none">
      {/* Hero Header */}
      <section className="relative overflow-hidden py-14 px-6 border-b border-gray-800/80 bg-gradient-to-b from-blue-950/20 via-transparent to-transparent">
        <div className="max-w-5xl mx-auto space-y-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/40 border border-blue-500/30 text-blue-300 text-xs font-semibold uppercase tracking-wider">
            <Layers className="w-3.5 h-3.5" />
            <span>Architecture & Channels</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            The 8 Interactive Simulation Channels
          </h1>

          <p className="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Our platform merges <strong>robust, safe client-side simulation sandboxes</strong> with <strong>real-time generative AI intelligence</strong> to deliver fully dynamic, authentic training experiences.
          </p>
        </div>
      </section>

      {/* Main Channel Grid */}
      <main className="max-w-5xl mx-auto px-6 py-12 flex-1 space-y-12">
        {/* Architecture Highlight: Base UI + Generative AI */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-2xl bg-gradient-to-br from-[#131b2a] to-[#0f1523] border border-gray-800 shadow-xl">
          <div className="space-y-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600/30 text-blue-400 flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-white">What The Base Engine Contains</h2>
            <p className="text-xs text-gray-400 leading-relaxed">
              Every channel runs inside a sandboxed client-side simulator built with React and Tailwind CSS. The base contains native device UI widgets, simulated address bars, interactive keyboards, Web Speech TTS/STT hooks, audio generators, and forensic inspection drawers. No real networks or real credential databases are ever touched.
            </p>
          </div>

          <div className="space-y-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/30 text-indigo-400 flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-white">What Comes Dynamically From AI</h2>
            <p className="text-xs text-gray-400 leading-relaxed">
              Groq (Llama / GPT-OSS) dynamically populates the scenarios on the fly from your custom prompts. The AI automatically classifies the attack vector, selects the most realistic channel, creates deceptive lures or authentic corporate notices, and powers live multi-turn conversational replies in regional languages (English, Tamil, Telugu, Hindi).
            </p>
          </div>
        </div>

        {/* 8 Channel Cards */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-400" />
            <span>Supported Simulation Channels</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {CHANNELS_DATA.map((ch) => {
              const IconComp = ch.icon;
              return (
                <div
                  key={ch.id}
                  className="p-5 rounded-2xl bg-[#131b2a]/80 border border-gray-800/90 hover:border-gray-700 transition-all flex flex-col justify-between gap-4 shadow-lg group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${ch.color}`}>
                        <IconComp className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors">
                          {ch.name}
                        </h3>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500">
                          Channel: {ch.id}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-gray-300 leading-relaxed">
                      {ch.description}
                    </p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-gray-800/80 text-[11px]">
                    <div>
                      <strong className="text-gray-400 block font-medium">Base UI Sandbox:</strong>
                      <span className="text-gray-400">{ch.baseFeatures}</span>
                    </div>
                    <div>
                      <strong className="text-blue-400 block font-medium">AI Dynamic Engine:</strong>
                      <span className="text-gray-300">{ch.aiDynamics}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-6 text-center">
          <button
            type="button"
            onClick={onBackToHome}
            className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs inline-flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
          >
            <span>Try a Simulation Now</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-850 bg-gray-950 py-4 px-6 text-center text-xs text-gray-500">
        AI-driven social engineering attack simulation and awareness platform • Educational cybersecurity research
      </footer>
    </div>
  );
}
