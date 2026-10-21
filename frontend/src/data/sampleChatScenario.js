/**
 * Sample Scenario data for Chat Simulation
 * Channel: Chat / Messaging
 * Scenario: Impersonated IT Support MFA Verification & Malicious Link/Attachment Attack
 */

export const sampleChatScenario = {
  scenarioId: "scen-chat-it-support-001",
  sessionId: "sess-chat-sim-9912",
  targetId: "conv-it-desk-urgent",
  title: "IT Support Impersonation & Credential Harvesting Simulation",
  description: "A simulated spear-phishing / smishing chat interaction where an external attacker impersonates enterprise IT support to solicit urgent credential verification.",
  channel: "chat",
  category: "Chat Impersonation / Credential Phishing",
  difficulty: "Medium",
  initialView: "list", // 'list' or 'chat'
  attackClassification: {
    primaryType: "impersonation",
    secondaryTechniques: ["urgency_manipulation", "credential_phishing"],
    rationale: "Attacker impersonates enterprise IT support via direct chat, citing abnormal logins and imposing urgent credential verification."
  },
  terminationRules: {
    positiveRules: [
      {
        trigger: "event",
        eventType: "user_reported_chat",
        scoreAdjustment: 25,
        reason: "User identified IT support impersonation in chat and reported contact."
      },
      {
        trigger: "observation_window_elapsed",
        timeWindowSeconds: 90,
        scoreAdjustment: 15,
        reason: "User observed chat without disclosing credentials or downloading payload."
      }
    ],
    negativeRules: [
      {
        trigger: "event",
        eventType: "chat_link_clicked",
        scoreAdjustment: -25,
        reason: "User clicked suspicious emergency verification link in external chat."
      },
      {
        trigger: "event",
        eventType: "chat_attachment_downloaded",
        scoreAdjustment: -30,
        reason: "User downloaded untrusted security report attachment in external chat."
      }
    ]
  },
  userProfile: {
    name: "Pavan Kalyan",
    handle: "@pavankalyan",
    avatar: "P",
    avatarBg: "bg-[#5c3e38] text-white",
    status: "Active"
  },
  conversations: [
    {
      id: "conv-it-desk-urgent",
      isTarget: true,
      contact: {
        name: "Enterprise IT Support - Urgent",
        handle: "+1 (800) 555-0199",
        avatar: "IT",
        avatarBg: "bg-red-700 text-white",
        status: "online",
        badge: "External Contact",
        isVerified: false
      },
      unreadCount: 2,
      lastActivity: "10:45 AM",
      systemNotice: "Security Alert: This sender is external to your organization. Never disclose OTPs, passwords, or authentication credentials in chat.",
      messages: [
        {
          id: "msg-it-101",
          sender: "contact",
          text: "Hello Pavan, this is Mark from Enterprise IT Infrastructure Security. We have detected abnormal multi-region login attempts originating from an unrecognized IP in Bangalore on your SSO account.",
          timestamp: "10:42 AM"
        },
        {
          id: "msg-it-102",
          sender: "contact",
          text: "To prevent your student portal access from being suspended within the next 30 minutes, please confirm your current credentials via our secured emergency portal immediately:",
          timestamp: "10:43 AM",
          link: {
            id: "lnk-emergency-verify",
            text: "https://support-identity-auth-portal.com/verify?user=pavankalyan",
            url: "https://support-identity-auth-portal.com/verify?user=pavankalyan"
          }
        },
        {
          id: "msg-it-103",
          sender: "contact",
          text: "I have also attached the security audit summary for your reference. Review the incident details below:",
          timestamp: "10:44 AM",
          attachment: {
            id: "att-incident-doc",
            name: "Security_Audit_Incident_Report.pdf",
            size: "1.2 MB",
            type: "pdf"
          }
        }
      ]
    },
    {
      id: "conv-proj-lead",
      isTarget: false,
      contact: {
        name: "Rohit Sharma (Project Lead)",
        handle: "@rohit.sharma",
        avatar: "R",
        avatarBg: "bg-blue-600 text-white",
        status: "offline",
        badge: "Colleague",
        isVerified: true
      },
      unreadCount: 0,
      lastActivity: "Yesterday",
      messages: [
        {
          id: "msg-rs-201",
          sender: "contact",
          text: "Hey Pavan, let me know once the attack simulation components are ready for integration review.",
          timestamp: "Yesterday, 4:15 PM"
        },
        {
          id: "msg-rs-202",
          sender: "user",
          text: "Sure Rohit! EmailSimulation is complete and ChatSimulation is in progress.",
          timestamp: "Yesterday, 4:20 PM"
        }
      ]
    },
    {
      id: "conv-hackathon-team",
      isTarget: false,
      contact: {
        name: "Cyber Defense Hackathon 2026",
        handle: "Group • 4 members",
        avatar: "CD",
        avatarBg: "bg-purple-600 text-white",
        status: "4 members",
        badge: "Team",
        isVerified: true
      },
      unreadCount: 0,
      lastActivity: "Oct 18",
      messages: [
        {
          id: "msg-cd-301",
          sender: "contact",
          text: "Team, remember the deadline for final module submission is tomorrow at midnight.",
          timestamp: "Oct 18"
        }
      ]
    }
  ]
};
