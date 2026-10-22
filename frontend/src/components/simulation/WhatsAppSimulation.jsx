import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  MessageSquare,
  Phone,
  Video,
  Search,
  MoreVertical,
  Paperclip,
  Smile,
  Mic,
  Send,
  ArrowLeft,
  Check,
  CheckCheck,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  Ban,
  Trash2,
  X,
  User,
  ExternalLink,
  Plus,
  Users,
  Radio,
  Disc,
  Settings,
  Archive,
  Download,
  FileText
} from 'lucide-react';

/**
 * WhatsAppSimulation Component
 * 
 * Authentic, pixel-perfect WhatsApp Web attack simulation interface.
 * Implements full conversational interaction, message history, multimedia links,
 * unread badges, and real-world defensive actions (Block, Report, Delete chat).
 * 
 * @param {Object} props
 * @param {Object} props.scenario - Validated scenario JSON object
 * @param {string} props.sessionId - Current simulation session ID
 * @param {string} props.deviceMode - 'full' for desktop, 'mobile' for smartphone view
 * @param {Function} props.onAction - Telemetry event callback
 * @param {Function} props.onComplete - Termination callback
 */
export default function WhatsAppSimulation({
  scenario,
  sessionId = 'sess-sim-default',
  deviceMode = 'full',
  onAction,
  onComplete
}) {
  if (!scenario || typeof scenario !== 'object') {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] p-6 bg-[#111b21] text-gray-200">
        <div className="text-center p-8 bg-[#202c33] border border-[#2f3b43] rounded-2xl shadow-xl max-w-md">
          <AlertOctagon className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-white mb-2">Scenario Unavailable</h2>
          <p className="text-xs text-gray-400">
            No valid WhatsApp attack scenario data was provided to the runner.
          </p>
        </div>
      </div>
    );
  }

  const scenarioId = scenario.scenarioId || scenario.id || 'unnamed-scenario';
  const targetId = scenario.targetId || 'target-whatsapp';

  const userProfile = scenario.userProfile || {
    name: 'Pavan Kalyan',
    handle: '@_pavan_kalyan_1207',
    avatar: 'P',
    phone: '+91 98765 43210'
  };

  // Build conversations list from scenario
  const initialConversations = useMemo(() => {
    if (Array.isArray(scenario.conversations) && scenario.conversations.length > 0) {
      return scenario.conversations;
    }
    return [
      {
        id: targetId,
        isTarget: true,
        contact: {
          name: 'Suuuuryaaaa 💀💀💀 VIT',
          phone: '+91 94421 88902',
          avatar: 'S',
          avatarBg: 'bg-emerald-700 text-white',
          status: 'online',
          about: 'Hey there! I am using WhatsApp.'
        },
        unreadCount: 3,
        lastActivity: '9:21 AM',
        messages: [
          {
            id: 'm1',
            sender: 'contact',
            text: '👀👀',
            timestamp: '9:12 AM'
          },
          {
            id: 'm2',
            sender: 'contact',
            text: 'Not came?',
            timestamp: '9:12 AM'
          },
          {
            id: 'm3',
            sender: 'user',
            text: 'Yea not came',
            timestamp: '9:12 AM',
            status: 'read'
          },
          {
            id: 'm4',
            sender: 'user',
            text: 'Quiz portion?',
            timestamp: '9:13 AM',
            status: 'read'
          },
          {
            id: 'm5',
            sender: 'contact',
            text: 'Ji mam said Same like I asked during review',
            timestamp: '9:19 AM'
          },
          {
            id: 'm6',
            sender: 'contact',
            text: 'Check this link for the leaked quiz questions: https://vit-ac-in-portal-verify.in/quiz-paper',
            timestamp: '9:20 AM',
            link: {
              id: 'l1',
              url: 'https://vit-ac-in-portal-verify.in/quiz-paper',
              text: 'https://vit-ac-in-portal-verify.in/quiz-paper'
            }
          },
          {
            id: 'm7',
            sender: 'contact',
            text: "Ya that's what she said",
            timestamp: '9:21 AM'
          }
        ]
      },
      {
        id: 'conv-2',
        isTarget: false,
        contact: {
          name: 'VCV - club official 📢',
          phone: '+91 99887 76655',
          avatar: 'V',
          avatarBg: 'bg-purple-700 text-white',
          status: 'offline'
        },
        unreadCount: 75,
        lastActivity: '1:11 PM',
        messages: [
          {
            id: 'v1',
            sender: 'contact',
            text: '~Hari Haran: https://www.facebook.com/share/r/1DNa6A5nR9/',
            timestamp: '1:11 PM'
          }
        ]
      },
      {
        id: 'conv-3',
        isTarget: false,
        contact: {
          name: 'Nexora Hackathon',
          phone: '+91 98111 22334',
          avatar: 'N',
          avatarBg: 'bg-blue-700 text-white',
          status: 'offline'
        },
        unreadCount: 156,
        lastActivity: '11:50 AM',
        messages: [
          {
            id: 'n1',
            sender: 'contact',
            text: '~Vignesh: THE DIMENSION IS OPENING 💀',
            timestamp: '11:50 AM'
          }
        ]
      },
      {
        id: 'conv-4',
        isTarget: false,
        contact: {
          name: 'Ithu namma VIT - Ask ur Queries 😇',
          phone: '+91 94000 11223',
          avatar: 'I',
          avatarBg: 'bg-red-700 text-white',
          status: 'offline'
        },
        unreadCount: 5,
        lastActivity: '11:41 AM',
        messages: [
          {
            id: 'i1',
            sender: 'contact',
            text: 'sent ~ Kpr.Nandhakumar message history that starts on Se...',
            timestamp: '11:41 AM'
          }
        ]
      }
    ];
  }, [scenario, targetId]);

  const [conversations, setConversations] = useState(initialConversations);
  // Default active conversation is the target attack chat
  const [activeConvId, setActiveConvId] = useState(() => {
    const target = initialConversations.find(c => c.isTarget);
    return target ? target.id : (initialConversations[0]?.id || null);
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'unread' | 'favorites' | 'groups'
  const [inputText, setInputText] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportIndicators, setReportIndicators] = useState({
    suspiciousLink: false,
    urgentThreat: false,
    unknownContact: false,
    impersonation: false
  });
  const [linkNotice, setLinkNotice] = useState(null);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [compromisedNotice, setCompromisedNotice] = useState(null);

  const menuRef = useRef(null);
  const messagesEndRef = useRef(null);
  const hasEmittedViewed = useRef(false);

  // Outside click for 3-dot menu
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  // Safe Event Dispatcher
  const emitEvent = (eventType, metadata = {}) => {
    const payload = {
      eventType,
      scenarioId,
      sessionId,
      targetId: activeConvId || targetId,
      timestamp: new Date().toISOString(),
      metadata: {
        channel: 'whatsapp',
        platform: 'whatsapp_web',
        ...metadata
      }
    };

    if (typeof onAction === 'function') {
      try {
        onAction(payload);
      } catch (err) {
        console.error('[WhatsAppSimulation] onAction error:', err);
      }
    }
    return payload;
  };

  // Emit scenario_viewed once on mount
  useEffect(() => {
    if (!hasEmittedViewed.current) {
      hasEmittedViewed.current = true;
      emitEvent('scenario_viewed', {
        scenarioTitle: scenario.title || 'WhatsApp Attack Simulation',
        category: scenario.category || 'Pretexting',
        difficulty: scenario.difficulty || 'Medium'
      });
    }
  }, [scenarioId, sessionId]);

  // Active conversation object
  const activeConversation = useMemo(() => {
    return conversations.find(c => c.id === activeConvId) || null;
  }, [conversations, activeConvId]);

  // Auto-scroll messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeConversation?.messages]);

  // Handle open conversation
  const handleOpenConversation = (conv) => {
    setActiveConvId(conv.id);
    setIsMenuOpen(false);

    // Clear unread count locally
    setConversations(prev =>
      prev.map(c => (c.id === conv.id ? { ...c, unreadCount: 0 } : c))
    );

    emitEvent('conversation_opened', {
      conversationId: conv.id,
      contactName: conv.contact?.name,
      isTarget: conv.isTarget
    });
  };

  // Send message handler
  const handleSendMessage = (e) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || !activeConvId) return;

    const newMsg = {
      id: `msg-sent-${Date.now()}`,
      sender: 'user',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'read'
    };

    setConversations(prev =>
      prev.map(c => {
        if (c.id === activeConvId) {
          return {
            ...c,
            lastActivity: newMsg.timestamp,
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
        channel: 'whatsapp',
        dialogueHistory: historySnapshot,
        contactName: activeConversation?.contact?.name || scenario.contactName || 'WhatsApp Contact',
        personaContext: scenario.description || scenario.title || 'Attacker contacting target on WhatsApp',
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
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setConversations(prev =>
          prev.map(c => {
            if (c.id === activeConvId) {
              return {
                ...c,
                lastActivity: attackerMsg.timestamp,
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
          setCompromisedNotice(data.explanation || 'Sensitive credentials disclosed via WhatsApp.');
          emitEvent('sensitive_info_disclosed', {
            conversationId: activeConvId,
            reason: data.explanation || 'User disclosed credentials via WhatsApp',
            leakedText: trimmed
          });
          emitEvent('credential_submitted', {
            conversationId: activeConvId,
            reason: data.explanation || 'User disclosed credentials via WhatsApp',
            compromised: true
          });

          setTimeout(() => {
            if (typeof onComplete === 'function') {
              onComplete({
                status: 'completed',
                action: 'sensitive_info_disclosed',
                scenarioId,
                sessionId,
                reason: data.explanation || 'User disclosed sensitive credentials or security information on WhatsApp'
              });
            }
          }, 1200);
        }
      })
      .catch(err => {
        setIsAiTyping(false);
        console.error('[WhatsApp AI Response Error]:', err);
      });
  };

  // Handle simulated link clicked (Malicious Link Failure Condition)
  const handleSimulatedLink = (e, linkMeta) => {
    if (e) e.preventDefault();

    emitEvent('simulated_link_clicked', {
      actionId: linkMeta.id || 'whatsapp_link',
      url: linkMeta.url || linkMeta.text,
      label: linkMeta.text,
      targetPhish: true
    });

    setLinkNotice({
      url: linkMeta.url || linkMeta.text,
      text: 'Simulated WhatsApp link intercepted.'
    });
  };

  // 1. Block Contact Action (Positive Termination)
  const handleBlockContact = () => {
    setIsMenuOpen(false);
    const contactName = activeConversation?.contact?.name || 'Contact';

    emitEvent('user_blocked_sender', {
      conversationId: activeConvId,
      contactName,
      reportedTarget: activeConversation?.isTarget
    });

    // Remove or grey out conversation
    setConversations(prev => prev.filter(c => c.id !== activeConvId));
    setActiveConvId(null);

    if (typeof onComplete === 'function') {
      onComplete({
        status: 'safe_exit',
        action: 'user_blocked_sender',
        scenarioId,
        sessionId,
        reason: `Blocked suspicious WhatsApp contact "${contactName}"`
      });
    }
  };

  // 2. Report Threat Action (Positive Termination)
  const handleConfirmReport = () => {
    setIsReportModalOpen(false);
    setIsMenuOpen(false);

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

  // 3. Delete Chat Action (Positive Termination)
  const handleDeleteChat = () => {
    setIsMenuOpen(false);

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
        reason: 'User deleted suspicious WhatsApp conversation'
      });
    }
  };

  // Filtered conversation list
  const filteredConversations = useMemo(() => {
    return conversations.filter(c => {
      const name = (c.contact?.name || '').toLowerCase();
      const lastMsg = (c.messages?.[c.messages.length - 1]?.text || '').toLowerCase();
      const matchesSearch = name.includes(searchQuery.toLowerCase()) || lastMsg.includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;
      if (activeFilter === 'unread') return c.unreadCount > 0;
      return true;
    });
  }, [conversations, searchQuery, activeFilter]);

  const isMobile = deviceMode === 'mobile';

  return (
    <div className="flex h-full w-full bg-[#111b21] text-[#e9edef] font-sans select-none overflow-hidden antialiased">
      {/* ============================================================== */}
      {/* 1. LEFTMOST NARROW RAIL (WhatsApp Web signature left icons)   */}
      {/* ============================================================== */}
      {!isMobile && (
        <aside className="w-14 shrink-0 bg-[#202c33] flex flex-col items-center py-3 justify-between border-r border-[#2f3b43]">
          {/* Top Icons */}
          <div className="flex flex-col items-center gap-5">
            {/* WhatsApp Logo */}
            <div className="w-10 h-10 rounded-full bg-[#25d366]/20 text-[#25d366] flex items-center justify-center cursor-pointer shadow-sm">
              <MessageSquare className="w-5 h-5 fill-current" />
            </div>

            {/* Chats tab with badge */}
            <button
              title="Chats"
              className="relative p-2.5 rounded-xl bg-[#374248] text-[#00a884] focus:outline-none"
            >
              <MessageSquare className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 bg-[#25d366] text-[#111b21] text-[9px] font-bold px-1.5 py-0.2 rounded-full leading-tight">
                99+
              </span>
            </button>

            {/* Status / Stories tab */}
            <button
              title="Status"
              onClick={() => emitEvent('side_tool_clicked', { tool: 'status' })}
              className="p-2.5 rounded-xl text-[#aebac1] hover:text-white hover:bg-white/5 transition-colors"
            >
              <Disc className="w-5 h-5" />
            </button>

            {/* Channels tab */}
            <button
              title="Channels"
              onClick={() => emitEvent('side_tool_clicked', { tool: 'channels' })}
              className="p-2.5 rounded-xl text-[#aebac1] hover:text-white hover:bg-white/5 transition-colors"
            >
              <Radio className="w-5 h-5" />
            </button>

            {/* Communities tab */}
            <button
              title="Communities"
              onClick={() => emitEvent('side_tool_clicked', { tool: 'communities' })}
              className="p-2.5 rounded-xl text-[#aebac1] hover:text-white hover:bg-white/5 transition-colors"
            >
              <Users className="w-5 h-5" />
            </button>

            {/* Meta AI Swirl */}
            <button
              title="Meta AI"
              className="p-2.5 rounded-xl text-[#aebac1] hover:text-purple-400 hover:bg-white/5 transition-colors"
            >
              <div className="w-5 h-5 rounded-full border-2 border-purple-400 flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-purple-400"></span>
              </div>
            </button>
          </div>

          {/* Bottom Icons */}
          <div className="flex flex-col items-center gap-3">
            <button
              title="Settings"
              className="p-2.5 rounded-xl text-[#aebac1] hover:text-white hover:bg-white/5 transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
            <div className="w-7 h-7 rounded-full bg-[#5c3e38] text-white flex items-center justify-center cursor-pointer overflow-hidden">
              <User className="w-4 h-4 text-gray-200" />
            </div>
          </div>
        </aside>
      )}

      {/* ============================================================== */}
      {/* 2. CHATS SIDEBAR (List of conversations)                       */}
      {/* ============================================================== */}
      <div
        className={`${
          isMobile && activeConvId ? 'hidden' : 'flex'
        } w-full sm:w-96 md:w-[420px] shrink-0 flex-col bg-[#111b21] border-r border-[#222e35]`}
      >
        {/* Header */}
        <div className="h-16 px-4 flex items-center justify-between shrink-0">
          <h1 className="text-xl font-bold text-[#e9edef] tracking-tight">WhatsApp</h1>
          <div className="flex items-center gap-2">
            <button
              title="New chat"
              className="w-9 h-9 rounded-full bg-[#00a884] text-[#111b21] flex items-center justify-center shadow-md hover:bg-[#06cf9c] transition-colors"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </button>
            <button title="Menu" className="p-2 text-[#aebac1] hover:text-white rounded-full hover:bg-white/5">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-3 pb-2 shrink-0">
          <div className="bg-[#202c33] rounded-lg px-3 py-1.5 flex items-center text-xs text-[#aebac1]">
            <Search className="w-4 h-4 mr-3 text-[#8696a0] shrink-0" />
            <input
              type="text"
              placeholder="Search or start a new chat"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none text-[#e9edef] placeholder-[#8696a0] text-sm flex-1 focus:outline-none"
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="px-3 pb-3 flex items-center gap-2 text-xs shrink-0 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1 rounded-full font-medium transition-colors ${
              activeFilter === 'all'
                ? 'bg-[#103629] text-[#25d366] border border-[#25d366]/40'
                : 'bg-[#202c33] text-[#8696a0] hover:bg-[#2a3942]'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveFilter('unread')}
            className={`px-3 py-1 rounded-full font-medium transition-colors ${
              activeFilter === 'unread'
                ? 'bg-[#103629] text-[#25d366] border border-[#25d366]/40'
                : 'bg-[#202c33] text-[#8696a0] hover:bg-[#2a3942]'
            }`}
          >
            Unread 139
          </button>
          <button
            onClick={() => setActiveFilter('favorites')}
            className="px-3 py-1 rounded-full font-medium bg-[#202c33] text-[#8696a0] hover:bg-[#2a3942] transition-colors"
          >
            Favorites
          </button>
          <button
            onClick={() => setActiveFilter('groups')}
            className="px-3 py-1 rounded-full font-medium bg-[#202c33] text-[#8696a0] hover:bg-[#2a3942] transition-colors"
          >
            Groups 79
          </button>
        </div>

        {/* Conversation List Items */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#202c33]/40">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-[#8696a0] text-xs">
              No chats found.
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = conv.id === activeConvId;
              const lastMsg = conv.messages?.[conv.messages.length - 1];

              return (
                <div
                  key={conv.id}
                  onClick={() => handleOpenConversation(conv)}
                  className={`flex items-center px-3.5 py-3 gap-3.5 cursor-pointer transition-colors ${
                    isSelected ? 'bg-[#2a3942]' : 'hover:bg-[#202c33]'
                  }`}
                >
                  {/* Contact Avatar */}
                  <div
                    className={`w-12 h-12 rounded-full shrink-0 flex items-center justify-center shadow-sm overflow-hidden ${
                      conv.contact?.avatarBg || 'bg-[#6b7b85] text-white'
                    }`}
                  >
                    <User className="w-7 h-7 text-[#cfd9df]" />
                  </div>

                  {/* Info Column */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-semibold text-sm text-[#e9edef] truncate">
                        {conv.contact?.name || 'Contact'}
                      </span>
                      <span
                        className={`text-[11px] shrink-0 ml-2 ${
                          conv.unreadCount > 0 ? 'text-[#25d366] font-semibold' : 'text-[#8696a0]'
                        }`}
                      >
                        {conv.lastActivity || lastMsg?.timestamp || '11:45 AM'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-[#8696a0]">
                      <p className="truncate flex-1 pr-2">
                        {lastMsg ? (
                          <>
                            {lastMsg.sender === 'user' && (
                              <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb] inline mr-1" />
                            )}
                            {lastMsg.text || 'Photo / Link'}
                          </>
                        ) : (
                          conv.contact?.about || 'Tap to chat'
                        )}
                      </p>

                      {conv.unreadCount > 0 && (
                        <span className="bg-[#25d366] text-[#111b21] text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 min-w-[18px] text-center">
                          {conv.unreadCount}
                        </span>
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
      {/* 3. MAIN CHAT VIEW AREA (Screenshots 2 & 3)                     */}
      {/* ============================================================== */}
      <div
        className={`${
          isMobile && !activeConvId ? 'hidden' : 'flex'
        } flex-1 flex-col h-full bg-[#0b141a] overflow-hidden relative`}
      >
        {activeConversation ? (
          <>
            {/* Header */}
            <header className="h-16 px-4 bg-[#202c33] flex items-center justify-between shrink-0 z-20 border-b border-[#2a3942]/40">
              <div className="flex items-center gap-3 min-w-0">
                {isMobile && (
                  <button
                    onClick={() => setActiveConvId(null)}
                    className="p-1 text-[#aebac1] hover:text-white rounded-full mr-1"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                )}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm shrink-0 overflow-hidden ${
                    activeConversation.contact?.avatarBg || 'bg-[#6b7b85] text-white'
                  }`}
                >
                  <User className="w-6 h-6 text-[#cfd9df]" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-semibold text-sm sm:text-base text-[#e9edef] truncate">
                    {activeConversation.contact?.name}
                  </h2>
                  <p className="text-[11px] text-[#8696a0] truncate">
                    {activeConversation.contact?.status === 'online' ? 'online' : 'last seen recently'}
                  </p>
                </div>
              </div>

              {/* Action Icons */}
              <div className="flex items-center gap-1 sm:gap-2 text-[#aebac1]">
                <button
                  title="Video call"
                  onClick={() => emitEvent('side_tool_clicked', { tool: 'video_call' })}
                  className="p-2 hover:text-white rounded-full hover:bg-white/5"
                >
                  <Video className="w-5 h-5" />
                </button>
                <button
                  title="Voice call"
                  onClick={() => emitEvent('side_tool_clicked', { tool: 'voice_call' })}
                  className="p-2 hover:text-white rounded-full hover:bg-white/5"
                >
                  <Phone className="w-4 h-4" />
                </button>
                <button
                  title="Search in chat"
                  className="p-2 hover:text-white rounded-full hover:bg-white/5"
                >
                  <Search className="w-5 h-5" />
                </button>

                {/* 3-DOT OVERFLOW MENU (Matching Screenshot 3) */}
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsMenuOpen((prev) => !prev);
                    }}
                    title="Menu"
                    aria-label="Menu"
                    data-testid="whatsapp-menu-button"
                    className="p-2 hover:text-white rounded-full hover:bg-white/5"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>

                  {isMenuOpen && (
                    <div
                      data-testid="whatsapp-options-menu"
                      className="absolute right-0 top-full mt-1 w-56 bg-[#233138] border border-[#2e3e48] rounded-2xl shadow-2xl py-2 z-50 text-xs text-[#d1d7db] font-sans"
                    >
                      <button
                        onClick={() => setIsMenuOpen(false)}
                        className="w-full px-4 py-2 hover:bg-[#182229] text-left transition-colors"
                      >
                        Contact info
                      </button>
                      <button
                        onClick={() => setIsMenuOpen(false)}
                        className="w-full px-4 py-2 hover:bg-[#182229] text-left transition-colors"
                      >
                        Search
                      </button>
                      <button
                        onClick={() => setIsMenuOpen(false)}
                        className="w-full px-4 py-2 hover:bg-[#182229] text-left transition-colors"
                      >
                        Mute notifications
                      </button>
                      <button
                        onClick={() => setIsMenuOpen(false)}
                        className="w-full px-4 py-2 hover:bg-[#182229] text-left transition-colors"
                      >
                        Disappearing messages
                      </button>
                      <button
                        onClick={() => setIsMenuOpen(false)}
                        className="w-full px-4 py-2 hover:bg-[#182229] text-left transition-colors"
                      >
                        Export chat
                      </button>
                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          setActiveConvId(null);
                        }}
                        className="w-full px-4 py-2 hover:bg-[#182229] text-left transition-colors"
                      >
                        Close chat
                      </button>

                      <div className="border-t border-[#2f3f4a] my-1" />

                      {/* DEFENSIVE TERMINATION 1: REPORT */}
                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          setIsReportModalOpen(true);
                        }}
                        className="w-full px-4 py-2 hover:bg-red-950/40 text-left text-red-400 font-medium transition-colors flex items-center justify-between"
                      >
                        <span>Report</span>
                        <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                      </button>

                      {/* DEFENSIVE TERMINATION 2: BLOCK */}
                      <button
                        onClick={handleBlockContact}
                        className="w-full px-4 py-2 hover:bg-red-950/40 text-left text-red-400 font-medium transition-colors flex items-center justify-between"
                      >
                        <span>Block</span>
                        <Ban className="w-3.5 h-3.5 text-red-400" />
                      </button>

                      <button
                        onClick={() => setIsMenuOpen(false)}
                        className="w-full px-4 py-2 hover:bg-[#182229] text-left transition-colors"
                      >
                        Clear chat
                      </button>

                      {/* DEFENSIVE TERMINATION 3: DELETE CHAT */}
                      <button
                        onClick={handleDeleteChat}
                        className="w-full px-4 py-2 hover:bg-red-950/40 text-left text-red-400 font-medium transition-colors flex items-center justify-between"
                      >
                        <span>Delete chat</span>
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </header>

            {/* Link notice alert */}
            {linkNotice && (
              <div className="bg-amber-950/90 border-b border-amber-800/80 px-4 py-2 text-xs text-amber-200 flex items-center justify-between z-20">
                <div className="flex items-center gap-2 overflow-hidden mr-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="truncate">
                    <strong>Simulated WhatsApp Link Intercepted:</strong>{' '}
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

            {/* Messages Scrollable Area (WhatsApp authentic doodle styling) */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 bg-[#0b141a]">
              {/* Date chip */}
              <div className="flex justify-center my-3">
                <span className="bg-[#182229] text-[#8696a0] text-[11px] font-medium px-3 py-1 rounded-lg shadow-xs">
                  Today
                </span>
              </div>

              {/* Message Bubbles */}
              {(activeConversation.messages || []).map((msg) => {
                const isUser = msg.sender === 'user';

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-md rounded-lg px-3 py-1.5 shadow-sm relative text-sm ${
                        isUser
                          ? 'bg-[#005c4b] text-[#e9edef] rounded-tr-none'
                          : 'bg-[#202c33] text-[#e9edef] rounded-tl-none'
                      }`}
                    >
                      {/* Message text */}
                      <p className="whitespace-pre-line leading-relaxed break-words">{msg.text}</p>

                      {/* If message has link */}
                      {msg.link && (
                        <div className="mt-2 p-2 bg-[#111b21] rounded-md border border-[#2f3b43]">
                          <a
                            href={msg.link.url || '#'}
                            onClick={(e) => handleSimulatedLink(e, msg.link)}
                            className="text-[#53bdeb] hover:underline break-all text-xs flex items-center gap-1 font-mono"
                          >
                            <span>{msg.link.text || msg.link.url}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        </div>
                      )}

                      {/* Timestamp & checks */}
                      <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-[#8696a0]">
                        <span>{msg.timestamp || '9:20 AM'}</span>
                        {isUser && (
                          <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {/* Attacker Typing Indicator */}
              {isAiTyping && (
                <div className="flex justify-start mb-2 animate-fadeIn">
                  <div className="bg-[#202c33] rounded-lg rounded-tl-none px-3.5 py-2 shadow-xs flex items-center gap-1.5 border border-[#2a3942]/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#8696a0] animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#8696a0] animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#8696a0] animate-bounce" style={{ animationDelay: '300ms' }} />
                    <span className="text-[11px] text-[#8696a0] font-sans ml-1">typing...</span>
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

            {/* Bottom Input Footer */}
            <footer className="h-16 px-3 bg-[#202c33] flex items-center gap-2 shrink-0 z-20">
              <button title="Emojis" className="p-2 text-[#8696a0] hover:text-[#e9edef] rounded-full">
                <Smile className="w-6 h-6" />
              </button>
              <button title="Attach" className="p-2 text-[#8696a0] hover:text-[#e9edef] rounded-full">
                <Paperclip className="w-5 h-5" />
              </button>

              <form onSubmit={handleSendMessage} className="flex-1 flex items-center">
                <input
                  type="text"
                  placeholder="Type a message"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="w-full bg-[#2a3942] text-[#e9edef] placeholder-[#8696a0] rounded-lg px-4 py-2 text-sm focus:outline-none"
                />
              </form>

              {inputText.trim() ? (
                <button
                  onClick={handleSendMessage}
                  title="Send"
                  className="p-2.5 text-[#00a884] hover:text-white rounded-full bg-white/5 active:scale-95"
                >
                  <Send className="w-5 h-5" />
                </button>
              ) : (
                <button title="Voice note" className="p-2 text-[#8696a0] hover:text-[#e9edef] rounded-full">
                  <Mic className="w-6 h-6" />
                </button>
              )}
            </footer>
          </>
        ) : (
          /* ============================================================== */
          /* EMPTY STATE (Matching Screenshot 1)                            */
          /* ============================================================== */
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none">
            <div className="w-48 h-32 mb-6 bg-[#202c33] rounded-2xl border border-[#2f3b43] flex flex-col items-center justify-center p-4 shadow-xl">
              <div className="w-12 h-12 rounded-full bg-[#00a884]/20 text-[#00a884] flex items-center justify-center mb-2">
                <Phone className="w-6 h-6" />
              </div>
              <span className="text-xs font-semibold text-[#aebac1]">WhatsApp Web Calls</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-normal text-[#e9edef] mb-2">
              Voice and video calling is now available
            </h2>
            <p className="text-xs sm:text-sm text-[#8696a0] max-w-md mb-6 leading-relaxed">
              Now you can make and join calls on WhatsApp Web. Select a chat from the left to start interacting.
            </p>

            <button
              onClick={() => {
                if (conversations[0]) handleOpenConversation(conversations[0]);
              }}
              className="bg-[#00a884] hover:bg-[#06cf9c] text-[#111b21] px-6 py-2.5 rounded-full text-xs sm:text-sm font-semibold shadow-lg transition-transform active:scale-95"
            >
              Go to Calls
            </button>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 4. THREAT REPORTING MODAL                                      */}
      {/* ============================================================== */}
      {isReportModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn"
        >
          <div className="bg-[#202c33] text-[#e9edef] rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-[#2e3e48]">
            <div className="px-5 py-4 bg-[#2b2123] border-b border-[#3b2a2b] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-red-900/60 text-red-400 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Report WhatsApp Threat</h3>
                  <p className="text-[11px] text-[#8696a0]">Flag suspicious contact & message</p>
                </div>
              </div>
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="p-1 rounded-full text-[#8696a0] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-2.5 text-xs">
              <label className="flex items-start gap-2.5 p-2 rounded-lg bg-[#111b21] hover:bg-[#182229] cursor-pointer">
                <input
                  type="checkbox"
                  checked={reportIndicators.suspiciousLink}
                  onChange={(e) =>
                    setReportIndicators((prev) => ({ ...prev, suspiciousLink: e.target.checked }))
                  }
                  className="mt-0.5 rounded border-gray-600 text-red-600 focus:ring-0"
                />
                <span>Unverified or phishing link shared in chat</span>
              </label>

              <label className="flex items-start gap-2.5 p-2 rounded-lg bg-[#111b21] hover:bg-[#182229] cursor-pointer">
                <input
                  type="checkbox"
                  checked={reportIndicators.urgentThreat}
                  onChange={(e) =>
                    setReportIndicators((prev) => ({ ...prev, urgentThreat: e.target.checked }))
                  }
                  className="mt-0.5 rounded border-gray-600 text-red-600 focus:ring-0"
                />
                <span>Urgent coercive request for credentials or money</span>
              </label>

              <label className="flex items-start gap-2.5 p-2 rounded-lg bg-[#111b21] hover:bg-[#182229] cursor-pointer">
                <input
                  type="checkbox"
                  checked={reportIndicators.impersonation}
                  onChange={(e) =>
                    setReportIndicators((prev) => ({ ...prev, impersonation: e.target.checked }))
                  }
                  className="mt-0.5 rounded border-gray-600 text-red-600 focus:ring-0"
                />
                <span>Impersonation of acquaintance, club, or faculty</span>
              </label>
            </div>

            <div className="px-4 py-3 bg-[#111b21] border-t border-[#2a3942] flex items-center justify-end gap-2">
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="px-3 py-1.5 rounded-full text-xs text-[#8696a0] hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReport}
                className="px-4 py-1.5 rounded-full text-xs font-semibold bg-red-700 hover:bg-red-600 text-white shadow-xs"
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
