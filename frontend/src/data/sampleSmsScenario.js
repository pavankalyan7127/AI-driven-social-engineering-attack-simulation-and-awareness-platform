/**
 * Sample Scenario data for SMS Simulation
 * Channel: SMS / Smishing
 * Scenario: Urgent Fraudulent Transaction & Card Suspension Smishing Attack
 */

export const sampleSmsScenario = {
  scenarioId: "scen-sms-bank-alert-001",
  sessionId: "sess-sms-sim-7731",
  targetId: "conv-sms-bank-alert",
  title: "Urgent Card Fraud & Account Suspension Smishing Simulation",
  description: "A simulated smishing attack originating from a spoofed or unverified shortcode/number alerting the user to an unauthorized transaction to induce panic and credential theft.",
  channel: "sms",
  category: "Smishing / Credential Harvesting",
  difficulty: "Medium",
  initialView: "list", // 'list' or 'chat'
  userProfile: {
    name: "Pavan Kalyan",
    phoneNumber: "+1 (555) 234-5678",
    avatar: "P",
    avatarBg: "bg-[#5c3e38] text-white"
  },
  conversations: [
    {
      id: "conv-sms-bank-alert",
      isTarget: true,
      sender: {
        name: "Apex Bank Fraud Prevention",
        phoneNumber: "+1 (833) 492-0182",
        avatar: "AB",
        avatarBg: "bg-red-700 text-white",
        verificationStatus: "Unverified Sender",
        badge: "Potential Scam Alert"
      },
      unreadCount: 1,
      lastActivity: "11:02 AM",
      carrierNotice: "Text Message • Today • Carrier rates may apply",
      systemNotice: "Warning: The sender +1 (833) 492-0182 is not in your contacts. Scammers frequently use SMS to harvest bank credentials and OTPs.",
      messages: [
        {
          id: "sms-msg-101",
          sender: "contact",
          text: "[APEX BANK ALERT]: A suspicious online charge of $842.50 to 'CRYPTO-EXCHANGE-GLOBAL' was attempted on your debit card ending in 4829 from London, UK.",
          timestamp: "11:00 AM"
        },
        {
          id: "sms-msg-102",
          sender: "contact",
          text: "If you did NOT authorize this transaction, your account will be locked in 15 minutes unless you dispute the charge immediately via our secure verification portal:",
          timestamp: "11:01 AM",
          link: {
            id: "lnk-smish-verify",
            text: "https://apex-security-card-dispute.com/verify?user=pavankalyan",
            url: "https://apex-security-card-dispute.com/verify?user=pavankalyan"
          }
        },
        {
          id: "sms-msg-103",
          sender: "contact",
          text: "Attached is the flagged transaction receipt snippet. Reply STOP to opt out.",
          timestamp: "11:02 AM",
          attachment: {
            id: "att-flagged-receipt",
            name: "Transaction_Receipt_84250.png",
            size: "184 KB",
            type: "image"
          }
        }
      ]
    },
    {
      id: "conv-sms-delivery",
      isTarget: false,
      sender: {
        name: "Campus Courier Logistics",
        phoneNumber: "SHORTCODE 44021",
        avatar: "CC",
        avatarBg: "bg-blue-600 text-white",
        verificationStatus: "Verified Business",
        badge: "Delivery"
      },
      unreadCount: 0,
      lastActivity: "Yesterday",
      carrierNotice: "SMS from verified sender 44021",
      messages: [
        {
          id: "sms-msg-201",
          sender: "contact",
          text: "Your academic workshop kit package #VIT-88392 is placed in Smart Locker Box 14. Pickup PIN: 4892. Valid until 8:00 PM.",
          timestamp: "Yesterday, 3:15 PM"
        }
      ]
    },
    {
      id: "conv-sms-peer",
      isTarget: false,
      sender: {
        name: "Arjun (Study Group)",
        phoneNumber: "+1 (555) 778-9921",
        avatar: "A",
        avatarBg: "bg-emerald-600 text-white",
        verificationStatus: "Contact",
        badge: "Mobile"
      },
      unreadCount: 0,
      lastActivity: "Oct 17",
      carrierNotice: "SMS Message",
      messages: [
        {
          id: "sms-msg-301",
          sender: "contact",
          text: "Hey Pavan, are we meeting at the central library at 5 PM for the network security review?",
          timestamp: "Oct 17, 2:40 PM"
        },
        {
          id: "sms-msg-302",
          sender: "user",
          text: "Yes Arjun, see you on the 2nd floor study hall.",
          timestamp: "Oct 17, 2:45 PM"
        }
      ]
    }
  ]
};
