/**
 * Scenario Validator
 * 
 * Enforces strict, channel-specific schema validation for AI-generated scenarios.
 * Rejects malformed JSON, unsupported block types, unsafe tags, and missing fields.
 */

import { validateAttackClassification } from '../config/attackTaxonomy.js';
import {
  validateTerminationRules,
  generateDefaultTerminationRules
} from './terminationRulesValidator.js';

export const ALLOWED_CHANNELS = ['email', 'chat', 'sms', 'website', 'whatsapp', 'instagram', 'telegram', 'call'];

/**
 * Sanitizes contact/sender/caller names to remove spoiler meta-tags like "(Impersonator)",
 * "(Attacker)", "(Fake)", "(Scammer)", etc. that real-world platforms never display.
 */
export function cleanContactName(name) {
  if (!name || typeof name !== 'string') return name || '';
  return name
    .replace(/\s*[\(\[\{](?:impersonator|impersonation|attacker|scammer|scam|fake|phishing|phisher|spoofed|malicious|fraudster|unverified|hacker|bot)[\)\]\}]/gi, '')
    .replace(/\s*-\s*(?:impersonator|impersonation|attacker|scammer|scam|fake|phishing|phisher|spoofed|malicious|fraudster|unverified|hacker|bot)/gi, '')
    .trim();
}

export const ALLOWED_WEBSITE_LAYOUTS = [
  'login-style',
  'account-verification',
  'generic',
  'security-warning',
  'confirmation',
  'delivery-tracking',
  'form-style'
];

export const ALLOWED_WEBSITE_BLOCKS = [
  'heading',
  'paragraph',
  'notice',
  'alert',
  'text-input',
  'email-input',
  'file-input',
  'password-input',
  'checkbox',
  'button',
  'simulated-link',
  'card',
  'divider',
  'attachment-preview'
];

const ALLOWED_EMAIL_BLOCKS = [
  'paragraph',
  'alert',
  'notice',
  'button',
  'link',
  'quote',
  'signature'
];

/**
 * Validates and sanitizes a scenario JSON object based on its channel.
 * Returns { valid: true, scenario } or { valid: false, errors: string[] }
 */
export function validateScenario(scenario, expectedChannel) {
  const errors = [];

  if (!scenario || typeof scenario !== 'object') {
    return { valid: false, errors: ['Scenario must be a valid JSON object'] };
  }

  // 1. Channel check & normalization
  let channel = (scenario.channel || '').toLowerCase().trim();
  if (channel === 'voice_call' || channel === 'phone_call' || channel === 'vishing') {
    channel = 'call';
    scenario.channel = 'call';
  }

  if (!channel || !ALLOWED_CHANNELS.includes(channel)) {
    errors.push(`Invalid or missing channel "${scenario.channel}". Allowed: ${ALLOWED_CHANNELS.join(', ')}`);
  } else if (expectedChannel && channel !== expectedChannel.toLowerCase().trim() && !(expectedChannel.toLowerCase().trim() === 'call' && ['voice_call', 'phone_call', 'vishing'].includes(channel))) {
    errors.push(`Scenario channel "${channel}" does not match requested channel "${expectedChannel}"`);
  }

  // 2. Base metadata check
  if (!scenario.title || typeof scenario.title !== 'string') {
    errors.push('Scenario must contain a valid string "title"');
  }

  if (!scenario.scenarioId && !scenario.id) {
    scenario.scenarioId = `scen-${channel}-${Date.now()}`;
  } else if (!scenario.scenarioId) {
    scenario.scenarioId = scenario.id;
  }

  if (!scenario.category) {
    scenario.category = 'Social Engineering Simulation';
  }
  if (!scenario.difficulty) {
    scenario.difficulty = 'Medium';
  }

  // 3. Attack Classification Validation
  if (scenario.attackClassification !== undefined) {
    const attackResult = validateAttackClassification(scenario.attackClassification);
    if (!attackResult.valid) {
      errors.push(...attackResult.errors);
    } else {
      scenario.attackClassification = attackResult.classification;
    }
  } else {
    const defaultPrimary =
      channel === 'call'
        ? 'vishing'
        : channel === 'sms'
        ? 'smishing'
        : ['chat', 'whatsapp', 'instagram', 'telegram'].includes(channel)
        ? 'pretexting'
        : channel === 'website'
        ? 'credential_phishing'
        : 'spear_phishing';
    scenario.attackClassification = {
      primaryType: defaultPrimary,
      secondaryTechniques: ['impersonation'],
      rationale: `Classified as ${defaultPrimary} delivery vector.`
    };
  }

  // 4. Channel-specific structural validation
  if (channel === 'email') {
    validateEmailScenario(scenario, errors);
  } else if (['chat', 'whatsapp', 'instagram', 'telegram'].includes(channel)) {
    validateChatScenario(scenario, errors);
  } else if (channel === 'sms') {
    validateSmsScenario(scenario, errors);
  } else if (channel === 'website') {
    validateWebsiteScenario(scenario, errors);
  } else if (channel === 'call') {
    validateCallScenario(scenario, errors);
  }

  // 5. Termination Rules Validation (runs after channel-specific validation so scenario blocks are checked)
  if (scenario.terminationRules !== undefined) {
    const termResult = validateTerminationRules(scenario.terminationRules, channel, scenario);
    if (!termResult.valid) {
      errors.push(...termResult.errors);
    } else {
      scenario.terminationRules = termResult.rules;
    }
  } else {
    scenario.terminationRules = generateDefaultTerminationRules(channel);
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, scenario };
}

