import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Menu,
  Search,
  MoreVertical,
  Paperclip,
  Smile,
  Mic,
  Send,
  ArrowLeft,
  Pin,
  X,
  Volume2,
  VolumeX,
  Check,
  CheckCheck,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  Ban,
  Trash2,
  Flag,
  Gift,
  Zap,
  CheckCircle2,
  XCircle,
  FileDown,
  ExternalLink,
  Edit2
} from 'lucide-react';

/**
 * TelegramSimulation Component
 * 
 * Authentic Telegram Web / Desktop attack simulation interface.
 * Faithfully reproduces:
 * - Left conversations rail with Search, folder pills (All, Tamil Movies), chat cards with SCAM badges, unread counts, and purple active selection.
 * - Floating round purple edit/pencil button.
 * - Header with member counts, search, and 3-dot overflow menu.
 * - Pinned message bar.
 * - Multimedia / File card download previews and colored group member chatter.
 * - Authentic 3-dot dropdown with Block, Report, and Delete actions.
 * - Telemetry & Termination Parity:
 *     - user_blocked_sender -> safe_exit
 *     - threat_reported     -> reported
 *     - message_deleted     -> safe_exit
 *     - simulated_link_clicked -> negative termination
 * 
 * @param {Object} props
 * @param {Object} props.scenario - Validated scenario JSON object
 * @param {string} props.sessionId - Simulation session ID
 * @param {string} props.deviceMode - 'full' or 'mobile'
 * @param {Function} props.onAction - Telemetry event callback
 * @param {Function} props.onComplete - Termination callback
 */
