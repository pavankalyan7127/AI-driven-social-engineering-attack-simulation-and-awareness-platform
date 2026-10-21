import Groq from 'groq-sdk';
import { validateScenario } from '../validators/scenarioValidator.js';
import { ALLOWED_ATTACK_TYPES } from '../config/attackTaxonomy.js';
import { analyzeReferenceImages } from './imageAnalysisService.js';

/**
 * Builds unified system prompt instructing the model to predict the simulation channel,
 * classify the attack vector, generate channel-specific scenario content, and define
 * structured termination rules.
 * 
 * @param {string|null} requestedChannel
 * @returns {string}
 */
export function buildScenarioSystemPrompt(requestedChannel = null) {
  const channelInstruction = requestedChannel
    ? `Strictly generate a "${requestedChannel}" scenario. The "channel" property MUST be "${requestedChannel}".`
    : `You must automatically analyze the attack vector in the user prompt and predict the single most realistic educational simulation channel. The "channel" property MUST be exactly one of: "email", "chat", "sms", "website", "whatsapp", "instagram", "telegram", or "call".
- Use "call" (or voice call/phone call) for vishing, fraudulent phone calls, fake bank security voice calls, or voice social engineering where the user receives an incoming telephone call.
- Use "whatsapp" ONLY if the user prompt specifically mentions WhatsApp (or WhatsApp Web).
- Use "instagram" ONLY if the user prompt specifically mentions Instagram (or Insta, IG, or Instagram DM).
- Use "telegram" ONLY if the user prompt specifically mentions Telegram (or Telegram channel/chat/group/bot).
- Use "chat" for general workplace chat impersonation (Teams/Slack), fake IT helpdesk live requests, tech support scams, or MFA extraction via messaging when no specific platform like WhatsApp, Instagram, or Telegram is named.
- Use "email" for spear phishing, executive impersonation (BEC), fake security alerts, vendor invoices, or account deactivation notices delivered via email.
- Use "sms" for smishing, bank fraud alerts, package delivery text alerts, or urgent one-time verification links delivered via mobile SMS.
- Use "website" for counterfeit single sign-on (SSO) login portals, fake verification landing pages, or cloned corporate web pages.`;

  return `You are an advanced cybersecurity simulation engine generating realistic educational social engineering attack scenarios for student and corporate awareness training.

IMPORTANT RULES & CONSTRAINTS:
1. OUTPUT STRICTLY A SINGLE VALID JSON OBJECT. Do NOT include markdown codeblocks (\`\`\`json) or conversational text.
2. SYNTHETIC & EDUCATIONAL DATA: Use only fictional, synthetic data (names, domains, emails, phone numbers). Never use real credentials or actual passwords.
3. PREDICT SIMULATION CHANNEL: ${channelInstruction}
4. ATTACK CLASSIFICATION: You must classify the social engineering attack using our recognized taxonomy.
   - "attackClassification.primaryType": Choose exactly one from:
     ${JSON.stringify(ALLOWED_ATTACK_TYPES)}
   - "attackClassification.secondaryTechniques": An array containing 1-3 supporting techniques from the same list (e.g. ["impersonation", "urgency_manipulation"]).
   - "attackClassification.rationale": A concise sentence explaining why this classification fits the scenario.
5. CHANNEL-SPECIFIC SCHEMA:
   Depending on the predicted "channel", you MUST generate the corresponding structure:

   FOR "email":
   {
     "scenarioId": "scen-email-xxxx",
     "channel": "email",
     "title": "Title of attack",
     "description": "Short scenario summary",
     "category": "Spear Phishing",
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
   }

   FOR "chat", "whatsapp", "instagram", OR "telegram":
   (Set "channel" to "whatsapp", "instagram", "telegram", or "chat" matching the user's specific request or context)
   {
     "scenarioId": "scen-chat-xxxx",
     "channel": "whatsapp",
     "title": "Title of attack",
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
   }

   FOR "sms":
   {
     "scenarioId": "scen-sms-xxxx",
     "channel": "sms",
     "title": "Title of attack",
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
   }

   FOR "call":
   {
     "scenarioId": "scen-call-xxxx",
     "channel": "call",
     "title": "Title of voice call attack",
     "description": "Short scenario summary",
     "category": "Vishing",
     "difficulty": "Medium",
     "initialView": "incoming",
     "targetId": "call-target-1",
     "userProfile": { "name": "Student User", "phoneNumber": "+1 (555) 012-3456" },
     "callData": {
       "id": "call-target-1",
       "callerName": "Chase Fraud Prevention Dept",
       "callerNumber": "+1 (800) 935-9935",
       "location": "Toll Free • Likely Fraud",
       "avatar": "CF",
       "openingLine": "Hello, this is officer David from Chase Bank Fraud Prevention. We flagged two suspicious transactions of $1,250 on your account. To block these charges immediately, please confirm the 16 digits of your credit card number or 4-digit PIN.",
       "personaContext": "Aggressive, authoritative bank fraud investigator insisting that urgent confirmation of credit card number, CVV, or PIN is needed to prevent loss.",
       "targetInformation": "credit card number, CVV, or PIN",
       "fallbackResponses": [
         "Sir, if you delay, this fraudulent wire transfer will clear in 5 minutes. I need you to confirm your card number immediately.",
         "I understand your concern, but I am an authorized senior security officer. Read out the numbers on your card so we can secure your funds.",
         "This call is being recorded for security purposes. Please confirm your card details now."
       ]
     }
   }

   FOR "website":
   {
     "scenarioId": "scen-web-xxxx",
     "channel": "website",
     "title": "Title of attack",
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
   }

   WEBSITE SYNTAX & STRUCTURE RULES:
   - "pages" MUST be a JSON object mapping page IDs to page definitions.
   - Inside "pages", each page is a key-value pair, e.g.:
     "pages": {
       "page-login": { ... },
       "page-complete": { ... }
     }
     NEVER emit rogue brackets or wrap a page in a bare object like ", { 'page-complete': { ... } }".
     DO NOT close "pages" before all pages are defined.
   - Supported page layouts: "login-style", "account-verification", "generic", "confirmation", "security-warning", "delivery-tracking".
   - Supported block types: "heading", "paragraph", "notice", "alert", "text-input", "email-input", "file-input", "checkbox", "button", "simulated-link", "card", "divider", "attachment-preview".
   - Every input field MUST have a unique "id" string.
   - If a button redirects to another simulated page, its "targetPageId" MUST match an existing page key in "pages".

6. TERMINATION RULES:
   You MUST include a "terminationRules" object matching:
   {
     "version": "1.0",
     "observationWindowSeconds": 120,
     "positiveConditions": [
       {
         "id": "report_threat",
         "trigger": "event",
         "eventType": "threat_reported",
         "points": 30,
         "label": "Reported threat",
         "explanation": "User identified deceptive cues and reported the communication."
       },
       {
         "id": "ignore_after_observation",
         "trigger": "observation_window_elapsed",
         "points": 20,
         "label": "Ignored suspicious message",
         "explanation": "User did not interact with unverified links or attachments during observation."
       }
     ],
     "negativeConditions": [
       {
         "id": "malicious_link_clicked",
         "trigger": "event",
         "eventType": "simulated_link_clicked",
         "points": 25,
         "label": "Clicked simulated link",
         "explanation": "User clicked an unverified link confirmed as deceptive."
       }
     ]
   }

   RULES FOR TERMINATION CONDITIONS:
   - For "email", positive conditions can include "threat_reported", "message_deleted", "message_archived", or "safe_exit".
   - For "chat" and "sms", positive conditions can include "threat_reported", "safe_exit", or "user_blocked_sender".
   - For "website", positive conditions can include "threat_reported" or "safe_exit".
   - For "website", negative condition eventType should be "virtual_link_clicked" or "simulated_form_submitted".
   - For "call", positive conditions can include "call_rejected", "threat_reported", "user_blocked_sender", or "safe_exit" (or "call_hung_up").
   - For "call", negative condition eventType MUST be "credential_submitted" or "sensitive_info_disclosed".
   - ONLY include "simulated_form_submitted" or "credential_submitted" if the website page actually contains input fields!
   - NEVER treat opening, viewing, or reading a message ("message_opened", "conversation_opened", "virtual_page_viewed") as a negative failure condition.
   - Condition IDs must be unique strings (e.g. "report_threat", "safe_exit", "malicious_link_clicked").
   - Points must be integers between 1 and 50.
`;
}

