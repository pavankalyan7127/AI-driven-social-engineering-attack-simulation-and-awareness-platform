import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';

// Set test environment variable
process.env.GROQ_API_KEY = 'gsk_test_mock_key';
process.env.GROQ_MODEL = 'openai/gpt-oss-20b';

const mockCreate = vi.fn();

vi.mock('groq-sdk', () => {
  return {
    default: class MockGroq {
      constructor() {
        this.chat = {
          completions: {
            create: mockCreate
          }
        };
      }
    }
  };
});

// Import app after mocking
const { default: app } = await import('../src/app.js');

const sampleValidScenarios = {
  email: {
    scenarioId: 'test-email-01',
    channel: 'email',
    title: 'Suspicious Account Login',
    description: 'Spear phishing attempt targeting credentials',
    category: 'Credential Harvesting',
    difficulty: 'Medium',
    initialView: 'inbox',
    targetId: 'email-target-1',
    emailData: {
      id: 'email-target-1',
      isTarget: true,
      sender: { name: 'IT Security', email: 'security@company-verify.com' },
      subject: 'Password Reset Alert',
      contentBlocks: [
        { type: 'paragraph', text: 'Someone attempted to log into your account.' },
        { type: 'button', text: 'Verify Identity', url: 'https://company-verify.com' }
      ]
    },
    inboxMessages: []
  },
  chat: {
    scenarioId: 'test-chat-01',
    channel: 'chat',
    title: 'Urgent Helpdesk Support Request',
    description: 'Impersonation attack via internal corporate chat',
    category: 'Chat Impersonation',
    difficulty: 'Medium',
    initialView: 'list',
    targetId: 'chat-target-1',
    conversations: [
      {
        id: 'chat-target-1',
        isTarget: true,
        contact: { name: 'Help Desk Specialist', handle: '@helpdesk' },
        messages: [
          { id: 'm1', sender: 'them', text: 'Please send your one-time verification passcode.' }
        ]
      }
    ]
  },
  sms: {
    scenarioId: 'test-sms-01',
    channel: 'sms',
    title: 'Bank Fraud Alert',
    description: 'Smishing attack impersonating bank fraud detection team',
    category: 'Smishing',
    difficulty: 'Easy',
    initialView: 'list',
    targetId: 'sms-target-1',
    conversations: [
      {
        id: 'sms-target-1',
        isTarget: true,
        sender: { name: 'Bank Security', phoneNumber: '+18005550199' },
        messages: [
          { id: 's1', sender: 'them', text: 'Unusual charge detected. Tap link to confirm or deny.' }
        ]
      }
    ]
  },
  website: {
    scenarioId: 'test-web-01',
    channel: 'website',
    title: 'Enterprise Login Clone',
    description: 'Cloned university portal login page',
    category: 'Credential Harvesting',
    difficulty: 'Medium',
    browserConfig: {
      initialUrl: 'https://auth-portal.verify-acct.net/login',
      securityStatus: 'secure'
    },
    pages: [
      {
        id: 'page-login',
        url: 'https://auth-portal.verify-acct.net/login',
        title: 'Single Sign-On',
        layout: 'login-style',
        blocks: [
          { type: 'heading', content: 'Sign In to Your Account' },
          { type: 'text-input', label: 'User ID', placeholder: 'Enter your ID' },
          { type: 'button', label: 'Sign In', actionId: 'btn-login' }
        ]
      }
    ]
  }
};

