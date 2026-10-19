import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from './App';

describe('App Component - View Routing and Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Home view by default', () => {
    render(<App />);
    expect(screen.getByText(/AI Social Engineering Simulator/i)).toBeInTheDocument();
    expect(screen.getByTestId('generate-button')).toBeInTheDocument();
  });

  it('transitions to simulation view on successful generation and allows returning to generator', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        scenario: {
          scenarioId: 'scen-test-gen',
          channel: 'email',
          title: 'Generated Phish Simulation',
          emailData: {
            id: 'm1',
            isTarget: true,
            sender: { name: 'Support', email: 'support@alert.com' },
            subject: 'Account Notice',
            contentBlocks: [{ type: 'paragraph', text: 'Please verify.' }]
          }
        },
        sessionId: 'sess-gen-123'
      })
    });

    render(<App />);

    const promptInput = screen.getByTestId('prompt-input');
    const testPrompt = 'Urgent university password update request';
    fireEvent.change(promptInput, { target: { value: testPrompt } });

    fireEvent.click(screen.getByTestId('generate-button'));

    // Wait for transition to Simulation View
    await waitFor(() => {
      expect(screen.getByTestId('return-to-generator-btn')).toBeInTheDocument();
      expect(screen.getByText('Generated Phish Simulation')).toBeInTheDocument();
    });

    // Verify Telemetry button is present in simulation view
    const telemetryBtn = screen.getByTestId('telemetry-toggle-btn');
    expect(telemetryBtn).toBeInTheDocument();

    // Toggle telemetry drawer
    fireEvent.click(telemetryBtn);
    expect(screen.getByTestId('telemetry-log-panel')).toBeInTheDocument();

    // Return to Generator
    fireEvent.click(screen.getByTestId('return-to-generator-btn'));

    // Should be back on Home view with user's prompt preserved
    expect(screen.getByText(/AI Social Engineering Simulator/i)).toBeInTheDocument();
    expect(screen.getByTestId('prompt-input').value).toBe(testPrompt);
  });
});
