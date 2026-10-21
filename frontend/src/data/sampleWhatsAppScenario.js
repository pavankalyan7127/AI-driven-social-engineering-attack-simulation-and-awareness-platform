/**
 * Sample Scenario data for WhatsApp Simulation
 * Channel: WhatsApp
 * Scenario: College Peer Impersonation & Malicious Quiz Link
 */

export const sampleWhatsAppScenario = {
  scenarioId: "scen-whatsapp-vit-quiz-001",
  sessionId: "sess-whatsapp-sim-8821",
  targetId: "conv-whatsapp-target",
  title: "WhatsApp Peer Impersonation & Exam Leak Phishing",
  description: "A simulated social engineering attack on WhatsApp Web where an attacker impersonates a classmate, sharing an urgent counterfeit quiz paper link.",
  channel: "whatsapp",
  category: "Pretexting & Impersonation",
  difficulty: "Medium",
  initialView: "chat",
  attackClassification: {
    primaryType: "impersonation",
    secondaryTechniques: ["pretexting", "credential_phishing"],
    rationale: "Attacker impersonates a classmate on WhatsApp, sharing a malicious link claiming to be leaked exam papers."
  },
  terminationRules: {
    version: "1.0",
    observationWindowSeconds: 120,
    positiveConditions: [
      {
        id: "block_sender",
        trigger: "event",
        eventType: "user_blocked_sender",
        points: 30,
        label: "Blocked suspicious WhatsApp contact",
        explanation: "The user blocked the impersonated contact on WhatsApp."
      },
      {
        id: "report_threat",
        trigger: "event",
        eventType: "threat_reported",
        points: 25,
        label: "Reported threat to security",
        explanation: "The user reported the suspicious WhatsApp phishing attempt."
      }
    ],
    negativeConditions: [
      {
        id: "malicious_link_clicked",
        trigger: "event",
        eventType: "simulated_link_clicked",
        points: 25,
        label: "Clicked simulated link",
        explanation: "The user clicked the counterfeit exam paper link."
      }
    ]
  },
  userProfile: {
    name: "Pavan Kalyan",
    handle: "@_pavan_kalyan_1207",
    avatar: "P",
    phone: "+91 98765 43210"
  },
  conversations: [
    {
      id: "conv-whatsapp-target",
      isTarget: true,
      contact: {
        name: "Suuuuryaaaa 💀💀💀 VIT",
        phone: "+91 94421 88902",
        avatar: "S",
        avatarBg: "bg-emerald-700 text-white",
        status: "online",
        about: "Hey there! I am using WhatsApp."
      },
      unreadCount: 2,
      lastActivity: "9:21 AM",
      messages: [
        {
          id: "m1",
          sender: "contact",
          text: "👀👀",
          timestamp: "9:12 AM"
        },
        {
          id: "m2",
          sender: "contact",
          text: "Not came?",
          timestamp: "9:12 AM"
        },
        {
          id: "m3",
          sender: "user",
          text: "Yea not came",
          timestamp: "9:12 AM",
          status: "read"
        },
        {
          id: "m4",
          sender: "user",
          text: "Quiz portion?",
          timestamp: "9:13 AM",
          status: "read"
        },
        {
          id: "m5",
          sender: "contact",
          text: "Ji mam said Same like I asked during review",
          timestamp: "9:19 AM"
        },
        {
          id: "m6",
          sender: "contact",
          text: "Check this link for the leaked quiz questions: https://vit-ac-in-portal-verify.in/quiz-paper",
          timestamp: "9:20 AM",
          link: {
            id: "l1",
            url: "https://vit-ac-in-portal-verify.in/quiz-paper",
            text: "https://vit-ac-in-portal-verify.in/quiz-paper"
          }
        },
        {
          id: "m7",
          sender: "contact",
          text: "Ya that's what she said",
          timestamp: "9:21 AM"
        }
      ]
    },
    {
      id: "conv-2",
      isTarget: false,
      contact: {
        name: "VCV - club official 📢",
        phone: "+91 99887 76655",
        avatar: "V",
        avatarBg: "bg-purple-700 text-white",
        status: "offline"
      },
      unreadCount: 75,
      lastActivity: "1:11 PM",
      messages: [
        {
          id: "v1",
          sender: "contact",
          text: "~Hari Haran: https://www.facebook.com/share/r/1DNa6A5nR9/",
          timestamp: "1:11 PM"
        }
      ]
    },
    {
      id: "conv-3",
      isTarget: false,
      contact: {
        name: "Nexora Hackathon",
        phone: "+91 98111 22334",
        avatar: "N",
        avatarBg: "bg-blue-700 text-white",
        status: "offline"
      },
      unreadCount: 156,
      lastActivity: "11:50 AM",
      messages: [
        {
          id: "n1",
          sender: "contact",
          text: "~Vignesh: THE DIMENSION IS OPENING 💀",
          timestamp: "11:50 AM"
        }
      ]
    }
  ]
};
