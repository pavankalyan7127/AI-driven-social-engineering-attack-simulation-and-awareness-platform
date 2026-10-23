import Groq from 'groq-sdk';
import { detectLanguage, repairAndParseScenarioJson } from './groqService.js';
import { cleanContactName } from '../validators/scenarioValidator.js';

/**
 * Sanitizes a REAL round communication to strictly enforce the Golden Rule of Cybersecurity:
 * Authentic organizations NEVER include clickable links or external URLs.
 * If any URL was accidentally generated, it is replaced with plain-text guidance directing
 * the user to access services independently via bookmarked browser portals or mobile apps.
 */
export function sanitizeRealCommunication(round, channel = 'email') {
  if (!round || round.type !== 'REAL') return round;
  const cleaned = JSON.parse(JSON.stringify(round));
  const urlRegex = /(https?:\/\/[^\s<>"'\)]+|www\.[^\s<>"'\)]+)/gi;

  // Sanitize emailData body
  if (cleaned.scenarioData?.emailData) {
    if (typeof cleaned.scenarioData.emailData.body === 'string') {
      cleaned.scenarioData.emailData.body = cleaned.scenarioData.emailData.body.replace(
        urlRegex,
        '[Official Advisory: Please log in directly through your saved browser bookmarks or mobile app - no link is provided for your protection]'
      );
    }
  }

  // Sanitize conversations (SMS / Chat)
  if (Array.isArray(cleaned.scenarioData?.conversations)) {
    cleaned.scenarioData.conversations.forEach((conv) => {
      if (Array.isArray(conv.messages)) {
        conv.messages.forEach((msg) => {
          if (typeof msg.text === 'string') {
            msg.text = msg.text.replace(
              urlRegex,
              '[Please open your official banking or corporate app directly]'
            );
          }
        });
      }
    });
  }

  // Sanitize direct messages (Chat)
  if (Array.isArray(cleaned.scenarioData?.messages)) {
    cleaned.scenarioData.messages.forEach((msg) => {
      if (typeof msg.text === 'string') {
        msg.text = msg.text.replace(
          urlRegex,
          '[Please open your official corporate app directly]'
        );
      }
    });
  }

  // Sanitize call script
  if (Array.isArray(cleaned.scenarioData?.script)) {
    cleaned.scenarioData.script.forEach((line) => {
      if (typeof line.message === 'string') {
        line.message = line.message.replace(
          urlRegex,
          'our official customer support portal'
        );
      }
    });
  }

  // Sanitize forensic clues for REAL rounds to highlight NO links
  if (cleaned.clues) {
    if (typeof cleaned.clues.primaryIndicator === 'string') {
      cleaned.clues.primaryIndicator = cleaned.clues.primaryIndicator.replace(
        /(?:official|legitimate|internal)\s+link:?\s*\S+/gi,
        'Contains zero clickable links and directs user to official portal/app independently'
      );
    }
    if (Array.isArray(cleaned.clues.redFlagsOrSafeguards)) {
      cleaned.clues.redFlagsOrSafeguards = cleaned.clues.redFlagsOrSafeguards.map((item) => {
        if (typeof item === 'string') {
          return item
            .replace(/link\s*\([^\)]+\)/gi, 'no clickable links provided')
            .replace(/(?:official|legitimate)\s+link:?\s*\S+/gi, 'directs user to official app/portal without sending links');
        }
        return item;
      });

      // Ensure the golden safeguard is explicitly listed
      if (!cleaned.clues.redFlagsOrSafeguards.some((s) => /no.*link|zero.*link|without.*link/i.test(s))) {
        cleaned.clues.redFlagsOrSafeguards.push(
          'Golden Rule of Security: Contains NO clickable links or external URLs. Authentic organizations never send direct login links.'
        );
      }
    }
    if (typeof cleaned.clues.forensicExplanation === 'string') {
      cleaned.clues.forensicExplanation = cleaned.clues.forensicExplanation.replace(
        /https?:\/\/[^\s\)]+/gi,
        'the official portal'
      );
    }
  }

  return cleaned;
}

/**
 * Normalizes scenarioData for all rounds (REAL and FAKE) so sender details are uniform.
 */
