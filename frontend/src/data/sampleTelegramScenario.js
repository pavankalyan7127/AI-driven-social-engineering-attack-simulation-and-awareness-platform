/**
 * Sample Scenario data for Telegram Simulation
 * Channel: Telegram
 * Scenario: Group File Download Malware / Piracy Phishing Attack
 */

export const sampleTelegramScenario = {
  scenarioId: "scen-telegram-movie-bot-001",
  sessionId: "sess-telegram-sim-4491",
  targetId: "conv-telegram-target",
  title: "Telegram Piracy Group Malware Distribution & Phishing",
  description: "A simulated social engineering attack on Telegram Web where an attacker distributes malicious executables and credential-harvesting links disguised as popular media downloads.",
  channel: "telegram",
  category: "Malware Distribution & Pretexting",
  difficulty: "Medium",
  initialView: "chat",
  attackClassification: {
    primaryType: "trojan_delivery",
    secondaryTechniques: ["pretexting", "credential_phishing", "impersonation"],
    rationale: "Attacker uses a movie sharing group on Telegram to distribute a disguised malware executable and a phishing link under the pretext of high-speed download mirrors."
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
        label: "Blocked suspicious Telegram contact / group",
        explanation: "The user blocked the suspicious Telegram channel or bot distributor."
      },
      {
        id: "report_threat",
        trigger: "event",
        eventType: "threat_reported",
        points: 25,
        label: "Reported threat to Telegram / security",
        explanation: "The user reported the scam / phishing content on Telegram."
      },
      {
        id: "delete_chat",
        trigger: "event",
        eventType: "message_deleted",
        points: 20,
        label: "Deleted suspicious chat",
        explanation: "The user deleted the fraudulent conversation."
      }
    ],
    negativeConditions: [
      {
        id: "malicious_link_clicked",
        trigger: "event",
        eventType: "simulated_link_clicked",
        points: 25,
        label: "Clicked simulated link",
        explanation: "The user clicked the counterfeit download mirror link or downloaded the trojan."
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
      id: "conv-archived",
      isTarget: false,
      contact: {
        name: "Archived Chats",
        badge: "TamilSk Moviez",
        avatar: "📁",
        avatarBg: "bg-blue-600 text-white",
        status: "Archived"
      },
      unreadCount: 1,
      lastActivity: "13:40",
      messages: [
        {
          id: "arch-1",
          sender: "contact",
          text: "TamilSk Moviez updates archived.",
          timestamp: "13:40"
        }
      ]
    },
    {
      id: "conv-movie-req",
      isTarget: false,
      contact: {
        name: "Movie Request Group 10",
        badge: "VM - Movie & Series Req bot",
        avatar: "🎬",
        avatarBg: "bg-emerald-600 text-white",
        status: "group",
        isMuted: true
      },
      unreadCount: 20,
      lastActivity: "13:38",
      messages: [
        {
          id: "mr-1",
          sender: "contact",
          text: "Requested files uploaded to queue.",
          timestamp: "13:38"
        }
      ]
    },
    {
      id: "conv-scam-mj",
      isTarget: false,
      contact: {
        name: "MJ Request Gro...",
        badge: "SCAM",
        isScam: true,
        avatar: "👑",
        avatarBg: "bg-amber-600 text-white",
        status: "group",
        isMuted: true
      },
      unreadCount: "25.9K",
      lastActivity: "13:38",
      messages: [
        {
          id: "mj-1",
          sender: "contact",
          text: "Diana BOT: Title added to collection.",
          timestamp: "13:38"
        }
      ]
    },
    {
      id: "conv-amazon-sale",
      isTarget: false,
      contact: {
        name: "SALE LIVE Amazon Flipkart",
        avatar: "🛒",
        avatarBg: "bg-yellow-500 text-gray-900",
        status: "channel",
        isMuted: true
      },
      unreadCount: "187.8K",
      lastActivity: "13:37",
      messages: [
        {
          id: "az-1",
          sender: "contact",
          text: "470 : https://amzn.to/4z3... deals live now!",
          timestamp: "13:37"
        }
      ]
    },
    {
      id: "conv-looter",
      isTarget: false,
      contact: {
        name: "Looter Junction",
        avatar: "⚡",
        avatarBg: "bg-indigo-600 text-white",
        status: "channel",
        isMuted: true
      },
      unreadCount: "160.7K",
      lastActivity: "13:35",
      messages: [
        {
          id: "lj-1",
          sender: "contact",
          text: "Haldiram's Sweet (Patisan) 50% discount",
          timestamp: "13:35"
        }
      ]
    },
    {
      id: "conv-telegram-target",
      isTarget: true,
      contact: {
        name: "Kakapeeeeee atti 💥 🤘",
        subtitle: "2 837 members, 110 online",
        avatar: "💥",
        avatarBg: "bg-purple-700 text-white",
        status: "supergroup"
      },
      unreadCount: 0,
      lastActivity: "13:35",
      pinnedMessage: {
        id: "pin-01",
        title: "Pinned Message",
        text: "Photo, Jailer 2 (2026) Tamil (LINE) V2 HDTC"
      },
      messages: [
        {
          id: "m1",
          sender: "bot",
          senderName: "ProSearch Bot",
          senderColor: "text-blue-400",
          text: "➡️ Latest Uploads: @ProSearchZ\n➡️ BOT Updates: @ProSearch",
          timestamp: "10:25"
        },
        {
          id: "m2",
          sender: "bot",
          senderName: "VisionQuest Bot",
          senderColor: "text-emerald-400",
          isFileCard: true,
          fileName: "VisionQuest.S01E04.Malware.1080p.JioHotstar.WEB-DL.MULTI.mkv",
          fileSize: "1.22 GB",
          specs: "🎬 1080p HEVC  ⏱️ 00:48:09\n🗣️ English, Hindi, Tamil, Telugu\n💬 ESUB",
          text: "VisionQuest.S01E04.Malware.1080p.JioHotstar.WEB-DL.MULTI.DDP5.1.Atmos.H.265-JeRi.mkv",
          link: {
            id: "link-tele-download",
            text: "Fast Download Mirror: https://fast-stream-cdn.ru/get/VisionQuest.exe",
            url: "https://fast-stream-cdn.ru/get/VisionQuest.exe"
          },
          timestamp: "10:25"
        },
        {
          id: "m3",
          sender: "contact",
          senderName: "Roobhan 🥂",
          senderColor: "text-emerald-400",
          quoted: "VisionQuest.S01E04.Malware.1080p.JioHotstar.WEB-DL.MULTI...",
          text: "Gopi Tarun download works properly check once!",
          timestamp: "10:25"
        },
        {
          id: "m4",
          sender: "contact",
          senderName: "Thorfin n",
          senderColor: "text-cyan-400",
          text: "vision quest S1 E3",
          timestamp: "11:34"
        },
        {
          id: "m5",
          sender: "contact",
          senderName: "Mohamed Rizwan",
          senderColor: "text-purple-400",
          text: "Band of brothers english subtitles",
          timestamp: "12:09"
        },
        {
          id: "m6",
          sender: "contact",
          senderName: "Dhanush",
          senderColor: "text-orange-400",
          text: "Doraemon: Nobita and the Galaxy Super-express",
          timestamp: "12:09"
        },
        {
          id: "m7",
          sender: "contact",
          senderName: "Ashok Selvam",
          senderColor: "text-blue-400",
          text: "Naruto Shippuden English Subtitles. below 400 mb",
          timestamp: "13:35"
        }
      ]
    },
    {
      id: "conv-vfl",
      isTarget: false,
      contact: {
        name: "VFL ⭐️",
        avatar: "⭐",
        avatarBg: "bg-blue-800 text-white",
        status: "channel",
        isMuted: true
      },
      unreadCount: 791,
      lastActivity: "13:34",
      messages: [
        {
          id: "vfl-1",
          sender: "contact",
          text: "Player Result — Reign...",
          timestamp: "13:34"
        }
      ]
    },
    {
      id: "conv-tamiltech",
      isTarget: false,
      contact: {
        name: "TamilTech - MrTT",
        avatar: "📱",
        avatarBg: "bg-red-600 text-white",
        status: "channel",
        isMuted: true
      },
      unreadCount: "1.9K",
      lastActivity: "12:50",
      messages: [
        {
          id: "tt-1",
          sender: "contact",
          text: "https://youtube.com/shorts... new tech review",
          timestamp: "12:50"
        }
      ]
    },
    {
      id: "conv-nptel",
      isTarget: false,
      contact: {
        name: "Nptel 2026",
        avatar: "🎓",
        avatarBg: "bg-teal-700 text-white",
        status: "group",
        isMuted: true
      },
      unreadCount: 0,
      lastActivity: "11:40",
      messages: [
        {
          id: "np-1",
          sender: "contact",
          text: "Shrinthhish: Yea pls provide assignment solutions",
          timestamp: "11:40"
        }
      ]
    }
  ]
};
