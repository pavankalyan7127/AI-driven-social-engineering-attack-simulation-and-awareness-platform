/**
 * Sample Scenario data for Voice Call (Vishing) Simulation
 * Channel: Call / Phone Call
 * Scenario: Bank Fraud Prevention Department Impersonation
 */

export const sampleCallScenario = {
  scenarioId: "scen-call-chase-vishing-001",
  sessionId: "sess-call-sim-4421",
  targetId: "call-target-1",
  title: "Bank Fraud Department Vishing Attack",
  description: "A simulated incoming telephone call from an authoritative imposter claiming to be from Chase Fraud Prevention, attempting to extract credit card numbers or PIN.",
  channel: "call",
  category: "Vishing / Voice Social Engineering",
  difficulty: "Medium",
  initialView: "incoming",
  userProfile: {
    name: "Alex Morgan",
    phoneNumber: "+1 (555) 019-2834"
  },
  attackClassification: {
    primaryType: "vishing",
    secondaryTechniques: ["urgency_manipulation", "authority_impersonation", "fear_intimidation"],
    rationale: "Impersonates bank security over voice call using urgency and fear of financial loss to extract credit card details."
  },
  terminationRules: {
    version: "1.0",
    observationWindowSeconds: 120,
    positiveConditions: [
      {
        id: "call_rejected",
        trigger: "event",
        eventType: "call_rejected",
        points: 30,
        label: "Declined suspicious call",
        explanation: "The user rejected the unverified incoming phone call immediately."
      },
      {
        id: "report_threat",
        trigger: "event",
        eventType: "threat_reported",
        points: 25,
        label: "Reported vishing call",
        explanation: "The user identified the scam call and reported it to security."
      },
      {
        id: "block_caller",
        trigger: "event",
        eventType: "user_blocked_sender",
        points: 20,
        label: "Blocked caller number",
        explanation: "The user blocked the imposter phone number from their device."
      },
      {
        id: "safe_hangup",
        trigger: "event",
        eventType: "safe_exit",
        points: 15,
        label: "Safely hung up",
        explanation: "The user terminated the call without giving away sensitive information."
      }
    ],
    negativeConditions: [
      {
        id: "disclosed_sensitive_info",
        trigger: "event",
        eventType: "credential_submitted",
        points: 35,
        label: "Disclosed sensitive information",
        explanation: "The user spoke or keyed in sensitive financial credentials (credit card or PIN) during the call."
      }
    ]
  },
  callData: {
    id: "call-target-1",
    callerName: "Chase Fraud Operations",
    callerNumber: "+1 (800) 935-9935",
    location: "Toll-Free • Suspected Spam",
    avatar: "CF",
    avatarBg: "bg-red-600",
    openingLine: "Hello, this is senior investigator David Miller from Chase Fraud Operations. We have flagged two unauthorized international wire attempts totaling $2,850 on your account. To block these charges immediately, please confirm the 16 digits of your credit card or your 4-digit PIN.",
    personaContext: "Authoritative, urgent senior bank investigator warning that wire transfers will settle within minutes unless the user provides card numbers or PIN.",
    targetInformation: "credit card number, CVV, or 4-digit PIN",
    fallbackResponses: [
      "Sir, if you delay, this fraudulent wire transfer will clear in five minutes. I need you to confirm your card number immediately.",
      "I understand your hesitation, but I am an authorized senior security officer. Read out the numbers on your card so we can safeguard your account.",
      "This call is recorded for your protection. If you refuse to verify your details, your banking access will be immediately frozen."
    ]
  }
};