/**
 * Repairs common LLM-produced JSON syntax defects in structured scenarios.
 * Handles:
 * 1. Markdown codeblock wrapping (```json ... ```)
 * 2. Defect Pattern A: Rogue wrapping brace before page keys, e.g.
 *    "pages": { "page-login": { ... }, { "page-complete": { ... } } }
 *    Normalized to: "pages": { "page-login": { ... }, "page-complete": { ... } }
 * 3. Defect Pattern B: Premature closing braces after block arrays, e.g.
 *    ]}}, "page-apply": { ... }
 *    Normalized to: ]}, "page-apply": { ... }
 * 4. Extra trailing braces before top-level keys:
 *    ]}}}, "attackClassification" -> ]}}, "attackClassification"
 * 5. Trailing/missing root closing braces.
 * 
 * @param {string} rawJson
 * @returns {Object|null}
 */
export function repairAndParseScenarioJson(rawJson) {
  if (!rawJson || typeof rawJson !== 'string') return null;
  let text = rawJson.trim();

  // Strip markdown code fences
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  // 1. Direct parse attempt
  try {
    return JSON.parse(text);
  } catch (_) {}

  // 2. Repair Pattern 1: premature closure of `pages`: `]}}, "page-` -> `]}, "page-`
  let repaired = text.replace(/\]\s*\}\s*\}\s*,\s*("(?:page)[^"]*"\s*:)/g, ']}, $1');

  // 3. Repair Pattern 2: rogue wrapping brace `{` before page: `}, { "page-` -> `}, "page-`
  repaired = repaired.replace(/\}\s*,\s*\{\s*("(?:page)[^"]*"\s*:)/g, '}, $1');
  repaired = repaired.replace(/,\s*\{\s*("(?:page|scen)[^"]*"\s*:)/g, ', $1');

  // Fix rogue closing brace before top-level keys if `pages` had an extra wrapper:
  repaired = repaired.replace(/\]\s*\}\s*\}\s*\}\s*,\s*("(?:attackClassification|terminationRules))/g, ']}}, $1');

  // 4. Try parsing repaired
  try {
    return JSON.parse(repaired);
  } catch (_) {}

  // 5. Balance trailing braces
  let candidate = repaired;
  for (let i = 0; i < 3; i++) {
    candidate = candidate.replace(/\}\s*$/, '');
    try {
      return JSON.parse(candidate);
    } catch (_) {}
  }

  candidate = repaired;
  for (let i = 0; i < 3; i++) {
    candidate = candidate + '}';
    try {
      return JSON.parse(candidate);
    } catch (_) {}
  }

  return null;
}

