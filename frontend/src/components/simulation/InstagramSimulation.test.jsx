import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import InstagramSimulation from './InstagramSimulation';
import { sampleInstagramScenario } from '../../data/sampleInstagramScenario';

describe('InstagramSimulation Component', () => {
  it('renders without crashing and displays Instagram Direct Messages layout', () => {
    render(
      <InstagramSimulation
        scenario={sampleInstagramScenario}
        sessionId="test-session-instagram"
      />
    );

    // Verify handle header
    expect(screen.getByText('_pavan_kalyan_1207')).toBeInTheDocument();
    // Search input
    expect(screen.getByPlaceholderText('Search')).toBeInTheDocument();
    // Notes
    expect(screen.getByText('Your note')).toBeInTheDocument();
    expect(screen.getByText('TR Chandana')).toBeInTheDocument();
    // Target contact in list
    expect(screen.getAllByText('thejasri 🦋').length).toBeGreaterThan(0);
  });

  it('renders opened chat conversation with message input and details button', () => {
    render(
      <InstagramSimulation
        scenario={sampleInstagramScenario}
        sessionId="test-session-instagram"
      />
    );

    // Verify message text from scenario
    expect(screen.getByText('Hey! Are you participating in the college hackathon?')).toBeInTheDocument();
    expect(screen.getByText('Yea na ponathu ila')).toBeInTheDocument();
    // Input bar
    expect(screen.getByPlaceholderText('Message...')).toBeInTheDocument();
  });

  it('emits message_sent event when user types and sends a message in Instagram DM', () => {
    const handleAction = vi.fn();

    render(
      <InstagramSimulation
        scenario={sampleInstagramScenario}
        sessionId="test-session-instagram"
        onAction={handleAction}
      />
    );

    const input = screen.getByPlaceholderText('Message...');
    fireEvent.change(input, { target: { value: 'Why do I need to log in to vote?' } });

    const sendBtn = screen.getByText('Send');
    fireEvent.click(sendBtn);

    expect(handleAction).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'message_sent',
        metadata: expect.objectContaining({
          text: 'Why do I need to log in to vote?'
        })
      })
    );
  });

  it('emits simulated_link_clicked when clicking voting link in DM', () => {
    const handleAction = vi.fn();

    render(
      <InstagramSimulation
        scenario={sampleInstagramScenario}
        sessionId="test-session-instagram"
        onAction={handleAction}
      />
    );

    const link = screen.getByText('https://insta-vote-awards2026.online/auth-login');
    fireEvent.click(link);

    expect(handleAction).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'simulated_link_clicked',
        metadata: expect.objectContaining({
          targetPhish: true
        })
      })
    );
  });

  it('opens Details panel on clicking info button and allows blocking user', () => {
    const handleAction = vi.fn();
    const handleComplete = vi.fn();

    render(
      <InstagramSimulation
        scenario={sampleInstagramScenario}
        sessionId="test-session-instagram"
        onAction={handleAction}
        onComplete={handleComplete}
      />
    );

    // Tap info icon in header
    const infoBtn = screen.getByTestId('instagram-details-button');
    fireEvent.click(infoBtn);

    expect(screen.getByTestId('instagram-details-panel')).toBeInTheDocument();
    expect(screen.getByText('Mute messages')).toBeInTheDocument();

    // Click Block in details panel
    const blockBtn = screen.getByRole('button', { name: /Block/i });
    fireEvent.click(blockBtn);

    expect(handleAction).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'user_blocked_sender'
      })
    );

    expect(handleComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'safe_exit',
        action: 'user_blocked_sender'
      })
    );
  });
});
