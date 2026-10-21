/**
 * Termination Rules Schema & Validator
 * 
 * Enforces declarative, verifiable termination conditions for attack simulation scenarios.
 * Guarantees that AI-proposed rules reference only real observable channel events,
 * bounded points, valid observation windows, and non-contradictory logic.
 */

export const ALLOWED_TRIGGERS = [
  'event',
  'observation_window_elapsed',
  'explicit_user_action'
];

export const MIN_OBSERVATION_SECONDS = 15;
export const MAX_OBSERVATION_SECONDS = 600;
export const DEFAULT_OBSERVATION_SECONDS = 120;

export const MIN_POINTS = 1;
export const MAX_POINTS = 50;

export const CHANNEL_ALLOWED_EVENTS = {
  email: [
    'simulated_link_clicked',
    'reply_sent',
    'threat_reported',
    'safe_exit',
    'user_blocked_sender',
    'message_opened',
    'message_starred',
    'message_archived',
    'message_deleted',
    'observation_window_elapsed'
  ],
  chat: [
    'simulated_link_clicked',
    'message_sent',
    'attachment_interaction',
    'attachment_opened',
    'voice_interaction',
    'warning_sign_selected',
    'threat_reported',
    'safe_exit',
    'user_blocked_sender',
    'message_deleted',
    'conversation_opened',
    'observation_window_elapsed'
  ],
  whatsapp: [
    'simulated_link_clicked',
    'message_sent',
    'attachment_interaction',
    'attachment_opened',
    'voice_interaction',
    'warning_sign_selected',
    'threat_reported',
    'safe_exit',
    'user_blocked_sender',
    'message_deleted',
    'conversation_opened',
    'observation_window_elapsed'
  ],
  instagram: [
    'simulated_link_clicked',
    'message_sent',
    'attachment_interaction',
    'attachment_opened',
    'voice_interaction',
    'warning_sign_selected',
    'threat_reported',
    'safe_exit',
    'user_blocked_sender',
    'message_deleted',
    'conversation_opened',
    'observation_window_elapsed'
  ],
  telegram: [
    'simulated_link_clicked',
    'message_sent',
    'attachment_interaction',
    'attachment_opened',
    'voice_interaction',
    'warning_sign_selected',
    'threat_reported',
    'safe_exit',
    'user_blocked_sender',
    'message_deleted',
    'conversation_opened',
    'observation_window_elapsed'
  ],
  sms: [
    'simulated_link_clicked',
    'message_sent',
    'attachment_interaction',
    'attachment_opened',
    'warning_sign_selected',
    'threat_reported',
    'safe_exit',
    'user_blocked_sender',
    'conversation_opened',
    'observation_window_elapsed'
  ],
  website: [
    'virtual_link_clicked',
    'simulated_form_submitted',
    'credential_submitted',
    'form_interaction',
    'threat_reported',
    'safe_exit',
    'virtual_page_viewed',
    'observation_window_elapsed'
  ],
  call: [
    'call_answered',
    'call_rejected',
    'call_declined',
    'call_hung_up',
    'speech_input_provided',
    'dtmf_keypad_pressed',
    'sensitive_info_disclosed',
    'credential_submitted',
    'information_shared',
    'sensitive_information_shared',
    'threat_reported',
    'safe_exit',
    'user_blocked_sender',
    'observation_window_elapsed'
  ]
};

// Passive events that must never be treated as negative failure conditions
export const PASSIVE_EVENTS = [
  'message_opened',
  'conversation_opened',
  'virtual_page_viewed',
  'call_answered',
  'scenario_viewed',
  'interaction_recorded'
];

/**
 * Checks if a scenario contains simulated form inputs capable of collecting credentials.
 * 
 * @param {Object} scenario
 * @param {string} channel
 * @returns {boolean}
 */
