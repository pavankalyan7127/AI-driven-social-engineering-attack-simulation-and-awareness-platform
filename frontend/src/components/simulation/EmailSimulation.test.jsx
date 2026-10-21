import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import EmailSimulation from './EmailSimulation';
import { sampleScenario } from '../../data/sampleScenario';

describe('EmailSimulation Component', () => {
  it('renders without crashing and displays inbox header and messages', () => {
    const handleAction = vi.fn();
    render(
      <EmailSimulation
        scenario={sampleScenario}
        sessionId="test-session-123"
        onAction={handleAction}
      />
    );

    // Verify Gmail branding
    expect(screen.getByText('Gmail')).toBeInTheDocument();
    // Verify Inbox folder
    expect(screen.getByText('Inbox')).toBeInTheDocument();
    // Verify target email row
    expect(screen.getByText('VIT Events')).toBeInTheDocument();
    expect(screen.getByText('VIT Events - Password reset')).toBeInTheDocument();

    // Verify scenario_viewed event emitted exactly once
    expect(handleAction).toHaveBeenCalledTimes(1);
    expect(handleAction).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'scenario_viewed',
        scenarioId: sampleScenario.scenarioId,
        sessionId: 'test-session-123',
      })
    );
  });

  it('does not emit scenario_viewed repeatedly on re-render', () => {
    const handleAction = vi.fn();
    const { rerender } = render(
      <EmailSimulation
        scenario={sampleScenario}
        sessionId="test-session-123"
        onAction={handleAction}
      />
    );

    expect(handleAction).toHaveBeenCalledTimes(1);

    // Re-render component with same scenario/sessionId
    rerender(
      <EmailSimulation
        scenario={sampleScenario}
        sessionId="test-session-123"
        onAction={handleAction}
      />
    );

    // Should still only have been called once for scenario_viewed
    const viewedCalls = handleAction.mock.calls.filter(call => call[0].eventType === 'scenario_viewed');
    expect(viewedCalls.length).toBe(1);
  });

  it('navigates from inbox to email view when row is clicked, and emits message_opened', () => {
    const handleAction = vi.fn();
    render(
      <EmailSimulation
        scenario={sampleScenario}
        sessionId="test-session-123"
        onAction={handleAction}
      />
    );

    // Click on target email row
    const targetRow = screen.getByText('VIT Events - Password reset');
    fireEvent.click(targetRow);

    // Should now be in email view
    expect(screen.getByTitle('Back to inbox')).toBeInTheDocument();
    expect(screen.getByText('Reset and Verify Password Now')).toBeInTheDocument();

    // Verify message_opened event was emitted
    expect(handleAction).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'message_opened',
        scenarioId: sampleScenario.scenarioId,
        sessionId: 'test-session-123',
        targetId: 'msg-vit-events-001',
      })
    );
  });

  it('navigates back to inbox when back button is clicked', () => {
    const handleAction = vi.fn();
    render(
      <EmailSimulation
        scenario={sampleScenario}
        sessionId="test-session-123"
        onAction={handleAction}
      />
    );

    // Open email
    fireEvent.click(screen.getByText('VIT Events - Password reset'));
    expect(screen.getByTitle('Back to inbox')).toBeInTheDocument();

    // Click back to inbox
    fireEvent.click(screen.getByTitle('Back to inbox'));

    // Should be back in inbox view
    expect(screen.getByPlaceholderText('Search mail')).toBeInTheDocument();
    expect(screen.getByText('NPTEL')).toBeInTheDocument();
  });

  it('filters inbox rows when user types into the search field', () => {
    const handleAction = vi.fn();
    render(
      <EmailSimulation
        scenario={sampleScenario}
        sessionId="test-session-123"
        onAction={handleAction}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search mail');
    fireEvent.change(searchInput, { target: { value: 'NPTEL' } });

    // NPTEL should be visible
    expect(screen.getByText('NPTEL')).toBeInTheDocument();
    // Arm 2 should not be in document
    expect(screen.queryByText('Arm 2')).not.toBeInTheDocument();
  });

  it('toggles star state locally and emits star event', () => {
    const handleAction = vi.fn();
    render(
      <EmailSimulation
        scenario={sampleScenario}
        sessionId="test-session-123"
        onAction={handleAction}
      />
    );

    const starButtons = screen.getAllByLabelText(/Not starred/i);
    fireEvent.click(starButtons[0]);

    expect(handleAction).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'message_starred',
      })
    );
  });

  it('safely intercepts simulated link clicks and emits simulated_link_clicked without navigating externally', () => {
    const handleAction = vi.fn();
    render(
      <EmailSimulation
        scenario={sampleScenario}
        sessionId="test-session-123"
        onAction={handleAction}
      />
    );

    // Open email
    fireEvent.click(screen.getByText('VIT Events - Password reset'));

    // Click on the phishing CTA button
    const ctaButton = screen.getByText('Reset and Verify Password Now');
    fireEvent.click(ctaButton);

    // Verify event payload
    expect(handleAction).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'simulated_link_clicked',
        scenarioId: sampleScenario.scenarioId,
        sessionId: 'test-session-123',
      })
    );

    // Verify in-app intercept banner is displayed
    expect(screen.getByText(/Simulated Link Intercepted:/i)).toBeInTheDocument();
  });

  it('handles threat reporting flow and emits threat_reported event', () => {
    const handleAction = vi.fn();
    const handleComplete = vi.fn();

    render(
      <EmailSimulation
        scenario={sampleScenario}
        sessionId="test-session-123"
        onAction={handleAction}
        onComplete={handleComplete}
      />
    );

    // Open email
    fireEvent.click(screen.getByText('VIT Events - Password reset'));

    // Click report button in toolbar
    const reportButton = screen.getByTitle('Report phishing or spam');
    fireEvent.click(reportButton);

    // Modal should appear
    expect(screen.getByText('Report Social Engineering Threat')).toBeInTheDocument();

    // Check indicator
    const senderCheckbox = screen.getByLabelText(/Suspicious Sender Address or Domain/i);
    fireEvent.click(senderCheckbox);

    // Confirm report
    const confirmButton = screen.getByText('Confirm & Report Threat');
    fireEvent.click(confirmButton);

    // Verify threat_reported event was emitted
    expect(handleAction).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'threat_reported',
        scenarioId: sampleScenario.scenarioId,
        sessionId: 'test-session-123',
      })
    );

    // Verify onComplete callback
    expect(handleComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'reported',
        action: 'threat_reported',
      })
    );

    // Verify banner
    expect(screen.getByText(/Threat Reported:/i)).toBeInTheDocument();
  });

  it('handles simulated reply sending and emits reply_sent', () => {
    const handleAction = vi.fn();

    render(
      <EmailSimulation
        scenario={sampleScenario}
        sessionId="test-session-123"
        onAction={handleAction}
      />
    );

    // Open email
    fireEvent.click(screen.getByText('VIT Events - Password reset'));

    // Click reply button
    const replyButtons = screen.getAllByText('Reply');
    fireEvent.click(replyButtons[0]);

    // Type in textarea
    const textarea = screen.getByPlaceholderText(/Type your reply here/i);
    fireEvent.change(textarea, { target: { value: 'Is this an authorized email?' } });

    // Click send
    const sendButton = screen.getByText('Send');
    fireEvent.click(sendButton);

    // Verify reply_sent event
    expect(handleAction).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'reply_sent',
        metadata: expect.objectContaining({
          replyContent: 'Is this an authorized email?',
          simulated: true,
        }),
      })
    );
  });

  it('renders graceful fallback when scenario prop is invalid or missing', () => {
    render(<EmailSimulation scenario={null} />);
    expect(screen.getByText('Scenario Unavailable')).toBeInTheDocument();
  });

  it('opens 3-dot more options dropdown and allows blocking sender as a positive termination', () => {
    const handleAction = vi.fn();
    const handleComplete = vi.fn();

    render(
      <EmailSimulation
        scenario={sampleScenario}
        sessionId="test-session-123"
        onAction={handleAction}
        onComplete={handleComplete}
      />
    );

    // Open target email
    fireEvent.click(screen.getByText('VIT Events - Password reset'));

    // Click 3-dot More options button
    const moreBtn = screen.getByLabelText('More options');
    fireEvent.click(moreBtn);

    // Menu should appear with Block, Report spam, Report phishing
    expect(screen.getByTestId('message-more-menu')).toBeInTheDocument();
    expect(screen.getByText(/Block /i)).toBeInTheDocument();
    expect(screen.getByText('Report spam')).toBeInTheDocument();
    expect(screen.getByText('Report phishing')).toBeInTheDocument();

    // Click Block sender
    fireEvent.click(screen.getByText(/Block /i));

    // Verify user_blocked_sender event emitted
    expect(handleAction).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'user_blocked_sender',
        sessionId: 'test-session-123',
      })
    );

    // Verify positive termination callback called
    expect(handleComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'safe_exit',
        action: 'user_blocked_sender',
      })
    );
  });

  it('allows reporting spam from 3-dot menu as a positive termination', () => {
    const handleAction = vi.fn();
    const handleComplete = vi.fn();

    render(
      <EmailSimulation
        scenario={sampleScenario}
        sessionId="test-session-123"
        onAction={handleAction}
        onComplete={handleComplete}
      />
    );

    // Open target email
    fireEvent.click(screen.getByText('VIT Events - Password reset'));

    // Click 3-dot More options button
    fireEvent.click(screen.getByLabelText('More options'));

    // Click Report spam
    fireEvent.click(screen.getByText('Report spam'));

    // Verify threat_reported event emitted
    expect(handleAction).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'threat_reported',
        metadata: expect.objectContaining({
          reportType: 'spam',
        }),
      })
    );

    // Verify reported termination callback
    expect(handleComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'reported',
        action: 'threat_reported',
      })
    );
  });

  it('allows blocking sender and reporting phishing from the top toolbar 3-dot menu', () => {
    const handleAction = vi.fn();
    const handleComplete = vi.fn();

    render(
      <EmailSimulation
        scenario={sampleScenario}
        sessionId="test-session-123"
        onAction={handleAction}
        onComplete={handleComplete}
      />
    );

    // Open target email
    fireEvent.click(screen.getByText('VIT Events - Password reset'));

    // Click top toolbar 3-dot More options button
    const toolbarMoreBtn = screen.getByTestId('toolbar-more-button');
    fireEvent.click(toolbarMoreBtn);

    // Verify top toolbar menu opened
    expect(screen.getByTestId('toolbar-more-menu')).toBeInTheDocument();

    // Click block sender option
    const blockButton = screen.getByRole('button', { name: /Block/i });
    fireEvent.click(blockButton);

    // Verify user_blocked_sender event emitted
    expect(handleAction).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'user_blocked_sender',
      })
    );

    // Verify safe_exit termination callback
    expect(handleComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'safe_exit',
        action: 'user_blocked_sender',
      })
    );
  });
});