export default function TelegramSimulation({
  scenario,
  sessionId = 'sess-sim-default',
  deviceMode = 'full',
  onAction,
  onComplete
}) {
  if (!scenario || typeof scenario !== 'object') {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] p-6 bg-[#0f141c] text-gray-200">
        <div className="text-center p-8 bg-[#17212b] border border-[#242f3d] rounded-2xl shadow-xl max-w-md">
          <AlertOctagon className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-white mb-2">Scenario Unavailable</h2>
          <p className="text-xs text-gray-400">
            No valid Telegram attack scenario data was provided to the runner.
          </p>
        </div>
      </div>
    );
  }

  const scenarioId = scenario.scenarioId || scenario.id || 'unnamed-scenario';
  const targetId = scenario.targetId || 'conv-telegram-target';

  // Normalize conversations list
  const initialConversations = useMemo(() => {
    if (Array.isArray(scenario.conversations) && scenario.conversations.length > 0) {
      return scenario.conversations;
    }
    return [
      {
        id: targetId,
        isTarget: true,
        contact: {
          name: 'Kakapeeeeee atti 💥 🤘',
          subtitle: '2 837 members, 110 online',
          avatar: '💥',
          avatarBg: 'bg-purple-700 text-white',
          status: 'supergroup'
        },
        unreadCount: 0,
        lastActivity: '13:35',
        pinnedMessage: {
          id: 'pin-01',
          title: 'Pinned Message',
          text: 'Photo, Jailer 2 (2026) Tamil (LINE) V2 HDTC'
        },
        messages: [
          {
            id: 'm1',
            sender: 'bot',
            senderName: 'ProSearch Bot',
            senderColor: 'text-blue-400',
            text: '➡️ Latest Uploads: @ProSearchZ\n➡️ BOT Updates: @ProSearch',
            timestamp: '10:25'
          },
          {
            id: 'm2',
            sender: 'bot',
            senderName: 'VisionQuest Bot',
            senderColor: 'text-emerald-400',
            isFileCard: true,
            fileName: 'VisionQuest.S01E04.Malware.1080p.JioHotstar.WEB-DL.MULTI.mkv',
            fileSize: '1.22 GB',
            specs: '🎬 1080p HEVC  ⏱️ 00:48:09\n🗣️ English, Hindi, Tamil, Telugu\n💬 ESUB',
            text: 'VisionQuest.S01E04.Malware.1080p.JioHotstar.WEB-DL.MULTI.DDP5.1.Atmos.H.265-JeRi.mkv',
            link: {
              id: 'link-tele-download',
              text: 'Fast Download Mirror: https://fast-stream-cdn.ru/get/VisionQuest.exe',
              url: 'https://fast-stream-cdn.ru/get/VisionQuest.exe'
            },
            timestamp: '10:25'
          },
          {
            id: 'm3',
            sender: 'contact',
            senderName: 'Roobhan 🥂',
            senderColor: 'text-emerald-400',
            quoted: 'VisionQuest.S01E04.Malware.1080p.JioHotstar.WEB-DL.MULTI...',
            text: 'Gopi Tarun download works properly check once!',
            timestamp: '10:25'
          },
          {
            id: 'm4',
            sender: 'contact',
            senderName: 'Thorfin n',
            senderColor: 'text-cyan-400',
            text: 'vision quest S1 E3',
            timestamp: '11:34'
          },
          {
            id: 'm5',
            sender: 'contact',
            senderName: 'Mohamed Rizwan',
            senderColor: 'text-purple-400',
            text: 'Band of brothers english subtitles',
            timestamp: '12:09'
          },
          {
            id: 'm6',
            sender: 'contact',
            senderName: 'Dhanush',
            senderColor: 'text-orange-400',
            text: 'Doraemon: Nobita and the Galaxy Super-express',
            timestamp: '12:09'
          },
          {
            id: 'm7',
            sender: 'contact',
            senderName: 'Ashok Selvam',
            senderColor: 'text-blue-400',
            text: 'Naruto Shippuden English Subtitles. below 400 mb',
            timestamp: '13:35'
          }
        ]
      }
    ];
  }, [scenario, targetId]);

  const [conversations, setConversations] = useState(initialConversations);
  const [activeTab, setActiveTab] = useState('All');
  const [activeConvId, setActiveConvId] = useState(() => {
    const target = initialConversations.find(c => c.isTarget);
    return target ? target.id : initialConversations[0]?.id || null;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [inputText, setInputText] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPinnedOpen, setIsPinnedOpen] = useState(true);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [linkNotice, setLinkNotice] = useState(null);

  const [reportIndicators, setReportIndicators] = useState({
    malwareAttachment: true,
    suspiciousMirrorLink: true,
    scamImpersonation: false,
    botSpam: false,
    copyrightViolation: false
  });
  const [reportNotes, setReportNotes] = useState('');

  const messagesEndRef = useRef(null);
  const menuRef = useRef(null);

  const activeConversation = conversations.find(c => c.id === activeConvId);

  // Close overflow menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    }
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  // Initial scenario_viewed event dispatch
  useEffect(() => {
    emitEvent('scenario_viewed', {
      channel: 'telegram',
      scenarioTitle: scenario.title,
      category: scenario.category,
      difficulty: scenario.difficulty,
      totalConversations: conversations.length
    });
  }, []);

  // Auto-scroll messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeConvId, activeConversation?.messages]);

  // Central telemetry helper
  const emitEvent = (eventType, metadata = {}) => {
    if (typeof onAction === 'function') {
      onAction({
        eventType,
        scenarioId,
        sessionId,
        targetId: activeConversation?.id || targetId,
        timestamp: new Date().toISOString(),
        metadata: {
          channel: 'telegram',
          activeConvId,
          ...metadata
        }
      });
    }
  };

  // Filter conversations based on search
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter(c =>
      c.contact?.name?.toLowerCase().includes(q) ||
      c.contact?.badge?.toLowerCase().includes(q) ||
      c.messages?.some(m => m.text?.toLowerCase().includes(q))
    );
  }, [conversations, searchQuery]);

  // Select conversation
  const handleSelectConversation = (conv) => {
    setActiveConvId(conv.id);
    setIsMenuOpen(false);

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
    if (!inputText.trim() || !activeConvId) return;

    const newMsg = {
      id: `msg-sent-${Date.now()}`,
      sender: 'user',
      senderName: 'You',
      text: inputText.trim(),
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
      text: inputText.trim(),
      isTarget: activeConversation?.isTarget
    });

    setInputText('');
  };

  // Simulated link clicked (Negative Termination Condition)
  const handleSimulatedLink = (e, linkMeta) => {
    if (e) e.preventDefault();

    emitEvent('simulated_link_clicked', {
      actionId: linkMeta.id || 'telegram_link',
      url: linkMeta.url || linkMeta.text,
      label: linkMeta.text,
      targetPhish: true
    });

    setLinkNotice({
      url: linkMeta.url || linkMeta.text,
      text: 'Simulated malware download link intercepted.'
    });
  };

  // 1. Block Action (Positive Termination)
  const handleBlockContact = () => {
    setIsMenuOpen(false);
    const contactName = activeConversation?.contact?.name || 'Group/Contact';

    emitEvent('user_blocked_sender', {
      conversationId: activeConvId,
      contactName,
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
        reason: `Blocked suspicious Telegram entity "${contactName}"`
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
    const contactName = activeConversation?.contact?.name || 'Chat';

    emitEvent('message_deleted', {
      conversationId: activeConvId,
      contactName,
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
        reason: `Deleted suspicious Telegram conversation "${contactName}"`
      });
    }
  };

  const isMobile = deviceMode === 'mobile';
  const showChatList = !isMobile || !activeConvId;
  const showConversation = !isMobile || !!activeConvId;

  return (
    <div
      className="relative flex h-full w-full overflow-hidden bg-[#0c1015] font-sans text-gray-200 select-none antialiased"
      style={{
        backgroundImage: `radial-gradient(circle at 50% 50%, rgba(20, 29, 39, 0.95), rgba(10, 14, 19, 0.98))`
      }}
      data-testid="telegram-simulation"
    >
      {/* ===================== LEFT SIDEBAR (CONVERSATIONS LIST) ===================== */}
      <div
        className={`${
          showChatList ? 'flex' : 'hidden'
        } ${isMobile ? 'w-full' : 'w-[340px]'} flex-col border-r border-[#1a232f] bg-[#121922] z-10 flex-shrink-0 relative`}
      >
        {/* Top Header & Search Bar */}
        <div className="p-2.5 pb-2 border-b border-[#18222d] bg-[#121922]">
          <div className="flex items-center gap-2 mb-2">
            <button
              className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-[#1a2533] transition-colors"
              title="Menu"
              aria-label="Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-[#1e2733] text-sm text-gray-200 rounded-full pl-9 pr-4 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#706be7] placeholder-gray-500 transition-all"
              />
            </div>
          </div>

          {/* Folder Pills: All & Tamil Movies */}
          <div className="flex items-center gap-2 px-1">
            <button
              onClick={() => setActiveTab('All')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                activeTab === 'All'
                  ? 'bg-[#706be7] text-white shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-[#1b2430]'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveTab('Tamil Movies')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                activeTab === 'Tamil Movies'
                  ? 'bg-[#706be7] text-white shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-[#1b2430]'
              }`}
            >
              <span>Tamil Movies</span>
              <span className="w-4 h-4 rounded-full bg-[#273444] text-[10px] flex items-center justify-center text-gray-300">
                6
              </span>
            </button>
          </div>
        </div>

        {/* Chat Threads List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#18222d]/40 p-1.5 space-y-1">
          {filteredConversations.map(conv => {
            const isSelected = conv.id === activeConvId;
            const lastMsg = conv.messages?.[conv.messages.length - 1];
            const isScam = conv.contact?.isScam || conv.contact?.badge === 'SCAM';

            return (
              <div
                key={conv.id}
                onClick={() => handleSelectConversation(conv)}
                data-testid={`telegram-chat-item-${conv.id}`}
                className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-[#706be7] text-white shadow-md'
                    : 'hover:bg-[#1b2533] text-gray-300'
                }`}
              >
                {/* Contact Avatar */}
                <div className="relative flex-shrink-0">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-base shadow-sm ${
                      conv.contact?.avatarBg || 'bg-gradient-to-tr from-purple-600 to-indigo-500 text-white'
                    }`}
                  >
                    {(conv.contact?.avatar && conv.contact.avatar.length <= 2)
                      ? conv.contact.avatar
                      : (conv.contact?.name?.charAt(0) || 'T')}
                  </div>
                </div>

                {/* Info & Snippet */}
                <div className="flex-1 min-w-0 pr-1">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className={`text-sm font-semibold truncate ${isSelected ? 'text-white' : 'text-gray-100'}`}>
                        {conv.contact?.name}
                      </span>
                      {isScam && (
                        <span className="px-1 py-0.2 text-[9px] font-black uppercase rounded bg-red-950 text-red-400 border border-red-800">
                          SCAM
                        </span>
                      )}
                      {conv.contact?.isMuted && (
                        <VolumeX className="w-3.5 h-3.5 text-gray-400 inline-block flex-shrink-0 opacity-70" />
                      )}
                    </div>
                    <span className={`text-[11px] whitespace-nowrap flex-shrink-0 ${isSelected ? 'text-purple-200' : 'text-gray-400'}`}>
                      {conv.lastActivity || lastMsg?.timestamp || ''}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-xs truncate ${isSelected ? 'text-purple-100' : 'text-gray-400'}`}>
                      {lastMsg?.senderName ? `${lastMsg.senderName}: ` : ''}
                      {lastMsg?.text || conv.contact?.badge || 'No messages yet'}
                    </p>

                    {conv.unreadCount ? (
                      <span
                        className={`min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0 ${
                          isSelected
                            ? 'bg-white text-[#706be7]'
                            : 'bg-[#293849] text-gray-300'
                        }`}
                      >
                        {conv.unreadCount}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Floating Edit/Pencil Button (bottom right of left panel) */}
        <button
          className="absolute right-4 bottom-4 w-12 h-12 rounded-full bg-[#9b87f5] hover:bg-[#8973f0] text-gray-900 shadow-xl flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
          title="New Message"
          aria-label="New Message"
        >
          <Edit2 className="w-5 h-5 text-gray-950" />
        </button>
      </div>

      {/* ===================== RIGHT MAIN CHAT WINDOW ===================== */}
      <div
        className={`${
          showConversation ? 'flex' : 'hidden'
        } flex-1 flex-col h-full bg-[#0e1621] relative min-w-0`}
      >
        {activeConversation ? (
          <>
            {/* Header Bar */}
            <div className="h-14 px-4 border-b border-[#192430] bg-[#17212b] flex items-center justify-between z-20 flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                {isMobile && (
                  <button
                    onClick={() => setActiveConvId(null)}
                    className="p-1 rounded-full text-gray-300 hover:text-white"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                )}

                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm ${
                    activeConversation.contact?.avatarBg || 'bg-purple-600 text-white'
                  }`}
                >
                  {(activeConversation.contact?.avatar && activeConversation.contact.avatar.length <= 2)
                    ? activeConversation.contact.avatar
                    : (activeConversation.contact?.name?.charAt(0) || 'T')}
                </div>

                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-white truncate flex items-center gap-1.5">
                    {activeConversation.contact?.name}
                  </h3>
                  <p className="text-[11px] text-gray-400 truncate">
                    {activeConversation.contact?.subtitle ||
                      (activeConversation.contact?.status === 'supergroup'
                        ? '2 837 members, 110 online'
                        : 'online')}
                  </p>
                </div>
              </div>

              {/* Right Header Buttons */}
              <div className="flex items-center gap-1 relative" ref={menuRef}>
                <button
                  className="p-2 text-gray-400 hover:text-white hover:bg-[#202c3a] rounded-full transition-colors"
                  title="Search chat"
                >
                  <Search className="w-5 h-5" />
                </button>

                <button
                  onClick={() => setIsMenuOpen(prev => !prev)}
                  data-testid="telegram-options-button"
                  className={`p-2 rounded-full transition-colors ${
                    isMenuOpen ? 'text-white bg-[#202c3a]' : 'text-gray-400 hover:text-white hover:bg-[#202c3a]'
                  }`}
                  title="More options"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>

                {/* 3-Dot Dropdown Menu (matching screenshot 2) */}
                {isMenuOpen && (
                  <div
                    data-testid="telegram-options-menu"
                    className="absolute right-0 top-12 w-56 bg-[#212121] border border-[#333333] rounded-xl shadow-2xl py-1.5 z-50 text-sm animate-in fade-in zoom-in-95 duration-100"
                  >
                    <button
                      onClick={() => setIsMenuOpen(false)}
                      className="w-full px-4 py-2 flex items-center gap-3 text-gray-200 hover:bg-[#2b2b2b] transition-colors text-left"
                    >
                      <Volume2 className="w-4 h-4 text-gray-400" />
                      <span>Unmute</span>
                    </button>
                    <button
                      onClick={() => setIsMenuOpen(false)}
                      className="w-full px-4 py-2 flex items-center gap-3 text-gray-200 hover:bg-[#2b2b2b] transition-colors text-left"
                    >
                      <CheckCircle2 className="w-4 h-4 text-gray-400" />
                      <span>Select Messages</span>
                    </button>
                    <button
                      onClick={() => setIsMenuOpen(false)}
                      className="w-full px-4 py-2 flex items-center gap-3 text-gray-200 hover:bg-[#2b2b2b] transition-colors text-left"
                    >
                      <Gift className="w-4 h-4 text-gray-400" />
                      <span>Send a Gift</span>
                    </button>
                    <button
                      onClick={() => setIsMenuOpen(false)}
                      className="w-full px-4 py-2 flex items-center gap-3 text-gray-200 hover:bg-[#2b2b2b] transition-colors text-left"
                    >
                      <Zap className="w-4 h-4 text-gray-400" />
                      <span>Boost Group</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsReportModalOpen(true);
                      }}
                      className="w-full px-4 py-2 flex items-center gap-3 text-gray-200 hover:bg-[#2b2b2b] transition-colors text-left"
                    >
                      <Flag className="w-4 h-4 text-gray-400" />
                      <span>Report</span>
                    </button>
                    <button
                      onClick={() => setIsMenuOpen(false)}
                      className="w-full px-4 py-2 flex items-center gap-3 text-gray-200 hover:bg-[#2b2b2b] transition-colors text-left"
                    >
                      <XCircle className="w-4 h-4 text-gray-400" />
                      <span>Clear history</span>
                    </button>
                    <button
                      onClick={handleDeleteChat}
                      className="w-full px-4 py-2 flex items-center gap-3 text-red-400 hover:bg-[#2b2b2b] transition-colors text-left"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                      <span>Leave Group</span>
                    </button>

                    <div className="h-px bg-[#333333] my-1" />

                    {/* Authentic Defensive Actions */}
                    <button
                      onClick={handleBlockContact}
                      data-testid="telegram-block-action"
                      className="w-full px-4 py-2 flex items-center gap-3 text-gray-200 hover:bg-[#2b2b2b] transition-colors text-left"
                    >
                      <Ban className="w-4 h-4 text-gray-400" />
                      <span>Block</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsReportModalOpen(true);
                      }}
                      data-testid="telegram-report-action"
                      className="w-full px-4 py-2 flex items-center gap-3 text-gray-200 hover:bg-[#2b2b2b] transition-colors text-left"
                    >
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <span>Report</span>
                    </button>

                    <button
                      onClick={handleDeleteChat}
                      data-testid="telegram-delete-action"
                      className="w-full px-4 py-2 flex items-center gap-3 text-red-500 hover:bg-[#2b2b2b] transition-colors text-left font-medium"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                      <span>Delete</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Pinned Message Bar */}
            {isPinnedOpen && activeConversation.pinnedMessage && (
              <div className="px-4 py-1.5 bg-[#17212b]/95 border-b border-[#212d3b] flex items-center justify-between text-xs text-gray-300 z-10 backdrop-blur-sm">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Pin className="w-4 h-4 text-[#706be7] flex-shrink-0" />
                  <div className="w-7 h-7 rounded bg-[#2b394a] flex items-center justify-center flex-shrink-0 text-white font-bold text-[10px]">
                    🎬
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-[#706be7] leading-none mb-0.5">
                      {activeConversation.pinnedMessage.title || 'Pinned Message'}
                    </p>
                    <p className="text-gray-300 text-[11px] truncate">
                      {activeConversation.pinnedMessage.text}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsPinnedOpen(false)}
                  className="p-1 text-gray-400 hover:text-white rounded"
                  title="Dismiss pin"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Link Click Notice (intercepted malware warning) */}
            {linkNotice && (
              <div className="px-4 py-2 bg-red-950/80 border-b border-red-800 text-xs text-red-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span>
                    <strong>Caution:</strong> Simulated malware link clicked ({linkNotice.url}). Risk telemetry recorded.
                  </span>
                </div>
                <button onClick={() => setLinkNotice(null)} className="text-red-400 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Messages Body */}
            <div
              className="flex-1 overflow-y-auto p-4 space-y-3.5"
              style={{
                backgroundImage: `radial-gradient(circle at 50% 50%, rgba(14, 22, 33, 0.7), rgba(10, 14, 19, 0.95))`
              }}
            >
              {activeConversation.messages?.map((msg, idx) => {
                const isUser = msg.sender === 'user';
                const isBot = msg.sender === 'bot';

                return (
                  <div
                    key={msg.id || idx}
                    className={`flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {/* Incoming sender avatar circle */}
                    {!isUser && (
                      <div className="w-8 h-8 rounded-full bg-[#273545] text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mb-1">
                        {msg.senderName?.charAt(0) || 'U'}
                      </div>
                    )}

                    <div
                      className={`relative max-w-[85%] sm:max-w-[70%] rounded-2xl px-3.5 py-2 shadow-md ${
                        isUser
                          ? 'bg-[#706be7] text-white rounded-br-none'
                          : 'bg-[#182533] text-gray-100 rounded-bl-none border border-[#233243]'
                      }`}
                    >
                      {/* Sender name for group chats */}
                      {!isUser && msg.senderName && (
                        <p className={`text-xs font-bold mb-1 ${msg.senderColor || 'text-emerald-400'}`}>
                          {msg.senderName}
                        </p>
                      )}

                      {/* Quoted message block */}
                      {msg.quoted && (
                        <div className="mb-2 pl-2 border-l-2 border-emerald-400 bg-[#121c27] py-1 pr-2 rounded text-xs text-gray-300">
                          <p className="font-semibold text-emerald-400 text-[10px]">Quoted Message</p>
                          <p className="truncate text-gray-400">{msg.quoted}</p>
                        </div>
                      )}

                      {/* Multimedia File Card (Video / Executable Preview) */}
                      {msg.isFileCard && (
                        <div className="mb-2.5 p-3 rounded-xl bg-[#121b26] border border-[#202f40]">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-full bg-emerald-600/30 text-emerald-400 flex items-center justify-center flex-shrink-0">
                              <FileDown className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-white truncate">
                                {msg.fileName || 'VisionQuest.S01E04.Malware.mkv'}
                              </p>
                              <p className="text-[11px] text-gray-400">{msg.fileSize || '1.22 GB'}</p>
                            </div>
                          </div>

                          {msg.specs && (
                            <pre className="text-[10px] text-gray-400 font-mono whitespace-pre-wrap mb-2 bg-[#0d141d] p-2 rounded">
                              {msg.specs}
                            </pre>
                          )}

                          {msg.link && (
                            <button
                              onClick={(e) => handleSimulatedLink(e, msg.link)}
                              data-testid="telegram-download-link"
                              className="w-full py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                            >
                              <FileDown className="w-4 h-4" />
                              <span>Download File</span>
                            </button>
                          )}
                        </div>
                      )}

                      {/* Normal Message Text */}
                      {msg.text && (
                        <p className="text-xs leading-relaxed whitespace-pre-wrap break-words">
                          {msg.text}
                        </p>
                      )}

                      {/* Additional link in text if any */}
                      {msg.link && !msg.isFileCard && (
                        <div className="mt-2">
                          <button
                            onClick={(e) => handleSimulatedLink(e, msg.link)}
                            className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:underline break-all"
                          >
                            <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>{msg.link.text || msg.link.url}</span>
                          </button>
                        </div>
                      )}

                      {/* Timestamp & Delivery status */}
                      <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-gray-400">
                        <span>{msg.timestamp || '10:25'}</span>
                        {isUser && <CheckCheck className="w-3.5 h-3.5 text-purple-200" />}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form
              onSubmit={handleSendMessage}
              className="p-3 bg-[#17212b] border-t border-[#192430] flex items-center gap-2 flex-shrink-0"
            >
              <button
                type="button"
                className="p-2 text-gray-400 hover:text-white rounded-full transition-colors"
                title="Attach file"
              >
                <Paperclip className="w-5 h-5" />
              </button>

              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Message"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  className="w-full bg-[#0e1621] text-sm text-gray-200 placeholder-gray-500 rounded-full px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-[#706be7] transition-all"
                />
              </div>

              <button
                type="button"
                className="p-2 text-gray-400 hover:text-white rounded-full transition-colors"
                title="Emojis"
              >
                <Smile className="w-5 h-5" />
              </button>

              {inputText.trim() ? (
                <button
                  type="submit"
                  className="w-10 h-10 rounded-full bg-[#706be7] hover:bg-[#5f59e0] text-white flex items-center justify-center transition-colors shadow-md"
                  title="Send message"
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              ) : (
                <button
                  type="button"
                  className="w-10 h-10 rounded-full bg-[#706be7] hover:bg-[#5f59e0] text-white flex items-center justify-center transition-colors shadow-md"
                  title="Voice Message"
                >
                  <Mic className="w-4 h-4" />
                </button>
              )}
            </form>
          </>
        ) : (
          /* Empty Chat State */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-400">
            <div className="w-20 h-20 rounded-full bg-[#182330] flex items-center justify-center mb-4 text-[#706be7]">
              <Send className="w-8 h-8" />
            </div>
            <h3 className="text-base font-semibold text-white mb-1">Select a chat to start messaging</h3>
            <p className="text-xs text-gray-500 max-w-xs">
              Choose from your conversations or search for contacts and channels.
            </p>
          </div>
        )}
      </div>

      {/* ===================== REPORT THREAT MODAL ===================== */}
      {isReportModalOpen && (
        <div
          data-testid="telegram-report-modal"
          className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <div className="bg-[#1b2533] border border-[#2b3a4d] rounded-2xl max-w-md w-full p-6 text-gray-200 shadow-2xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#2b3a4d]">
              <div className="flex items-center gap-2">
                <Flag className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Report Threat / Scam</h3>
              </div>
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-300 mb-4 leading-relaxed">
              Why are you reporting this Telegram message or group? Select the observable threat indicators below:
            </p>

            <div className="space-y-2.5 mb-5 text-xs">
              <label className="flex items-center gap-2.5 p-2 rounded-lg bg-[#141d28] hover:bg-[#1a2535] cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={reportIndicators.malwareAttachment}
                  onChange={e =>
                    setReportIndicators(prev => ({ ...prev, malwareAttachment: e.target.checked }))
                  }
                  className="rounded border-gray-600 text-[#706be7] focus:ring-[#706be7]"
                />
                <span className="text-gray-200">Malware executable / Trojan masquerading as media</span>
              </label>

              <label className="flex items-center gap-2.5 p-2 rounded-lg bg-[#141d28] hover:bg-[#1a2535] cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={reportIndicators.suspiciousMirrorLink}
                  onChange={e =>
                    setReportIndicators(prev => ({ ...prev, suspiciousMirrorLink: e.target.checked }))
                  }
                  className="rounded border-gray-600 text-[#706be7] focus:ring-[#706be7]"
                />
                <span className="text-gray-200">Suspicious external mirror link / Phishing CDN</span>
              </label>

              <label className="flex items-center gap-2.5 p-2 rounded-lg bg-[#141d28] hover:bg-[#1a2535] cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={reportIndicators.scamImpersonation}
                  onChange={e =>
                    setReportIndicators(prev => ({ ...prev, scamImpersonation: e.target.checked }))
                  }
                  className="rounded border-gray-600 text-[#706be7] focus:ring-[#706be7]"
                />
                <span className="text-gray-200">Fake admin / Bot impersonation</span>
              </label>

              <label className="flex items-center gap-2.5 p-2 rounded-lg bg-[#141d28] hover:bg-[#1a2535] cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={reportIndicators.botSpam}
                  onChange={e =>
                    setReportIndicators(prev => ({ ...prev, botSpam: e.target.checked }))
                  }
                  className="rounded border-gray-600 text-[#706be7] focus:ring-[#706be7]"
                />
                <span className="text-gray-200">Automated spam & commercial deals</span>
              </label>
            </div>

            <div className="mb-5">
              <label className="block text-[11px] font-semibold text-gray-400 mb-1">
                Optional Notes:
              </label>
              <textarea
                value={reportNotes}
                onChange={e => setReportNotes(e.target.value)}
                placeholder="Describe why this link or group seems fraudulent..."
                rows={2}
                className="w-full bg-[#121922] text-xs text-gray-200 rounded-lg p-2.5 border border-[#2b3a4d] focus:outline-none focus:ring-1 focus:ring-[#706be7]"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#2b3a4d]">
              <button
                type="button"
                onClick={() => setIsReportModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-gray-300 hover:bg-[#243345] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReport}
                data-testid="telegram-submit-report-btn"
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-500 text-white transition-colors shadow-md"
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