function validateEmailScenario(scenario, errors) {
  if (!scenario.emailData || typeof scenario.emailData !== 'object') {
    errors.push('Email scenario must contain an "emailData" object representing the primary email');
    return;
  }

  const email = scenario.emailData;
  if (!email.id) email.id = 'msg-phish-target';
  if (!scenario.targetId) scenario.targetId = email.id;

  if (!email.sender || typeof email.sender !== 'object' || !email.sender.name) {
    errors.push('emailData must contain a "sender" object with a "name"');
  }

  if (!email.subject) {
    errors.push('emailData must contain a "subject"');
  }

  // Validate contentBlocks
  if (!Array.isArray(email.contentBlocks) || email.contentBlocks.length === 0) {
    // If body string was provided instead of contentBlocks, convert it safely
    if (typeof email.body === 'string' && email.body.trim()) {
      email.contentBlocks = email.body.split('\n\n').map(p => ({ type: 'paragraph', text: p.trim() }));
    } else {
      errors.push('emailData must contain a non-empty array of "contentBlocks"');
    }
  } else {
    for (const [idx, block] of email.contentBlocks.entries()) {
      if (!block || typeof block !== 'object' || !block.type) {
        errors.push(`emailData.contentBlocks[${idx}] must be a valid block object with a "type"`);
        continue;
      }
      if (!ALLOWED_EMAIL_BLOCKS.includes(block.type)) {
        errors.push(`Unsupported email block type "${block.type}" at contentBlocks[${idx}]`);
      }
    }
  }

  // Ensure inboxMessages is an array
  if (!Array.isArray(scenario.inboxMessages)) {
    scenario.inboxMessages = [
      {
        id: email.id,
        isTarget: true,
        sender: email.sender,
        subject: email.subject,
        preview: email.preview || email.subject,
        timestamp: email.timestamp || 'Today',
        isUnread: true,
        labels: email.labels || ['Inbox', 'External']
      }
    ];
  }
}

function validateChatScenario(scenario, errors) {
  if (!Array.isArray(scenario.conversations) || scenario.conversations.length === 0) {
    errors.push('Chat scenario must contain a non-empty "conversations" array');
    return;
  }

  let hasTarget = false;
  for (const [idx, conv] of scenario.conversations.entries()) {
    if (!conv || typeof conv !== 'object') {
      errors.push(`conversations[${idx}] must be a valid object`);
      continue;
    }
    if (!conv.id) conv.id = `conv-${idx + 1}`;
    if (conv.isTarget) hasTarget = true;

    if (!conv.contact || typeof conv.contact !== 'object' || !conv.contact.name) {
      errors.push(`conversations[${idx}] must contain a "contact" object with a "name"`);
    } else {
      conv.contact.name = cleanContactName(conv.contact.name);
    }
    if (conv.contactName) conv.contactName = cleanContactName(conv.contactName);
    if (conv.sender?.name) conv.sender.name = cleanContactName(conv.sender.name);

    if (!Array.isArray(conv.messages) || conv.messages.length === 0) {
      errors.push(`conversations[${idx}] must contain a non-empty "messages" array`);
    } else {
      for (const [mIdx, msg] of conv.messages.entries()) {
        if (!msg || typeof msg !== 'object') {
          errors.push(`conversations[${idx}].messages[${mIdx}] must be an object`);
          continue;
        }
        if (!msg.id) msg.id = `msg-${idx}-${mIdx}`;
        if (!msg.text && !msg.link && !msg.attachment && !msg.isVoice) {
          errors.push(`conversations[${idx}].messages[${mIdx}] must contain text, link, attachment, or voice`);
        }
      }
    }
  }

  if (!hasTarget) {
    // Designate first conversation as target
    scenario.conversations[0].isTarget = true;
  }
  if (!scenario.targetId) {
    const target = scenario.conversations.find(c => c.isTarget);
    scenario.targetId = target ? target.id : scenario.conversations[0].id;
  }
}