describe('POST /api/scenarios/generate - AI Scenario Generation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GROQ_API_KEY = 'gsk_test_mock_key';
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify(sampleValidScenarios.email)
          }
        }
      ]
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // 1. Prompt Validation Tests
  describe('Prompt Validation', () => {
    it('rejects empty or missing prompt', async () => {
      const res = await request(app)
        .post('/api/scenarios/generate')
        .send({ channel: 'email' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/prompt is required/i);
    });

    it('rejects whitespace-only prompt', async () => {
      const res = await request(app)
        .post('/api/scenarios/generate')
        .send({ prompt: '    ', channel: 'email' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/prompt is required/i);
    });

    it('rejects prompt that is too short (< 5 characters)', async () => {
      const res = await request(app)
        .post('/api/scenarios/generate')
        .send({ prompt: 'test', channel: 'email' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/too short/i);
    });

    it('rejects prompt that is too long (> 2000 characters)', async () => {
      const longPrompt = 'a'.repeat(2001);
      const res = await request(app)
        .post('/api/scenarios/generate')
        .send({ prompt: longPrompt, channel: 'email' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/exceeds maximum limit/i);
    });
  });

  // 2. Channel Validation Tests
  describe('Channel Validation', () => {
    it('accepts omitted channel and predicts channel automatically', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify(sampleValidScenarios.email)
            }
          }
        ]
      });

      const res = await request(app)
        .post('/api/scenarios/generate')
        .send({ prompt: 'Create a password reset spear phishing attack' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.scenario.channel).toBe('email');
    });

    it('rejects invalid or unsupported channel', async () => {
      const res = await request(app)
        .post('/api/scenarios/generate')
        .send({ prompt: 'Create a phishing attack', channel: 'discord' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/unsupported channel/i);
    });

    it('accepts all 4 valid channels (email, chat, sms, website)', async () => {
      for (const ch of ['email', 'chat', 'sms', 'website']) {
        mockCreate.mockResolvedValueOnce({
          choices: [{ message: { content: JSON.stringify(sampleValidScenarios[ch]) } }]
        });

        const res = await request(app)
          .post('/api/scenarios/generate')
          .send({ prompt: `Create an authentic ${ch} scenario`, channel: ch });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.scenario.channel).toBe(ch);
      }
    });
  });

  // 3. API Key Handling Tests
  describe('API Key Handling', () => {
    it('returns 503 when GROQ_API_KEY is not configured', async () => {
      const originalKey = process.env.GROQ_API_KEY;
      delete process.env.GROQ_API_KEY;

      const res = await request(app)
        .post('/api/scenarios/generate')
        .send({ prompt: 'Simulate an urgent password update email', channel: 'email' });

      process.env.GROQ_API_KEY = originalKey;

      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/GROQ_API_KEY is not configured/i);
    });
  });

  // 4. Schema Validation Tests
  describe('Schema Validation', () => {
    it('rejects malformed JSON from model with 422', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: 'not-valid-json { [ "broken"' } }]
      });

      const res = await request(app)
        .post('/api/scenarios/generate')
        .send({ prompt: 'Generate an urgent email', channel: 'email' });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/malformed json/i);
    });

    it('rejects valid JSON that fails channel schema validation with 422 and details', async () => {
      // Missing emailData
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                scenarioId: 'test-broken',
                channel: 'email',
                title: 'Broken Email'
                // Missing emailData
              })
            }
          }
        ]
      });

      const res = await request(app)
        .post('/api/scenarios/generate')
        .send({ prompt: 'Generate an email scenario', channel: 'email' });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/failed schema validation/i);
      expect(res.body.validationErrors).toBeDefined();
    });
  });

  // 5. Image Upload Validation Tests
  describe('Image Upload Validation', () => {
    it('rejects unsupported image MIME types', async () => {
      const res = await request(app)
        .post('/api/scenarios/generate')
        .field('prompt', 'Generate email from image')
        .field('channel', 'email')
        .attach('images', Buffer.from('fake pdf data'), {
          filename: 'document.pdf',
          contentType: 'application/pdf'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/unsupported image type/i);
    });

    it('rejects files larger than 5MB', async () => {
      const largeBuffer = Buffer.alloc(5 * 1024 * 1024 + 1024); // 5MB + 1KB
      const res = await request(app)
        .post('/api/scenarios/generate')
        .field('prompt', 'Generate email from image')
        .field('channel', 'email')
        .attach('images', largeBuffer, {
          filename: 'giant.png',
          contentType: 'image/png'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/file size exceeds/i);
    });

    it('rejects more than 3 reference images', async () => {
      const smallBuffer = Buffer.from('mock image');
      const res = await request(app)
        .post('/api/scenarios/generate')
        .field('prompt', 'Generate email from image')
        .field('channel', 'email')
        .attach('images', smallBuffer, { filename: 'img1.png', contentType: 'image/png' })
        .attach('images', smallBuffer, { filename: 'img2.png', contentType: 'image/png' })
        .attach('images', smallBuffer, { filename: 'img3.png', contentType: 'image/png' })
        .attach('images', smallBuffer, { filename: 'img4.png', contentType: 'image/png' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/maximum 3 reference images/i);
    });

    it('accepts 1 to 3 valid images (PNG, JPEG, WebP) and includes vision limitation notice', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(sampleValidScenarios.website) } }]
      });

      const pngBuffer = Buffer.from('mock png');
      const jpgBuffer = Buffer.from('mock jpg');

      const res = await request(app)
        .post('/api/scenarios/generate')
        .field('prompt', 'Generate realistic website login from screenshots')
        .field('channel', 'website')
        .attach('images', pngBuffer, { filename: 'screen1.png', contentType: 'image/png' })
        .attach('images', jpgBuffer, { filename: 'screen2.jpeg', contentType: 'image/jpeg' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.imageAnalysis).toBeDefined();
      expect(res.body.imageAnalysis.processed).toBe(false);
      expect(res.body.imageAnalysis.notice).toMatch(/no legible text|could not be processed/i);
    });
  });

  // 6. Provider Error Handling Tests
  describe('Provider Errors', () => {
    it('returns 502 when Groq API communication fails or throws', async () => {
      mockCreate.mockRejectedValueOnce(new Error('Rate limit exceeded or provider unavailable'));

      const res = await request(app)
        .post('/api/scenarios/generate')
        .send({ prompt: 'Simulate a phishing email', channel: 'email' });

      expect(res.status).toBe(502);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/AI generation service error/i);
    });
  });

  // 7. Website Scenario Generation & JSON Repair Regressions
  describe('Website Scenario Generation & JSON Repair Regressions', () => {
    const validWebsiteScenario = {
      scenarioId: 'scen-web-reg-01',
      channel: 'website',
      title: 'University Portal Re-authentication',
      description: 'Simulated credential harvesting portal',
      category: 'Website Phishing',
      difficulty: 'Medium',
      initialPageId: 'page-login',
      targetId: 'page-login',
      browserConfig: {
        siteTitle: 'Campus Single Sign-On',
        defaultDomain: 'login-campus-verify.edu.portal-auth.com',
        securityStatus: 'unsecured'
      },
      attackClassification: {
        primaryType: 'credential_phishing',
        secondaryTechniques: ['impersonation', 'urgency_manipulation'],
        rationale: 'Spoofed university login interface harvesting authentication credentials.'
      },
      terminationRules: {
        observationWindowSeconds: 120,
        positiveConditions: [
          {
            id: 'rule_pos_threat_report',
            trigger: 'explicit_user_action',
            eventType: 'threat_reported',
            points: 30,
            label: 'Reported Phishing Attack',
            explanation: 'User identified the fraudulent domain and reported the portal to security.'
          }
        ],
        negativeConditions: [
          {
            id: 'rule_neg_credential_submit',
            trigger: 'event',
            eventType: 'simulated_form_submitted',
            points: 35,
            label: 'Submitted Credentials',
            explanation: 'User entered credentials into an unverified third-party site.'
          }
        ]
      },
      pages: {
        'page-login': {
          id: 'page-login',
          title: 'University Login',
          url: 'https://login-campus-verify.edu.portal-auth.com/login',
          layout: 'login-style',
          isTargetPhish: true,
          blocks: [
            { type: 'heading', text: 'Campus Identity Provider' },
            { type: 'paragraph', text: 'Enter your network credentials to continue.' },
            { type: 'text-input', id: 'username-field', label: 'Student ID', placeholder: 's123456' },
            { type: 'text-input', id: 'password-field', isMasked: true, label: 'Password', placeholder: '••••••••' },
            { type: 'button', label: 'Log In', targetPageId: 'page-complete' }
          ]
        },
        'page-complete': {
          id: 'page-complete',
          title: 'Verification Complete',
          url: 'https://login-campus-verify.edu.portal-auth.com/complete',
          layout: 'account-verification',
          isTargetPhish: false,
          blocks: [
            { type: 'heading', text: 'Credentials Submitted' },
            { type: 'paragraph', text: 'Your account is being synchronized.' }
          ]
        }
      }
    };

    it('generates a valid multi-page website scenario with simulated login form', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify(validWebsiteScenario)
            }
          }
        ]
      });

      const res = await request(app)
        .post('/api/scenarios/generate')
        .send({ prompt: 'Simulate university portal credential harvesting', channel: 'website' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.scenario.channel).toBe('website');
      expect(res.body.scenario.pages).toBeDefined();
      expect(res.body.scenario.pages['page-login']).toBeDefined();
      expect(res.body.scenario.pages['page-complete']).toBeDefined();
      expect(res.body.scenario.attackClassification.primaryType).toBe('credential_phishing');
      expect(res.body.scenario.terminationRules.positiveConditions).toHaveLength(1);
      expect(res.body.scenario.terminationRules.negativeConditions).toHaveLength(1);
    });

    it('salvages provider json_validate_failed error when failed_generation contains rogue page syntax', async () => {
      // Simulate Groq throwing json_validate_failed with defect pattern: `, { "page-apply": ... }}`
      const rogueFailedGen = `{
        "scenarioId": "scen-web-salvaged-01",
        "channel": "website",
        "title": "Recruitment Portal Verification",
        "description": "Simulated job portal credential capture",
        "category": "Credential Harvesting",
        "difficulty": "Medium",
        "initialPageId": "page-login",
        "targetId": "page-login",
        "browserConfig": {
          "siteTitle": "Careers Apex",
          "defaultDomain": "apex-careers.com",
          "securityStatus": "unsecured"
        },
        "attackClassification": {
          "primaryType": "credential_phishing",
          "secondaryTechniques": ["impersonation"],
          "rationale": "Impersonates corporate recruitment to capture candidate credentials."
        },
        "terminationRules": {
          "observationWindowSeconds": 180,
          "positiveConditions": [
            {
              "id": "rule_pos_salvage",
              "trigger": "explicit_user_action",
              "eventType": "threat_reported",
              "points": 30,
              "label": "Report Threat",
              "explanation": "User detected fraudulent portal."
            }
          ],
          "negativeConditions": [
            {
              "id": "rule_neg_salvage",
              "trigger": "event",
              "eventType": "simulated_form_submitted",
              "points": 30,
              "label": "Submit Application",
              "explanation": "User entered sensitive credentials."
            }
          ]
        },
        "pages": {
          "page-login": {
            "id": "page-login",
            "title": "Candidate Sign-in",
            "url": "https://apex-careers.com/login",
            "layout": "login-style",
            "isTargetPhish": true,
            "blocks": [
              { "type": "heading", "text": "Welcome Candidate" },
              { "type": "text-input", "id": "email-field", "label": "Email Address" },
              { "type": "text-input", "id": "pwd-field", "isMasked": true, "label": "Password" },
              { "type": "button", "label": "Continue", "targetPageId": "page-apply" }
            ]
          }, {
          "page-apply": {
            "id": "page-apply",
            "title": "Application Form",
            "url": "https://apex-careers.com/apply",
            "layout": "account-verification",
            "isTargetPhish": false,
            "blocks": [
              { "type": "heading", "text": "Application In Review" }
            ]
          }
        }}`;

      const groqError = new Error("Failed to generate JSON. Please adjust your prompt. See 'failed_generation' for more details.");
      groqError.status = 400;
      groqError.error = {
        type: 'invalid_request_error',
        code: 'json_validate_failed',
        message: "Failed to generate JSON. Please adjust your prompt. See 'failed_generation' for more details.",
        failed_generation: rogueFailedGen
      };

      mockCreate.mockRejectedValueOnce(groqError);

      const res = await request(app)
        .post('/api/scenarios/generate')
        .send({ prompt: 'Recruitment portal phishing scenario', channel: 'website' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.scenario.scenarioId).toBe('scen-web-salvaged-01');
      expect(res.body.scenario.channel).toBe('website');
      expect(res.body.scenario.pages['page-login']).toBeDefined();
      expect(res.body.scenario.pages['page-apply']).toBeDefined();
    });

    it('rejects website scenario with invalid page reference (button with nonexistent targetPageId)', async () => {
      const invalidPageScenario = JSON.parse(JSON.stringify(validWebsiteScenario));
      invalidPageScenario.pages['page-login'].blocks[4].targetPageId = 'page-nonexistent';

      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify(invalidPageScenario)
            }
          }
        ]
      });

      const res = await request(app)
        .post('/api/scenarios/generate')
        .send({ prompt: 'Simulate broken website links', channel: 'website' });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/targetPageId "page-nonexistent"/i);
    });

    it('rejects website scenario with malformed form field (non-string id)', async () => {
      const invalidFieldScenario = JSON.parse(JSON.stringify(validWebsiteScenario));
      invalidFieldScenario.pages['page-login'].blocks[2].id = 12345; // invalid non-string id

      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify(invalidFieldScenario)
            }
          }
        ]
      });

      const res = await request(app)
        .post('/api/scenarios/generate')
        .send({ prompt: 'Simulate invalid form website', channel: 'website' });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/has invalid "id"/i);
    });

    it('returns a clean error message without leaking raw JSON when unrecoverable JSON failure occurs', async () => {
      const completelyBrokenError = new Error('400 Failed to generate JSON. {"failed_generation": "definitely not salvageable [}{"}');
      completelyBrokenError.status = 400;
      completelyBrokenError.error = {
        type: 'invalid_request_error',
        code: 'json_validate_failed',
        failed_generation: 'definitely not salvageable [}{'
      };

      // Mock both initial call and retry to fail
      mockCreate.mockRejectedValueOnce(completelyBrokenError);
      mockCreate.mockRejectedValueOnce(completelyBrokenError);

      const res = await request(app)
        .post('/api/scenarios/generate')
        .send({ prompt: 'Trigger unrecoverable error', channel: 'website' });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      // Clean error without raw failed_generation or API key leak
      expect(res.body.error).toBe('Website scenario generation failed validation. Please retry.');
      expect(res.body.error).not.toMatch(/failed_generation/i);
      expect(res.body.error).not.toMatch(/definitely not salvageable/i);
    });
  });

  // 8. Health Check
  describe('Health check', () => {
    it('returns 200 on /api/health', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  // 9. Voice Call Dynamic Dialogue & Speech Analysis
  describe('POST /api/scenarios/call/respond', () => {
    it('analyzes user speech and returns attacker dialogue with sensitive info detection', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                attackerSpeech: "Thank you, your card is verified.",
                sensitiveInfoDisclosed: true,
                explanation: "User revealed credit card number"
              })
            }
          }
        ]
      });

      const res = await request(app)
        .post('/api/scenarios/call/respond')
        .send({
          userSpeech: "My card number is 4231 5555 8888 1234",
          callerName: "Chase Fraud Prevention",
          targetInformation: "credit card number"
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.sensitiveInfoDisclosed).toBe(true);
      expect(res.body.attackerSpeech).toBe("Thank you, your card is verified.");
    });

    it('returns 400 when userSpeech is missing', async () => {
      const res = await request(app)
        .post('/api/scenarios/call/respond')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});
