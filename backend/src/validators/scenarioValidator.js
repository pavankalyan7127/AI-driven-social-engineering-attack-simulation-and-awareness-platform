/**
 * Scenario Validator
 * 
 * Enforces strict, channel-specific schema validation for AI-generated scenarios.
 * Rejects malformed JSON, unsupported block types, unsafe tags, and missing fields.
 */

const ALLOWED_CHANNELS = ['email', 'chat', 'sms', 'website'];

const ALLOWED_WEBSITE_LAYOUTS = [
  'login-style',
  'account-verification',
  'generic',
  'security-warning',
  'confirmation',
  'delivery-tracking'
];

const ALLOWED_WEBSITE_BLOCKS = [
  'heading',
  'paragraph',
  'notice',
  'alert',
  'text-input',
  'email-input',
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

  // 1. Channel check
  const channel = (scenario.channel || '').toLowerCase().trim();
  if (!channel || !ALLOWED_CHANNELS.includes(channel)) {
    errors.push(`Invalid or missing channel "${scenario.channel}". Allowed: ${ALLOWED_CHANNELS.join(', ')}`);
  } else if (expectedChannel && channel !== expectedChannel.toLowerCase().trim()) {
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

  // 3. Channel-specific validation
  if (channel === 'email') {
    validateEmailScenario(scenario, errors);
  } else if (channel === 'chat') {
    validateChatScenario(scenario, errors);
  } else if (channel === 'sms') {
    validateSmsScenario(scenario, errors);
  } else if (channel === 'website') {
    validateWebsiteScenario(scenario, errors);
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
    }

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
    }

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
  if (!scenario.pages || typeof scenario.pages !== 'object' || Object.keys(scenario.pages).length === 0) {
    errors.push('Website scenario must contain a non-empty "pages" dictionary');
    return;
  }

  const pageIds = Object.keys(scenario.pages);
  if (!scenario.initialPageId || !scenario.pages[scenario.initialPageId]) {
    scenario.initialPageId = pageIds[0];
  }
  if (!scenario.targetId) {
    scenario.targetId = scenario.initialPageId;
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

    if (page.layout && !ALLOWED_WEBSITE_LAYOUTS.includes(page.layout)) {
      errors.push(`Page "${pageId}" has unsupported layout "${page.layout}". Allowed: ${ALLOWED_WEBSITE_LAYOUTS.join(', ')}`);
    }

    if (!Array.isArray(page.blocks) || page.blocks.length === 0) {
      errors.push(`Page "${pageId}" must contain a non-empty "blocks" array`);
    } else {
      for (const [bIdx, block] of page.blocks.entries()) {
        if (!block || typeof block !== 'object' || !block.type) {
          errors.push(`Page "${pageId}".blocks[${bIdx}] must contain a valid block object with "type"`);
          continue;
        }
        if (!ALLOWED_WEBSITE_BLOCKS.includes(block.type)) {
          errors.push(`Unsupported website block type "${block.type}" in page "${pageId}" at block ${bIdx}`);
        }
      }
    }
  }
}
