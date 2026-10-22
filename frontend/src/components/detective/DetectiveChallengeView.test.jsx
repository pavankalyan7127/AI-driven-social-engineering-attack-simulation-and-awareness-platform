import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DetectiveChallengeView from './DetectiveChallengeView';
import DetectiveReportView from './DetectiveReportView';

const sampleChallenge = {
  challengeId: 'det-test-01',
  scenarioTitle: 'Bank KYC Triage Challenge',
  channel: 'sms',
  rounds: [
    {
      roundNumber: 1,
      type: 'FAKE',
      title: 'Urgent KYC Suspension Notice',
      scenarioData: {
        conversations: [
          {
            id: 'c1',
            contactName: '+91 98401 12345',
            phoneNumber: '+91 98401 12345',
            messages: [{ id: 'm1', sender: 'attacker', text: 'Update KYC at bit.ly/bank', timestamp: '10:00 AM' }]
          }
        ]
      },
      clues: {
        isFake: true,
        primaryIndicator: 'Sent from private 10-digit number with bit.ly link',
        redFlagsOrSafeguards: ['Private 10-digit phone number', 'Suspicious shortened URL'],
        forensicExplanation: 'Smishing lure designed to steal credentials.'
      }
    },
    {
      roundNumber: 2,
      type: 'REAL',
      title: 'Official Transaction Alert',
      scenarioData: {
        conversations: [
          {
            id: 'c2',
            contactName: 'VM-HDFCBK',
            phoneNumber: 'VM-HDFCBK',
            messages: [{ id: 'm2', sender: 'bank', text: 'Alert: INR 500 debited from A/c XX1234', timestamp: '11:00 AM' }]
          }
        ]
      },
      clues: {
        isFake: false,
        primaryIndicator: 'Official telecom alpha-header with no links',
        redFlagsOrSafeguards: ['Official header VM-HDFCBK', 'Masked account digits'],
        forensicExplanation: 'Authentic automated bank debit alert.'
      }
    },
    {
      roundNumber: 3,
      type: 'FAKE',
      title: 'Lottery Prize SMS',
      scenarioData: {
        conversations: [
          {
            id: 'c3',
            contactName: '+91 78901 23456',
            phoneNumber: '+91 78901 23456',
            messages: [{ id: 'm3', sender: 'attacker', text: 'You won 50,000! Claim now', timestamp: '12:00 PM' }]
          }
        ]
      },
      clues: {
        isFake: true,
        primaryIndicator: 'Unsolicited cash reward lure',
        redFlagsOrSafeguards: ['Unsolicited lottery win', 'Private mobile sender'],
        forensicExplanation: 'Baiting attack.'
      }
    }
  ],
  channelCheatSheet: {
    channel: 'sms',
    whatToLookFor: ['Check sender header', 'Inspect URLs'],
    realMarkers: ['Official telecom header', 'Masked account digits'],
    fakeMarkers: ['Private 10-digit number', 'Shortened links']
  }
};

