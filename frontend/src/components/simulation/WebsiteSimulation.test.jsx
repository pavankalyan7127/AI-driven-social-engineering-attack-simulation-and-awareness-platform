import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import WebsiteSimulation from './WebsiteSimulation';
import { sampleWebsiteScenario } from '../../data/sampleWebsiteScenario';

describe('WebsiteSimulation Component', () => {
  // 1. Initial browser rendering
  it('renders the browser shell with tabs, toolbar, and address bar', () => {
    const handleAction = vi.fn();
    render(
      <WebsiteSimulation
        scenario={sampleWebsiteScenario}
        sessionId="test-session-web"
        onAction={handleAction}
      />
    );

    // Verify browser controls
    expect(screen.getByTitle('Click to go back')).toBeInTheDocument();
    expect(screen.getByTitle('Click to go forward')).toBeInTheDocument();
    expect(screen.getByTitle('Reload this page')).toBeInTheDocument();
    expect(screen.getByText(/vtop-auth-portal\.secure-verify-student\.info/i)).toBeInTheDocument();

    // Verify scenario_viewed event emitted
    expect(handleAction).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'scenario_viewed',
        scenarioId: sampleWebsiteScenario.scenarioId,
        sessionId: 'test-session-web',
        metadata: expect.objectContaining({
          channel: 'website',
        }),
      })
    );
  });

  // 2. Initial virtual page selection
  it('selects and displays the initial virtual page content', () => {
    render(
      <WebsiteSimulation
        scenario={sampleWebsiteScenario}
        sessionId="test-session-web"
      />
    );

    // Page title and heading
    expect(screen.getByText('Student & Faculty Portal Login')).toBeInTheDocument();
    expect(screen.getByText('Mandatory Security Verification')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e\.g\. 23BCE1024/i)).toBeInTheDocument();
  });

  // 3. Navigation between virtual pages
  it('navigates between virtual pages when a navigation button/link is clicked', () => {
    const handleAction = vi.fn();
    render(
      <WebsiteSimulation
        scenario={sampleWebsiteScenario}
        sessionId="test-session-web"
        onAction={handleAction}
      />
    );

    // Click submit button that navigates to MFA challenge
    const submitBtn = screen.getByText('Verify & Continue');
    fireEvent.click(submitBtn);

    // Should now display MFA challenge page
    expect(screen.getByText('Two-Factor Verification Required')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter 6-digit code/i)).toBeInTheDocument();

    // Verify virtual_navigation event
    expect(handleAction).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'virtual_navigation',
        metadata: expect.objectContaining({
          fromPageId: 'page-portal-login',
          targetPageId: 'page-mfa-challenge',
        }),
      })
    );
  });

  // 4. Back and Forward history
  it('navigates through history using browser Back and Forward buttons', () => {
    const handleAction = vi.fn();
    render(
      <WebsiteSimulation
        scenario={sampleWebsiteScenario}
        sessionId="test-session-web"
        onAction={handleAction}
      />
    );

    const backBtn = screen.getByTitle('Click to go back');
    const forwardBtn = screen.getByTitle('Click to go forward');

    // Initially back and forward are disabled
    expect(backBtn).toBeDisabled();
    expect(forwardBtn).toBeDisabled();

    // Navigate to page-mfa-challenge
    fireEvent.click(screen.getByText('Verify & Continue'));
    expect(screen.getByText('Two-Factor Verification Required')).toBeInTheDocument();
    expect(backBtn).not.toBeDisabled();

    // Click Back
    fireEvent.click(backBtn);
    expect(screen.getByText('Student & Faculty Portal Login')).toBeInTheDocument();
    expect(forwardBtn).not.toBeDisabled();

    // Click Forward
    fireEvent.click(forwardBtn);
    expect(screen.getByText('Two-Factor Verification Required')).toBeInTheDocument();
  });

  // 5. Refresh without external navigation
  it('refreshes the current virtual page and resets form values without leaving simulation', () => {
    const handleAction = vi.fn();
    render(
      <WebsiteSimulation
        scenario={sampleWebsiteScenario}
        sessionId="test-session-web"
        onAction={handleAction}
      />
    );

    // Enter username
    const usernameInput = screen.getByPlaceholderText(/e\.g\. 23BCE1024/i);
    fireEvent.change(usernameInput, { target: { value: '23BCE1024' } });
    expect(usernameInput.value).toBe('23BCE1024');

    // Click Refresh
    const refreshBtn = screen.getByTitle('Reload this page');
    fireEvent.click(refreshBtn);

    // Field value is reset
    expect(usernameInput.value).toBe('');

    // Verify refresh navigation event
    expect(handleAction).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'virtual_navigation',
        metadata: expect.objectContaining({
          action: 'refresh',
          pageId: 'page-portal-login',
        }),
      })
    );
  });

  // 6. Safe handling of unknown page IDs
  it('renders a safe 404 page when navigating to an unknown destination ID', () => {
    const customScenario = {
      ...sampleWebsiteScenario,
      pages: {
        ...sampleWebsiteScenario.pages,
        "page-portal-login": {
          ...sampleWebsiteScenario.pages["page-portal-login"],
          blocks: [
            {
              type: "button",
              label: "Go to Broken Page",
              targetPageId: "nonexistent-page-999"
            }
          ]
        }
      }
    };

    render(
      <WebsiteSimulation
        scenario={customScenario}
        sessionId="test-session-web"
      />
    );

    fireEvent.click(screen.getByText('Go to Broken Page'));

    // Should display safe 404 message
    expect(screen.getByText(/404 - Page Not Found/i)).toBeInTheDocument();
    expect(screen.getByText('Return to Initial Page')).toBeInTheDocument();
  });

  // 7. Form interaction without transmitting sensitive values
  it('records form interactions safely without external transmission', () => {
    const handleAction = vi.fn();
    render(
      <WebsiteSimulation
        scenario={sampleWebsiteScenario}
        sessionId="test-session-web"
        onAction={handleAction}
      />
    );

    // Enter username
    const usernameInput = screen.getByPlaceholderText(/e\.g\. 23BCE1024/i);
    fireEvent.change(usernameInput, { target: { value: '23BCE9999' } });

    // Verify form_interaction event emitted with fieldId
    expect(handleAction).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'form_interaction',
        metadata: expect.objectContaining({
          fieldId: 'field-username',
        }),
      })
    );
  });

  // 8. Safe handling of unsupported block types
  it('safely skips unsupported block types without crashing', () => {
    const customScenario = {
      ...sampleWebsiteScenario,
      pages: {
        "page-custom": {
          id: "page-custom",
          title: "Custom Test Page",
          blocks: [
            { type: "heading", level: 2, text: "Supported Heading" },
            { type: "malicious_script_block", payload: "<script>alert(1)</script>" },
            { type: "unknown_future_block", data: {} }
          ]
        }
      },
      initialPageId: "page-custom"
    };

    render(
      <WebsiteSimulation
        scenario={customScenario}
        sessionId="test-session-web"
      />
    );

    expect(screen.getByText('Supported Heading')).toBeInTheDocument();
    // Unsupported blocks are simply not rendered and do not throw
    expect(screen.queryByText('<script>alert(1)</script>')).not.toBeInTheDocument();
  });

  // 9. Event telemetry and duplicate-event prevention
  it('does not emit duplicate scenario_viewed events during ordinary rerenders', () => {
    const handleAction = vi.fn();
    const { rerender } = render(
      <WebsiteSimulation
        scenario={sampleWebsiteScenario}
        sessionId="test-session-web"
        onAction={handleAction}
      />
    );

    expect(handleAction).toHaveBeenCalledTimes(2); // scenario_viewed + initial virtual_page_viewed

    rerender(
      <WebsiteSimulation
        scenario={sampleWebsiteScenario}
        sessionId="test-session-web"
        onAction={handleAction}
      />
    );

    const viewedCalls = handleAction.mock.calls.filter(c => c[0].eventType === 'scenario_viewed');
    expect(viewedCalls.length).toBe(1);
  });

  // 10. Threat reporting flow via Chrome Help menu and feedback dialog
  it('handles threat reporting flow with Chrome Help menu and feedback modal', () => {
    const handleAction = vi.fn();
    const handleComplete = vi.fn();

    render(
      <WebsiteSimulation
        scenario={sampleWebsiteScenario}
        sessionId="test-session-web"
        onAction={handleAction}
        onComplete={handleComplete}
      />
    );

    // Open Chrome 3-dot menu
    const menuBtn = screen.getByTestId('chrome-menu-btn');
    fireEvent.click(menuBtn);

    // Click Help submenu trigger
    const helpBtn = screen.getByTestId('chrome-help-menu-btn');
    fireEvent.click(helpBtn);

    // Click "Report an unsafe site..."
    const reportBtn = screen.getByTestId('chrome-report-unsafe-btn');
    fireEvent.click(reportBtn);

    // Feedback modal is now open
    expect(screen.getByText('Send feedback to Google')).toBeInTheDocument();
    expect(screen.getByText('Describe the issue in detail')).toBeInTheDocument();

    // Type description
    const textarea = screen.getByPlaceholderText(/Describe why this website is suspicious/i);
    fireEvent.change(textarea, { target: { value: 'This website is phishing university credentials!' } });

    // Confirm & submit feedback
    const sendBtn = screen.getByTestId('chrome-feedback-send-btn');
    fireEvent.click(sendBtn);

    // Verify threat_reported event
    expect(handleAction).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'threat_reported',
        metadata: expect.objectContaining({
          reportedVia: 'chrome_feedback',
          reportedTarget: true,
        }),
      })
    );

    // Verify onComplete callback called
    expect(handleComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'reported',
        action: 'threat_reported',
        scenarioId: sampleWebsiteScenario.scenarioId,
      })
    );
  });

  // 11. Chrome Exit flow invokes onComplete
  it('handles safe-exit flow via Chrome menu Exit and invokes onComplete', () => {
    const handleAction = vi.fn();
    const handleComplete = vi.fn();

    render(
      <WebsiteSimulation
        scenario={sampleWebsiteScenario}
        sessionId="test-session-web"
        onAction={handleAction}
        onComplete={handleComplete}
      />
    );

    // Open Chrome 3-dot menu
    const menuBtn = screen.getByTestId('chrome-menu-btn');
    fireEvent.click(menuBtn);

    // Click Exit
    const exitBtn = screen.getByTestId('chrome-exit-btn');
    fireEvent.click(exitBtn);

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

  // 12. Graceful handling of invalid scenario data
  it('renders graceful fallback when scenario prop is invalid or missing', () => {
    render(<WebsiteSimulation scenario={null} />);
    expect(screen.getByText('Scenario Unavailable')).toBeInTheDocument();
  });
});
