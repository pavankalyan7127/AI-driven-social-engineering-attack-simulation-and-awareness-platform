/**
 * Security Behavior Scoring Configuration
 * 
 * Defines deterministic penalties, rewards, maximum occurrences,
 * and risk level thresholds for simulation behavior evaluation.
 */

export const SCORING_CONFIG = {
  version: '1.0.0',
  baselineScore: 100,

  // Negative behavioral penalties
  penalties: {
    malicious_link_clicked: {
      points: 25,
      maxOccurrences: 2,
      category: 'malicious_link_clicked',
      description: 'Clicked on a simulated phishing/malicious link.'
    },
    simulated_credentials_submitted: {
      points: 40,
      maxOccurrences: 1,
      category: 'simulated_credentials_submitted',
      description: 'Submitted simulated credentials or sensitive data on a fraudulent portal.'
    },
    risky_reply_sent: {
      points: 15,
      maxOccurrences: 2,
      category: 'risky_reply_sent',
      description: 'Sent a response engaging directly with the attacker/impersonator.'
    },
    suspicious_attachment_interacted: {
      points: 20,
      maxOccurrences: 2,
      category: 'suspicious_attachment_interacted',
      description: 'Interacted with or downloaded a suspicious simulated attachment.'
    }
  },

  // Positive protective action rewards
  rewards: {
    warning_sign_identified: {
      points: 5,
      maxOccurrences: 3,
      category: 'warning_sign_identified',
      description: 'Identified specific social engineering warning indicators.'
    },
    threat_reported: {
      points: 15,
      maxOccurrences: 1,
      category: 'threat_reported',
      description: 'Reported the threat through the simulated incident response mechanism.'
    },
    safe_exit: {
      points: 10,
      maxOccurrences: 1,
      category: 'safe_exit',
      description: 'Safely exited the suspicious interaction without engaging.'
    }
  },

  // Risk Classification Bands
  riskBands: [
    {
      min: 80,
      max: 100,
      level: 'low',
      label: 'Low Risk',
      description: 'Strong cybersecurity awareness and safe defensive actions observed.'
    },
    {
      min: 60,
      max: 79,
      level: 'moderate',
      label: 'Moderate Risk',
      description: 'Caution observed, but some interaction or engagement detected.'
    },
    {
      min: 40,
      max: 59,
      level: 'high',
      label: 'High Risk',
      description: 'Significant vulnerabilities demonstrated (e.g. clicking malicious links or engaging).'
    },
    {
      min: 0,
      max: 39,
      level: 'critical',
      label: 'Critical Risk',
      description: 'Severe vulnerability demonstrated (e.g. credential submission on fake portal).'
    }
  ]
};

/**
 * Returns the risk classification for a computed score.
 */
export function getRiskLevel(score) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  for (const band of SCORING_CONFIG.riskBands) {
    if (clamped >= band.min && clamped <= band.max) {
      return band.level;
    }
  }
  return 'critical';
}