export function scenarioSupportsCredentialSubmission(scenario, channel) {
  if (!scenario || typeof scenario !== 'object') return false;

  if (channel === 'call') return true;

  if (channel === 'website' && scenario.pages && typeof scenario.pages === 'object') {
    for (const page of Object.values(scenario.pages)) {
      if (Array.isArray(page?.blocks)) {
        const hasInput = page.blocks.some(
          (b) => b && (b.type === 'text-input' || b.type === 'email-input')
        );
        if (hasInput) return true;
      }
    }
  }

  return false;
}

/**
 * Validates a single termination condition.
 * 
 * @param {Object} condition
 * @param {string} polarity - 'positive' | 'negative'
 * @param {string} channel
 * @param {Set<string>} seenIds
 * @param {Object} scenario
 * @returns {{ valid: boolean, errors: string[], condition: Object|null }}
 */
function validateCondition(condition, polarity, channel, seenIds, scenario) {
  const errors = [];

  if (!condition || typeof condition !== 'object') {
    return { valid: false, errors: [`${polarity} condition must be an object`], condition: null };
  }

  // 1. Condition ID
  const id = typeof condition.id === 'string' ? condition.id.trim() : '';
  if (!id || !/^[a-zA-Z0-9_-]{3,64}$/.test(id)) {
    errors.push(
      `Condition ID "${condition.id}" is invalid. Must be alphanumeric with hyphens/underscores (3-64 chars).`
    );
  } else if (seenIds.has(id)) {
    errors.push(`Duplicate condition ID "${id}" detected.`);
  } else {
    seenIds.add(id);
  }

  // 2. Trigger Type
  const trigger = condition.trigger;
  if (!trigger || !ALLOWED_TRIGGERS.includes(trigger)) {
    errors.push(
      `Condition "${id}" has unsupported trigger "${trigger}". Allowed triggers: ${ALLOWED_TRIGGERS.join(', ')}`
    );
  }

  // 3. Channel event compatibility
  let eventType = condition.eventType;

  // Normalize common LLM eventType aliases
  if (typeof eventType === 'string') {
    const rawLower = eventType.toLowerCase().trim();
    if (channel === 'call') {
      if (['information_shared', 'sensitive_information_shared', 'credentials_shared', 'info_shared', 'card_details_shared', 'pin_shared', 'credentials_disclosed', 'disclosed_info', 'data_leaked'].includes(rawLower)) {
        eventType = 'sensitive_info_disclosed';
        condition.eventType = 'sensitive_info_disclosed';
      } else if (['call_declined', 'declined_call', 'call_rejected'].includes(rawLower)) {
        eventType = 'call_rejected';
        condition.eventType = 'call_rejected';
      } else if (['call_ended', 'hang_up', 'call_hung_up'].includes(rawLower)) {
        eventType = 'call_hung_up';
        condition.eventType = 'call_hung_up';
      } else if (['block_caller', 'blocked_caller', 'user_blocked_sender'].includes(rawLower)) {
        eventType = 'user_blocked_sender';
        condition.eventType = 'user_blocked_sender';
      }
    } else {
      if (['link_clicked', 'url_clicked', 'phishing_link_clicked'].includes(rawLower)) {
        const canonicalLink = channel === 'website' ? 'virtual_link_clicked' : 'simulated_link_clicked';
        eventType = canonicalLink;
        condition.eventType = canonicalLink;
      }
    }
  }

  const allowedEvents = CHANNEL_ALLOWED_EVENTS[channel] || [];

  if (trigger === 'event' || trigger === 'explicit_user_action') {
    if (!eventType || typeof eventType !== 'string') {
      errors.push(`Condition "${id}" requires an "eventType" string for trigger "${trigger}".`);
    } else if (!allowedEvents.includes(eventType)) {
      errors.push(
        `Condition "${id}" uses eventType "${eventType}" which is not supported for channel "${channel}". Supported: ${allowedEvents.join(', ')}`
      );
    }
  }

  // Safeguard: Passive viewing must NEVER be a negative failure condition
  if (polarity === 'negative' && eventType && PASSIVE_EVENTS.includes(eventType)) {
    errors.push(
      `Negative condition "${id}" cannot use passive viewing event "${eventType}" as a failure condition.`
    );
  }

  // Safeguard: Credential submission conditions require actual simulated form inputs in scenario
  const credentialEvents = ['simulated_form_submitted', 'credential_submitted', 'simulated_credentials_submitted'];
  if (eventType && credentialEvents.includes(eventType)) {
    if (scenario?.pages && typeof scenario.pages === 'object' && Object.keys(scenario.pages).length > 0) {
      if (!scenarioSupportsCredentialSubmission(scenario, channel)) {
        errors.push(
          `Condition "${id}" specifies credential submission event "${eventType}", but the scenario does not contain any credential form inputs.`
        );
      }
    }
  }

  // 4. Points validation
  const points = Number(condition.points);
  if (!Number.isInteger(points) || points < MIN_POINTS || points > MAX_POINTS) {
    errors.push(
      `Condition "${id}" has invalid points (${condition.points}). Must be an integer between ${MIN_POINTS} and ${MAX_POINTS}.`
    );
  }

  // 5. Label & Explanation validation
  const label = typeof condition.label === 'string' ? condition.label.trim() : '';
  if (!label || label.length < 3 || label.length > 150) {
    errors.push(`Condition "${id}" must have a "label" between 3 and 150 characters.`);
  }

  const explanation = typeof condition.explanation === 'string' ? condition.explanation.trim() : '';
  if (!explanation || explanation.length < 5 || explanation.length > 500) {
    errors.push(`Condition "${id}" must have an "explanation" between 5 and 500 characters.`);
  }

  // 6. Optional requiredEvents / forbiddenEvents validation
  let sanitizedForbidden = [];
  if (condition.forbiddenEvents !== undefined) {
    if (!Array.isArray(condition.forbiddenEvents)) {
      errors.push(`Condition "${id}": forbiddenEvents must be an array of event strings.`);
    } else {
      sanitizedForbidden = condition.forbiddenEvents.filter((e) => typeof e === 'string' && allowedEvents.includes(e));
    }
  }

  let sanitizedRequired = [];
  if (condition.requiredEvents !== undefined) {
    if (!Array.isArray(condition.requiredEvents)) {
      errors.push(`Condition "${id}": requiredEvents must be an array of event strings.`);
    } else {
      sanitizedRequired = condition.requiredEvents.filter((e) => typeof e === 'string' && allowedEvents.includes(e));
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors, condition: null };
  }

  return {
    valid: true,
    errors: [],
    condition: {
      id,
      trigger,
      eventType: eventType || undefined,
      requiredEvents: sanitizedRequired.length > 0 ? sanitizedRequired : undefined,
      forbiddenEvents: sanitizedForbidden.length > 0 ? sanitizedForbidden : undefined,
      points,
      label,
      explanation
    }
  };
}

