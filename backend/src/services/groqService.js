import Groq from 'groq-sdk';
import { validateScenario } from '../validators/scenarioValidator.js';

/**
 * Builds compact system prompts per channel to minimize token consumption
 * while guaranteeing schema adherence.
 */
function getSystemPrompt(channel) {
  const baseInstructions = `You are a cybersecurity simulation engine generating realistic educational social engineering attack scenarios for student and corporate awareness training.
IMPORTANT RULES:
- Output strictly a single valid JSON object. Do not include markdown codeblocks or conversational text.
- Use only fictional, synthetic data (names, domains, emails, phone numbers). Never use real credentials or passwords.
- The scenario channel must be exactly "${channel}".
`;

  switch (channel) {
    case 'email':
      return `${baseInstructions}
Required JSON structure for "email":
{
  "scenarioId": "scen-email-xxxx",
  "channel": "email",
  "title": "Title of the attack",
  "description": "Short scenario summary",
  "category": "Spear Phishing / Credential Harvesting",
  "difficulty": "Medium",
  "initialView": "inbox",
  "targetId": "msg-phish-target",
  "userProfile": { "name": "Student User", "email": "user@university.edu" },
  "emailData": {
    "id": "msg-phish-target",
    "isTarget": true,
    "sender": { "name": "IT Support Desk", "email": "support@university-update.com", "avatar": "IT", "avatarBg": "bg-red-700 text-white" },
    "recipient": { "name": "Student User", "email": "user@university.edu" },
    "securityDetails": { "from": "support@university-update.com", "mailedBy": "external-server.com", "security": "TLS" },
    "subject": "Urgent Security Notice",
    "timestamp": "Today",
    "preview": "Action required regarding your account...",
    "labels": ["Inbox", "External"],
    "isUnread": true,
    "contentBlocks": [
      { "type": "paragraph", "text": "Greeting and urgency context." },
      { "type": "alert", "level": "warning", "title": "Urgent Action Required", "text": "Deadline warning." },
      { "type": "button", "id": "btn-action", "actionId": "action_click_link", "text": "Verify Credentials Now", "url": "https://auth-verify-portal.info/login" },
      { "type": "signature", "text": "Regards,\\nIT Services" }
    ]
  },
  "inboxMessages": [
    { "id": "msg-comp-1", "sender": { "name": "Newsletter", "avatar": "N" }, "subject": "Weekly Bulletin", "preview": "Campus highlights...", "timestamp": "Yesterday", "isUnread": false, "labels": ["Inbox"] }
  ]
}`;

    case 'chat':
      return `${baseInstructions}
Required JSON structure for "chat":
{
  "scenarioId": "scen-chat-xxxx",
  "channel": "chat",
  "title": "Title of the attack",
  "description": "Short scenario summary",
  "category": "Chat Impersonation",
  "difficulty": "Medium",
  "initialView": "list",
  "targetId": "conv-target",
  "userProfile": { "name": "Student User", "handle": "@student" },
  "conversations": [
    {
      "id": "conv-target",
      "isTarget": true,
      "contact": { "name": "Enterprise IT Helpdesk", "handle": "+1 (800) 555-0199", "avatar": "IT", "status": "online", "badge": "External Contact" },
      "unreadCount": 1,
      "lastActivity": "Just now",
      "systemNotice": "Warning: External contact.",
      "messages": [
        { "id": "m1", "sender": "contact", "text": "Hello, we noticed unauthorized sign-ins on your account.", "timestamp": "10:00 AM" },
        { "id": "m2", "sender": "contact", "text": "Please confirm your security token here:", "timestamp": "10:01 AM", "link": { "id": "l1", "text": "https://identity-verify-portal.com/auth", "url": "https://identity-verify-portal.com/auth" } }
      ]
    }
  ]
}`;

    case 'sms':
      return `${baseInstructions}
Required JSON structure for "sms":
{
  "scenarioId": "scen-sms-xxxx",
  "channel": "sms",
  "title": "Title of the attack",
  "description": "Short scenario summary",
  "category": "Smishing",
  "difficulty": "Medium",
  "initialView": "list",
  "targetId": "conv-sms-target",
  "userProfile": { "name": "Student User", "phoneNumber": "+1 (555) 012-3456" },
  "conversations": [
    {
      "id": "conv-sms-target",
      "isTarget": true,
      "sender": { "name": "Bank Fraud Alert", "phoneNumber": "+1 (833) 555-0144", "avatar": "BA", "verificationStatus": "Unverified Sender" },
      "unreadCount": 1,
      "lastActivity": "Just now",
      "carrierNotice": "SMS • Today",
      "messages": [
        { "id": "sm1", "sender": "contact", "text": "ALERT: Card charge of $540 was attempted. If not you, verify within 15 mins:", "timestamp": "11:00 AM", "link": { "id": "sl1", "text": "https://card-fraud-verification.com/alert", "url": "https://card-fraud-verification.com/alert" } }
      ]
    }
  ]
}`;

    case 'website':
      return `${baseInstructions}
Required JSON structure for "website":
{
  "scenarioId": "scen-web-xxxx",
  "channel": "website",
  "title": "Title of the attack",
  "description": "Short scenario summary",
  "category": "Website Phishing",
  "difficulty": "Medium",
  "initialPageId": "page-login",
  "targetId": "page-login",
  "browserConfig": { "siteTitle": "Portal Verification", "defaultDomain": "auth-verify-student.info", "securityStatus": "unsecured" },
  "pages": {
    "page-login": {
      "id": "page-login",
      "title": "Single Sign-On Verification",
      "url": "https://auth-verify-student.info/login",
      "layout": "login-style",
      "isTargetPhish": true,
      "blocks": [
        { "type": "heading", "level": 2, "text": "Portal Verification Required" },
        { "type": "notice", "level": "warning", "title": "Account Action Required", "text": "Session expiring." },
        { "type": "text-input", "id": "username", "label": "Username / ID", "placeholder": "Enter username" },
        { "type": "text-input", "id": "password", "label": "Passcode", "placeholder": "Enter password", "isMasked": true },
        { "type": "button", "id": "btn-submit", "label": "Proceed", "actionId": "submit_login", "targetPageId": "page-complete" }
      ]
    },
    "page-complete": {
      "id": "page-complete",
      "title": "Verification Complete",
      "url": "https://auth-verify-student.info/complete",
      "layout": "confirmation",
      "blocks": [
        { "type": "heading", "level": 2, "text": "Verification Completed" },
        { "type": "paragraph", "text": "Credentials confirmed." }
      ]
    }
  }
}`;

    default:
      return baseInstructions;
  }
}

