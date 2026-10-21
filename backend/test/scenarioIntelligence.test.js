import { describe, it, expect, vi } from 'vitest';
import {
  ATTACK_TAXONOMY,
  VALID_ATTACK_TYPES,
  normalizeAttackType,
  validateAttackClassification
} from '../src/config/attackTaxonomy.js';
import {
  validateTerminationRules,
  generateDefaultTerminationRules
} from '../src/validators/terminationRulesValidator.js';
import { validateScenario } from '../src/validators/scenarioValidator.js';
import { buildScenarioSystemPrompt } from '../src/services/groqService.js';

describe('Scenario Intelligence - Attack Taxonomy & Validation', () => {
  it('contains all 15 required attack taxonomy types', () => {
    const requiredTypes = [
      'phishing',
      'spear_phishing',
      'business_email_compromise',
      'smishing',
      'vishing',
      'credential_phishing',
      'pretexting',
      'impersonation',
      'baiting',
      'quid_pro_quo',
      'tailgating',
      'watering_hole',
      'tech_support_scam',
      'romance_scam',
      'urgency_manipulation'
    ];

    expect(VALID_ATTACK_TYPES.length).toBe(15);
    for (const t of requiredTypes) {
      expect(VALID_ATTACK_TYPES).toContain(t);
      expect(ATTACK_TAXONOMY[t]).toBeDefined();
      expect(ATTACK_TAXONOMY[t].name).toBeTruthy();
      expect(ATTACK_TAXONOMY[t].description).toBeTruthy();
    }
  });

  it('normalizes attack types with hyphens, spaces, and mixed casing', () => {
    expect(normalizeAttackType('Spear Phishing')).toBe('spear_phishing');
    expect(normalizeAttackType('Business-Email-Compromise')).toBe('business_email_compromise');
    expect(normalizeAttackType('SMISHING')).toBe('smishing');
    expect(normalizeAttackType('tech support scam')).toBe('tech_support_scam');
  });

  it('validates a well-formed attackClassification object', () => {
    const validClassification = {
      primaryType: 'spear_phishing',
      secondaryTechniques: ['urgency_manipulation', 'credential_phishing'],
      rationale: 'Targets an executive with an urgent credential request.'
    };

    const res = validateAttackClassification(validClassification);
    expect(res.valid).toBe(true);
    expect(res.errors).toHaveLength(0);
    expect(res.classification.primaryType).toBe('spear_phishing');
    expect(res.classification.secondaryTechniques).toEqual(['urgency_manipulation', 'credential_phishing']);
  });

  it('rejects unsupported attack types', () => {
    const invalid = {
      primaryType: 'ddos_attack',
      rationale: 'Not a social engineering attack.'
    };
    const res = validateAttackClassification(invalid);
    expect(res.valid).toBe(false);
    expect(res.errors[0]).toMatch(/unsupported primarytype/i);
  });

  it('filters out unsupported secondary techniques and enforces max 4 techniques', () => {
    const classification = {
      primaryType: 'phishing',
      secondaryTechniques: ['impersonation', 'invalid_technique', 'pretexting', 'baiting', 'vishing', 'tailgating'],
      rationale: 'Multi-vector attack.'
    };
    const res = validateAttackClassification(classification);
    expect(res.valid).toBe(true);
    expect(res.classification.secondaryTechniques.length).toBeLessThanOrEqual(4);
    expect(res.classification.secondaryTechniques).not.toContain('invalid_technique');
  });
});

