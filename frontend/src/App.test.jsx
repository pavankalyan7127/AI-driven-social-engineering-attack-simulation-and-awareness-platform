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

      // Verify returning to Home view with prompt preserved
      await waitFor(() => {
        expect(screen.getByText(/AI Social Engineering Simulator/i)).toBeInTheDocument();
        expect(screen.getByTestId('prompt-input').value).toBe(testPrompt);
        expect(abandonedPatchSent).toBe(true);
      });
    });
  });
});
