/**
 * Sample Scenario data for Website Simulation
 * Channel: Website / Virtual Browser
 * Scenario: Spoofed Institutional Portal Credential & MFA Harvesting Page
 */

export const sampleWebsiteScenario = {
  scenarioId: "scen-web-vtop-spoof-001",
  sessionId: "sess-web-sim-6621",
  targetId: "page-portal-login",
  title: "Spoofed Student Portal Credential Harvesting Website",
  description: "A simulated credential-harvesting phishing site hosted on a lookalike domain (secure-verify-student.info) masquerading as the institutional authentication portal.",
  channel: "website",
  category: "Website Phishing / Credential Harvesting",
  difficulty: "Medium",
  initialPageId: "page-portal-login",
  attackClassification: {
    primaryType: "credential_phishing",
    secondaryTechniques: ["watering_hole", "urgency_manipulation"],
    rationale: "Spoofed institutional portal hosted on lookalike domain prompting user to enter credentials and simulated MFA."
  },
  terminationRules: {
    positiveRules: [
      {
        trigger: "event",
        eventType: "user_reported_page",
        scoreAdjustment: 25,
        reason: "User flagged spoofed login portal as fraudulent credential harvester."
      },
      {
        trigger: "observation_window_elapsed",
        timeWindowSeconds: 120,
        scoreAdjustment: 15,
        reason: "User inspected simulated website without entering credentials into fraudulent form."
      }
    ],
    negativeRules: [
      {
        trigger: "event",
        eventType: "simulated_form_submitted",
        scoreAdjustment: -35,
        reason: "User submitted credentials into fake university single sign-on form."
      }
    ]
  },
  browserConfig: {
    siteTitle: "V-TOP Student Portal - Single Sign On",
    defaultDomain: "vtop-auth-portal.secure-verify-student.info",
    securityStatus: "unsecured", // 'secure' | 'unsecured' | 'warning'
    securityNotice: "Not Secure — Domain differs from official institutional root (vit.ac.in)"
  },
  pages: {
    "page-portal-login": {
      id: "page-portal-login",
      title: "V-TOP Single Sign On - Authentication Required",
      url: "https://vtop-auth-portal.secure-verify-student.info/auth/login",
      layout: "login-style",
      isTargetPhish: true,
      blocks: [
        {
          type: "heading",
          level: 2,
          text: "Student & Faculty Portal Login"
        },
        {
          type: "notice",
          level: "warning",
          title: "Mandatory Security Verification",
          text: "Due to abnormal access attempts, you must re-authenticate your credentials to prevent temporary suspension of course registration access."
        },
        {
          type: "paragraph",
          text: "Please enter your university credentials below to proceed with two-factor validation."
        },
        {
          type: "text-input",
          id: "field-username",
          label: "Registration Number / Username",
          placeholder: "e.g. 23BCE1024 or staff ID",
          required: true
        },
        {
          type: "text-input",
          id: "field-password",
          label: "Portal Passcode / Password",
          placeholder: "Enter current password (training field)",
          isMasked: true,
          required: true
        },
        {
          type: "checkbox",
          id: "chk-remember",
          label: "Keep me signed in for 30 days on this device",
          defaultChecked: false
        },
        {
          type: "button",
          id: "btn-login-submit",
          label: "Verify & Continue",
          variant: "primary",
          actionId: "action_submit_login_credentials",
          targetPageId: "page-mfa-challenge"
        },
        {
          type: "divider"
        },
        {
          type: "simulated-link",
          id: "lnk-helpdesk-info",
          text: "Having trouble signing in? View IT Security Advisory",
          targetPageId: "page-security-advisory"
        }
      ]
    },
    "page-mfa-challenge": {
      id: "page-mfa-challenge",
      title: "Two-Factor Authentication Challenge",
      url: "https://vtop-auth-portal.secure-verify-student.info/auth/mfa-challenge",
      layout: "account-verification",
      isTargetPhish: true,
      blocks: [
        {
          type: "heading",
          level: 2,
          text: "Two-Factor Verification Required"
        },
        {
          type: "paragraph",
          text: "A 6-digit confirmation code was dispatched to your registered mobile device ending in *5678."
        },
        {
          type: "notice",
          level: "info",
          title: "Session Expiration",
          text: "This security challenge will expire in 04:59 minutes."
        },
        {
          type: "text-input",
          id: "field-otp",
          label: "6-Digit Authentication Code (OTP)",
          placeholder: "Enter 6-digit code (simulated)",
          required: true
        },
        {
          type: "button",
          id: "btn-otp-submit",
          label: "Submit & Complete Verification",
          variant: "primary",
          actionId: "action_submit_mfa_code",
          targetPageId: "page-result-success"
        },
        {
          type: "button",
          id: "btn-back-login",
          label: "Cancel & Return to Login",
          variant: "secondary",
          targetPageId: "page-portal-login"
        }
      ]
    },
    "page-security-advisory": {
      id: "page-security-advisory",
      title: "IT Infrastructure Security Advisory",
      url: "https://vtop-auth-portal.secure-verify-student.info/help/advisory",
      layout: "security-warning",
      isTargetPhish: false,
      blocks: [
        {
          type: "heading",
          level: 2,
          text: "Institutional IT Security Guidelines"
        },
        {
          type: "paragraph",
          text: "Notice to all students: The university IT department will never ask you to verify passwords via unsolicited SMS or unofficial third-party domains."
        },
        {
          type: "card",
          title: "Official Domains Reference",
          content: "Always ensure the URL in your browser bar ends strictly in .vit.ac.in before entering single sign-on credentials."
        },
        {
          type: "button",
          id: "btn-return-login",
          label: "Back to Login Portal",
          variant: "primary",
          targetPageId: "page-portal-login"
        }
      ]
    },
    "page-result-success": {
      id: "page-result-success",
      title: "Verification Complete - Portal Synced",
      url: "https://vtop-auth-portal.secure-verify-student.info/auth/confirmed",
      layout: "confirmation",
      isTargetPhish: true,
      blocks: [
        {
          type: "heading",
          level: 2,
          text: "Credential Verification Completed"
        },
        {
          type: "notice",
          level: "success",
          title: "Access Restored",
          text: "Your student credentials and session tokens have been synchronized with the directory services."
        },
        {
          type: "paragraph",
          text: "You may now safely close this window or return to the main dashboard."
        },
        {
          type: "button",
          id: "btn-done",
          label: "Finish Simulation Review",
          variant: "secondary",
          targetPageId: "page-portal-login"
        }
      ]
    }
  }
};