function validateSmsScenario(scenario, errors) {
  if (!Array.isArray(scenario.conversations) || scenario.conversations.length === 0) {
    errors.push('SMS scenario must contain a non-empty "conversations" array');
    return;
  }

  let hasTarget = false;
  for (const [idx, conv] of scenario.conversations.entries()) {
    if (!conv || typeof conv !== 'object') {
      errors.push(`conversations[${idx}] must be a valid object`);
      continue;
    }
    if (!conv.id) conv.id = `sms-conv-${idx + 1}`;
    if (conv.isTarget) hasTarget = true;

    if (!conv.sender || typeof conv.sender !== 'object' || (!conv.sender.name && !conv.sender.phoneNumber)) {
      errors.push(`conversations[${idx}] must contain a "sender" object with "name" or "phoneNumber"`);
    } else if (conv.sender.name) {
      conv.sender.name = cleanContactName(conv.sender.name);
    }
    if (conv.contactName) conv.contactName = cleanContactName(conv.contactName);

    if (!Array.isArray(conv.messages) || conv.messages.length === 0) {
      errors.push(`conversations[${idx}] must contain a non-empty "messages" array`);
    } else {
      for (const [mIdx, msg] of conv.messages.entries()) {
        if (!msg || typeof msg !== 'object') {
          errors.push(`conversations[${idx}].messages[${mIdx}] must be an object`);
          continue;
        }
        if (!msg.id) msg.id = `sms-msg-${idx}-${mIdx}`;
        if (!msg.text && !msg.link && !msg.attachment) {
          errors.push(`conversations[${idx}].messages[${mIdx}] must contain text, link, or attachment`);
        }
      }
    }
  }

  if (!hasTarget) {
    scenario.conversations[0].isTarget = true;
  }
  if (!scenario.targetId) {
    const target = scenario.conversations.find(c => c.isTarget);
    scenario.targetId = target ? target.id : scenario.conversations[0].id;
  }
}