/**
 * Validates and normalizes terminationRules for a scenario.
 * 
 * @param {Object} terminationRules
 * @param {string} channel
 * @param {Object} scenario
 * @returns {{ valid: boolean, errors: string[], rules: Object|null }}
 */
export function validateTerminationRules(terminationRules, channel, scenario = {}) {
  const errors = [];

  if (!terminationRules || typeof terminationRules !== 'object') {
    return {
      valid: false,
      errors: ['terminationRules must be an object'],
      rules: null
    };
  }

  // 1. Version
  const version = typeof terminationRules.version === 'string' ? terminationRules.version.trim() : '1.0';

  // 2. Observation Window
  let observationWindowSeconds = terminationRules.observationWindowSeconds;
  if (observationWindowSeconds === undefined || observationWindowSeconds === null) {
    observationWindowSeconds = DEFAULT_OBSERVATION_SECONDS;
  } else {
    observationWindowSeconds = Number(observationWindowSeconds);
    if (
      !Number.isInteger(observationWindowSeconds) ||
      observationWindowSeconds < MIN_OBSERVATION_SECONDS ||
      observationWindowSeconds > MAX_OBSERVATION_SECONDS
    ) {
      errors.push(
        `observationWindowSeconds must be an integer between ${MIN_OBSERVATION_SECONDS} and ${MAX_OBSERVATION_SECONDS} seconds.`
      );
    }
  }

  // 3. Positive Conditions
  if (!Array.isArray(terminationRules.positiveConditions) || terminationRules.positiveConditions.length === 0) {
    errors.push('terminationRules must contain at least one positiveCondition');
  }

  // 4. Negative Conditions
  if (!Array.isArray(terminationRules.negativeConditions) || terminationRules.negativeConditions.length === 0) {
    errors.push('terminationRules must contain at least one negativeCondition');
  }

  const seenIds = new Set();
  const sanitizedPositive = [];
  const sanitizedNegative = [];

  if (Array.isArray(terminationRules.positiveConditions)) {
    for (const rawCond of terminationRules.positiveConditions) {
      const result = validateCondition(rawCond, 'positive', channel, seenIds, scenario);
      if (!result.valid) {
        errors.push(...result.errors);
      } else {
        sanitizedPositive.push(result.condition);
      }
    }
  }

  if (Array.isArray(terminationRules.negativeConditions)) {
    for (const rawCond of terminationRules.negativeConditions) {
      const result = validateCondition(rawCond, 'negative', channel, seenIds, scenario);
      if (!result.valid) {
        errors.push(...result.errors);
      } else {
        sanitizedNegative.push(result.condition);
      }
    }
  }

  // 5. Contradiction Detection:
  // Ensure a positive condition does not require an event that a negative condition simultaneously triggers on
  for (const pos of sanitizedPositive) {
    if (pos.eventType) {
      for (const neg of sanitizedNegative) {
        if (neg.eventType && pos.eventType === neg.eventType) {
          errors.push(
            `Contradictory conditions detected: positive condition "${pos.id}" and negative condition "${neg.id}" both trigger on identical event "${pos.eventType}".`
          );
        }
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors, rules: null };
  }

  return {
    valid: true,
    errors: [],
    rules: {
      version,
      observationWindowSeconds,
      positiveConditions: sanitizedPositive,
      negativeConditions: sanitizedNegative
    }
  };
}

/**
 * Generates sensible default termination rules for a given channel.
 * 
 * @param {string} channel
 * @returns {Object}
 */
export function generateDefaultTerminationRules(channel) {
  const normChannel = (channel || 'email').toLowerCase().trim();

  const rulesByChannel = {
    email: {
      version: '1.0',
      observationWindowSeconds: 120,
      positiveConditions: [
        {
          id: 'report_threat',
          trigger: 'event',
          eventType: 'threat_reported',
          points: 30,
          label: 'Reported threat',
          explanation: 'The user identified the deceptive cues and reported the email.'
        },
        {
          id: 'ignore_after_observation',
          trigger: 'observation_window_elapsed',
          points: 20,
          label: 'Ignored suspicious message',
          explanation: 'The user refrained from interacting with links or replying during observation.'
        }
      ],
      negativeConditions: [
        {
          id: 'malicious_link_clicked',
          trigger: 'event',
          eventType: 'simulated_link_clicked',
          points: 25,
          label: 'Clicked simulated link',
          explanation: 'The user clicked an unverified link in the message.'
        }
      ]
    },
    chat: {
      version: '1.0',
      observationWindowSeconds: 120,
      positiveConditions: [
        {
          id: 'report_threat',
          trigger: 'event',
          eventType: 'threat_reported',
          points: 30,
          label: 'Reported threat',
          explanation: 'The user identified the suspicious conversation and reported it.'
        },
        {
          id: 'safe_exit',
          trigger: 'event',
          eventType: 'safe_exit',
          points: 20,
          label: 'Safely exited conversation',
          explanation: 'The user exited without sharing sensitive data.'
        }
      ],
      negativeConditions: [
        {
          id: 'malicious_link_clicked',
          trigger: 'event',
          eventType: 'simulated_link_clicked',
          points: 25,
          label: 'Clicked simulated link',
          explanation: 'The user clicked an unverified link in the chat.'
        }
      ]
    },
    sms: {
      version: '1.0',
      observationWindowSeconds: 120,
      positiveConditions: [
        {
          id: 'report_threat',
          trigger: 'event',
          eventType: 'threat_reported',
          points: 30,
          label: 'Reported threat',
          explanation: 'The user reported the suspicious SMS.'
        },
        {
          id: 'block_sender',
          trigger: 'event',
          eventType: 'user_blocked_sender',
          points: 25,
          label: 'Blocked suspicious sender',
          explanation: 'The user blocked the unverified SMS sender.'
        },
        {
          id: 'safe_exit',
          trigger: 'event',
          eventType: 'safe_exit',
          points: 20,
          label: 'Safely closed message',
          explanation: 'The user exited without clicking or replying.'
        }
      ],
      negativeConditions: [
        {
          id: 'malicious_link_clicked',
          trigger: 'event',
          eventType: 'simulated_link_clicked',
          points: 25,
          label: 'Tapped simulated link',
          explanation: 'The user tapped an unverified link in the SMS.'
        }
      ]
    },
    website: {
      version: '1.0',
      observationWindowSeconds: 120,
      positiveConditions: [
        {
          id: 'safe_exit',
          trigger: 'event',
          eventType: 'safe_exit',
          points: 30,
          label: 'Safely exited portal',
          explanation: 'The user recognized the suspicious domain and closed the portal.'
        },
        {
          id: 'report_threat',
          trigger: 'event',
          eventType: 'threat_reported',
          points: 20,
          label: 'Reported fraudulent site',
          explanation: 'The user reported the counterfeit page.'
        }
      ],
      negativeConditions: [
        {
          id: 'simulated_form_submitted',
          trigger: 'event',
          eventType: 'simulated_form_submitted',
          points: 30,
          label: 'Submitted credentials on counterfeit portal',
          explanation: 'The user entered credentials into the phishing form.'
        },
        {
          id: 'virtual_link_clicked',
          trigger: 'event',
          eventType: 'virtual_link_clicked',
          points: 25,
          label: 'Clicked unverified link',
          explanation: 'The user clicked an external link on the untrusted portal.'
        }
      ]
    },
    call: {
      version: '1.0',
      observationWindowSeconds: 120,
      positiveConditions: [
        {
          id: 'call_rejected',
          trigger: 'event',
          eventType: 'call_rejected',
          points: 30,
          label: 'Declined suspicious call',
          explanation: 'The user declined the unverified or flagged incoming voice call.'
        },
        {
          id: 'report_threat',
          trigger: 'event',
          eventType: 'threat_reported',
          points: 25,
          label: 'Reported vishing call',
          explanation: 'The user reported the suspicious call as fraud or vishing.'
        },
        {
          id: 'block_caller',
          trigger: 'event',
          eventType: 'user_blocked_sender',
          points: 20,
          label: 'Blocked caller number',
          explanation: 'The user blocked the imposter caller phone number.'
        },
        {
          id: 'safe_hangup',
          trigger: 'event',
          eventType: 'safe_exit',
          points: 15,
          label: 'Safely hung up call',
          explanation: 'The user hung up the call without providing credentials.'
        }
      ],
      negativeConditions: [
        {
          id: 'disclosed_sensitive_info',
          trigger: 'event',
          eventType: 'credential_submitted',
          points: 35,
          label: 'Disclosed sensitive information',
          explanation: 'The user spoke or entered requested sensitive financial/identity credentials during the phone call.'
        }
      ]
    }
  };

  rulesByChannel.whatsapp = rulesByChannel.chat;
  rulesByChannel.instagram = rulesByChannel.chat;
  rulesByChannel.telegram = rulesByChannel.chat;
  rulesByChannel.voice_call = rulesByChannel.call;
  rulesByChannel.phone_call = rulesByChannel.call;
  rulesByChannel.vishing = rulesByChannel.call;

  return rulesByChannel[normChannel] || rulesByChannel.email;
}
