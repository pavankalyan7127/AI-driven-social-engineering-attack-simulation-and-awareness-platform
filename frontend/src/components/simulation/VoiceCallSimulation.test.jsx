import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import VoiceCallSimulation from './VoiceCallSimulation';
import { sampleCallScenario } from '../../data/sampleCallScenario';

describe('VoiceCallSimulation Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock fetch for /api/scenarios/call/respond
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('/api/scenarios/call/respond')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            attackerSpeech: "Sir, we have flagged $2,850 in wire fraud. Confirm your details now.",
            sensitiveInfoDisclosed: false
          })
        });
      }
      return Promise.reject(new Error('Unknown url'));
    });
  });

  // 1. Initial incoming call rendering
  it('renders the incoming call screen with caller identity and action buttons', () => {
    const handleAction = vi.fn();
    render(
      <VoiceCallSimulation
        scenario={sampleCallScenario}
        sessionId="test-session-call-1"
        onAction={handleAction}
      />
    );

    // Verify caller information
    expect(screen.getByText('Chase Fraud Operations')).toBeInTheDocument();
    expect(screen.getByText('+1 (800) 935-9935')).toBeInTheDocument();
    expect(screen.getByText(/Suspected Spam/i)).toBeInTheDocument();

    // Verify Accept and Decline buttons
    expect(screen.getByTestId('call-answer-btn')).toBeInTheDocument();
    expect(screen.getByTestId('call-decline-btn')).toBeInTheDocument();

    // Verify scenario_viewed event emitted
    expect(handleAction).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'scenario_viewed',
        scenarioId: sampleCallScenario.scenarioId,
        sessionId: 'test-session-call-1',
        metadata: expect.objectContaining({
          channel: 'call',
        }),
      })
    );
  });

  // 1b. Rerender safeguard: ensure scenario_viewed is emitted only once
  it('does not emit duplicate scenario_viewed events during rerenders', () => {
    const handleAction = vi.fn();
    const { rerender } = render(
      <VoiceCallSimulation
        scenario={sampleCallScenario}
        sessionId="test-session-call-1"
        onAction={handleAction}
      />
    );

    expect(handleAction).toHaveBeenCalledTimes(1);

    // Trigger multiple rerenders
    rerender(
      <VoiceCallSimulation
        scenario={sampleCallScenario}
        sessionId="test-session-call-1"
        onAction={handleAction}
      />
    );
    rerender(
      <VoiceCallSimulation
        scenario={sampleCallScenario}
        sessionId="test-session-call-1"
        onAction={handleAction}
      />
    );

    const viewedCalls = handleAction.mock.calls.filter(c => c[0].eventType === 'scenario_viewed');
    expect(viewedCalls.length).toBe(1);
  });

  // 2. Reject incoming call flow
  it('declines the call when Decline button is clicked and triggers positive termination', () => {
    const handleAction = vi.fn();
    const handleComplete = vi.fn();

    render(
      <VoiceCallSimulation
        scenario={sampleCallScenario}
        sessionId="test-session-call-1"
        onAction={handleAction}
        onComplete={handleComplete}
      />
    );

    const declineBtn = screen.getByTestId('call-decline-btn');
    fireEvent.click(declineBtn);

    // Verify call_rejected event emitted
    expect(handleAction).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'call_rejected',
        metadata: expect.objectContaining({
          callerNumber: '+1 (800) 935-9935',
        }),
      })
    );

    // Verify onComplete callback
    expect(handleComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'safe_exit',
        action: 'call_rejected',
        scenarioId: sampleCallScenario.scenarioId,
      })
    );
  });

  // 3. Report and block caller flow
  it('opens report modal and confirms blocking and threat reporting', () => {
    const handleAction = vi.fn();
    const handleComplete = vi.fn();

    render(
      <VoiceCallSimulation
        scenario={sampleCallScenario}
        sessionId="test-session-call-1"
        onAction={handleAction}
        onComplete={handleComplete}
      />
    );

    // Click Report / Block button
    const reportBtn = screen.getByTestId('call-report-spam-btn');
    fireEvent.click(reportBtn);

    expect(screen.getByText('Report Vishing Scam Call')).toBeInTheDocument();

    // Confirm block and report
    const confirmBtn = screen.getByTestId('confirm-report-btn');
    fireEvent.click(confirmBtn);

    expect(handleAction).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'user_blocked_sender',
      })
    );

    expect(handleAction).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'threat_reported',
        metadata: expect.objectContaining({
          reportedTarget: true,
        }),
      })
    );

    expect(handleComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'reported',
        action: 'threat_reported',
      })
    );
  });

  // 4. Answer incoming call and enter active in-call screen
  it('answers call, emits call_answered, and displays in-call controls without transcript', () => {
    const handleAction = vi.fn();

    render(
      <VoiceCallSimulation
        scenario={sampleCallScenario}
        sessionId="test-session-call-1"
        onAction={handleAction}
      />
    );

    const answerBtn = screen.getByTestId('call-answer-btn');
    fireEvent.click(answerBtn);

    expect(handleAction).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'call_answered',
      })
    );

    // Verify transcript is NOT displayed on the UI as requested
    expect(screen.queryByText('Live Audio Transcript')).not.toBeInTheDocument();
    // Verify phone call controls are rendered
    expect(screen.getByTestId('call-hangup-btn')).toBeInTheDocument();
    expect(screen.getByTestId('call-keypad-toggle-btn')).toBeInTheDocument();
    expect(screen.getByText('Chase Fraud Operations')).toBeInTheDocument();
  });

  // 5. Dial pad (Keypad) interactivity
  it('toggles DTMF keypad and allows pressing digit keys', () => {
    const handleAction = vi.fn();

    render(
      <VoiceCallSimulation
        scenario={sampleCallScenario}
        sessionId="test-session-call-1"
        onAction={handleAction}
      />
    );

    // Answer call
    fireEvent.click(screen.getByTestId('call-answer-btn'));

    // Open keypad
    const keypadBtn = screen.getByTestId('call-keypad-toggle-btn');
    fireEvent.click(keypadBtn);

    expect(screen.getByTestId('keypad-sheet')).toBeInTheDocument();

    // Click digit 9
    const key9 = screen.getByRole('button', { name: /^9/ });
    fireEvent.click(key9);

    expect(handleAction).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'dtmf_keypad_pressed',
        metadata: expect.objectContaining({
          digit: '9',
        }),
      })
    );
  });

  // 6. User refusal response flow
  it('handles user verbal resistance and receives caller escalation response', async () => {
    const handleAction = vi.fn();

    render(
      <VoiceCallSimulation
        scenario={sampleCallScenario}
        sessionId="test-session-call-1"
        onAction={handleAction}
      />
    );

    // Answer call
    fireEvent.click(screen.getByTestId('call-answer-btn'));

    // Open simulate presets drawer
    fireEvent.click(screen.getByText(/Simulate Voice Input/i));

    // Click refusal preset
    const presetBtn = screen.getByText(/I refuse to share details over the phone/i);
    fireEvent.click(presetBtn);

    expect(handleAction).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'speech_input_provided',
      })
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/scenarios/call/respond',
        expect.anything()
      );
    });
  });

  // 7. Sensitive data disclosure (Negative Termination Flow)
  it('detects credential disclosure and terminates with negative outcome', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        attackerSpeech: "Thank you. Your card credentials have been received.",
        sensitiveInfoDisclosed: true
      })
    });

    const handleAction = vi.fn();
    const handleComplete = vi.fn();

    render(
      <VoiceCallSimulation
        scenario={sampleCallScenario}
        sessionId="test-session-call-1"
        onAction={handleAction}
        onComplete={handleComplete}
      />
    );

    // Answer call
    fireEvent.click(screen.getByTestId('call-answer-btn'));

    // Open simulate presets drawer
    fireEvent.click(screen.getByText(/Simulate Voice Input/i));

    // Click preset that leaks credit card digits
    const leakCardBtn = screen.getByText(/\[Leak Card\] 4231-5555-8888-1234/i);
    fireEvent.click(leakCardBtn);

    await waitFor(() => {
      expect(handleAction).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'sensitive_info_disclosed',
        })
      );
      expect(handleAction).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'credential_submitted',
        })
      );
    });
  });

  // 8. Hang up active call
  it('safely hangs up call when end-call button is clicked', () => {
    const handleAction = vi.fn();
    const handleComplete = vi.fn();

    render(
      <VoiceCallSimulation
        scenario={sampleCallScenario}
        sessionId="test-session-call-1"
        onAction={handleAction}
        onComplete={handleComplete}
      />
    );

    // Answer call
    fireEvent.click(screen.getByTestId('call-answer-btn'));

    // Hang up
    const hangupBtn = screen.getByTestId('call-hangup-btn');
    fireEvent.click(hangupBtn);

    expect(handleAction).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'call_hung_up',
      })
    );

    expect(handleComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'safe_exit',
        action: 'call_hung_up',
      })
    );
  });

  // 9. Graceful fallback on missing scenario
  it('renders fallback when scenario data is missing', () => {
    render(<VoiceCallSimulation scenario={null} />);
    expect(screen.getByText('Call Scenario Unavailable')).toBeInTheDocument();
  });
});
