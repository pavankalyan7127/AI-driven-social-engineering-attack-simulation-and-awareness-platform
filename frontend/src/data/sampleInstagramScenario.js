/**
 * Sample Scenario data for Instagram Simulation
 * Channel: Instagram
 * Scenario: Direct Message Reel Voting Phishing Attack
 */

export const sampleInstagramScenario = {
  scenarioId: "scen-insta-voting-phish-001",
  sessionId: "sess-insta-sim-7742",
  targetId: "conv-insta-target",
  title: "Instagram DM Fake Reel Contest Phishing",
  description: "A simulated direct message phishing attack on Instagram where an impersonated acquaintance requests an urgent vote in a competition via a credential harvesting link.",
  channel: "instagram",
  category: "Direct Message Phishing",
  difficulty: "Medium",
  initialView: "chat",
  attackClassification: {
    primaryType: "credential_phishing",
    secondaryTechniques: ["impersonation", "urgency_manipulation"],
    rationale: "Attacker solicits a competition vote through Instagram DM, leading to an external phishing login portal."
  },
  terminationRules: {
    version: "1.0",
    observationWindowSeconds: 120,
    positiveConditions: [
      {
        id: "block_user",
        trigger: "event",
        eventType: "user_blocked_sender",
        points: 30,
        label: "Blocked suspicious Instagram account",
        explanation: "The user blocked the attacker via the Instagram DM Details menu."
      },
      {
        id: "report_threat",
        trigger: "event",
        eventType: "threat_reported",
        points: 25,
        label: "Reported threat to Instagram security",
        explanation: "The user reported the malicious DM."
      }
    ],
    negativeConditions: [
      {
        id: "malicious_link_clicked",
        trigger: "event",
        eventType: "simulated_link_clicked",
        points: 25,
        label: "Clicked voting phishing link",
        explanation: "The user clicked the fake Instagram login voting link."
      }
    ]
  },
  userProfile: {
    name: "Pavan Kalyan",
    handle: "_pavan_kalyan_1207",
    avatar: "P"
  },
  conversations: [
    {
      id: "conv-insta-target",
      isTarget: true,
      contact: {
        name: "thejasri 🦋",
        handle: "thejasri_2511",
        avatar: "T",
        avatarBg: "bg-gradient-to-tr from-amber-500 to-pink-500 text-white",
        status: "Active 1h ago"
      },
      unreadCount: 1,
      lastActivity: "1h",
      messages: [
        {
          id: "m1",
          sender: "contact",
          text: "Hey! Are you participating in the college hackathon?",
          timestamp: "11:45 AM"
        },
        {
          id: "m2",
          sender: "user",
          text: "Yea na ponathu ila",
          timestamp: "11:50 AM"
        },
        {
          id: "m3",
          sender: "contact",
          text: "Vote for my reel in the college competition please! You just have to log in here to vote: https://insta-vote-awards2026.online/auth-login",
          timestamp: "11:59 AM",
          link: {
            id: "l1",
            url: "https://insta-vote-awards2026.online/auth-login",
            text: "https://insta-vote-awards2026.online/auth-login"
          }
        }
      ]
    },
    {
      id: "conv-2",
      isTarget: false,
      contact: {
        name: "vetti pasanga",
        handle: "vetti_gang",
        avatar: "V",
        avatarBg: "bg-emerald-600 text-white"
      },
      unreadCount: 4,
      lastActivity: "2h",
      messages: [
        {
          id: "v1",
          sender: "contact",
          text: "4+ new messages",
          timestamp: "2h"
        }
      ]
    }
  ]
};
