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
  X,
  ExternalLink,
  Phone,
  User,
  Image as ImageIcon,
  Download,
  Trash2,
  ChevronRight
} from 'lucide-react';

/**
 * Mobile Top Status Bar Component
 * Renders native smartphone status icons (Clock, Cellular, Wi-Fi, Battery)
 */
function MobileStatusBar({ time = '9:41' }) {
  return (
    <div
      data-testid="mobile-status-bar"
      className="h-7 w-full bg-white px-5 pt-1.5 flex items-center justify-between text-[11px] font-semibold text-gray-800 shrink-0 select-none border-b border-gray-100"
    >
      <span className="font-semibold tracking-tight">{time}</span>
      <div className="flex items-center gap-1.5">
        {/* Cellular signal bars */}
        <div className="flex items-end gap-0.5 h-2.5" title="Cellular signal">
          <span className="w-0.5 h-1 bg-gray-800 rounded-2xs" />
          <span className="w-0.5 h-1.5 bg-gray-800 rounded-2xs" />
          <span className="w-0.5 h-2 bg-gray-800 rounded-2xs" />
          <span className="w-0.5 h-2.5 bg-gray-800 rounded-2xs" />
        </div>
        {/* Wi-Fi Icon */}
        <svg
          className="w-3 h-3 text-gray-800"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 20h.01" />
          <path d="M2 8.82a15 15 0 0 1 20 0" />
          <path d="M5 12.859a10 10 0 0 1 14 0" />
          <path d="M8.5 16.429a5 5 0 0 1 7 0" />
        </svg>
        {/* Battery indicator */}
        <div className="flex items-center gap-0.5" title="Battery: 94%">
          <span className="text-[10px] font-mono text-gray-600 mr-0.5">94%</span>
          <div className="w-5 h-2.5 border border-gray-700 rounded-xs p-0.5 flex items-center">
            <div className="h-full w-4 bg-gray-800 rounded-3xs" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * SmsSimulation Component
 * 
 * Reusable, high-fidelity native mobile SMS simulation module for
 * AI-driven social engineering attack training.
 * Strictly mobile-only UI: inbox list view and single conversation thread view.
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

  // Primary navigation view: 'list' (SMS Inbox) | 'chat' (Opened SMS Thread)
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
  const [deleteNotice, setDeleteNotice] = useState(null);

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

  // Auto-scroll on new message in chat view
  useEffect(() => {
    if (currentView === 'chat' && messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeConversation?.messages?.length, currentView]);

  // Open conversation from inbox
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

  // Return to inbox list
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

  // Delete simulated conversation locally
  const handleDeleteConversation = () => {
    const deletingId = activeConvId;
    emitEvent('interaction_recorded', {
      action: 'delete_conversation',
      conversationId: deletingId
    });

    setConversations(prev => prev.filter(c => c.id !== deletingId));
    setDeleteNotice('SMS conversation deleted.');
    handleBackToList();
    setTimeout(() => setDeleteNotice(null), 3000);
  };

  // Filter conversations in inbox
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
    <div
      data-testid="sms-simulation-container"
      className="flex flex-col h-full w-full max-w-[420px] mx-auto bg-white text-gray-900 select-none overflow-hidden font-sans relative shadow-xl border border-gray-200"
    >
      {/* Mobile Top Status Bar */}
      <MobileStatusBar time="9:41" />

      {/* ============================================================== */}
      {/* VIEW 1: SMS INBOX (Conversations List)                          */}
      {/* ============================================================== */}
      {currentView === 'list' && (
        <div aria-label="SMS Messages" className="flex flex-col h-full w-full bg-white overflow-hidden">
          {/* Messages App Header */}
          <div className="px-4 pt-3 pb-2 bg-white flex items-center justify-between border-b border-gray-100 shrink-0">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                Messages
              </h1>
              <p className="text-[11px] text-gray-500 font-mono">
                {userProfile.phoneNumber || 'SIM 1'}
              </p>
            </div>

            <div className="flex items-center gap-2">
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
          <div className="px-4 py-2.5 bg-white border-b border-gray-100 shrink-0">
            <div className="relative flex items-center bg-gray-100 rounded-xl px-3.5 py-1.5 text-sm">
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

          {/* Delete Notice Banner if recent deletion */}
          {deleteNotice && (
            <div className="bg-gray-100 border-b border-gray-200 px-4 py-2 text-xs text-gray-700 flex items-center justify-between">
              <span>{deleteNotice}</span>
              <button onClick={() => setDeleteNotice(null)} className="text-gray-500 hover:text-gray-800">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* SMS Conversation Rows List */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {filteredConversations.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-800">No messages found</p>
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
                    className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors active:bg-gray-100 ${
                      isSelected
                        ? 'bg-blue-50/60'
                        : hasUnread
                        ? 'bg-blue-50/20 hover:bg-gray-50'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    {/* Contact Avatar */}
                    <div className="relative shrink-0">
                      <div
                        className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm ${
                          conv.sender?.avatarBg || 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        {conv.sender?.avatar || conv.sender?.name?.charAt(0) || <User className="w-5 h-5" />}
                      </div>
                      {hasUnread && (
                        <span className="absolute top-0 right-0 w-3 h-3 rounded-full bg-blue-600 border-2 border-white" />
                      )}
                    </div>

                    {/* Sender Details & Message Preview */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-1.5 truncate">
                          <span
                            className={`truncate text-sm ${
                              hasUnread ? 'font-bold text-gray-900' : 'font-semibold text-gray-800'
                            }`}
                          >
                            {conv.sender?.name || conv.sender?.phoneNumber}
                          </span>
                          {conv.sender?.verificationStatus?.toLowerCase().includes('unverified') && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded font-medium bg-red-100 text-red-700 border border-red-200 shrink-0">
                              Unverified
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-gray-400 shrink-0 ml-2">
                          {conv.lastActivity || latestMsg?.timestamp || ''}
                        </span>
                      </div>

                      {/* Phone Number Monospace Subtitle */}
                      {conv.sender?.phoneNumber && conv.sender?.name && (
                        <div className="text-[10px] text-gray-400 font-mono truncate mb-0.5">
                          {conv.sender.phoneNumber}
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <p
                          className={`text-xs truncate ${
                            hasUnread ? 'font-medium text-gray-900' : 'text-gray-500'
                          }`}
                        >
                          {latestMsg?.attachment
                            ? `📷 [MMS Media] ${latestMsg.attachment.name}`
                            : latestMsg?.text || 'No text messages'}
                        </p>

                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          {hasUnread && (
                            <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center">
                              {conv.unreadCount}
                            </span>
                          )}
                          <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* VIEW 2: INDIVIDUAL SMS CONVERSATION THREAD                     */}
      {/* ============================================================== */}
      {currentView === 'chat' && (
        <div aria-label="SMS Conversation" className="flex flex-col h-full w-full bg-white overflow-hidden">
          {/* Native Conversation Header */}
          <header className="px-3 py-2 bg-white flex items-center justify-between border-b border-gray-200 shrink-0 z-10">
            <div className="flex items-center gap-2 min-w-0">
              {/* Back to Inbox */}
              <button
                onClick={handleBackToList}
                className="p-1.5 -ml-1 rounded-full hover:bg-gray-100 text-blue-600 flex items-center gap-0.5 transition-colors"
                title="Back to conversation list"
                aria-label="Back to conversation list"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              {/* Sender Avatar */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                  activeConversation?.sender?.avatarBg || 'bg-red-700 text-white'
                }`}
              >
                {activeConversation?.sender?.avatar || activeConversation?.sender?.name?.charAt(0) || <User className="w-4 h-4" />}
              </div>

              {/* Sender Details */}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="font-bold text-xs text-gray-900 truncate">
                    {activeConversation?.sender?.name || activeConversation?.sender?.phoneNumber}
                  </span>
                  {activeConversation?.sender?.verificationStatus?.toLowerCase().includes('unverified') && (
                    <span className="text-[9px] px-1 py-0.2 rounded font-medium bg-red-100 text-red-700 shrink-0">
                      Unverified
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-gray-500 font-mono truncate">
                  {activeConversation?.sender?.phoneNumber || 'SMS'}
                </div>
              </div>
            </div>

            {/* Header Action Tools */}
            <div className="flex items-center gap-1 shrink-0">
              {/* Report Smish Threat */}
              <button
                onClick={() => setIsReportModalOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 hover:bg-red-100 text-red-700 text-[11px] font-semibold border border-red-200 transition-colors shadow-2xs"
                title="Report smishing threat or scam"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                <span className="inline">Report Smish</span>
              </button>

              {/* Delete Conversation */}
              <button
                onClick={handleDeleteConversation}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 hover:text-red-600 transition-colors"
                title="Delete conversation"
                aria-label="Delete conversation"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              {/* Safe Exit */}
              <button
                onClick={() => setIsSafeExitModalOpen(true)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors"
                title="Safe Exit"
                aria-label="Safe Exit"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Threat Reported Confirmation Notice */}
          {threatReportedConfirmed && (
            <div className="bg-emerald-50 border-b border-emerald-200 px-3 py-2 flex items-center justify-between text-xs text-emerald-900 shrink-0">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium text-[11px]">
                  Smishing Threat Reported: Suspicious SMS reported and logged in simulation telemetry.
                </span>
              </div>
              <button
                onClick={() => setThreatReportedConfirmed(false)}
                className="text-emerald-700 hover:text-emerald-950 p-1 rounded"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Intercepted Link Notice */}
          {linkNotice && (
            <div className="bg-amber-50 border-b border-amber-200 px-3 py-2 flex items-center justify-between text-xs text-amber-900 shrink-0">
              <div className="flex items-center gap-1.5 overflow-hidden">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="truncate text-[11px]">
                  <strong>Simulated Link Intercepted:</strong>{' '}
                  <code className="bg-amber-100 px-1 py-0.5 rounded text-[10px]">{linkNotice.url}</code>
                  {' '}&mdash; In an actual smishing attack, navigating here would expose banking credentials or deliver spyware.
                </span>
              </div>
              <button
                onClick={() => setLinkNotice(null)}
                className="text-amber-700 hover:text-amber-950 p-1 rounded shrink-0 ml-1"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Inspected MMS Attachment Notice */}
          {attachmentNotice && (
            <div className="bg-blue-50 border-b border-blue-200 px-3 py-2 flex items-center justify-between text-xs text-blue-900 shrink-0">
              <div className="flex items-center gap-1.5 truncate">
                <ImageIcon className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="truncate text-[11px]">
                  <strong>Simulated MMS Media Inspected:</strong> {attachmentNotice.name} ({attachmentNotice.size}) &mdash; Media payload inspected safely.
                </span>
              </div>
              <button
                onClick={() => setAttachmentNotice(null)}
                className="text-blue-700 hover:text-blue-950 p-1 rounded shrink-0 ml-1"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Scrollable Message Thread */}
          <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-3 bg-[#f8f9fa]">
            {/* System / Security Notice */}
            {activeConversation?.systemNotice && (
              <div className="flex justify-center mb-2">
                <div className="max-w-xs bg-amber-50 border border-amber-200 rounded-lg p-2 text-center text-xs text-amber-900 shadow-2xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="text-[11px] leading-tight text-left">{activeConversation.systemNotice}</span>
                </div>
              </div>
            )}

            {/* Carrier Timestamp Banner */}
            <div className="flex justify-center my-2">
              <span className="text-[10px] text-gray-400 font-medium tracking-wide uppercase">
                {activeConversation?.carrierNotice || 'Text Message • Today • Carrier rates may apply'}
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
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs shadow-2xs relative leading-relaxed ${
                      isUser
                        ? 'bg-[#34c759] text-white rounded-br-xs'
                        : 'bg-[#e9e9eb] text-gray-900 rounded-bl-xs'
                    }`}
                  >
                    {/* Message Text */}
                    {msg.text && (
                      <p className="whitespace-pre-wrap break-words">
                        {msg.text}
                      </p>
                    )}

                    {/* Simulated Link Card */}
                    {msg.link && (
                      <div className="mt-2 pt-1.5 border-t border-black/10">
                        <button
                          type="button"
                          onClick={(e) => handleSimulatedLinkClick(e, msg.link)}
                          className={`w-full text-left p-2 rounded-lg transition-colors flex items-start gap-1.5 group ${
                            isUser
                              ? 'bg-white/10 hover:bg-white/20 text-white'
                              : 'bg-white hover:bg-gray-50 text-blue-700 border border-gray-300'
                          }`}
                        >
                          <ExternalLink className="w-3.5 h-3.5 mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
                          <div className="min-w-0">
                            <span className="text-[11px] font-semibold block truncate">
                              {msg.link.text}
                            </span>
                            <span className="text-[9px] opacity-75 font-mono block truncate">
                              {msg.link.url}
                            </span>
                          </div>
                        </button>
                      </div>
                    )}

                    {/* MMS Media Attachment */}
                    {msg.attachment && (
                      <div className="mt-2 pt-1.5 border-t border-black/10">
                        <div className="flex items-center justify-between p-1.5 rounded-lg bg-white/90 border border-gray-200 gap-2 text-gray-900">
                          <div className="flex items-center gap-1.5 truncate">
                            <div className="w-7 h-7 rounded bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                              <ImageIcon className="w-3.5 h-3.5" />
                            </div>
                            <div className="truncate">
                              <div className="text-[11px] font-medium truncate">
                                {msg.attachment.name}
                              </div>
                              <div className="text-[9px] text-gray-500">{msg.attachment.size}</div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => handleAttachmentClick(e, msg.attachment)}
                            className="p-1 hover:bg-gray-200 rounded text-gray-600 shrink-0"
                            title="Inspect simulated media"
                            aria-label="Inspect simulated media"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Timestamp & Delivery Info */}
                    <div
                      className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${
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

          {/* Emoji Picker Dropdown */}
          {showEmojiPicker && (
            <div className="absolute bottom-16 left-3 z-30 p-2 bg-white border border-gray-200 rounded-xl shadow-xl grid grid-cols-6 gap-1.5">
              {commonEmojis.map((emoji, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleInsertEmoji(emoji)}
                  className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 rounded text-base transition-transform hover:scale-120"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* Attachment Options Menu */}
          {showAttachmentMenu && (
            <div className="absolute bottom-16 left-12 z-30 p-2 bg-white border border-gray-200 rounded-xl shadow-xl flex flex-col gap-1 text-xs text-gray-700">
              <button
                type="button"
                onClick={() => {
                  setShowAttachmentMenu(false);
                  handleAttachmentClick(null, { name: 'MMS_Photo_Evidence.png', size: '320 KB', type: 'image' });
                }}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 rounded text-left text-xs"
              >
                <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                <span>Simulated MMS Photo</span>
              </button>
            </div>
          )}

          {/* Anchored Message Composer */}
          <footer className="px-3 py-2 bg-white flex items-center gap-1.5 border-t border-gray-200 shrink-0">
            {/* Emoji Toggle */}
            <button
              type="button"
              onClick={() => setShowEmojiPicker(prev => !prev)}
              className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
              title="Insert emoji"
              aria-label="Insert emoji"
            >
              <Smile className="w-5 h-5" />
            </button>

            {/* Media/Attachment Toggle */}
            <button
              type="button"
              onClick={() => setShowAttachmentMenu(prev => !prev)}
              className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
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
                aria-label="Text message (SMS)"
                className="w-full bg-gray-100 rounded-full px-3.5 py-1.5 text-xs text-gray-900 outline-none border border-transparent focus:border-gray-300 placeholder-gray-400"
              />
            </form>

            {/* Send SMS Button */}
            <button
              type="button"
              onClick={handleSendMessage}
              disabled={!inputText.trim()}
              className="p-2 rounded-full bg-[#34c759] hover:bg-emerald-600 disabled:opacity-40 text-white transition-colors shadow-2xs"
              title="Send SMS"
              aria-label="Send SMS"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </footer>
        </div>
      )}

      {/* ============================================================== */}
      {/* THREAT REPORTING MODAL                                         */}
      {/* ============================================================== */}
      {isReportModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-gray-200">
            {/* Header */}
            <div className="px-5 py-3.5 bg-red-50/80 border-b border-red-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    Report Smishing (SMS Scam) Threat
                  </h3>
                  <p className="text-[11px] text-gray-600">
                    Identify suspicious signals in this message
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsReportModalOpen(false)}
                className="p-1 rounded-full hover:bg-red-100 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Checklist */}
            <div className="p-4 space-y-2.5">
              <p className="text-[11px] text-gray-600 leading-normal">
                Select the suspicious signals you detected in this SMS:
              </p>

              <div className="space-y-1.5 text-xs text-gray-800">
                <label className="flex items-start gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer border border-gray-100">
                  <input
                    type="checkbox"
                    checked={reportIndicators.unsolicitedUrgentAlert}
                    onChange={() => handleToggleIndicator('unsolicitedUrgentAlert')}
                    className="mt-0.5 rounded text-red-600 focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <span className="font-semibold text-gray-900 block text-xs">
                      Unsolicited Urgent Financial / Account Alert
                    </span>
                    <span className="text-gray-500 text-[10px]">
                      Unexpected claim of debit, unauthorized transaction, or suspension
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer border border-gray-100">
                  <input
                    type="checkbox"
                    checked={reportIndicators.credentialHarvestLink}
                    onChange={() => handleToggleIndicator('credentialHarvestLink')}
                    className="mt-0.5 rounded text-red-600 focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <span className="font-semibold text-gray-900 block text-xs">
                      Smishing / Credential Verification Link
                    </span>
                    <span className="text-gray-500 text-[10px]">
                      Urges clicking link to dispute charge or verify credentials
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer border border-gray-100">
                  <input
                    type="checkbox"
                    checked={reportIndicators.artificialTimePressure}
                    onChange={() => handleToggleIndicator('artificialTimePressure')}
                    className="mt-0.5 rounded text-red-600 focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <span className="font-semibold text-gray-900 block text-xs">
                      Artificial Urgency (&lt;15 Minute Deadline)
                    </span>
                    <span className="text-gray-500 text-[10px]">
                      Threatens imminent account lock to induce panicked compliance
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer border border-gray-100">
                  <input
                    type="checkbox"
                    checked={reportIndicators.unverifiedSenderPhone}
                    onChange={() => handleToggleIndicator('unverifiedSenderPhone')}
                    className="mt-0.5 rounded text-red-600 focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <span className="font-semibold text-gray-900 block text-xs">
                      Unverified Sender / Suspicious Number
                    </span>
                    <span className="text-gray-500 text-[10px]">
                      Sender originates from unrecognized number or spoofed shortcode
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer border border-gray-100">
                  <input
                    type="checkbox"
                    checked={reportIndicators.mismatchedDomain}
                    onChange={() => handleToggleIndicator('mismatchedDomain')}
                    className="mt-0.5 rounded text-red-600 focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <span className="font-semibold text-gray-900 block text-xs">
                      Lookalike Domain (Not Official Institution)
                    </span>
                    <span className="text-gray-500 text-[10px]">
                      Domain differs from legitimate banking portal
                    </span>
                  </div>
                </label>
              </div>

              {/* Optional Notes */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Investigation Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={reportNotes}
                  onChange={(e) => setReportNotes(e.target.value)}
                  placeholder="Additional context about this smishing attempt..."
                  className="w-full text-xs p-2 border border-gray-200 rounded-lg outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 resize-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsReportModalOpen(false)}
                className="px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200/60 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmThreatReport}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
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
          <div className="bg-white rounded-2xl shadow-2xl max-w-xs w-full p-5 border border-gray-200 text-center">
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-2.5">
              <LogOut className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-gray-900 mb-1">
              Exit SMS Simulation Session?
            </h3>
            <p className="text-xs text-gray-600 mb-4 leading-relaxed">
              You are terminating this simulated SMS interaction. Your telemetry and response metrics will be finalized.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setIsSafeExitModalOpen(false)}
                className="px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Continue Simulation
              </button>
              <button
                type="button"
                onClick={handleConfirmSafeExit}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
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
