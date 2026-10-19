import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import SimulationRenderer from './SimulationRenderer';
import { sampleScenario } from '../../data/sampleScenario';
import { sampleChatScenario } from '../../data/sampleChatScenario';
import { sampleSmsScenario } from '../../data/sampleSmsScenario';
import { sampleWebsiteScenario } from '../../data/sampleWebsiteScenario';

describe('SimulationRenderer Component', () => {
  // 1. Correct component selection for all four channels
  it('selects and renders EmailSimulation when channel is email', () => {
    render(
      <SimulationRenderer
        scenario={sampleScenario}
        sessionId="test-session-email"
      />
    );

    // Verify Email interface elements
    expect(screen.getByText('Gmail')).toBeInTheDocument();
    expect(screen.getByText('Compose')).toBeInTheDocument();
    expect(screen.getByText('VIT Events - Password reset')).toBeInTheDocument();
  });

  it('selects and renders ChatSimulation when channel is chat', () => {
    render(
      <SimulationRenderer
        scenario={sampleChatScenario}
        sessionId="test-session-chat"
      />
    );

    // Verify Chat interface elements
    expect(screen.getByText('Pavan Kalyan')).toBeInTheDocument();
    expect(screen.getAllByText('Enterprise IT Support - Urgent').length).toBeGreaterThan(0);
    expect(screen.getByPlaceholderText('Search or start new chat')).toBeInTheDocument();
  });

  it('selects and renders SmsSimulation when channel is sms', () => {
    render(
      <SimulationRenderer
        scenario={sampleSmsScenario}
        sessionId="test-session-sms"
      />
    );

    // Verify SMS interface elements
    expect(screen.getByText('Messages')).toBeInTheDocument();
    expect(screen.getByText('Campus Courier Logistics')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search SMS conversations')).toBeInTheDocument();
  });

  it('selects and renders WebsiteSimulation when channel is website', () => {
    render(
      <SimulationRenderer
        scenario={sampleWebsiteScenario}
        sessionId="test-session-web"
      />
    );

    // Verify Website browser interface elements
    expect(screen.getByTitle('Reload this page')).toBeInTheDocument();
    expect(screen.getByText('Student & Faculty Portal Login')).toBeInTheDocument();
  });

  // 2. Event callback forwarding
  it('forwards telemetry events with normalized envelope', () => {
    const handleAction = vi.fn();
    render(
      <SimulationRenderer
        scenario={sampleWebsiteScenario}
        sessionId="test-session-web"
        onAction={handleAction}
      />
    );

    // Click submit button in website
    const submitBtn = screen.getByText('Verify & Continue');
    fireEvent.click(submitBtn);

    // Verify event forwarded with channel metadata
    expect(handleAction).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'virtual_navigation',
        scenarioId: sampleWebsiteScenario.scenarioId,
        sessionId: 'test-session-web',
        metadata: expect.objectContaining({
          channel: 'website',
          fromPageId: 'page-portal-login',
          targetPageId: 'page-mfa-challenge',
        }),
      })
    );
  });

  // 3. Completion callback forwarding
  it('forwards terminal completion callbacks with normalized payload', () => {
    const handleComplete = vi.fn();
    render(
      <SimulationRenderer
        scenario={sampleSmsScenario}
        sessionId="test-session-sms"
        onComplete={handleComplete}
      />
    );

    // Safe exit in SMS triggers completion
    const exitBtns = screen.getAllByTitle(/Safe Exit/i);
    fireEvent.click(exitBtns[0]);
    fireEvent.click(screen.getByText('Confirm Safe Exit'));

    expect(handleComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'safe_exit',
        action: 'safe_exit',
        channel: 'sms',
        scenarioId: sampleSmsScenario.scenarioId,
        sessionId: 'test-session-sms',
      })
    );
  });

  // 4. Unsupported channel fallback
  it('renders a clear fallback when scenario channel is unsupported', () => {
    const unsupportedScenario = {
      scenarioId: 'unsupported-001',
      channel: 'voice_call',
      title: 'Vishing Phone Simulation'
    };

    render(
      <SimulationRenderer
        scenario={unsupportedScenario}
        sessionId="test-session-voice"
      />
    );

    expect(screen.getByText('Unsupported Simulation Channel')).toBeInTheDocument();
    expect(screen.getByText(/"voice_call"/i)).toBeInTheDocument();
  });

  // 5. Missing or malformed scenario fallback
  it('renders fallback when scenario is null or empty', () => {
    const { rerender } = render(<SimulationRenderer scenario={null} />);
    expect(screen.getByText('No Scenario Data')).toBeInTheDocument();

    rerender(<SimulationRenderer scenario={{}} />);
    expect(screen.getByText('Missing Simulation Channel')).toBeInTheDocument();
  });

  // 6. Preservation of session ID and scenario props
  it('preserves passed sessionId and scenario properties', () => {
    const handleAction = vi.fn();
    render(
      <SimulationRenderer
        scenario={sampleChatScenario}
        sessionId="custom-session-uuid-999"
        onAction={handleAction}
      />
    );

    expect(handleAction).toHaveBeenCalledWith(
      expect.objectContaining({
        scenarioId: sampleChatScenario.scenarioId,
        sessionId: 'custom-session-uuid-999',
        metadata: expect.objectContaining({
          channel: 'chat',
        }),
      })
    );
  });
});
