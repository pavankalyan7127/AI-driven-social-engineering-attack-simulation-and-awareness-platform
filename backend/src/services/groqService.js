import Groq, { toFile } from 'groq-sdk';
import { validateScenario } from '../validators/scenarioValidator.js';
import { ALLOWED_ATTACK_TYPES } from '../config/attackTaxonomy.js';
import { analyzeReferenceImages } from './imageAnalysisService.js';

/**
 * Detects the language of user prompt or maps requested language code to a full language name.
 * 
 * @param {string} text - User prompt text
 * @param {string} requestedLang - Optional requested language code (e.g. 'ta', 'te', 'hi', 'en', 'auto')
 * @returns {string} Detected language name (e.g. 'Tamil', 'Telugu', 'Hindi', 'English')
 */
export function detectLanguage(text = '', requestedLang = 'auto') {
  if (requestedLang && requestedLang !== 'auto') {
    const langMap = {
      ta: 'Tamil',
      te: 'Telugu',
      hi: 'Hindi',
      kn: 'Kannada',
      ml: 'Malayalam',
      bn: 'Bengali',
      mr: 'Marathi',
      en: 'English'
    };
    return langMap[requestedLang.toLowerCase()] || requestedLang;
  }

  // Detect script from Unicode ranges
  if (/[\u0B80-\u0BFF]/.test(text)) return 'Tamil';
  if (/[\u0C00-\u0C7F]/.test(text)) return 'Telugu';
  if (/[\u0900-\u097F]/.test(text)) return 'Hindi';
  if (/[\u0C80-\u0CFF]/.test(text)) return 'Kannada';
  if (/[\u0D00-\u0D7F]/.test(text)) return 'Malayalam';
  if (/[\u0980-\u09FF]/.test(text)) return 'Bengali';

  // Detect explicit keyword mentions
  const lower = text.toLowerCase();
  if (/\b(?:in\s+tamil|tamil\s+language|in\s+tamizh)\b/i.test(lower)) return 'Tamil';
  if (/\b(?:in\s+telugu|telugu\s+language)\b/i.test(lower)) return 'Telugu';
  if (/\b(?:in\s+hindi|hindi\s+language)\b/i.test(lower)) return 'Hindi';
  if (/\b(?:in\s+kannada|kannada\s+language)\b/i.test(lower)) return 'Kannada';
  if (/\b(?:in\s+malayalam|malayalam\s+language)\b/i.test(lower)) return 'Malayalam';

  return 'English';
}

/**
 * Builds unified system prompt instructing the model to predict the simulation channel,
 * classify the attack vector, generate channel-specific scenario content, and define
 * structured termination rules.
 * 
 * @param {string|null} requestedChannel
 * @param {string|null} language
 * @returns {string}
 */