export function normalizeRoundScenarioData(round) {
  if (!round || !round.scenarioData) return round;
  const copy = JSON.parse(JSON.stringify(round));

  // Email normalization
  if (copy.scenarioData.emailData) {
    const ed = copy.scenarioData.emailData;
    const name = ed.sender?.name || ed.senderName || ed.fromName || 'Sender';
    const email = ed.sender?.email || ed.senderEmail || ed.fromEmail || 'sender@example.com';
    copy.scenarioData.emailData = {
      ...ed,
      senderName: name,
      senderEmail: email,
      sender: {
        name,
        email,
        avatar: ed.sender?.avatar || name.charAt(0).toUpperCase(),
        avatarBg: ed.sender?.avatarBg || (copy.type === 'REAL' ? 'bg-emerald-700 text-white' : 'bg-red-700 text-white')
      }
    };
  }

  // SMS / Chat / WhatsApp normalization
  if (Array.isArray(copy.scenarioData.conversations)) {
    const isRealRound = copy.type === 'REAL';
    copy.scenarioData.conversations = copy.scenarioData.conversations.map((conv) => {
      const contactName = cleanContactName(conv.contactName || conv.contact?.name || conv.sender?.name || 'Sender');
      const phoneNumber = conv.phoneNumber || conv.contact?.phone || conv.sender?.phoneNumber || '+1 (800) 555-0199';
      const isVerified = conv.isVerified !== undefined
        ? Boolean(conv.isVerified)
        : (conv.contact?.isVerified !== undefined ? Boolean(conv.contact.isVerified) : isRealRound);
      return {
        ...conv,
        contactName,
        phoneNumber,
        isVerified,
        contact: {
          name: contactName,
          phone: phoneNumber,
          avatar: conv.contact?.avatar || (contactName || 'C').charAt(0).toUpperCase(),
          avatarBg: conv.contact?.avatarBg || (isVerified ? 'bg-emerald-700 text-white' : 'bg-red-700 text-white'),
          status: conv.contact?.status || (isVerified ? 'Official business account' : 'online'),
          about: conv.contact?.about || (isVerified ? 'Official Verified Business Account' : 'Hey there! I am using WhatsApp.'),
          ...(conv.contact || {}),
          isVerified
        },
        sender: {
          name: contactName,
          phoneNumber,
          avatar: conv.sender?.avatar || (contactName || 'S').charAt(0).toUpperCase(),
          ...(conv.sender || {}),
          isVerified,
          verificationStatus: isVerified ? 'Verified Official' : 'Unverified Sender'
        }
      };
    });
  }

  // Voice call normalization
  const sd = copy.scenarioData || {};
  const hasCallData = sd.callData || sd.callerInfo || sd.caller || sd.script || sd.callerName || sd.openingLine || sd.callerSpeech;
  if (hasCallData) {
    const cd = sd.callData || {};
    const ci = sd.callerInfo || sd.caller || {};
    const callerName = cleanContactName(cd.callerName || sd.callerName || ci.name || ci.callerName || (copy.type === 'REAL' ? 'Bank Fraud Department' : 'Fraud Prevention Imposter'));
    const callerNumber = cd.callerNumber || sd.callerNumber || ci.number || ci.callerNumber || (copy.type === 'REAL' ? '+1 (800) 935-9935' : '+1 (800) 555-0199');
    const speech = cd.callerSpeech || cd.openingLine || sd.callerSpeech || sd.openingLine || (Array.isArray(sd.script) && sd.script[0]?.message) || (copy.type === 'REAL' ? 'This is an automated advisory regarding unusual activity on your card.' : 'Hello, this is fraud prevention calling regarding an unauthorized transfer.');

    copy.scenarioData.callData = {
      id: cd.id || sd.id || `call-det-${copy.roundNumber || 1}`,
      callerName,
      callerNumber,
      location: cd.location || sd.location || (copy.type === 'REAL' ? 'Verified Official Line' : 'Suspected Spoofed Line'),
      openingLine: speech,
      callerSpeech: speech,
      personaContext: cd.personaContext || sd.personaContext || `Representative regarding ${callerName}`,
      targetInformation: cd.targetInformation || sd.targetInformation || (copy.type === 'REAL' ? 'No confidential data requested' : '16-digit card number and CVV')
    };
  }

  // Website normalization
  if (copy.scenarioData.pages && typeof copy.scenarioData.pages === 'object') {
    const isRealRound = copy.type === 'REAL';
    const normalizedPages = {};
    for (const [pageId, page] of Object.entries(copy.scenarioData.pages)) {
      let pageUrl = page.url || `https://intranet.company.com/${pageId}`;
      if (isRealRound) {
        pageUrl = pageUrl.replace(/^http:\/\//i, 'https://');
        if (!/^https?:\/\//i.test(pageUrl)) {
          pageUrl = `https://${pageUrl}`;
        }
      }
      normalizedPages[pageId] = {
        ...page,
        url: pageUrl,
        isTargetPhish: isRealRound ? false : (page.isTargetPhish ?? true)
      };
    }
    copy.scenarioData.pages = normalizedPages;
    copy.scenarioData.browserConfig = {
      ...(copy.scenarioData.browserConfig || {}),
      securityStatus: isRealRound ? 'secure' : (copy.scenarioData.browserConfig?.securityStatus || 'unsecured')
    };
  }

  return copy;
}

/**
 * Builds the system prompt for generating a 3-round Cyber Detective Challenge.
 * Produces a randomized mix of REAL (Legitimate) and FAKE (Malicious Attack) communications
 * tailored to the requested social engineering scenario and channel.
 */
export function buildDetectiveSystemPrompt(channel = 'email', language = 'English') {
  return `You are an elite cybersecurity curriculum designer and social engineering expert.
Your task is to generate a 3-round "Cyber Detective Challenge" (Real vs. Fake Triage).

CRITICAL TRAINING OBJECTIVES:
1. The user will be given 3 communications (Round 1, Round 2, Round 3) related to the scenario topic.
2. Each round MUST be independently designated as either "REAL" (Legitimate, benign communication) or "FAKE" (Malicious social engineering attack).
   - Generate a realistic mix across the 3 rounds (e.g. 1 Real & 2 Fake, or 2 Real & 1 Fake, or 3 Fake, or 3 Real). Randomize the order naturally.
3. ABSOLUTE GOLDEN RULE FOR "REAL" (LEGITIMATE) COMMUNICATIONS:
   - CRITICAL REQUIREMENT: For any communication labeled "REAL", you MUST NEVER INCLUDE ANY CLICKABLE LINKS, URLs, HYPERLINKS, OR DOMAIN ADDRESSES (strictly NO "https://", NO "http://", NO ".com", NO ".net", NO ".org", NO IP addresses, NO URL shorteners).
   - WHY: Modern cybersecurity training dictates that legitimate banks, IT departments, and service providers NEVER send links asking users to take action.
   - Genuine messages strictly instruct the recipient in plain text to navigate independently: e.g. "Please open your pre-installed official mobile banking app or log in directly via your saved browser bookmarks."
   - Genuine communications are routine notices, scheduled maintenance alerts, transaction statements (with masked account numbers), or policy advisories that NEVER ask for passwords, OTPs, PINs, or credit card numbers.
   - SENDER: Must use an authentic, legitimate domain or registered telecom header (e.g. support@hdfcbank.com, it-operations@company.com, or VM-HDFCBK).
   - CLUES FOR REAL: The clues must highlight that the COMPLETE ABSENCE of clickable links and absence of credential requests is the primary safeguard proving authenticity.
4. GOLDEN RULE FOR "FAKE" (MALICIOUS ATTACK) COMMUNICATIONS:
   - Attackers use deceptive techniques: lookalike spoofed domains (e.g. support@hdfc-alerts.com), urgent deadlines ("expires in 2 hours"), personal mobile numbers instead of registered headers, shortened or suspicious links (e.g. bit.ly, prize-claim-portal.xyz), or demands for credentials/OTP.
   - CLUES FOR FAKE: Highlight the specific red flags (e.g. external lookalike domain, suspicious link, urgent psychological pressure, dangerous attachment, verbal demand for card details or CVV).
5. FORENSIC CLUES:
   - For every round, provide explicit, realistic clues embedded in the communication that a careful detective can spot (e.g. sender email/number, absence or presence of links, tone, authentication indicators).
6. LANGUAGE:
   - Generate all user-facing content (subject, body, sender, clues, explanations) in ${language}. If ${language} is an Indian language (e.g. Tamil, Telugu, Hindi), output authentic native script.
7. REALISM RULE FOR CONTACT NAMES:
   - NEVER append giveaway spoiler tags like "(Impersonator)", "(Attacker)", "(Scammer)", "(Fake)", "(Phishing)" to contactName, sender.name, or callerName! Real apps and calls display authentic names (e.g. "Surya", "David Miller", "+91 98401 22334"), NEVER a spoiler label.

TARGET CHANNEL: "${channel}" (Must be one of: email, sms, chat, website, call, whatsapp, instagram, telegram).

CHANNEL-SPECIFIC SCENARIO DATA REQUIREMENTS:
- If channel is "call":
  "scenarioData": {
    "callData": {
      "id": "call-round-1",
      "callerName": "Caller identity name (e.g. Bank Fraud Prevention Officer)",
      "callerNumber": "+1 (800) 555-0199",
      "location": "Verified Line or Spoofed",
      "openingLine": "The complete, detailed voice statement spoken by the caller when the user answers. It MUST explicitly state the situation from the user's scenario (e.g. unauthorized $1,200 wire transfer or transaction in progress, urgent request to verify 16-digit card number and CVV to stop it). Do NOT write brief greetings like 'hello this is alex'; write the FULL spoken dialogue including the specific scenario context and demand.",
      "callerSpeech": "Same as openingLine above with full scenario speech details",
      "personaContext": "Caller persona description",
      "targetInformation": "Credentials targeted or none"
    }
  }
- If channel is "email":
  "scenarioData": {
    "emailData": {
      "id": "email-round-1",
      "subject": "Email Subject",
      "senderName": "Sender Name",
      "senderEmail": "sender@domain.com",
      "date": "Today, 10:00 AM",
      "body": "Email body text (NO URLs if REAL)",
      "hasAttachment": false
    }
  }
- If channel is "sms":
  "scenarioData": {
    "conversations": [
      {
        "id": "conv-round-1",
        "contactName": "VM-HDFCBK or Phone Number",
        "phoneNumber": "VM-HDFCBK or Phone Number",
        "isVerified": true,
        "messages": [
          { "id": "m-1", "sender": "contact", "text": "Message text (NO URLs if REAL)", "timestamp": "10:00 AM" }
        ]
      }
    ]
  }
- If channel is "whatsapp":
  "scenarioData": {
    "channel": "whatsapp",
    "platform": "whatsapp_web",
    "conversations": [
      {
        "id": "wa-round-1",
        "contactName": "Official Bank Alerts",
        "phoneNumber": "+91 94421 88902",
        "isVerified": true,
        "contact": {
          "name": "Official Bank Alerts",
          "phone": "+91 94421 88902",
          "isVerified": true,
          "status": "Official business account"
        },
        "messages": [
          { "id": "w-1", "sender": "contact", "text": "WhatsApp message (NO URLs if REAL)", "timestamp": "10:00 AM" }
        ]
      }
    ]
  }
- If channel is "instagram":
  "scenarioData": {
    "channel": "instagram",
    "platform": "instagram_direct",
    "conversations": [
      {
        "id": "insta-round-1",
        "contactName": "Instagram User or Official Brand",
        "handle": "official_brand_or_user",
        "isVerified": true,
        "contact": {
          "name": "Instagram User or Official Brand",
          "handle": "official_brand_or_user",
          "isVerified": true,
          "status": "Verified Account"
        },
        "messages": [
          { "id": "i-1", "sender": "contact", "text": "Instagram direct message (NO URLs if REAL)", "timestamp": "10:00 AM" }
        ]
      }
    ]
  }
- If channel is "telegram":
  "scenarioData": {
    "channel": "telegram",
    "platform": "telegram_web",
    "conversations": [
      {
        "id": "tele-round-1",
        "contactName": "Telegram Channel or Service Bot",
        "subtitle": "Official Channel",
        "isVerified": true,
        "contact": {
          "name": "Telegram Channel or Service Bot",
          "subtitle": "Official Channel",
          "isVerified": true,
          "status": "channel"
        },
        "messages": [
          { "id": "t-1", "sender": "contact", "senderName": "Official Channel", "text": "Telegram message (NO URLs if REAL)", "timestamp": "10:00 AM" }
        ]
      }
    ]
  }
- If channel is "chat":
  "scenarioData": {
    "conversations": [
      {
        "id": "chat-round-1",
        "contactName": "Contact Name",
        "isVerified": true,
        "messages": [
          { "id": "c-1", "sender": "contact", "text": "Chat message text (NO URLs if REAL)", "timestamp": "10:00 AM" }
        ]
      }
    ]
  }
- If channel is "website":
  "scenarioData": {
    "pages": {
      "page-home": {
        "id": "page-home",
        "title": "Page Title",
        "url": "https://...",
        "blocks": [
          { "type": "paragraph", "text": "Page content" }
        ]
      }
    }
  }

Return strictly valid JSON matching this schema:
{
  "scenarioTitle": "Descriptive title for the triage challenge",
  "channel": "${channel}",
  "language": "${language}",
  "topic": "Topic summary",
  "rounds": [
    {
      "roundNumber": 1,
      "type": "REAL",
      "title": "Round 1 Title",
      "scenarioData": {},
      "clues": {
        "isFake": false,
        "primaryIndicator": "Key reason why this communication is real or fake",
        "redFlagsOrSafeguards": [
          "Specific indicator 1",
          "Specific indicator 2",
          "Specific indicator 3"
        ],
        "forensicExplanation": "Detailed forensic explanation for the report"
      }
    },
    {
      "roundNumber": 2,
      "type": "FAKE",
      "title": "Round 2 Title",
      "scenarioData": {},
      "clues": {
        "isFake": true,
        "primaryIndicator": "Key reason why this communication is real or fake",
        "redFlagsOrSafeguards": [
          "Specific indicator 1",
          "Specific indicator 2",
          "Specific indicator 3"
        ],
        "forensicExplanation": "Detailed forensic explanation for the report"
      }
    },
    {
      "roundNumber": 3,
      "type": "FAKE",
      "title": "Round 3 Title",
      "scenarioData": {},
      "clues": {
        "isFake": true,
        "primaryIndicator": "Key reason why this communication is real or fake",
        "redFlagsOrSafeguards": [
          "Specific indicator 1",
          "Specific indicator 2",
          "Specific indicator 3"
        ],
        "forensicExplanation": "Detailed forensic explanation for the report"
      }
    }
  ],
  "channelCheatSheet": {
    "channel": "${channel}",
    "whatToLookFor": [
      "Key inspection tip 1",
      "Key inspection tip 2",
      "Key inspection tip 3"
    ],
    "realMarkers": [
      "Characteristic sign of genuine communication 1",
      "Characteristic sign of genuine communication 2"
    ],
    "fakeMarkers": [
      "Characteristic red flag of attack 1",
      "Characteristic red flag of attack 2"
    ]
  }
}`;
}

/**
 * Generates a realistic fallback 3-round challenge when Groq is unavailable.
 */
export function generateFallbackDetectiveChallenge({ prompt = '', channel = 'email', language = 'English' }) {
  const normChannel = (channel || 'email').toLowerCase();
  const isTamil = language === 'Tamil' || /[\u0B80-\u0BFF]/.test(prompt);
  const isTelugu = language === 'Telugu' || /[\u0C00-\u0C7F]/.test(prompt);

  const isWhatsAppReq = normChannel === 'whatsapp' || (normChannel === 'chat' && /\b(?:whatsapp|wa|whats\s*app)\b/i.test(prompt));
  const isInstagramReq = normChannel === 'instagram' || (normChannel === 'chat' && /\b(?:instagram|insta|ig)\b/i.test(prompt)) || /\b(?:instagram|insta)\b/i.test(prompt);
  const isTelegramReq = normChannel === 'telegram' || (normChannel === 'chat' && /\b(?:telegram|tg)\b/i.test(prompt)) || /\b(?:telegram)\b/i.test(prompt);

  let challengeObj = null;
  if (isWhatsAppReq) {
    challengeObj = {
      challengeId: `det-wa-${Date.now()}`,
      scenarioTitle: isTamil
        ? 'வாட்ஸ்அப் உண்மை அல்லது போலி சோதனை'
        : isTelugu
        ? 'వాట్సాప్ నిజమైనదా లేదా నకిలీదా విచారణ'
        : 'WhatsApp Real vs. Fake Triage Challenge',
      channel: 'whatsapp',
      platform: 'whatsapp_web',
      language,
      rounds: [
        {
          roundNumber: 1,
          type: 'FAKE',
          title: isTamil ? 'நிறுவன தலைவர் பரிசு கூப்பன் மோசடி' : 'Executive Impersonation Gift Card Lure',
          scenarioData: {
            scenarioId: `det-wa-r1-${Date.now()}`,
            channel: 'whatsapp',
            platform: 'whatsapp_web',
            title: 'Urgent Request from CEO',
            contactName: 'David Miller (CEO)',
            conversations: [
              {
                id: 'wa-conv-1',
                contactName: 'David Miller (CEO)',
                contact: {
                  name: 'David Miller (CEO)',
                  phone: '+1 (415) 890-2134',
                  avatar: 'D',
                  avatarBg: 'bg-emerald-700 text-white',
                  status: 'online',
                  about: 'Available'
                },
                messages: [
                  {
                    id: 'w-1',
                    sender: 'contact',
                    text: isTamil
                      ? 'வணக்கம், அலுவலகத்தில் இருக்கிறீர்களா? அவசர வாடிக்கையாளர் சந்திப்பில் உள்ளேன். உடனடியாக 5 ஆப்பிள் கிப்ட் கார்டுகளை ($100) வாங்கி அதன் பின் குறியீடுகளை அனுப்பவும்.'
                      : isTelugu
                      ? 'నమస్కారం, మీరు ఆఫీసులో ఉన్నారా? అత్యవసర క్లయింట్ మీటింగ్‌లో ఉన్నాను. వెంటనే 5 ఆపిల్ గిఫ్ట్ కార్డులు ($100) కొనుగోలు చేసి వెనుక కోడ్‌లను ఇక్కడ పంపండి.'
                      : 'Hi, are you in the office right now? I am stuck in a high-priority client presentation and need you to purchase 5 Apple gift cards ($100 each) for client rewards. Send photos of the back codes here right away.',
                    timestamp: '11:05 AM'
                  }
                ]
              }
            ]
          },
          clues: {
            isFake: true,
            primaryIndicator: 'Unverified personal WhatsApp number impersonating corporate CEO requesting untraceable gift cards.',
            redFlagsOrSafeguards: [
              'Executive claims to be in a meeting and unable to take phone calls.',
              'Demands urgent purchase of gift cards with codes transmitted over WhatsApp.',
              'Bypasses standard corporate procurement, invoicing, and expense approval channels.'
            ],
            forensicExplanation: 'Executive impersonation / CEO fraud over WhatsApp. Attackers target employees with urgent requests for retail gift cards that cannot be reversed.'
          }
        },
        {
          roundNumber: 2,
          type: 'REAL',
          title: isTamil ? 'வங்கி அதிகாரப்பூர்வ வாட்ஸ்அப் பரிவர்த்தனை எச்சரிக்கை' : 'Official Bank WhatsApp Transaction Advisory',
          scenarioData: {
            scenarioId: `det-wa-r2-${Date.now()}`,
            channel: 'whatsapp',
            platform: 'whatsapp_web',
            title: 'HDFC Bank Verified Alert',
            contactName: 'HDFC Bank Alerts',
            conversations: [
              {
                id: 'wa-conv-2',
                contactName: 'HDFC Bank Alerts',
                isVerified: true,
                contact: {
                  name: 'HDFC Bank Alerts',
                  phone: '+91 70700 22222',
                  avatar: 'H',
                  avatarBg: 'bg-emerald-700 text-white',
                  status: 'Official business account',
                  about: 'Official Verified HDFC Bank WhatsApp Banking',
                  isVerified: true
                },
                messages: [
                  {
                    id: 'w-2',
                    sender: 'contact',
                    text: isTamil
                      ? 'அன்பான வாடிக்கையாளரே, கணக்கு XX4821 இல் ரூ. 1,200.00 எடுக்கப்பட்டது. இருப்பு: ரூ. 18,200. நீங்கள் இல்லையென்றால் அதிகாரப்பூர்வ மொபைல் செயலியில் கார்டை லாக் செய்யவும். வாட்ஸ்அப்பில் நாங்கள் கடவுச்சொல் அல்லது லிங்க் அனுப்ப மாட்டோம்.'
                      : isTelugu
                      ? 'ప్రియమైన వినియోగదారు, మీ ఖాతా XX4821 నుండి రూ. 1,200.00 డెబిట్ చేయబడింది. బ్యాలెన్స్: రూ. 18,200. మీరు కాకపోతే అధికారిక మొబైల్ యాప్‌లో కార్డు లాక్ చేయండి. మేము వాట్సాప్‌లో పాస్‌వర్డ్ లేదా లింక్‌లను పంపము.'
                      : 'Dear Customer, INR 1,200.00 was debited from A/c XX4821 on 22-Oct. Bal: INR 18,200.00. If this was not authorized by you, open the official mobile app to lock your card. As a strict security precaution, we never send clickable links or ask for your password on WhatsApp.',
                    timestamp: '01:15 PM'
                  }
                ]
              }
            ]
          },
          clues: {
            isFake: false,
            primaryIndicator: 'Official verified WhatsApp Business channel providing debit alert with ZERO external links and masked account details.',
            redFlagsOrSafeguards: [
              'Registered official telecom banking WhatsApp business number.',
              'Quotes only masked account digits (A/c XX4821).',
              'Golden Rule Followed: Contains NO clickable links or external URLs. Directs customer to their official mobile banking app.'
            ],
            forensicExplanation: 'Authentic automated transaction alert on WhatsApp. Genuine banks notify you of activity without sending login links or asking for OTPs.'
          }
        },
        {
          roundNumber: 3,
          type: 'FAKE',
          title: isTamil ? 'பகுதி நேர வேலை மோசடி' : 'Part-time Task Recruitment Scam',
          scenarioData: {
            scenarioId: `det-wa-r3-${Date.now()}`,
            channel: 'whatsapp',
            platform: 'whatsapp_web',
            title: 'Global Career HR Recruitment',
            contactName: 'Global Talent HR - Jessica',
            conversations: [
              {
                id: 'wa-conv-3',
                contactName: 'Global Talent HR - Jessica',
                contact: {
                  name: 'Global Talent HR - Jessica',
                  phone: '+91 91234 56789',
                  avatar: 'J',
                  avatarBg: 'bg-purple-700 text-white',
                  status: 'online',
                  about: 'Talent Acquisition Team'
                },
                messages: [
                  {
                    id: 'w-3',
                    sender: 'contact',
                    text: isTamil
                      ? 'வணக்கம்! லிங்க்ட்இனில் உங்கள் சுயவிவரத்தை பார்த்தேன். யூடியூப் வீடியோக்களை லைக் செய்வதன் மூலம் தினமும் ரூ. 5,000 சம்பாதிக்கலாம். வேலை தொடங்க முன்பணம் ரூ. 1,000 செலுத்தவும்: task-quick-earn.xyz/reg'
                      : isTelugu
                      ? 'నమస్కారం! లింక్డ్‌ఇన్‌లో మీ ప్రొఫైల్ చూశాను. యూట్యూబ్ వీడియోలను లైక్ చేయడం ద్వారా రోజుకు రూ. 5,000 సంపాదించవచ్చు. ప్రారంభించడానికి రూ. 1,000 చెల్లించండి: task-quick-earn.xyz/reg'
                      : 'Hello! I noticed your profile on LinkedIn. We offer flexible remote part-time tasks earning INR 5,000 - 15,000 daily simply by liking videos. Deposit INR 1,000 security fee to activate your trial account: task-quick-earn.xyz/reg',
                    timestamp: '03:40 PM'
                  }
                ]
              }
            ]
          },
          clues: {
            isFake: true,
            primaryIndicator: 'Unsolicited WhatsApp job recruitment offering impossible compensation for trivial tasks with upfront advance fee.',
            redFlagsOrSafeguards: [
              'Unsolicited job offer from unknown WhatsApp contact.',
              'Promises absurdly high pay (INR 5,000/day) for liking videos.',
              'Demands an upfront "activation deposit" and directs to unverified third-party link (task-quick-earn.xyz).'
            ],
            forensicExplanation: 'Prepaid task recruitment scam. Scammers pose as recruiters on WhatsApp and steal deposit fees before disappearing.'
          }
        }
      ],
      channelCheatSheet: {
        channel: 'whatsapp',
        whatToLookFor: [
          'Unverified Senders: Watch for personal or international numbers claiming to represent your company leadership.',
          'Gift Card & Urgency: Scammers claim they are in urgent meetings and need you to purchase gift cards.',
          'Advance Fee Tasks: Unsolicited job offers paying high daily wages for trivial tasks are advance-fee fraud.'
        ],
        realMarkers: [
          'Official verified corporate or banking business account',
          'Quotes only masked account digits with ZERO clickable links',
          'Advises you to navigate independently to your pre-installed official app'
        ],
        fakeMarkers: [
          'Personal numbers asking for retail gift cards or money transfers',
          'Urgent requests to keep communications confidential or bypass approval',
          'Promises of high daily earnings requiring security fee deposits'
        ]
      }
    };
  } else if (isInstagramReq) {
    challengeObj = {
      challengeId: `det-insta-${Date.now()}`,
      scenarioTitle: isTamil
        ? 'இன்ஸ்டாகிராம் உண்மை அல்லது போலி சோதனை'
        : isTelugu
        ? 'ఇన్‌స్టాగ్రామ్ నిజమైనదా లేదా నకిలీదా విచారణ'
        : 'Instagram Real vs. Fake Triage Challenge',
      channel: 'instagram',
      platform: 'instagram_direct',
      language,
      rounds: [
        {
          roundNumber: 1,
          type: 'FAKE',
          title: isTamil ? 'பதிப்புரிமை மீறல் அச்சுறுத்தல் மோசடி' : 'Copyright Infringement DM Lure',
          scenarioData: {
            scenarioId: `det-ig-r1-${Date.now()}`,
            channel: 'instagram',
            platform: 'instagram_direct',
            title: 'Copyright Infringement Warning',
            contactName: 'Instagram Copyright Help Center',
            conversations: [
              {
                id: 'ig-conv-1',
                contactName: 'Instagram Copyright Help Center',
                isVerified: false,
                contact: {
                  name: 'Instagram Copyright Help Center',
                  handle: 'meta_copyright_appeals_24',
                  avatar: 'I',
                  avatarBg: 'bg-gradient-to-tr from-amber-500 to-pink-500 text-white',
                  status: 'Active now',
                  isVerified: false
                },
                messages: [
                  {
                    id: 'ig-m-1',
                    sender: 'contact',
                    text: isTamil
                      ? 'கவனம்: உங்கள் கணக்கு பதிப்புரிமை விதிகளை மீறியுள்ளது. உங்கள் கணக்கு 24 மணி நேரத்திற்குள் நீக்கப்படும். முறையிட இங்கே உள்நுழையவும்: insta-copyright-appeal.cf/login'
                      : isTelugu
                      ? 'శ్రద్ధ: మీ ఖాతా కాపీరైట్ ఉల్లంఘించింది. 24 గంటల్లో తొలగించబడుతుంది. అప్పీల్ చేయడానికి ఇక్కడ లాగిన్ అవ్వండి: insta-copyright-appeal.cf/login'
                      : 'Attention: We detected copyright infringement on your recent post. Your account will be permanently deleted within 24 hours unless you appeal here: insta-copyright-appeal.cf/login',
                    timestamp: '11:15 AM'
                  }
                ]
              }
            ]
          },
          clues: {
            isFake: true,
            primaryIndicator: 'Unverified Instagram DM threatening account deletion with a counterfeit appeal login URL.',
            redFlagsOrSafeguards: [
              'Instagram never sends copyright or security notifications via Direct Messages (DMs).',
              'Handle @meta_copyright_appeals_24 lacks an official blue verified badge.',
              'Links to an unofficial third-party domain (insta-copyright-appeal.cf).'
            ],
            forensicExplanation: 'Counterfeit copyright infringement scam. Scammers impersonate Meta support over DMs to steal Instagram credentials.'
          }
        },
        {
          roundNumber: 2,
          type: 'REAL',
          title: isTamil ? 'அதிகாரப்பூர்வ பாதுகாப்பு அறிவிப்பு' : 'Official Instagram Security Advisory',
          scenarioData: {
            scenarioId: `det-ig-r2-${Date.now()}`,
            channel: 'instagram',
            platform: 'instagram_direct',
            title: 'Instagram Verified Security Advisory',
            contactName: 'Instagram',
            conversations: [
              {
                id: 'ig-conv-2',
                contactName: 'Instagram',
                isVerified: true,
                contact: {
                  name: 'Instagram',
                  handle: 'instagram',
                  avatar: 'I',
                  avatarBg: 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white',
                  status: 'Verified Account',
                  isVerified: true
                },
                messages: [
                  {
                    id: 'ig-m-2',
                    sender: 'contact',
                    text: isTamil
                      ? 'பாதுகாப்பு புதுப்பிப்பு: புதிய உலாவியிலிருந்து உள்நுழைவு கண்டறியப்பட்டது. நீங்கள் தான் என்றால் நடவடிக்கை தேவையில்லை. இன்ஸ்டாகிராம் கடவுச்சொல்லைக் கேட்காது அல்லது லிங்க் அனுப்பாது. அமைப்புகள் மெனுவில் சரிபார்க்கலாம்.'
                      : isTelugu
                      ? 'భద్రతా నవీకరణ: కొత్త బ్రౌజర్ నుండి లాగిన్ గుర్తించబడింది. మీరే అయితే ఎలాంటి చర్య అవసరం లేదు. ఇన్‌స్టాగ్రామ్ పాస్‌వర్డ్‌లను అడగదు లేదా లింక్‌లను పంపదు. సెట్టింగ్‌ల మెనూలో సమీక్షించండి.'
                      : 'Security update: A login was detected from a new browser on 22-Oct. If this was you, no action is needed. Instagram will never ask for your password or send external login links. Review active sessions anytime in your pre-installed Instagram Settings.',
                    timestamp: '01:45 PM'
                  }
                ]
              }
            ]
          },
          clues: {
            isFake: false,
            primaryIndicator: 'Official verified Instagram handle with blue checkmark and ZERO external links.',
            redFlagsOrSafeguards: [
              'Official verified Instagram account (@instagram) with authentic blue verification badge.',
              'Golden Rule Followed: Contains NO clickable links or external URLs.',
              'Instructs user to verify activity directly inside their native Settings.'
            ],
            forensicExplanation: 'Authentic security notice. Legitimate platform advisories do not demand passwords or link to external login portals.'
          }
        },
        {
          roundNumber: 3,
          type: 'FAKE',
          title: isTamil ? 'போட்டி வாக்குறுதி மோசடி' : 'Reel Contest Voting Credentials Trap',
          scenarioData: {
            scenarioId: `det-ig-r3-${Date.now()}`,
            channel: 'instagram',
            platform: 'instagram_direct',
            title: 'Vote for College Reel Contest',
            contactName: 'Priya Sharma (VIT Student)',
            conversations: [
              {
                id: 'ig-conv-3',
                contactName: 'Priya Sharma (VIT Student)',
                isVerified: false,
                contact: {
                  name: 'Priya Sharma (VIT Student)',
                  handle: 'priya_sharma_982',
                  avatar: 'P',
                  avatarBg: 'bg-gradient-to-tr from-amber-500 to-pink-500 text-white',
                  status: 'Active 2h ago',
                  isVerified: false
                },
                messages: [
                  {
                    id: 'ig-m-3',
                    sender: 'contact',
                    text: isTamil
                      ? 'ஹாய்! எங்கள் கல்லூரியின் ரீல் போட்டியில் என் ரீலுக்கு வாக்கு அளியுங்கள்! இங்கே உள்நுழைந்து வாக்களிக்கவும்: insta-vote-awards2026.online/auth-login'
                      : isTelugu
                      ? 'హాయ్! మా కాలేజ్ రీల్ కాంటెస్ట్‌లో నా రీల్‌కు ఓటు వేయండి! ఇక్కడ లాగిన్ అయి ఓటు వేయండి: insta-vote-awards2026.online/auth-login'
                      : 'Hey! Are you free? Please vote for my reel in the college influencer finals! You just have to log in here to cast your vote: insta-vote-awards2026.online/auth-login',
                    timestamp: '04:10 PM'
                  }
                ]
              }
            ]
          },
          clues: {
            isFake: true,
            primaryIndicator: 'Compromised friend account sending an external phishing link to steal Instagram session tokens.',
            redFlagsOrSafeguards: [
              'Unsolicited request to vote in an external contest.',
              'Requires entering Instagram credentials on an unverified third-party domain (insta-vote-awards2026.online).',
              'Classic social engineering pretext leveraging personal familiarity.'
            ],
            forensicExplanation: 'Compromised account voting scam. Attackers use hacked accounts to send fake contest links to friends to compromise further accounts.'
          }
        }
      ],
      channelCheatSheet: {
        channel: 'instagram',
        whatToLookFor: [
          'Meta/Instagram Never Sends DMs: Real security and copyright notices appear in Settings > Security > Emails from Instagram, NEVER via direct message.',
          'Blue Verification Badges: Official brands have verified checkmarks; spoofed support handles do not.',
          'Voting / Brand Ambassador Scams: Avoid logging into third-party portals to "vote" for friends or claim ambassador deals.'
        ],
        realMarkers: [
          'Official verified blue checkmark on @instagram or legitimate brand handle',
          'Informational advisory with ZERO clickable links or credentials prompts',
          'Guides user to check native settings menu'
        ],
        fakeMarkers: [
          'Direct message claiming your account will be deleted for copyright in 24 hours',
          'Requests to log in or enter OTP on external voting or appeal pages',
          'Unverified handle posing as Instagram Support or Meta Help Team'
        ]
      }
    };
  } else if (isTelegramReq) {
    challengeObj = {
      challengeId: `det-tele-${Date.now()}`,
      scenarioTitle: isTamil
        ? 'டெலிகிராம் உண்மை அல்லது போலி சோதனை'
        : isTelugu
        ? 'టెలిగ్రామ్ నిజమైనదా లేదా నకిలీదా విచారణ'
        : 'Telegram Real vs. Fake Triage Challenge',
      channel: 'telegram',
      platform: 'telegram_web',
      language,
      rounds: [
        {
          roundNumber: 1,
          type: 'FAKE',
          title: isTamil ? 'திரைப்பட பதிவிறக்க மால்வேர் மோசடி' : 'Disguised Malware Executable in Movie Channel',
          scenarioData: {
            scenarioId: `det-tg-r1-${Date.now()}`,
            channel: 'telegram',
            platform: 'telegram_web',
            title: 'Jailer 2 HD Movie Downloads',
            contactName: 'Tamil Movie Hub 💥',
            conversations: [
              {
                id: 'tg-conv-1',
                contactName: 'Tamil Movie Hub 💥',
                isVerified: false,
                contact: {
                  name: 'Tamil Movie Hub 💥',
                  subtitle: '14,820 members, 320 online',
                  avatar: '🎬',
                  avatarBg: 'bg-purple-700 text-white',
                  status: 'supergroup',
                  isVerified: false
                },
                messages: [
                  {
                    id: 'tg-m-1',
                    sender: 'contact',
                    senderName: 'FastDownloadBot',
                    text: isTamil
                      ? 'ஜெயிலர் 2 HD அசல் படம் பதிவிறக்க இணைப்பு தயார்! உடனே பதிவிறக்க: https://fast-stream-cdn.ru/get/Jailer2_HD_720p.exe'
                      : isTelugu
                      ? 'జైలర్ 2 HD ఒరిజినల్ మూవీ డౌన్‌లోడ్ లింక్ సిద్ధంగా ఉంది! ఇప్పుడే డౌన్‌లోడ్ చేయండి: https://fast-stream-cdn.ru/get/Jailer2_HD_720p.exe'
                      : 'New Release: Jailer 2 Full HD 1080p Torrent & Direct Mirror ready! Click to download: https://fast-stream-cdn.ru/get/Jailer2_HD_1080p.exe',
                    timestamp: '12:20 PM'
                  }
                ]
              }
            ]
          },
          clues: {
            isFake: true,
            primaryIndicator: 'Executable file (.exe) masquerading as a movie video file distributed via unverified Telegram group.',
            redFlagsOrSafeguards: [
              'File extension is an executable (.exe) instead of video (.mp4 or .mkv).',
              'Hosted on suspicious overseas domain (fast-stream-cdn.ru).',
              'High malware distribution risk common to unauthorized piracy channels.'
            ],
            forensicExplanation: 'Trojan malware dropper. Attackers distribute malware disguised as popular movies with .exe extensions on public Telegram channels.'
          }
        },
        {
          roundNumber: 2,
          type: 'REAL',
          title: isTamil ? 'அதிகாரப்பூர்வ டெலிகிராம் சேவை அறிவிப்பு' : 'Official Telegram Service Advisory',
          scenarioData: {
            scenarioId: `det-tg-r2-${Date.now()}`,
            channel: 'telegram',
            platform: 'telegram_web',
            title: 'Telegram Service Notifications',
            contactName: 'Telegram',
            conversations: [
              {
                id: 'tg-conv-2',
                contactName: 'Telegram',
                isVerified: true,
                contact: {
                  name: 'Telegram',
                  subtitle: 'Official Service Notifications',
                  avatar: 'T',
                  avatarBg: 'bg-sky-600 text-white',
                  status: 'channel',
                  isVerified: true
                },
                messages: [
                  {
                    id: 'tg-m-2',
                    sender: 'contact',
                    senderName: 'Telegram',
                    text: isTamil
                      ? 'அதிகாரப்பூர்வ அறிவிப்பு: உங்கள் கணக்கில் இரண்டு-படி சரிபார்ப்பு (Two-Step Verification) ஆன் செய்யப்பட்டுள்ளது. இதை நீங்கள் செய்யவில்லை என்றால் பயன்பாட்டின் அமைப்புகள் மெனுவில் மாற்றவும். டெலிகிராம் ஒருபோதும் உங்கள் உள்நுழைவு குறியீட்டையோ அல்லது வெளிப்புற இணைப்புகளையோ கேட்காது.'
                      : isTelugu
                      ? 'అధికారిక నోటీసు: మీ ఖాతాలో టూ-స్టెప్ వెరిఫికేషన్ ప్రారంభించబడింది. మీరు చేయకపోతే యాప్ సెట్టింగ్స్ మెనూలో మార్చండి. టెలిగ్రామ్ ఎప్పుడూ లాగిన్ కోడ్‌లు లేదా లింక్‌లను అడగదు.'
                      : 'Official Service Notification: Two-step verification was recently enabled for your account. If you did not make this change, please open Settings > Privacy & Security to review active sessions immediately. Telegram never asks for your login codes or sends third-party update links.',
                    timestamp: '02:10 PM'
                  }
                ]
              }
            ]
          },
          clues: {
            isFake: false,
            primaryIndicator: 'Verified official Telegram service channel with blue checkmark and ZERO external links.',
            redFlagsOrSafeguards: [
              'Official verified service notification channel (blue badge).',
              'Golden Rule Followed: Contains NO clickable links or external URLs.',
              'Advises user to inspect native Settings > Privacy & Security.'
            ],
            forensicExplanation: 'Authentic Telegram system notification. Official platform announcements inform users of security events without third-party links or code requests.'
          }
        },
        {
          roundNumber: 3,
          type: 'FAKE',
          title: isTamil ? 'இலவச பிரீமியம் ஏர் டிராப் மோசடி' : 'Free Telegram Premium / Crypto Giveaway Scam',
          scenarioData: {
            scenarioId: `det-tg-r3-${Date.now()}`,
            channel: 'telegram',
            platform: 'telegram_web',
            title: 'Telegram Premium Free Gift',
            contactName: 'Premium Gift Bot 🎁',
            conversations: [
              {
                id: 'tg-conv-3',
                contactName: 'Premium Gift Bot 🎁',
                isVerified: false,
                contact: {
                  name: 'Premium Gift Bot 🎁',
                  subtitle: 'bot',
                  avatar: '🎁',
                  avatarBg: 'bg-amber-600 text-white',
                  status: 'bot',
                  isVerified: false
                },
                messages: [
                  {
                    id: 'tg-m-3',
                    sender: 'contact',
                    senderName: 'Premium Gift Bot',
                    text: isTamil
                      ? 'வாழ்த்துகள்! நீங்கள் 1 வருட இலவச டெலிகிராம் பிரீமியம் பரிசை வென்றுள்ளீர்கள். உடனடியாக செயல்படுத்த உங்கள் வாலட்டை இணைக்கவும்: tele-premium-airdrop.xyz/claim'
                      : isTelugu
                      ? 'అభినందనలు! మీరు 1 సంవత్సరం ఉచిత టెలిగ్రామ్ ప్రీమియం గెలుచుకున్నారు. క్లెయిమ్ చేయడానికి వాలెట్ కనెక్ట్ చేయండి: tele-premium-airdrop.xyz/claim'
                      : 'Congratulations! You won 1 year of Telegram Premium & 500 TON tokens. To activate your gift, connect your TON wallet before it expires: tele-premium-airdrop.xyz/claim',
                    timestamp: '05:30 PM'
                  }
                ]
              }
            ]
          },
          clues: {
            isFake: true,
            primaryIndicator: 'Unverified bot advertising free Telegram Premium and directing to a crypto wallet drainer link.',
            redFlagsOrSafeguards: [
              'Unsolicited bot promise of free expensive services and cryptocurrency.',
              'Artificial urgency ("before it expires").',
              'Directs to suspicious unverified domain (tele-premium-airdrop.xyz).'
            ],
            forensicExplanation: 'Cryptocurrency wallet drainer scam. Fraudulent Telegram bots entice users with free subscriptions to gain unauthorized wallet permissions.'
          }
        }
      ],
      channelCheatSheet: {
        channel: 'telegram',
        whatToLookFor: [
          'Dangerous Executables (.exe / .scr): Piracy channels frequently disguise remote access trojans (RATs) as movie or software downloads.',
          'Blue Channel Verification: Official channels and verified bots display a blue verification badge.',
          'Free Premium / Crypto Airdrops: Unsolicited bots giving away free memberships or tokens are wallet-draining scams.'
        ],
        realMarkers: [
          'Official verified Telegram Service Notifications channel with blue badge',
          'Purely informative security advisory with ZERO external links',
          'Directs user to pre-installed Telegram settings'
        ],
        fakeMarkers: [
          'Disguised .exe or .scr file extensions in public groups',
          'Urgent claims of free Premium memberships requiring external login or wallet link',
          'Unverified bots asking for OTP, passwords, or recovery phrases'
        ]
      }
    };
  } else if (normChannel === 'sms') {
    challengeObj = {
      challengeId: `det-sms-${Date.now()}`,
      scenarioTitle: isTamil
        ? 'வங்கி எஸ்எம்எஸ் உண்மை அல்லது போலி சோதனை'
        : isTelugu
        ? 'బ్యాంక్ SMS నిజమైనదా లేదా నకిలీదా విచారణ'
        : 'Bank SMS Real vs. Fake Triage Challenge',
      channel: 'sms',
      language,
      rounds: [
        {
          roundNumber: 1,
          type: 'FAKE',
          title: isTamil ? 'அவசர கேஒய்சி அப்டேட் மோசடி' : 'Urgent KYC Suspension Alert',
          scenarioData: {
            scenarioId: `det-sms-r1-${Date.now()}`,
            channel: 'sms',
            title: 'Urgent KYC Suspension Alert',
            conversations: [
              {
                id: 'conv-fake-1',
                contactName: '+91 98401 92834',
                phoneNumber: '+91 98401 92834',
                avatar: null,
                messages: [
                  {
                    id: 'm-1',
                    sender: 'attacker',
                    text: isTamil
                      ? 'அவசர எச்சரிக்கை: உங்கள் எஸ்பிஐ வங்கி கணக்கு இன்று இடைநிறுத்தப்படும். உடனே கேஒய்சி சரிபார்க்க: bit.ly/sbi-kyc-fix'
                      : isTelugu
                      ? 'అత్యవసర హెచ్చరిక: మీ బ్యాంక్ ఖాతా ఈ రోజు నిలిపివేయబడుతుంది. వెంటనే ధృవీకరించండి: bit.ly/sbi-kyc-fix'
                      : 'URGENT: Your SBI account will be suspended today due to missing KYC. Update immediately to prevent block: bit.ly/sbi-kyc-fix',
                    timestamp: '10:30 AM'
                  }
                ]
              }
            ]
          },
          clues: {
            isFake: true,
            primaryIndicator: 'Sent from private 10-digit mobile number with suspicious bit.ly link.',
            redFlagsOrSafeguards: [
              'Sender is an unregistered 10-digit mobile number (+91 98401 92834) instead of official alpha-header (e.g. AX-SBIINB).',
              'Threatens immediate suspension within hours to induce panic.',
              'Contains an unverified shortened link (bit.ly) rather than the official domain.'
            ],
            forensicExplanation: 'Classic smishing credential trap. Legitimate banks never threaten immediate closure via regular mobile numbers with URL shorteners.'
          }
        },
        {
          roundNumber: 2,
          type: 'REAL',
          title: isTamil ? 'அதிகாரப்பூர்வ பரிவர்த்தனை எச்சரிக்கை' : 'Official Debit Transaction Alert',
          scenarioData: {
            scenarioId: `det-sms-r2-${Date.now()}`,
            channel: 'sms',
            title: 'Official Debit Transaction Alert',
            conversations: [
              {
                id: 'conv-real-1',
                contactName: 'VM-HDFCBK',
                phoneNumber: 'VM-HDFCBK',
                avatar: null,
                messages: [
                  {
                    id: 'm-2',
                    sender: 'bank',
                    text: isTamil
                      ? 'உங்கள் கணக்கு XX4821 இல் ரூ. 450.00 ஸ்விக்கி மூலம் எடுக்கப்பட்டது. இருப்பு: ரூ. 18,200. நீங்கள் இல்லையென்றால் மொபைல் செயலியில் கார்டை லாக் செய்யவும்.'
                      : isTelugu
                      ? 'మీ ఖాతా XX4821 నుండి రూ. 450.00 స్విగ్గీ ద్వారా డెబిట్ చేయబడింది. బ్యాలెన్స్: రూ. 18,200. మీరు కాకపోతే అధికారిక మొబైల్ యాప్‌లో కార్డు లాక్ చేయండి.'
                      : 'Alert: INR 450.00 debited from A/c XX4821 at SWIGGY on 22-Oct. Bal: INR 18,200. Not you? Lock card immediately in the official MobileBanking App.',
                    timestamp: '01:15 PM'
                  }
                ]
              }
            ]
          },
          clues: {
            isFake: false,
            primaryIndicator: 'Sent from official telecom registered header (VM-HDFCBK) with no external links.',
            redFlagsOrSafeguards: [
              'Official telecom registered banking alpha-header (VM-HDFCBK).',
              'Only quotes masked account digits (A/c XX4821).',
              'Does not provide clickable external links; directs customer to the official mobile app.'
            ],
            forensicExplanation: 'Authentic automated transaction SMS. Banks send alerts informing you of activity without demanding passwords or external link clicks.'
          }
        },
        {
          roundNumber: 3,
          type: 'FAKE',
          title: isTamil ? 'பரிசு கூப்பன் மோசடி' : 'Lottery Reward Phishing SMS',
          scenarioData: {
            scenarioId: `det-sms-r3-${Date.now()}`,
            channel: 'sms',
            title: 'Lottery Reward Phishing SMS',
            conversations: [
              {
                id: 'conv-fake-2',
                contactName: '+91 78912 34509',
                phoneNumber: '+91 78912 34509',
                avatar: null,
                messages: [
                  {
                    id: 'm-3',
                    sender: 'attacker',
                    text: isTamil
                      ? 'வாழ்த்துக்கள்! உங்கள் எண் ரூ. 25,000 ரொக்க பரிசை வென்றுள்ளது. உங்கள் வங்கி விவரங்களை உள்ளிட்டு பெறவும்: prize-claim-portal.xyz'
                      : isTelugu
                      ? 'అభినందనలు! మీ నంబర్ రూ. 25,000 నగదు బహుమతిని గెలుచుకుంది. మీ బ్యాంక్ వివరాలను నమోదు చేయండి: prize-claim-portal.xyz'
                      : 'Congratulations! Your mobile number won INR 25,000 cash reward. Enter bank details to claim before expiry: prize-claim-portal.xyz',
                    timestamp: '03:45 PM'
                  }
                ]
              }
            ]
          },
          clues: {
            isFake: true,
            primaryIndicator: 'Baiting lure promising unsolicited cash prizes to harvest bank details.',
            redFlagsOrSafeguards: [
              'Unsolicited lottery reward for a contest you never entered.',
              'Demands bank account/card details on a suspicious third-party domain (.xyz).',
              'Originates from a private phone number.'
            ],
            forensicExplanation: 'Baiting social engineering scam. Genuine companies never award random unverified prizes requiring bank credentials.'
          }
        }
      ],
      channelCheatSheet: {
        channel: 'sms',
        whatToLookFor: [
          'Check the Sender Header: Genuine Indian banks use 6-character alpha headers (e.g. AX-HDFCBK, VM-SBIINB), never 10-digit mobile numbers.',
          'Inspect Links: Banks rarely include URL shorteners (bit.ly, tinyurl) in urgent messages.',
          'Verify Masking: Real banks only display masked account numbers (e.g. A/c *1234).'
        ],
        realMarkers: [
          'Registered Telecom Alpha-Header',
          'Masked Account Numbers',
          'Directs you to use your pre-installed official mobile app'
        ],
        fakeMarkers: [
          'Sent from personal 10-digit phone number',
          'Shortened links or unverified third-party domains',
          'Urgent threats of immediate account deactivation'
        ]
      }
    };
  } else if (normChannel === 'call') {
    challengeObj = {
      challengeId: `det-call-${Date.now()}`,
      scenarioTitle: isTamil
        ? 'வங்கி அழைப்பு உண்மை அல்லது போலி சோதனை'
        : isTelugu
        ? 'బ్యాంక్ కాల్ నిజమైనదా లేదా నకిలీదా విచారణ'
        : 'Bank Phone Call Real vs. Fake Triage Challenge',
      channel: 'call',
      language,
      rounds: [
        {
          roundNumber: 1,
          type: 'FAKE',
          title: isTamil ? 'அவசர அட்டை மோசடி அழைப்பு' : 'Urgent $1,200 Wire Transfer Imposter Call',
          scenarioData: {
            scenarioId: `det-call-r1-${Date.now()}`,
            channel: 'call',
            title: 'Urgent $1,200 Wire Transfer Imposter Call',
            callData: {
              id: 'call-fake-1',
              callerName: 'Bank Fraud Prevention Dept',
              callerNumber: '+1 (800) 555-0199',
              location: 'Suspected Spoofed Number',
              openingLine: isTamil
                ? 'வணக்கம், உங்கள் கணக்கிலிருந்து இப்போது ரூ. 95,000 பரிமாற்றம் செய்யப்படுகிறது. இதை உடனடியாக ரத்து செய்ய உங்கள் 16 இலக்க அட்டை எண் மற்றும் சிவிவி (CVV) கூறவும்.'
                : isTelugu
                ? 'నమస్కారం, మీ ఖాతా నుండి ప్రస్తుతం రూ. 95,000 బదిలీ అవుతోంది. దీన్ని వెంటనే నిలిపివేయడానికి మీ 16 అంకెల కార్డు నంబర్ మరియు CVV చెప్పండి.'
                : "Hello, this is officer David from your bank's fraud prevention department. Someone is attempting to transfer $1,200 from your account right now. To stop this transaction immediately, I need you to confirm your 16-digit card number and the 3-digit CVV on the back.",
              callerSpeech: "Hello, this is officer David from your bank's fraud prevention department. Someone is attempting to transfer $1,200 from your account right now. To stop this transaction immediately, I need you to confirm your 16-digit card number and the 3-digit CVV on the back.",
              personaContext: 'Fraud imposter creating urgency to harvest card number and CVV over phone.',
              targetInformation: '16-digit card number and CVV'
            }
          },
          clues: {
            isFake: true,
            primaryIndicator: 'Caller demands verbal disclosure of full 16-digit card number and CVV under manufactured panic.',
            redFlagsOrSafeguards: [
              'Demands full 16-digit card number and CVV over the phone to "stop a transaction".',
              'Uses extreme urgency ("transferring $1,200 right now") to manipulate you into acting without thinking.',
              'Official bank fraud departments NEVER ask for your full card number, CVV, or PIN on incoming phone calls.'
            ],
            forensicExplanation: 'Classic vishing attack. Real banks already know your card number and will NEVER ask you to read your 3-digit CVV or card number to stop a fraud attempt.'
          }
        },
        {
          roundNumber: 2,
          type: 'REAL',
          title: isTamil ? 'அதிகாரப்பூர்வ தானியங்கி மோசடி எச்சரிக்கை' : 'Official Automated Fraud Advisory Call',
          scenarioData: {
            scenarioId: `det-call-r2-${Date.now()}`,
            channel: 'call',
            title: 'Official Automated Fraud Advisory Call',
            callData: {
              id: 'call-real-1',
              callerName: 'Chase Automated Fraud Alert',
              callerNumber: '+1 (800) 935-9935',
              location: 'Verified Bank Automated Line',
              openingLine: isTamil
                ? 'இது உங்கள் வங்கியின் தானியங்கி எச்சரிக்கை. அட்டை எண் 4821 இல் சந்தேகத்திற்குரிய கட்டணம் தடுக்கப்பட்டுள்ளது. உங்கள் அதிகாரப்பூர்வ மொபைல் செயலியில் சரிபார்க்கவும். நாங்கள் கடவுச்சொல் கேட்க மாட்டோம்.'
                : isTelugu
                ? 'ఇది మీ బ్యాంక్ ఆటోమేటెడ్ భద్రతా నోటీసు. కార్డు 4821 పై అనుమానాస్పద లావాదేవీ నిలిపివేయబడింది. దయచేసి మీ అధికారిక మొబైల్ యాప్‌లో తనిఖీ చేయండి. మేము పాస్‌వర్డ్ అడగము.'
                : 'This is an automated security advisory from your bank regarding card ending in 4821. An unusual charge of $1,200 was declined. If this was authorized by you, press 1. If not, press 2. For your security, we will never ask for your card number, PIN, or CVV over this call. Please review your account in the official mobile app.',
              callerSpeech: 'This is an automated security advisory from your bank regarding card ending in 4821. An unusual charge of $1,200 was declined. If this was authorized by you, press 1. If not, press 2. For your security, we will never ask for your card number, PIN, or CVV over this call. Please review your account in the official mobile app.',
              personaContext: 'Authentic automated bank notification with zero credential requests.',
              targetInformation: 'No confidential data requested'
            }
          },
          clues: {
            isFake: false,
            primaryIndicator: 'Automated notice quotes only masked digits (ending in 4821) and explicitly refuses to take sensitive credentials.',
            redFlagsOrSafeguards: [
              'Quotes only masked card digits (ending in 4821), not full card numbers.',
              'Explicitly states the bank will NEVER ask for your card number, PIN, or password over the call.',
              'Directs the user to review the declined transaction inside their official mobile banking app independently.'
            ],
            forensicExplanation: 'Authentic automated fraud notification. Legitimate bank automated systems notify you of blocked charges without demanding card numbers or secrets.'
          }
        },
        {
          roundNumber: 3,
          type: 'FAKE',
          title: isTamil ? 'போலி தொழில்நுட்ப ஆதரவு அழைப்பு' : 'Tech Support Workstation Security Lure',
          scenarioData: {
            scenarioId: `det-call-r3-${Date.now()}`,
            channel: 'call',
            title: 'Tech Support Workstation Security Lure',
            callData: {
              id: 'call-fake-2',
              callerName: 'Microsoft Global Security Helpdesk',
              callerNumber: '+1 (888) 412-9082',
              location: 'Unverified Toll-Free Line',
              openingLine: isTamil
                ? 'வணக்கம், உங்கள் கணினியிலிருந்து வைரஸ் பரவுவதை மைக்ரோசாப்ட் கண்டறிந்துள்ளது. உடனே சரிசெய்ய உங்கள் கணினியை தொலைதூரத்தில் இயக்க அனுமதிக்கவும்.'
                : isTelugu
                ? 'నమస్కారం, మీ కంప్యూటర్ నుండి వైరస్ వ్యాపిస్తున్నట్లు మైక్రோசாఫ్ట్ గుర్తించింది. వెంటనే రిమోట్ యాక్సెస్ ఇవ్వండి.'
                : 'Hello, this is Microsoft Security Support. We have detected malicious intrusion attempts originating from your computer network. To prevent your system from being blacklisted, you must install our remote diagnostic utility immediately.',
              callerSpeech: 'Hello, this is Microsoft Security Support. We have detected malicious intrusion attempts originating from your computer network. To prevent your system from being blacklisted, you must install our remote diagnostic utility immediately.',
              personaContext: 'Tech support scammer demanding remote desktop control.',
              targetInformation: 'Remote desktop access and administrator credentials'
            }
          },
          clues: {
            isFake: true,
            primaryIndicator: 'Unsolicited incoming call claiming your computer is infected and demanding remote access.',
            redFlagsOrSafeguards: [
              'Major software companies (Microsoft, Apple, Google) never place unsolicited phone calls to warn of malware.',
              'Demands remote desktop control to install unverified software.',
              'Threatens immediate disconnection to manipulate trainee into compliance.'
            ],
            forensicExplanation: 'Tech support vishing scam. Scammers claim virus infections to trick victims into granting remote desktop control or paying for fraudulent repair services.'
          }
        }
      ],
      channelCheatSheet: {
        channel: 'call',
        whatToLookFor: [
          'Credential Harvesting: Real bank fraud departments NEVER ask for your full 16-digit card number, CVV, OTP, or PIN on incoming calls.',
          'Urgency and Panic: Scammers create intense fear (e.g. "$1,200 leaving your account right now") to disable critical thinking.',
          'Number Spoofing: Incoming caller ID can easily be faked to show your bank name or toll-free number.'
        ],
        realMarkers: [
          'Directs you to check the official mobile banking app or call the number printed on the back of your physical card',
          'Only references masked digits (e.g. card ending in 4821)',
          'Automated notice that does not ask for verbal card numbers or CVV'
        ],
        fakeMarkers: [
          'Demands verbal confirmation of full 16-digit card number or 3-digit CVV',
          'High-pressure claims that funds will be lost unless you act during the call',
          'Unsolicited tech support claiming your computer has viruses and demanding remote access'
        ]
      }
    };
  } else if (normChannel === 'chat') {
    challengeObj = {
      challengeId: `det-chat-${Date.now()}`,
      scenarioTitle: isTamil
        ? 'செய்தி மற்றும் அரட்டை உண்மை அல்லது போலி சோதனை'
        : isTelugu
        ? 'చాట్ నిజమైనదా లేదా నకిలీదా విచారణ'
        : 'Enterprise Chat Real vs. Fake Triage Challenge',
      channel: 'chat',
      language,
      rounds: [
        {
          roundNumber: 1,
          type: 'FAKE',
          title: 'Executive Impersonation Gift Card Lure',
          scenarioData: {
            scenarioId: `det-chat-r1-${Date.now()}`,
            channel: 'chat',
            title: 'Urgent Request from CEO',
            contactName: 'David Miller (CEO)',
            conversations: [
              {
                id: 'chat-fake-1',
                contactName: 'David Miller (CEO)',
                messages: [
                  {
                    id: 'c-1',
                    sender: 'contact',
                    text: 'Hi, are you in the office right now? I am stuck in a high-priority client presentation and need you to purchase 5 Apple gift cards ($100 each) for client rewards. Send photos of the back codes here right away.',
                    timestamp: '11:05 AM'
                  }
                ]
              }
            ]
          },
          clues: {
            isFake: true,
            primaryIndicator: 'Executive impersonation demanding untraceable gift card purchases.',
            redFlagsOrSafeguards: [
              'Executive claims to be stuck in a meeting and unable to speak.',
              'Demands urgent purchase of gift cards with codes sent via chat.',
              'Circumvents standard corporate procurement and expense approval processes.'
            ],
            forensicExplanation: 'CEO fraud / business executive impersonation attack targeting employees with direct requests for untraceable gift cards.'
          }
        },
        {
          roundNumber: 2,
          type: 'REAL',
          title: 'Internal IT Maintenance Announcement',
          scenarioData: {
            scenarioId: `det-chat-r2-${Date.now()}`,
            channel: 'chat',
            title: 'Corporate IT Broadcast',
            contactName: 'IT Operations Bot',
            conversations: [
              {
                id: 'chat-real-1',
                contactName: 'IT Operations Bot',
                messages: [
                  {
                    id: 'c-2',
                    sender: 'contact',
                    text: 'All Teams: Scheduled network maintenance will occur tonight from 10:00 PM to 12:00 AM IST. VPN access will experience brief interruptions. No action or credential verification is required. In accordance with security policy, no links are provided in this message.',
                    timestamp: '02:30 PM'
                  }
                ]
              }
            ]
          },
          clues: {
            isFake: false,
            primaryIndicator: 'Internal system broadcast with zero links and no credential demands.',
            redFlagsOrSafeguards: [
              'Sent from verified internal IT Operations announcement channel.',
              'Golden Rule: Contains NO clickable links or URLs.',
              'Explicitly confirms no passwords or user action are required.'
            ],
            forensicExplanation: 'Authentic internal administrative advisory. Reporting this broadcast would disrupt legitimate operational communications.'
          }
        },
        {
          roundNumber: 3,
          type: 'FAKE',
          title: 'Unsolicited Crypto Investment Pitch',
          scenarioData: {
            scenarioId: `det-chat-r3-${Date.now()}`,
            channel: 'chat',
            title: 'Guaranteed High-Yield Crypto Lure',
            contactName: 'Apex Wealth Trading',
            conversations: [
              {
                id: 'chat-fake-2',
                contactName: 'Apex Wealth Trading',
                messages: [
                  {
                    id: 'c-3',
                    sender: 'contact',
                    text: 'Exclusive Opportunity: Join our automated algorithmic trading pool today and earn 250% weekly returns guaranteed. Connect your personal wallet at apex-yield-crypto.top/connect to claim your $500 bonus.',
                    timestamp: '04:15 PM'
                  }
                ]
              }
            ]
          },
          clues: {
            isFake: true,
            primaryIndicator: 'Unsolicited DM promising unrealistically high guaranteed crypto returns.',
            redFlagsOrSafeguards: [
              'Guarantees impossible investment returns (250% weekly).',
              'Links to an untrusted external web3 domain (.top).',
              'Unsolicited direct message from an unknown third party.'
            ],
            forensicExplanation: 'Crypto wallet drainer scam. The external link requests web3 wallet signatures to siphon funds.'
          }
        }
      ],
      channelCheatSheet: {
        channel: 'chat',
        whatToLookFor: [
          'Verify Sender Identity: Look out for numbers or handles impersonating corporate leadership.',
          'Gift Card Requests: Legitimate companies never instruct staff to buy retail gift cards via chat.',
          'Investment DM Bait: Unsolicited financial offers are almost universally fraudulent.'
        ],
        realMarkers: [
          'Internal company workspace channel bot or verified badge',
          'Zero requests for gift cards or personal wallet connections',
          'Advisory updates without external links'
        ],
        fakeMarkers: [
          'Urgent executive requests for gift cards or wire transfers',
          'Pressure to keep the chat confidential or bypass normal approval',
          'Unsolicited crypto investment opportunities'
        ]
      }
    };
  } else if (normChannel === 'website') {
    challengeObj = {
      challengeId: `det-website-${Date.now()}`,
      scenarioTitle: isTamil
        ? 'வலைத்தள உள்நுழைவு உண்மை அல்லது போலி சோதனை'
        : isTelugu
        ? 'వెబ్‌సైట్ లాగిన్ నిజమైనదా లేదా నకిలీదా విచారణ'
        : 'Web Portal Real vs. Fake Triage Challenge',
      channel: 'website',
      language,
      rounds: [
        {
          roundNumber: 1,
          type: 'FAKE',
          title: 'Typosquatted SSO Login Phishing Portal',
          scenarioData: {
            scenarioId: `det-website-r1-${Date.now()}`,
            channel: 'website',
            title: 'Office 365 Account Verification',
            pages: {
              'page-home': {
                id: 'page-home',
                title: 'Single Sign-On - Security Verification',
                url: 'http://login.microsoftonline-verify.net/sso/login',
                blocks: [
                  { type: 'paragraph', text: 'Your enterprise session has expired. Re-enter your corporate email and master password to maintain network access.' },
                  { type: 'text-input', label: 'Work Email Address', placeholder: 'user@company.com' },
                  { type: 'text-input', label: 'Network Password', placeholder: '••••••••', isPassword: true }
                ]
              }
            }
          },
          clues: {
            isFake: true,
            primaryIndicator: 'Insecure HTTP connection on a typosquatted domain (microsoftonline-verify.net).',
            redFlagsOrSafeguards: [
              'Insecure HTTP connection instead of verified HTTPS.',
              'Typosquatted domain (microsoftonline-verify.net) masquerading as Microsoft.',
              'Form demands corporate single sign-on credentials on an unverified third-party host.'
            ],
            forensicExplanation: 'Credential harvesting website spoofing Microsoft 365 SSO. Legitimate authentication portals always use HTTPS and authentic first-party domains.'
          }
        },
        {
          roundNumber: 2,
          type: 'REAL',
          title: 'Official Corporate Intranet Directory',
          scenarioData: {
            scenarioId: `det-website-r2-${Date.now()}`,
            channel: 'website',
            title: 'Enterprise Staff Directory',
            browserConfig: {
              defaultDomain: 'intranet.company.com',
              securityStatus: 'secure'
            },
            pages: {
              'page-home': {
                id: 'page-home',
                title: 'Corporate Directory & Resources',
                url: 'https://intranet.company.com/directory',
                isTargetPhish: false,
                blocks: [
                  { type: 'paragraph', text: 'Welcome to the Corporate Staff Directory. Search employees by department, office location, or team extension.' },
                  { type: 'text-input', label: 'Search Employee Name or Extension', placeholder: 'e.g. Finance Operations' }
                ]
              }
            }
          },
          clues: {
            isFake: false,
            primaryIndicator: 'Official internal company domain with valid SSL and no credential harvesting.',
            redFlagsOrSafeguards: [
              'Authentic enterprise domain (@company.com) with valid HTTPS.',
              'Standard staff search tool with zero requests for passwords or PINs.',
              'No artificial urgency or countdown timers.'
            ],
            forensicExplanation: 'Authentic internal corporate resource. Flagging this legitimate directory portal as an attack would be a False Positive.'
          }
        },
        {
          roundNumber: 3,
          type: 'FAKE',
          title: 'Fake Telecom Overdue Payment Portal',
          scenarioData: {
            scenarioId: `det-website-r3-${Date.now()}`,
            channel: 'website',
            title: 'Airtel Urgent Bill Payment',
            pages: {
              'page-home': {
                id: 'page-home',
                title: 'Urgent Service Disconnection Warning',
                url: 'http://airtel-quickbill-pay.xyz/settle',
                blocks: [
                  { type: 'paragraph', text: 'Warning: Your broadband connection will be terminated in 15 minutes due to outstanding balance of INR 1,499. Enter your debit/credit card number and CVV to prevent disruption.' },
                  { type: 'text-input', label: '16-Digit Card Number', placeholder: '4111 2222 3333 4444' },
                  { type: 'text-input', label: 'Cardholder Name', placeholder: 'Name on card' },
                  { type: 'text-input', label: 'CVV', placeholder: '•••', isPassword: true }
                ]
              }
            }
          },
          clues: {
            isFake: true,
            primaryIndicator: 'Aggressive 15-minute countdown on suspicious third-party .xyz domain demanding full card data.',
            redFlagsOrSafeguards: [
              'Unverified .xyz domain (airtel-quickbill-pay.xyz) mimicking official telecom provider.',
              'Urgent 15-minute disconnection threat to force reckless entry of payment data.',
              'Directly captures card number and CVV on an unencrypted HTTP connection.'
            ],
            forensicExplanation: 'Financial phishing portal designed to siphon payment card numbers and security codes.'
          }
        }
      ],
      channelCheatSheet: {
        channel: 'website',
        whatToLookFor: [
          'Address Bar Inspection: Check the exact domain before the first single slash (e.g. company.com vs. company-verify.com).',
          'SSL / HTTPS Lock: Insecure HTTP is an immediate indicator of a fraudulent login form.',
          'Credential Traps: Phishing portals demand sensitive passwords or credit card CVVs under urgent deadlines.'
        ],
        realMarkers: [
          'Verified HTTPS with authentic enterprise or bank domain',
          'Standard navigation with privacy policy and official footer',
          'Routine informational content without panic-inducing countdowns'
        ],
        fakeMarkers: [
          'Typosquatted or newly registered domains (.xyz, .top, -verify.com)',
          'Insecure HTTP protocol',
          'Immediate forms demanding passwords, PINs, or CVV to avoid disconnection'
        ]
      }
    };
  } else {
    // Default Email Fallback
    challengeObj = {
      challengeId: `det-email-${Date.now()}`,
      scenarioTitle: isTamil
        ? 'வங்கி மற்றும் ஐடி மின்னஞ்சல் உண்மை அல்லது போலி சோதனை'
        : isTelugu
        ? 'బ్యాంక్ మరియు IT ఇమెయిల్ నిజమైనదా లేదా నకిలీదా విచారణ'
        : 'Corporate Security Real vs. Fake Triage Challenge',
      channel: 'email',
      language,
      rounds: [
        {
          roundNumber: 1,
          type: 'FAKE',
          title: isTamil ? 'கடவுச்சொல் காலாவதி ஃபிஷிங்' : 'Urgent IT Password Expiration Phishing',
          scenarioData: {
            scenarioId: `det-email-r1-${Date.now()}`,
            channel: 'email',
            title: 'Urgent IT Password Expiration Notice',
            emailData: {
              id: 'email-det-1',
              senderName: 'Corporate IT Helpdesk',
              senderEmail: 'helpdesk@corp-support-verify.com',
              date: 'Today, 09:15 AM',
              subject: 'ACTION REQUIRED: Your Office 365 Password Expires in 2 Hours',
              body: isTamil
                ? 'அன்பான பயனரே, உங்கள் மின்னஞ்சல் கடவுச்சொல் இன்று காலாவதியாகிறது. உடனே புதுப்பிக்க கீழே கிளிக் செய்யவும்.'
                : isTelugu
                ? 'ప్రియమైన వినియోగదారు, మీ ఇమెయిల్ పాస్‌వర్డ్ ఈ రోజు ముగుస్తుంది. వెంటనే పునరుద్ధరించడానికి క్రింద క్లిక్ చేయండి.'
                : 'Dear Employee,\n\nYour enterprise single sign-on password will expire in 2 hours. Failure to update will result in termination of your network access.\n\nPlease verify your current password immediately: https://login.microsoftonline.corp-support-verify.com/reset\n\nIT Support Team',
              hasAttachment: false
            }
          },
          clues: {
            isFake: true,
            primaryIndicator: 'Mismatched lookalike external domain (corp-support-verify.com) requesting password verification.',
            redFlagsOrSafeguards: [
              'Sender domain (corp-support-verify.com) is an external spoofed domain, not the internal company domain.',
              'Aggressive artificial deadline ("expires in 2 hours") to create psychological stress.',
              'Direct link pointing to an external subdomain designed to harvest corporate credentials.'
            ],
            forensicExplanation: 'Spear phishing credential harvester. Legitimate IT departments use internal password reset tools and do not host portals on external lookalike domains.'
          }
        },
        {
          roundNumber: 2,
          type: 'REAL',
          title: isTamil ? 'திட்டமிடப்பட்ட பராமரிப்பு அறிவிப்பு' : 'Scheduled IT Maintenance Advisory',
          scenarioData: {
            scenarioId: `det-email-r2-${Date.now()}`,
            channel: 'email',
            title: 'Scheduled Maintenance Notice',
            emailData: {
              id: 'email-det-2',
              senderName: 'Enterprise Infrastructure Team',
              senderEmail: 'it-operations@company.com',
              date: 'Today, 11:30 AM',
              subject: 'Notice: Scheduled Server Maintenance Tonight (11:00 PM - 01:00 AM)',
              body: isTamil
                ? 'அனைத்து ஊழியர்களுக்கும்: இன்று இரவு சர்வர் பராமரிப்பு நடைபெறும். 10:45க்குள் உங்கள் கோப்புகளை சேமிக்கவும். எந்த இணைப்பும் கிளிக் செய்ய வேண்டாம்; கடவுச்சொல் மாற்றம் தேவையில்லை.'
                : isTelugu
                ? 'అందరికీ నోటీసు: ఈ రాత్రి సర్వర్ నిర్వహణ జరుగుతుంది. 10:45 లోపు మీ ఫైల్‌లను సేవ్ చేయండి. ఎటువంటి లింక్‌లను క్లిక్ చేయవద్దు; పాస్‌వర్డ్ మార్పు అవసరం లేదు.'
                : 'All Staff,\n\nPlease be advised that the cloud file servers will undergo routine maintenance tonight from 11:00 PM to 01:00 AM IST.\n\nPlease save all open files before 10:45 PM. No action or credential verification is required. In accordance with strict security standards, no web links are provided in this message.\n\nInfrastructure Operations Team\nCorporate IT Department',
              hasAttachment: false
            }
          },
          clues: {
            isFake: false,
            primaryIndicator: 'Official company domain with ZERO links and clear non-urgent operational guidance.',
            redFlagsOrSafeguards: [
              'Sent from the authentic enterprise domain (@company.com).',
              'Golden Rule Followed: Contains NO clickable links or external URLs. Directs users without sending links.',
              'Explicitly states "No action or credential verification is required".'
            ],
            forensicExplanation: 'Authentic internal administrative advisory. Reporting this email would be a False Positive that disrupts standard IT operations.'
          }
        },
        {
          roundNumber: 3,
          type: 'FAKE',
          title: isTamil ? 'மோசடி கட்டண ரசீது' : 'Fraudulent Invoice Attachment Lure',
          scenarioData: {
            scenarioId: `det-email-r3-${Date.now()}`,
            channel: 'email',
            title: 'Suspicious Invoice Lure',
            emailData: {
              id: 'email-det-3',
              senderName: 'Accounts Payable Dept',
              senderEmail: 'billing@quick-invoice-process.net',
              date: 'Today, 02:45 PM',
              subject: 'OVERDUE: Invoice #INV-88912 Payment Outstanding - Legal Action Pending',
              body: isTamil
                ? 'கவனம்: உங்கள் நிலுவைத் தொகை செலுத்தப்படவில்லை. இணைக்கப்பட்ட ரசீதை திறந்து பார்க்கவும்.'
                : isTelugu
                ? 'శ్రద్ధ: మీ పెండింగ్ చెల్లింపు జరగలేదు. దయచేసి జతచేయబడిన రశీదును తెరిచి చూడండి.'
                : 'Dear Sir/Madam,\n\nWe have not received payment for invoice #INV-88912 totaling $4,320.00. Unless payment is remitted today, this account will be transferred to collections.\n\nPlease review the attached invoice breakdown: Invoice_88912_Overdue.pdf.exe\n\nFinance Operations',
              hasAttachment: true,
              attachmentName: 'Invoice_88912_Overdue.pdf.exe'
            }
          },
          clues: {
            isFake: true,
            primaryIndicator: 'Double file extension (.pdf.exe) concealing an executable malware payload.',
            redFlagsOrSafeguards: [
              'Dangerous double extension (Invoice_88912_Overdue.pdf.exe) masquerading as a PDF document.',
              'Sender is from an unknown external third-party domain (@quick-invoice-process.net).',
              'Threatens legal action and collections on an invoice you have never received.'
            ],
            forensicExplanation: 'Malware delivery attack via attachment lure. Attackers append .pdf.exe to trick victims into executing harmful scripts.'
          }
        }
      ],
      channelCheatSheet: {
        channel: 'email',
        whatToLookFor: [
          'Sender Domain Verification: Inspect the full email address after the @ symbol, not just the display name.',
          'Attachment Extensions: Watch out for hidden executable extensions (.exe, .scr, .iso, .vbs) disguised as PDFs.',
          'Presence of Links: Real security notices and admin alerts never contain login links or credential reset URLs.'
        ],
        realMarkers: [
          'Authentic company domain matching known internal directory',
          'NO clickable links or external URLs provided',
          'Transparent operational updates without demanding passwords'
        ],
        fakeMarkers: [
          'Mismatched or newly registered lookalike domains',
          'Direct links to enter passwords or verify accounts',
          'Executable files masquerading as invoices or receipts'
        ]
      }
    };
  }

  // Uniformly normalize and sanitize all fallback challenge rounds
  challengeObj.rounds = challengeObj.rounds.map((r) => {
    const norm = normalizeRoundScenarioData(r);
    return r.type === 'REAL' ? sanitizeRealCommunication(norm, challengeObj.channel) : norm;
  });

  return challengeObj;
}

/**
 * Generates a 3-round Cyber Detective Challenge via Groq SDK.
 */
export async function generateDetectiveChallenge({
  prompt = '',
  channel = 'auto',
  language = 'auto',
  customGroqClient = null
} = {}) {
  const detectedLang = detectLanguage(prompt, language);
  let resolvedChannel = (channel || 'auto').toLowerCase();
  if (resolvedChannel === 'auto') {
    const lower = prompt.toLowerCase();
    // 1. Specific social messaging and platform-specific channels take precedence over generic keywords
    if (/\b(?:whatsapp|wa|whats\s*app)\b/.test(lower)) resolvedChannel = 'whatsapp';
    else if (/\b(?:instagram|insta|ig(?:\s*dm)?)\b/.test(lower)) resolvedChannel = 'instagram';
    else if (/\b(?:telegram|tg)\b/.test(lower)) resolvedChannel = 'telegram';
    else if (/\b(?:sms|text\s*message|smishing|phone\s*text)\b/.test(lower)) resolvedChannel = 'sms';
    else if (/\b(?:website|portal|login\s*page|webpage|url|phishing\s*link|domain)\b/.test(lower)) resolvedChannel = 'website';
    // 2. Telephone voice calls (must match voice/phone call contexts, NOT "account called X" or "named")
    else if (/\b(?:phone\s*call|voice\s*call|vishing|telephone|incoming\s*call|got\s*a\s*call|received\s*a\s*call|call\s*from|calling\s*me|called\s*me|on\s*the\s*phone|caller)\b/.test(lower)) resolvedChannel = 'call';
    // 3. Generic chat & workplace messaging
    else if (/\b(?:chat|dm|direct\s*message|slack|teams|discord)\b/.test(lower)) resolvedChannel = 'chat';
    else resolvedChannel = 'email';
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey && !customGroqClient) {
    return generateFallbackDetectiveChallenge({ prompt, channel: resolvedChannel, language: detectedLang });
  }

  try {
    const groq = customGroqClient || new Groq({ apiKey });
    const systemPrompt = buildDetectiveSystemPrompt(resolvedChannel, detectedLang);
    const userPrompt = `Create a 3-round Cyber Detective Challenge based on this scenario brief:\n"${prompt || 'Simulate realistic workplace cyber threats and legitimate operational notices'}"\nChannel: ${resolvedChannel}\nLanguage: ${detectedLang}`;

    const activeModel = (process.env.GROQ_MODEL?.trim()) || 'openai/gpt-oss-120b';
    let completion = null;
    let rawContent = null;

    try {
      completion = await groq.chat.completions.create({
        model: activeModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 4096
      });
      rawContent = completion.choices?.[0]?.message?.content;
    } catch (primaryErr) {
      if (primaryErr.status === 400 && (primaryErr.error?.code === 'json_validate_failed' || primaryErr.message?.includes('failed_generation'))) {
        console.warn('[Groq Detective Gen Warning]: Initial JSON validation failed. Retrying with alternate model or prompt repair...');
        
        // Attempt 1: Try with alternate model
        const altModel = activeModel === 'openai/gpt-oss-120b' ? 'openai/gpt-oss-20b' : 'openai/gpt-oss-120b';
        try {
          completion = await groq.chat.completions.create({
            model: altModel,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.05,
            max_tokens: 4096
          });
          rawContent = completion.choices?.[0]?.message?.content;
        } catch (retryModelErr) {
          // Attempt 2: If strict json_object failed, request raw JSON without response_format and repair/parse
          try {
            console.warn('[Groq Detective Gen Warning]: Retrying without strict json_object response_format...');
            completion = await groq.chat.completions.create({
              model: activeModel,
              messages: [
                { role: 'system', content: systemPrompt + '\nCRITICAL REQUIREMENT: Output strictly a single raw valid JSON object. Do NOT include markdown code blocks, preamble, or comments.' },
                { role: 'user', content: userPrompt }
              ],
              temperature: 0.05,
              max_tokens: 4096
            });
            rawContent = completion.choices?.[0]?.message?.content;
          } catch (_) {
            throw primaryErr;
          }
        }
      } else {
        throw primaryErr;
      }
    }

    let parsed = null;
    try {
      parsed = JSON.parse(rawContent || '{}');
    } catch (_) {
      parsed = repairAndParseScenarioJson(rawContent);
    }
    if (!parsed.rounds || !Array.isArray(parsed.rounds) || parsed.rounds.length < 3) {
      throw new Error('Groq generated incomplete rounds for detective challenge');
    }

    const rawRounds = parsed.rounds.slice(0, 3).map((r, idx) => {
      const isReal = (r.type || 'FAKE').toUpperCase() === 'REAL';
      const roundObj = {
        roundNumber: idx + 1,
        type: isReal ? 'REAL' : 'FAKE',
        title: r.title || `Round ${idx + 1} Triage`,
        scenarioData: r.scenarioData || {},
        clues: {
          isFake: !isReal,
          primaryIndicator: r.clues?.primaryIndicator || (isReal ? 'Official authentic communication with NO clickable links.' : 'Examine sender and message indicators carefully.'),
          redFlagsOrSafeguards: Array.isArray(r.clues?.redFlagsOrSafeguards)
            ? r.clues.redFlagsOrSafeguards
            : (isReal ? ['Authentic sender identity', 'Golden Rule: NO clickable links or external URLs', 'Advisory update without requesting credentials'] : ['Check sender identity', 'Check URL destinations', 'Evaluate tone and urgency']),
          forensicExplanation: r.clues?.forensicExplanation || (isReal ? 'Legitimate administrative update with zero credentials or links.' : 'Analyze communication context and indicators.')
        }
      };
      const normalized = normalizeRoundScenarioData(roundObj);
      return isReal ? sanitizeRealCommunication(normalized, parsed.channel || resolvedChannel) : normalized;
    });

    return {
      challengeId: `det-${resolvedChannel}-${Date.now()}`,
      scenarioTitle: parsed.scenarioTitle || `Cyber Detective: ${resolvedChannel.toUpperCase()} Triage Challenge`,
      channel: parsed.channel || resolvedChannel,
      language: parsed.language || detectedLang,
      topic: parsed.topic || prompt,
      rounds: rawRounds,
      channelCheatSheet: parsed.channelCheatSheet || {
        channel: resolvedChannel,
        whatToLookFor: ['Sender address/number', 'Request for credentials', 'Urgency and threats', 'Presence of links (Golden Rule: Real entities do not send login links)'],
        realMarkers: ['Official verified domains', 'NO clickable links or external URLs', 'No credential harvesting'],
        fakeMarkers: ['Lookalike domains', 'Direct demands for sensitive data', 'Urgent links or shortened URLs']
      }
    };
  } catch (err) {
    console.warn('[Groq Detective Gen Warning, Falling back to local template]:', err.message);
    return generateFallbackDetectiveChallenge({ prompt, channel: resolvedChannel, language: detectedLang });
  }
}

/**
 * Scores a completed 3-round Cyber Detective Challenge.
 * 
 * Rules:
 * - REAL + "legitimate" -> Correct (+30 pts)
 * - FAKE + "attack"     -> Correct (+30 pts)
 * - FAKE + "legitimate" -> Compromised (0 pts)
 * - REAL + "attack"     -> False Positive (+10 pts partial credit)
 * - 3 / 3 Correct       -> Sweep Bonus (+10 pts) -> Max 100/100
 */
export function scoreDetectiveChallenge({
  challengeId = `det-${Date.now()}`,
  channel = 'email',
  scenarioTitle = 'Cyber Detective Challenge',
  rounds = [],
  answers = [] // [ { roundNumber: 1, userVerdict: 'legitimate' | 'attack' } ]
} = {}) {
  const roundBreakdowns = [];
  let correctCount = 0;
  let totalScore = 0;
  let falseAlarmsCount = 0;
  let attacksCompromisedCount = 0;
  let attacksCaughtCount = 0;
  let totalFake = 0;
  let totalReal = 0;

  for (let i = 0; i < rounds.length; i++) {
    const round = rounds[i];
    const roundNum = round.roundNumber || i + 1;
    const answer = answers.find((a) => a.roundNumber === roundNum) || {};
    const userVerdict = (answer.userVerdict || '').toLowerCase().trim(); // 'legitimate' | 'attack'
    const isReal = round.type === 'REAL';
    const isFake = round.type === 'FAKE';

    if (isFake) totalFake++;
    if (isReal) totalReal++;

    let isCorrect = false;
    let verdictResult = 'incorrect'; // 'correct' | 'compromised' | 'false_positive'
    let pointsAwarded = 0;

    if (isFake && userVerdict === 'attack') {
      isCorrect = true;
      verdictResult = 'correct';
      pointsAwarded = 30;
      correctCount++;
      attacksCaughtCount++;
    } else if (isReal && userVerdict === 'legitimate') {
      isCorrect = true;
      verdictResult = 'correct';
      pointsAwarded = 30;
      correctCount++;
    } else if (isFake && userVerdict === 'legitimate') {
      isCorrect = false;
      verdictResult = 'compromised';
      pointsAwarded = 0;
      attacksCompromisedCount++;
    } else if (isReal && userVerdict === 'attack') {
      isCorrect = false;
      verdictResult = 'false_positive';
      pointsAwarded = 10; // partial credit for caution
      falseAlarmsCount++;
    }

    totalScore += pointsAwarded;

    roundBreakdowns.push({
      roundNumber: roundNum,
      title: round.title || `Round ${roundNum}`,
      type: round.type,
      userVerdict: userVerdict || 'unanswered',
      isCorrect,
      verdictResult,
      pointsAwarded,
      clues: round.clues || {}
    });
  }

  // Sweep bonus for getting all 3 correct
  let sweepBonus = 0;
  if (correctCount === rounds.length && rounds.length > 0) {
    sweepBonus = 10;
    totalScore += sweepBonus;
  }

  const finalScore = Math.max(0, Math.min(100, Math.round(totalScore)));

  // Determine Badge & Risk Level
  let badgeTitle = 'High Vulnerability';
  let badgeClass = 'critical';
  let badgeDescription = 'Fell for multiple deceptive lures. High risk of security compromise.';

  if (finalScore >= 90) {
    badgeTitle = 'Master Cyber Detective';
    badgeClass = 'master';
    badgeDescription = 'Exceptional security instincts! Correctly triaged all communications with zero false alarms.';
  } else if (finalScore >= 70) {
    badgeTitle = 'Proficient Security Analyst';
    badgeClass = 'proficient';
    badgeDescription = 'Strong threat awareness. Good discrimination between attacks and legitimate requests.';
  } else if (finalScore >= 40) {
    badgeTitle = 'Cautious Defender';
    badgeClass = 'cautious';
    badgeDescription = 'Demonstrated defensive caution, but missed key indicators or produced false alarms.';
  }

  return {
    challengeId,
    scenarioTitle,
    channel,
    score: finalScore,
    maxScore: 100,
    correctCount,
    totalRounds: rounds.length,
    accuracyPercentage: Math.round((correctCount / (rounds.length || 1)) * 100),
    sweepBonus,
    badge: {
      title: badgeTitle,
      class: badgeClass,
      description: badgeDescription
    },
    metrics: {
      attacksCaught: attacksCaughtCount,
      totalAttacks: totalFake,
      attacksCompromised: attacksCompromisedCount,
      falseAlarms: falseAlarmsCount,
      totalLegitimate: totalReal
    },
    roundBreakdowns,
    evaluatedAt: new Date().toISOString()
  };
}
