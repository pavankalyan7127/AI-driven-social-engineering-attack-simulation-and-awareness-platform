import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import React from 'react';
import ChatSimulation from './ChatSimulation';
import { sampleChatScenario } from '../../data/sampleChatScenario';

describe('ChatSimulation Component', () => {
  // 1. Rendering the conversation list
  it('renders the conversation list with user profile and contacts', () => {
    const handleAction = vi.fn();
    render(
      <ChatSimulation
        scenario={sampleChatScenario}
        sessionId="test-session-chat"
        onAction={handleAction}
      />
    );

    // Profile & contacts
    expect(screen.getByText('Pavan Kalyan')).toBeInTheDocument();
    expect(screen.getAllByText('Enterprise IT Support - Urgent').length).toBeGreaterThan(0);
    expect(screen.getByText('Rohit Sharma (Project Lead)')).toBeInTheDocument();

    // scenario_viewed event emitted
    expect(handleAction).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'scenario_viewed',
        scenarioId: sampleChatScenario.scenarioId,
        sessionId: 'test-session-chat',
        metadata: expect.objectContaining({
          channel: 'chat',
        }),
      })
    );
  });

  // 2. Opening a conversation
  it('opens a conversation and emits conversation_opened', () => {
    const handleAction = vi.fn();
    render(
      <ChatSimulation
        scenario={sampleChatScenario}
        sessionId="test-session-chat"
        onAction={handleAction}
      />
    );

    // Click on target contact row from list
    const contactRow = screen.getAllByText('Enterprise IT Support - Urgent')[0];
    fireEvent.click(contactRow);

    // Verify chat view elements
    expect(screen.getByTitle('Back to conversation list')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();

    // Verify conversation_opened event
    expect(handleAction).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'conversation_opened',
        scenarioId: sampleChatScenario.scenarioId,
        sessionId: 'test-session-chat',
        metadata: expect.objectContaining({
          conversationId: 'conv-it-desk-urgent',
          contactName: 'Enterprise IT Support - Urgent',
        }),
      })
    );
  });

  // 3. Returning to the conversation list
  it('returns to conversation list when back button is clicked', () => {
    const handleAction = vi.fn();
    render(
      <ChatSimulation
        scenario={sampleChatScenario}
        sessionId="test-session-chat"
        onAction={handleAction}
      />
    );

    // Open conversation
    fireEvent.click(screen.getAllByText('Enterprise IT Support - Urgent')[0]);
    expect(screen.getByTitle('Back to conversation list')).toBeInTheDocument();

    // Click back button
    fireEvent.click(screen.getByTitle('Back to conversation list'));

    // Should be in list view
    expect(screen.getByPlaceholderText('Search or start new chat')).toBeInTheDocument();
    expect(screen.getByText('Rohit Sharma (Project Lead)')).toBeInTheDocument();
  });

  // 4. Filtering conversations
  it('filters conversation list based on search query', () => {
    render(
      <ChatSimulation
        scenario={sampleChatScenario}
        sessionId="test-session-chat"
      />
    );

    const searchInput = screen.getByPlaceholderText('Search or start new chat');
    fireEvent.change(searchInput, { target: { value: 'Rohit' } });

    // Rohit should be present
    expect(screen.getByText('Rohit Sharma (Project Lead)')).toBeInTheDocument();

    // Search query that produces no results shows empty state
    fireEvent.change(searchInput, { target: { value: 'NonexistentContactXYZ' } });
    expect(screen.getByText('No conversations found')).toBeInTheDocument();
  });

  // 5. Sending a local message
  it('sends a local message and emits message_sent', () => {
    const handleAction = vi.fn();
    render(
      <ChatSimulation
        scenario={sampleChatScenario}
        sessionId="test-session-chat"
        onAction={handleAction}
      />
    );

    // Open chat
    fireEvent.click(screen.getAllByText('Enterprise IT Support - Urgent')[0]);

    // Type message
    const input = screen.getByPlaceholderText('Type a message...');
    fireEvent.change(input, { target: { value: 'Can you verify your employee ID?' } });

    // Send with enter
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: false });

    // Verify message appears in history and preview
    expect(screen.getAllByText('Can you verify your employee ID?').length).toBeGreaterThan(0);

    // Verify message_sent event
    expect(handleAction).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'message_sent',
        metadata: expect.objectContaining({
          messageText: 'Can you verify your employee ID?',
          conversationId: 'conv-it-desk-urgent',
        }),
      })
    );
  });

  // 6. Emoji insertion
  it('inserts selected emoji into composer input', () => {
    render(
      <ChatSimulation
        scenario={sampleChatScenario}
        sessionId="test-session-chat"
      />
    );

    // Open chat
    fireEvent.click(screen.getAllByText('Enterprise IT Support - Urgent')[0]);

    // Click emoji picker button
    const emojiToggle = screen.getByTitle('Insert emoji');
    fireEvent.click(emojiToggle);

    // Click on thumbs up emoji
    const thumbsUpButton = screen.getByText('👍');
    fireEvent.click(thumbsUpButton);

    // Check composer value
    const input = screen.getByPlaceholderText('Type a message...');
    expect(input.value).toContain('👍');
  });

  // 7. Safe interception of simulated links
  it('intercepts simulated links safely without navigating externally', () => {
    const handleAction = vi.fn();
    render(
      <ChatSimulation
        scenario={sampleChatScenario}
        sessionId="test-session-chat"
        onAction={handleAction}
      />
    );

    // Open chat
    fireEvent.click(screen.getAllByText('Enterprise IT Support - Urgent')[0]);

    // Find and click the simulated link
    const linkButtons = screen.getAllByText(/support-identity-auth-portal\.com/i);
    fireEvent.click(linkButtons[0]);

    // Verify simulated_link_clicked event
    expect(handleAction).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'simulated_link_clicked',
        metadata: expect.objectContaining({
          targetPhish: true,
          url: expect.stringContaining('support-identity-auth-portal.com'),
        }),
      })
    );

    // Verify intercept banner in DOM
    expect(screen.getByText(/Simulated Link Intercepted:/i)).toBeInTheDocument();
  });

  // 8. Attachment and voice interactions
  it('handles simulated attachment and voice interactions', () => {
    const handleAction = vi.fn();
    render(
      <ChatSimulation
        scenario={sampleChatScenario}
        sessionId="test-session-chat"
        onAction={handleAction}
      />
    );

    // Open chat
    fireEvent.click(screen.getAllByText('Enterprise IT Support - Urgent')[0]);

    // Click attachment inspect button
    const inspectBtn = screen.getByTitle('Inspect simulated attachment');
    fireEvent.click(inspectBtn);

    expect(handleAction).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'attachment_interaction',
        metadata: expect.objectContaining({
          name: 'Security_Audit_Incident_Report.pdf',
        }),
      })
    );
    expect(screen.getByText(/Simulated Attachment Inspected:/i)).toBeInTheDocument();

    // Voice interaction toggle
    const micBtn = screen.getByTitle('Simulate voice note');
    fireEvent.click(micBtn);

    expect(handleAction).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'voice_interaction',
        metadata: expect.objectContaining({
          action: 'voice_recording_started',
        }),
      })
    );
    expect(screen.getByText(/Simulated Recording:/i)).toBeInTheDocument();
  });

  // 9. Threat reporting and warning_sign_selected event emission
  it('handles threat reporting flow with warning sign selection', () => {
    const handleAction = vi.fn();
    const handleComplete = vi.fn();

    render(
      <ChatSimulation
        scenario={sampleChatScenario}
        sessionId="test-session-chat"
        onAction={handleAction}
        onComplete={handleComplete}
      />
    );

    // Open chat
    fireEvent.click(screen.getAllByText('Enterprise IT Support - Urgent')[0]);

    // Click Report Threat button
    const reportBtn = screen.getByText('Report Threat');
    fireEvent.click(reportBtn);

    expect(screen.getByText('Report Social Engineering Threat')).toBeInTheDocument();

    // Select indicator
    const checkbox = screen.getByLabelText(/IT \/ Authority Impersonation/i);
    fireEvent.click(checkbox);

    expect(handleAction).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'warning_sign_selected',
        metadata: expect.objectContaining({
          indicatorKey: 'urgentImpersonation',
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

    // Verify onComplete callback called
    expect(handleComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'reported',
        action: 'threat_reported',
        scenarioId: sampleChatScenario.scenarioId,
      })
    );
  });

  // 10. Prevention of duplicate scenario_viewed events on rerender
  it('does not emit duplicate scenario_viewed events during rerenders', () => {
    const handleAction = vi.fn();
    const { rerender } = render(
      <ChatSimulation
        scenario={sampleChatScenario}
        sessionId="test-session-chat"
        onAction={handleAction}
      />
    );

    expect(handleAction).toHaveBeenCalledTimes(1);

    // Rerender with same props
    rerender(
      <ChatSimulation
        scenario={sampleChatScenario}
        sessionId="test-session-chat"
        onAction={handleAction}
      />
    );

    const viewedCalls = handleAction.mock.calls.filter(c => c[0].eventType === 'scenario_viewed');
    expect(viewedCalls.length).toBe(1);
  });

  // 11. Safe handling of invalid scenario data
  it('renders graceful fallback when scenario prop is invalid or missing', () => {
    render(<ChatSimulation scenario={null} />);
    expect(screen.getByText('Scenario Unavailable')).toBeInTheDocument();
  });

  // 12. Correct terminal callback behavior for blocking contact from options menu
  it('handles block contact flow from options menu and invokes onComplete', () => {
    const handleAction = vi.fn();
    const handleComplete = vi.fn();

    render(
      <ChatSimulation
        scenario={sampleChatScenario}
        sessionId="test-session-chat"
        onAction={handleAction}
        onComplete={handleComplete}
      />
    );

    // Open options menu in conversation header
    const optionsBtn = screen.getByTestId('chat-options-button');
    fireEvent.click(optionsBtn);

    expect(screen.getByTestId('chat-options-menu')).toBeInTheDocument();

    // Click Block contact
    const blockBtn = screen.getByRole('button', { name: /Block contact/i });
    fireEvent.click(blockBtn);

    expect(handleAction).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'user_blocked_sender',
      })
    );

    expect(handleComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'safe_exit',
        action: 'user_blocked_sender',
      })
    );
  });
});
