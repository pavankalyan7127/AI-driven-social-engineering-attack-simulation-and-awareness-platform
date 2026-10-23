import React from 'react';
import { Clock, ArrowRight, Shield } from 'lucide-react';

export default function HistoryView({ onBackToHome }) {
  return (
    <div className="min-h-screen bg-[#0b0f17] text-gray-100 flex flex-col font-sans select-none">
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-center text-blue-400 mb-5 shadow-xl">
          <Clock className="w-8 h-8 animate-pulse" />
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
          Coming Soon
        </h1>

        <p className="text-sm text-gray-400 max-w-md leading-relaxed mb-8">
          The Simulation History and Progress Tracking module is currently under development. Soon you will be able to review past simulation scores, threat trends, and longitudinal behavioral improvements.
        </p>

        <button
          type="button"
          onClick={onBackToHome}
          className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs inline-flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
        >
          <Shield className="w-4 h-4" />
          <span>Back to Simulator</span>
        </button>
      </main>

      <footer className="border-t border-gray-850 bg-gray-950 py-4 px-6 text-center text-xs text-gray-500">
        AI-driven social engineering attack simulation and awareness platform • Educational cybersecurity research
      </footer>
    </div>
  );
}
