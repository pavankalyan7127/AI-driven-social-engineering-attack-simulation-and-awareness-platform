import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  MessageSquare,
  Search,
  ArrowLeft,
  Send,
  Paperclip,
  Smile,
  Mic,
  MicOff,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  Ban,
  MoreVertical,
  X,
  Check,
  CheckCheck,
  FileText,
  Download,
  ExternalLink,
  Lock,
  User,
  Info,
  Clock,
  Phone,
  Video
} from 'lucide-react';

/**
 * Sanitizes contact/sender names to remove spoiler meta-tags like "(Impersonator)",
 * "(Attacker)", "(Fake)", "(Scammer)", etc.
 */
export function cleanContactName(name) {
  if (!name || typeof name !== 'string') return name || '';
  return name
    .replace(/\s*[\(\[\{](?:impersonator|impersonation|attacker|scammer|scam|fake|phishing|phisher|spoofed|malicious|fraudster|unverified|hacker|bot)[\)\]\}]/gi, '')
    .replace(/\s*-\s*(?:impersonator|impersonation|attacker|scammer|scam|fake|phishing|phisher|spoofed|malicious|fraudster|unverified|hacker|bot)/gi, '')
    .trim();
}

/**
 * ChatSimulation Component
 * 
 * Reusable simulation module for AI-driven social engineering attack training.
 * Provides a high-fidelity, data-driven, isolated chat / messaging environment.
 * 
 * @param {Object} props
 * @param {Object} props.scenario - Validated scenario JSON
 * @param {string} props.sessionId - Current simulation session ID
 * @param {Function} props.onAction - Reports user interaction events
 * @param {Function} props.onComplete - Notifies parent of terminal state
 */
