import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import SmsSimulation from './SmsSimulation';
import { sampleSmsScenario } from '../../data/sampleSmsScenario';

describe('SmsSimulation Component', () => {
  // 1. Conversation list rendering
  it('renders the SMS conversation list with profile and conversations', () => {
    const handleAction = vi.fn();
    render(
      <SmsSimulation
        scenario={sampleSmsScenario}
        sessionId="test-session-sms"
        onAction={handleAction}
      />
    );

    // Profile & contacts
    expect(screen.getByText('Messages')).toBeInTheDocument();
    expect(screen.getAllByText('Apex Bank Fraud Prevention').length).toBeGreaterThan(0);
    expect(screen.getByText('Campus Courier Logistics')).toBeInTheDocument();

    // scenario_viewed event emitted
    expect(handleAction).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'scenario_viewed',
        scenarioId: sampleSmsScenario.scenarioId,
        sessionId: 'test-session-sms',
        metadata: expect.objectContaining({
          channel: 'sms',
        }),
      })
    );
  });

  // 2. Opening and closing a conversation
  it('opens a conversation and returns to list when back button is clicked', () => {
    const handleAction = vi.fn();
    render(
      <SmsSimulation
        scenario={sampleSmsScenario}
        sessionId="test-session-sms"
        onAction={handleAction}
      />
    );

    // Open target conversation
    const targetRow = screen.getAllByText('Apex Bank Fraud Prevention')[0];
    fireEvent.click(targetRow);

    // Verify chat view elements
    expect(screen.getByTitle('Back to conversation list')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Text message (SMS)')).toBeInTheDocument();

    // Verify conversation_opened event
    expect(handleAction).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'conversation_opened',
        scenarioId: sampleSmsScenario.scenarioId,
        sessionId: 'test-session-sms',
        metadata: expect.objectContaining({
          conversationId: 'conv-sms-bank-alert',
          senderName: 'Apex Bank Fraud Prevention',
        }),
      })
    );

    // Click back button
    fireEvent.click(screen.getByTitle('Back to conversation list'));

    // Should return to list view
    expect(screen.getByPlaceholderText('Search SMS conversations')).toBeInTheDocument();
  });

  // 3. Conversation search
  it('filters conversation list based on search query', () => {
    render(
      <SmsSimulation
        scenario={sampleSmsScenario}
        sessionId="test-session-sms"
      />
    );

    const searchInput = screen.getByPlaceholderText('Search SMS conversations');
    fireEvent.change(searchInput, { target: { value: 'Campus' } });

    // Courier Logistics should be visible
    expect(screen.getByText('Campus Courier Logistics')).toBeInTheDocument();

    // Non-matching should show empty state
    fireEvent.change(searchInput, { target: { value: 'NonexistentContact123' } });
    expect(screen.getByText('No messages found')).toBeInTheDocument();
  });

  // 4. Local message sending
  it('sends a local SMS message and emits message_sent', () => {
    const handleAction = vi.fn();
    render(
      <SmsSimulation
        scenario={sampleSmsScenario}
        sessionId="test-session-sms"
        onAction={handleAction}
      />
    );

    // Open chat
    fireEvent.click(screen.getAllByText('Apex Bank Fraud Prevention')[0]);

    // Type SMS
    const input = screen.getByPlaceholderText('Text message (SMS)');
    fireEvent.change(input, { target: { value: 'STOP' } });

    // Send with enter
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: false });

    // Verify message appears in history/snippet
    expect(screen.getAllByText('STOP').length).toBeGreaterThan(0);

    // Verify message_sent event
    expect(handleAction).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'message_sent',
        metadata: expect.objectContaining({
          messageText: 'STOP',
          conversationId: 'conv-sms-bank-alert',
        }),
      })
    );
  });

  // 5. Emoji insertion
  it('inserts selected emoji into SMS composer input', () => {
    render(
      <SmsSimulation
        scenario={sampleSmsScenario}
        sessionId="test-session-sms"
      />
    );

    // Open chat
    fireEvent.click(screen.getAllByText('Apex Bank Fraud Prevention')[0]);

    // Click emoji picker
    const emojiToggle = screen.getByTitle('Insert emoji');
    fireEvent.click(emojiToggle);

    // Click on STOP emoji 🛑
    const stopButton = screen.getByText('🛑');
    fireEvent.click(stopButton);

    // Verify input contains emoji
    const input = screen.getByPlaceholderText('Text message (SMS)');
    expect(input.value).toContain('🛑');
  });

  // 6. Safe simulated-link interception
  it('intercepts simulated links safely without navigating externally', () => {
    const handleAction = vi.fn();
    render(
      <SmsSimulation
        scenario={sampleSmsScenario}
        sessionId="test-session-sms"
        onAction={handleAction}
      />
    );

    // Open chat
    fireEvent.click(screen.getAllByText('Apex Bank Fraud Prevention')[0]);

    // Find and click the simulated link
    const linkButtons = screen.getAllByText(/apex-security-card-dispute\.com/i);
    fireEvent.click(linkButtons[0]);

    // Verify simulated_link_clicked event
    expect(handleAction).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'simulated_link_clicked',
        metadata: expect.objectContaining({
          targetPhish: true,
          url: expect.stringContaining('apex-security-card-dispute.com'),
        }),
      })
    );

    // Verify intercept banner in DOM
    expect(screen.getByText(/Simulated Link Intercepted:/i)).toBeInTheDocument();
  });

  // 7. Attachment interaction
  it('handles simulated MMS attachment interactions safely', () => {
    const handleAction = vi.fn();
    render(
      <SmsSimulation
        scenario={sampleSmsScenario}
        sessionId="test-session-sms"
        onAction={handleAction}
      />
    );

    // Open chat
    fireEvent.click(screen.getAllByText('Apex Bank Fraud Prevention')[0]);

    // Click inspect attachment button
    const inspectBtn = screen.getByTitle('Inspect simulated media');
    fireEvent.click(inspectBtn);

    expect(handleAction).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'attachment_interaction',
        metadata: expect.objectContaining({
          name: 'Transaction_Receipt_84250.png',
        }),
      })
    );
    expect(screen.getByText(/Simulated MMS Media Inspected:/i)).toBeInTheDocument();
  });

  // 8. Threat-report checklist and event emission
  it('handles smishing threat reporting flow with warning sign selection', () => {
    const handleAction = vi.fn();
    const handleComplete = vi.fn();

    render(
      <SmsSimulation
        scenario={sampleSmsScenario}
        sessionId="test-session-sms"
        onAction={handleAction}
        onComplete={handleComplete}
      />
    );

    // Open chat
    fireEvent.click(screen.getAllByText('Apex Bank Fraud Prevention')[0]);

    // Click Report Smish button
    const reportBtn = screen.getByText('Report Smish');
    fireEvent.click(reportBtn);

    expect(screen.getByText(/Report Smishing \(SMS Scam\) Threat/i)).toBeInTheDocument();

    // Select indicator
    const checkbox = screen.getByLabelText(/Unsolicited Urgent Financial \/ Account Alert/i);
    fireEvent.click(checkbox);

    expect(handleAction).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'warning_sign_selected',
        metadata: expect.objectContaining({
          indicatorKey: 'unsolicitedUrgentAlert',
          selected: true,
        }),
      })
    );

    // Confirm report
    const confirmBtn = screen.getByText('Confirm & Report Threat');
    fireEvent.click(confirmBtn);

    // Verify threat_reported event
    expect(handleAction).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'threat_reported',
        metadata: expect.objectContaining({
          reportedTarget: true,
        }),
      })
    );

    // Verify onComplete callback
    expect(handleComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'reported',
        action: 'threat_reported',
        scenarioId: sampleSmsScenario.scenarioId,
      })
    );
  });

  // 9. Safe-exit flow and completion callback
  it('handles safe-exit flow and invokes onComplete', () => {
    const handleAction = vi.fn();
    const handleComplete = vi.fn();

    render(
      <SmsSimulation
        scenario={sampleSmsScenario}
        sessionId="test-session-sms"
        onAction={handleAction}
        onComplete={handleComplete}
      />
    );

    // Click safe exit icon in list header
    const exitBtns = screen.getAllByTitle(/Safe Exit/i);
    fireEvent.click(exitBtns[0]);

    expect(screen.getByText('Exit SMS Simulation Session?')).toBeInTheDocument();

    // Confirm safe exit
    const confirmExit = screen.getByText('Confirm Safe Exit');
    fireEvent.click(confirmExit);

    expect(handleAction).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'safe_exit',
      })
    );

    expect(handleComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'safe_exit',
        action: 'safe_exit',
      })
    );
  });

  // 10. Prevention of duplicate scenario_viewed events
  it('does not emit duplicate scenario_viewed events during rerenders', () => {
    const handleAction = vi.fn();
    const { rerender } = render(
      <SmsSimulation
        scenario={sampleSmsScenario}
        sessionId="test-session-sms"
        onAction={handleAction}
      />
    );

    expect(handleAction).toHaveBeenCalledTimes(1);

    // Rerender with same props
    rerender(
      <SmsSimulation
        scenario={sampleSmsScenario}
        sessionId="test-session-sms"
        onAction={handleAction}
      />
    );

    const viewedCalls = handleAction.mock.calls.filter(c => c[0].eventType === 'scenario_viewed');
    expect(viewedCalls.length).toBe(1);
  });

  // 11. Graceful handling of invalid scenario data
  it('renders graceful fallback when scenario prop is invalid or missing', () => {
    render(<SmsSimulation scenario={null} />);
    expect(screen.getByText('Scenario Unavailable')).toBeInTheDocument();
  });

  // 12. Correct terminal callback behavior
  it('correctly executes terminal callback without crashing', () => {
    const handleComplete = vi.fn();
    render(
      <SmsSimulation
        scenario={sampleSmsScenario}
        sessionId="test-session-sms"
        onComplete={handleComplete}
      />
    );

    // Safe exit initiates terminal completion
    const exitBtns = screen.getAllByTitle(/Safe Exit/i);
    fireEvent.click(exitBtns[0]);
    fireEvent.click(screen.getByText('Confirm Safe Exit'));

    expect(handleComplete).toHaveBeenCalledTimes(1);
    expect(handleComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'safe_exit',
      })
    );
  });
});