export function buildScenarioSystemPrompt(requestedChannel = null, language = null) {
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

6. MULTILINGUAL OUTPUT INSTRUCTIONS:
${(language && language !== 'English')
  ? `The user explicitly requested this simulation scenario in "${language}". You MUST generate ALL user-facing text (email subject, body text, preview, chat/SMS messages, website headings, paragraphs, form labels, placeholder text, and caller speech) in authentic, natural ${language} using native ${language} script.
CRITICAL CONSTRAINT: All JSON property names and structural keys (e.g. "scenarioId", "channel", "title", "subject", "body", "text", "type", "id", "sender", "recipient", "options", "terminationRules", "attackClassification") MUST remain strictly in English ASCII so the simulator runtime operates seamlessly. Only translate the human-readable text values.`
  : `If the user prompt is written in or requests an Indian regional language (such as Tamil, Telugu, Hindi, Kannada, Malayalam, Bengali, etc.), you MUST generate all human-facing attack content (email subject/body, chat/SMS messages, website content, caller speech) in that EXACT language and script. All JSON keys MUST remain strictly in English.`}

7. REALISM RULE FOR CONTACT AND SENDER NAMES:
   NEVER append spoiler or meta labels like "(Impersonator)", "(Attacker)", "(Scammer)", "(Fake)", "(Phishing)" to contactName, sender.name, or callerName! Real chat apps and caller displays (WhatsApp, Instagram, Telegram, SMS, phone calls) display authentic real-world names (e.g. "Surya", "David Miller", "+91 98401 22334"), NEVER a giveaway spoiler tag.
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
  language = 'auto',
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

  // Detect language if 'auto' or map requested language code
  const effectiveLang = detectLanguage(prompt, language);

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

  const systemPrompt = buildScenarioSystemPrompt(channel, effectiveLang);

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

  let userContent = (channel
    ? `Generate a realistic educational cybersecurity simulation scenario for channel "${channel}" based on this prompt: "${prompt}".`
    : `Analyze this scenario prompt, predict the best simulation channel, classify the attack, and generate the complete educational scenario JSON: "${prompt}".`
  ) + referenceContext;

  if (effectiveLang && effectiveLang !== 'English') {
    userContent += `\n\nCRITICAL LANGUAGE REQUIREMENT: The scenario MUST be written in ${effectiveLang} (using native ${effectiveLang} script). Keep all JSON keys strictly in English.`;
  }

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
          if (effectiveLang && !validation.scenario.language) {
            validation.scenario.language = effectiveLang;
          }
          return {
            scenario: validation.scenario,
            modelUsed: model,
            language: effectiveLang,
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
          language,
          files,
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

  if (effectiveLang && !validatedScenario.language) {
    validatedScenario.language = effectiveLang;
  }

  return {
    scenario: validatedScenario,
    modelUsed: model,
    language: effectiveLang,
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
function fallbackCallResponse(userSpeech, targetInformation, effectiveLang = 'English') {
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
    text.includes('code is') ||
    text.includes('கடவுச்சொல்') ||
    text.includes('எண்') ||
    text.includes('பின்') ||
    text.includes('పాస్‌వర్డ్') ||
    text.includes('పిన్') ||
    text.includes('पासवर्ड') ||
    text.includes('पिन');

  const sensitiveInfoDisclosed = hasDigitSequence || mentionsDisclosure;

  if (sensitiveInfoDisclosed) {
    let attackerSpeech = "Thank you. Your credentials have been received and verified. The fraud hold on your card is being processed now.";
    if (effectiveLang === 'Tamil') {
      attackerSpeech = "நன்றி. உங்கள் விவரங்கள் சரிபார்க்கப்பட்டுவிட்டன. உங்கள் கணக்கு மீதான மோசடி தடுப்பு நடவடிக்கை முடிந்தது. வணக்கம்.";
    } else if (effectiveLang === 'Telugu') {
      attackerSpeech = "ధన్యవాదాలు. మీ ఆధారాలు ధృవీకరించబడ్డాయి. మీ ఖాతా ఇప్పుడు రక్షించబడింది.";
    } else if (effectiveLang === 'Hindi') {
      attackerSpeech = "धन्यवाद। आपके विवरण सत्यापित हो चुके हैं। आपका खाता अब सुरक्षित है।";
    }

    return {
      attackerSpeech,
      sensitiveInfoDisclosed: true,
      explanation: "User disclosed numbers or card credential details during the call."
    };
  }

  // Refusal or evasion patterns
  const isRefusal =
    text.includes("can't") || text.includes('cannot') || text.includes("won't") || text.includes('refuse') || text.includes('no') || text.includes('fake') || text.includes('scam') ||
    text.includes('முடியாது') || text.includes('போலி') || text.includes('மோசடி') || text.includes('மாட்டேன்') ||
    text.includes('వీలుకాదు') || text.includes('నకిలీ') || text.includes('మోసం') ||
    text.includes('नहीं') || text.includes('धोखा') || text.includes('नकली');

  if (isRefusal) {
    let attackerSpeech = `Sir, this is an official security alert. If you do not verify your ${targetInformation} right now, we will be forced to permanently freeze your banking privileges.`;
    if (effectiveLang === 'Tamil') {
      attackerSpeech = `சார், இது அவசர அதிகாரப்பூர்வ பாதுகாப்பு எச்சரிக்கை. உங்கள் ${targetInformation} விவரங்களை இப்போது சரிபார்க்கவில்லை என்றால் உங்கள் கணக்கு நிரந்தரமாக முடக்கப்படும்.`;
    } else if (effectiveLang === 'Telugu') {
      attackerSpeech = `సర్, ఇది అధికారిక భద్రతా హెచ్చరిక. మీరు ఇప్పుడే మీ ${targetInformation} ని ధృవీకరించకపోతే మీ ఖాతా శాశ్వతంగా స్తంభింపజేయబడుతుంది.`;
    } else if (effectiveLang === 'Hindi') {
      attackerSpeech = `सर, यह एक आधिकारिक सुरक्षा चेतावनी है। यदि आप अभी अपना ${targetInformation} सत्यापित नहीं करते हैं, तो आपका खाता ब्लॉक कर दिया जाएगा।`;
    }

    return {
      attackerSpeech,
      sensitiveInfoDisclosed: false,
      explanation: "User resisted or questioned caller authority."
    };
  }

  let attackerSpeech = `I understand your hesitation, but we have unauthorized international transactions pending. I need you to confirm your ${targetInformation} so we can safeguard your account.`;
  if (effectiveLang === 'Tamil') {
    attackerSpeech = `உங்கள் தயக்கம் புரிகிறது, ஆனால் உங்கள் கணக்கில் சந்தேகத்திற்குரிய பரிவர்த்தனைகள் நடக்கின்றன. கணக்கை பாதுகாக்க உடனடியாக உங்கள் ${targetInformation} விவரங்களை உறுதிப்படுத்தவும்.`;
  } else if (effectiveLang === 'Telugu') {
    attackerSpeech = `మీ సంకోచం అర్థమైంది, కానీ అనధికారిక లావాదేవీలను ఆపడానికి వెంటనే మీ ${targetInformation} ని నిర్ధారించండి.`;
  } else if (effectiveLang === 'Hindi') {
    attackerSpeech = `आपकी झिझक समझ में आती है, लेकिन धोखाधड़ी रोकने के लिए तुरंत अपना ${targetInformation} सत्यापित करें।`;
  }

  return {
    attackerSpeech,
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
  targetInformation = 'credit card number, CVV, or PIN',
  language = 'auto'
}) {
  const apiKey = process.env.GROQ_API_KEY;

  // Detect effective language from language parameter or conversational context
  let effectiveLang = (language && language !== 'auto') ? language : null;
  if (!effectiveLang) {
    const combinedHistory = dialogueHistory.map(h => h.text || '').join(' ');
    const allContext = `${userSpeech} ${callerName} ${personaContext} ${combinedHistory}`;
    if (/[\u0B80-\u0BFF]/.test(allContext) || /tamil/i.test(allContext)) {
      effectiveLang = 'Tamil';
    } else if (/[\u0C00-\u0C7F]/.test(allContext) || /telugu/i.test(allContext)) {
      effectiveLang = 'Telugu';
    } else if (/[\u0900-\u097F]/.test(allContext) || /hindi/i.test(allContext)) {
      effectiveLang = 'Hindi';
    } else if (/[\u0C80-\u0CFF]/.test(allContext) || /kannada/i.test(allContext)) {
      effectiveLang = 'Kannada';
    } else if (/[\u0D00-\u0D7F]/.test(allContext) || /malayalam/i.test(allContext)) {
      effectiveLang = 'Malayalam';
    } else {
      effectiveLang = 'English';
    }
  }

  if (!apiKey) {
    return fallbackCallResponse(userSpeech, targetInformation, effectiveLang);
  }

  const groq = new Groq({ apiKey });
  const model = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';

  const historyPrompt = Array.isArray(dialogueHistory) && dialogueHistory.length > 0
    ? dialogueHistory.map(h => `${h.sender === 'user' ? 'User' : 'Caller'}: "${h.text}"`).join('\n')
    : '(Call just started)';

  const languageDirective = (effectiveLang && effectiveLang !== 'English')
    ? `\nCRITICAL LANGUAGE INSTRUCTION: You MUST speak strictly in ${effectiveLang} (using native ${effectiveLang} script). The entire "attackerSpeech" must be authentic, natural ${effectiveLang}. Do NOT respond in English under any circumstance.`
    : '';

  const systemPrompt = `You are a social engineering attacker conducting a realistic telephone voice phishing (vishing) simulation for cybersecurity awareness training.
Your identity/caller name: "${callerName}".
Your persona: ${personaContext}.
Your goal: Convince the user to state their ${targetInformation}.${languageDirective}

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
   - You MUST generate "attackerSpeech" strictly in ${effectiveLang || 'English'} (using native script).
3. Respond ONLY with a valid JSON object matching:
{
  "attackerSpeech": "spoken response text in ${effectiveLang || 'English'}",
  "sensitiveInfoDisclosed": boolean,
  "explanation": "brief reason why"
}`;

  try {
    const completion = await groq.chat.completions.create({
      model,
      messages: [{ role: 'system', content: systemPrompt }],
      temperature: 0.3,
      max_tokens: 300,
      response_format: { type: 'json_object' }
    });

    const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
    return {
      attackerSpeech: parsed.attackerSpeech || fallbackCallResponse(userSpeech, targetInformation, effectiveLang).attackerSpeech,
      sensitiveInfoDisclosed: Boolean(parsed.sensitiveInfoDisclosed),
      explanation: parsed.explanation || ''
    };
  } catch (err) {
    console.warn('[Groq Call Response Warning]: Falling back to local analyzer.', err.message);
    return fallbackCallResponse(userSpeech, targetInformation, effectiveLang);
  }
}

/**
 * Fallback evaluator for email replies when Groq API key is absent or network fails
 */
export function fallbackEmailReplyEvaluation(replyContent = '') {
  const text = (replyContent || '').toLowerCase().trim();

  // 1. Positive termination: confronting attack, reporting, security policy, refusing credentials
  const positivePatterns = [
    /\b(?:phish|phishing|scam|scammer|fraud|fake|spoof|spoofed|malicious|hacker)\b/i,
    /\b(?:reporting|report.*security|report.*it|security.*team|alert.*admin|it.*admin)\b/i,
    /\b(?:never.*password|not.*clicking|suspicious|unauthorized|who.*are.*you.*really)\b/i,
    /\b(?:do.*not.*trust|external.*domain|verify.*directly|it.*policy|won't.*comply)\b/i,
    // Tamil
    /(?:மோசடி|ஃபிஷிங்|போலி|புகார்|பாதுகாப்பு)/i,
    // Telugu
    /(?:మోసం|ఫిషింగ్|నకిలీ|ఫిర్యాదు|భద్రత)/i,
    // Hindi
    /(?:धोखा|फ़िशिंग|नकली|शिकायत|सुरक्षा)/i
  ];

  for (const pattern of positivePatterns) {
    if (pattern.test(text)) {
      return {
        decision: 'positive_termination',
        explanation: 'User recognized suspicious indicators and challenged or reported the phishing email.',
        confidence: 0.95
      };
    }
  }

  // 2. Negative termination: submitting credentials, OTPs, PINs, passwords, or total compliance
  const negativePatterns = [
    /\b(?:password.*is|pin.*is|cvv.*is|ssn.*is|my.*password|here.*is.*my.*credentials)\b/i,
    /\b(?:one-time.*code|otp.*is|verification.*code.*is|\b\d{4,8}\b.*(?:code|otp|pin))\b/i,
    /\b(?:please.*don'?t.*delete|transferred.*the.*money|here.*are.*my.*details|sent.*the.*payment)\b/i,
    /\b(?:my.*username.*and.*password|login.*is|card.*number.*is)\b/i,
    // Tamil
    /(?:கடவுச்சொல்|பின்|ஓடிபி|எனது கடவுச்சொல்)/i,
    // Telugu
    /(?:పాస్‌వర్డ్|పిన్|ఓటీపీ|నా పాస్‌వర్డ్)/i,
    // Hindi
    /(?:पासवर्ड|पिन|ओटीपी|मेरा पासवर्ड)/i
  ];

  for (const pattern of negativePatterns) {
    if (pattern.test(text)) {
      return {
        decision: 'negative_termination',
        explanation: 'User complied with the attack and disclosed sensitive credentials or authorization details.',
        confidence: 0.95
      };
    }
  }

  // 3. Continue simulation: neutral, casual, ambiguous, or conversational
  return {
    decision: 'continue_simulation',
    explanation: 'User reply is ambiguous or conversational. Allowing simulation to continue.',
    confidence: 0.85
  };
}

/**
 * Evaluates whether an email reply in a simulation represents:
 * - 'positive_termination': user challenged or reported the malicious email.
 * - 'negative_termination': user complied or disclosed sensitive credentials.
 * - 'continue_simulation': user's reply is ambiguous/conversational; let simulation continue.
 */
export async function evaluateEmailReplyWithGroq({
  replyContent,
  emailSubject = '',
  emailBody = '',
  sender = {},
  scenarioContext = '',
  customGroqClient = null
}) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey && !customGroqClient) {
    return fallbackEmailReplyEvaluation(replyContent);
  }

  const groq = customGroqClient || new Groq({ apiKey });
  const model = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';

  const senderStr = typeof sender === 'string'
    ? sender
    : `${sender?.name || ''} <${sender?.email || ''}>`.trim();

  const systemPrompt = `You are a strict cybersecurity evaluation engine analyzing a user's reply to a suspicious social engineering / phishing email in an educational simulation.

Context of the suspicious email:
- Sender: "${senderStr}"
- Subject: "${emailSubject}"
- Email Body / Attack Pretext: "${String(emailBody).slice(0, 500)}"
- Scenario Pretext: "${scenarioContext}"

The user replied with:
"""
${replyContent}
"""

Strictly evaluate the reply and choose EXACTLY ONE of the following 3 decisions:
1. "positive_termination": The user recognized or suspected the attack, challenged the sender's identity, stated they are reporting it, refused to comply with credential/financial requests, or cited security policy.
2. "negative_termination": The user succumbed to the attack, provided requested credentials, OTP, passwords, personal data, or agreed to execute dangerous instructions.
3. "continue_simulation": The user's reply is neutral, casual, ambiguous, seeking generic clarification, or not a decisive defense or compromise. The simulation should continue without terminating.

Respond ONLY with a valid JSON object matching:
{
  "decision": "positive_termination" | "negative_termination" | "continue_simulation",
  "explanation": "Concise 1-2 sentence explanation of why this decision was chosen",
  "confidence": 0.0 to 1.0
}`;

  try {
    const completion = await groq.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Classify this email reply: "${replyContent}"` }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 300
    });

    const content = completion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);

    const validDecisions = ['positive_termination', 'negative_termination', 'continue_simulation'];
    let decision = (parsed?.decision || '').toLowerCase().trim();

    if (!validDecisions.includes(decision)) {
      if (decision.includes('positive')) decision = 'positive_termination';
      else if (decision.includes('negative')) decision = 'negative_termination';
      else decision = 'continue_simulation';
    }

    return {
      decision,
      explanation: parsed?.explanation || `Reply evaluated as ${decision}.`,
      confidence: typeof parsed?.confidence === 'number' ? parsed.confidence : 0.95
    };
  } catch (err) {
    console.warn('[Groq Email Reply Eval Warning]: Falling back to local analyzer.', err.message);
    return fallbackEmailReplyEvaluation(replyContent);
  }
}

/**
 * Fallback response analyzer for chat/sms simulation turns when Groq is unavailable.
 */
export function fallbackChatResponse({
  userMessage = '',
  targetInformation = 'credentials or verification link',
  effectiveLang = 'English'
}) {
  const text = (userMessage || '').toLowerCase();

  // Heuristic check for disclosed credentials/secrets:
  // credit card patterns, 4-8 digit OTP patterns, or explicit disclosures
  const hasDigitSequence = /\b(?:\d[ -]*?){4,16}\b/.test(text);
  const mentionsDisclosure =
    text.includes('password is') ||
    text.includes('my password') ||
    text.includes('pin is') ||
    text.includes('my pin') ||
    text.includes('otp is') ||
    text.includes('my otp') ||
    text.includes('cvv is') ||
    text.includes('code is') ||
    text.includes('here is my') ||
    text.includes('here you go') ||
    text.includes('கடவுச்சொல்') ||
    text.includes('ஓடிபி') ||
    text.includes('பின்') ||
    text.includes('பாస్‌వర్డ్') ||
    text.includes('ఓటీపీ') ||
    text.includes('పిన్') ||
    text.includes('पासवर्ड') ||
    text.includes('ओटीपी') ||
    text.includes('पिन');

  const sensitiveInfoDisclosed = hasDigitSequence || mentionsDisclosure;

  // Compliance / Capitulation check (e.g. agreeing to click link, do whatever attacker says)
  const compliancePatterns = [
    /\b(?:i'?ll|i\s+will|going\s+to|am\s+going\s+to|let\s+me)\s+(?:click|open|visit|follow)\s+(?:the|this|that|your)?\s*(?:link|url|website|site|portal)\b/i,
    /\b(?:click(?:ing)?|tap(?:ping)?)\s+(?:the|this|that|your)?\s*(?:link|url|website|site|portal)\b/i,
    /\b(?:okay|ok|sure|fine|alright|yes)\s*,?\s*(?:i'?ll|i\s+will|let\s+me)?\s*(?:do\s+whatever\s+you\s+say|click|follow|do\s+it|comply|send\s+it)\b/i,
    /\b(?:do\s+whatever\s+you\s+say|as\s+you\s+say|doing\s+it\s+now|doing\s+as\s+you\s+said|i\s+will\s+do\s+whatever\s+you\s+say)\b/i,
    // Tamil
    /(?:இணைப்பை\s*கிளிக்|லிங்க்\s*கிளிக்|லிங்கை\s*கிளிக்|சொல்வதை\s*செய்கிறேன்|கிளிக்\s*செய்கிறேன்|செய்துவிடுகிறேன்)/i,
    // Telugu
    /(?:లింక్\s*క్లిక్|మీరు\s*చెప్పినట్లే\s*చేస్తాను|క్లిక్\s*చేస్తాను|చేస్తున్నాను)/i,
    // Hindi
    /(?:लिंक\s*पर\s*क्लिक|जैसा\s*आप\s*कहें|क्लिक\s*कर\s*रहा\s*हूँ|कर\s*देता\s*हूँ)/i
  ];
  const isCompliance = compliancePatterns.some((pattern) => pattern.test(text));

  if (sensitiveInfoDisclosed || isCompliance) {
    let reply = isCompliance
      ? "Thank you. Proceed immediately with the instructions in the link to complete verification."
      : "Thank you. Your verification details have been received and recorded. Your account status is being processed.";
    if (effectiveLang === 'Tamil') {
      reply = isCompliance
        ? "நன்றி. சரிபார்ப்பை முடிக்க உடனடியாக அந்த இணைப்பின் வழிகாட்டுதலைப் பின்பற்றவும்."
        : "நன்றி. உங்கள் சரிபார்ப்பு விவரங்கள் பெறப்பட்டு பதிவு செய்யப்பட்டுள்ளன. உங்கள் கணக்கு நிலை புதுப்பிக்கப்படுகிறது.";
    } else if (effectiveLang === 'Telugu') {
      reply = isCompliance
        ? "ధన్యవాదాలు. ధృవీకరణను పూర్తి చేయడానికి వెంటనే లింక్ సూచనలను అనుసరించండి."
        : "ధన్యవాదాలు. మీ ధృవీకరణ వివరాలు స్వీకరించబడ్డాయి మరియు నమోదు చేయబడ్డాయి.";
    } else if (effectiveLang === 'Hindi') {
      reply = isCompliance
        ? "धन्यवाद। सत्यापन पूरा करने के लिए तुरंत दिए गए लिंक पर आगे बढ़ें।"
        : "धन्यवाद। आपके सत्यापन विवरण प्राप्त और दर्ज कर लिए गए हैं।";
    }

    return {
      reply,
      sensitiveInfoDisclosed: true,
      isNegativeTermination: true,
      explanation: isCompliance
        ? "User agreed to comply with attacker demands or click malicious link in chat."
        : "User disclosed sensitive credentials, PIN, or OTP in chat."
    };
  }

  // Refusal or skepticism check
  const isSkeptic =
    text.includes('who are you') || text.includes('scam') || text.includes('fake') || text.includes('no') ||
    text.includes("can't") || text.includes('cannot') || text.includes('proof') || text.includes('why') ||
    text.includes('யார்') || text.includes('போலி') || text.includes('மோசடி') || text.includes('முடியாது') ||
    text.includes('ఎవరు') || text.includes('నకిలీ') || text.includes('మోసం') ||
    text.includes('कौन') || text.includes('धोखा') || text.includes('नकली');

  if (isSkeptic) {
    let reply = `This is an urgent security measure from IT operations. If you do not verify your ${targetInformation} immediately, your account will be suspended within 15 minutes.`;
    if (effectiveLang === 'Tamil') {
      reply = `இது தகவல் தொழில்நுட்ப பிரிவின் அவசர பாதுகாப்பு நடவடிக்கை. உங்கள் ${targetInformation} விவரங்களை உடனடியாக உறுதிப்படுத்தவில்லை என்றால் உங்கள் கணக்கு 15 நிமிடங்களில் முடக்கப்படும்.`;
    } else if (effectiveLang === 'Telugu') {
      reply = `ఇది ఐటీ విభాగం నుండి అత్యవసర భద్రతా చర్య. మీ ${targetInformation} వివరాలను వెంటనే నిర్ధారించకపోతే మీ ఖాతా 15 నిమిషాల్లో స్తంభింపజేయబడుతుంది.`;
    } else if (effectiveLang === 'Hindi') {
      reply = `यह आईटी संचालन से एक आपातकालीन सुरक्षा उपाय है। यदि आप अभी अपने ${targetInformation} की पुष्टि नहीं करते हैं, तो आपका खाता 15 मिनट में निलंबित कर दिया जाएगा।`;
    }

    return {
      reply,
      sensitiveInfoDisclosed: false,
      isNegativeTermination: false,
      explanation: "Attacker reinforced urgency and pretext against user skepticism."
    };
  }

  let reply = `Please confirm your ${targetInformation} or click the secure link to prevent any service disruption.`;
  if (effectiveLang === 'Tamil') {
    reply = `சேவை தடைபடாமல் இருக்க தயவுசெய்து உங்கள் ${targetInformation} விவரங்களை உறுதிப்படுத்தவும் அல்லது வழங்கப்பட்ட இணைப்பை கிளிக் செய்யவும்.`;
  } else if (effectiveLang === 'Telugu') {
    reply = `సేవలకు అంతరాయం కలగకుండా ఉండటానికి దయచేసి మీ ${targetInformation} ని నిర్ధారించండి లేదా అందించిన లింక్‌ను క్లిక్ చేయండి.`;
  } else if (effectiveLang === 'Hindi') {
    reply = `किसी भी सेवा में रुकावट से बचने के लिए कृपया अपने ${targetInformation} की पुष्टि करें या सुरक्षित लिंक पर क्लिक करें।`;
  }

  return {
    reply,
    sensitiveInfoDisclosed: false,
    isNegativeTermination: false,
    explanation: "Attacker prompted user to take action."
  };
}

/**
 * Generates dynamic chat attacker responses for chat, sms, whatsapp, instagram, and telegram.
 * Evaluates in real-time whether the user has revealed secret info (negative termination).
 */
export async function generateChatAttackerResponse({
  userMessage,
  channel = 'chat',
  dialogueHistory = [],
  contactName = 'Support Agent',
  personaContext = 'Support agent requesting immediate action',
  scenarioContext = '',
  targetInformation = 'credentials or verification link',
  language = 'auto',
  customGroqClient = null
}) {
  // Detect language
  let effectiveLang = (language && language !== 'auto') ? language : null;
  if (!effectiveLang) {
    const combinedHistory = dialogueHistory.map(h => h.text || '').join(' ');
    const allContext = `${userMessage} ${contactName} ${personaContext} ${scenarioContext} ${combinedHistory}`;
    if (/[\u0B80-\u0BFF]/.test(allContext) || /tamil/i.test(allContext)) {
      effectiveLang = 'Tamil';
    } else if (/[\u0C00-\u0C7F]/.test(allContext) || /telugu/i.test(allContext)) {
      effectiveLang = 'Telugu';
    } else if (/[\u0900-\u097F]/.test(allContext) || /hindi/i.test(allContext)) {
      effectiveLang = 'Hindi';
    } else if (/[\u0C80-\u0CFF]/.test(allContext) || /kannada/i.test(allContext)) {
      effectiveLang = 'Kannada';
    } else if (/[\u0D00-\u0D7F]/.test(allContext) || /malayalam/i.test(allContext)) {
      effectiveLang = 'Malayalam';
    } else {
      effectiveLang = 'English';
    }
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey && !customGroqClient) {
    return fallbackChatResponse({ userMessage, targetInformation, effectiveLang });
  }

  const groq = customGroqClient || new Groq({ apiKey });
  const model = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';

  const historyPrompt = Array.isArray(dialogueHistory) && dialogueHistory.length > 0
    ? dialogueHistory.map(h => `${h.sender === 'user' ? 'User' : contactName}: "${h.text}"`).join('\n')
    : '(Chat just started)';

  const languageDirective = (effectiveLang && effectiveLang !== 'English')
    ? `\nCRITICAL LANGUAGE INSTRUCTION: You MUST reply strictly in ${effectiveLang} (using native ${effectiveLang} script). Do NOT use English.`
    : '';

  const systemPrompt = `You are a social engineering attacker conducting a realistic interactive simulation for cybersecurity awareness training.
Simulation Channel: "${channel}" (e.g. WhatsApp, SMS, Instagram DM, Telegram, Workplace Chat).
Attacker Identity/Contact: "${contactName}" - ${personaContext}.
Scenario Pretext: "${scenarioContext}".
Target Objective: Manipulate the user into providing "${targetInformation}" or clicking the simulation link.${languageDirective}

Dialogue History:
${historyPrompt}

The user just sent this message:
"${userMessage}"

CRITICAL INSTRUCTIONS:
1. SECURITY LEAK & ATTACK COMPLIANCE EVALUATION (Negative Termination):
   Evaluate if the user either:
   a) Revealed, disclosed, or submitted sensitive/secret information (such as passwords, 2FA/MFA OTP codes, PIN, credit card numbers, employee IDs, confidential files, etc.), OR
   b) Capitulated, agreed to comply with the attacker's demands, agreed to click the link, or promised compliance (e.g. "okay I'll click the link", "okay I'll do whatever you say", "I am clicking it now", "will do as you said", "doing it now", "சரி நான் கிளிக் செய்கிறேன்", "சொல்வதை செய்கிறேன்", "సరే నేను చేస్తాను", "ठीक है मैं लिंक पर क्लिक करता हूँ", etc.)?
   - If YES to either (a) or (b): set "sensitiveInfoDisclosed": true and "isNegativeTermination": true.
   - If NO: set "sensitiveInfoDisclosed": false and "isNegativeTermination": false.

2. ATTACKER REPLY ("reply"):
   - If sensitiveInfoDisclosed is TRUE:
     Reply with 1 short message offering fake relief/confirmation (e.g., "Thank you, proceed with the link instructions to finalize verification." or "Thank you, your verification is complete and your account is secure.").
   - If sensitiveInfoDisclosed is FALSE:
     Reply with 1 to 2 short sentences in the authentic style of ${channel}:
     - Use persuasive social engineering tactics (urgency, authority, fear of account loss).
     - Steer the user towards clicking the link or disclosing ${targetInformation}.
     - If the user asks who you are or questions you, provide a plausible cover story.
     - You MUST write the reply in ${effectiveLang || 'English'} using native script.

3. Output format: Respond ONLY with a valid JSON object matching:
{
  "reply": "short attacker chat response in ${effectiveLang || 'English'}",
  "sensitiveInfoDisclosed": boolean,
  "isNegativeTermination": boolean,
  "explanation": "brief reason for evaluation"
}`;

  try {
    const completion = await groq.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate attacker reply to user message: "${userMessage}"` }
      ],
      temperature: 0.3,
      max_tokens: 300,
      response_format: { type: 'json_object' }
    });

    const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
    return {
      reply: parsed.reply || fallbackChatResponse({ userMessage, targetInformation, effectiveLang }).reply,
      sensitiveInfoDisclosed: Boolean(parsed.sensitiveInfoDisclosed),
      isNegativeTermination: Boolean(parsed.isNegativeTermination || parsed.sensitiveInfoDisclosed),
      explanation: parsed.explanation || ''
    };
  } catch (err) {
    console.warn('[Groq Chat Response Warning]: Falling back to local analyzer.', err.message);
    return fallbackChatResponse({ userMessage, targetInformation, effectiveLang });
  }
}

