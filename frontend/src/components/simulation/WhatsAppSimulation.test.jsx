import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import WhatsAppSimulation from './WhatsAppSimulation';
import { sampleWhatsAppScenario } from '../../data/sampleWhatsAppScenario';

describe('WhatsAppSimulation Component', () => {
  it('renders without crashing and displays WhatsApp Web layout and contact list', () => {
    render(
      <WhatsAppSimulation
        scenario={sampleWhatsAppScenario}
        sessionId="test-session-whatsapp"
      />
    );

    // Verify WhatsApp title
    expect(screen.getByRole('heading', { name: 'WhatsApp' })).toBeInTheDocument();
    // Search input
    expect(screen.getByPlaceholderText('Search or start a new chat')).toBeInTheDocument();
    // Contact in list and header
    expect(screen.getAllByText('Suuuuryaaaa 💀💀💀 VIT').length).toBeGreaterThan(0);
    // Filter pills
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Unread 139')).toBeInTheDocument();
  });

  it('renders opened chat conversation with WhatsApp message bubbles', () => {
    render(
      <WhatsAppSimulation
        scenario={sampleWhatsAppScenario}
        sessionId="test-session-whatsapp"
      />
    );

    // Verify message text from scenario
    expect(screen.getByText('👀👀')).toBeInTheDocument();
    expect(screen.getByText('Not came?')).toBeInTheDocument();
    expect(screen.getByText('Quiz portion?')).toBeInTheDocument();
    // Input bar
    expect(screen.getByPlaceholderText('Type a message')).toBeInTheDocument();
  });

  it('emits message_sent event when user types and sends a message', () => {
    const handleAction = vi.fn();

    render(
      <WhatsAppSimulation
        scenario={sampleWhatsAppScenario}
        sessionId="test-session-whatsapp"
        onAction={handleAction}
      />
    );

    const input = screen.getByPlaceholderText('Type a message');
    fireEvent.change(input, { target: { value: 'Is this real or a prank?' } });

    const sendBtn = screen.getByTitle('Send');
    fireEvent.click(sendBtn);

    expect(handleAction).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'message_sent',
        metadata: expect.objectContaining({
          text: 'Is this real or a prank?'
        })
      })
    );
  });

  it('emits simulated_link_clicked when malicious link is clicked', () => {
    const handleAction = vi.fn();

    render(
      <WhatsAppSimulation
        scenario={sampleWhatsAppScenario}
        sessionId="test-session-whatsapp"
        onAction={handleAction}
      />
    );

    const link = screen.getByText('https://vit-ac-in-portal-verify.in/quiz-paper');
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

  it('allows blocking contact from 3-dot menu as a positive termination', () => {
    const handleAction = vi.fn();
    const handleComplete = vi.fn();

    render(
      <WhatsAppSimulation
        scenario={sampleWhatsAppScenario}
        sessionId="test-session-whatsapp"
        onAction={handleAction}
        onComplete={handleComplete}
      />
    );

    // Open WhatsApp 3-dot menu
    const menuBtn = screen.getByTestId('whatsapp-menu-button');
    fireEvent.click(menuBtn);

    expect(screen.getByTestId('whatsapp-options-menu')).toBeInTheDocument();

    // Click Block option
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