/**
 * Invokes Groq to generate a validated scenario based on prompt & optional channel.
 * Automatically predicts channel if channel is omitted.
 * 
 * @param {Object} options
 * @param {string} options.prompt - Natural language scenario prompt
 * @param {string} [options.channel] - Optional preferred channel ('email'|'chat'|'sms'|'website')
 * @param {boolean} [options.hasImages] - Flag indicating reference images were uploaded
 * @param {Object} [options.customGroqClient] - Injected client for testing
 * @param {boolean} [options.isRetry] - Internal flag preventing unbounded retries
 * @returns {Promise<Object>}
 */
export async function generateScenarioWithGroq({
  prompt,
  channel = null,
  files = [],
  hasImages = false,
  customGroqClient = null,
  isRetry = false
}) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey && !customGroqClient) {
    const error = new Error('GROQ_API_KEY is not configured on the backend server.');
    error.statusCode = 503;
    throw error;
  }

  // 1. Run OCR analysis on uploaded reference images if provided
  let imageAnalysis = null;
  const imageFiles = Array.isArray(files) ? files : [];
  if (imageFiles.length > 0) {
    try {
      imageAnalysis = await analyzeReferenceImages(imageFiles);
    } catch (analysisErr) {
      console.warn('[Image Analysis Service Error]:', analysisErr.message);
    }
  }

  const groq = customGroqClient || new Groq({ apiKey });
  const model = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';

  const systemPrompt = buildScenarioSystemPrompt(channel);

  // Build user content, augmenting with OCR extracted text and branding
  let referenceContext = '';
  if (imageAnalysis?.processed && imageAnalysis.fullExtractedText) {
    referenceContext = `\n\n--- REFERENCE SCREENSHOT OCR ANALYSIS ---
The user provided ${imageAnalysis.imageCount} reference screenshot(s). OCR extracted the following elements from the image:
- Target Entity/Brand: ${imageAnalysis.detectedBrand}
- Threat Indicators: ${imageAnalysis.detectedTactics.join(', ')}
${imageAnalysis.detectedUrls.length ? `- Visible URLs/Links: ${imageAnalysis.detectedUrls.join(', ')}` : ''}
${imageAnalysis.detectedEmails.length ? `- Visible Senders/Emails: ${imageAnalysis.detectedEmails.join(', ')}` : ''}
${imageAnalysis.detectedPhones.length ? `- Visible Phone Numbers: ${imageAnalysis.detectedPhones.join(', ')}` : ''}
- Exact Extracted Text from Image:
"""
${imageAnalysis.fullExtractedText}
"""
INSTRUCTION: Faithfully replicate the visual context, brand styling, sender persona, urgent pretext, and text content extracted from the reference image into the generated scenario JSON schema.`;
  }

  const userContent = (channel
    ? `Generate a realistic educational cybersecurity simulation scenario for channel "${channel}" based on this prompt: "${prompt}".`
    : `Analyze this scenario prompt, predict the best simulation channel, classify the attack, and generate the complete educational scenario JSON: "${prompt}".`
  ) + referenceContext;

  let response;
  let rawContent = null;

  try {
    response = await groq.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ],
      response_format: { type: 'json_object' },
      temperature: isRetry ? 0.1 : 0.2,
      max_tokens: 3500
    });
    rawContent = response.choices?.[0]?.message?.content;
  } catch (err) {
    if (err.statusCode === 503 || err.status === 503 || err.message?.includes('GROQ_API_KEY')) {
      const error = new Error('GROQ_API_KEY is not configured on the backend server.');
      error.statusCode = 503;
      throw error;
    }

    const isValidationFailure =
      err.status === 400 &&
      (err.error?.code === 'json_validate_failed' || (err.message && err.message.includes('failed_generation')));

    // Inspect if provider returned json_validate_failed with failed_generation
    let failedGen = err.error?.failed_generation;
    if (!failedGen && err.message && err.message.includes('"failed_generation":')) {
      try {
        const jsonMatch = err.message.match(/\{"error":.*\}/);
        if (jsonMatch) {
          const parsedErr = JSON.parse(jsonMatch[0]);
          failedGen = parsedErr.error?.failed_generation;
        }
      } catch (_) {}
    }

    if (failedGen) {
      console.warn('[Groq Service]: Provider rejected raw JSON with json_validate_failed. Attempting schema repair on failed_generation payload...');
      const repaired = repairAndParseScenarioJson(failedGen);
      if (repaired) {
        const validation = validateScenario(repaired, channel);
        if (validation.valid) {
          console.log('[Groq Service]: Successfully repaired and validated scenario from failed_generation payload.');
          return {
            scenario: validation.scenario,
            modelUsed: model,
            sessionId: `sess-${validation.scenario.channel}-${Date.now()}`,
            imageAnalysis: imageAnalysis || (hasImages
              ? {
                  processed: false,
                  notice: `No legible text was found in the uploaded reference images.`
                }
              : undefined)
          };
        }
      }
    }

    // Only retry for validation failure, NOT for generic provider / network / rate limit errors
    if (isValidationFailure && !isRetry) {
      console.warn('[Groq Service]: Generation failed initial JSON validation. Executing single retry with lowered temperature...');
      try {
        return await generateScenarioWithGroq({
          prompt,
          channel,
          hasImages,
          customGroqClient: groq,
          isRetry: true
        });
      } catch (retryErr) {
        // Fall through to controlled error reporting
      }
    }

    console.error('[Groq Diagnostics]:', {
      stage: 'provider_completion',
      channel,
      status: err.status || 502,
      code: err.error?.code || 'generation_error',
      message: err.error?.message || err.message
    });

    const channelLabel = channel ? channel.charAt(0).toUpperCase() + channel.slice(1) : 'Website';
    const safeMessage = isValidationFailure
      ? `${channelLabel} scenario generation failed validation. Please retry.`
      : `AI generation service error: ${err.message || 'Provider communication failure'}`;

    const error = new Error(safeMessage);
    error.statusCode = isValidationFailure ? 422 : (err.status || 502);
    throw error;
  }

  if (!rawContent) {
    const error = new Error('Empty response received from AI model.');
    error.statusCode = 502;
    throw error;
  }

  let parsedScenario = repairAndParseScenarioJson(rawContent);
  if (!parsedScenario) {
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

  const validatedScenario = validation.scenario;
  const determinedChannel = validatedScenario.channel;

  return {
    scenario: validatedScenario,
    modelUsed: model,
    sessionId: `sess-${determinedChannel}-${Date.now()}`,
    imageAnalysis: imageAnalysis || (hasImages
      ? {
          processed: false,
          notice: 'No legible text was found in the uploaded reference images.'
        }
      : undefined)
  };
}