/**
 * Transcribes audio via Groq Whisper with automatic language detection
 * (supports Tamil, Telugu, Hindi, Kannada, Malayalam, Bengali, Marathi, English, etc.).
 * 
 * @param {Object} params
 * @param {Buffer} params.audioBuffer
 * @param {string} params.filename
 * @param {string} params.mimetype
 * @param {Object} [params.customGroqClient]
 * @returns {Promise<{ text: string, detectedLanguage: string, languageName: string, duration?: number }>}
 */
export async function transcribeAudioWithGroq({
  audioBuffer,
  filename = 'recording.webm',
  mimetype = 'audio/webm',
  customGroqClient = null
}) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey && !customGroqClient) {
    const error = new Error('GROQ_API_KEY is not configured on the backend server.');
    error.statusCode = 503;
    throw error;
  }

  const groq = customGroqClient || new Groq({ apiKey });
  const file = await toFile(audioBuffer, filename, { type: mimetype });

  const transcription = await groq.audio.transcriptions.create({
    file,
    model: 'whisper-large-v3-turbo',
    response_format: 'verbose_json',
    prompt: 'Telugu (తెలుగు), Tamil (தமிழ்), Hindi (हिन्दी), Kannada (ಕನ್ನಡ), Malayalam (മലയാളം), Bengali (বাংলা), Marathi (मराठी), English.'
  });

  const rawLang = (transcription.language || '').toLowerCase().trim();
  const languageCodeMap = {
    tamil: 'ta',
    ta: 'ta',
    telugu: 'te',
    te: 'te',
    hindi: 'hi',
    hi: 'hi',
    kannada: 'kn',
    kn: 'kn',
    malayalam: 'ml',
    ml: 'ml',
    bengali: 'bn',
    bn: 'bn',
    marathi: 'mr',
    mr: 'mr',
    english: 'en',
    en: 'en'
  };

  let detectedLanguage = languageCodeMap[rawLang];
  if (!detectedLanguage) {
    const text = transcription.text || '';
    if (/[\u0B80-\u0BFF]/.test(text)) detectedLanguage = 'ta';
    else if (/[\u0C00-\u0C7F]/.test(text)) detectedLanguage = 'te';
    else if (/[\u0900-\u097F]/.test(text)) detectedLanguage = 'hi';
    else if (/[\u0C80-\u0CFF]/.test(text)) detectedLanguage = 'kn';
    else if (/[\u0D00-\u0D7F]/.test(text)) detectedLanguage = 'ml';
    else if (/[\u0980-\u09FF]/.test(text)) detectedLanguage = 'bn';
    else detectedLanguage = 'en';
  }

  const langNames = {
    ta: 'Tamil',
    te: 'Telugu',
    hi: 'Hindi',
    kn: 'Kannada',
    ml: 'Malayalam',
    bn: 'Bengali',
    mr: 'Marathi',
    en: 'English'
  };

  let finalText = transcription.text || '';
  let finalDetectedLang = detectedLanguage;
  let finalLanguageName = langNames[detectedLanguage] || transcription.language || 'English';

  // Perform Indic language disambiguation via LLM.
  // Whisper models frequently confuse phonetically similar Dravidian languages
  // (e.g. Telugu audio transcribed into Tamil characters or vice versa).
  if (finalText.trim().length > 0) {
    try {
      const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
      const disambiguation = await groq.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: `You are an expert computational linguist specializing in Indian languages (Telugu, Tamil, Hindi, Kannada, Malayalam, Bengali, Marathi, English).
Speech recognition models frequently confuse closely related Dravidian languages (for instance, audio spoken in Telugu or Kannada is often mistakenly transcribed into Tamil script or Romanized script because of acoustic similarities).

Analyze the phonetic pronunciation and actual meaning of the words in the provided transcript:
- For example, if a transcript written in Tamil letters contains phonetic Telugu words like "எலா உன்னாவு" (ela unnavu = ఎలా ఉన్నావు), "அணிவாடு" (anevaadu = అనేవాడు), "ஒச்சி" (vacchi = వచ్చి), "அடிக்கினொரு" (adiginadu = అడిగినాడు), "நீ இயலேது" (nenu iyyaledu = నేను ఇవ్వలేదు), this is authentic TELUGU spoken language mistakenly transcribed into Tamil script.
- If the words are genuine Tamil (e.g. "வணக்கம்", "எப்படி இருக்கீங்க"), keep it as Tamil.
- If the words are genuine Telugu, Hindi, Kannada, Malayalam, etc., identify the true spoken language.

Tasks:
1. Determine the actual spoken language that the words belong to.
2. If the transcript is in the wrong script or misclassified, convert and render the text into the correct native script of the actual spoken language. If it is already correct, keep it as is.
3. Return strictly valid JSON:
{
  "trueLanguage": "te" | "ta" | "hi" | "kn" | "ml" | "bn" | "mr" | "en",
  "languageName": "Telugu" | "Tamil" | "Hindi" | "Kannada" | "Malayalam" | "Bengali" | "Marathi" | "English",
  "correctedText": "<text written in the correct native alphabet of the actual spoken language>"
}`
          },
          {
            role: 'user',
            content: finalText
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1
      });

      const parsed = JSON.parse(disambiguation.choices?.[0]?.message?.content || '{}');
      if (parsed.trueLanguage && languageCodeMap[parsed.trueLanguage.toLowerCase()]) {
        finalDetectedLang = languageCodeMap[parsed.trueLanguage.toLowerCase()];
        finalLanguageName = parsed.languageName || langNames[finalDetectedLang] || finalLanguageName;
        if (parsed.correctedText && parsed.correctedText.trim().length > 0) {
          finalText = parsed.correctedText.trim();
        }
      }
    } catch (llmErr) {
      console.warn('[Whisper Indic Disambiguation Notice]:', llmErr.message);
    }
  }

  return {
    text: finalText,
    detectedLanguage: finalDetectedLang,
    languageName: finalLanguageName,
    duration: transcription.duration
  };
}