export default function ChatSimulation({
  scenario,
  sessionId = 'sess-chat-sim-default',
  onAction,
  onComplete
}) {
  // Graceful fallback if scenario is missing
  if (!scenario || typeof scenario !== 'object') {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] p-6 bg-gray-50 text-gray-700 font-sans">
        <div className="text-center p-8 bg-white border border-gray-200 rounded-xl shadow-sm max-w-md">
          <AlertOctagon className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-semibold mb-2">Scenario Unavailable</h2>
          <p className="text-sm text-gray-600 mb-4">
            No valid chat attack scenario data was provided to the simulation runner.
          </p>
        </div>
      </div>
    );
  }

  // Session & Scenario IDs
  const scenarioId = scenario.scenarioId || scenario.id || 'unnamed-scenario';
  const targetId = scenario.targetId || 'target-conversation';

  // Primary navigation view: 'list' (Conversation List) | 'chat' (Opened Conversation)
  const [currentView, setCurrentView] = useState(scenario.initialView === 'chat' ? 'chat' : 'list');

  // Search filter query
  const [searchQuery, setSearchQuery] = useState('');

  // Local conversations state (cloned from scenario to support local message additions)
  const [conversations, setConversations] = useState(() => {
    if (Array.isArray(scenario.conversations) && scenario.conversations.length > 0) {
      return scenario.conversations.map(c => ({
        ...c,
        contact: c.contact ? {
          ...c.contact,
          name: cleanContactName(c.contact.name || c.contactName || c.sender?.name || scenario.contactName || 'External Contact')
        } : {
          name: cleanContactName(c.contactName || c.sender?.name || scenario.contactName || 'External Contact')
        },
        messages: Array.isArray(c.messages) ? [...c.messages] : []
      }));
    }
    // Fallback if conversations list is empty
    return [
      {
        id: targetId,
        isTarget: true,
        contact: {
          name: cleanContactName(scenario.contactName || 'External Contact'),
          handle: '+1 (555) 019-2831',
          avatar: '?',
          avatarBg: 'bg-red-700 text-white',
          status: 'online',
          badge: 'External Contact'
        },
        unreadCount: 1,
        lastActivity: 'Just now',
        messages: [
          {
            id: 'm-default-1',
            sender: 'contact',
            text: scenario.description || 'Urgent security verification requested.',
            timestamp: 'Just now'
          }
        ]
      }
    ];
  });

  // Active conversation ID
  const [activeConvId, setActiveConvId] = useState(() => {
    const target = conversations.find(c => c.isTarget || c.id === targetId);
    return target ? target.id : (conversations[0]?.id || null);
  });

  // Current active conversation object
  const activeConversation = useMemo(() => {
    return conversations.find(c => c.id === activeConvId) || conversations[0] || null;
  }, [conversations, activeConvId]);

  // Message composer input text
  const [inputText, setInputText] = useState('');

  // Emoji picker dropdown toggle
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Simulated file attachment picker toggle
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);

  // Simulated voice recording state
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // Intercepted simulated link notice
  const [linkNotice, setLinkNotice] = useState(null);

  // Simulated attachment inspection notice
  const [attachmentNotice, setAttachmentNotice] = useState(null);

  // Threat reporting modal state
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportIndicators, setReportIndicators] = useState({
    urgentImpersonation: false,
    credentialHarvestLink: false,
    unsolicitedAttachment: false,
    externalUnverifiedHandle: false,
    threatOfSuspension: false
  });
  const [reportNotes, setReportNotes] = useState('');
  const [threatReportedConfirmed, setThreatReportedConfirmed] = useState(false);

  // Dynamic AI reply & compromise states
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [compromisedNotice, setCompromisedNotice] = useState(null);

  // Options 3-dot dropdown menu state
  const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState(false);
  const optionsMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (optionsMenuRef.current && !optionsMenuRef.current.contains(e.target)) {
        setIsOptionsMenuOpen(false);
      }
    };
    if (isOptionsMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOptionsMenuOpen]);

  // Single scenario_viewed event tracker to prevent duplicate emissions on rerender
  const hasEmittedViewed = useRef(false);

  // Chat message container auto-scroll ref
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Safe Event Dispatcher
  const emitEvent = (eventType, metadata = {}) => {
    const payload = {
      eventType,
      scenarioId,
      sessionId,
      targetId: activeConversation?.id || targetId,
      timestamp: new Date().toISOString(),
      metadata: {
        channel: 'chat',
        currentView,
        ...metadata
      }
    };

    if (typeof onAction === 'function') {
      try {
        onAction(payload);
      } catch (err) {
        console.error('Error invoking onAction callback:', err);
      }
    }
    return payload;
  };

  // Emit scenario_viewed once on mount
  useEffect(() => {
    if (!hasEmittedViewed.current) {
      hasEmittedViewed.current = true;
      emitEvent('scenario_viewed', {
        scenarioTitle: scenario.title || 'Chat Social Engineering Simulation',
        category: scenario.category || 'Chat Phishing / Smishing',
        difficulty: scenario.difficulty || 'Medium',
        totalConversations: conversations.length,
        initialView: currentView
      });
    }
  }, [scenarioId, sessionId]);

  // Voice recording simulation timer
  useEffect(() => {
    let timer;
    if (isRecordingVoice) {
      timer = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } else {
      setRecordingSeconds(0);
    }
    return () => clearInterval(timer);
  }, [isRecordingVoice]);

  // Auto-scroll message container to bottom on message updates
  useEffect(() => {
    if (currentView === 'chat' && messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeConversation?.messages?.length, currentView]);

  // Open conversation from list
  const handleOpenConversation = (conv) => {
    setActiveConvId(conv.id);
    setCurrentView('chat');
    setLinkNotice(null);
    setAttachmentNotice(null);
    setShowEmojiPicker(false);
    setShowAttachmentMenu(false);

    // Mark as read locally
    setConversations(prev =>
      prev.map(c => (c.id === conv.id ? { ...c, unreadCount: 0 } : c))
    );

    emitEvent('conversation_opened', {
      conversationId: conv.id,
      contactName: conv.contact?.name,
      contactHandle: conv.contact?.handle,
      isTarget: Boolean(conv.isTarget || conv.id === targetId)
    });
  };

  // Return to conversation list
  const handleBackToList = () => {
    setCurrentView('list');
    setLinkNotice(null);
    setAttachmentNotice(null);
    setShowEmojiPicker(false);
    setShowAttachmentMenu(false);
  };

  // Send local message
  const handleSendMessage = (e) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;

    const newMessage = {
      id: `msg-user-${Date.now()}`,
      sender: 'user',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setConversations(prev =>
      prev.map(c => {
        if (c.id === activeConvId) {
          return {
            ...c,
            lastActivity: 'Just now',
            messages: [...(c.messages || []), newMessage]
          };
        }
        return c;
      })
    );

    emitEvent('message_sent', {
      conversationId: activeConvId,
      messageText: trimmed,
      recipient: activeConversation?.contact?.name
    });

    setInputText('');
    setShowEmojiPicker(false);
    if (inputRef.current) inputRef.current.focus();

    // Trigger AI attacker dynamic response & sensitive leak evaluation
    const historySnapshot = (activeConversation?.messages || []).concat(newMessage).map(m => ({
      sender: m.sender,
      text: m.text
    }));

    setIsAiTyping(true);
    fetch('/api/scenarios/chat/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userMessage: trimmed,
        channel: 'chat',
        dialogueHistory: historySnapshot,
        contactName: activeConversation?.contact?.name || scenario.contactName || 'External Contact',
        personaContext: scenario.description || scenario.title || 'Attacker posing as support or authority',
        scenarioContext: scenario.title || '',
        targetInformation: scenario.targetInformation || 'credentials, passwords, or verification links',
        language: scenario.language || 'auto'
      })
    })
      .then(res => res.json())
      .then(data => {
        setIsAiTyping(false);
        if (!data || !data.success) return;

        const attackerMsg = {
          id: `msg-attacker-${Date.now()}`,
          sender: 'contact',
          text: data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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

        // If sensitive info was disclosed or negative termination condition was met:
        if (data.sensitiveInfoDisclosed || data.isNegativeTermination) {
          setCompromisedNotice(data.explanation || 'Sensitive credentials disclosed in conversation.');
          emitEvent('sensitive_info_disclosed', {
            conversationId: activeConvId,
            reason: data.explanation || 'User disclosed sensitive credentials in chat',
            leakedText: trimmed
          });
          emitEvent('credential_submitted', {
            conversationId: activeConvId,
            reason: data.explanation || 'User disclosed sensitive credentials in chat',
            compromised: true
          });

          setTimeout(() => {
            if (typeof onComplete === 'function') {
              onComplete({
                status: 'completed',
                action: 'sensitive_info_disclosed',
                scenarioId,
                sessionId,
                reason: data.explanation || 'User disclosed sensitive credentials or security information in chat'
              });
            }
          }, 1200);
        }
      })
      .catch(err => {
        setIsAiTyping(false);
        console.error('[Chat AI Response Error]:', err);
      });
  };

  // Emoji picker insertion
  const handleInsertEmoji = (emoji) => {
    setInputText(prev => prev + emoji);
    setShowEmojiPicker(false);
    if (inputRef.current) inputRef.current.focus();
  };

  // Simulated link click interception
  const handleSimulatedLinkClick = (e, linkMeta) => {
    if (e) e.preventDefault();

    emitEvent('simulated_link_clicked', {
      linkId: linkMeta.id || 'simulated-chat-link',
      url: linkMeta.url || '#',
      label: linkMeta.text || 'Verification Portal',
      targetPhish: true
    });

    setLinkNotice({
      url: linkMeta.url || 'https://support-identity-auth-portal.com',
      text: linkMeta.text || 'Verification Portal'
    });
  };

  // Simulated attachment interaction
  const handleAttachmentClick = (e, attachmentMeta) => {
    if (e) e.preventDefault();

    emitEvent('attachment_interaction', {
      attachmentId: attachmentMeta.id || 'simulated-attachment',
      name: attachmentMeta.name || 'document.pdf',
      size: attachmentMeta.size || '1.0 MB',
      type: attachmentMeta.type || 'file',
      action: 'inspect_attachment'
    });

    setAttachmentNotice({
      name: attachmentMeta.name || 'document.pdf',
      size: attachmentMeta.size || '1.0 MB'
    });
  };

  // Toggle simulated voice recording
  const handleToggleVoice = () => {
    if (!isRecordingVoice) {
      setIsRecordingVoice(true);
      emitEvent('voice_interaction', {
        action: 'voice_recording_started',
        simulated: true
      });
    } else {
      setIsRecordingVoice(false);
      emitEvent('voice_interaction', {
        action: 'voice_recording_canceled',
        durationSeconds: recordingSeconds,
        simulated: true
      });
    }
  };

  // Send simulated voice note
  const handleSendSimulatedVoice = () => {
    setIsRecordingVoice(false);
    const durationStr = `0:0${Math.max(1, recordingSeconds)}`;

    const newVoiceMsg = {
      id: `msg-voice-${Date.now()}`,
      sender: 'user',
      isVoice: true,
      duration: durationStr,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setConversations(prev =>
      prev.map(c => {
        if (c.id === activeConvId) {
          return {
            ...c,
            lastActivity: 'Just now',
            messages: [...(c.messages || []), newVoiceMsg]
          };
        }
        return c;
      })
    );

    emitEvent('voice_interaction', {
      action: 'voice_message_sent',
      durationSeconds: recordingSeconds,
      simulated: true
    });
  };

  // Indicator checklist selection
  const handleToggleIndicator = (key) => {
    const nextVal = !reportIndicators[key];
    setReportIndicators(prev => ({ ...prev, [key]: nextVal }));

    emitEvent('warning_sign_selected', {
      indicatorKey: key,
      selected: nextVal
    });
  };

  // Confirm threat report
  const handleConfirmThreatReport = () => {
    const selectedCount = Object.values(reportIndicators).filter(Boolean).length;

    emitEvent('threat_reported', {
      conversationId: activeConvId,
      contactName: activeConversation?.contact?.name,
      contactHandle: activeConversation?.contact?.handle,
      indicators: reportIndicators,
      indicatorCount: selectedCount,
      notes: reportNotes,
      reportedTarget: Boolean(activeConversation?.isTarget || activeConvId === targetId)
    });

    setIsReportModalOpen(false);
    setThreatReportedConfirmed(true);

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

  // Block contact action (Defensive Positive Termination)
  const handleBlockContact = () => {
    setIsOptionsMenuOpen(false);
    emitEvent('user_blocked_sender', {
      contactName: activeConversation?.contact?.name || 'Contact',
      contactHandle: activeConversation?.contact?.handle,
      conversationId: activeConvId,
      reportedTarget: activeConversation?.isTarget
    });

    if (typeof onComplete === 'function') {
      onComplete({
        status: 'safe_exit',
        action: 'user_blocked_sender',
        scenarioId,
        sessionId,
        reason: `Blocked suspicious contact "${activeConversation?.contact?.name || 'Contact'}"`
      });
    }
  };

  // Filter conversations
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter(c => {
      const name = (c.contact?.name || '').toLowerCase();
      const handle = (c.contact?.handle || '').toLowerCase();
      const lastMsg = (c.messages?.[c.messages.length - 1]?.text || '').toLowerCase();
      return name.includes(q) || handle.includes(q) || lastMsg.includes(q);
    });
  }, [conversations, searchQuery]);

  // Profile data
  const userProfile = scenario.userProfile || {
    name: 'Pavan Kalyan',
    handle: '@pavankalyan',
    avatar: 'P',
    avatarBg: 'bg-[#5c3e38] text-white',
    status: 'Active'
  };

  const commonEmojis = ['👍', '👋', '😊', '🔒', '⚠️', '❓', '💻', '✅', '🚨', '🤝', '🙏', '👀'];

  return (
    <div className="flex h-screen w-full bg-[#f0f2f5] text-[#111b21] select-none overflow-hidden font-sans antialiased">
      {/* ============================================================== */}
      {/* VIEW A: CONVERSATION LIST (Responsive Sidebar / Full View)    */}
      {/* ============================================================== */}
      <aside
        aria-label="Conversations"
        className={`${
          currentView === 'list' ? 'flex' : 'hidden md:flex'
        } w-full md:w-96 lg:w-[410px] shrink-0 flex-col h-full bg-white border-r border-gray-200 z-10`}
      >
        {/* App Header & Current User Profile */}
        <div className="h-16 px-4 bg-[#f0f2f5] flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm ${
                userProfile.avatarBg || 'bg-[#5c3e38] text-white'
              }`}
            >
              {userProfile.avatar || userProfile.name?.charAt(0) || 'P'}
            </div>
            <div>
              <div className="font-semibold text-sm text-[#111b21] flex items-center gap-1.5">
                <span>{userProfile.name}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" title="Active"></span>
              </div>
              <div className="text-xs text-gray-500">{userProfile.handle || 'Enterprise Chat'}</div>
            </div>
          </div>

          <div className="flex items-center gap-1">
          </div>
        </div>

        {/* Search Input Filter */}
        <div className="p-3 bg-white border-b border-gray-100">
          <div className="relative flex items-center bg-[#f0f2f5] rounded-lg px-3 py-1.5 text-sm">
            <Search className="w-4 h-4 text-gray-500 mr-2 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search or start new chat"
              className="w-full bg-transparent border-none outline-none text-xs sm:text-sm text-[#111b21] placeholder-gray-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="p-1 hover:bg-black/5 rounded-full text-gray-500 ml-1"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Conversation List Rows */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-medium">No conversations found</p>
              <p className="text-xs text-gray-400 mt-1">
                No chats match "{searchQuery}"
              </p>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = conv.id === activeConvId;
              const hasUnread = conv.unreadCount > 0;
              const latestMsg = conv.messages?.[conv.messages.length - 1];

              return (
                <div
                  key={conv.id}
                  onClick={() => handleOpenConversation(conv)}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-[#f0f2f5]'
                      : hasUnread
                      ? 'bg-blue-50/40 hover:bg-gray-50'
                      : 'hover:bg-[#f5f6f6]'
                  }`}
                >
                  {/* Contact Avatar */}
                  <div className="relative shrink-0">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm ${
                        conv.contact?.avatarBg || 'bg-gray-600 text-white'
                      }`}
                    >
                      {conv.contact?.avatar || conv.contact?.name?.charAt(0) || '?'}
                    </div>
                    {conv.contact?.status === 'online' && (
                      <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white"></span>
                    )}
                  </div>

                  {/* Details & Snippet */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 truncate">
                        <span
                          className={`truncate text-sm ${
                            hasUnread ? 'font-bold text-gray-900' : 'font-semibold text-gray-800'
                          }`}
                        >
                          {conv.contact?.name}
                        </span>
                        {conv.contact?.badge && (
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded font-medium shrink-0 ${
                              conv.contact.badge.toLowerCase().includes('external')
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {conv.contact.badge}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-gray-400 shrink-0 ml-2">
                        {conv.lastActivity || latestMsg?.timestamp || ''}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <p
                        className={`text-xs truncate ${
                          hasUnread ? 'font-semibold text-gray-900' : 'text-gray-500'
                        }`}
                      >
                        {latestMsg?.isVoice
                          ? '🎙️ Voice note'
                          : latestMsg?.attachment
                          ? `📎 ${latestMsg.attachment.name}`
                          : latestMsg?.text || 'No messages yet'}
                      </p>

                      {hasUnread && (
                        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 ml-2">
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
      </aside>

      {/* ============================================================== */}
      {/* VIEW B: OPENED CONVERSATION (Chat History & Composer)          */}
      {/* ============================================================== */}
      <main
        aria-label="Conversation View"
        className={`${
          currentView === 'chat' ? 'flex' : 'hidden md:flex'
        } flex-1 flex-col h-full bg-[#efeae2] relative overflow-hidden`}
      >
        {/* Chat Header */}
        <header className="h-16 px-4 bg-[#f0f2f5] flex items-center justify-between border-b border-gray-200 shrink-0 z-10">
          <div className="flex items-center gap-3 min-w-0">
            {/* Back Button (Returns to View A) */}
            <button
              onClick={handleBackToList}
              className="p-2 -ml-2 rounded-full hover:bg-black/5 text-gray-600 transition-colors"
              title="Back to conversation list"
              aria-label="Back to conversations"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {/* Contact Avatar */}
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                activeConversation?.contact?.avatarBg || 'bg-red-700 text-white'
              }`}
            >
              {activeConversation?.contact?.avatar || activeConversation?.contact?.name?.charAt(0) || '?'}
            </div>

            {/* Contact Info & Status */}
            <div className="min-w-0">
              <div className="flex items-center gap-2 truncate">
                <span className="font-semibold text-sm text-gray-900 truncate">
                  {activeConversation?.contact?.name || 'Contact'}
                </span>
                {(activeConversation?.contact?.isVerified || activeConversation?.isVerified || scenario.isReal || scenario.isLegitimate) && (
                  <span
                    className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-600 text-white shrink-0"
                    title="Verified Official Account"
                    data-testid="chat-verified-badge"
                  >
                    <Check className="w-2.5 h-2.5 stroke-[3.5]" />
                  </span>
                )}
                {activeConversation?.contact?.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-medium shrink-0 ${
                      activeConversation.contact.badge.toLowerCase().includes('external')
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {activeConversation.contact.badge}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-gray-500 truncate flex items-center gap-1.5">
                <span>{activeConversation?.contact?.handle}</span>
                <span>•</span>
                <span className="capitalize">{activeConversation?.contact?.status || 'Active'}</span>
              </div>
            </div>
          </div>

          {/* Header Action Tools */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Report Threat Action */}
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold border border-red-200 transition-colors shadow-2xs mr-1"
              title="Report suspicious contact or social engineering threat"
            >
              <ShieldAlert className="w-4 h-4 text-red-600" />
              <span className="hidden sm:inline">Report Threat</span>
            </button>

            {/* More Options Dropdown */}
            <div className="relative" ref={optionsMenuRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOptionsMenuOpen((prev) => !prev);
                }}
                className="p-2 rounded-full hover:bg-black/5 text-gray-600 transition-colors"
                title="Options"
                aria-label="Options"
                data-testid="chat-options-button"
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {isOptionsMenuOpen && (
                <div
                  data-testid="chat-options-menu"
                  className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-xl shadow-xl py-1.5 z-50 text-xs text-gray-800 font-sans"
                >
                  <button
                    onClick={() => {
                      setIsOptionsMenuOpen(false);
                      setIsReportModalOpen(true);
                    }}
                    className="w-full flex items-center px-4 py-2 hover:bg-red-50 text-left text-red-600 font-medium transition-colors"
                  >
                    <ShieldAlert className="w-4 h-4 mr-2.5 text-red-600 shrink-0" />
                    <span>Report threat</span>
                  </button>

                  <button
                    onClick={handleBlockContact}
                    className="w-full flex items-center px-4 py-2 hover:bg-red-50 text-left text-red-600 font-medium transition-colors"
                  >
                    <Ban className="w-4 h-4 mr-2.5 text-red-600 shrink-0" />
                    <span>Block contact</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* In-app Notification Banners */}
        {threatReportedConfirmed && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2.5 flex items-center justify-between text-xs sm:text-sm text-emerald-900 shrink-0">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">
                Threat Reported: Security team alerted. Indicator response logged in simulation telemetry.
              </span>
            </div>
            <button
              onClick={() => setThreatReportedConfirmed(false)}
              className="text-emerald-700 hover:text-emerald-950 p-1 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {linkNotice && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between text-xs sm:text-sm text-amber-900 shrink-0">
            <div className="flex items-center gap-2 overflow-hidden">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="truncate">
                <strong>Simulated Link Intercepted:</strong>{' '}
                <code className="bg-amber-100 px-1 py-0.5 rounded text-xs">{linkNotice.url}</code>
                {' '}&mdash; In an actual attack, clicking this link would compromise credentials or session tokens.
              </span>
            </div>
            <button
              onClick={() => setLinkNotice(null)}
              className="text-amber-700 hover:text-amber-950 p-1 rounded shrink-0 ml-2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {attachmentNotice && (
          <div className="bg-blue-50 border-b border-blue-200 px-4 py-2.5 flex items-center justify-between text-xs sm:text-sm text-blue-900 shrink-0">
            <div className="flex items-center gap-2 truncate">
              <FileText className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="truncate">
                <strong>Simulated Attachment Inspected:</strong> {attachmentNotice.name} ({attachmentNotice.size}) &mdash; Sandbox inspection event captured.
              </span>
            </div>
            <button
              onClick={() => setAttachmentNotice(null)}
              className="text-blue-700 hover:text-blue-950 p-1 rounded shrink-0 ml-2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Scrollable Chat Message History */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-3.5">
          {/* Security / System Notice Banner */}
          {activeConversation?.systemNotice && (
            <div className="flex justify-center mb-4">
              <div className="max-w-md bg-amber-50/90 border border-amber-200 rounded-lg p-2.5 text-center text-xs text-amber-900 shadow-2xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="text-[11px] leading-tight">{activeConversation.systemNotice}</span>
              </div>
            </div>
          )}

          {/* Encryption / Simulation Notice */}
          <div className="flex justify-center mb-4">
            <div className="inline-flex items-center gap-1.5 bg-[#ffeecd] border border-[#ffdb99] px-3 py-1 rounded-md text-[11px] text-gray-800 shadow-2xs">
              <Lock className="w-3 h-3 text-amber-700" />
              <span>Simulated session. Telemetry active. Messages are not externally transmitted.</span>
            </div>
          </div>

          {/* Message Bubbles */}
          {activeConversation?.messages?.map((msg) => {
            const isUser = msg.sender === 'user';

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-3.5 py-2 text-sm shadow-xs relative ${
                    isUser
                      ? 'bg-[#d9fdd3] text-[#111b21] rounded-tr-xs'
                      : 'bg-white text-[#111b21] rounded-tl-xs border border-gray-100'
                  }`}
                >
                  {/* Text content */}
                  {msg.text && (
                    <p className="whitespace-pre-wrap leading-relaxed break-words">
                      {msg.text}
                    </p>
                  )}

                  {/* Simulated Link Card */}
                  {msg.link && (
                    <div className="mt-2.5 pt-2 border-t border-gray-200/60">
                      <button
                        onClick={(e) => handleSimulatedLinkClick(e, msg.link)}
                        className="w-full text-left p-2 rounded-lg bg-blue-50/80 hover:bg-blue-100 border border-blue-200 transition-colors flex items-start gap-2 group"
                      >
                        <ExternalLink className="w-4 h-4 text-blue-600 mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
                        <div className="min-w-0">
                          <span className="text-xs font-semibold text-blue-700 block truncate">
                            {msg.link.text || 'Verification Portal'}
                          </span>
                          <span className="text-[10px] text-gray-500 font-mono block truncate">
                            {msg.link.url}
                          </span>
                        </div>
                      </button>
                    </div>
                  )}

                  {/* Simulated Attachment Card */}
                  {msg.attachment && (
                    <div className="mt-2.5 pt-2 border-t border-gray-200/60">
                      <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-200 gap-3">
                        <div className="flex items-center gap-2 truncate">
                          <div className="w-8 h-8 rounded bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="truncate">
                            <div className="text-xs font-medium text-gray-900 truncate">
                              {msg.attachment.name}
                            </div>
                            <div className="text-[10px] text-gray-500">{msg.attachment.size}</div>
                          </div>
                        </div>

                        <button
                          onClick={(e) => handleAttachmentClick(e, msg.attachment)}
                          className="p-1.5 hover:bg-gray-200 rounded text-gray-600 shrink-0"
                          title="Inspect simulated attachment"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Simulated Voice Message Bubble */}
                  {msg.isVoice && (
                    <div className="flex items-center gap-2.5 py-1">
                      <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <Mic className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1 text-xs font-medium">
                          <span>Simulated Voice Note</span>
                          <span className="text-gray-500 font-mono text-[11px]">({msg.duration})</span>
                        </div>
                        <div className="w-28 h-1 bg-gray-300 rounded-full mt-1 overflow-hidden">
                          <div className="w-3/4 h-full bg-emerald-600"></div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Message Timestamp & Delivery Checkmarks */}
                  <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-gray-500">
                    <span>{msg.timestamp || 'Now'}</span>
                    {isUser && (
                      <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Attacker Typing Indicator */}
          {isAiTyping && (
            <div className="flex justify-start mb-3 animate-fadeIn">
              <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-xs px-3.5 py-2 shadow-2xs flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                <span className="text-[11px] text-gray-400 font-sans ml-1">typing...</span>
              </div>
            </div>
          )}

          {/* Security Compromise Notice */}
          {compromisedNotice && (
            <div className="my-2 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2 animate-fadeIn">
              <AlertOctagon className="w-4 h-4 text-red-600 shrink-0" />
              <span><strong>Security Compromise Detected:</strong> {compromisedNotice}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Simulated Voice Recording Active Bar */}
        {isRecordingVoice && (
          <div className="px-4 py-2.5 bg-red-50 border-t border-red-200 flex items-center justify-between text-xs text-red-800 animate-pulse shrink-0">
            <div className="flex items-center gap-2 font-mono">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping"></span>
              <span className="font-semibold">Simulated Recording:</span>
              <span>00:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}</span>
              <span className="text-[11px] text-gray-500 italic ml-2">
                (Microphone hardware is not accessed)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleVoice}
                className="px-2.5 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSendSimulatedVoice}
                className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
              >
                Send Voice
              </button>
            </div>
          </div>
        )}

        {/* Emoji Picker Dropdown Overlay */}
        {showEmojiPicker && (
          <div className="absolute bottom-18 left-4 z-30 p-2.5 bg-white border border-gray-200 rounded-xl shadow-xl grid grid-cols-6 gap-2">
            {commonEmojis.map((emoji, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleInsertEmoji(emoji)}
                className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded text-lg transition-transform hover:scale-120"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Attachment Options Dropdown Overlay */}
        {showAttachmentMenu && (
          <div className="absolute bottom-18 left-14 z-30 p-2 bg-white border border-gray-200 rounded-xl shadow-xl flex flex-col gap-1 text-xs text-gray-700">
            <button
              onClick={() => {
                setShowAttachmentMenu(false);
                handleAttachmentClick(null, { name: 'Simulated_Document.pdf', size: '540 KB', type: 'pdf' });
              }}
              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded text-left"
            >
              <FileText className="w-4 h-4 text-red-500" />
              <span>Simulated Document (PDF)</span>
            </button>
            <button
              onClick={() => {
                setShowAttachmentMenu(false);
                handleAttachmentClick(null, { name: 'Screenshot_Security.png', size: '1.1 MB', type: 'image' });
              }}
              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded text-left"
            >
              <FileText className="w-4 h-4 text-blue-500" />
              <span>Simulated Image</span>
            </button>
          </div>
        )}

        {/* Fixed Message Composer Toolbar */}
        <footer className="h-16 px-4 bg-[#f0f2f5] flex items-center gap-2 border-t border-gray-200 shrink-0">
          {/* Emoji Toggle */}
          <button
            type="button"
            onClick={() => setShowEmojiPicker(prev => !prev)}
            className="p-2 rounded-full hover:bg-black/5 text-gray-500 hover:text-gray-700 transition-colors"
            title="Insert emoji"
            aria-label="Insert emoji"
          >
            <Smile className="w-5 h-5" />
          </button>

          {/* Attachment Toggle */}
          <button
            type="button"
            onClick={() => setShowAttachmentMenu(prev => !prev)}
            className="p-2 rounded-full hover:bg-black/5 text-gray-500 hover:text-gray-700 transition-colors"
            title="Attach file"
            aria-label="Attach file"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Input Field */}
          <form onSubmit={handleSendMessage} className="flex-1 flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Type a message..."
              className="w-full bg-white rounded-lg px-4 py-2.5 text-sm text-[#111b21] outline-none border border-transparent focus:border-gray-300 shadow-2xs placeholder-gray-400"
            />
          </form>

          {/* Voice or Send Button */}
          {inputText.trim() ? (
            <button
              onClick={handleSendMessage}
              className="p-2.5 rounded-full bg-[#00a884] hover:bg-[#008f6f] text-white transition-colors shadow-xs"
              title="Send message"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleToggleVoice}
              className={`p-2 rounded-full transition-colors ${
                isRecordingVoice
                  ? 'bg-red-600 text-white animate-pulse'
                  : 'hover:bg-black/5 text-gray-500 hover:text-gray-700'
              }`}
              title={isRecordingVoice ? 'Cancel recording' : 'Simulate voice note'}
              aria-label="Simulate voice note"
            >
              <Mic className="w-5 h-5" />
            </button>
          )}
        </footer>
      </main>

      {/* ============================================================== */}
      {/* THREAT REPORTING MODAL                                         */}
      {/* ============================================================== */}
      {isReportModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-200">
            {/* Header */}
            <div className="px-6 py-4 bg-red-50/70 border-b border-red-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    Report Social Engineering Threat
                  </h3>
                  <p className="text-xs text-gray-600">
                    Identify suspicious indicators in this chat conversation
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="p-1 rounded-full hover:bg-red-100 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Indicator Checklist */}
            <div className="p-6 space-y-3.5">
              <p className="text-xs text-gray-600 leading-normal">
                Select the suspicious signals you observed from this contact:
              </p>

              <div className="space-y-2 text-xs text-gray-800">
                <label className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-gray-50 cursor-pointer border border-gray-100">
                  <input
                    type="checkbox"
                    checked={reportIndicators.urgentImpersonation}
                    onChange={() => handleToggleIndicator('urgentImpersonation')}
                    className="mt-0.5 rounded text-red-600 focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <span className="font-semibold text-gray-900 block">
                      IT / Authority Impersonation
                    </span>
                    <span className="text-gray-500 text-[11px]">
                      Sender claims urgent authority or falsely impersonates IT Security / Admin
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-gray-50 cursor-pointer border border-gray-100">
                  <input
                    type="checkbox"
                    checked={reportIndicators.credentialHarvestLink}
                    onChange={() => handleToggleIndicator('credentialHarvestLink')}
                    className="mt-0.5 rounded text-red-600 focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <span className="font-semibold text-gray-900 block">
                      Credential Harvesting / Phishing Link
                    </span>
                    <span className="text-gray-500 text-[11px]">
                      Requests authentication or password reset via an external lookalike portal
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-gray-50 cursor-pointer border border-gray-100">
                  <input
                    type="checkbox"
                    checked={reportIndicators.unsolicitedAttachment}
                    onChange={() => handleToggleIndicator('unsolicitedAttachment')}
                    className="mt-0.5 rounded text-red-600 focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <span className="font-semibold text-gray-900 block">
                      Unsolicited File Attachment
                    </span>
                    <span className="text-gray-500 text-[11px]">
                      Urges opening an unsolicited document or executable payload
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-gray-50 cursor-pointer border border-gray-100">
                  <input
                    type="checkbox"
                    checked={reportIndicators.externalUnverifiedHandle}
                    onChange={() => handleToggleIndicator('externalUnverifiedHandle')}
                    className="mt-0.5 rounded text-red-600 focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <span className="font-semibold text-gray-900 block">
                      Unverified / External Contact Handle
                    </span>
                    <span className="text-gray-500 text-[11px]">
                      Sender originates from an external number or unverified account
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-gray-50 cursor-pointer border border-gray-100">
                  <input
                    type="checkbox"
                    checked={reportIndicators.threatOfSuspension}
                    onChange={() => handleToggleIndicator('threatOfSuspension')}
                    className="mt-0.5 rounded text-red-600 focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <span className="font-semibold text-gray-900 block">
                      Urgent Pressure & Account Suspension Threat
                    </span>
                    <span className="text-gray-500 text-[11px]">
                      Imposes artificial immediate deadline (&lt;30 minutes) to induce panic
                    </span>
                  </div>
                </label>
              </div>

              {/* Optional Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Investigation Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={reportNotes}
                  onChange={(e) => setReportNotes(e.target.value)}
                  placeholder="Additional context about this incident..."
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-lg outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 resize-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-200/60 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmThreatReport}
                className="px-5 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Confirm & Report Threat</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