describe('Cyber Detective Mode - Frontend Component Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('DetectiveChallengeView Component', () => {
    it('renders Round 1 with Stepper and Detective Verdict buttons', () => {
      render(
        <DetectiveChallengeView
          challenge={sampleChallenge}
          onFinishChallenge={vi.fn()}
          onExit={vi.fn()}
        />
      );

      expect(screen.getByTestId('detective-challenge-view')).toBeInTheDocument();
      expect(screen.getByText(/Cyber Detective Mode/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Round/i).length).toBeGreaterThan(0);
      expect(screen.getByTestId('verdict-legitimate-btn')).toBeInTheDocument();
      expect(screen.getByTestId('verdict-attack-btn')).toBeInTheDocument();
      expect(screen.getByTestId('confirm-verdict-btn')).toBeDisabled();
    });

    it('enables advance button when verdict is selected and steps through rounds', async () => {
      render(
        <DetectiveChallengeView
          challenge={sampleChallenge}
          onFinishChallenge={vi.fn()}
          onExit={vi.fn()}
        />
      );

      // Verify Round 1 scenario content is visible
      expect(screen.getByText(/Update KYC at bit.ly\/bank/i)).toBeInTheDocument();

      const attackBtn = screen.getByTestId('verdict-attack-btn');
      fireEvent.click(attackBtn);

      const confirmBtn = screen.getByTestId('confirm-verdict-btn');
      expect(confirmBtn).not.toBeDisabled();
      expect(screen.getByText(/Next Round/i)).toBeInTheDocument();

      // Advance to Round 2
      fireEvent.click(confirmBtn);

      // In Round 2, verify Round 2 content is displayed, not Round 1
      expect(screen.getByText(/Alert: INR 500 debited from A\/c XX1234/i)).toBeInTheDocument();
      expect(screen.queryByText(/Update KYC at bit.ly\/bank/i)).not.toBeInTheDocument();

      // In Round 2, button is reset to disabled until user picks
      expect(confirmBtn).toBeDisabled();

      // Pick legitimate for Round 2
      const legitBtn = screen.getByTestId('verdict-legitimate-btn');
      fireEvent.click(legitBtn);
      expect(confirmBtn).not.toBeDisabled();

      // Advance to Round 3
      fireEvent.click(confirmBtn);

      // In Round 3 (last round), verify Round 3 content is displayed
      expect(screen.getByText(/You won 50,000! Claim now/i)).toBeInTheDocument();
      expect(screen.getByText(/Submit Final Triage/i)).toBeInTheDocument();
    });

    it('submits completed rounds to /api/detective/score and triggers onFinishChallenge callback', async () => {
      const mockFinish = vi.fn();
      const mockReport = {
        score: 100,
        badge: { title: 'Master Cyber Detective' },
        roundBreakdowns: []
      };

      global.fetch = vi.fn().mockImplementation((url) => {
        if (typeof url === 'string' && url.includes('/api/detective/score')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true, report: mockReport })
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true })
        });
      });

      render(
        <DetectiveChallengeView
          challenge={sampleChallenge}
          onFinishChallenge={mockFinish}
          onExit={vi.fn()}
        />
      );

      // Round 1
      fireEvent.click(screen.getByTestId('verdict-attack-btn'));
      fireEvent.click(screen.getByTestId('confirm-verdict-btn'));

      // Round 2
      fireEvent.click(screen.getByTestId('verdict-legitimate-btn'));
      fireEvent.click(screen.getByTestId('confirm-verdict-btn'));

      // Round 3
      fireEvent.click(screen.getByTestId('verdict-attack-btn'));
      fireEvent.click(screen.getByTestId('confirm-verdict-btn'));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/detective/score', expect.any(Object));
        expect(mockFinish).toHaveBeenCalledWith(mockReport, sampleChallenge);
      });
    });

    it('toggles clues cheat sheet drawer when user clicks guide button', () => {
      render(
        <DetectiveChallengeView
          challenge={sampleChallenge}
          onFinishChallenge={vi.fn()}
          onExit={vi.fn()}
        />
      );

      const toggleBtn = screen.getByTestId('toggle-cheatsheet-btn');
      fireEvent.click(toggleBtn);

      expect(screen.getByTestId('detective-cheatsheet-drawer')).toBeInTheDocument();
      expect(screen.getByText(/SMS Inspection Guide/i)).toBeInTheDocument();
    });

    it('opens exit confirmation dialog and allows canceling or exiting', () => {
      const mockExit = vi.fn();
      render(
        <DetectiveChallengeView
          challenge={sampleChallenge}
          onFinishChallenge={vi.fn()}
          onExit={mockExit}
        />
      );

      fireEvent.click(screen.getByTestId('detective-exit-btn'));
      expect(screen.getByText(/Exit Detective Challenge\?/i)).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('confirm-exit-detective-btn'));
      expect(mockExit).toHaveBeenCalled();
    });
  });

  describe('DetectiveReportView Component', () => {
    const sampleReport = {
      score: 100,
      maxScore: 100,
      correctCount: 3,
      totalRounds: 3,
      accuracyPercentage: 100,
      sweepBonus: 10,
      channel: 'sms',
      scenarioTitle: 'Bank KYC Triage Challenge',
      badge: {
        title: 'Master Cyber Detective',
        class: 'master',
        description: 'Exceptional security instincts! Correctly triaged all communications.'
      },
      metrics: {
        attacksCaught: 2,
        totalAttacks: 2,
        attacksCompromised: 0,
        falseAlarms: 0,
        totalLegitimate: 1
      },
      roundBreakdowns: [
        {
          roundNumber: 1,
          title: 'Urgent KYC Suspension Notice',
          type: 'FAKE',
          userVerdict: 'attack',
          isCorrect: true,
          verdictResult: 'correct',
          pointsAwarded: 30,
          clues: {
            primaryIndicator: 'Sent from private 10-digit number with bit.ly link',
            redFlagsOrSafeguards: ['Private 10-digit mobile number', 'Shortened bit.ly URL'],
            forensicExplanation: 'Smishing lure designed to harvest credentials.'
          }
        },
        {
          roundNumber: 2,
          title: 'Official Transaction Alert',
          type: 'REAL',
          userVerdict: 'legitimate',
          isCorrect: true,
          verdictResult: 'correct',
          pointsAwarded: 30,
          clues: {
            primaryIndicator: 'Official telecom alpha-header VM-HDFCBK',
            redFlagsOrSafeguards: ['Registered alpha-header', 'Masked account digits'],
            forensicExplanation: 'Authentic automated bank debit notification.'
          }
        },
        {
          roundNumber: 3,
          title: 'Lottery Prize SMS',
          type: 'FAKE',
          userVerdict: 'attack',
          isCorrect: true,
          verdictResult: 'correct',
          pointsAwarded: 30,
          clues: {
            primaryIndicator: 'Unsolicited cash reward lure',
            redFlagsOrSafeguards: ['Unsolicited lottery win', 'Private mobile sender'],
            forensicExplanation: 'Baiting attack.'
          }
        }
      ]
    };

    it('renders hero scorecard with score, badge, metrics, and sweep bonus', () => {
      render(
        <DetectiveReportView
          report={sampleReport}
          challenge={sampleChallenge}
          onRedo={vi.fn()}
          onReturnHome={vi.fn()}
        />
      );

      expect(screen.getByTestId('detective-report-view')).toBeInTheDocument();
      expect(screen.getByTestId('detective-scorecard-section')).toBeInTheDocument();
      expect(screen.getAllByText(/100/).length).toBeGreaterThan(0);
      expect(screen.getByText(/Master Cyber Detective/i)).toBeInTheDocument();
      expect(screen.getByText(/Perfect Sweep Bonus/i)).toBeInTheDocument();
    });

    it('renders forensic clues for all 3 rounds detailing red flags and safeguards', () => {
      render(
        <DetectiveReportView
          report={sampleReport}
          challenge={sampleChallenge}
          onRedo={vi.fn()}
          onReturnHome={vi.fn()}
        />
      );

      expect(screen.getByTestId('round-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('round-card-2')).toBeInTheDocument();
      expect(screen.getByTestId('round-card-3')).toBeInTheDocument();

      // Check clues content
      expect(screen.getByText(/Private 10-digit mobile number/i)).toBeInTheDocument();
      expect(screen.getByText(/Official telecom alpha-header VM-HDFCBK/i)).toBeInTheDocument();
      expect(screen.getByText(/Unsolicited lottery win/i)).toBeInTheDocument();
    });

    it('renders spot-the-difference quick reference guide for the channel', () => {
      render(
        <DetectiveReportView
          report={sampleReport}
          challenge={sampleChallenge}
          onRedo={vi.fn()}
          onReturnHome={vi.fn()}
        />
      );

      expect(screen.getByTestId('detective-cheatsheet-section')).toBeInTheDocument();
      expect(screen.getByText(/Legitimate SMS Characteristics/i)).toBeInTheDocument();
      expect(screen.getByText(/Phishing \/ Scam Attack Red Flags/i)).toBeInTheDocument();
      expect(screen.getByText(/5-Second Inspection Checklist/i)).toBeInTheDocument();
    });
  });
});
