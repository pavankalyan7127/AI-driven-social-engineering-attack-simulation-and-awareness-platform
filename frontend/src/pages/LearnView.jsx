import React from 'react';
import {
  BookOpen,
  Shield,
  Search,
  CheckCircle2,
  AlertTriangle,
  Award,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Brain,
  FileCheck
} from 'lucide-react';

export default function LearnView({ onBackToHome }) {
  return (
    <div className="min-h-screen bg-[#0b0f17] text-gray-100 flex flex-col font-sans select-none">
      {/* Hero Header */}
      <section className="relative overflow-hidden py-14 px-6 border-b border-gray-800/80 bg-gradient-to-b from-blue-950/20 via-transparent to-transparent">
        <div className="max-w-5xl mx-auto space-y-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/40 border border-blue-500/30 text-blue-300 text-xs font-semibold uppercase tracking-wider">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Platform Guide & Learning Hub</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            How The Platform Works
          </h1>

          <p className="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Understand the complete end-to-end simulation flow, defense rules, AI behavior, and scoring rubrics for both <strong>Standard Mode</strong> and <strong>Cyber Detective Mode</strong>.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-12 flex-1 space-y-16">
        {/* Section 1: Standard Simulation Mode Flow */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-md">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                1. Standard Simulation Mode
              </h2>
              <p className="text-xs text-gray-400">
                Autonomous AI attack recreation with dynamic multi-turn interactions.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-[#131b2a] border border-gray-800 flex flex-col gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-600/30 text-blue-300 font-mono text-xs font-bold flex items-center justify-center">1</span>
              <h3 className="text-sm font-semibold text-white">Natural Prompt & Vision</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Describe any social engineering threat in plain language or drop screenshots of real scams.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#131b2a] border border-gray-800 flex flex-col gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-600/30 text-blue-300 font-mono text-xs font-bold flex items-center justify-center">2</span>
              <h3 className="text-sm font-semibold text-white">AI Engine Generation</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Groq predicts the channel, synthesizes realistic brand personas, and mounts an authentic interactive replica.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#131b2a] border border-gray-800 flex flex-col gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-600/30 text-blue-300 font-mono text-xs font-bold flex items-center justify-center">3</span>
              <h3 className="text-sm font-semibold text-white">Interactive Defense</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Chat with the attacker, speak on live simulated phone calls, or inspect hyperlinks, forms, and email headers.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#131b2a] border border-gray-800 flex flex-col gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-600/30 text-blue-300 font-mono text-xs font-bold flex items-center justify-center">4</span>
              <h3 className="text-sm font-semibold text-white">Awareness Report</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Get an instant forensic behavioral audit, strength badges, risky behavioral insights, and tailored defense advice.
              </p>
            </div>
          </div>

          {/* Standard Mode Scoring Matrix */}
          <div className="p-5 rounded-xl bg-gradient-to-r from-blue-950/30 to-indigo-950/20 border border-blue-900/40 space-y-3">
            <h4 className="text-sm font-bold text-blue-300 flex items-center gap-2">
              <Award className="w-4 h-4 text-blue-400" />
              <span>Standard Mode Scoring Rubric (0 – 100 Points)</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-gray-900/70 border border-gray-800">
                <span className="font-bold text-emerald-400 block mb-1">Safe Exit / Threat Report (+30 to +50 pts)</span>
                <p className="text-gray-400 text-[11px]">Reporting threats, hanging up on callers, or safely deleting/blocking scam channels without giving in.</p>
              </div>
              <div className="p-3 rounded-lg bg-gray-900/70 border border-gray-800">
                <span className="font-bold text-blue-400 block mb-1">Inspection & Verification (+15 to +25 pts)</span>
                <p className="text-gray-400 text-[11px]">Spotting fake email domains, checking phone numbers, testing headers, or questioning caller credentials.</p>
              </div>
              <div className="p-3 rounded-lg bg-gray-900/70 border border-gray-800">
                <span className="font-bold text-red-400 block mb-1">Credential Leak / Link Click (Penalty)</span>
                <p className="text-gray-400 text-[11px]">Submitting login credentials, reading card/CVV over the phone, or clicking untrusted shortened links.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Cyber Detective Mode Flow */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-md">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                2. Cyber Detective Mode
              </h2>
              <p className="text-xs text-gray-400">
                3-Round Real vs. Fake Triage Arena with strict forensic evidence analysis.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-[#131b2a] border border-gray-800 flex flex-col gap-2">
              <span className="w-6 h-6 rounded-full bg-amber-600/30 text-amber-300 font-mono text-xs font-bold flex items-center justify-center">R1</span>
              <h3 className="text-sm font-semibold text-white">First Communication</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Carefully triage the first message, call, or email. Is it a legitimate operational advisory or a malicious attack?
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#131b2a] border border-gray-800 flex flex-col gap-2">
              <span className="w-6 h-6 rounded-full bg-amber-600/30 text-amber-300 font-mono text-xs font-bold flex items-center justify-center">R2</span>
              <h3 className="text-sm font-semibold text-white">Second Communication</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Analyze subtle spoofed headers, phone numbers, or presence of urgent links against official portal guidelines.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#131b2a] border border-gray-800 flex flex-col gap-2">
              <span className="w-6 h-6 rounded-full bg-amber-600/30 text-amber-300 font-mono text-xs font-bold flex items-center justify-center">R3</span>
              <h3 className="text-sm font-semibold text-white">Final Round & Triage</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Confirm your verdict. Receive a forensic score breakdown showing genuine safeguards vs. attacker red flags.
              </p>
            </div>
          </div>

          {/* Golden Rule of Cybersecurity */}
          <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/60 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>The Golden Rule Enforced in Real Communications</span>
            </h4>
            <p className="text-xs text-amber-200/90 leading-relaxed">
              Authentic organizations, genuine banks, and IT teams <strong>NEVER send direct clickable login links</strong> or ask for CVVs, passwords, or OTPs. Legitimate messages strictly instruct users to navigate independently to their official mobile banking apps or saved bookmarks.
            </p>
          </div>

          {/* Detective Mode Scoring Matrix */}
          <div className="p-5 rounded-xl bg-gradient-to-r from-amber-950/30 to-orange-950/20 border border-amber-900/40 space-y-3">
            <h4 className="text-sm font-bold text-amber-300 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Detective Mode Scoring Rules (Max 100 Points)</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-gray-900/70 border border-gray-800">
                <span className="font-bold text-emerald-400 block mb-1">Correct Verdict (+30 pts)</span>
                <p className="text-gray-400 text-[11px]">Correctly identifying REAL as legitimate, or FAKE as attack.</p>
              </div>
              <div className="p-3 rounded-lg bg-gray-900/70 border border-gray-800">
                <span className="font-bold text-amber-400 block mb-1">False Positive (+10 pts)</span>
                <p className="text-gray-400 text-[11px]">Flagging a REAL notice as an attack. Partial credit for caution.</p>
              </div>
              <div className="p-3 rounded-lg bg-gray-900/70 border border-gray-800">
                <span className="font-bold text-red-400 block mb-1">Compromised (0 pts)</span>
                <p className="text-gray-400 text-[11px]">Marking a malicious attack as legitimate.</p>
              </div>
              <div className="p-3 rounded-lg bg-gray-900/70 border border-gray-800">
                <span className="font-bold text-indigo-400 block mb-1">Sweep Bonus (+10 pts)</span>
                <p className="text-gray-400 text-[11px]">Awarded if you achieve a flawless 3 out of 3 score (Max 100 pts).</p>
              </div>
            </div>
          </div>
        </div>

        {/* Back to Home CTA */}
        <div className="pt-6 text-center">
          <button
            type="button"
            onClick={onBackToHome}
            className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs inline-flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
          >
            <span>Launch a Simulation Now</span>
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
