import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App, { mapOutcomeToSessionStatus } from './App';

describe('App Component - Session Management & Lifecycle Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('mapOutcomeToSessionStatus Helper', () => {
    it('maps threat_reported and reported actions to reported status', () => {
      expect(mapOutcomeToSessionStatus({ status: 'reported' })).toBe('reported');
      expect(mapOutcomeToSessionStatus({ action: 'threat_reported' })).toBe('reported');
      expect(mapOutcomeToSessionStatus({ status: 'REPORTED' })).toBe('reported');
    });

    it('maps safe_exit to safe_exit status', () => {
      expect(mapOutcomeToSessionStatus({ status: 'safe_exit' })).toBe('safe_exit');
      expect(mapOutcomeToSessionStatus({ action: 'safe_exit' })).toBe('safe_exit');
    });

    it('maps abandoned to abandoned status', () => {
      expect(mapOutcomeToSessionStatus({ status: 'abandoned' })).toBe('abandoned');
      expect(mapOutcomeToSessionStatus({ action: 'abandoned' })).toBe('abandoned');
    });

    it('maps default or unrecognized actions to completed status', () => {
      expect(mapOutcomeToSessionStatus({ status: 'completed' })).toBe('completed');
      expect(mapOutcomeToSessionStatus({ action: 'scenario_completed' })).toBe('completed');
      expect(mapOutcomeToSessionStatus({})).toBe('completed');
      expect(mapOutcomeToSessionStatus(null)).toBe('completed');
    });
  });

  describe('Session Lifecycle Flow in App', () => {
    it('renders Home view by default', () => {
      render(<App />);
      expect(screen.getByText(/AI Social Engineering Simulator/i)).toBeInTheDocument();
      expect(screen.getByTestId('generate-button')).toBeInTheDocument();
    });

    it('transitions to simulation view using backend-generated sessionId after generation and session creation', async () => {
      global.fetch = vi.fn((url) => {
        if (url.includes('/api/scenarios/generate')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              scenario: {
                scenarioId: 'scen-email-pass-reset',
                channel: 'email',
                title: 'Urgent IT Password Reset Notice',
                emailData: {
                  id: 'm-target-1',
                  isTarget: true,
                  sender: { name: 'Support', email: 'support@alert.com' },
                  subject: 'Account Notice',
                  contentBlocks: [{ type: 'paragraph', text: 'Please verify.' }]
                }
              }
            })
          });
        }
        if (url.includes('/api/sessions') && !url.includes('/status')) {
          return Promise.resolve({
            ok: true,
            status: 201,
            json: async () => ({
              success: true,
              sessionId: 'sess-email-backend-98765',
              session: {
                sessionId: 'sess-email-backend-98765',
                scenarioId: 'scen-email-pass-reset',
                channel: 'email',
                status: 'active'
              }
            })
          });
        }
        return Promise.reject(new Error(`Unhandled URL: ${url}`));
      });

      render(<App />);

      const promptInput = screen.getByTestId('prompt-input');
      const testPrompt = 'Urgent university password update request';
      fireEvent.change(promptInput, { target: { value: testPrompt } });

      fireEvent.click(screen.getByTestId('generate-button'));

      // Wait for transition to Simulation View
      await waitFor(() => {
        expect(screen.getByTestId('return-to-generator-btn')).toBeInTheDocument();
        expect(screen.getByText('Urgent IT Password Reset Notice')).toBeInTheDocument();
      });

      // Verify Session Status badge displays 'active'
      const statusBadge = screen.getByTestId('session-status-badge');
      expect(statusBadge).toHaveTextContent(/Status: active/i);

      // Verify Telemetry button is present
      const telemetryBtn = screen.getByTestId('telemetry-toggle-btn');
      expect(telemetryBtn).toBeInTheDocument();
    });

    it('maps simulation completion to reported and updates backend session status', async () => {
      let patchPayload = null;

      global.fetch = vi.fn((url, options) => {
        if (url.includes('/api/scenarios/generate')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              scenario: {
                scenarioId: 'scen-email-pass-reset',
                channel: 'email',
                title: 'Urgent IT Password Reset Notice',
                emailData: {
                  id: 'm-target-1',
                  isTarget: true,
                  sender: { name: 'Support', email: 'support@alert.com' },
                  subject: 'Account Notice',
                  contentBlocks: [{ type: 'paragraph', text: 'Please verify.' }]
                }
              }
            })
          });
        }
        if (url.includes('/api/sessions') && !url.includes('/status')) {
          return Promise.resolve({
            ok: true,
            status: 201,
            json: async () => ({
              success: true,
              sessionId: 'sess-email-test-111',
              session: { sessionId: 'sess-email-test-111', status: 'active' }
            })
          });
        }
        if (url.includes('/api/events')) {
          return Promise.resolve({
            ok: true,
            status: 201,
            json: async () => ({
              success: true,
              event: { eventId: 'evt-test-1', eventType: 'test' }
            })
          });
        }
        if (url.includes('/api/sessions/sess-email-test-111/status')) {
          patchPayload = JSON.parse(options.body);
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              session: {
                sessionId: 'sess-email-test-111',
                status: patchPayload.status,
                endedAt: new Date().toISOString()
              }
            })
          });
        }
        return Promise.reject(new Error(`Unhandled URL: ${url}`));
      });

      render(<App />);

      fireEvent.change(screen.getByTestId('prompt-input'), {
        target: { value: 'Urgent university password update request' }
      });
      fireEvent.click(screen.getByTestId('generate-button'));

      await waitFor(() => {
        expect(screen.getByText('Urgent IT Password Reset Notice')).toBeInTheDocument();
      });

      // User interacts: opens email then reports threat
      fireEvent.click(screen.getByText('Account Notice'));

      // Click report button in toolbar
      const reportButton = screen.getByTitle('Report phishing or spam');
      fireEvent.click(reportButton);

      // Select indicator & submit report
      const senderCheckbox = screen.getByLabelText(/Suspicious Sender Address or Domain/i);
      fireEvent.click(senderCheckbox);

      const confirmButton = screen.getByText('Confirm & Report Threat');
      fireEvent.click(confirmButton);

      // Verify PATCH was called with status 'reported'
      await waitFor(() => {
        expect(patchPayload).toEqual({ status: 'reported' });
        expect(screen.getByTestId('session-status-badge')).toHaveTextContent(/Status: reported/i);
      });
    });

    it('prevents duplicate callbacks from triggering multiple conflicting updates', async () => {
      let patchCallCount = 0;

      global.fetch = vi.fn((url) => {
        if (url.includes('/api/scenarios/generate')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              scenario: {
                scenarioId: 'scen-email-pass-reset',
                channel: 'email',
                title: 'Urgent IT Password Reset Notice',
                emailData: {
                  id: 'm-target-1',
                  isTarget: true,
                  sender: { name: 'Support', email: 'support@alert.com' },
                  subject: 'Account Notice',
                  contentBlocks: [{ type: 'paragraph', text: 'Please verify.' }]
                }
              }
            })
          });
        }
        if (url.includes('/api/sessions') && !url.includes('/status')) {
          return Promise.resolve({
            ok: true,
            status: 201,
            json: async () => ({
              success: true,
              sessionId: 'sess-dup-test-222',
              session: { sessionId: 'sess-dup-test-222', status: 'active' }
            })
          });
        }
        if (url.includes('/api/events')) {
          return Promise.resolve({
            ok: true,
            status: 201,
            json: async () => ({
              success: true,
              event: { eventId: 'evt-dup-1', eventType: 'test' }
            })
          });
        }
        if (url.includes('/api/sessions/sess-dup-test-222/status')) {
          patchCallCount++;
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              session: { sessionId: 'sess-dup-test-222', status: 'reported' }
            })
          });
        }
        return Promise.reject(new Error(`Unhandled: ${url}`));
      });

      render(<App />);

      fireEvent.change(screen.getByTestId('prompt-input'), {
        target: { value: 'Urgent university password update request' }
      });
      fireEvent.click(screen.getByTestId('generate-button'));

      await waitFor(() => {
        expect(screen.getByText('Urgent IT Password Reset Notice')).toBeInTheDocument();
      });

      // Trigger threat report
      fireEvent.click(screen.getByText('Account Notice'));
      fireEvent.click(screen.getByTitle('Report phishing or spam'));
      fireEvent.click(screen.getByLabelText(/Suspicious Sender Address or Domain/i));
      fireEvent.click(screen.getByText('Confirm & Report Threat'));

      await waitFor(() => {
        expect(patchCallCount).toBe(1);
      });

      // Try triggering exit or repeat - should not fire another PATCH
      expect(patchCallCount).toBe(1);
    });

    it('handles session status sync errors gracefully without falsely claiming success', async () => {
      global.fetch = vi.fn((url) => {
        if (url.includes('/api/scenarios/generate')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              scenario: {
                scenarioId: 'scen-email-sync-err',
                channel: 'email',
                title: 'Sync Error Phish',
                emailData: {
                  id: 'm1',
                  isTarget: true,
                  sender: { name: 'Support', email: 'support@alert.com' },
                  subject: 'Account Notice',
                  contentBlocks: [{ type: 'paragraph', text: 'Please verify.' }]
                }
              }
            })
          });
        }
        if (url.includes('/api/sessions') && !url.includes('/status')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              sessionId: 'sess-sync-err-333',
              session: { sessionId: 'sess-sync-err-333', status: 'active' }
            })
          });
        }
        if (url.includes('/api/events')) {
          return Promise.resolve({
            ok: true,
            status: 201,
            json: async () => ({ success: true, event: { eventId: 'evt-sync-1' } })
          });
        }
        if (url.includes('/api/sessions/sess-sync-err-333/status')) {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: async () => ({
              success: false,
              error: 'Database lock or write timeout'
            })
          });
        }
        return Promise.reject(new Error(`Unhandled URL: ${url}`));
      });

      render(<App />);

      fireEvent.change(screen.getByTestId('prompt-input'), {
        target: { value: 'Urgent university password update request' }
      });
      fireEvent.click(screen.getByTestId('generate-button'));

      await waitFor(() => {
        expect(screen.getByText('Sync Error Phish')).toBeInTheDocument();
      });

      // Trigger completion
      fireEvent.click(screen.getByText('Account Notice'));
      fireEvent.click(screen.getByTitle('Report phishing or spam'));
      fireEvent.click(screen.getByLabelText(/Suspicious Sender Address or Domain/i));
      fireEvent.click(screen.getByText('Confirm & Report Threat'));

      // Verify sync error notice is displayed
      await waitFor(() => {
        expect(screen.getByTestId('session-sync-error')).toBeInTheDocument();
      });
    });

    it('marks active session as abandoned when returning to generator early and preserves user prompt', async () => {
      let abandonedPatchSent = false;
      let abandonedEventSent = false;
      const testPrompt = 'Urgent invoice attachment email';

      global.fetch = vi.fn((url, options) => {
        if (url.includes('/api/scenarios/generate')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              scenario: {
                scenarioId: 'scen-abandon-test',
                channel: 'email',
                title: 'Early Exit Phish',
                emailData: {
                  id: 'm1',
                  isTarget: true,
                  sender: { name: 'Support', email: 'support@alert.com' },
                  subject: 'Invoice Alert',
                  contentBlocks: [{ type: 'paragraph', text: 'Invoice notice.' }]
                }
              }
            })
          });
        }
        if (url.includes('/api/sessions') && !url.includes('/status')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              sessionId: 'sess-abandon-444',
              session: { sessionId: 'sess-abandon-444', status: 'active' }
            })
          });
        }
        if (url.includes('/api/events')) {
          const body = JSON.parse(options.body);
          if (body.eventType === 'simulation_abandoned') {
            abandonedEventSent = true;
          }
          return Promise.resolve({
            ok: true,
            status: 201,
            json: async () => ({ success: true, event: { eventId: 'evt-abandon-1' } })
          });
        }
        if (url.includes('/api/sessions/sess-abandon-444/status')) {
          const body = JSON.parse(options.body);
          if (body.status === 'abandoned') {
            abandonedPatchSent = true;
          }
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              session: { sessionId: 'sess-abandon-444', status: 'abandoned' }
            })
          });
        }
        return Promise.reject(new Error(`Unhandled URL: ${url}`));
      });

      render(<App />);

      fireEvent.change(screen.getByTestId('prompt-input'), { target: { value: testPrompt } });
      fireEvent.click(screen.getByTestId('generate-button'));

      await waitFor(() => {
        expect(screen.getByText('Early Exit Phish')).toBeInTheDocument();
      });

      // Exit early without completing
      const returnBtn = screen.getByTestId('return-to-generator-btn');
      fireEvent.click(returnBtn);

      // Verify returning to Home view with prompt preserved and abandonment transmitted
      await waitFor(() => {
        expect(screen.getByText(/AI Social Engineering Simulator/i)).toBeInTheDocument();
        expect(screen.getByTestId('prompt-input').value).toBe(testPrompt);
        expect(abandonedPatchSent).toBe(true);
        expect(abandonedEventSent).toBe(true);
      });
    });

    it('submits simulation events through shared telemetry service with correct backend sessionId', async () => {
      const recordedEvents = [];

      global.fetch = vi.fn((url, options) => {
        if (url.includes('/api/scenarios/generate')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              scenario: {
                scenarioId: 'scen-telemetry-demo',
                channel: 'email',
                title: 'Telemetry Phish Test',
                emailData: {
                  id: 'm1',
                  isTarget: true,
                  sender: { name: 'IT Desk', email: 'it@univ.edu' },
                  subject: 'IT Notice',
                  contentBlocks: [{ type: 'paragraph', text: 'Body.' }]
                }
              }
            })
          });
        }
        if (url.includes('/api/sessions') && !url.includes('/status')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              sessionId: 'sess-telemetry-valid-777',
              session: { sessionId: 'sess-telemetry-valid-777', status: 'active' }
            })
          });
        }
        if (url.includes('/api/events')) {
          recordedEvents.push(JSON.parse(options.body));
          return Promise.resolve({
            ok: true,
            status: 201,
            json: async () => ({
              success: true,
              event: { eventId: 'evt-rec-1' }
            })
          });
        }
        return Promise.reject(new Error(`Unhandled URL: ${url}`));
      });

      render(<App />);

      fireEvent.change(screen.getByTestId('prompt-input'), {
        target: { value: 'Simulate university IT notice' }
      });
      fireEvent.click(screen.getByTestId('generate-button'));

      await waitFor(() => {
        expect(screen.getByText('Telemetry Phish Test')).toBeInTheDocument();
      });

      // User interacts: opens email
      fireEvent.click(screen.getByText('IT Notice'));

      await waitFor(() => {
        const openedEvent = recordedEvents.find((e) => e.eventType === 'message_opened');
        expect(openedEvent).toBeDefined();
        expect(openedEvent.sessionId).toBe('sess-telemetry-valid-777');
      });
    });
  });

  describe('Security Behavior Scoring Integration in App (Step 3)', () => {
    it('calculates and displays security behavior score upon successful terminal completion', async () => {
      let scoreRequested = false;

      global.fetch = vi.fn((url, options) => {
        if (url.includes('/api/scenarios/generate')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              scenario: {
                scenarioId: 'scen-scoring-demo',
                channel: 'email',
                title: 'Security Scoring Demo Email',
                emailData: {
                  id: 'm-target-score',
                  isTarget: true,
                  sender: { name: 'IT Admin', email: 'admin@alert-system.org' },
                  subject: 'Urgent System Alert',
                  contentBlocks: [{ type: 'paragraph', text: 'Suspicious activity detected.' }]
                }
              }
            })
          });
        }
        if (url.includes('/api/sessions') && !url.includes('/status') && !url.includes('/score')) {
          return Promise.resolve({
            ok: true,
            status: 201,
            json: async () => ({
              success: true,
              sessionId: 'sess-scoring-12345',
              session: { sessionId: 'sess-scoring-12345', status: 'active' }
            })
          });
        }
        if (url.includes('/api/events')) {
          return Promise.resolve({
            ok: true,
            status: 201,
            json: async () => ({ success: true, event: { eventId: 'evt-s1' } })
          });
        }
        if (url.includes('/api/sessions/sess-scoring-12345/status')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              session: { sessionId: 'sess-scoring-12345', status: 'reported' }
            })
          });
        }
        if (url.includes('/api/sessions/sess-scoring-12345/score') && options?.method === 'POST') {
          scoreRequested = true;
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              scoreRecord: {
                sessionId: 'sess-scoring-12345',
                score: 95,
                riskLevel: 'low',
                scoringVersion: '1.0.0',
                status: 'final'
              }
            })
          });
        }
        return Promise.reject(new Error(`Unhandled URL: ${url}`));
      });

      render(<App />);

      fireEvent.change(screen.getByTestId('prompt-input'), {
        target: { value: 'Demonstrate scoring calculation' }
      });
      fireEvent.click(screen.getByTestId('generate-button'));

      await waitFor(() => {
        expect(screen.getByText('Security Scoring Demo Email')).toBeInTheDocument();
      });

      // Initially no score badge
      expect(screen.queryByTestId('behavior-score-badge')).not.toBeInTheDocument();

      // Open email
      fireEvent.click(screen.getByText('Urgent System Alert'));

      // Report threat
      const reportButton = screen.getByTitle('Report phishing or spam');
      fireEvent.click(reportButton);

      const senderCheckbox = screen.getByLabelText(/Suspicious Sender Address or Domain/i);
      fireEvent.click(senderCheckbox);

      const confirmButton = screen.getByText('Confirm & Report Threat');
      fireEvent.click(confirmButton);

      // Verify scoring calculation is called and badge renders
      await waitFor(() => {
        expect(scoreRequested).toBe(true);
        const scoreBadge = screen.getByTestId('behavior-score-badge');
        expect(scoreBadge).toBeInTheDocument();
        expect(scoreBadge).toHaveTextContent(/Score: 95\/100 \(low\)/i);
      });

      // Return to generator clears the scoring badge
      fireEvent.click(screen.getByTestId('return-to-generator-btn'));
      await waitFor(() => {
        expect(screen.getByTestId('generate-button')).toBeInTheDocument();
      });
    });

    it('does not trigger scoring calculation if status update fails', async () => {
      let scoreRequested = false;

      global.fetch = vi.fn((url, options) => {
        if (url.includes('/api/scenarios/generate')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              scenario: {
                scenarioId: 'scen-score-fail',
                channel: 'email',
                title: 'Fail Status Phish',
                emailData: {
                  id: 'm-fail',
                  isTarget: true,
                  sender: { name: 'Admin', email: 'admin@alert.org' },
                  subject: 'Notice',
                  contentBlocks: [{ type: 'paragraph', text: 'Content.' }]
                }
              }
            })
          });
        }
        if (url.includes('/api/sessions') && !url.includes('/status') && !url.includes('/score')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              sessionId: 'sess-fail-scoring',
              session: { sessionId: 'sess-fail-scoring', status: 'active' }
            })
          });
        }
        if (url.includes('/api/events')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true })
          });
        }
        if (url.includes('/api/sessions/sess-fail-scoring/status')) {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: async () => ({ success: false, error: 'Database transaction error' })
          });
        }
        if (url.includes('/api/sessions/sess-fail-scoring/score')) {
          scoreRequested = true;
          return Promise.resolve({ ok: true, json: async () => ({ success: true }) });
        }
        return Promise.reject(new Error(`Unhandled URL: ${url}`));
      });

      render(<App />);

      fireEvent.change(screen.getByTestId('prompt-input'), {
        target: { value: 'Scoring fail test' }
      });
      fireEvent.click(screen.getByTestId('generate-button'));

      await waitFor(() => {
        expect(screen.getByText('Fail Status Phish')).toBeInTheDocument();
      });

      // Open email & report
      fireEvent.click(screen.getByText('Notice'));
      fireEvent.click(screen.getByTitle('Report phishing or spam'));
      fireEvent.click(screen.getByLabelText(/Suspicious Sender Address or Domain/i));
      fireEvent.click(screen.getByText('Confirm & Report Threat'));

      // Status error shows
      await waitFor(() => {
        expect(screen.getByTestId('session-sync-error')).toBeInTheDocument();
      });

      // Scoring endpoint must NOT have been called
      expect(scoreRequested).toBe(false);
      expect(screen.queryByTestId('behavior-score-badge')).not.toBeInTheDocument();
    });
  });

  describe('AI Awareness and Remediation Report Flow (Step 4)', () => {
    it('displays View Awareness Report button and transitions to report view on user click', async () => {
      let reportCalledCount = 0;

      global.fetch = vi.fn((url, options) => {
        if (url.includes('/api/scenarios/generate')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              scenario: {
                scenarioId: 'scen-report-full-demo',
                channel: 'email',
                title: 'Security Alert Simulation',
                emailData: {
                  id: 'm-rep-1',
                  isTarget: true,
                  sender: { name: 'Support', email: 'support@fakedomain.org' },
                  subject: 'Urgent Action Needed',
                  contentBlocks: [{ type: 'paragraph', text: 'Action required.' }]
                }
              }
            })
          });
        }
        if (url.includes('/api/sessions') && !url.includes('/status') && !url.includes('/score') && !url.includes('/report')) {
          return Promise.resolve({
            ok: true,
            status: 201,
            json: async () => ({
              success: true,
              sessionId: 'sess-report-flow-111',
              session: { sessionId: 'sess-report-flow-111', status: 'active', channel: 'email' }
            })
          });
        }
        if (url.includes('/api/events')) {
          return Promise.resolve({
            ok: true,
            status: 201,
            json: async () => ({ success: true })
          });
        }
        if (url.includes('/api/sessions/sess-report-flow-111/status')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              session: { sessionId: 'sess-report-flow-111', status: 'reported' }
            })
          });
        }
        if (url.includes('/api/sessions/sess-report-flow-111/score')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              scoreRecord: {
                sessionId: 'sess-report-flow-111',
                score: 95,
                riskLevel: 'low',
                scoringVersion: '1.0.0',
                revision: 1
              }
            })
          });
        }
        if (url.includes('/api/sessions/sess-report-flow-111/report') && options?.method === 'POST') {
          reportCalledCount++;
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              cached: false,
              report: {
                sessionId: 'sess-report-flow-111',
                scenarioId: 'scen-report-full-demo',
                channel: 'email',
                score: 95,
                riskLevel: 'low',
                scoreRevision: 1,
                summary: 'Outstanding job recognizing deceptive cues.',
                strengths: ['Identified suspicious sender domain', 'Used security report button'],
                riskyBehaviors: [],
                threatIndicators: ['Urgency tactics'],
                recommendations: ['Maintain current email verification habits.'],
                keyEvents: []
              }
            })
          });
        }
        return Promise.reject(new Error(`Unhandled URL: ${url}`));
      });

      render(<App />);

      fireEvent.change(screen.getByTestId('prompt-input'), {
        target: { value: 'Demonstrate report navigation' }
      });
      fireEvent.click(screen.getByTestId('generate-button'));

      await waitFor(() => {
        expect(screen.getByText('Security Alert Simulation')).toBeInTheDocument();
      });

      // Initially no report button while active
      expect(screen.queryByTestId('view-report-btn')).not.toBeInTheDocument();

      // Complete simulation (open & report)
      fireEvent.click(screen.getByText('Urgent Action Needed'));
      fireEvent.click(screen.getByTitle('Report phishing or spam'));
      fireEvent.click(screen.getByLabelText(/Suspicious Sender Address or Domain/i));
      fireEvent.click(screen.getByText('Confirm & Report Threat'));

      // View Awareness Report button appears
      await waitFor(() => {
        expect(screen.getByTestId('view-report-btn')).toBeInTheDocument();
      });

      // Click to view report
      fireEvent.click(screen.getByTestId('view-report-btn'));

      // Report View is displayed
      await waitFor(() => {
        expect(screen.getByTestId('report-view')).toBeInTheDocument();
        expect(screen.getByText('Outstanding job recognizing deceptive cues.')).toBeInTheDocument();
        expect(screen.getByText('Identified suspicious sender domain')).toBeInTheDocument();
      });

      // Return to simulation view
      fireEvent.click(screen.getByTestId('back-to-simulation-btn'));
      await waitFor(() => {
        expect(screen.getByText('Security Alert Simulation')).toBeInTheDocument();
      });

      // Re-opening report view does not trigger duplicate generation
      fireEvent.click(screen.getByTestId('view-report-btn'));
      await waitFor(() => {
        expect(screen.getByTestId('report-view')).toBeInTheDocument();
      });
      expect(reportCalledCount).toBe(1);

      // Return to generator resets back to Home view
      const returnHomeBtn = screen.getAllByTestId('return-to-generator-btn')[0];
      fireEvent.click(returnHomeBtn);

      await waitFor(() => {
        expect(screen.getByTestId('generate-button')).toBeInTheDocument();
      });
    });

    it('handles report generation failure with a retry button', async () => {
      let attempts = 0;

      global.fetch = vi.fn((url, options) => {
        if (url.includes('/api/scenarios/generate')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              scenario: {
                scenarioId: 'scen-fail-retry',
                channel: 'email',
                title: 'Email Retry Test',
                emailData: {
                  id: 'm-retry',
                  isTarget: true,
                  sender: { name: 'IT Admin', email: 'it@domain.org' },
                  subject: 'Notice',
                  contentBlocks: [{ type: 'paragraph', text: 'Important update.' }]
                }
              }
            })
          });
        }
        if (url.includes('/api/sessions') && !url.includes('/status') && !url.includes('/score') && !url.includes('/report')) {
          return Promise.resolve({
            ok: true,
            status: 201,
            json: async () => ({
              success: true,
              sessionId: 'sess-fail-retry-222',
              session: { sessionId: 'sess-fail-retry-222', status: 'active', channel: 'email' }
            })
          });
        }
        if (url.includes('/api/events')) {
          return Promise.resolve({ ok: true, json: async () => ({ success: true }) });
        }
        if (url.includes('/api/sessions/sess-fail-retry-222/status')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              session: { sessionId: 'sess-fail-retry-222', status: 'completed' }
            })
          });
        }
        if (url.includes('/api/sessions/sess-fail-retry-222/score')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              scoreRecord: { score: 70, riskLevel: 'moderate', revision: 1 }
            })
          });
        }
        if (url.includes('/api/sessions/sess-fail-retry-222/report')) {
          attempts++;
          if (attempts === 1) {
            return Promise.resolve({
              ok: false,
              status: 502,
              json: async () => ({ success: false, error: 'Groq provider rate limit' })
            });
          }
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              report: {
                sessionId: 'sess-fail-retry-222',
                score: 70,
                riskLevel: 'moderate',
                summary: 'Report generated on retry successfully.',
                strengths: [],
                riskyBehaviors: [],
                threatIndicators: [],
                recommendations: ['Stay alert in enterprise chats.'],
                keyEvents: []
              }
            })
          });
        }
        return Promise.reject(new Error(`Unhandled URL: ${url}`));
      });

      render(<App />);

      fireEvent.change(screen.getByTestId('prompt-input'), {
        target: { value: 'Test retry flow' }
      });
      fireEvent.click(screen.getByTestId('generate-button'));

      await waitFor(() => {
        expect(screen.getByText('Email Retry Test')).toBeInTheDocument();
      });

      // Complete simulation (open email & report)
      fireEvent.click(screen.getByText('Notice'));
      fireEvent.click(screen.getByTitle('Report phishing or spam'));
      fireEvent.click(screen.getByLabelText(/Suspicious Sender Address or Domain/i));
      fireEvent.click(screen.getByText('Confirm & Report Threat'));

      await waitFor(() => {
        expect(screen.getByTestId('view-report-btn')).toBeInTheDocument();
      });

      // Open report - first attempt failed
      fireEvent.click(screen.getByTestId('view-report-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('report-error-state')).toBeInTheDocument();
        expect(screen.getByText(/Groq provider rate limit/i)).toBeInTheDocument();
      });

      // Click retry
      fireEvent.click(screen.getByTestId('retry-report-btn'));

      // Succeeds on retry
      await waitFor(() => {
        expect(screen.getByTestId('report-view')).toBeInTheDocument();
        expect(screen.getByText('Report generated on retry successfully.')).toBeInTheDocument();
      });
    });
  });
});