function validateWebsiteScenario(scenario, errors) {
  if (!scenario.pages || typeof scenario.pages !== 'object') {
    errors.push('Website scenario must contain a non-empty "pages" dictionary');
    return;
  }

  // Normalize pages if provided as an array
  if (Array.isArray(scenario.pages)) {
    const pagesMap = {};
    for (const [idx, page] of scenario.pages.entries()) {
      if (page && typeof page === 'object') {
        const pid = page.id || `page-${idx + 1}`;
        page.id = pid;
        pagesMap[pid] = page;
      }
    }
    scenario.pages = pagesMap;
  }

  // Harvest rogue root-level pages that were closed prematurely by LLM
  for (const key of Object.keys(scenario)) {
    if (
      key !== 'pages' &&
      (key.startsWith('page-') ||
        (scenario[key] &&
          typeof scenario[key] === 'object' &&
          Array.isArray(scenario[key].blocks) &&
          scenario[key].title))
    ) {
      scenario.pages[key] = scenario[key];
      delete scenario[key];
    }
  }

  const pageIds = Object.keys(scenario.pages);
  if (pageIds.length === 0) {
    errors.push('Website scenario must contain a non-empty "pages" dictionary');
    return;
  }

  // Validate initialPageId if specified
  if (scenario.initialPageId) {
    if (!pageIds.includes(scenario.initialPageId)) {
      errors.push(`Invalid initialPageId "${scenario.initialPageId}". It does not match any page in "pages"`);
    }
  } else {
    scenario.initialPageId = pageIds[0];
  }

  if (!scenario.targetId) {
    scenario.targetId = scenario.initialPageId;
  }

  // Normalize browserConfig
  if (!scenario.browserConfig || typeof scenario.browserConfig !== 'object') {
    scenario.browserConfig = {
      siteTitle: scenario.title || 'Virtual Browser',
      defaultDomain: 'portal-verify.secure-domain.info',
      securityStatus: 'unsecured'
    };
  } else {
    if (!scenario.browserConfig.siteTitle) {
      scenario.browserConfig.siteTitle = scenario.title || 'Virtual Browser';
    }
    if (!scenario.browserConfig.defaultDomain) {
      scenario.browserConfig.defaultDomain = 'portal-verify.secure-domain.info';
    }
    if (!['secure', 'unsecured', 'warning'].includes(scenario.browserConfig.securityStatus)) {
      scenario.browserConfig.securityStatus = 'unsecured';
    }
  }

  for (const pageId of pageIds) {
    const page = scenario.pages[pageId];
    if (!page || typeof page !== 'object') {
      errors.push(`pages["${pageId}"] must be a valid page object`);
      continue;
    }

    if (!page.id) page.id = pageId;
    if (!page.title) page.title = 'Virtual Web Page';
    if (!page.url) page.url = `https://portal-verify.secure-domain.info/${pageId}`;

    if (page.layout) {
      if (page.layout === 'form-style') {
        page.layout = 'account-verification';
      } else if (!ALLOWED_WEBSITE_LAYOUTS.includes(page.layout)) {
        page.layout = 'generic';
      }
    }

    if (!Array.isArray(page.blocks) || page.blocks.length === 0) {
      errors.push(`Page "${pageId}" must contain a non-empty "blocks" array`);
    } else {
      for (const [bIdx, block] of page.blocks.entries()) {
        if (!block || typeof block !== 'object' || !block.type) {
          errors.push(`Page "${pageId}".blocks[${bIdx}] must contain a valid block object with "type"`);
          continue;
        }

        // Normalize password-input to text-input with isMasked: true
        if (block.type === 'password-input') {
          block.type = 'text-input';
          block.isMasked = true;
        }

        if (!ALLOWED_WEBSITE_BLOCKS.includes(block.type)) {
          errors.push(`Unsupported website block type "${block.type}" in page "${pageId}" at block ${bIdx}`);
        }

        // Validate form input fields have valid string IDs
        if (['text-input', 'email-input', 'file-input', 'checkbox'].includes(block.type)) {
          if (block.id !== undefined && (typeof block.id !== 'string' || !block.id.trim())) {
            errors.push(`Page "${pageId}".blocks[${bIdx}] of type "${block.type}" has invalid "id"`);
          } else if (!block.id) {
            block.id = `input-${pageId}-${bIdx + 1}`;
          }
        }

        // Validate button targetPageId references an existing page
        if (block.type === 'button' && block.targetPageId) {
          if (typeof block.targetPageId !== 'string' || !pageIds.includes(block.targetPageId)) {
            errors.push(`Page "${pageId}".blocks[${bIdx}] button references nonexistent targetPageId "${block.targetPageId}"`);
          }
        }
      }
    }
  }
}

function validateCallScenario(scenario, errors) {
  if (!scenario.callData || typeof scenario.callData !== 'object') {
    errors.push('Call scenario must contain a "callData" object representing the incoming voice call');
    return;
  }

  const call = scenario.callData;
  if (!call.id) call.id = 'call-target-1';
  if (!scenario.targetId) scenario.targetId = call.id;

  if (!call.callerName || typeof call.callerName !== 'string') {
    call.callerName = scenario.title || 'Unknown Caller';
  } else {
    call.callerName = cleanContactName(call.callerName);
  }
  if (scenario.contactName) scenario.contactName = cleanContactName(scenario.contactName);

  if (!call.callerNumber || typeof call.callerNumber !== 'string') {
    call.callerNumber = '+1 (800) 555-0199';
  }

  if (!call.openingLine || typeof call.openingLine !== 'string' || !call.openingLine.trim()) {
    errors.push('callData must contain an "openingLine" string for the initial spoken script');
  }

  if (!call.personaContext || typeof call.personaContext !== 'string') {
    call.personaContext = 'Authoritative security investigator pressing for quick identity or credential confirmation.';
  }

  if (!call.targetInformation || typeof call.targetInformation !== 'string') {
    call.targetInformation = 'credit card number, security CVV, or PIN';
  }

  if (!Array.isArray(call.fallbackResponses) || call.fallbackResponses.length === 0) {
    call.fallbackResponses = [
      'This is an urgent matter regarding your account security. Please verify the requested information.',
      'We cannot proceed to protect your funds until you provide the necessary security verification.',
      'Sir, this call is recorded. For your protection, state the required numbers.'
    ];
  }
}
