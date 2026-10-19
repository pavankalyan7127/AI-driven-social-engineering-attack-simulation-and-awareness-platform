import React from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  Info,
  Clock,
  Sparkles,
  ExternalLink,
  BookOpen,
  Eye,
  Check,
  XCircle,
  HelpCircle
} from 'lucide-react';

export default function AwarenessReportView({
  report,
  score,
  session,
  loading = false,
  error = null,
  isStale = false,
  onRetry,
  onReturnToGenerator,
  onBackToSimulation
}) {
  const effectiveScore = report?.score ?? score?.score ?? 0;
  const effectiveRisk = (report?.riskLevel || score?.riskLevel || 'moderate').toLowerCase();
  const effectiveChannel = report?.channel || session?.channel || 'simulation';
  const effectiveOutcome = session?.status || 'completed';

  const riskBadgeStyles = {
    low: {
      bg: 'bg-emerald-950/70 border-emerald-700/80 text-emerald-300',
      label: 'Low Risk',
      accent: 'text-emerald-400',
      ring: 'border-emerald-500',
      meterBg: 'bg-emerald-500'
    },
    moderate: {
      bg: 'bg-yellow-950/70 border-yellow-700/80 text-yellow-300',
      label: 'Moderate Risk',
      accent: 'text-yellow-400',
      ring: 'border-yellow-500',
      meterBg: 'bg-yellow-500'
    },
    high: {
      bg: 'bg-orange-950/70 border-orange-700/80 text-orange-300',
      label: 'High Risk',
      accent: 'text-orange-400',
      ring: 'border-orange-500',
      meterBg: 'bg-orange-500'
    },
    critical: {
      bg: 'bg-red-950/70 border-red-700/80 text-red-300',
      label: 'Critical Risk',
      accent: 'text-red-400',
      ring: 'border-red-500',
      meterBg: 'bg-red-500'
    }
  };

  const riskMeta = riskBadgeStyles[effectiveRisk] || riskBadgeStyles.moderate;

  // 1. Loading State
  if (loading) {
    return (
      <div
        data-testid="report-loading-state"
        className="flex flex-col items-center justify-center min-h-screen w-full bg-gray-950 text-gray-200 px-4 font-sans"
      >
        <div className="relative flex items-center justify-center mb-6">
          <div className="w-16 h-16 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
          <Shield className="w-7 h-7 text-blue-400 absolute animate-pulse" />
        </div>
        <h2 className="text-xl font-semibold text-white tracking-wide mb-2">
          Generating Awareness & Remediation Report
        </h2>
        <p className="text-sm text-gray-400 max-w-md text-center leading-relaxed">
          Synthesizing interaction telemetry, evaluating security behavior factors, and creating
          personalized educational recommendations...
        </p>
      </div>
    );
  }

  // 2. Error State
  if (error && !report) {
    return (
      <div
        data-testid="report-error-state"
        className="flex flex-col items-center justify-center min-h-screen w-full bg-gray-950 text-gray-200 px-4 font-sans"
      >
        <div className="w-full max-w-lg p-6 rounded-2xl bg-gray-900 border border-red-900/60 shadow-2xl text-center">
          <div className="w-12 h-12 rounded-xl bg-red-950 border border-red-800 text-red-400 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">Report Generation Unavailable</h2>
          <p className="text-xs text-red-300 bg-red-950/50 p-3 rounded-lg border border-red-900/40 mb-6 font-mono leading-relaxed">
            {error}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {onRetry && (
              <button
                onClick={onRetry}
                data-testid="retry-report-btn"
                className="w-full sm:w-auto px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Report Generation</span>
              </button>
            )}
            {onBackToSimulation && (
              <button
                onClick={onBackToSimulation}
                data-testid="back-to-simulation-btn"
                className="w-full sm:w-auto px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Return to Simulation</span>
              </button>
            )}
            {onReturnToGenerator && (
              <button
                onClick={onReturnToGenerator}
                data-testid="return-to-generator-btn"
                className="w-full sm:w-auto px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Home</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 3. Main Report View
  return (
    <div
      data-testid="report-view"
      className="flex flex-col min-h-screen w-full bg-gray-950 text-gray-100 font-sans selection:bg-blue-600 selection:text-white"
    >
      {/* Top Host Navigation Bar */}
      <header className="sticky top-0 z-30 h-14 bg-gray-900/90 backdrop-blur-md border-b border-gray-800 px-4 sm:px-8 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          {onReturnToGenerator && (
            <button
              onClick={onReturnToGenerator}
              data-testid="return-to-generator-btn"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 transition-colors font-medium cursor-pointer shadow-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-blue-400" />
              <span>Back to Home</span>
            </button>
          )}

          {onBackToSimulation && (
            <button
              onClick={onBackToSimulation}
              data-testid="back-to-simulation-btn"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition-colors font-medium cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-emerald-400" />
              <span>View Simulation</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase bg-blue-950/80 text-blue-300 border border-blue-800">
            Channel: {effectiveChannel}
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase bg-gray-800 text-gray-300 border border-gray-700">
            Outcome: {effectiveOutcome}
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-8 space-y-6">
        {/* Stale report warning banner if score revision has been incremented */}
        {isStale && (
          <div
            data-testid="stale-report-notice"
            className="flex items-center justify-between p-3 rounded-xl bg-yellow-950/60 border border-yellow-800 text-yellow-300 text-xs"
          >
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-yellow-400 shrink-0" />
              <span>
                A newer behavior score exists for this session. This report corresponds to score revision{' '}
                {report?.scoreRevision || 1}.
              </span>
            </div>
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-2.5 py-1 rounded bg-yellow-800/80 hover:bg-yellow-700 text-white font-medium text-[11px] transition-colors"
              >
                Regenerate Report
              </button>
            )}
          </div>
        )}

        {/* Section A: Score & Risk Overview Banner */}
        <section
          data-testid="report-score-section"
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950 border border-gray-800 p-6 sm:p-8 shadow-2xl"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              {/* Score Meter Ring */}
              <div
                data-testid="report-score-display"
                className={`relative w-28 h-28 shrink-0 rounded-full border-4 ${riskMeta.ring} bg-gray-950 flex flex-col items-center justify-center shadow-inner`}
              >
                <span className="text-3xl font-extrabold text-white tracking-tight">
                  {effectiveScore}
                </span>
                <span className="text-[10px] text-gray-400 font-mono tracking-wider uppercase">
                  out of 100
                </span>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                    Security Awareness Report
                  </h1>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span
                    data-testid="report-risk-badge"
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border ${riskMeta.bg}`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    {riskMeta.label}
                  </span>
                  <span className="text-xs text-gray-400 font-mono">
                    Session: <span className="text-gray-300">{report?.sessionId || session?.sessionId}</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="w-full md:w-auto md:text-right text-xs text-gray-400">
              <div className="inline-block px-3 py-1.5 rounded-lg bg-gray-800/60 border border-gray-700/60 text-gray-300">
                <span className="font-semibold text-white">Scoring Version:</span>{' '}
                <span className="font-mono">{report?.scoringVersion || '1.0.0'}</span> •{' '}
                <span className="font-semibold text-white">Revision:</span>{' '}
                <span className="font-mono">{report?.scoreRevision || 1}</span>
              </div>
            </div>
          </div>

          {/* Educational Disclaimer Banner */}
          <div className="mt-6 pt-4 border-t border-gray-800/80 flex items-start gap-2.5 text-xs text-gray-400 leading-relaxed">
            <HelpCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <p>
              <strong className="text-gray-300">Educational Assessment Notice:</strong> This score
              evaluates observed interactions during this simulated exercise. It provides actionable
              awareness feedback and does not represent a comprehensive audit of your overall
              cybersecurity competence.
            </p>
          </div>
        </section>

        {/* Section F / Executive Learning Summary */}
        <section
          data-testid="report-summary-section"
          className="rounded-2xl bg-gray-900 border border-gray-800 p-6 shadow-lg"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-blue-400 uppercase tracking-wider mb-2">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span>Executive Learning Summary</span>
          </div>
          <p
            data-testid="report-summary-text"
            className="text-sm sm:text-base text-gray-200 leading-relaxed"
          >
            {report?.summary ||
              'Your simulation interaction has been evaluated. Review your positive behaviors, potential risks, and recommendations below to strengthen your defenses.'}
          </p>
        </section>

        {/* 2-Column Grid: What Went Well & Risky Behaviors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Section B: What Went Well (Strengths) */}
          <section
            data-testid="report-strengths-section"
            className="rounded-2xl bg-gray-900 border border-gray-800 p-6 shadow-lg flex flex-col"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-3">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>What Went Well (Positive Behaviors)</span>
            </div>

            <div className="flex-1 space-y-2.5">
              {report?.strengths && report.strengths.length > 0 ? (
                report.strengths.map((strength, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-950/30 border border-emerald-900/40 text-xs text-emerald-200 leading-relaxed"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{strength}</span>
                  </div>
                ))
              ) : (
                <div className="p-4 rounded-xl bg-gray-950/60 border border-gray-800 text-xs text-gray-400 italic">
                  No explicit defensive actions (such as reporting the threat or verifying sender
                  details) were recorded in this scenario.
                </div>
              )}
            </div>
          </section>

          {/* Section C: Risky Decisions (Observed Risks) */}
          <section
            data-testid="report-risky-section"
            className="rounded-2xl bg-gray-900 border border-gray-800 p-6 shadow-lg flex flex-col"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-orange-400 uppercase tracking-wider mb-3">
              <ShieldAlert className="w-4 h-4 text-orange-400" />
              <span>Risky Behaviors Observed</span>
            </div>

            <div className="flex-1 space-y-2.5">
              {report?.riskyBehaviors && report.riskyBehaviors.length > 0 ? (
                report.riskyBehaviors.map((risk, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 p-3 rounded-xl bg-orange-950/30 border border-orange-900/40 text-xs text-orange-200 leading-relaxed"
                  >
                    <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                    <span>{risk}</span>
                  </div>
                ))
              ) : (
                <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-900/30 text-xs text-emerald-300">
                  ✓ Excellent defense! No high-risk behaviors (such as submitting credentials or clicking
                  unverified malicious links) were observed.
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Section D: Threat Indicators Present in Scenario */}
        <section
          data-testid="report-indicators-section"
          className="rounded-2xl bg-gray-900 border border-gray-800 p-6 shadow-lg"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-cyan-400 uppercase tracking-wider mb-3">
            <Info className="w-4 h-4 text-cyan-400" />
            <span>Scenario Threat Indicators (Attack Vector Analysis)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {report?.threatIndicators && report.threatIndicators.length > 0 ? (
              report.threatIndicators.map((indicator, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-950/70 border border-gray-800 text-xs text-gray-300 leading-relaxed"
                >
                  <span className="w-2 h-2 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                  <span>{indicator}</span>
                </div>
              ))
            ) : (
              <div className="col-span-2 text-xs text-gray-400 italic">
                Threat indicators identified through heuristic analysis.
              </div>
            )}
          </div>
        </section>

        {/* Section E: Personalized Remediation Recommendations */}
        <section
          data-testid="report-recommendations-section"
          className="rounded-2xl bg-gray-900 border border-gray-800 p-6 shadow-lg"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-purple-400 uppercase tracking-wider mb-3">
            <BookOpen className="w-4 h-4 text-purple-400" />
            <span>Prioritized Remediation Recommendations</span>
          </div>

          <div className="space-y-3">
            {report?.recommendations && report.recommendations.length > 0 ? (
              report.recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3.5 rounded-xl bg-purple-950/20 border border-purple-900/30 text-xs sm:text-sm text-purple-200 leading-relaxed"
                >
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-purple-900/80 border border-purple-700 text-[11px] font-bold text-purple-300 shrink-0">
                    {idx + 1}
                  </span>
                  <span>{rec}</span>
                </div>
              ))
            ) : (
              <div className="text-xs text-gray-400 italic">
                Always verify sender domains, avoid clicking unfamiliar links, and never share
                credentials.
              </div>
            )}
          </div>
        </section>

        {/* Section G: Key Interaction Timeline */}
        {report?.keyEvents && report.keyEvents.length > 0 && (
          <section
            data-testid="report-timeline-section"
            className="rounded-2xl bg-gray-900 border border-gray-800 p-6 shadow-lg"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
              <Clock className="w-4 h-4 text-blue-400" />
              <span>Sanitized Interaction Timeline ({report.keyEvents.length} Events)</span>
            </div>

            <div className="space-y-2 border-l border-gray-800 pl-4 ml-2">
              {report.keyEvents.map((event, idx) => (
                <div key={idx} className="relative pb-2">
                  <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-blue-500 border border-gray-950" />
                  <div className="text-xs text-gray-200 font-medium">
                    {event.description}
                  </div>
                  <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                    Type: <span className="text-gray-400">{event.eventType}</span>
                    {event.timestamp && (
                      <>
                        {' • '}
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Bottom Navigation Toolbar */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-800">
          <div className="text-xs text-gray-500">
            Report generated at{' '}
            {report?.generatedAt ? new Date(report.generatedAt).toLocaleString() : 'Just now'} • Model:{' '}
            <span className="font-mono text-gray-400">{report?.providerModel || 'openai/gpt-oss-20b'}</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {onReturnToGenerator && (
              <button
                onClick={onReturnToGenerator}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Start New Simulation</span>
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