/**
 * Fallback response analyzer when Groq API key is absent or network fails
 */
function fallbackCallResponse(userSpeech, targetInformation) {
  const text = (userSpeech || '').toLowerCase();
  
  // Heuristic sensitive info check: credit card patterns (12-19 digits, spaced or dashed),
  // 3-4 digit PIN/CVV patterns, or explicit verbal disclosure
  const hasDigitSequence = /\b(?:\d[ -]*?){4,16}\b/.test(text);
  const mentionsDisclosure =
    text.includes('card number is') ||
    text.includes('my card is') ||
    text.includes('my pin is') ||
    text.includes('pin is') ||
    text.includes('cvv is') ||
    text.includes('digits are') ||
    text.includes('password is') ||
    text.includes('code is');

  const sensitiveInfoDisclosed = hasDigitSequence || mentionsDisclosure;

  if (sensitiveInfoDisclosed) {
    return {
      attackerSpeech: "Thank you. Your credentials have been received and verified. The fraud hold on your card is being processed now.",
      sensitiveInfoDisclosed: true,
      explanation: "User disclosed numbers or card credential details during the call."
    };
  }

  // Refusal or evasion patterns
  if (text.includes("can't") || text.includes('cannot') || text.includes('won\'t') || text.includes('refuse') || text.includes('no') || text.includes('fake') || text.includes('scam')) {
    return {
      attackerSpeech: `Sir, this is an official security alert. If you do not verify your ${targetInformation} right now, we will be forced to permanently freeze your banking privileges.`,
      sensitiveInfoDisclosed: false,
      explanation: "User resisted or questioned caller authority."
    };
  }

  return {
    attackerSpeech: `I understand your hesitation, but we have unauthorized international transactions pending. I need you to confirm your ${targetInformation} so we can safeguard your account.`,
    sensitiveInfoDisclosed: false,
    explanation: "Caller maintained pressure to extract credentials."
  };
}

