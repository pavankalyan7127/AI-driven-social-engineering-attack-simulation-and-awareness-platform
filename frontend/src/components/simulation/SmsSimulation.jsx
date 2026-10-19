import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  MessageSquare,
  Search,
  ArrowLeft,
  Send,
  Paperclip,
  Smile,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  LogOut,
  MoreVertical,
  X,
  Check,
  CheckCheck,
  FileText,
  Download,
  ExternalLink,
  Phone,
  Info,
  Smartphone,
  Lock,
  User,
  Image as ImageIcon
} from 'lucide-react';

/**
 * SmsSimulation Component
 * 
 * Reusable simulation module for AI-driven social engineering attack training.
 * Provides a high-fidelity, data-driven, isolated SMS / smishing environment.
 * 
 * @param {Object} props
 * @param {Object} props.scenario - Validated scenario JSON
 * @param {string} props.sessionId - Current simulation session ID
 * @param {Function} props.onAction - Reports user interaction events
 * @param {Function} props.onComplete - Notifies parent of terminal state
 */
export default function SmsSimulation({
  scenario,
  sessionId = 'sess-sms-sim-default',
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
            No valid SMS attack scenario data was provided to the simulation runner.
          </p>
        </div>
      </div>
    );
  }

  // Session & Scenario IDs
  const scenarioId = scenario.scenarioId || scenario.id || 'unnamed-scenario';
  const targetId = scenario.targetId || 'target-sms-conversation';

  // Primary navigation view: 'list' (SMS Conversation List) | 'chat' (Opened SMS Thread)
  const [currentView, setCurrentView] = useState(scenario.initialView === 'chat' ? 'chat' : 'list');

  // Search filter query
  const [searchQuery, setSearchQuery] = useState('');

  // Local conversations state
  const [conversations, setConversations] = useState(() => {
    if (Array.isArray(scenario.conversations) && scenario.conversations.length > 0) {
      return scenario.conversations.map(c => ({
        ...c,
        messages: Array.isArray(c.messages) ? [...c.messages] : []
      }));
    }
    return [
      {
        id: targetId,
        isTarget: true,
        sender: {
          name: scenario.senderName || 'Unknown Sender',
          phoneNumber: scenario.senderPhone || '+1 (800) 555-0199',
          avatar: '!',
          avatarBg: 'bg-red-700 text-white',
          verificationStatus: 'Unverified Sender'
        },
        unreadCount: 1,
        lastActivity: 'Just now',
        messages: [
          {
            id: 'sms-default-1',
            sender: 'contact',
            text: scenario.description || 'Urgent verification required regarding your account.',
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

  // Composer state
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);

  // Notice banners
  const [linkNotice, setLinkNotice] = useState(null);
  const [attachmentNotice, setAttachmentNotice] = useState(null);

  // Threat reporting modal state
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportIndicators, setReportIndicators] = useState({
    unsolicitedUrgentAlert: false,
    unverifiedSenderPhone: false,
    credentialHarvestLink: false,
    artificialTimePressure: false,
    mismatchedDomain: false
  });
  const [reportNotes, setReportNotes] = useState('');
  const [threatReportedConfirmed, setThreatReportedConfirmed] = useState(false);

  // Safe exit confirmation modal state
  const [isSafeExitModalOpen, setIsSafeExitModalOpen] = useState(false);

  // Single scenario_viewed event tracker to prevent duplicate emissions on rerender
  const hasEmittedViewed = useRef(false);

  // Message scroll & focus refs
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
        channel: 'sms',
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
        scenarioTitle: scenario.title || 'SMS Smishing Simulation',
        category: scenario.category || 'Smishing',
        difficulty: scenario.difficulty || 'Medium',
        totalConversations: conversations.length,
        initialView: currentView
      });
    }
  }, [scenarioId, sessionId]);

  // Auto-scroll on new message
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
      senderName: conv.sender?.name,
      senderPhone: conv.sender?.phoneNumber,
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

  // Send local SMS message
  const handleSendMessage = (e) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;

    const newMessage = {
      id: `sms-user-${Date.now()}`,
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
      recipient: activeConversation?.sender?.phoneNumber || activeConversation?.sender?.name
    });

    setInputText('');
    setShowEmojiPicker(false);
    if (inputRef.current) inputRef.current.focus();
  };

  // Emoji picker insertion
  const handleInsertEmoji = (emoji) => {
    setInputText(prev => prev + emoji);
    setShowEmojiPicker(false);
    if (inputRef.current) inputRef.current.focus();
  };

  // Intercept simulated link click
  const handleSimulatedLinkClick = (e, linkMeta) => {
    if (e) e.preventDefault();

    emitEvent('simulated_link_clicked', {
      linkId: linkMeta.id || 'simulated-sms-link',
      url: linkMeta.url || '#',
      label: linkMeta.text || 'Verification URL',
      targetPhish: true
    });

    setLinkNotice({
      url: linkMeta.url || 'https://apex-security-card-dispute.com',
      text: linkMeta.text || 'Verification URL'
    });
  };

  // Intercept attachment interaction
  const handleAttachmentClick = (e, attachmentMeta) => {
    if (e) e.preventDefault();

    emitEvent('attachment_interaction', {
      attachmentId: attachmentMeta.id || 'simulated-mms-attachment',
      name: attachmentMeta.name || 'image.png',
      size: attachmentMeta.size || '100 KB',
      type: attachmentMeta.type || 'image',
      action: 'inspect_attachment'
    });

    setAttachmentNotice({
      name: attachmentMeta.name || 'image.png',
      size: attachmentMeta.size || '100 KB'
    });
  };

  // Toggle threat indicator
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
      senderName: activeConversation?.sender?.name,
      senderPhone: activeConversation?.sender?.phoneNumber,
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

  // Confirm safe exit
  const handleConfirmSafeExit = () => {
    emitEvent('safe_exit', {
      reason: 'user_initiated_safe_exit',
      conversationId: activeConvId
    });

    setIsSafeExitModalOpen(false);

    if (typeof onComplete === 'function') {
      onComplete({
        status: 'safe_exit',
        action: 'safe_exit',
        scenarioId,
        sessionId
      });
    }
  };

  // Filter conversations
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter(c => {
      const name = (c.sender?.name || '').toLowerCase();
      const phone = (c.sender?.phoneNumber || '').toLowerCase();
      const lastMsg = (c.messages?.[c.messages.length - 1]?.text || '').toLowerCase();
      return name.includes(q) || phone.includes(q) || lastMsg.includes(q);
    });
  }, [conversations, searchQuery]);

  // Profile data
  const userProfile = scenario.userProfile || {
    name: 'Pavan Kalyan',
    phoneNumber: '+1 (555) 234-5678',
    avatar: 'P',
    avatarBg: 'bg-[#5c3e38] text-white'
  };

  const commonEmojis = ['👍', '👋', '🛑', '⚠️', '❓', '🔒', '✅', '💳', '👀', '🚨', '🙏', '😊'];

  return (
    <div className="flex h-screen w-full bg-[#f4f6f8] text-[#1f2937] select-none overflow-hidden font-sans antialiased">
      {/* ============================================================== */}
      {/* VIEW A: SMS CONVERSATION LIST (Responsive Side or Full View)   */}
      {/* ============================================================== */}
      <aside
        aria-label="SMS Messages"
        className={`${
          currentView === 'list' ? 'flex' : 'hidden md:flex'
        } w-full md:w-96 lg:w-[400px] shrink-0 flex-col h-full bg-white border-r border-gray-200 z-10`}
      >
        {/* App Header with Mobile OS Aesthetics */}
        <div className="h-16 px-4 bg-white flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm ${
                userProfile.avatarBg || 'bg-[#5c3e38] text-white'
              }`}
            >
              {userProfile.avatar || userProfile.name?.charAt(0) || 'P'}
            </div>
            <div>
              <div className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                <span>Messages</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800 font-semibold">
                  SMS
                </span>
              </div>
              <div className="text-[11px] text-gray-500 font-mono">
                {userProfile.phoneNumber || 'SIM 1'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsSafeExitModalOpen(true)}
              title="Safe Exit Simulation"
              className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
              aria-label="Safe Exit"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Field */}
        <div className="p-3 bg-white border-b border-gray-100">
          <div className="relative flex items-center bg-gray-100 rounded-full px-3.5 py-1.5 text-sm">
            <Search className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search SMS conversations"
              className="w-full bg-transparent border-none outline-none text-xs sm:text-sm text-gray-800 placeholder-gray-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="p-1 hover:bg-gray-200 rounded-full text-gray-400 ml-1"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* SMS Conversation Rows */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-medium">No messages found</p>
              <p className="text-xs text-gray-400 mt-1">
                No SMS matching "{searchQuery}"
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
                      ? 'bg-blue-50/60'
                      : hasUnread
                      ? 'bg-blue-50/30 hover:bg-gray-50'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  {/* Sender Avatar */}
                  <div className="relative shrink-0">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm ${
                        conv.sender?.avatarBg || 'bg-gray-600 text-white'
                      }`}
                    >
                      {conv.sender?.avatar || conv.sender?.name?.charAt(0) || '#'}
                    </div>
                    {hasUnread && (
                      <span className="absolute top-0 right-0 w-3 h-3 rounded-full bg-blue-600 border-2 border-white"></span>
                    )}
                  </div>

                  {/* Sender & Preview */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 truncate">
                        <span
                          className={`truncate text-sm ${
                            hasUnread ? 'font-bold text-gray-900' : 'font-semibold text-gray-800'
                          }`}
                        >
                          {conv.sender?.name || conv.sender?.phoneNumber}
                        </span>
                        {conv.sender?.verificationStatus?.toLowerCase().includes('unverified') && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded font-medium bg-red-100 text-red-700 border border-red-200 shrink-0">
                            Unverified
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
                        {latestMsg?.attachment
                          ? `📷 [MMS Media] ${latestMsg.attachment.name}`
                          : latestMsg?.text || 'No text messages'}
                      </p>

                      {hasUnread && (
                        <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 ml-2">
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
      {/* VIEW B: OPENED SMS THREAD                                      */}
      {/* ============================================================== */}
      <main
        aria-label="SMS Conversation"
        className={`${
          currentView === 'chat' ? 'flex' : 'hidden md:flex'
        } flex-1 flex-col h-full bg-white relative overflow-hidden`}
      >
        {/* SMS Header */}
        <header className="h-16 px-4 bg-white flex items-center justify-between border-b border-gray-200 shrink-0 z-10 shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            {/* Back to List */}
            <button
              onClick={handleBackToList}
              className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
              title="Back to conversation list"
              aria-label="Back to conversation list"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {/* Avatar */}
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                activeConversation?.sender?.avatarBg || 'bg-red-700 text-white'
              }`}
            >
              {activeConversation?.sender?.avatar || activeConversation?.sender?.name?.charAt(0) || '#'}
            </div>

            {/* Sender Metadata */}
            <div className="min-w-0">
              <div className="flex items-center gap-2 truncate">
                <span className="font-semibold text-sm text-gray-900 truncate">
                  {activeConversation?.sender?.name || activeConversation?.sender?.phoneNumber}
                </span>
                {activeConversation?.sender?.verificationStatus && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-medium shrink-0 ${
                      activeConversation.sender.verificationStatus.toLowerCase().includes('unverified')
                        ? 'bg-red-100 text-red-800 border border-red-300'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {activeConversation.sender.verificationStatus}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-gray-500 font-mono truncate">
                {activeConversation?.sender?.phoneNumber}
              </div>
            </div>
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Report Threat Action */}
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold border border-red-200 transition-colors shadow-2xs mr-1"
              title="Report smishing threat or scam"
            >
              <ShieldAlert className="w-4 h-4 text-red-600" />
              <span className="hidden sm:inline">Report Smish</span>
            </button>

            {/* Safe Exit */}
            <button
              onClick={() => setIsSafeExitModalOpen(true)}
              className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
              title="Safe Exit"
              aria-label="Safe Exit"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Notices */}
        {threatReportedConfirmed && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2.5 flex items-center justify-between text-xs sm:text-sm text-emerald-900 shrink-0">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">
                Smishing Threat Reported: Suspicious SMS reported and logged in simulation telemetry.
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
                {' '}&mdash; In an actual smishing attack, navigating here would expose banking credentials or deliver spyware.
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
              <ImageIcon className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="truncate">
                <strong>Simulated MMS Media Inspected:</strong> {attachmentNotice.name} ({attachmentNotice.size}) &mdash; Media payload inspected safely.
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

        {/* SMS Message Thread */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-3.5 bg-gray-50/50">
          {/* Unknown Sender / Carrier Warnings */}
          {activeConversation?.systemNotice && (
            <div className="flex justify-center mb-3">
              <div className="max-w-md bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-center text-xs text-amber-900 shadow-2xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="text-[11px] leading-tight">{activeConversation.systemNotice}</span>
              </div>
            </div>
          )}

          {/* Carrier Header Stamp */}
          <div className="flex justify-center mb-4">
            <span className="text-[11px] text-gray-400 font-medium tracking-wide uppercase">
              {activeConversation?.carrierNotice || 'Text Message • SMS / MMS'}
            </span>
          </div>

          {/* Messages */}
          {activeConversation?.messages?.map((msg) => {
            const isUser = msg.sender === 'user';

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 text-sm shadow-2xs relative ${
                    isUser
                      ? 'bg-[#0b93f6] text-white rounded-br-xs'
                      : 'bg-[#e9e9eb] text-black rounded-bl-xs'
                  }`}
                >
                  {/* Text */}
                  {msg.text && (
                    <p className="whitespace-pre-wrap leading-relaxed break-words">
                      {msg.text}
                    </p>
                  )}

                  {/* Simulated Link */}
                  {msg.link && (
                    <div className="mt-2.5 pt-2 border-t border-black/10">
                      <button
                        onClick={(e) => handleSimulatedLinkClick(e, msg.link)}
                        className={`w-full text-left p-2 rounded-lg transition-colors flex items-start gap-2 group ${
                          isUser ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-white hover:bg-gray-50 text-blue-700 border border-gray-300'
                        }`}
                      >
                        <ExternalLink className="w-4 h-4 mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
                        <div className="min-w-0">
                          <span className="text-xs font-semibold block truncate">
                            {msg.link.text}
                          </span>
                          <span className="text-[10px] opacity-75 font-mono block truncate">
                            {msg.link.url}
                          </span>
                        </div>
                      </button>
                    </div>
                  )}

                  {/* MMS Attachment */}
                  {msg.attachment && (
                    <div className="mt-2.5 pt-2 border-t border-black/10">
                      <div className="flex items-center justify-between p-2 rounded-lg bg-white/90 border border-gray-200 gap-3 text-gray-900">
                        <div className="flex items-center gap-2 truncate">
                          <div className="w-8 h-8 rounded bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                            <ImageIcon className="w-4 h-4" />
                          </div>
                          <div className="truncate">
                            <div className="text-xs font-medium truncate">
                              {msg.attachment.name}
                            </div>
                            <div className="text-[10px] text-gray-500">{msg.attachment.size}</div>
                          </div>
                        </div>

                        <button
                          onClick={(e) => handleAttachmentClick(e, msg.attachment)}
                          className="p-1.5 hover:bg-gray-200 rounded text-gray-600 shrink-0"
                          title="Inspect simulated media"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Timestamp & Status */}
                  <div
                    className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                      isUser ? 'text-white/80' : 'text-gray-500'
                    }`}
                  >
                    <span>{msg.timestamp || 'Now'}</span>
                    {isUser && <span>• Delivered</span>}
                  </div>
                </div>
              </div>
            );
          })}

          <div ref={messagesEndRef} />
        </div>

        {/* Emoji Dropdown */}
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

        {/* Attachment Options Dropdown */}
        {showAttachmentMenu && (
          <div className="absolute bottom-18 left-14 z-30 p-2 bg-white border border-gray-200 rounded-xl shadow-xl flex flex-col gap-1 text-xs text-gray-700">
            <button
              onClick={() => {
                setShowAttachmentMenu(false);
                handleAttachmentClick(null, { name: 'MMS_Photo_Evidence.png', size: '320 KB', type: 'image' });
              }}
              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded text-left"
            >
              <ImageIcon className="w-4 h-4 text-blue-500" />
              <span>Simulated MMS Photo</span>
            </button>
          </div>
        )}

        {/* Bottom SMS Message Composer */}
        <footer className="h-16 px-4 bg-white flex items-center gap-2 border-t border-gray-200 shrink-0">
          {/* Emoji Toggle */}
          <button
            type="button"
            onClick={() => setShowEmojiPicker(prev => !prev)}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
            title="Insert emoji"
            aria-label="Insert emoji"
          >
            <Smile className="w-5 h-5" />
          </button>

          {/* Attachment Toggle */}
          <button
            type="button"
            onClick={() => setShowAttachmentMenu(prev => !prev)}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
            title="Attach media"
            aria-label="Attach media"
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
              placeholder="Text message (SMS)"
              className="w-full bg-gray-100 rounded-full px-4 py-2 text-sm text-gray-900 outline-none border border-transparent focus:border-gray-300 placeholder-gray-400"
            />
          </form>

          {/* Send SMS Button */}
          <button
            onClick={handleSendMessage}
            disabled={!inputText.trim()}
            className="p-2.5 rounded-full bg-[#0b93f6] hover:bg-blue-600 disabled:opacity-40 text-white transition-colors shadow-2xs"
            title="Send SMS"
            aria-label="Send SMS"
          >
            <Send className="w-4 h-4" />
          </button>
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
                    Report Smishing (SMS Scam) Threat
                  </h3>
                  <p className="text-xs text-gray-600">
                    Identify suspicious indicators observed in this text message
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
                Select the suspicious signals you detected in this SMS:
              </p>

              <div className="space-y-2 text-xs text-gray-800">
                <label className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-gray-50 cursor-pointer border border-gray-100">
                  <input
                    type="checkbox"
                    checked={reportIndicators.unsolicitedUrgentAlert}
                    onChange={() => handleToggleIndicator('unsolicitedUrgentAlert')}
                    className="mt-0.5 rounded text-red-600 focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <span className="font-semibold text-gray-900 block">
                      Unsolicited Urgent Financial / Account Alert
                    </span>
                    <span className="text-gray-500 text-[11px]">
                      Unexpected claim of debit, unauthorized transaction, or account suspension
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
                      Smishing / Credential Verification Link
                    </span>
                    <span className="text-gray-500 text-[11px]">
                      Urges clicking an external link to verify credentials or dispute charge
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-gray-50 cursor-pointer border border-gray-100">
                  <input
                    type="checkbox"
                    checked={reportIndicators.artificialTimePressure}
                    onChange={() => handleToggleIndicator('artificialTimePressure')}
                    className="mt-0.5 rounded text-red-600 focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <span className="font-semibold text-gray-900 block">
                      Artificial Urgency (&lt;15 Minute Deadline)
                    </span>
                    <span className="text-gray-500 text-[11px]">
                      Threatens account lock unless resolved in minutes to induce hasty action
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-gray-50 cursor-pointer border border-gray-100">
                  <input
                    type="checkbox"
                    checked={reportIndicators.unverifiedSenderPhone}
                    onChange={() => handleToggleIndicator('unverifiedSenderPhone')}
                    className="mt-0.5 rounded text-red-600 focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <span className="font-semibold text-gray-900 block">
                      Unverified Sender / Suspicious Number
                    </span>
                    <span className="text-gray-500 text-[11px]">
                      Sender originates from an unrecognized toll-free or international number
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-gray-50 cursor-pointer border border-gray-100">
                  <input
                    type="checkbox"
                    checked={reportIndicators.mismatchedDomain}
                    onChange={() => handleToggleIndicator('mismatchedDomain')}
                    className="mt-0.5 rounded text-red-600 focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <span className="font-semibold text-gray-900 block">
                      Lookalike Domain (Not Official Institution)
                    </span>
                    <span className="text-gray-500 text-[11px]">
                      URL domain differs from genuine official banking / organizational domain
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
                  placeholder="Additional context about this smishing attempt..."
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

      {/* ============================================================== */}
      {/* SAFE EXIT MODAL                                                */}
      {/* ============================================================== */}
      {isSafeExitModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-gray-200 text-center">
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-3">
              <LogOut className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1.5">
              Exit SMS Simulation Session?
            </h3>
            <p className="text-xs text-gray-600 mb-5 leading-relaxed">
              You are terminating this simulated SMS interaction. Your telemetry and response metrics will be finalized.
            </p>
            <div className="flex items-center justify-center gap-2.5">
              <button
                onClick={() => setIsSafeExitModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Continue Simulation
              </button>
              <button
                onClick={handleConfirmSafeExit}
                className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
              >
                Confirm Safe Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
