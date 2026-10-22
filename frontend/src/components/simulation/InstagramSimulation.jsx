import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  MessageCircle,
  Home,
  Search,
  Compass,
  Clapperboard,
  Heart,
  PlusSquare,
  Menu,
  Phone,
  Video,
  Info,
  Smile,
  Mic,
  Image as ImageIcon,
  Send,
  ArrowLeft,
  ShieldAlert,
  AlertOctagon,
  AlertTriangle,
  Ban,
  Trash2,
  X,
  ExternalLink,
  ChevronDown,
  Edit,
  Check,
  User
} from 'lucide-react';

/**
 * InstagramSimulation Component
 * 
 * Pixel-perfect Instagram Direct Messages (DM) attack simulation interface.
 * Implements conversational DMs, user story notes, Instagram dark mode UI,
 * and authentic defensive controls in the right Details panel (Block, Report, Delete).
 * 
 * @param {Object} props
 * @param {Object} props.scenario - Validated scenario JSON object
 * @param {string} props.sessionId - Current simulation session ID
 * @param {string} props.deviceMode - 'full' for desktop, 'mobile' for smartphone view
 * @param {Function} props.onAction - Telemetry event callback
 * @param {Function} props.onComplete - Termination callback
 */
export default function InstagramSimulation({
  scenario,
  sessionId = 'sess-sim-default',
  deviceMode = 'full',
  onAction,
  onComplete
}) {
  if (!scenario || typeof scenario !== 'object') {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] p-6 bg-black text-gray-200">
        <div className="text-center p-8 bg-[#121212] border border-[#262626] rounded-2xl shadow-xl max-w-md">
          <AlertOctagon className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-white mb-2">Scenario Unavailable</h2>
          <p className="text-xs text-gray-400">
            No valid Instagram attack scenario data was provided to the runner.
          </p>
        </div>
      </div>
    );
  }

  const scenarioId = scenario.scenarioId || scenario.id || 'unnamed-scenario';
  const targetId = scenario.targetId || 'target-instagram';

  const userProfile = scenario.userProfile || {
    name: 'Pavan Kalyan',
    handle: '_pavan_kalyan_1207',
    avatar: 'P'
  };

  // Build conversations list from scenario
  const initialConversations = useMemo(() => {
    if (Array.isArray(scenario.conversations) && scenario.conversations.length > 0) {
      return scenario.conversations.map((c, idx) => {
        const name = c.contact?.name || c.contactName || c.sender?.name || scenario.contactName || 'Instagram Contact';
        const handle = c.contact?.handle || c.handle || (name ? name.toLowerCase().replace(/[^a-z0-9_]/g, '_') : 'insta_user');
        const isVerified = Boolean(
          c.contact?.isVerified !== undefined
            ? c.contact.isVerified
            : (c.isVerified !== undefined
                ? c.isVerified
                : (scenario.isVerified !== undefined
                    ? scenario.isVerified
                    : (scenario.isReal || scenario.isLegitimate || false)))
        );
        return {
          ...c,
          id: c.id || `conv-${idx + 1}`,
          isTarget: c.isTarget !== undefined ? c.isTarget : (idx === 0),
          isVerified,
          contact: {
            name,
            handle,
            avatar: c.contact?.avatar || (name ? name.charAt(0).toUpperCase() : 'I'),
            avatarBg: c.contact?.avatarBg || (isVerified ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white' : 'bg-gradient-to-tr from-amber-500 to-pink-500 text-white'),
            status: c.contact?.status || (isVerified ? 'Verified Account' : 'Active now'),
            ...(c.contact || {}),
            isVerified
          },
          messages: Array.isArray(c.messages) ? c.messages : []
        };
      });
    }
    return [
      {
        id: targetId,
        isTarget: true,
        contact: {
          name: 'thejasri 🦋',
          handle: 'thejasri_2511',
          avatar: 'T',
          avatarBg: 'bg-gradient-to-tr from-amber-500 to-pink-500 text-white',
          status: 'Active 1h ago'
        },
        unreadCount: 1,
        lastActivity: '1h',
        messages: [
          {
            id: 'm1',
            sender: 'contact',
            text: 'Hey! Are you participating in the college hackathon?',
            timestamp: '11:45 AM'
          },
          {
            id: 'm2',
            sender: 'user',
            text: 'Yea na ponathu ila',
            timestamp: '11:50 AM'
          },
          {
            id: 'm3',
            sender: 'contact',
            text: 'Vote for my reel in the college competition please! You just have to log in here to vote: https://insta-vote-awards2026.online/auth-login',
            timestamp: '11:59 AM',
            link: {
              id: 'l1',
              url: 'https://insta-vote-awards2026.online/auth-login',
              text: 'https://insta-vote-awards2026.online/auth-login'
            }
          }
        ]
      },
      {
        id: 'conv-2',
        isTarget: false,
        contact: {
          name: 'vetti pasanga',
          handle: 'vetti_gang',
          avatar: 'V',
          avatarBg: 'bg-emerald-600 text-white'
        },
        unreadCount: 4,
        lastActivity: '2h',
        messages: [
          {
            id: 'v1',
            sender: 'contact',
            text: '4+ new messages',
            timestamp: '2h'
          }
        ]
      },
      {
        id: 'conv-3',
        isTarget: false,
        contact: {
          name: 'raj',
          handle: 'raj_kumar_99',
          avatar: 'R',
          avatarBg: 'bg-blue-600 text-white'
        },
        unreadCount: 0,
        lastActivity: '8h',
        messages: [
          {
            id: 'r1',
            sender: 'contact',
            text: 'See you tomorrow at campus!',
            timestamp: '8h'
          }
        ]
      },
      {
        id: 'conv-4',
        isTarget: false,
        contact: {
          name: 'AKIL HARIHARAN',
          handle: 'akil_hari',
          avatar: 'A',
          avatarBg: 'bg-purple-600 text-white'
        },
        unreadCount: 2,
        lastActivity: '15h',
        messages: [
          {
            id: 'a1',
            sender: 'contact',
            text: 'Sent reel attachment',
            timestamp: '15h'
          }
        ]
      }
    ];
  }, [scenario, targetId]);

  const [conversations, setConversations] = useState(initialConversations);
  const [activeConvId, setActiveConvId] = useState(() => {
    const target = initialConversations.find(c => c.isTarget);
    return target ? target.id : (initialConversations[0]?.id || null);
  });

  // Synchronize conversations and active conversation when scenario prop changes across detective rounds
  useEffect(() => {
    setConversations(initialConversations);
    const target = initialConversations.find(c => c.isTarget);
    setActiveConvId(target ? target.id : (initialConversations[0]?.id || null));
  }, [initialConversations]);

  const [searchQuery, setSearchQuery] = useState('');
  const [inputText, setInputText] = useState('');
  const [isDetailsPanelOpen, setIsDetailsPanelOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportIndicators, setReportIndicators] = useState({
    suspiciousLink: false,
    credentialPhishing: false,
    accountImpersonation: false,
    unsolicitedDM: false
  });
  const [linkNotice, setLinkNotice] = useState(null);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [compromisedNotice, setCompromisedNotice] = useState(null);

  const messagesEndRef = useRef(null);
  const hasEmittedViewed = useRef(false);

  // Safe Event Dispatcher
  const emitEvent = (eventType, metadata = {}) => {
    const payload = {
      eventType,
      scenarioId,
      sessionId,
      targetId: activeConvId || targetId,
      timestamp: new Date().toISOString(),
      metadata: {
        channel: 'instagram',
        platform: 'instagram_direct',
        ...metadata
      }
    };

    if (typeof onAction === 'function') {
      try {
        onAction(payload);
      } catch (err) {
        console.error('[InstagramSimulation] onAction error:', err);
      }
    }
    return payload;
  };

  // Emit scenario_viewed once on mount
  useEffect(() => {
    if (!hasEmittedViewed.current) {
      hasEmittedViewed.current = true;
      emitEvent('scenario_viewed', {
        scenarioTitle: scenario.title || 'Instagram Phishing Simulation',
        category: scenario.category || 'Direct Message Phishing',
        difficulty: scenario.difficulty || 'Medium'
      });
    }
  }, [scenarioId, sessionId]);

  const activeConversation = useMemo(() => {
    return conversations.find(c => c.id === activeConvId) || null;
  }, [conversations, activeConvId]);

  // Auto-scroll messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeConversation?.messages]);

  // Open conversation
  const handleOpenConversation = (conv) => {
    setActiveConvId(conv.id);
    setConversations(prev =>
      prev.map(c => (c.id === conv.id ? { ...c, unreadCount: 0 } : c))
    );

    emitEvent('conversation_opened', {
      conversationId: conv.id,
      contactName: conv.contact?.name,
      isTarget: conv.isTarget
    });
  };

  // Send message
  const handleSendMessage = (e) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || !activeConvId) return;

    const newMsg = {
      id: `msg-sent-${Date.now()}`,
      sender: 'user',
      text: trimmed,
      timestamp: 'Just now'
    };

    setConversations(prev =>
      prev.map(c => {
        if (c.id === activeConvId) {
          return {
            ...c,
            lastActivity: 'Just now',
            messages: [...(c.messages || []), newMsg]
          };
        }
        return c;
      })
    );

    emitEvent('message_sent', {
      conversationId: activeConvId,
      text: trimmed,
      isTarget: activeConversation?.isTarget
    });

    setInputText('');

    // Trigger AI attacker dynamic reply & sensitive leak evaluation
    const historySnapshot = (activeConversation?.messages || []).concat(newMsg).map(m => ({
      sender: m.sender,
      text: m.text
    }));

    setIsAiTyping(true);
    fetch('/api/scenarios/chat/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userMessage: trimmed,
        channel: 'instagram',
        dialogueHistory: historySnapshot,
        contactName: activeConversation?.contact?.name || scenario.contactName || 'Instagram User',
        personaContext: scenario.description || scenario.title || 'Attacker messaging target on Instagram',
        scenarioContext: scenario.title || '',
        targetInformation: scenario.targetInformation || 'credentials, OTP, or verification link',
        language: scenario.language || 'auto'
      })
    })
      .then(res => res.json())
      .then(data => {
        setIsAiTyping(false);
        if (!data || !data.success) return;

        const attackerMsg = {
          id: `msg-contact-${Date.now()}`,
          sender: 'contact',
          text: data.reply,
          timestamp: 'Just now'
        };

        setConversations(prev =>
          prev.map(c => {
            if (c.id === activeConvId) {
              return {
                ...c,
                lastActivity: 'Just now',
                messages: [...(c.messages || []), attackerMsg]
              };
            }
            return c;
          })
        );

        emitEvent('message_received', {
          conversationId: activeConvId,
          messageId: attackerMsg.id,
          text: data.reply,
          sender: activeConversation?.contact?.name || 'Contact'
        });

        // Check for credential leak or negative termination
        if (data.sensitiveInfoDisclosed || data.isNegativeTermination) {
          setCompromisedNotice(data.explanation || 'Sensitive credentials disclosed via Instagram Direct.');
          emitEvent('sensitive_info_disclosed', {
            conversationId: activeConvId,
            reason: data.explanation || 'User disclosed credentials via Instagram',
            leakedText: trimmed
          });
          emitEvent('credential_submitted', {
            conversationId: activeConvId,
            reason: data.explanation || 'User disclosed credentials via Instagram',
            compromised: true
          });

          setTimeout(() => {
            if (typeof onComplete === 'function') {
              onComplete({
                status: 'completed',
                action: 'sensitive_info_disclosed',
                scenarioId,
                sessionId,
                reason: data.explanation || 'User disclosed sensitive credentials or security information on Instagram'
              });
            }
          }, 1200);
        }
      })
      .catch(err => {
        setIsAiTyping(false);
        console.error('[Instagram AI Response Error]:', err);
      });
  };

  // Simulated link click (Failure condition)
  const handleSimulatedLink = (e, linkMeta) => {
    if (e) e.preventDefault();

    emitEvent('simulated_link_clicked', {
      actionId: linkMeta.id || 'instagram_link',
      url: linkMeta.url || linkMeta.text,
      label: linkMeta.text,
      targetPhish: true
    });

    setLinkNotice({
      url: linkMeta.url || linkMeta.text,
      text: 'Simulated Instagram credential-harvesting link intercepted.'
    });
  };

  // 1. Block User (Positive Termination)
  const handleBlockUser = () => {
    setIsDetailsPanelOpen(false);
    const contactName = activeConversation?.contact?.name || 'User';

    emitEvent('user_blocked_sender', {
      conversationId: activeConvId,
      contactName,
      handle: activeConversation?.contact?.handle,
      reportedTarget: activeConversation?.isTarget
    });

    setConversations(prev => prev.filter(c => c.id !== activeConvId));
    setActiveConvId(null);

    if (typeof onComplete === 'function') {
      onComplete({
        status: 'safe_exit',
        action: 'user_blocked_sender',
        scenarioId,
        sessionId,
        reason: `Blocked suspicious Instagram user "${contactName}"`
      });
    }
  };

  // 2. Report Threat (Positive Termination)
  const handleConfirmReport = () => {
    setIsReportModalOpen(false);
    setIsDetailsPanelOpen(false);

    emitEvent('threat_reported', {
      conversationId: activeConvId,
      contactName: activeConversation?.contact?.name,
      indicators: reportIndicators,
      reportedTarget: activeConversation?.isTarget
    });

    if (typeof onComplete === 'function') {
      onComplete({
        status: 'reported',
        action: 'threat_reported',
        scenarioId,
        sessionId,
        indicatorsIdentified: reportIndicators
      });
    }
  };

  // 3. Delete Chat (Positive Termination)
  const handleDeleteChat = () => {
    setIsDetailsPanelOpen(false);

    emitEvent('message_deleted', {
      conversationId: activeConvId,
      reportedTarget: activeConversation?.isTarget
    });

    setConversations(prev => prev.filter(c => c.id !== activeConvId));
    setActiveConvId(null);

    if (typeof onComplete === 'function') {
      onComplete({
        status: 'safe_exit',
        action: 'message_deleted',
        scenarioId,
        sessionId,
        reason: 'User deleted suspicious Instagram DM conversation'
      });
    }
  };

  // Filter conversations
  const filteredConversations = useMemo(() => {
    return conversations.filter(c => {
      const name = (c.contact?.name || '').toLowerCase();
      const handle = (c.contact?.handle || '').toLowerCase();
      return name.includes(searchQuery.toLowerCase()) || handle.includes(searchQuery.toLowerCase());
    });
  }, [conversations, searchQuery]);

  const isMobile = deviceMode === 'mobile';

  return (
    <div className="flex h-full w-full bg-black text-white font-sans select-none overflow-hidden antialiased">
      {/* ============================================================== */}
      {/* 1. LEFTMOST NARROW RAIL (Instagram sidebar icons)              */}
      {/* ============================================================== */}
      {!isMobile && (
        <aside className="w-16 shrink-0 bg-black flex flex-col items-center py-6 justify-between border-r border-[#262626]">
          <div className="flex flex-col items-center gap-7">
            {/* Instagram Glyph */}
            <div className="w-8 h-8 flex items-center justify-center cursor-pointer">
              <svg className="w-6 h-6 fill-white" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </div>

            <button title="Home" className="p-2 text-white hover:opacity-70 transition-opacity">
              <Home className="w-6 h-6" />
            </button>
            <button title="Search" className="p-2 text-white hover:opacity-70 transition-opacity">
              <Search className="w-6 h-6" />
            </button>
            <button title="Explore" className="p-2 text-white hover:opacity-70 transition-opacity">
              <Compass className="w-6 h-6" />
            </button>
            <button title="Reels" className="p-2 text-white hover:opacity-70 transition-opacity">
              <Clapperboard className="w-6 h-6" />
            </button>
            {/* Active Messages with red badge */}
            <button title="Messages" className="relative p-2 text-white focus:outline-none">
              <MessageCircle className="w-6 h-6" />
              <span className="absolute -top-0.5 -right-0.5 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full leading-tight">
                7
              </span>
            </button>
            <button title="Notifications" className="p-2 text-white hover:opacity-70 transition-opacity">
              <Heart className="w-6 h-6" />
            </button>
            <button title="Create" className="p-2 text-white hover:opacity-70 transition-opacity">
              <PlusSquare className="w-6 h-6" />
            </button>
            <div className="w-6 h-6 rounded-full bg-[#5c3e38] text-white flex items-center justify-center cursor-pointer overflow-hidden">
              <User className="w-3.5 h-3.5 text-gray-200" />
            </div>
          </div>

          <button title="More" className="p-2 text-white hover:opacity-70 transition-opacity">
            <Menu className="w-6 h-6" />
          </button>
        </aside>
      )}

      {/* ============================================================== */}
      {/* 2. INSTAGRAM DMS SIDEBAR (Conversations & Notes)               */}
      {/* ============================================================== */}
      <div
        className={`${
          isMobile && activeConvId ? 'hidden' : 'flex'
        } w-full sm:w-80 md:w-96 shrink-0 flex-col bg-black border-r border-[#262626]`}
      >
        {/* User Handle Header */}
        <div className="h-16 px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 cursor-pointer">
            <span className="font-bold text-base tracking-tight">{userProfile.handle}</span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </div>
          <button title="New message" className="p-1.5 text-white hover:opacity-70">
            <Edit className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-4 pb-3 shrink-0">
          <div className="bg-[#262626] rounded-xl px-3 py-2 flex items-center text-xs text-gray-400">
            <Search className="w-4 h-4 mr-2.5 text-gray-500 shrink-0" />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none text-white placeholder-gray-500 text-xs flex-1 focus:outline-none"
            />
          </div>
        </div>

        {/* Notes Row (Matching Screenshot 4) */}
        <div className="px-4 pb-3 flex items-center gap-3 overflow-x-auto no-scrollbar border-b border-[#262626]/60 shrink-0">
          {/* Your note */}
          <div className="flex flex-col items-center shrink-0 cursor-pointer">
            <div className="relative mb-1">
              <div className="w-14 h-14 rounded-full bg-[#1c1c1c] border border-gray-700 flex items-center justify-center overflow-hidden">
                <User className="w-7 h-7 text-gray-400" />
              </div>
              <div className="absolute -top-1 right-0 bg-[#262626] text-[9px] px-1.5 py-0.5 rounded-full border border-gray-700">
                + Note
              </div>
            </div>
            <span className="text-[11px] text-gray-400 truncate w-14 text-center">Your note</span>
          </div>

          {/* Contact note 1 */}
          <div className="flex flex-col items-center shrink-0 cursor-pointer">
            <div className="relative mb-1">
              <div className="w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-amber-500 to-pink-500 flex items-center justify-center">
                <div className="w-full h-full rounded-full bg-gray-800 flex items-center justify-center text-xs font-bold">
                  TR
                </div>
              </div>
              <div className="absolute -top-1 -right-1 bg-black text-[9px] px-1 py-0.5 rounded-full border border-gray-800 truncate max-w-[60px]">
                21 🎂
              </div>
            </div>
            <span className="text-[11px] text-gray-400 truncate w-14 text-center">TR Chandana</span>
          </div>

          {/* Contact note 2 */}
          <div className="flex flex-col items-center shrink-0 cursor-pointer">
            <div className="relative mb-1">
              <div className="w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center">
                <div className="w-full h-full rounded-full bg-gray-800 flex items-center justify-center text-xs font-bold">
                  S
                </div>
              </div>
            </div>
            <span className="text-[11px] text-gray-400 truncate w-14 text-center">Sree</span>
          </div>
        </div>

        {/* Messages / Requests Tabs */}
        <div className="px-4 py-2 flex items-center justify-between text-xs font-semibold shrink-0">
          <span className="text-white">Messages</span>
          <span className="text-gray-500 cursor-pointer hover:text-gray-300">Requests</span>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto divide-y divide-transparent">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-xs">No messages.</div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = conv.id === activeConvId;
              const lastMsg = conv.messages?.[conv.messages.length - 1];

              return (
                <div
                  key={conv.id}
                  onClick={() => handleOpenConversation(conv)}
                  className={`flex items-center px-4 py-3 gap-3 cursor-pointer transition-colors ${
                    isSelected ? 'bg-[#262626]/80' : 'hover:bg-[#121212]'
                  }`}
                >
                  {/* Round Avatar */}
                  <div
                    className={`w-12 h-12 rounded-full shrink-0 flex items-center justify-center shadow-sm overflow-hidden font-bold text-sm ${
                      conv.contact?.avatarBg || ((conv.contact?.isVerified || conv.isVerified) ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white' : 'bg-[#262626] text-white border border-gray-700/50')
                    }`}
                  >
                    {conv.contact?.avatar && conv.contact.avatar.length <= 2 ? (
                      <span className="text-white text-base font-semibold">{conv.contact.avatar}</span>
                    ) : (
                      <User className="w-6 h-6 text-gray-300" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0 pr-2">
                        <span className="font-semibold text-xs sm:text-sm text-white truncate">
                          {conv.contact?.name || 'Contact'}
                        </span>
                        {(conv.contact?.isVerified || conv.isVerified) && (
                          <span
                            className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-[#0095f6] text-white shrink-0 shadow-xs"
                            title="Verified Account"
                            data-testid="instagram-sidebar-verified-badge"
                          >
                            <Check className="w-2 h-2 stroke-[3.5]" />
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-400 mt-0.5">
                      <p className="truncate flex-1 pr-2">
                        {lastMsg ? lastMsg.text : 'Sent an attachment'} &middot; {conv.lastActivity || '1h'}
                      </p>
                      {conv.unreadCount > 0 && (
                        <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. MAIN CHAT AREA (Screenshot 4)                               */}
      {/* ============================================================== */}
      <div
        className={`${
          isMobile && !activeConvId ? 'hidden' : 'flex'
        } flex-1 flex-col h-full bg-black overflow-hidden relative`}
      >
        {activeConversation ? (
          <>
            {/* Top Chat Header */}
            <header className="h-16 px-4 bg-black flex items-center justify-between shrink-0 border-b border-[#262626] z-10">
              <div className="flex items-center gap-3 min-w-0">
                {isMobile && (
                  <button
                    onClick={() => setActiveConvId(null)}
                    className="p-1 text-white hover:opacity-70 rounded-full mr-1"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                )}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm shrink-0 overflow-hidden font-bold text-sm ${
                    activeConversation.contact?.avatarBg || ((activeConversation.contact?.isVerified || activeConversation.isVerified) ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white' : 'bg-[#262626] text-white border border-gray-700/50')
                  }`}
                >
                  {activeConversation.contact?.avatar && activeConversation.contact.avatar.length <= 2 ? (
                    <span className="text-white text-base font-semibold">{activeConversation.contact.avatar}</span>
                  ) : (
                    <User className="w-5 h-5 text-gray-300" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <h2 className="font-semibold text-sm text-white truncate">
                      {activeConversation.contact?.name}
                    </h2>
                    {(activeConversation.contact?.isVerified || activeConversation.isVerified) && (
                      <span
                        className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-[#0095f6] text-white shrink-0 shadow-xs"
                        title="Verified Account"
                        data-testid="instagram-verified-badge"
                      >
                        <Check className="w-2.5 h-2.5 stroke-[3.5]" />
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400 truncate">
                    {(activeConversation.contact?.isVerified || activeConversation.isVerified)
                      ? `${activeConversation.contact?.handle ? `@${activeConversation.contact.handle}` : 'Instagram'} • Verified Account`
                      : (activeConversation.contact?.handle ? `@${activeConversation.contact.handle}` : 'Instagram User')}
                  </p>
                </div>
              </div>

              {/* Header Right Icons */}
              <div className="flex items-center gap-3 text-white">
                <button
                  title="Phone call"
                  onClick={() => emitEvent('side_tool_clicked', { tool: 'call' })}
                  className="p-1.5 hover:opacity-70"
                >
                  <Phone className="w-5 h-5" />
                </button>
                <button
                  title="Video call"
                  onClick={() => emitEvent('side_tool_clicked', { tool: 'video_call' })}
                  className="p-1.5 hover:opacity-70"
                >
                  <Video className="w-5 h-5" />
                </button>

                {/* DETAILS TOGGLE BUTTON (ℹ️ icon - Screenshot 5) */}
                <button
                  onClick={() => setIsDetailsPanelOpen(prev => !prev)}
                  title="Conversation Details"
                  aria-label="Conversation Details"
                  data-testid="instagram-details-button"
                  className={`p-1.5 rounded-full transition-colors ${
                    isDetailsPanelOpen ? 'bg-white/10 text-blue-400' : 'hover:opacity-70 text-white'
                  }`}
                >
                  <Info className="w-5 h-5" />
                </button>
              </div>
            </header>

            {/* Link Warning Banner */}
            {linkNotice && (
              <div className="bg-amber-950/90 border-b border-amber-800/80 px-4 py-2 text-xs text-amber-200 flex items-center justify-between z-20">
                <div className="flex items-center gap-2 overflow-hidden mr-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="truncate">
                    <strong>Simulated Instagram Link Intercepted:</strong>{' '}
                    <code className="bg-amber-900/60 px-1 py-0.5 rounded text-[11px]">{linkNotice.url}</code>
                  </span>
                </div>
                <button
                  onClick={() => setLinkNotice(null)}
                  className="text-amber-400 hover:text-white p-1 rounded shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Chat Body & Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 bg-black">
              {/* Date/Time divider */}
              <div className="text-center text-[10px] text-gray-500 my-2">11:59</div>

              {/* Messages list */}
              {(activeConversation.messages || []).map((msg) => {
                const isUser = msg.sender === 'user';

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[80%] sm:max-w-md rounded-3xl px-4 py-2.5 text-xs sm:text-sm shadow-xs ${
                        isUser
                          ? 'bg-[#3797f0] text-white'
                          : 'bg-[#262626] text-white'
                      }`}
                    >
                      <p className="whitespace-pre-line leading-relaxed break-words">{msg.text}</p>

                      {/* Phishing link if included */}
                      {msg.link && (
                        <div className="mt-2 p-2.5 bg-black/60 rounded-xl border border-gray-700">
                          <a
                            href={msg.link.url || '#'}
                            onClick={(e) => handleSimulatedLink(e, msg.link)}
                            className="text-blue-400 hover:underline break-all text-xs flex items-center gap-1.5 font-mono"
                          >
                            <span>{msg.link.text || msg.link.url}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        </div>
                      )}
                    </div>

                    {isUser && (
                      <span className="text-[10px] text-gray-500 mt-1 mr-2">Seen 1 h ago</span>
                    )}
                  </div>
                );
              })}
              {/* Attacker Typing Indicator */}
              {isAiTyping && (
                <div className="flex justify-start mb-2 animate-fadeIn">
                  <div className="bg-[#262626] rounded-2xl rounded-bl-xs px-3.5 py-2 shadow-xs flex items-center gap-1.5 border border-[#363636]">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    <span className="text-[11px] text-gray-400 font-sans ml-1">typing...</span>
                  </div>
                </div>
              )}

              {/* Compromise Notice */}
              {compromisedNotice && (
                <div className="my-2 p-2.5 bg-red-950/80 border border-red-700 rounded-lg text-xs text-red-200 flex items-center gap-2 animate-fadeIn">
                  <AlertOctagon className="w-4 h-4 text-red-400 shrink-0" />
                  <span><strong>Compromise Detected:</strong> {compromisedNotice}</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Bottom Message Input */}
            <footer className="h-16 px-4 bg-black flex items-center gap-2 shrink-0 border-t border-[#262626]/40">
              <div className="flex-1 flex items-center bg-[#1c1c1c] border border-gray-700 rounded-full px-3.5 py-2">
                <button title="Emoji" className="text-gray-400 hover:text-white mr-2.5">
                  <Smile className="w-5 h-5" />
                </button>
                <form onSubmit={handleSendMessage} className="flex-1 flex items-center">
                  <input
                    type="text"
                    placeholder="Message..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className="w-full bg-transparent border-none text-white placeholder-gray-500 text-xs sm:text-sm focus:outline-none"
                  />
                </form>
                {inputText.trim() ? (
                  <button
                    onClick={handleSendMessage}
                    className="text-blue-500 font-semibold text-xs px-2 hover:text-blue-400 active:scale-95"
                  >
                    Send
                  </button>
                ) : (
                  <div className="flex items-center gap-2.5 text-gray-400">
                    <button title="Voice note" className="hover:text-white">
                      <Mic className="w-5 h-5" />
                    </button>
                    <button title="Image" className="hover:text-white">
                      <ImageIcon className="w-5 h-5" />
                    </button>
                    <button title="Heart" className="hover:text-white">
                      <Heart className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            </footer>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-500">
            <div className="w-20 h-20 rounded-full border-2 border-white flex items-center justify-center mb-3">
              <MessageCircle className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-lg font-bold text-white mb-1">Your messages</h2>
            <p className="text-xs text-gray-400 mb-4">Send a message to start a chat.</p>
            <button
              onClick={() => {
                if (conversations[0]) handleOpenConversation(conversations[0]);
              }}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg text-xs font-semibold"
            >
              Open Direct Messages
            </button>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 4. DETAILS SLIDE-OUT PANEL (Screenshot 5)                      */}
      {/* ============================================================== */}
      {isDetailsPanelOpen && activeConversation && (
        <aside
          data-testid="instagram-details-panel"
          className="w-80 shrink-0 bg-black border-l border-[#262626] flex flex-col justify-between p-4 z-20 animate-fadeIn"
        >
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#262626] mb-4">
              <h3 className="font-bold text-base text-white">Details</h3>
              <button
                onClick={() => setIsDetailsPanelOpen(false)}
                className="p-1 text-gray-400 hover:text-white rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mute Messages Toggle */}
            <div className="flex items-center justify-between py-3 border-b border-[#262626] text-xs">
              <span className="font-medium text-white">Mute messages</span>
              <button
                onClick={() => setIsMuted(prev => !prev)}
                className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                  isMuted ? 'bg-blue-600 justify-end' : 'bg-gray-700 justify-start'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md"></div>
              </button>
            </div>

            {/* Members Section */}
            <div className="py-4 border-b border-[#262626]">
              <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block mb-3">
                Members
              </span>
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm shrink-0 overflow-hidden ${
                    activeConversation.contact?.avatarBg || 'bg-[#262626] text-white border border-gray-700/50'
                  }`}
                >
                  <User className="w-5 h-5 text-gray-300" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">
                    {activeConversation.contact?.name}
                  </p>
                  <p className="text-[11px] text-gray-500 truncate">
                    {activeConversation.contact?.handle ? `@${activeConversation.contact?.handle}` : 'Member'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Lower Action Links (Matching Screenshot 5) */}
          <div className="space-y-3 pt-6 border-t border-[#262626] text-xs font-medium">
            <button className="w-full text-left text-white hover:text-gray-300 py-1 transition-colors">
              Nicknames
            </button>

            {/* DEFENSIVE TERMINATION 1: BLOCK */}
            <button
              onClick={handleBlockUser}
              className="w-full text-left text-white hover:text-red-400 py-1 transition-colors flex items-center justify-between"
            >
              <span>Block</span>
              <Ban className="w-4 h-4 text-gray-500" />
            </button>

            {/* DEFENSIVE TERMINATION 2: REPORT (Red text matching Screenshot 5) */}
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="w-full text-left text-red-500 hover:text-red-400 py-1 font-semibold transition-colors flex items-center justify-between"
            >
              <span>Report</span>
              <ShieldAlert className="w-4 h-4 text-red-500" />
            </button>

            {/* DEFENSIVE TERMINATION 3: DELETE CHAT (Red text matching Screenshot 5) */}
            <button
              onClick={handleDeleteChat}
              className="w-full text-left text-red-500 hover:text-red-400 py-1 font-semibold transition-colors flex items-center justify-between"
            >
              <span>Delete chat</span>
              <Trash2 className="w-4 h-4 text-red-500" />
            </button>
          </div>
        </aside>
      )}

      {/* ============================================================== */}
      {/* 5. THREAT REPORTING MODAL                                      */}
      {/* ============================================================== */}
      {isReportModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fadeIn"
        >
          <div className="bg-[#121212] text-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-[#262626]">
            <div className="px-5 py-4 bg-[#1f1214] border-b border-[#3d1d22] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-red-900/60 text-red-400 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Report Instagram Threat</h3>
                  <p className="text-[11px] text-gray-400">Flag malicious DM indicators</p>
                </div>
              </div>
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="p-1 rounded-full text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-2.5 text-xs">
              <label className="flex items-start gap-2.5 p-2 rounded-lg bg-[#1c1c1c] hover:bg-[#262626] cursor-pointer">
                <input
                  type="checkbox"
                  checked={reportIndicators.suspiciousLink}
                  onChange={(e) =>
                    setReportIndicators((prev) => ({ ...prev, suspiciousLink: e.target.checked }))
                  }
                  className="mt-0.5 rounded border-gray-600 text-red-600 focus:ring-0"
                />
                <span>Unverified voting/login link sent via DM</span>
              </label>

              <label className="flex items-start gap-2.5 p-2 rounded-lg bg-[#1c1c1c] hover:bg-[#262626] cursor-pointer">
                <input
                  type="checkbox"
                  checked={reportIndicators.credentialPhishing}
                  onChange={(e) =>
                    setReportIndicators((prev) => ({ ...prev, credentialPhishing: e.target.checked }))
                  }
                  className="mt-0.5 rounded border-gray-600 text-red-600 focus:ring-0"
                />
                <span>Attempted credential harvesting / account hijacking</span>
              </label>

              <label className="flex items-start gap-2.5 p-2 rounded-lg bg-[#1c1c1c] hover:bg-[#262626] cursor-pointer">
                <input
                  type="checkbox"
                  checked={reportIndicators.accountImpersonation}
                  onChange={(e) =>
                    setReportIndicators((prev) => ({ ...prev, accountImpersonation: e.target.checked }))
                  }
                  className="mt-0.5 rounded border-gray-600 text-red-600 focus:ring-0"
                />
                <span>Impersonation of peer or content creator</span>
              </label>
            </div>

            <div className="px-4 py-3 bg-black border-t border-[#262626] flex items-center justify-end gap-2">
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="px-3 py-1.5 rounded-full text-xs text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReport}
                className="px-4 py-1.5 rounded-full text-xs font-semibold bg-red-600 hover:bg-red-500 text-white shadow-xs"
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