/**
 * Generates dynamic voice attacker response during an active phone call simulation.
 * Performs real-time conversational pressure and checks for sensitive credential leakage.
 * 
 * @param {Object} params
 * @returns {Promise<{ attackerSpeech: string, sensitiveInfoDisclosed: boolean, explanation: string }>}
 */
export async function generateCallAttackerResponse({
  userSpeech,
  dialogueHistory = [],
  callerName = 'Bank Security Agent',
  personaContext = 'Authoritative fraud caller',
  targetInformation = 'credit card number, CVV, or PIN'
}) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return fallbackCallResponse(userSpeech, targetInformation);
  }

  const groq = new Groq({ apiKey });

  const historyPrompt = Array.isArray(dialogueHistory) && dialogueHistory.length > 0
    ? dialogueHistory.map(h => `${h.sender === 'user' ? 'User' : 'Caller'}: "${h.text}"`).join('\n')
    : '(Call just started)';

  const systemPrompt = `You are a social engineering attacker conducting a realistic telephone voice phishing (vishing) simulation for cybersecurity awareness training.
Your identity/caller name: "${callerName}".
Your persona: ${personaContext}.
Your goal: Convince the user to state their ${targetInformation}.

Previous conversation turns:
${historyPrompt}

The user just spoke: "${userSpeech}".

CRITICAL INSTRUCTIONS:
1. Did the user state or reveal sensitive credential numbers (such as credit card digits, CVV, 4-digit PIN, OTP, or password)?
   - If YES (e.g. they read numbers, or said "my card is 4...", "PIN is 1234"), set "sensitiveInfoDisclosed": true.
   - If NO (e.g. they refused, hesitated, asked questions, said "I can't", or said "Who is this?"), set "sensitiveInfoDisclosed": false.
2. In "attackerSpeech", reply with 1 to 2 spoken sentences MAXIMUM:
   - If they refused or hesitated: stay firmly in character, escalate urgency, explain why failure to verify will cause account lock or monetary loss, and firmly demand the ${targetInformation}.
   - If they disclosed the info: pretend the issue is resolved with fake reassurance (e.g., "Thank you, your verification is confirmed and your account is protected. Goodbye.").
3. Respond ONLY with a valid JSON object matching:
{
  "attackerSpeech": "spoken response text",
  "sensitiveInfoDisclosed": boolean,
  "explanation": "brief reason why"
}`;

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'system', content: systemPrompt }],
      temperature: 0.6,
      max_completion_tokens: 200,
      response_format: { type: 'json_object' }
    });

    const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
    return {
      attackerSpeech: parsed.attackerSpeech || "I need you to verify your card details immediately to halt these transactions.",
      sensitiveInfoDisclosed: Boolean(parsed.sensitiveInfoDisclosed),
      explanation: parsed.explanation || ''
    };
  } catch (err) {
    console.warn('[Groq Call Response Warning]: Falling back to local analyzer.', err.message);
    return fallbackCallResponse(userSpeech, targetInformation);
  }
}
