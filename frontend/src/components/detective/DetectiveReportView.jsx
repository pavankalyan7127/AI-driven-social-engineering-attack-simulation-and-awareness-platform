import React from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  ArrowLeft,
  Search,
  Sparkles,
  Award,
  Target,
  FileText,
  HelpCircle,
  Eye,
  Check,
  ExternalLink
} from 'lucide-react';

/**
 * Cyber Detective Mode - Forensic Triage Report View.
 * 
 * Displays the 3-round performance breakdown, highlighting:
 * - Forensic clues embedded in each round (sender, links, urgency, authentication).
 * - Real vs. Fake comparisons for that channel.
 * - Accuracy, attacks caught, and false alarms.
 */
export default function DetectiveReportView({
  report,
  challenge,
  onRedo,
  onReturnHome
}) {
  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-gray-200 p-6">
        <p className="text-gray-400 mb-4">No detective report available.</p>
        <button
          onClick={onReturnHome}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
        >
          Return to Generator
        </button>
      </div>
    );
  }

  const {
    score = 0,
    maxScore = 100,
    correctCount = 0,
    totalRounds = 3,
    accuracyPercentage = 0,
    sweepBonus = 0,
    badge = {},
    metrics = {},
    roundBreakdowns = []
  } = report;

  const channel = (report.channel || challenge?.channel || 'email').toLowerCase();
  const cheatSheet = challenge?.channelCheatSheet || null;

  return (
    <div
      data-testid="detective-report-view"
      className="flex flex-col min-h-screen w-full bg-gray-950 text-gray-100 font-sans"
    >
      {/* Top Header */}
      <header className="sticky top-0 z-30 h-14 bg-gray-900/90 backdrop-blur-md border-b border-gray-800 px-4 sm:px-8 flex items-center justify-between text-xs shadow-md">
        <div className="flex items-center gap-3">
          {onReturnHome && (
            <button
              onClick={onReturnHome}
              data-testid="detective-report-home-btn"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 transition-colors font-medium cursor-pointer shadow-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-blue-400" />
              <span>Back to Home</span>
            </button>
          )}

          {onRedo && (
            <button
              onClick={onRedo}
              data-testid="detective-report-redo-btn"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors font-medium cursor-pointer shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Play Detective Mode Again</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase bg-amber-950/80 text-amber-300 border border-amber-800">
            <Search className="w-3 h-3" />
            <span>Cyber Detective Mode</span>
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase bg-blue-950/80 text-blue-300 border border-blue-800">
            Channel: {channel}
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-8 space-y-8">
        {/* Title & Introduction */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <span>Cyber Detective Triage Report</span>
            <span className="text-sm font-semibold px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Real vs. Fake Arena
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
            {report.scenarioTitle} • Detailed forensic breakdown of your ability to distinguish authentic communications from social engineering attacks.
          </p>
        </div>

        {/* Hero Scorecard & Badge */}
        <section
          data-testid="detective-scorecard-section"
          className="rounded-2xl bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950 border border-gray-800 p-6 sm:p-8 shadow-2xl relative overflow-hidden"
        >
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Score & Badge Column */}
            <div className="md:col-span-7 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-semibold">
                    Detective Performance Rating
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                    {badge.title || 'Cyber Detective'}
                  </h2>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-gray-300 leading-relaxed bg-gray-950/50 p-3.5 rounded-xl border border-gray-800/80">
                {badge.description}
              </p>

              {sweepBonus > 0 && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/70 border border-emerald-700/60 text-emerald-300 text-xs font-semibold">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>Perfect Sweep Bonus: +{sweepBonus} Points Awarded!</span>
                </div>
              )}
            </div>

            {/* Score Metric Circle */}
            <div className="md:col-span-5 flex flex-col items-center justify-center bg-gray-950/60 p-6 rounded-2xl border border-gray-800/90 space-y-2">
              <span className="text-[11px] font-mono uppercase text-gray-400">Total Detective Score</span>
              <div className="text-5xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400 font-mono">
                {score}
                <span className="text-xl sm:text-2xl text-gray-500 font-normal"> / {maxScore}</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-gray-400">
                <span>Accuracy:</span>
                <strong className="text-emerald-400 font-mono">{accuracyPercentage}%</strong>
                <span>({correctCount}/{totalRounds} Correct)</span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 mt-6 border-t border-gray-800/80">
            <div className="bg-gray-950/50 p-3 rounded-xl border border-gray-800/70 text-center">
              <span className="text-[10px] text-gray-400 uppercase font-mono block">Attacks Neutralized</span>
              <strong className="text-base text-emerald-400 font-mono">
                {metrics.attacksCaught || 0} / {metrics.totalAttacks || 0}
              </strong>
            </div>
            <div className="bg-gray-950/50 p-3 rounded-xl border border-gray-800/70 text-center">
              <span className="text-[10px] text-gray-400 uppercase font-mono block">Attacks Compromised</span>
              <strong className={`text-base font-mono ${metrics.attacksCompromised > 0 ? 'text-red-400' : 'text-gray-300'}`}>
                {metrics.attacksCompromised || 0}
              </strong>
            </div>
            <div className="bg-gray-950/50 p-3 rounded-xl border border-gray-800/70 text-center">
              <span className="text-[10px] text-gray-400 uppercase font-mono block">False Alarms (Real Blocked)</span>
              <strong className={`text-base font-mono ${metrics.falseAlarms > 0 ? 'text-yellow-400' : 'text-gray-300'}`}>
                {metrics.falseAlarms || 0} / {metrics.totalLegitimate || 0}
              </strong>
            </div>
            <div className="bg-gray-950/50 p-3 rounded-xl border border-gray-800/70 text-center">
              <span className="text-[10px] text-gray-400 uppercase font-mono block">Mode</span>
              <strong className="text-base text-amber-400 font-mono">
                Detective (3-Round)
              </strong>
            </div>
          </div>
        </section>

        {/* Round-by-Round Forensic Breakdown */}
        <section data-testid="round-breakdown-section" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Search className="w-4 h-4 text-blue-400" />
              <span>Round-by-Round Forensic Breakdown</span>
            </h2>
            <span className="text-xs text-gray-400">Inspect the exact clues embedded in each round</span>
          </div>

          <div className="space-y-4">
            {roundBreakdowns.map((round) => {
              const isReal = round.type === 'REAL';
              const isCorrect = round.isCorrect;
              const userV = round.userVerdict;

              return (
                <div
                  key={round.roundNumber}
                  data-testid={`round-card-${round.roundNumber}`}
                  className="rounded-2xl bg-gray-900 border border-gray-800 p-5 sm:p-6 shadow-xl space-y-4 transition-all hover:border-gray-700"
                >
                  {/* Round Header & Status Tags */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center font-bold text-sm text-gray-200">
                        R{round.roundNumber}
                      </div>
                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-white">
                          {round.title}
                        </h3>
                        <p className="text-[11px] text-gray-400">
                          Channel: <span className="uppercase text-gray-300 font-mono">{channel}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Actual Truth Badge */}
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-mono uppercase font-bold border flex items-center gap-1 ${
                          isReal
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                            : 'bg-red-950/80 text-red-300 border-red-800'
                        }`}
                      >
                        {isReal ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                        <span>Actual: {isReal ? 'REAL (Legitimate)' : 'FAKE (Attack)'}</span>
                      </span>

                      {/* Your Verdict Badge */}
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-mono uppercase bg-gray-800 text-gray-300 border border-gray-700">
                        Your Verdict: {userV === 'attack' ? 'Reported as Attack' : 'Marked as Legitimate'}
                      </span>

                      {/* Outcome Badge */}
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                          isCorrect
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : round.verdictResult === 'false_positive'
                            ? 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30'
                            : 'bg-red-500/10 text-red-400 border-red-500/30'
                        }`}
                      >
                        {isCorrect ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <XCircle className="w-3 h-3 text-red-400" />
                        )}
                        <span>
                          {isCorrect
                            ? `Correct (+${round.pointsAwarded} pts)`
                            : round.verdictResult === 'false_positive'
                            ? `False Alarm (+${round.pointsAwarded} pts)`
                            : `Compromised (0 pts)`}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Primary Indicator Box */}
                  {round.clues?.primaryIndicator && (
                    <div className="p-3 rounded-xl bg-gray-950/80 border border-gray-800/80 text-xs">
                      <span className="font-semibold text-blue-400 block mb-0.5">
                        Key Forensic Indicator:
                      </span>
                      <p className="text-gray-300 leading-relaxed">
                        {round.clues.primaryIndicator}
                      </p>
                    </div>
                  )}

                  {/* Red Flags or Legitimacy Safeguards List */}
                  {round.clues?.redFlagsOrSafeguards && round.clues.redFlagsOrSafeguards.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-amber-400" />
                        <span>{isReal ? 'Authentic Safeguards Observed:' : 'Attack Red Flags Embedded:'}</span>
                      </span>
                      <div className="grid grid-cols-1 gap-2">
                        {round.clues.redFlagsOrSafeguards.map((item, idx) => (
                          <div
                            key={idx}
                            className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
                              isReal
                                ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-200/90'
                                : 'bg-red-950/20 border-red-900/40 text-red-200/90'
                            }`}
                          >
                            <span className="mt-0.5">
                              {isReal ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                              )}
                            </span>
                            <span className="leading-relaxed">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Detailed Forensic Explanation */}
                  {round.clues?.forensicExplanation && (
                    <div className="text-xs text-gray-400 leading-relaxed bg-gray-950/40 p-3 rounded-lg border border-gray-800/60">
                      <strong className="text-gray-300">Analysis: </strong>
                      {round.clues.forensicExplanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Channel Spot-the-Difference Guide */}
        {cheatSheet && (
          <section
            data-testid="detective-cheatsheet-section"
            className="rounded-2xl bg-gray-900 border border-gray-800 p-6 shadow-xl space-y-4"
          >
            <div className="flex items-center gap-2.5 border-b border-gray-800 pb-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Search className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">
                  {channel.toUpperCase()} Triage Quick Reference Guide
                </h2>
                <p className="text-xs text-gray-400">
                  How to spot real vs. fake communications in 5 seconds
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Real Markers */}
              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-900/40 space-y-2">
                <h3 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wide">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Legitimate {channel.toUpperCase()} Characteristics</span>
                </h3>
                <ul className="space-y-1.5 text-xs text-emerald-200/90 pl-4 list-disc">
                  {cheatSheet.realMarkers?.map((marker, i) => (
                    <li key={i} className="leading-relaxed">{marker}</li>
                  ))}
                </ul>
              </div>

              {/* Fake Markers */}
              <div className="p-4 rounded-xl bg-red-950/20 border border-red-900/40 space-y-2">
                <h3 className="text-xs font-bold text-red-400 flex items-center gap-1.5 uppercase tracking-wide">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Phishing / Scam Attack Red Flags</span>
                </h3>
                <ul className="space-y-1.5 text-xs text-red-200/90 pl-4 list-disc">
                  {cheatSheet.fakeMarkers?.map((marker, i) => (
                    <li key={i} className="leading-relaxed">{marker}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Checklist */}
            {cheatSheet.whatToLookFor && (
              <div className="p-3.5 rounded-xl bg-gray-950 border border-gray-800 text-xs space-y-1.5">
                <span className="font-semibold text-gray-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>5-Second Inspection Checklist:</span>
                </span>
                <ul className="space-y-1 text-gray-400 pl-4 list-decimal text-[11px]">
                  {cheatSheet.whatToLookFor.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* Bottom Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-800">
          <button
            onClick={onReturnHome}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700 font-medium text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Generator</span>
          </button>

          {onRedo && (
            <button
              onClick={onRedo}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-600/30"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Launch Another Detective Challenge</span>
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