describe('Scenario Intelligence - Termination Rules Validation', () => {
  it('generates valid default termination rules for each channel', () => {
    for (const channel of ['email', 'chat', 'sms', 'website']) {
      const defaultRules = generateDefaultTerminationRules(channel);
      expect(defaultRules.positiveConditions.length).toBeGreaterThanOrEqual(1);
      expect(defaultRules.negativeConditions.length).toBeGreaterThanOrEqual(1);

      const validation = validateTerminationRules(defaultRules, channel, {});
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    }
  });

  it('enforces points bounds between 1 and 50 points', () => {
    const invalidRules = {
      version: '1.0',
      observationWindowSeconds: 120,
      positiveConditions: [
        {
          id: 'report_threat',
          trigger: 'event',
          eventType: 'threat_reported',
          points: 75, // > 50 error
          label: 'Reported threat',
          explanation: 'Identified threat and reported.'
        }
      ],
      negativeConditions: [
        {
          id: 'click_link',
          trigger: 'event',
          eventType: 'simulated_link_clicked',
          points: 60, // > 50 error
          label: 'Clicked link',
          explanation: 'Clicked malicious link.'
        }
      ]
    };

    const res = validateTerminationRules(invalidRules, 'email', {});
    expect(res.valid).toBe(false);
    expect(res.errors.some(e => e.includes('between 1 and 50'))).toBe(true);
  });

  it('enforces observation window bounds between 15 and 600 seconds', () => {
    const tooShortRules = {
      version: '1.0',
      observationWindowSeconds: 5, // < 15
      positiveConditions: [
        {
          id: 'report_threat',
          trigger: 'observation_window_elapsed',
          points: 10,
          label: 'Observed threat',
          explanation: 'Observed scenario without interacting.'
        }
      ],
      negativeConditions: [
        {
          id: 'click_link',
          trigger: 'event',
          eventType: 'simulated_link_clicked',
          points: 20,
          label: 'Clicked link',
          explanation: 'Clicked malicious link.'
        }
      ]
    };

    const res = validateTerminationRules(tooShortRules, 'email', {});
    expect(res.valid).toBe(false);
    expect(res.errors.some(e => e.includes('between 15 and 600 seconds'))).toBe(true);
  });

  it('rejects passive observation events from being used as negative failure conditions', () => {
    const passiveAsFailureRules = {
      version: '1.0',
      observationWindowSeconds: 120,
      positiveConditions: [
        {
          id: 'report_threat',
          trigger: 'event',
          eventType: 'threat_reported',
          points: 20,
          label: 'Reported',
          explanation: 'Reported threat.'
        }
      ],
      negativeConditions: [
        {
          id: 'opened_msg',
          trigger: 'event',
          eventType: 'message_opened', // Passive exploration, cannot fail user
          points: 20,
          label: 'Opened message',
          explanation: 'User merely opened the message.'
        }
      ]
    };

    const res = validateTerminationRules(passiveAsFailureRules, 'email', {});
    expect(res.valid).toBe(false);
    expect(res.errors.some(e => e.includes('cannot use passive viewing event'))).toBe(true);
  });

  it('rejects contradictory rules where positive and negative trigger on identical event', () => {
    const contradictoryRules = {
      version: '1.0',
      observationWindowSeconds: 120,
      positiveConditions: [
        {
          id: 'clicked_positive',
          trigger: 'event',
          eventType: 'simulated_link_clicked',
          points: 20,
          label: 'Clicked reward',
          explanation: 'Clicked link reward.'
        }
      ],
      negativeConditions: [
        {
          id: 'clicked_negative',
          trigger: 'event',
          eventType: 'simulated_link_clicked',
          points: 20,
          label: 'Clicked penalty',
          explanation: 'Clicked link penalty.'
        }
      ]
    };

    const res = validateTerminationRules(contradictoryRules, 'email', {});
    expect(res.valid).toBe(false);
    expect(res.errors.some(e => e.includes('Contradictory conditions detected'))).toBe(true);
  });

  it('rejects credential form submission rule if website has no input blocks', () => {
    const websiteRules = {
      version: '1.0',
      observationWindowSeconds: 120,
      positiveConditions: [
        {
          id: 'safe_exit_rule',
          trigger: 'event',
          eventType: 'safe_exit',
          points: 15,
          label: 'Safe exit',
          explanation: 'Safely navigated away.'
        }
      ],
      negativeConditions: [
        {
          id: 'submit_cred_rule',
          trigger: 'event',
          eventType: 'simulated_form_submitted',
          points: 30,
          label: 'Submitted form',
          explanation: 'Submitted credentials into form.'
        }
      ]
    };

    // Scenario pages contain only headings and buttons, no inputs
    const contextWithoutInputs = {
      pages: {
        'page-1': {
          id: 'page-1',
          blocks: [
            { type: 'heading', text: 'Welcome' },
            { type: 'button', text: 'Click me' }
          ]
        }
      }
    };

    const res = validateTerminationRules(websiteRules, 'website', contextWithoutInputs);
    expect(res.valid).toBe(false);
    expect(res.errors.some(e => e.includes('does not contain any credential form inputs'))).toBe(true);
  });
});

describe('Scenario Intelligence - Integrated Validation & Prompt Construction', () => {
  it('automatically adds default classification and terminationRules if omitted in validateScenario', () => {
    const legacyScenario = {
      scenarioId: 'scen-legacy-01',
      channel: 'email',
      title: 'Legacy Spear Phish',
      description: 'Older payload without intelligence block',
      category: 'Spear Phishing',
      difficulty: 'Medium',
      initialView: 'inbox',
      targetId: 'msg-1',
      emailData: {
        id: 'msg-1',
        isTarget: true,
        sender: { name: 'IT Admin', email: 'admin@corp.com' },
        subject: 'Reset Required',
        contentBlocks: [{ type: 'paragraph', text: 'Urgent action required.' }]
      }
    };

    const result = validateScenario(legacyScenario, 'email');
    expect(result.valid).toBe(true);
    expect(result.scenario.attackClassification).toBeDefined();
    expect(result.scenario.attackClassification.primaryType).toBe('spear_phishing');
    expect(result.scenario.terminationRules).toBeDefined();
    expect(result.scenario.terminationRules.positiveConditions.length).toBeGreaterThan(0);
    expect(result.scenario.terminationRules.negativeConditions.length).toBeGreaterThan(0);
  });

  it('builds system prompt instructing channel prediction when requestedChannel is null', () => {
    const promptNullChannel = buildScenarioSystemPrompt(null);
    expect(promptNullChannel).toMatch(/PREDICT SIMULATION CHANNEL/);
    expect(promptNullChannel).toMatch(/email/);
    expect(promptNullChannel).toMatch(/chat/);
    expect(promptNullChannel).toMatch(/sms/);
    expect(promptNullChannel).toMatch(/website/);
    expect(promptNullChannel).toMatch(/ATTACK CLASSIFICATION/);
    expect(promptNullChannel).toMatch(/TERMINATION RULES/);

    const promptSpecifiedChannel = buildScenarioSystemPrompt('sms');
    expect(promptSpecifiedChannel).toMatch(/Strictly generate a "sms" scenario/);
  });
});