/**
 * Invokes Groq to generate a validated scenario based on prompt & channel.
 */
export async function generateScenarioWithGroq({
  prompt,
  channel,
  hasImages = false,
  customGroqClient = null
}) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey && !customGroqClient) {
    const error = new Error('GROQ_API_KEY is not configured on the backend server.');
    error.statusCode = 503;
    throw error;
  }

  const groq = customGroqClient || new Groq({ apiKey });
  const model = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';

  const systemPrompt = getSystemPrompt(channel);
  const userContent = `Generate a realistic educational cybersecurity simulation scenario for channel "${channel}" based on this prompt: "${prompt}".`;

  let response;
  try {
    response = await groq.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 3000
    });
  } catch (err) {
    console.error('[Groq API Error]:', err.message);
    const error = new Error(`AI generation service error: ${err.message || 'Provider communication failure'}`);
    error.statusCode = err.status || 502;
    throw error;
  }

  const rawContent = response.choices?.[0]?.message?.content;
  if (!rawContent) {
    const error = new Error('Empty response received from AI model.');
    error.statusCode = 502;
    throw error;
  }

  let parsedScenario;
  try {
    parsedScenario = JSON.parse(rawContent);
  } catch (parseErr) {
    const error = new Error('Malformed JSON received from AI model.');
    error.statusCode = 422;
    throw error;
  }

  // Strict Schema Validation
  const validation = validateScenario(parsedScenario, channel);
  if (!validation.valid) {
    const error = new Error(`Generated scenario failed schema validation: ${validation.errors.join('; ')}`);
    error.statusCode = 422;
    error.validationErrors = validation.errors;
    throw error;
  }

  return {
    scenario: validation.scenario,
    modelUsed: model,
    sessionId: `sess-${channel}-${Date.now()}`,
    imageAnalysis: hasImages
      ? {
          processed: false,
          notice: `Configured model (${model}) does not support multimodal vision input. Scenario was generated from text prompt.`
        }
      : undefined
  };
}
