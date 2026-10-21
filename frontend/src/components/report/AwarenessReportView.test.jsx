import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AwarenessReportView from './AwarenessReportView';

describe('AwarenessReportView Component', () => {
  const mockReport = {
    sessionId: 'sess-email-test-999',
    scenarioId: 'scen-email-01',
    channel: 'email',
    score: 85,
    riskLevel: 'low',
    scoreRevision: 1,
    scoringVersion: '1.0.0',
    reportVersion: '1.0.0',
    generatedAt: new Date().toISOString(),
    summary: 'The participant demonstrated commendable vigilance by inspecting headers and reporting the threat.',
    strengths: [
      'Reported phishing email using simulation toolbar',
      'Identified suspicious sender domain'
    ],
    riskyBehaviors: [
      'Briefly clicked on unverified link'
    ],
    threatIndicators: [
      'Urgent 24-hour deadline threat',
      'Sender address typo in domain'
    ],
    recommendations: [
      'Always inspect sender email address carefully',
      'Avoid clicking links in urgent administrative notices'
    ],
    keyEvents: [
      { eventType: 'message_opened', description: 'Opened simulated message', timestamp: new Date().toISOString() },
      { eventType: 'threat_reported', description: 'Reported threat', timestamp: new Date().toISOString() }
    ],
    status: 'completed',
    providerModel: 'openai/gpt-oss-20b'
  };

  it('renders loading state when loading is true', () => {
    render(<AwarenessReportView loading={true} />);
    expect(screen.getByTestId('report-loading-state')).toBeInTheDocument();
    expect(screen.getByText(/Generating Awareness & Remediation Report/i)).toBeInTheDocument();
  });

  it('renders error state and handles retry and redo button clicks', () => {
    const handleRetry = vi.fn();
    const handleRedo = vi.fn();

    render(
      <AwarenessReportView
        error="AI provider rate limit reached"
        onRetry={handleRetry}
        onRedoSimulation={handleRedo}
      />
    );

    expect(screen.getByTestId('report-error-state')).toBeInTheDocument();
    expect(screen.getByText(/Report Generation Unavailable/i)).toBeInTheDocument();
    expect(screen.getByText(/AI provider rate limit reached/i)).toBeInTheDocument();

    const retryBtn = screen.getByTestId('retry-report-btn');
    fireEvent.click(retryBtn);
    expect(handleRetry).toHaveBeenCalledTimes(1);

    const redoBtn = screen.getByTestId('redo-simulation-btn');
    fireEvent.click(redoBtn);
    expect(handleRedo).toHaveBeenCalledTimes(1);

    // Old View Simulation button must NOT be present
    expect(screen.queryByTestId('back-to-simulation-btn')).not.toBeInTheDocument();
  });

  it('renders full awareness report with score, risk level, strengths, and recommendations', () => {
    render(
      <AwarenessReportView
        report={mockReport}
        session={{ sessionId: 'sess-email-test-999', status: 'reported', channel: 'email' }}
      />
    );

    expect(screen.getByTestId('report-view')).toBeInTheDocument();

    // Score & Risk
    const scoreDisplay = screen.getByTestId('report-score-display');
    expect(scoreDisplay).toHaveTextContent('85');
    expect(scoreDisplay).toHaveTextContent(/out of 100/i);

    const riskBadge = screen.getByTestId('report-risk-badge');
    expect(riskBadge).toHaveTextContent(/low risk/i);

    // Summary
    expect(screen.getByTestId('report-summary-text')).toHaveTextContent(
      /commendable vigilance/i
    );

    // Strengths
    expect(screen.getByText('Reported phishing email using simulation toolbar')).toBeInTheDocument();
    expect(screen.getByText('Identified suspicious sender domain')).toBeInTheDocument();

    // Risky Behaviors
    expect(screen.getByText('Briefly clicked on unverified link')).toBeInTheDocument();

    // Threat Indicators
    expect(screen.getByText('Urgent 24-hour deadline threat')).toBeInTheDocument();
    expect(screen.getByText('Sender address typo in domain')).toBeInTheDocument();

    // Recommendations
    expect(screen.getByText('Always inspect sender email address carefully')).toBeInTheDocument();

    // Timeline
    expect(screen.getByTestId('report-timeline-section')).toBeInTheDocument();
    expect(screen.getByText('Opened simulated message')).toBeInTheDocument();

    // Educational Disclaimer
    expect(screen.getByText(/Educational Assessment Notice:/i)).toBeInTheDocument();
  });

  it('renders empty states gracefully when no strengths or risky behaviors were present', () => {
    const cleanReport = {
      ...mockReport,
      score: 100,
      riskLevel: 'low',
      strengths: [],
      riskyBehaviors: []
    };

    render(
      <AwarenessReportView
        report={cleanReport}
        session={{ sessionId: 'sess-email-test-999', status: 'completed', channel: 'email' }}
      />
    );

    // Empty strengths message
    expect(screen.getByText(/No explicit defensive actions/i)).toBeInTheDocument();

    // Clean defense message for empty risky behaviors
    expect(screen.getByText(/No high-risk behaviors/i)).toBeInTheDocument();
  });

  it('displays stale warning banner when isStale is true', () => {
    const handleRetry = vi.fn();

    render(
      <AwarenessReportView
        report={mockReport}
        isStale={true}
        onRetry={handleRetry}
      />
    );

    const staleBanner = screen.getByTestId('stale-report-notice');
    expect(staleBanner).toBeInTheDocument();
    expect(staleBanner).toHaveTextContent(/A newer behavior score exists/i);

    const regenBtn = screen.getByText('Regenerate Report');
    fireEvent.click(regenBtn);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it('renders attack classification section with proper cybersecurity terminology when provided', () => {
    const reportWithClassification = {
      ...mockReport,
      attackClassification: {
        primaryType: 'spear_phishing',
        secondaryTechniques: ['urgency_manipulation', 'credential_phishing'],
        rationale: 'Targets the user with urgent administrative demands and fake credentials request.'
      }
    };

    render(
      <AwarenessReportView
        report={reportWithClassification}
        session={{ sessionId: 'sess-email-test-999', status: 'reported', channel: 'email' }}
      />
    );

    // Section container
    const section = screen.getByTestId('report-attack-classification-section');
    expect(section).toBeInTheDocument();
    expect(screen.getByText('Social Engineering Attack Classification')).toBeInTheDocument();

    // Primary type
    const primaryTypeEl = screen.getByTestId('report-primary-attack-type');
    expect(primaryTypeEl).toBeInTheDocument();
    expect(primaryTypeEl).toHaveTextContent('Spear Phishing');
    expect(primaryTypeEl).toHaveTextContent('spear_phishing');
    expect(screen.getByText(/Targeted phishing attacks customized to specific individuals/i)).toBeInTheDocument();

    // Secondary techniques
    const secondaryEl = screen.getByTestId('report-secondary-techniques');
    expect(secondaryEl).toBeInTheDocument();
    expect(secondaryEl).toHaveTextContent('Urgency Manipulation');
    expect(secondaryEl).toHaveTextContent('Credential Phishing');

    // Rationale
    const rationaleEl = screen.getByTestId('report-classification-rationale');
    expect(rationaleEl).toBeInTheDocument();
    expect(rationaleEl).toHaveTextContent(/Targets the user with urgent administrative demands/i);

    // Fallback should not be displayed
    expect(screen.queryByTestId('report-classification-fallback')).not.toBeInTheDocument();
  });

  it('renders graceful fallback when attack classification is not available', () => {
    const reportWithoutClassification = {
      ...mockReport,
      attackClassification: null
    };

    render(
      <AwarenessReportView
        report={reportWithoutClassification}
        session={{ sessionId: 'sess-email-test-999', status: 'reported', channel: 'email' }}
      />
    );

    const fallbackEl = screen.getByTestId('report-classification-fallback');
    expect(fallbackEl).toBeInTheDocument();
    expect(fallbackEl).toHaveTextContent(/Classification unavailable for this scenario/i);
    expect(screen.queryByTestId('report-primary-attack-type')).not.toBeInTheDocument();
  });

  it('handles redo simulation action and ensures view simulation action is removed', () => {
    const handleReturn = vi.fn();
    const handleRedo = vi.fn();

    render(
      <AwarenessReportView
        report={mockReport}
        onReturnToGenerator={handleReturn}
        onRedoSimulation={handleRedo}
      />
    );

    // Old "View Simulation" action must NOT exist anywhere in report view
    expect(screen.queryByTestId('back-to-simulation-btn')).not.toBeInTheDocument();
    expect(screen.queryByText(/View Simulation/i)).not.toBeInTheDocument();

    // Redo Simulation button in top header
    const redoBtn = screen.getByTestId('redo-simulation-btn');
    expect(redoBtn).toBeInTheDocument();
    fireEvent.click(redoBtn);
    expect(handleRedo).toHaveBeenCalledTimes(1);

    // Bottom Redo Simulation button
    const bottomRedoBtn = screen.getByTestId('bottom-redo-simulation-btn');
    expect(bottomRedoBtn).toBeInTheDocument();
    fireEvent.click(bottomRedoBtn);
    expect(handleRedo).toHaveBeenCalledTimes(2);

    // Return to generator
    const returnBtn = screen.getByTestId('return-to-generator-btn');
    fireEvent.click(returnBtn);
    expect(handleReturn).toHaveBeenCalledTimes(1);
  });
});
