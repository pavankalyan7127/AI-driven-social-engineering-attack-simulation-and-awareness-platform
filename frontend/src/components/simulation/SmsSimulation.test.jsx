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

  // 9. Block sender flow and positive completion callback
  it('handles block sender flow and invokes onComplete with safe_exit', () => {
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

    // Open target conversation
    fireEvent.click(screen.getByText('Campus Courier Logistics'));

    // Click block button in conversation header
    const blockBtn = screen.getByTestId('sms-block-btn');
    fireEvent.click(blockBtn);

    expect(handleAction).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'user_blocked_sender',
        metadata: expect.objectContaining({
          channel: 'sms'
        })
      })
    );

    expect(handleComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'safe_exit',
        action: 'user_blocked_sender',
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

  // 12. Correct terminal callback behavior via 3-dot options menu block
  it('correctly executes terminal callback via options menu block', () => {
    const handleComplete = vi.fn();
    render(
      <SmsSimulation
        scenario={sampleSmsScenario}
        sessionId="test-session-sms"
        onComplete={handleComplete}
      />
    );

    // Open target conversation
    fireEvent.click(screen.getByText('Campus Courier Logistics'));

    // Open 3-dot options menu
    fireEvent.click(screen.getByTestId('sms-options-menu-btn'));

    // Click block in menu
    fireEvent.click(screen.getByTestId('sms-menu-block-btn'));

    expect(handleComplete).toHaveBeenCalledTimes(1);
    expect(handleComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'safe_exit',
        action: 'user_blocked_sender'
      })
    );
  });

  // 13. Mobile Status Bar & Smartphone Shell
  it('renders native mobile status bar with time, cellular, and battery indicators', () => {
    render(
      <SmsSimulation
        scenario={sampleSmsScenario}
        sessionId="test-session-sms"
      />
    );

    const statusBar = screen.getByTestId('mobile-status-bar');
    expect(statusBar).toBeInTheDocument();
    expect(statusBar).toHaveTextContent('9:41');
    expect(statusBar).toHaveTextContent('94%');

    const container = screen.getByTestId('sms-simulation-container');
    expect(container).toHaveClass('max-w-[420px]');
    expect(container).toHaveClass('overflow-hidden');
  });

  // 14. Prohibits sending empty or whitespace messages
  it('does not send empty or whitespace messages when send is attempted', () => {
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

    // Send button should initially be disabled
    const sendBtn = screen.getByTitle('Send SMS');
    expect(sendBtn).toBeDisabled();

    // Type spaces only
    const input = screen.getByPlaceholderText('Text message (SMS)');
    fireEvent.change(input, { target: { value: '   ' } });
    expect(sendBtn).toBeDisabled();

    // Press enter on whitespace
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: false });

    // Should not emit message_sent
    const msgCalls = handleAction.mock.calls.filter(c => c[0].eventType === 'message_sent');
    expect(msgCalls.length).toBe(0);
  });

  // 15. Local conversation deletion
  it('deletes conversation locally, emits interaction_recorded, and returns to inbox', () => {
    const handleAction = vi.fn();
    render(
      <SmsSimulation
        scenario={sampleSmsScenario}
        sessionId="test-session-sms"
        onAction={handleAction}
      />
    );

    // Open third conversation (Arjun study group)
    fireEvent.click(screen.getByText('Arjun (Study Group)'));
    expect(screen.getByTitle('Back to conversation list')).toBeInTheDocument();

    // Click delete conversation button
    const deleteBtn = screen.getByTitle('Delete conversation');
    fireEvent.click(deleteBtn);

    // Should emit interaction_recorded event
    expect(handleAction).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'interaction_recorded',
        metadata: expect.objectContaining({
          action: 'delete_conversation',
          conversationId: 'conv-sms-peer',
        }),
      })
    );

    // Should return to inbox
    expect(screen.getByPlaceholderText('Search SMS conversations')).toBeInTheDocument();
    expect(screen.getByText('SMS conversation deleted.')).toBeInTheDocument();

    // Deleted conversation is removed from local list
    expect(screen.queryByText('Arjun (Study Group)')).not.toBeInTheDocument();
  });

  // 16. Missing optional fields resilience
  it('renders gracefully when optional scenario fields are omitted', () => {
    const sparseScenario = {
      scenarioId: 'scen-sparse-sms',
      channel: 'sms',
      title: 'Sparse SMS Scenario',
      conversations: [
        {
          id: 'conv-sparse-1',
          sender: {
            phoneNumber: '+1 (555) 999-0000',
            // No name, no avatar, no badge, no verificationStatus
          },
          messages: [
            {
              id: 'm-sparse-1',
              sender: 'contact',
              text: 'Minimal SMS message content.',
            }
          ]
        }
      ]
    };

    render(
      <SmsSimulation
        scenario={sparseScenario}
        sessionId="test-sparse"
      />
    );

    // Should render sender's phone number as title
    expect(screen.getByText('+1 (555) 999-0000')).toBeInTheDocument();
    expect(screen.getByText('Minimal SMS message content.')).toBeInTheDocument();

    // Opening thread should not crash
    fireEvent.click(screen.getByText('+1 (555) 999-0000'));
    expect(screen.getByPlaceholderText('Text message (SMS)')).toBeInTheDocument();
  });
});
