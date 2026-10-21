import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TelegramSimulation from './TelegramSimulation';
import { sampleTelegramScenario } from '../../data/sampleTelegramScenario';

describe('TelegramSimulation Component', () => {
  it('renders without crashing and displays Telegram layout and conversation list', () => {
    render(
      <TelegramSimulation
        scenario={sampleTelegramScenario}
        sessionId="test-session-telegram"
      />
    );

    // Verify search input
    expect(screen.getByPlaceholderText('Search')).toBeInTheDocument();
    // Filter pills
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Tamil Movies')).toBeInTheDocument();
    // Verify group contact rendered
    expect(screen.getAllByText('Kakapeeeeee atti 💥 🤘').length).toBeGreaterThan(0);
    // SCAM badge on scam channel
    expect(screen.getByText('SCAM')).toBeInTheDocument();
  });

  it('renders opened chat conversation with file card, pinned message, and member messages', () => {
    render(
      <TelegramSimulation
        scenario={sampleTelegramScenario}
        sessionId="test-session-telegram"
      />
    );

    // Pinned message
    expect(screen.getByText('Pinned Message')).toBeInTheDocument();
    expect(screen.getByText('Photo, Jailer 2 (2026) Tamil (LINE) V2 HDTC')).toBeInTheDocument();

    // Media file card
    expect(screen.getByText('VisionQuest.S01E04.Malware.1080p.JioHotstar.WEB-DL.MULTI.mkv')).toBeInTheDocument();
    expect(screen.getByText('1.22 GB')).toBeInTheDocument();
    expect(screen.getByTestId('telegram-download-link')).toBeInTheDocument();

    // Group member messages
    expect(screen.getByText('vision quest S1 E3')).toBeInTheDocument();
    expect(screen.getByText('Band of brothers english subtitles')).toBeInTheDocument();
  });

  it('emits message_sent event when user types and sends a message', () => {
    const handleAction = vi.fn();

    render(
      <TelegramSimulation
        scenario={sampleTelegramScenario}
        sessionId="test-session-telegram"
        onAction={handleAction}
      />
    );

    const input = screen.getByPlaceholderText('Message');
    fireEvent.change(input, { target: { value: 'Is this file safe to download?' } });

    const form = input.closest('form');
    fireEvent.submit(form);

    expect(handleAction).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'message_sent',
        metadata: expect.objectContaining({
          channel: 'telegram',
          text: 'Is this file safe to download?'
        })
      })
    );
  });

  it('emits simulated_link_clicked event when user clicks the file download button', () => {
    const handleAction = vi.fn();

    render(
      <TelegramSimulation
        scenario={sampleTelegramScenario}
        sessionId="test-session-telegram"
        onAction={handleAction}
      />
    );

    const downloadBtn = screen.getByTestId('telegram-download-link');
    fireEvent.click(downloadBtn);

    expect(handleAction).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'simulated_link_clicked',
        metadata: expect.objectContaining({
          targetPhish: true
        })
      })
    );
  });

  it('opens 3-dot menu and allows blocking group (positive termination)', () => {
    const handleAction = vi.fn();
    const handleComplete = vi.fn();

    render(
      <TelegramSimulation
        scenario={sampleTelegramScenario}
        sessionId="test-session-telegram"
        onAction={handleAction}
        onComplete={handleComplete}
      />
    );

    // Click 3-dot options button
    const optionsBtn = screen.getByTestId('telegram-options-button');
    fireEvent.click(optionsBtn);

    // Verify 3-dot options menu opens
    expect(screen.getByTestId('telegram-options-menu')).toBeInTheDocument();
    expect(screen.getByText('Unmute')).toBeInTheDocument();
    expect(screen.getByText('Select Messages')).toBeInTheDocument();
    expect(screen.getByText('Send a Gift')).toBeInTheDocument();
    expect(screen.getByText('Boost Group')).toBeInTheDocument();

    // Click Block
    const blockBtn = screen.getByTestId('telegram-block-action');
    fireEvent.click(blockBtn);

    expect(handleAction).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'user_blocked_sender',
        metadata: expect.objectContaining({
          channel: 'telegram'
        })
      })
    );

    expect(handleComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'safe_exit',
        action: 'user_blocked_sender'
      })
    );
  });

  it('opens 3-dot menu and allows reporting group (positive termination)', () => {
    const handleAction = vi.fn();
    const handleComplete = vi.fn();

    render(
      <TelegramSimulation
        scenario={sampleTelegramScenario}
        sessionId="test-session-telegram"
        onAction={handleAction}
        onComplete={handleComplete}
      />
    );

    // Click 3-dot options button
    const optionsBtn = screen.getByTestId('telegram-options-button');
    fireEvent.click(optionsBtn);

    // Click Report
    const reportBtn = screen.getByTestId('telegram-report-action');
    fireEvent.click(reportBtn);

    // Report modal opens
    expect(screen.getByTestId('telegram-report-modal')).toBeInTheDocument();

    // Submit report
    const submitBtn = screen.getByTestId('telegram-submit-report-btn');
    fireEvent.click(submitBtn);

    expect(handleAction).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'threat_reported',
        metadata: expect.objectContaining({
          channel: 'telegram'
        })
      })
    );

    expect(handleComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'reported',
        action: 'threat_reported'
      })
    );
  });

  it('opens 3-dot menu and allows deleting chat (positive termination)', () => {
    const handleAction = vi.fn();
    const handleComplete = vi.fn();

    render(
      <TelegramSimulation
        scenario={sampleTelegramScenario}
        sessionId="test-session-telegram"
        onAction={handleAction}
        onComplete={handleComplete}
      />
    );

    // Click 3-dot options button
    const optionsBtn = screen.getByTestId('telegram-options-button');
    fireEvent.click(optionsBtn);

    // Click Delete
    const deleteBtn = screen.getByTestId('telegram-delete-action');
    fireEvent.click(deleteBtn);

    expect(handleAction).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'message_deleted',
        metadata: expect.objectContaining({
          channel: 'telegram'
        })
      })
    );

    expect(handleComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'safe_exit',
        action: 'message_deleted'
      })
    );
  });
});
