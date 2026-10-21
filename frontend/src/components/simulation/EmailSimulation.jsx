import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Mail,
  MessageSquare,
  Video,
  Pen,
  Inbox,
  Star,
  Clock,
  Send,
  FileText,
  Tag,
  ShoppingBag,
  ChevronDown,
  ChevronRight,
  Plus,
  Menu,
  Search,
  SlidersHorizontal,
  HelpCircle,
  Settings,
  Grid,
  ArrowLeft,
  Archive,
  AlertOctagon,
  Trash2,
  Ban,
  AlertCircle,
  MailCheck,
  CheckCircle2,
  FolderInput,
  MoreVertical,
  ChevronLeft,
  Paperclip,
  Printer,
  ExternalLink,
  CornerUpLeft,
  CornerUpRight,
  Smile,
  X,
  AlertTriangle,
  FileIcon,
  Download,
  Eye,
  Check,
  RotateCcw,
  ShieldCheck,
  ShieldAlert,
  Info,
  Maximize2,
  Minimize2,
  Languages
} from 'lucide-react';

/**
 * EmailSimulation Component
 * 
 * Reusable simulation module for AI-driven social engineering attack training.
 * Provides a high-fidelity, data-driven, isolated email environment.
 * 
 * @param {Object} props
 * @param {Object} props.scenario - Validated scenario JSON
 * @param {string} props.sessionId - Current simulation session ID
 * @param {string} props.deviceMode - 'full' for desktop browser, 'mobile' for smartphone app
 * @param {Function} props.onAction - Reports user interaction events
 * @param {Function} props.onComplete - Notifies parent of terminal state
 */
export default function EmailSimulation({
  scenario,
  sessionId = 'sess-sim-default',
  deviceMode = 'full',
  onAction,
  onComplete
}) {
  const isMobileView = deviceMode === 'mobile';
  // Graceful fallback if scenario is missing
  if (!scenario || typeof scenario !== 'object') {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] p-6 bg-gray-50 text-gray-700">
        <div className="text-center p-8 bg-white border border-gray-200 rounded-xl shadow-sm max-w-md">
          <AlertOctagon className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-semibold mb-2">Scenario Unavailable</h2>
          <p className="text-sm text-gray-600 mb-4">
            No valid email attack scenario data was provided to the simulation runner.
          </p>
        </div>
      </div>
    );
  }

  // Session & Scenario IDs
  const scenarioId = scenario.scenarioId || scenario.id || 'unnamed-scenario';
  const targetId = scenario.targetId || scenario.emailData?.id || 'target-email';

  // Primary navigation view: 'inbox' | 'email'
  const [currentView, setCurrentView] = useState(scenario.initialView === 'email' ? 'email' : 'inbox');

  // Search filter query
  const [searchQuery, setSearchQuery] = useState('');

  // Selected emails by ID for bulk operations
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Starred email IDs (local state merged with scenario data)
  const [starredIds, setStarredIds] = useState(() => {
    const set = new Set();
    if (scenario.emailData?.isStarred) set.add(scenario.emailData.id);
    (scenario.inboxMessages || []).forEach(msg => {
      if (msg.isStarred) set.add(msg.id);
    });
    return set;
  });

  // Track read/unread states locally
  const [readIds, setReadIds] = useState(() => {
    const set = new Set();
    if (scenario.emailData && !scenario.emailData.isUnread) set.add(scenario.emailData.id);
    (scenario.inboxMessages || []).forEach(msg => {
      if (!msg.isUnread) set.add(msg.id);
    });
    return set;
  });

  // Combine scenario.emailData with companion inbox messages into a unified list
  const initialMessages = useMemo(() => {
    const list = [];
    const targetEmail = scenario.emailData;

    if (scenario.inboxMessages && Array.isArray(scenario.inboxMessages)) {
      scenario.inboxMessages.forEach(msg => {
        // If message is target or has targetId, merge full target details
        if (msg.isTarget || msg.id === targetId || (targetEmail && msg.id === targetEmail.id)) {
          list.push({ ...targetEmail, ...msg, isTarget: true });
        } else {
          list.push(msg);
        }
      });
    }

    // Ensure the target phishing email is present in the list
    if (targetEmail && !list.some(m => m.id === targetEmail.id || m.isTarget)) {
      list.unshift({ ...targetEmail, isTarget: true });
    }

    return list;
  }, [scenario]);

  const [inboxList, setInboxList] = useState(initialMessages);

  // Active email in View B (default to target phishing email or first message)
  const [activeEmail, setActiveEmail] = useState(() => {
    if (scenario.emailData) return scenario.emailData;
    return initialMessages.find(m => m.isTarget) || initialMessages[0] || null;
  });

  // Security routing details dropdown ("to me ▾")
  const [showSecurityDetails, setShowSecurityDetails] = useState(false);

  // Message 3-dot dropdown menu state (in email card header)
  const [isMessageMenuOpen, setIsMessageMenuOpen] = useState(false);
  const messageMenuRef = useRef(null);

  // Toolbar 3-dot dropdown menu state (in top toolbar)
  const [isToolbarMenuOpen, setIsToolbarMenuOpen] = useState(false);
  const toolbarMenuRef = useRef(null);

  // Inbox toolbar 3-dot dropdown menu state
  const [isInboxMenuOpen, setIsInboxMenuOpen] = useState(false);
  const inboxMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (messageMenuRef.current && !messageMenuRef.current.contains(e.target)) {
        setIsMessageMenuOpen(false);
      }
      if (toolbarMenuRef.current && !toolbarMenuRef.current.contains(e.target)) {
        setIsToolbarMenuOpen(false);
      }
      if (inboxMenuRef.current && !inboxMenuRef.current.contains(e.target)) {
        setIsInboxMenuOpen(false);
      }
    };
    if (isMessageMenuOpen || isToolbarMenuOpen || isInboxMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMessageMenuOpen, isToolbarMenuOpen, isInboxMenuOpen]);

  // Threat Reporting Modal State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportIndicators, setReportIndicators] = useState({
    suspiciousSender: false,
    urgentActionThreat: false,
    credentialHarvestLink: false,
    anomalousHeader: false,
    genericGreeting: false,
  });
  const [reportNotes, setReportNotes] = useState('');
  const [threatReportedConfirmed, setThreatReportedConfirmed] = useState(false);

  // Reply Composer State
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replySuccessMessage, setReplySuccessMessage] = useState(null);
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // Compose Modal State (Floating New Message window)
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeStatus, setComposeStatus] = useState(null);

  // Simulated link clicked notice banner
  const [linkNotice, setLinkNotice] = useState(null);

  // Mobile sidebar drawer open/close
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Simulation completed overlay state
  const [isTerminal, setIsTerminal] = useState(Boolean(scenario.isTerminal));

  // Single scenario_viewed event tracker to prevent duplicate emissions on rerender
  const hasEmittedViewed = useRef(false);

  // Safe Event Dispatcher
  const emitEvent = (eventType, metadata = {}) => {
    const payload = {
      eventType,
      scenarioId,
      sessionId,
      targetId: activeEmail?.id || targetId,
      timestamp: new Date().toISOString(),
      metadata: {
        channel: 'email',
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
        scenarioTitle: scenario.title || 'Email Social Engineering Simulation',
        category: scenario.category || 'Phishing',
        difficulty: scenario.difficulty || 'Medium',
        totalInboxCount: inboxList.length,
        initialView: currentView
      });
    }
  }, [scenarioId, sessionId]);

  // Handle open email from list
  const handleOpenEmail = (email) => {
    setActiveEmail(email);
    setCurrentView('email');
    setShowSecurityDetails(false);
    setIsReplying(false);
    setLinkNotice(null);

    // Mark as read locally
    setReadIds(prev => new Set(prev).add(email.id));

    emitEvent('message_opened', {
      emailId: email.id,
      subject: email.subject,
      senderName: email.sender?.name,
      senderEmail: email.sender?.email,
      isTargetPhish: Boolean(email.isTarget || email.id === targetId)
    });
  };

  // Handle back to inbox
  const handleBackToInbox = () => {
    setCurrentView('inbox');
    setLinkNotice(null);
    setIsReplying(false);
  };

  // Toggle star
  const handleToggleStar = (emailId, e) => {
    if (e) e.stopPropagation();
    setStarredIds(prev => {
      const next = new Set(prev);
      const isStarred = next.has(emailId);
      if (isStarred) {
        next.delete(emailId);
      } else {
        next.add(emailId);
      }
      emitEvent(isStarred ? 'message_unstarred' : 'message_starred', {
        emailId,
        isStarred: !isStarred
      });
      return next;
    });
  };

  // Toggle row selection
  const handleToggleSelect = (emailId, e) => {
    if (e) e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(emailId)) {
        next.delete(emailId);
      } else {
        next.add(emailId);
      }
      return next;
    });
  };

  // Select all or none
  const handleSelectAllToggle = () => {
    if (selectedIds.size === filteredMessages.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredMessages.map(m => m.id)));
    }
  };

  // Handle simulated link / button activation
  const handleSimulatedAction = (e, actionMeta) => {
    if (e) e.preventDefault();

    emitEvent('simulated_link_clicked', {
      actionId: actionMeta.id || actionMeta.actionId || 'link_action',
      url: actionMeta.url || '#',
      label: actionMeta.text || actionMeta.label || 'Action Link',
      targetPhish: true
    });

    setLinkNotice({
      url: actionMeta.url || 'https://vtop-auth-verify.portal',
      text: actionMeta.text || 'Action Clicked'
    });
  };

  // Submit threat report
  const handleConfirmReport = () => {
    const selectedCount = Object.values(reportIndicators).filter(Boolean).length;
    emitEvent('threat_reported', {
      emailId: activeEmail?.id || targetId,
      indicators: reportIndicators,
      indicatorCount: selectedCount,
      notes: reportNotes,
      reportedTarget: activeEmail?.isTarget || activeEmail?.id === targetId
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

  // Block Sender action (Positive Termination)
  const handleBlockSender = () => {
    setIsMessageMenuOpen(false);
    const senderEmail = activeEmail?.sender?.email || activeEmail?.securityDetails?.from || 'sender';
    const senderName = activeEmail?.sender?.name || senderEmail;

    emitEvent('user_blocked_sender', {
      emailId: activeEmail?.id || targetId,
      senderEmail,
      senderName,
      reportedTarget: activeEmail?.isTarget || activeEmail?.id === targetId
    });

    handleBackToInbox();

    if (typeof onComplete === 'function') {
      onComplete({
        status: 'safe_exit',
        action: 'user_blocked_sender',
        scenarioId,
        sessionId,
        reason: `Blocked suspicious sender "${senderEmail}"`
      });
    }
  };

  // Report Spam action (Positive Termination)
  const handleReportSpam = () => {
    setIsMessageMenuOpen(false);
    emitEvent('threat_reported', {
      emailId: activeEmail?.id || targetId,
      reportType: 'spam',
      indicators: { reportedAsSpam: true },
      indicatorCount: 1,
      reportedTarget: activeEmail?.isTarget || activeEmail?.id === targetId
    });

    handleBackToInbox();

    if (typeof onComplete === 'function') {
      onComplete({
        status: 'reported',
        action: 'threat_reported',
        scenarioId,
        sessionId,
        indicatorsIdentified: { reportedAsSpam: true }
      });
    }
  };

  // Report Phishing action (Opens Phishing Threat Indicators Modal)
  const handleReportPhishing = () => {
    setIsMessageMenuOpen(false);
    setIsReportModalOpen(true);
  };

  // Delete Email action (Positive Termination)
  const handleDeleteEmail = () => {
    setIsMessageMenuOpen(false);
    emitEvent('message_deleted', {
      emailId: activeEmail?.id || targetId,
      reportedTarget: activeEmail?.isTarget || activeEmail?.id === targetId
    });

    handleBackToInbox();

    if (typeof onComplete === 'function') {
      onComplete({
        status: 'safe_exit',
        action: 'message_deleted',
        scenarioId,
        sessionId,
        reason: 'User deleted suspicious email'
      });
    }
  };

  // Archive Email action (Positive Termination)
  const handleArchiveEmail = () => {
    emitEvent('message_archived', {
      emailId: activeEmail?.id || targetId,
      reportedTarget: activeEmail?.isTarget || activeEmail?.id === targetId
    });

    handleBackToInbox();

    if (typeof onComplete === 'function') {
      onComplete({
        status: 'safe_exit',
        action: 'message_archived',
        scenarioId,
        sessionId,
        reason: 'User archived suspicious email'
      });
    }
  };

  // Send simulated reply
  const handleSendReply = async (e) => {
    if (e) e.preventDefault();
    if (!replyText.trim() || isSubmittingReply) return;

    const trimmedReply = replyText.trim();
    setIsSubmittingReply(true);

    // 1. Emit telemetry event 'reply_sent'
    emitEvent('reply_sent', {
      recipient: activeEmail?.sender?.email || activeEmail?.sender?.name,
      replyContent: trimmedReply,
      simulated: true,
      emailId: activeEmail?.id || targetId,
      isTarget: activeEmail?.isTarget || activeEmail?.id === targetId
    });

    try {
      // 2. Send reply text and context to AI to evaluate termination
      const response = await fetch('/api/scenarios/email/evaluate-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          replyContent: trimmedReply,
          emailSubject: activeEmail?.subject || '',
          emailBody: activeEmail?.body?.text || activeEmail?.snippet || '',
          sender: activeEmail?.sender || {},
          scenarioContext: scenario?.title || ''
        })
      });

      const data = await response.json();

      if (response.ok && data?.success) {
        if (data.decision === 'positive_termination') {
          // Positive termination: user confronted/reported phishing
          setReplySuccessMessage(data.explanation || 'Defensive confrontation detected! Simulation ended safely.');
          setReplyText('');
          setIsReplying(false);

          if (typeof onComplete === 'function') {
            onComplete({
              status: 'safe_exit',
              action: 'threat_confronted',
              scenarioId,
              sessionId,
              reason: data.explanation || 'User confronted the malicious email threat via reply'
            });
          }
          return;
        }

        if (data.decision === 'negative_termination') {
          // Negative termination: user compromised credentials / complied with attacker
          setReplySuccessMessage(data.explanation || 'Compromised information submitted. Simulation ended.');
          setReplyText('');
          setIsReplying(false);

          if (typeof onComplete === 'function') {
            onComplete({
              status: 'completed',
              action: 'risky_reply_sent',
              scenarioId,
              sessionId,
              reason: data.explanation || 'User disclosed sensitive credentials in email reply'
            });
          }
          return;
        }
      }
    } catch (err) {
      console.warn('[Email Reply Evaluation Error]:', err.message);
    } finally {
      setIsSubmittingReply(false);
    }

    // 3. If AI decision is "continue_simulation" (or evaluation failed):
    // Just leave and let the user continue the simulation without terminating
    setReplySuccessMessage('Simulated reply recorded. No real email was sent.');
    setReplyText('');
    setIsReplying(false);

    setTimeout(() => {
      setReplySuccessMessage(null);
    }, 4500);
  };

  // Send simulated compose
  const handleSendCompose = (e) => {
    if (e) e.preventDefault();
    emitEvent('reply_sent', {
      recipient: composeTo,
      subject: composeSubject,
      body: composeBody,
      type: 'new_compose_message'
    });

    setComposeStatus('Simulated email dispatched to sandbox.');
    setTimeout(() => {
      setIsComposeOpen(false);
      setComposeStatus(null);
      setComposeTo('');
      setComposeSubject('');
      setComposeBody('');
    }, 1500);
  };

  // Filter messages based on search query
  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return inboxList;
    const q = searchQuery.toLowerCase();
    return inboxList.filter(msg => {
      const sender = (msg.sender?.name || '').toLowerCase();
      const subject = (msg.subject || '').toLowerCase();
      const preview = (msg.preview || '').toLowerCase();
      return sender.includes(q) || subject.includes(q) || preview.includes(q);
    });
  }, [inboxList, searchQuery]);

  // Profile data
  const userProfile = scenario.userProfile || {
    name: 'Pavan Kalyan',
    email: 'pavankalyan.k2023a@vitstudent.ac.in',
    avatar: 'P',
    institution: 'VIT',
    unreadCount: 2684
  };

  // Helper: Render mobile email body blocks
  const renderMobileEmailBody = (email) => {
    if (!email) return null;

    if (Array.isArray(email.contentBlocks) && email.contentBlocks.length > 0) {
      return (
        <div className="space-y-3.5">
          {email.contentBlocks.map((block, idx) => {
            switch (block.type) {
              case 'paragraph':
                return (
                  <p key={idx} className="text-[#e1e3e0] text-sm leading-relaxed whitespace-pre-line">
                    {block.text}
                  </p>
                );

              case 'alert':
                return (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl border flex items-start gap-3 my-2 ${
                      block.level === 'warning'
                        ? 'bg-[#29271c] border-[#4b4625] text-[#eed98b]'
                        : 'bg-[#18262f] border-[#254559] text-[#9ecce6]'
                    }`}
                  >
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-xs sm:text-sm">
                      {block.title && <div className="font-bold mb-1 text-amber-300">{block.title}</div>}
                      <div className="leading-relaxed">{block.text}</div>
                    </div>
                  </div>
                );

              case 'button':
                return (
                  <div key={idx} className="my-3">
                    <button
                      onClick={(e) => handleSimulatedAction(e, block)}
                      className="inline-flex items-center gap-2 bg-[#0b57d0] hover:bg-[#0842a0] active:scale-95 text-white px-5 py-2.5 rounded-full font-medium text-xs sm:text-sm shadow-md transition-all"
                    >
                      <span>{block.text || 'Action Required'}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );

              case 'link':
                return (
                  <div key={idx} className="my-2">
                    <a
                      href={block.url || '#'}
                      onClick={(e) => handleSimulatedAction(e, block)}
                      className="text-[#8ab4f8] hover:underline font-mono text-xs sm:text-sm break-all inline-flex items-center gap-1"
                    >
                      <span>{block.text || block.url}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>
                );

              case 'quote':
                return (
                  <blockquote
                    key={idx}
                    className="pl-3 border-l-2 border-[#3d4941] italic text-[#8e938f] text-xs my-2"
                  >
                    {block.text}
                  </blockquote>
                );

              case 'signature':
                return (
                  <div key={idx} className="pt-3 border-t border-[#242c27] text-xs text-[#8e938f] whitespace-pre-line">
                    {block.text}
                  </div>
                );

              default:
                return (
                  <p key={idx} className="text-[#e1e3e0] text-sm leading-relaxed">
                    {block.text || JSON.stringify(block)}
                  </p>
                );
            }
          })}
        </div>
      );
    }

    if (typeof email.body === 'string' && email.body.trim()) {
      return (
        <div className="space-y-3">
          {email.body.split('\n\n').map((para, i) => (
            <p key={i} className="text-[#e1e3e0] text-sm leading-relaxed whitespace-pre-line">
              {para}
            </p>
          ))}
        </div>
      );
    }

    return (
      <p className="text-[#e1e3e0] text-sm leading-relaxed whitespace-pre-line">
        {email.preview || 'No email content provided.'}
      </p>
    );
  };

  // =========================================================================
  // MOBILE GMAIL EXPERIENCE (Matching Authentic Mobile Screenshots)
  // Activated when deviceMode === 'mobile'
  // =========================================================================
  if (isMobileView) {
    return (
      <div className="flex flex-col h-full w-full bg-[#111614] text-[#e1e3e0] font-sans select-none overflow-hidden relative">
        {/* Mobile Slide-Out Drawer Menu */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex">
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative w-72 max-w-[80vw] bg-[#1a221d] text-[#e1e3e0] h-full shadow-2xl flex flex-col z-10 p-4 border-r border-[#26322b]">
              <div className="flex items-center justify-between pb-4 border-b border-[#26322b]">
                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-[#6dd58c]" />
                  <span className="font-bold text-base text-[#e1e3e0]">Gmail</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-full hover:bg-white/10 text-[#8e938f]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="py-3 text-xs text-[#8e938f] truncate border-b border-[#26322b]">
                {userProfile.email}
              </div>

              <div className="flex-1 overflow-y-auto py-3 space-y-1 text-sm font-medium">
                <button
                  onClick={() => {
                    setCurrentView('inbox');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-full transition-colors ${
                    currentView === 'inbox'
                      ? 'bg-[#1f382c] text-[#c2eed8] font-bold'
                      : 'text-[#c2c8c4] hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Inbox className="w-4 h-4" />
                    <span>Inbox</span>
                  </div>
                  <span className="text-xs font-semibold">{filteredMessages.length}</span>
                </button>

                <button
                  onClick={() => {
                    emitEvent('folder_selected', { folder: 'starred' });
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-full text-[#c2c8c4] hover:bg-white/5 transition-colors"
                >
                  <Star className="w-4 h-4" />
                  <span>Starred</span>
                </button>

                <button
                  onClick={() => {
                    emitEvent('folder_selected', { folder: 'snoozed' });
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-full text-[#c2c8c4] hover:bg-white/5 transition-colors"
                >
                  <Clock className="w-4 h-4" />
                  <span>Snoozed</span>
                </button>

                <button
                  onClick={() => {
                    emitEvent('folder_selected', { folder: 'sent' });
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-full text-[#c2c8c4] hover:bg-white/5 transition-colors"
                >
                  <Send className="w-4 h-4" />
                  <span>Sent</span>
                </button>

                <button
                  onClick={() => {
                    emitEvent('folder_selected', { folder: 'drafts' });
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-full text-[#c2c8c4] hover:bg-white/5 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  <span>Drafts</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Link Interception Alert Banner */}
        {linkNotice && (
          <div className="bg-amber-950/90 border-b border-amber-800/80 px-3 py-2 text-xs text-amber-200 flex items-center justify-between shrink-0 animate-fadeIn z-30">
            <div className="flex items-center gap-2 overflow-hidden mr-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="truncate">
                <strong>Link Intercepted:</strong> <code className="bg-amber-900/60 px-1 py-0.5 rounded text-[11px]">{linkNotice.url}</code>
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

        {/* Reply Feedback Banner */}
        {replySuccessMessage && (
          <div className="bg-emerald-950/90 border-b border-emerald-800/80 px-3 py-2 text-xs text-emerald-200 flex items-center justify-between shrink-0 animate-fadeIn z-30">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{replySuccessMessage}</span>
            </div>
            <button
              onClick={() => setReplySuccessMessage(null)}
              className="text-emerald-400 hover:text-white p-1 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* =================================================================== */}
        {/* VIEW 4: MOBILE REPLY SCREEN (Screenshot 5)                          */}
        {/* =================================================================== */}
        {isReplying && activeEmail ? (
          <div className="flex flex-col h-full w-full bg-[#111614] text-[#e1e3e0] overflow-hidden">
            {/* Top Bar */}
            <div className="h-14 flex items-center justify-between px-2 border-b border-[#202823] shrink-0">
              <button
                onClick={() => setIsReplying(false)}
                title="Discard reply"
                className="p-2 text-[#c2c8c4] hover:text-white rounded-full hover:bg-white/5"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-1">
                <button
                  title="Attach file"
                  className="p-2 text-[#c2c8c4] hover:text-white rounded-full hover:bg-white/5"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <button
                  onClick={handleSendReply}
                  disabled={!replyText.trim() || isSubmittingReply}
                  title="Send reply"
                  className="p-2 text-[#5cdbb5] hover:text-[#7ee8c7] disabled:text-gray-500 rounded-full hover:bg-white/5 active:scale-95"
                >
                  <Send className="w-5 h-5" />
                </button>
                <button
                  title="More options"
                  className="p-2 text-[#c2c8c4] hover:text-white rounded-full hover:bg-white/5"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* From field */}
            <div className="flex items-center px-4 py-3 border-b border-[#202823] text-xs sm:text-sm">
              <span className="text-[#8e938f] w-14 shrink-0">From</span>
              <span className="text-[#e1e3e0] truncate font-medium">{userProfile.email}</span>
            </div>

            {/* To field */}
            <div className="flex items-center px-4 py-3 border-b border-[#202823] text-xs sm:text-sm">
              <div className="flex items-center gap-1 text-[#8e938f] w-14 shrink-0">
                <CornerUpLeft className="w-4 h-4" />
                <ChevronDown className="w-3 h-3" />
              </div>
              <div className="flex-1 flex items-center justify-between min-w-0">
                <div className="inline-flex items-center gap-1.5 bg-[#1c2e24] text-[#c2eed8] px-3 py-1 rounded-full text-xs font-medium max-w-full truncate">
                  <div className="w-4 h-4 rounded-full bg-[#356149] text-white flex items-center justify-center text-[10px]">
                    👤
                  </div>
                  <span className="truncate">{activeEmail?.sender?.email || activeEmail?.sender?.name}</span>
                </div>
                <ChevronDown className="w-4 h-4 text-[#8e938f] shrink-0 ml-1" />
              </div>
            </div>

            {/* Subject */}
            <div className="px-4 py-3 border-b border-[#202823] text-sm text-[#e1e3e0] font-medium">
              Re: {activeEmail?.subject}
            </div>

            {/* Body Textarea */}
            <div className="flex-1 p-4 flex flex-col min-h-0">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Compose email"
                className="w-full flex-1 bg-transparent text-[#e1e3e0] placeholder-[#8e938f] text-sm resize-none focus:outline-none leading-relaxed"
                autoFocus
              />
              <button className="text-[#8e938f] hover:text-[#c2c8c4] text-xs font-mono self-start mt-2 p-1">
                ...
              </button>
            </div>
          </div>
        ) : isComposeOpen ? (
          /* =================================================================== */
          /* MOBILE COMPOSE SCREEN                                               */
          /* =================================================================== */
          <div className="flex flex-col h-full w-full bg-[#111614] text-[#e1e3e0] overflow-hidden">
            {/* Top Bar */}
            <div className="h-14 flex items-center justify-between px-2 border-b border-[#202823] shrink-0">
              <button
                onClick={() => setIsComposeOpen(false)}
                title="Discard compose"
                className="p-2 text-[#c2c8c4] hover:text-white rounded-full hover:bg-white/5"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-1">
                <button
                  title="Attach file"
                  className="p-2 text-[#c2c8c4] hover:text-white rounded-full hover:bg-white/5"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <button
                  onClick={handleSendCompose}
                  title="Send email"
                  className="p-2 text-[#5cdbb5] hover:text-[#7ee8c7] rounded-full hover:bg-white/5 active:scale-95"
                >
                  <Send className="w-5 h-5" />
                </button>
                <button
                  title="More options"
                  className="p-2 text-[#c2c8c4] hover:text-white rounded-full hover:bg-white/5"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* From */}
            <div className="flex items-center px-4 py-3 border-b border-[#202823] text-xs sm:text-sm">
              <span className="text-[#8e938f] w-14 shrink-0">From</span>
              <span className="text-[#e1e3e0] truncate font-medium">{userProfile.email}</span>
            </div>

            {/* To */}
            <div className="flex items-center px-4 py-3 border-b border-[#202823] text-xs sm:text-sm">
              <span className="text-[#8e938f] w-14 shrink-0">To</span>
              <input
                type="text"
                value={composeTo}
                onChange={(e) => setComposeTo(e.target.value)}
                placeholder="Recipient"
                className="flex-1 bg-transparent border-none text-[#e1e3e0] placeholder-[#8e938f] text-sm focus:outline-none"
              />
            </div>

            {/* Subject */}
            <div className="px-4 py-3 border-b border-[#202823] text-sm text-[#e1e3e0]">
              <input
                type="text"
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
                placeholder="Subject"
                className="w-full bg-transparent border-none text-[#e1e3e0] placeholder-[#8e938f] text-sm focus:outline-none font-medium"
              />
            </div>

            {/* Body */}
            <div className="flex-1 p-4 flex flex-col min-h-0">
              <textarea
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                placeholder="Compose email"
                className="w-full flex-1 bg-transparent text-[#e1e3e0] placeholder-[#8e938f] text-sm resize-none focus:outline-none leading-relaxed"
                autoFocus
              />
            </div>
          </div>
        ) : currentView === 'email' && activeEmail ? (
          /* =================================================================== */
          /* VIEW 2 & 3: MOBILE OPENED EMAIL VIEW (Screenshots 3 & 4)            */
          /* =================================================================== */
          <div className="flex flex-col h-full w-full bg-[#111614] text-[#e1e3e0] overflow-hidden">
            {/* Top App Bar */}
            <div className="h-14 flex items-center justify-between px-2 shrink-0 border-b border-[#202823]/50">
              <button
                onClick={handleBackToInbox}
                title="Back to inbox"
                className="p-2 text-[#c2c8c4] hover:text-white rounded-full hover:bg-white/5"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleArchiveEmail}
                  title="Archive"
                  className="p-2 text-[#c2c8c4] hover:text-white rounded-full hover:bg-white/5"
                >
                  <Archive className="w-5 h-5" />
                </button>
                <button
                  onClick={handleDeleteEmail}
                  title="Delete"
                  className="p-2 text-[#c2c8c4] hover:text-white rounded-full hover:bg-white/5"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    setReadIds((prev) => {
                      const next = new Set(prev);
                      next.delete(activeEmail.id);
                      return next;
                    });
                    handleBackToInbox();
                  }}
                  title="Mark unread"
                  className="p-2 text-[#c2c8c4] hover:text-white rounded-full hover:bg-white/5"
                >
                  <Mail className="w-5 h-5" />
                </button>

                {/* Top Toolbar 3-Dot Menu */}
                <div className="relative" ref={toolbarMenuRef}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsToolbarMenuOpen((prev) => !prev);
                    }}
                    title="More options"
                    aria-label="More options"
                    data-testid="toolbar-more-button"
                    className="p-2 text-[#c2c8c4] hover:text-white rounded-full hover:bg-white/5"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>

                  {isToolbarMenuOpen && (
                    <div
                      data-testid="toolbar-more-menu"
                      className="absolute right-0 top-full mt-1 w-60 bg-[#1d2521] border border-[#2e3b33] rounded-2xl shadow-2xl py-2 z-50 text-xs text-[#e1e3e0]"
                    >
                      <button
                        onClick={() => {
                          setIsToolbarMenuOpen(false);
                          setReadIds((prev) => {
                            const next = new Set(prev);
                            next.delete(activeEmail.id);
                            return next;
                          });
                          handleBackToInbox();
                        }}
                        className="w-full flex items-center px-4 py-2.5 hover:bg-[#26322b] text-left transition-colors"
                      >
                        <Mail className="w-4 h-4 text-[#8e938f] mr-3 shrink-0" />
                        <span>Mark as unread</span>
                      </button>
                      <button
                        onClick={() => {
                          setIsToolbarMenuOpen(false);
                          handleDeleteEmail();
                        }}
                        className="w-full flex items-center px-4 py-2.5 hover:bg-[#26322b] text-left transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-[#8e938f] mr-3 shrink-0" />
                        <span>Delete message</span>
                      </button>

                      <div className="border-t border-[#2e3b33] my-1" />

                      {/* 1) Block Sender (Positive Termination) */}
                      <button
                        onClick={() => {
                          setIsToolbarMenuOpen(false);
                          handleBlockSender();
                        }}
                        className="w-full flex items-center px-4 py-2.5 hover:bg-[#26322b] text-left transition-colors text-[#f28b82] font-medium"
                      >
                        <Ban className="w-4 h-4 text-[#f28b82] mr-3 shrink-0" />
                        <span className="truncate">
                          Block &ldquo;{activeEmail.sender?.name || activeEmail.sender?.email || 'Sender'}&rdquo;
                        </span>
                      </button>

                      {/* 2) Report Spam (Positive Termination) */}
                      <button
                        onClick={() => {
                          setIsToolbarMenuOpen(false);
                          handleReportSpam();
                        }}
                        className="w-full flex items-center px-4 py-2.5 hover:bg-[#26322b] text-left transition-colors text-[#f28b82] font-medium"
                      >
                        <AlertCircle className="w-4 h-4 text-[#f28b82] mr-3 shrink-0" />
                        <span>Report spam</span>
                      </button>

                      {/* 3) Report Phishing (Positive Termination) */}
                      <button
                        onClick={() => {
                          setIsToolbarMenuOpen(false);
                          handleReportPhishing();
                        }}
                        className="w-full flex items-center px-4 py-2.5 hover:bg-[#26322b] text-left transition-colors text-[#f28b82] font-medium"
                      >
                        <AlertOctagon className="w-4 h-4 text-[#f28b82] mr-3 shrink-0" />
                        <span>Report phishing</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Email Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
              {/* Subject line with Inbox badge & Star */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center flex-wrap gap-2 flex-1">
                  <h1 className="text-lg sm:text-xl font-normal text-[#e1e3e0] leading-snug">
                    {activeEmail.subject || '(no subject)'}
                  </h1>
                  <span className="bg-[#1c3829] text-[#71d99e] text-[11px] font-medium px-2 py-0.5 rounded">
                    Inbox
                  </span>
                </div>
                <button
                  onClick={(e) => handleToggleStar(activeEmail.id, e)}
                  aria-label={starredIds.has(activeEmail.id) ? 'Starred' : 'Not starred'}
                  className="p-1 text-[#8e938f] hover:text-amber-400 shrink-0"
                >
                  <Star
                    className={`w-5 h-5 ${
                      starredIds.has(activeEmail.id) ? 'fill-[#e37400] text-[#e37400]' : 'text-[#8e938f]'
                    }`}
                  />
                </button>
              </div>

              {/* Sender Info Row */}
              <div className="flex items-start justify-between gap-3 pt-1">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm shrink-0 ${
                      activeEmail.sender?.avatarBg || 'bg-[#303833] text-[#e1e3e0]'
                    }`}
                  >
                    {activeEmail.sender?.avatar || activeEmail.sender?.name?.charAt(0) || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="font-bold text-sm text-[#e1e3e0] truncate">
                        {activeEmail.sender?.name || 'Sender'}
                      </span>
                      <span className="text-xs text-[#8e938f] shrink-0">
                        {activeEmail.timestamp || 'Yesterday'}
                      </span>
                    </div>

                    <div className="relative mt-0.5">
                      <button
                        onClick={() => setShowSecurityDetails((prev) => !prev)}
                        className="flex items-center text-xs text-[#8e938f] hover:text-[#c2c8c4] focus:outline-none"
                      >
                        <span>to me</span>
                        <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
                      </button>

                      {showSecurityDetails && (
                        <div className="absolute top-6 left-0 z-30 w-72 sm:w-80 p-3 bg-[#1c2420] border border-[#2e3a33] rounded-xl shadow-xl text-xs text-[#c2c8c4] space-y-1">
                          <div>
                            <span className="text-[#8e938f]">From: </span>
                            {activeEmail.securityDetails?.from || activeEmail.sender?.email}
                          </div>
                          <div>
                            <span className="text-[#8e938f]">To: </span>
                            {activeEmail.securityDetails?.to || userProfile.email}
                          </div>
                          <div>
                            <span className="text-[#8e938f]">Date: </span>
                            {activeEmail.securityDetails?.date || activeEmail.fullTimestamp || 'Oct 18, 2026'}
                          </div>
                          <div>
                            <span className="text-[#8e938f]">Security: </span>
                            {activeEmail.securityDetails?.security || 'Standard encryption (TLS)'}
                          </div>
                          {activeEmail.securityDetails?.spf && (
                            <div>
                              <span className="text-[#8e938f]">SPF: </span>
                              <span className="text-amber-400 font-mono">{activeEmail.securityDetails.spf}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Unsubscribe link + Message 3-dot button */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() =>
                      emitEvent('simulated_link_clicked', {
                        actionId: 'unsubscribe',
                        url: '#',
                        label: 'Unsubscribe'
                      })
                    }
                    className="text-[#8ab4f8] text-xs font-medium px-1 py-1 hover:underline"
                  >
                    Unsubscribe
                  </button>

                  <div className="relative" ref={messageMenuRef}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMessageMenuOpen((prev) => !prev);
                      }}
                      title="More options"
                      aria-label="More options"
                      data-testid="message-more-button"
                      className="p-1.5 text-[#8e938f] hover:text-[#e1e3e0] rounded-full hover:bg-white/5"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {/* VIEW 3: MESSAGE 3-DOT DROPDOWN MENU (Screenshot 4) */}
                    {isMessageMenuOpen && (
                      <div
                        data-testid="message-more-menu"
                        className="absolute right-0 top-full mt-1 w-64 bg-[#1d2521] border border-[#2e3b33] rounded-2xl shadow-2xl py-2 z-50 text-xs text-[#e1e3e0] font-sans"
                      >
                        <button
                          onClick={() => {
                            setIsMessageMenuOpen(false);
                            setIsReplying(true);
                          }}
                          className="w-full flex items-center px-4 py-2.5 hover:bg-[#26322b] text-left transition-colors"
                        >
                          <CornerUpLeft className="w-4 h-4 text-[#8e938f] mr-3 shrink-0" />
                          <span>Reply</span>
                        </button>

                        <button
                          onClick={() => {
                            setIsMessageMenuOpen(false);
                            emitEvent('forward_clicked', { emailId: activeEmail.id });
                          }}
                          className="w-full flex items-center px-4 py-2.5 hover:bg-[#26322b] text-left transition-colors"
                        >
                          <CornerUpRight className="w-4 h-4 text-[#8e938f] mr-3 shrink-0" />
                          <span>Forward</span>
                        </button>

                        <button
                          onClick={() => {
                            setIsMessageMenuOpen(false);
                            emitEvent('chat_rail_clicked', { notice: 'Share in chat' });
                          }}
                          className="w-full flex items-center px-4 py-2.5 hover:bg-[#26322b] text-left transition-colors"
                        >
                          <MessageSquare className="w-4 h-4 text-[#8e938f] mr-3 shrink-0" />
                          <span>Share in chat</span>
                        </button>

                        <button
                          onClick={(e) => {
                            setIsMessageMenuOpen(false);
                            handleToggleStar(activeEmail.id, e);
                          }}
                          className="w-full flex items-center px-4 py-2.5 hover:bg-[#26322b] text-left transition-colors"
                        >
                          <Star className="w-4 h-4 text-[#8e938f] mr-3 shrink-0" />
                          <span>{starredIds.has(activeEmail.id) ? 'Remove star' : 'Add star'}</span>
                        </button>

                        <button
                          onClick={() => {
                            setIsMessageMenuOpen(false);
                            setReadIds((prev) => {
                              const next = new Set(prev);
                              next.delete(activeEmail.id);
                              return next;
                            });
                            handleBackToInbox();
                          }}
                          className="w-full flex items-center px-4 py-2.5 hover:bg-[#26322b] text-left transition-colors"
                        >
                          <Mail className="w-4 h-4 text-[#8e938f] mr-3 shrink-0" />
                          <span>Mark unread from here</span>
                        </button>

                        <button
                          onClick={() => setIsMessageMenuOpen(false)}
                          className="w-full flex items-center px-4 py-2.5 hover:bg-[#26322b] text-left transition-colors"
                        >
                          <Languages className="w-4 h-4 text-[#8e938f] mr-3 shrink-0" />
                          <span>Translate</span>
                        </button>

                        <button
                          onClick={() => setIsMessageMenuOpen(false)}
                          className="w-full flex items-center px-4 py-2.5 hover:bg-[#26322b] text-left transition-colors"
                        >
                          <Printer className="w-4 h-4 text-[#8e938f] mr-3 shrink-0" />
                          <span>Print</span>
                        </button>

                        <div className="border-t border-[#2e3b33] my-1" />

                        {/* Defensive Option 1: Block Sender (Positive Termination) */}
                        <button
                          onClick={handleBlockSender}
                          className="w-full flex items-center px-4 py-2.5 hover:bg-[#26322b] text-left transition-colors text-[#f28b82] font-medium"
                        >
                          <Ban className="w-4 h-4 text-[#f28b82] mr-3 shrink-0" />
                          <span className="truncate">
                            Block &ldquo;{activeEmail.sender?.name || activeEmail.sender?.email || 'Sender'}&rdquo;
                          </span>
                        </button>

                        {/* Defensive Option 2: Report Spam (Positive Termination) */}
                        <button
                          onClick={handleReportSpam}
                          className="w-full flex items-center px-4 py-2.5 hover:bg-[#26322b] text-left transition-colors text-[#f28b82] font-medium"
                        >
                          <AlertCircle className="w-4 h-4 text-[#f28b82] mr-3 shrink-0" />
                          <span>Report spam</span>
                        </button>

                        {/* Defensive Option 3: Report Phishing (Positive Termination) */}
                        <button
                          onClick={handleReportPhishing}
                          className="w-full flex items-center px-4 py-2.5 hover:bg-[#26322b] text-left transition-colors text-[#f28b82] font-medium"
                        >
                          <AlertOctagon className="w-4 h-4 text-[#f28b82] mr-3 shrink-0" />
                          <span>Report phishing</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Email Body Content */}
              <div className="pt-2">
                {renderMobileEmailBody(activeEmail)}
              </div>

              {/* Attachments (if any) */}
              {Array.isArray(activeEmail.attachments) && activeEmail.attachments.length > 0 && (
                <div className="pt-4 border-t border-[#202823] mt-4">
                  <div className="text-xs font-semibold text-[#8e938f] mb-2 flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>{activeEmail.attachments.length} Attachment</span>
                  </div>
                  <div className="space-y-2">
                    {activeEmail.attachments.map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-[#2f3832] bg-[#1a221d] hover:bg-[#202b24] transition-colors"
                      >
                        <div className="flex items-center gap-2.5 truncate mr-2">
                          <div className="w-8 h-8 rounded-lg bg-red-950/80 text-red-400 flex items-center justify-center shrink-0">
                            <FileIcon className="w-4 h-4" />
                          </div>
                          <div className="truncate">
                            <div className="text-xs font-medium text-[#e1e3e0] truncate">{att.name}</div>
                            <div className="text-[10px] text-[#8e938f]">{att.size}</div>
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            emitEvent('attachment_downloaded', {
                              attachmentId: att.id,
                              fileName: att.name
                            })
                          }
                          className="p-1.5 hover:bg-white/10 rounded-full text-[#8e938f] hover:text-[#c2eed8]"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bottom 3 Pill Action Buttons (Screenshot 3) */}
              <div className="flex items-center gap-2 pt-6 pb-4">
                <button
                  onClick={() => setIsReplying(true)}
                  className="flex-1 bg-[#1c3829] hover:bg-[#254835] active:scale-98 text-[#c2eed8] px-4 py-2.5 rounded-full text-xs font-medium flex items-center justify-center gap-2 transition-all"
                >
                  <CornerUpLeft className="w-4 h-4" />
                  <span>Reply</span>
                </button>
                <button
                  onClick={() => emitEvent('forward_clicked', { emailId: activeEmail.id })}
                  className="flex-1 bg-[#1c3829] hover:bg-[#254835] active:scale-98 text-[#c2eed8] px-4 py-2.5 rounded-full text-xs font-medium flex items-center justify-center gap-2 transition-all"
                >
                  <CornerUpRight className="w-4 h-4" />
                  <span>Forward</span>
                </button>
                <button
                  onClick={() => emitEvent('chat_rail_clicked', { notice: 'Reaction clicked' })}
                  className="bg-[#1c3829] hover:bg-[#254835] text-[#c2eed8] px-3.5 py-2.5 rounded-full text-xs font-medium flex items-center justify-center transition-all shrink-0"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Bottom Nav Bar (Persistent) */}
            <nav className="bg-[#131915] border-t border-[#202823] h-16 flex items-center justify-around shrink-0 z-20">
              <button
                onClick={() => setCurrentView('inbox')}
                className="flex flex-col items-center focus:outline-none"
              >
                <div className="relative bg-[#1f382c] text-[#c2eed8] px-5 py-1 rounded-full flex items-center justify-center">
                  <Mail className="w-5 h-5" />
                  <span className="absolute -top-1 -right-1 bg-[#ba1a1a] text-white text-[9px] font-bold px-1 rounded-full leading-tight">
                    99+
                  </span>
                </div>
              </button>
              <button
                onClick={() => emitEvent('chat_rail_clicked', { notice: 'Mobile chat tab' })}
                className="p-2 text-[#8e938f] hover:text-[#c2c8c4] focus:outline-none"
              >
                <MessageSquare className="w-5 h-5" />
              </button>
              <button
                onClick={() => emitEvent('meet_rail_clicked', { notice: 'Mobile meet tab' })}
                className="p-2 text-[#8e938f] hover:text-[#c2c8c4] focus:outline-none"
              >
                <Video className="w-5 h-5" />
              </button>
            </nav>
          </div>
        ) : (
          /* =================================================================== */
          /* VIEW 1: MOBILE INBOX LIST VIEW (Screenshot 2)                       */
          /* =================================================================== */
          <div className="flex flex-col h-full w-full bg-[#111614] text-[#e1e3e0] overflow-hidden">
            {/* Search Pill Bar (Screenshot 2) */}
            <div className="px-3 pt-3 pb-2 shrink-0">
              <div className="bg-[#242c27] rounded-full px-4 py-2.5 flex items-center shadow-sm">
                <button
                  onClick={() => setMobileMenuOpen(true)}
                  aria-label="Main menu"
                  className="text-[#c2c8c4] hover:text-white mr-3 p-0.5"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <input
                  type="text"
                  placeholder="Search in mail"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none text-[#e1e3e0] placeholder-[#8e938f] text-sm flex-1 focus:outline-none"
                />
                <div className="w-7 h-7 rounded-full bg-[#5c3e38] text-white flex items-center justify-center text-xs font-semibold shrink-0 cursor-pointer">
                  {userProfile.avatar || userProfile.name?.charAt(0) || 'P'}
                </div>
              </div>
            </div>

            {/* Section Header */}
            <div className="px-5 py-1 text-xs font-medium text-[#8e938f]">
              Inbox
            </div>

            {/* Message List */}
            <div className="flex-1 overflow-y-auto divide-y divide-transparent pb-24">
              {filteredMessages.length === 0 ? (
                <div className="p-8 text-center text-[#8e938f]">
                  <p className="text-sm font-medium">No messages found</p>
                </div>
              ) : (
                filteredMessages.map((msg) => {
                  const isUnread = !readIds.has(msg.id) && (msg.isUnread ?? true);
                  const isStarred = starredIds.has(msg.id);

                  return (
                    <div
                      key={msg.id}
                      onClick={() => handleOpenEmail(msg)}
                      className="flex items-start px-4 py-3 gap-3.5 hover:bg-[#18211b] active:bg-[#1f2b23] cursor-pointer transition-colors"
                    >
                      {/* Avatar */}
                      <div
                        className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center font-bold text-sm ${
                          msg.sender?.avatarBg || 'bg-[#2f3832] text-[#c2c8c4]'
                        }`}
                      >
                        {msg.sender?.avatar || msg.sender?.name?.charAt(0) || 'U'}
                      </div>

                      {/* Content Column */}
                      <div className="flex-1 min-w-0">
                        {/* Sender & Timestamp */}
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-sm truncate ${
                              isUnread ? 'font-bold text-[#e1e3e0]' : 'font-normal text-[#c2c8c4]'
                            }`}
                          >
                            {msg.sender?.name || 'Sender'}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            <span
                              className={`text-xs ${
                                isUnread ? 'font-semibold text-[#8e938f]' : 'text-[#6e7470]'
                              }`}
                            >
                              {msg.timestamp || 'Today'}
                            </span>
                            {isUnread && (
                              <span className="w-2 h-2 rounded-full bg-[#6dd58c] shrink-0" />
                            )}
                          </div>
                        </div>

                        {/* Subject */}
                        <div
                          className={`text-xs sm:text-sm truncate mt-0.5 ${
                            isUnread ? 'font-bold text-[#e1e3e0]' : 'font-normal text-[#a6aca6]'
                          }`}
                        >
                          {msg.subject || '(no subject)'}
                        </div>

                        {/* Snippet + Star */}
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <p className="text-xs text-[#8e938f] truncate flex-1 leading-relaxed">
                            {msg.preview || msg.bodySnippet || msg.bodyText || ''}
                          </p>
                          <button
                            onClick={(e) => handleToggleStar(msg.id, e)}
                            aria-label={isStarred ? 'Starred' : 'Not starred'}
                            className="p-1 text-[#8e938f] hover:text-amber-400 shrink-0"
                          >
                            <Star
                              className={`w-4 h-4 ${
                                isStarred ? 'fill-[#e37400] text-[#e37400]' : 'text-[#8e938f]'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Floating Compose Button (FAB) (Screenshot 2) */}
            <div className="absolute bottom-20 right-4 z-20">
              <button
                onClick={() => setIsComposeOpen(true)}
                className="flex items-center gap-2 bg-[#004d40] hover:bg-[#005a4b] active:scale-95 text-[#c2eed8] px-4 py-3.5 rounded-2xl shadow-xl transition-all font-medium text-sm"
              >
                <Pen className="w-5 h-5" />
                <span>Compose</span>
              </button>
            </div>

            {/* Bottom Nav Bar (Persistent) */}
            <nav className="bg-[#131915] border-t border-[#202823] h-16 flex items-center justify-around shrink-0 z-20">
              <button
                onClick={() => setCurrentView('inbox')}
                className="flex flex-col items-center focus:outline-none"
              >
                <div className="relative bg-[#1f382c] text-[#c2eed8] px-5 py-1 rounded-full flex items-center justify-center">
                  <Mail className="w-5 h-5" />
                  <span className="absolute -top-1 -right-1 bg-[#ba1a1a] text-white text-[9px] font-bold px-1 rounded-full leading-tight">
                    99+
                  </span>
                </div>
              </button>
              <button
                onClick={() => emitEvent('chat_rail_clicked', { notice: 'Mobile chat tab' })}
                className="p-2 text-[#8e938f] hover:text-[#c2c8c4] focus:outline-none"
              >
                <MessageSquare className="w-5 h-5" />
              </button>
              <button
                onClick={() => emitEvent('meet_rail_clicked', { notice: 'Mobile meet tab' })}
                className="p-2 text-[#8e938f] hover:text-[#c2c8c4] focus:outline-none"
              >
                <Video className="w-5 h-5" />
              </button>
            </nav>
          </div>
        )}

        {/* Threat Reporting Modal in Mobile View */}
        {isReportModalOpen && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn"
          >
            <div className="bg-[#1d2521] text-[#e1e3e0] rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-[#2e3b33]">
              <div className="px-5 py-4 bg-[#261f20] border-b border-[#3b2a2b] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-900/60 text-red-400 flex items-center justify-center shrink-0">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#e1e3e0]">
                      Report Phishing Threat
                    </h3>
                    <p className="text-[11px] text-[#8e938f]">
                      Flag suspicious indicators
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsReportModalOpen(false)}
                  className="p-1 rounded-full text-[#8e938f] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-2.5 text-xs">
                <label className="flex items-start gap-2.5 p-2 rounded-lg bg-[#222c26] hover:bg-[#28352d] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reportIndicators.suspiciousSender}
                    onChange={(e) =>
                      setReportIndicators((prev) => ({
                        ...prev,
                        suspiciousSender: e.target.checked
                      }))
                    }
                    className="mt-0.5 rounded border-gray-600 text-red-600 focus:ring-0"
                  />
                  <span>Suspicious or spoofed sender address</span>
                </label>

                <label className="flex items-start gap-2.5 p-2 rounded-lg bg-[#222c26] hover:bg-[#28352d] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reportIndicators.urgentActionThreat}
                    onChange={(e) =>
                      setReportIndicators((prev) => ({
                        ...prev,
                        urgentActionThreat: e.target.checked
                      }))
                    }
                    className="mt-0.5 rounded border-gray-600 text-red-600 focus:ring-0"
                  />
                  <span>Artificial urgency or coercive language</span>
                </label>

                <label className="flex items-start gap-2.5 p-2 rounded-lg bg-[#222c26] hover:bg-[#28352d] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reportIndicators.credentialHarvestLink}
                    onChange={(e) =>
                      setReportIndicators((prev) => ({
                        ...prev,
                        credentialHarvestLink: e.target.checked
                      }))
                    }
                    className="mt-0.5 rounded border-gray-600 text-red-600 focus:ring-0"
                  />
                  <span>Suspicious link or credential harvesting prompt</span>
                </label>
              </div>

              <div className="px-4 py-3 bg-[#171f1a] border-t border-[#26322b] flex items-center justify-end gap-2">
                <button
                  onClick={() => setIsReportModalOpen(false)}
                  className="px-3 py-1.5 rounded-full text-xs text-[#8e938f] hover:text-white"
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

        {/* Terminal Overlay in Mobile View */}
        {isTerminal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
            <div className="bg-[#1a221d] text-[#e1e3e0] rounded-2xl shadow-2xl max-w-xs w-full p-5 text-center border border-[#2f3832]">
              <div className="w-10 h-10 bg-[#1c3829] text-[#71d99e] rounded-full flex items-center justify-center mx-auto mb-2.5">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h2 className="text-base font-bold mb-1.5">Simulation Concluded</h2>
              <p className="text-xs text-[#8e938f] mb-4">
                Telemetry and threat response recorded.
              </p>
              <button
                onClick={() => {
                  setIsTerminal(false);
                  emitEvent('scenario_completed', { status: 'concluded' });
                }}
                className="w-full bg-[#004d40] hover:bg-[#005a4b] text-[#c2eed8] py-2 rounded-xl text-xs font-semibold"
              >
                View Telemetry
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // DESKTOP GMAIL VIEW (Unchanged - Website View)
  // =========================================================================
  return (
    <div className="flex flex-col h-screen w-full bg-[#f6f8fc] text-[#1f1f1f] select-none overflow-hidden font-sans antialiased">
      {/* ============================================================== */}
      {/* 1. TOP HEADER (Gmail-inspired exact hierarchy) */}
      {/* ============================================================== */}
      <header className="h-16 flex items-center justify-between px-4 shrink-0 bg-[#f6f8fc] border-b border-transparent">
        {/* Left: Hamburger + Gmail Logo */}
        <div className="flex items-center gap-3 w-64 min-w-[200px]">
          <button
            onClick={() => setMobileMenuOpen(prev => !prev)}
            aria-label="Main menu"
            className="p-2.5 rounded-full hover:bg-black/5 active:bg-black/10 text-[#444746] transition-colors focus:outline-none"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div
            onClick={handleBackToInbox}
            className="flex items-center gap-2 cursor-pointer select-none"
            title="Gmail Simulation"
          >
            {/* Google's signature multi-color M */}
            <svg className="w-8 h-8" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M1.5 6.5v12a2 2 0 0 0 2 2h3.5v-10l5 4 5-4v10H20.5a2 2 0 0 0 2-2v-12l-10.5 7.5L1.5 6.5z"/>
              <path fill="#34A853" d="M17 10.5v10h3.5a2 2 0 0 0 2-2v-12l-5.5 4z"/>
              <path fill="#EA4335" d="M1.5 6.5l10.5 7.5 10.5-7.5-1.5-2.5a2 2 0 0 0-2-1H5a2 2 0 0 0-2 1l-1.5 2.5z"/>
              <path fill="#FBBC05" d="M1.5 6.5l5.5 4v-10H3.5a2 2 0 0 0-2 2v4z"/>
            </svg>
            <span className="text-[22px] font-normal text-[#444746] tracking-tight -mt-0.5">
              Gmail
            </span>
          </div>
        </div>

        {/* Center: Search Field */}
        <div className="flex-1 max-w-[720px] px-2">
          <div className="relative flex items-center bg-[#eaf1fb] hover:bg-[#e1e9f5] focus-within:bg-white focus-within:shadow-md focus-within:ring-1 focus-within:ring-gray-200 rounded-full px-4 py-2 transition-all duration-200">
            <button aria-label="Search" className="text-[#444746] mr-3 focus:outline-none">
              <Search className="w-5 h-5" />
            </button>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search mail"
              className="w-full bg-transparent border-none outline-none text-sm text-[#1f1f1f] placeholder-[#444746]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="p-1 hover:bg-black/5 rounded-full text-[#444746] mr-1"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              aria-label="Search options"
              className="p-1.5 hover:bg-black/5 rounded-full text-[#444746] transition-colors"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right: Status Pill, Help, Settings, Grid, Profile Avatar */}
        <div className="flex items-center gap-1 min-w-[280px] justify-end">
          {/* Active Status Indicator */}
          <div className="hidden sm:flex items-center px-3 py-1.5 rounded-full hover:bg-black/5 text-[#444746] text-xs font-medium cursor-pointer border border-transparent mr-1">
            <span className="w-2.5 h-2.5 bg-[#1e8e3e] rounded-full mr-2"></span>
            <span>Active</span>
            <ChevronDown className="w-3.5 h-3.5 ml-1 text-[#444746]" />
          </div>

          <button aria-label="Support & Help" className="p-2.5 rounded-full hover:bg-black/5 text-[#444746]">
            <HelpCircle className="w-5 h-5" />
          </button>
          <button aria-label="Settings" className="p-2.5 rounded-full hover:bg-black/5 text-[#444746]">
            <Settings className="w-5 h-5" />
          </button>
          <button aria-label="Google apps" className="p-2.5 rounded-full hover:bg-black/5 text-[#444746]">
            <Grid className="w-5 h-5" />
          </button>

          {/* Profile Badge (matching Screenshot 1: Pill with VIT institution and letter avatar) */}
          <div className="flex items-center border border-gray-300 rounded-full pl-3 pr-1 py-1 gap-2 bg-white hover:shadow-sm cursor-pointer ml-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-[#001d35] tracking-tight">
                {userProfile.institution || 'VIT'}
              </span>
            </div>
            <div className="w-7 h-7 rounded-full bg-[#5c3e38] text-white flex items-center justify-center text-xs font-semibold">
              {userProfile.avatar || userProfile.name?.charAt(0) || 'P'}
            </div>
          </div>
        </div>
      </header>

      {/* ============================================================== */}
      {/* 2. BODY LAYOUT (Left Rail, Sidebar, Main Message Panel, Right Rail) */}
      {/* ============================================================== */}
      <div className="flex flex-1 overflow-hidden pb-3 pr-2 gap-1">
        {/* Rail: Narrow Left Navigation (Mail, Chat, Meet) */}
        <nav
          aria-label="Application Rail"
          className="w-16 shrink-0 flex flex-col items-center py-2 gap-4 bg-[#f6f8fc] select-none"
        >
          {/* Mail tab (Active) */}
          <button
            onClick={() => setCurrentView('inbox')}
            className="flex flex-col items-center group focus:outline-none"
          >
            <div className="relative w-12 h-8 rounded-full bg-[#c2e7ff] text-[#001d35] flex items-center justify-center transition-all">
              <Mail className="w-5 h-5" />
              <span className="absolute -top-1.5 -right-1 bg-[#b3261e] text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full leading-tight shadow-xs">
                99+
              </span>
            </div>
            <span className="text-xs font-semibold text-[#001d35] mt-1">Mail</span>
          </button>

          {/* Chat tab */}
          <button
            onClick={() => emitEvent('chat_rail_clicked', { notice: 'Simulated external tab' })}
            className="flex flex-col items-center group focus:outline-none text-[#444746] hover:text-[#1f1f1f]"
          >
            <div className="w-12 h-8 rounded-full hover:bg-black/5 flex items-center justify-center transition-all">
              <MessageSquare className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium mt-1">Chat</span>
          </button>

          {/* Meet tab */}
          <button
            onClick={() => emitEvent('meet_rail_clicked', { notice: 'Simulated external tab' })}
            className="flex flex-col items-center group focus:outline-none text-[#444746] hover:text-[#1f1f1f]"
          >
            <div className="w-12 h-8 rounded-full hover:bg-black/5 flex items-center justify-center transition-all">
              <Video className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium mt-1">Meet</span>
          </button>
        </nav>

        {/* Sidebar: Compose & Folder Navigation */}
        <aside
          aria-label="Mail Folders"
          className={`${
            mobileMenuOpen ? 'fixed inset-y-0 left-0 z-40 bg-white w-64 shadow-2xl p-4' : 'hidden md:flex'
          } w-60 shrink-0 flex-col py-2 px-3 overflow-y-auto bg-[#f6f8fc] select-none`}
        >
          {/* Mobile close button */}
          {mobileMenuOpen && (
            <div className="flex justify-between items-center mb-4 md:hidden">
              <span className="font-semibold text-gray-700">Navigation</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Compose Button */}
          <button
            onClick={() => setIsComposeOpen(true)}
            className="flex items-center gap-3.5 bg-[#c2e7ff] hover:bg-[#b3dbf5] text-[#001d35] px-5 py-4 rounded-2xl font-medium text-sm shadow-sm hover:shadow transition-all mb-4 w-fit active:scale-95"
          >
            <Pen className="w-5 h-5" />
            <span>Compose</span>
          </button>

          {/* Folder List */}
          <div className="space-y-0.5 text-sm font-medium text-[#444746]">
            {/* Inbox Item */}
            <button
              onClick={() => {
                setCurrentView('inbox');
                if (mobileMenuOpen) setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center justify-between px-4 py-1.5 rounded-r-full -ml-3 transition-colors ${
                currentView === 'inbox'
                  ? 'bg-[#d3e3fd] text-[#041e49] font-bold'
                  : 'hover:bg-black/5 text-[#444746]'
              }`}
            >
              <div className="flex items-center gap-4">
                <Inbox className="w-4 h-4 text-[#041e49]" />
                <span>Inbox</span>
              </div>
              <span className="text-xs font-bold text-[#041e49]">
                {userProfile.unreadCount ? userProfile.unreadCount.toLocaleString() : '2,684'}
              </span>
            </button>

            {/* Starred */}
            <button
              onClick={() => {
                setSearchQuery('is:starred');
                if (mobileMenuOpen) setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-4 px-4 py-1.5 rounded-r-full -ml-3 hover:bg-black/5 text-[#444746]"
            >
              <Star className="w-4 h-4" />
              <span>Starred</span>
            </button>

            {/* Snoozed */}
            <button className="w-full flex items-center gap-4 px-4 py-1.5 rounded-r-full -ml-3 hover:bg-black/5 text-[#444746]">
              <Clock className="w-4 h-4" />
              <span>Snoozed</span>
            </button>

            {/* Sent */}
            <button className="w-full flex items-center gap-4 px-4 py-1.5 rounded-r-full -ml-3 hover:bg-black/5 text-[#444746]">
              <Send className="w-4 h-4" />
              <span>Sent</span>
            </button>

            {/* Drafts */}
            <button className="w-full flex items-center justify-between px-4 py-1.5 rounded-r-full -ml-3 hover:bg-black/5 text-[#444746]">
              <div className="flex items-center gap-4">
                <FileText className="w-4 h-4" />
                <span>Drafts</span>
              </div>
              <span className="text-xs text-[#444746]">4</span>
            </button>

            {/* Categories */}
            <div className="pt-2">
              <button className="w-full flex items-center gap-2 px-4 py-1.5 text-xs text-[#444746] hover:bg-black/5 rounded-r-full -ml-3">
                <ChevronDown className="w-3.5 h-3.5" />
                <Tag className="w-3.5 h-3.5" />
                <span>Categories</span>
              </button>
              <div className="pl-6 space-y-0.5 mt-0.5">
                <button className="w-full flex items-center justify-between px-3 py-1 text-xs text-[#444746] hover:bg-black/5 rounded-r-full">
                  <div className="flex items-center gap-3">
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Purchases</span>
                  </div>
                  <span>2</span>
                </button>
              </div>
            </div>

            {/* More */}
            <button className="w-full flex items-center gap-4 px-4 py-1.5 rounded-r-full -ml-3 hover:bg-black/5 text-[#444746]">
              <ChevronDown className="w-4 h-4" />
              <span>More</span>
            </button>
          </div>

          {/* Labels Section */}
          <div className="mt-6 pt-4 border-t border-gray-200/80">
            <div className="flex items-center justify-between px-3 mb-2 text-[#444746]">
              <span className="text-sm font-semibold">Labels</span>
              <button aria-label="Create label" className="p-1 hover:bg-black/5 rounded-full">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* ============================================================ */}
        {/* 3. MAIN CENTER CONTAINER: View A (Inbox) or View B (Email) */}
        {/* ============================================================ */}
        <main className="flex-1 flex flex-col bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-200/60 relative">
          {/* Top Banner Notice (Simulated Link Clicked or Threat Reported) */}
          {threatReportedConfirmed && (
            <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2.5 flex items-center justify-between text-xs sm:text-sm text-emerald-900 animate-fadeIn">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium">
                  Threat Reported: Security team notified. Incident logged in simulation telemetry.
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
            <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between text-xs sm:text-sm text-amber-900 animate-fadeIn">
              <div className="flex items-center gap-2 overflow-hidden">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="truncate">
                  <strong>Simulated Link Intercepted:</strong>{' '}
                  <code className="bg-amber-100 px-1 py-0.5 rounded text-xs">{linkNotice.url}</code>
                  {' '}&mdash; In a real attack, this would navigate to a malicious credential-harvesting server.
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

          {replySuccessMessage && (
            <div className="bg-blue-50 border-b border-blue-200 px-4 py-2.5 flex items-center justify-between text-xs sm:text-sm text-blue-900 animate-fadeIn">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-blue-600 shrink-0" />
                <span>{replySuccessMessage}</span>
              </div>
              <button
                onClick={() => setReplySuccessMessage(null)}
                className="text-blue-700 hover:text-blue-950 p-1 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* VIEW A: INBOX VIEW */}
          {currentView === 'inbox' && (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* Inbox Toolbar */}
              <div className="h-12 border-b border-gray-200/80 px-4 flex items-center justify-between text-[#444746] text-sm shrink-0">
                <div className="flex items-center gap-1 sm:gap-2">
                  <div className="flex items-center">
                    <button
                      onClick={handleSelectAllToggle}
                      className="p-1.5 hover:bg-black/5 rounded text-[#444746] focus:outline-none"
                      title={selectedIds.size === filteredMessages.length ? 'Deselect all' : 'Select all'}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.size > 0 && selectedIds.size === filteredMessages.length}
                        onChange={handleSelectAllToggle}
                        className="rounded border-gray-400 text-blue-600 focus:ring-0 cursor-pointer"
                      />
                    </button>
                    <button className="p-1 hover:bg-black/5 rounded text-[#444746]">
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setInboxList([...initialMessages]);
                      setSearchQuery('');
                      emitEvent('inbox_refreshed');
                    }}
                    title="Refresh"
                    className="p-2 hover:bg-black/5 rounded-full text-[#444746] transition-transform active:rotate-180"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  <div className="relative" ref={inboxMenuRef}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsInboxMenuOpen((prev) => !prev);
                      }}
                      title="More actions"
                      aria-label="More inbox actions"
                      aria-expanded={isInboxMenuOpen}
                      className={`p-2 hover:bg-black/5 rounded-full text-[#444746] transition-colors ${
                        isInboxMenuOpen ? 'bg-black/10' : ''
                      }`}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {isInboxMenuOpen && (
                      <div className="absolute left-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-xl py-1.5 z-50 text-xs text-[#1f1f1f] font-sans">
                        <button
                          onClick={() => {
                            setIsInboxMenuOpen(false);
                            setReadIds(new Set(inboxList.map((m) => m.id)));
                          }}
                          className="w-full flex items-center px-4 py-2 hover:bg-gray-100 text-left transition-colors"
                        >
                          <MailCheck className="w-4 h-4 text-gray-500 mr-3 shrink-0" />
                          <span>Mark all as read</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Pagination Controls */}
                <div className="flex items-center gap-2 text-xs text-[#444746]">
                  <span>
                    1&ndash;{filteredMessages.length} of {scenario.totalCount || '3,230'}
                  </span>
                  <div className="flex items-center">
                    <button
                      disabled
                      className="p-1.5 rounded-full hover:bg-black/5 disabled:opacity-40 text-[#444746]"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      className="p-1.5 rounded-full hover:bg-black/5 text-[#444746]"
                      onClick={() => emitEvent('pagination_clicked', { page: 2 })}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Message List */}
              <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                {filteredMessages.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">
                    <p className="text-base font-medium mb-1">No messages match your search.</p>
                    <p className="text-xs text-gray-400">Try searching with a different term or clear the filter.</p>
                  </div>
                ) : (
                  filteredMessages.map((msg) => {
                    const isSelected = selectedIds.has(msg.id);
                    const isStarred = starredIds.has(msg.id);
                    const isRead = readIds.has(msg.id) || !msg.isUnread;

                    return (
                      <div
                        key={msg.id}
                        onClick={() => handleOpenEmail(msg)}
                        className={`group flex items-center px-4 py-2 text-sm cursor-pointer border-b border-gray-100 transition-colors select-none ${
                          isSelected
                            ? 'bg-[#c2e7ff]/40'
                            : isRead
                            ? 'bg-[#f2f6fc]/40 hover:bg-[#f2f6fc] text-gray-700'
                            : 'bg-white hover:shadow-xs text-gray-950 font-semibold'
                        }`}
                      >
                        {/* Checkbox */}
                        <div
                          onClick={(e) => handleToggleSelect(msg.id, e)}
                          className="mr-3 text-[#444746] hover:text-[#1f1f1f] flex items-center"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleToggleSelect(msg.id, e)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-0 cursor-pointer"
                          />
                        </div>

                        {/* Star icon */}
                        <button
                          onClick={(e) => handleToggleStar(msg.id, e)}
                          aria-label={isStarred ? 'Starred' : 'Not starred'}
                          className="mr-3 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                        >
                          <Star
                            className={`w-4 h-4 ${
                              isStarred ? 'fill-[#e37400] text-[#e37400]' : 'text-gray-300'
                            }`}
                          />
                        </button>

                        {/* Sender Name */}
                        <div
                          className={`w-44 sm:w-48 shrink-0 truncate pr-3 text-sm ${
                            isRead ? 'font-normal text-gray-700' : 'font-bold text-gray-950'
                          }`}
                        >
                          {msg.sender?.name || 'Unknown Sender'}
                        </div>

                        {/* Subject + Snippet Preview */}
                        <div className="flex-1 min-w-0 flex items-center gap-1.5 truncate pr-4">
                          <span className={`truncate text-sm ${isRead ? 'font-normal text-gray-800' : 'font-bold text-gray-950'}`}>
                            {msg.subject || '(no subject)'}
                          </span>
                          <span className="text-[#5e5e5e] font-normal truncate text-xs sm:text-sm">
                            &ndash; {msg.preview || ''}
                          </span>

                          {/* PDF Chip / Attachment indicator if present */}
                          {msg.attachmentChip && (
                            <span className="inline-flex items-center gap-1 bg-gray-100 border border-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full ml-2 shrink-0">
                              <span className="w-2 h-2 rounded-xs bg-red-600"></span>
                              <span className="text-[11px] font-medium truncate max-w-[100px]">
                                {msg.attachmentChip.name}
                              </span>
                            </span>
                          )}

                          {msg.hasAttachment && (
                            <Paperclip className="w-3.5 h-3.5 text-gray-400 shrink-0 ml-1" />
                          )}
                        </div>

                        {/* Timestamp & Hover Quick Actions */}
                        <div className="shrink-0 text-right min-w-[70px]">
                          {/* Normal Timestamp */}
                          <span
                            className={`group-hover:hidden text-xs ${
                              isRead ? 'text-gray-500 font-normal' : 'text-gray-900 font-semibold'
                            }`}
                          >
                            {msg.timestamp || 'Today'}
                          </span>

                          {/* Hover action buttons (Gmail style) */}
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="hidden group-hover:flex items-center justify-end gap-1 text-[#444746]"
                          >
                            <button
                              title="Archive"
                              onClick={() => emitEvent('message_archived', { emailId: msg.id })}
                              className="p-1 hover:bg-black/10 rounded-full"
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                            <button
                              title="Delete"
                              onClick={() => emitEvent('message_deleted', { emailId: msg.id })}
                              className="p-1 hover:bg-black/10 rounded-full"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <button
                              title="Mark as unread"
                              onClick={() => {
                                setReadIds(prev => {
                                  const next = new Set(prev);
                                  next.delete(msg.id);
                                  return next;
                                });
                              }}
                              className="p-1 hover:bg-black/10 rounded-full"
                            >
                              <MailCheck className="w-4 h-4" />
                            </button>
                            <button
                              title="Snooze"
                              onClick={() => emitEvent('message_snoozed', { emailId: msg.id })}
                              className="p-1 hover:bg-black/10 rounded-full"
                            >
                              <Clock className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* VIEW B: OPENED EMAIL VIEW (Reproducing Screenshot 2 exact layout) */}
          {currentView === 'email' && activeEmail && (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* Message Toolbar */}
              <div className="h-12 border-b border-gray-200/80 px-4 flex items-center justify-between text-[#444746] text-sm shrink-0 bg-white">
                <div className="flex items-center gap-1 sm:gap-2">
                  {/* Back to Inbox */}
                  <button
                    onClick={handleBackToInbox}
                    title="Back to inbox"
                    className="p-2 hover:bg-black/5 rounded-full text-[#444746] mr-1"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <div className="h-4 w-px bg-gray-200 mx-1" />

                  {/* Archive */}
                  <button
                    onClick={handleArchiveEmail}
                    title="Archive"
                    className="p-2 hover:bg-black/5 rounded-full text-[#444746]"
                  >
                    <Archive className="w-4 h-4" />
                  </button>

                  {/* Report Spam / Phishing Threat */}
                  <button
                    onClick={() => setIsReportModalOpen(true)}
                    title="Report phishing or spam"
                    className="p-2 hover:bg-red-50 hover:text-red-600 rounded-full text-[#444746] transition-colors"
                  >
                    <AlertOctagon className="w-4 h-4" />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={handleDeleteEmail}
                    title="Delete"
                    className="p-2 hover:bg-black/5 rounded-full text-[#444746]"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="h-4 w-px bg-gray-200 mx-1" />

                  {/* Mark Unread */}
                  <button
                    onClick={() => {
                      setReadIds(prev => {
                        const next = new Set(prev);
                        next.delete(activeEmail.id);
                        return next;
                      });
                      handleBackToInbox();
                    }}
                    title="Mark unread"
                    className="p-2 hover:bg-black/5 rounded-full text-[#444746]"
                  >
                    <MailCheck className="w-4 h-4" />
                  </button>

                  {/* Snooze */}
                  <button
                    onClick={() => emitEvent('message_snoozed', { emailId: activeEmail.id })}
                    title="Snooze"
                    className="p-2 hover:bg-black/5 rounded-full text-[#444746]"
                  >
                    <Clock className="w-4 h-4" />
                  </button>

                  {/* Add Task */}
                  <button
                    onClick={() => emitEvent('added_to_tasks', { emailId: activeEmail.id })}
                    title="Add to tasks"
                    className="p-2 hover:bg-black/5 rounded-full text-[#444746]"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>

                  {/* Move to folder */}
                  <button
                    onClick={() => emitEvent('move_to_clicked', { emailId: activeEmail.id })}
                    title="Move to"
                    className="p-2 hover:bg-black/5 rounded-full text-[#444746]"
                  >
                    <FolderInput className="w-4 h-4" />
                  </button>

                  {/* Labels */}
                  <button
                    onClick={() => emitEvent('labels_clicked', { emailId: activeEmail.id })}
                    title="Labels"
                    className="p-2 hover:bg-black/5 rounded-full text-[#444746]"
                  >
                    <Tag className="w-4 h-4" />
                  </button>

                  {/* More actions dropdown in opened email top toolbar */}
                  <div className="relative" ref={toolbarMenuRef}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsToolbarMenuOpen((prev) => !prev);
                      }}
                      title="More actions"
                      aria-label="More toolbar options"
                      aria-expanded={isToolbarMenuOpen}
                      data-testid="toolbar-more-button"
                      className={`p-2 hover:bg-black/5 rounded-full text-[#444746] transition-colors ${
                        isToolbarMenuOpen ? 'bg-black/10' : ''
                      }`}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {isToolbarMenuOpen && (
                      <div
                        data-testid="toolbar-more-menu"
                        className="absolute left-0 sm:left-auto sm:right-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-2xl py-1.5 z-50 text-xs text-[#1f1f1f] font-sans"
                      >
                        <button
                          onClick={() => {
                            setIsToolbarMenuOpen(false);
                            setReadIds((prev) => {
                              const next = new Set(prev);
                              next.delete(activeEmail.id);
                              return next;
                            });
                            handleBackToInbox();
                          }}
                          className="w-full flex items-center px-4 py-2 hover:bg-gray-100 text-left transition-colors"
                        >
                          <Mail className="w-4 h-4 text-gray-500 mr-3 shrink-0" />
                          <span>Mark as unread</span>
                        </button>

                        <button
                          onClick={() => {
                            setIsToolbarMenuOpen(false);
                            handleDeleteEmail();
                          }}
                          className="w-full flex items-center px-4 py-2 hover:bg-gray-100 text-left transition-colors text-gray-900"
                        >
                          <Trash2 className="w-4 h-4 text-gray-500 mr-3 shrink-0" />
                          <span>Delete message</span>
                        </button>

                        <div className="border-t border-gray-100 my-1" />

                        {/* 1) Block Sender (Positive Termination) */}
                        <button
                          onClick={() => {
                            setIsToolbarMenuOpen(false);
                            handleBlockSender();
                          }}
                          className="w-full flex items-center px-4 py-2 hover:bg-gray-100 text-left transition-colors text-gray-900 font-medium"
                        >
                          <Ban className="w-4 h-4 text-gray-600 mr-3 shrink-0" />
                          <span className="truncate">
                            Block &ldquo;{activeEmail.sender?.email || activeEmail.sender?.name || 'Sender'}&rdquo;
                          </span>
                        </button>

                        {/* 2) Report Spam (Positive Termination) */}
                        <button
                          onClick={() => {
                            setIsToolbarMenuOpen(false);
                            handleReportSpam();
                          }}
                          className="w-full flex items-center px-4 py-2 hover:bg-gray-100 text-left transition-colors text-gray-900 font-medium"
                        >
                          <AlertCircle className="w-4 h-4 text-amber-600 mr-3 shrink-0" />
                          <span>Report spam</span>
                        </button>

                        {/* 3) Report Phishing (Positive Termination) */}
                        <button
                          onClick={() => {
                            setIsToolbarMenuOpen(false);
                            handleReportPhishing();
                          }}
                          className="w-full flex items-center px-4 py-2 hover:bg-gray-100 text-left transition-colors text-red-600 font-medium"
                        >
                          <AlertOctagon className="w-4 h-4 text-red-600 mr-3 shrink-0" />
                          <span>Report phishing</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right pagination */}
                <div className="flex items-center gap-2 text-xs text-[#444746]">
                  <span>4 of 3,230</span>
                  <div className="flex items-center">
                    <button className="p-1.5 rounded-full hover:bg-black/5 text-[#444746]">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 rounded-full hover:bg-black/5 text-[#444746]">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Email Scrollable View Area */}
              <div className="flex-1 overflow-y-auto px-6 lg:px-10 py-6 max-w-5xl">
                {/* Email Subject Header */}
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div className="flex items-center flex-wrap gap-2.5">
                    <h1 className="text-xl sm:text-2xl font-normal text-gray-900 tracking-tight">
                      {activeEmail.subject || '(no subject)'}
                    </h1>

                    {/* Scenario Labels */}
                    {(activeEmail.labels || ['Inbox']).map((lbl, idx) => {
                      const isExternal = lbl.toLowerCase() === 'external';
                      return (
                        <span
                          key={idx}
                          className={`text-xs px-2 py-0.5 rounded font-medium ${
                            isExternal
                              ? 'bg-[#feefe3] text-[#b06000] border border-[#f9ab00]'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {lbl}
                        </span>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-1 shrink-0 text-[#444746]">
                    <button title="Print all" className="p-1.5 hover:bg-black/5 rounded-full">
                      <Printer className="w-4 h-4" />
                    </button>
                    <button title="In new window" className="p-1.5 hover:bg-black/5 rounded-full">
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Sender Information Card */}
                <div className="flex items-start justify-between gap-3 mb-6">
                  <div className="flex items-start gap-3">
                    {/* Sender Avatar */}
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm ${
                        activeEmail.sender?.avatarBg || 'bg-red-700 text-white'
                      }`}
                    >
                      {activeEmail.sender?.avatar || activeEmail.sender?.name?.charAt(0) || 'V'}
                    </div>

                    {/* Sender Name & To info */}
                    <div>
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="font-bold text-sm text-gray-950">
                          {activeEmail.sender?.name || 'VIT Events'}
                        </span>
                        <span className="text-xs text-[#5e5e5e]">
                          &lt;{activeEmail.sender?.email || 'events-security@vit-update.ac.in'}&gt;
                        </span>
                      </div>

                      {/* Recipient Dropdown Toggle ("to me ▾") */}
                      <div className="relative inline-block mt-0.5">
                        <button
                          onClick={() => setShowSecurityDetails(prev => !prev)}
                          className="flex items-center text-xs text-[#5e5e5e] hover:text-[#1f1f1f] focus:outline-none"
                        >
                          <span>to me</span>
                          <ChevronDown className="w-3.5 h-3.5 ml-0.5 text-gray-400" />
                        </button>

                        {/* Security Details Card (Key for trainee phishing header inspection) */}
                        {showSecurityDetails && (
                          <div className="absolute top-6 left-0 z-30 w-80 sm:w-96 p-4 bg-white rounded-xl shadow-xl border border-gray-200 text-xs text-gray-700 font-normal animate-fadeIn">
                            <div className="space-y-1.5">
                              <div className="flex">
                                <span className="w-20 text-gray-400">from:</span>
                                <span className="font-medium text-gray-900 break-all">
                                  {activeEmail.securityDetails?.from || activeEmail.sender?.email}
                                </span>
                              </div>
                              <div className="flex">
                                <span className="w-20 text-gray-400">reply-to:</span>
                                <span className="text-gray-800 break-all">
                                  {activeEmail.securityDetails?.replyTo || 'helpdesk-reply@vit-update.ac.in'}
                                </span>
                              </div>
                              <div className="flex">
                                <span className="w-20 text-gray-400">to:</span>
                                <span className="text-gray-800 break-all">
                                  {activeEmail.securityDetails?.to || userProfile.email}
                                </span>
                              </div>
                              <div className="flex">
                                <span className="w-20 text-gray-400">date:</span>
                                <span className="text-gray-800">
                                  {activeEmail.securityDetails?.date || activeEmail.fullTimestamp || 'Oct 18, 2026'}
                                </span>
                              </div>
                              <div className="flex">
                                <span className="w-20 text-gray-400">subject:</span>
                                <span className="text-gray-800">{activeEmail.subject}</span>
                              </div>
                              <div className="flex">
                                <span className="w-20 text-gray-400">mailed-by:</span>
                                <span className="text-red-700 font-mono bg-red-50 px-1 rounded">
                                  {activeEmail.securityDetails?.mailedBy || 'unverified-mail-server.com'}
                                </span>
                              </div>
                              <div className="flex">
                                <span className="w-20 text-gray-400">signed-by:</span>
                                <span className="text-gray-800 font-mono">
                                  {activeEmail.securityDetails?.signedBy || 'vit-update.ac.in'}
                                </span>
                              </div>
                              <div className="flex">
                                <span className="w-20 text-gray-400">security:</span>
                                <span className="text-gray-800">
                                  {activeEmail.securityDetails?.security || 'Standard encryption (TLS)'}
                                </span>
                              </div>
                              {activeEmail.securityDetails?.spf && (
                                <div className="flex">
                                  <span className="w-20 text-gray-400">SPF check:</span>
                                  <span className="text-amber-800 font-semibold bg-amber-50 px-1 rounded">
                                    {activeEmail.securityDetails.spf}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Header right: Timestamp, Star, Emoji, Reply, More */}
                  <div className="flex items-center gap-1 sm:gap-2 text-[#444746] shrink-0">
                    <span className="text-xs text-[#5e5e5e] mr-1 hidden sm:inline">
                      {activeEmail.fullTimestamp || activeEmail.timestamp || 'Oct 18, 2026, 9:24 AM'}
                    </span>

                    <button
                      onClick={(e) => handleToggleStar(activeEmail.id, e)}
                      aria-label="Star"
                      className="p-1.5 hover:bg-black/5 rounded-full"
                    >
                      <Star
                        className={`w-4 h-4 ${
                          starredIds.has(activeEmail.id)
                            ? 'fill-[#e37400] text-[#e37400]'
                            : 'text-gray-400'
                        }`}
                      />
                    </button>

                    <button title="Add reaction" className="p-1.5 hover:bg-black/5 rounded-full">
                      <Smile className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setIsReplying(true)}
                      title="Reply"
                      className="p-1.5 hover:bg-black/5 rounded-full"
                    >
                      <CornerUpLeft className="w-4 h-4" />
                    </button>

                    {/* 3-dot More options dropdown */}
                    <div className="relative" ref={messageMenuRef}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsMessageMenuOpen((prev) => !prev);
                        }}
                        title="More options"
                        aria-label="More options"
                        aria-expanded={isMessageMenuOpen}
                        data-testid="message-more-button"
                        className={`p-1.5 hover:bg-black/5 rounded-full transition-colors ${
                          isMessageMenuOpen ? 'bg-black/10' : ''
                        }`}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {isMessageMenuOpen && (
                        <div
                          data-testid="message-more-menu"
                          className="absolute right-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-2xl py-1.5 z-50 text-xs text-[#1f1f1f] font-sans"
                        >
                          <button
                            onClick={() => {
                              setIsMessageMenuOpen(false);
                              setIsReplying(true);
                            }}
                            className="w-full flex items-center px-4 py-2 hover:bg-gray-100 text-left transition-colors"
                          >
                            <CornerUpLeft className="w-4 h-4 text-gray-500 mr-3 shrink-0" />
                            <span>Reply</span>
                          </button>
                          <button
                            onClick={() => {
                              setIsMessageMenuOpen(false);
                              emitEvent('forward_clicked', { emailId: activeEmail.id });
                            }}
                            className="w-full flex items-center px-4 py-2 hover:bg-gray-100 text-left transition-colors"
                          >
                            <CornerUpRight className="w-4 h-4 text-gray-500 mr-3 shrink-0" />
                            <span>Forward</span>
                          </button>

                          <div className="border-t border-gray-100 my-1" />

                          <button
                            onClick={handleDeleteEmail}
                            className="w-full flex items-center px-4 py-2 hover:bg-gray-100 text-left transition-colors text-gray-900"
                          >
                            <Trash2 className="w-4 h-4 text-gray-500 mr-3 shrink-0" />
                            <span>Delete message</span>
                          </button>
                          <button
                            onClick={() => {
                              setIsMessageMenuOpen(false);
                              setReadIds((prev) => {
                                const next = new Set(prev);
                                next.delete(activeEmail.id);
                                return next;
                              });
                            }}
                            className="w-full flex items-center px-4 py-2 hover:bg-gray-100 text-left transition-colors"
                          >
                            <Mail className="w-4 h-4 text-gray-500 mr-3 shrink-0" />
                            <span>Mark as unread</span>
                          </button>

                          <div className="border-t border-gray-100 my-1" />

                          {/* 1) Block Sender (Positive Termination) */}
                          <button
                            onClick={handleBlockSender}
                            className="w-full flex items-center px-4 py-2 hover:bg-gray-100 text-left transition-colors text-gray-900 font-medium"
                          >
                            <Ban className="w-4 h-4 text-gray-600 mr-3 shrink-0" />
                            <span className="truncate">
                              Block &ldquo;{activeEmail.sender?.email || activeEmail.sender?.name || 'Sender'}&rdquo;
                            </span>
                          </button>

                          {/* 2) Report Spam (Positive Termination) */}
                          <button
                            onClick={handleReportSpam}
                            className="w-full flex items-center px-4 py-2 hover:bg-gray-100 text-left transition-colors text-gray-900 font-medium"
                          >
                            <AlertCircle className="w-4 h-4 text-amber-600 mr-3 shrink-0" />
                            <span>Report spam</span>
                          </button>

                          {/* 3) Report Phishing (Positive Termination) */}
                          <button
                            onClick={handleReportPhishing}
                            className="w-full flex items-center px-4 py-2 hover:bg-gray-100 text-left transition-colors text-red-600 font-medium"
                          >
                            <ShieldAlert className="w-4 h-4 text-red-500 mr-3 shrink-0" />
                            <span>Report phishing</span>
                          </button>

                          <div className="border-t border-gray-100 my-1" />

                          <button
                            onClick={() => {
                              setIsMessageMenuOpen(false);
                              emitEvent('labels_clicked', { emailId: activeEmail.id });
                            }}
                            className="w-full flex items-center px-4 py-2 hover:bg-gray-100 text-left transition-colors text-gray-600"
                          >
                            <SlidersHorizontal className="w-4 h-4 text-gray-400 mr-3 shrink-0" />
                            <span>Filter messages like this</span>
                          </button>
                          <button
                            onClick={() => {
                              setIsMessageMenuOpen(false);
                              window.print();
                            }}
                            className="w-full flex items-center px-4 py-2 hover:bg-gray-100 text-left transition-colors text-gray-600"
                          >
                            <Printer className="w-4 h-4 text-gray-400 mr-3 shrink-0" />
                            <span>Print</span>
                          </button>
                          <button
                            onClick={() => {
                              setIsMessageMenuOpen(false);
                              emitEvent('download_message', { emailId: activeEmail.id });
                            }}
                            className="w-full flex items-center px-4 py-2 hover:bg-gray-100 text-left transition-colors text-gray-600"
                          >
                            <Download className="w-4 h-4 text-gray-400 mr-3 shrink-0" />
                            <span>Download message</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* EMAIL BODY CONTENT (Safely rendered content blocks without dangerouslySetInnerHTML) */}
                <div className="text-sm text-gray-800 leading-relaxed space-y-4 pl-0 sm:pl-13 pb-8">
                  {/* If structured contentBlocks are provided */}
                  {Array.isArray(activeEmail.contentBlocks) ? (
                    activeEmail.contentBlocks.map((block, idx) => {
                      switch (block.type) {
                        case 'paragraph':
                          return (
                            <p key={idx} className="text-gray-800">
                              {block.text}
                            </p>
                          );

                        case 'alert':
                          return (
                            <div
                              key={idx}
                              className={`p-4 rounded-xl border flex items-start gap-3 my-3 ${
                                block.level === 'warning'
                                  ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                                  : 'bg-blue-50 border-blue-200 text-blue-900'
                              }`}
                            >
                              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                              <div className="text-xs sm:text-sm">
                                {block.title && <div className="font-bold mb-1">{block.title}</div>}
                                <div>{block.text}</div>
                              </div>
                            </div>
                          );

                        case 'button':
                          return (
                            <div key={idx} className="my-4">
                              <button
                                onClick={(e) => handleSimulatedAction(e, block)}
                                className="inline-flex items-center gap-2 bg-[#0b57d0] hover:bg-[#0842a0] text-white px-6 py-2.5 rounded-full font-medium text-sm shadow-sm hover:shadow transition-all active:scale-98"
                              >
                                <span>{block.text || 'Action Required'}</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );

                        case 'link':
                          return (
                            <div key={idx} className="my-2">
                              <a
                                href={block.url || '#'}
                                onClick={(e) => handleSimulatedAction(e, block)}
                                className="text-[#0b57d0] hover:underline font-mono text-xs sm:text-sm break-all inline-flex items-center gap-1"
                              >
                                <span>{block.text || block.url}</span>
                                <ExternalLink className="w-3 h-3 shrink-0" />
                              </a>
                            </div>
                          );

                        case 'quote':
                          return (
                            <blockquote
                              key={idx}
                              className="pl-4 border-l-3 border-gray-300 italic text-gray-600 text-xs my-2"
                            >
                              {block.text}
                            </blockquote>
                          );

                        case 'signature':
                          return (
                            <div key={idx} className="pt-4 border-t border-gray-200 text-xs text-gray-600 whitespace-pre-line">
                              {block.text}
                            </div>
                          );

                        default:
                          return (
                            <p key={idx} className="text-gray-800">
                              {block.text || JSON.stringify(block)}
                            </p>
                          );
                      }
                    })
                  ) : (
                    /* Fallback if body is simple string or array of strings */
                    <div className="space-y-3">
                      {typeof activeEmail.body === 'string'
                        ? activeEmail.body.split('\n\n').map((para, i) => (
                            <p key={i} className="text-gray-800">
                              {para}
                            </p>
                          ))
                        : (
                            <p className="text-gray-800">
                              {activeEmail.preview || 'No email content provided.'}
                            </p>
                          )}
                    </div>
                  )}

                  {/* Attachment Cards (if attachments exist) */}
                  {Array.isArray(activeEmail.attachments) && activeEmail.attachments.length > 0 && (
                    <div className="pt-6 border-t border-gray-200 mt-6">
                      <div className="text-xs font-semibold text-gray-500 mb-3 flex items-center gap-1.5">
                        <Paperclip className="w-3.5 h-3.5" />
                        <span>{activeEmail.attachments.length} Attachment</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
                        {activeEmail.attachments.map((att) => (
                          <div
                            key={att.id}
                            className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-gray-50/50 hover:bg-gray-100/80 transition-colors"
                          >
                            <div className="flex items-center gap-2.5 truncate mr-2">
                              <div className="w-8 h-8 rounded bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                                <FileIcon className="w-4 h-4" />
                              </div>
                              <div className="truncate">
                                <div className="text-xs font-medium text-gray-900 truncate">
                                  {att.name}
                                </div>
                                <div className="text-[10px] text-gray-500">{att.size}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={(e) => handleSimulatedAction(e, { id: att.id, text: `Download ${att.name}`, url: att.url || 'attachment://' + att.name })}
                                title="Download attachment"
                                className="p-1.5 hover:bg-gray-200 rounded text-gray-600"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Action Controls (Reply, Forward) */}
                {!isReplying && (
                  <div className="flex items-center gap-3 pl-0 sm:pl-13 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => setIsReplying(true)}
                      className="inline-flex items-center gap-2 px-6 py-2 rounded-full border border-gray-300 hover:bg-gray-50 text-xs sm:text-sm font-medium text-[#444746] transition-colors"
                    >
                      <CornerUpLeft className="w-4 h-4" />
                      <span>Reply</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsReplying(true);
                        emitEvent('forward_clicked', { emailId: activeEmail.id });
                      }}
                      className="inline-flex items-center gap-2 px-6 py-2 rounded-full border border-gray-300 hover:bg-gray-50 text-xs sm:text-sm font-medium text-[#444746] transition-colors"
                    >
                      <CornerUpRight className="w-4 h-4" />
                      <span>Forward</span>
                    </button>
                  </div>
                )}

                {/* Inline Reply Composer */}
                {isReplying && (
                  <div className="pl-0 sm:pl-13 mt-6 animate-fadeIn">
                    <div className="border border-gray-300 rounded-xl bg-white shadow-sm overflow-hidden">
                      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between text-xs text-gray-600">
                        <div className="flex items-center gap-2">
                          <CornerUpLeft className="w-4 h-4 text-gray-500" />
                          <span>
                            Reply to <strong>{activeEmail.sender?.name || 'Sender'}</strong> ({activeEmail.sender?.email})
                          </span>
                        </div>
                        <button
                          onClick={() => setIsReplying(false)}
                          className="p-1 hover:bg-gray-200 rounded text-gray-500"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="p-3">
                        <textarea
                          rows={4}
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Type your reply here... (Simulation mode: No actual message will be transmitted)"
                          className="w-full border-none outline-none text-sm text-gray-800 placeholder-gray-400 resize-none font-sans"
                        />
                      </div>

                      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                        <button
                          onClick={handleSendReply}
                          disabled={!replyText.trim() || isSubmittingReply}
                          className="inline-flex items-center gap-2 bg-[#0b57d0] hover:bg-[#0842a0] disabled:bg-gray-300 text-white px-5 py-2 rounded-full text-xs font-semibold shadow-xs transition-colors"
                        >
                          <span>{isSubmittingReply ? 'Analyzing...' : 'Send'}</span>
                        </button>

                        <div className="flex items-center gap-2 text-gray-500">
                          <span className="text-[11px] text-gray-400 italic">
                            Simulated reply event will be logged
                          </span>
                          <button
                            onClick={() => {
                              setReplyText('');
                              setIsReplying(false);
                            }}
                            className="p-1.5 hover:bg-gray-200 rounded text-gray-500"
                            title="Discard draft"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        {/* Right Rail: Google Workspace Quick Access (Calendar, Keep, Tasks, Contacts) */}
        <aside
          aria-label="Workspace Tools"
          className="hidden xl:flex w-14 shrink-0 flex-col items-center py-4 gap-6 bg-[#f6f8fc] border-l border-transparent select-none text-gray-600"
        >
          {/* Calendar */}
          <button
            title="Calendar"
            onClick={() => emitEvent('side_tool_clicked', { tool: 'calendar' })}
            className="w-8 h-8 rounded-full hover:bg-black/5 flex items-center justify-center transition-colors"
          >
            <div className="w-5 h-5 bg-[#1a73e8] text-white rounded text-[10px] font-bold flex items-center justify-center">
              31
            </div>
          </button>

          {/* Keep */}
          <button
            title="Keep"
            onClick={() => emitEvent('side_tool_clicked', { tool: 'keep' })}
            className="w-8 h-8 rounded-full hover:bg-black/5 flex items-center justify-center transition-colors"
          >
            <div className="w-5 h-5 bg-[#fbbc04] text-white rounded-full flex items-center justify-center text-[10px]">
              💡
            </div>
          </button>

          {/* Tasks */}
          <button
            title="Tasks"
            onClick={() => emitEvent('side_tool_clicked', { tool: 'tasks' })}
            className="w-8 h-8 rounded-full hover:bg-black/5 flex items-center justify-center transition-colors"
          >
            <div className="w-5 h-5 bg-[#1a73e8] text-white rounded-full flex items-center justify-center text-[10px]">
              ✓
            </div>
          </button>

          {/* Contacts */}
          <button
            title="Contacts"
            onClick={() => emitEvent('side_tool_clicked', { tool: 'contacts' })}
            className="w-8 h-8 rounded-full hover:bg-black/5 flex items-center justify-center transition-colors"
          >
            <div className="w-5 h-5 bg-[#1a73e8] text-white rounded-full flex items-center justify-center text-[10px]">
              👤
            </div>
          </button>

          <div className="w-4 h-px bg-gray-300 my-1" />

          {/* Plus Add-ons */}
          <button
            title="Get Add-ons"
            className="w-8 h-8 rounded-full hover:bg-black/5 flex items-center justify-center text-gray-500"
          >
            <Plus className="w-4 h-4" />
          </button>
        </aside>
      </div>

      {/* ============================================================== */}
      {/* 4. THREAT REPORTING MODAL (Critical awareness training workflow) */}
      {/* ============================================================== */}
      {isReportModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fadeIn"
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-200">
            {/* Modal Header */}
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
                    Confirm suspicious indicators in this email
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

            {/* Modal Body: Indicator Selection */}
            <div className="p-6 space-y-4">
              <p className="text-xs text-gray-600 leading-normal">
                Reporting this email will log your detection telemetry and notify the automated awareness evaluation system. Select any indicators you detected:
              </p>

              <div className="space-y-2.5 text-xs text-gray-800">
                <label className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-gray-50 cursor-pointer border border-gray-100">
                  <input
                    type="checkbox"
                    checked={reportIndicators.suspiciousSender}
                    onChange={(e) =>
                      setReportIndicators(prev => ({ ...prev, suspiciousSender: e.target.checked }))
                    }
                    className="mt-0.5 rounded text-red-600 focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <span className="font-semibold text-gray-900 block">
                      Suspicious Sender Address or Domain
                    </span>
                    <span className="text-gray-500 text-[11px]">
                      Sender domain differs from official institution domain (e.g., <code>vit-update.ac.in</code>)
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-gray-50 cursor-pointer border border-gray-100">
                  <input
                    type="checkbox"
                    checked={reportIndicators.urgentActionThreat}
                    onChange={(e) =>
                      setReportIndicators(prev => ({ ...prev, urgentActionThreat: e.target.checked }))
                    }
                    className="mt-0.5 rounded text-red-600 focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <span className="font-semibold text-gray-900 block">
                      Artificial Urgency / Account Suspension Threat
                    </span>
                    <span className="text-gray-500 text-[11px]">
                      Imposes short deadline (&lt;24 hours) with severe consequences
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-gray-50 cursor-pointer border border-gray-100">
                  <input
                    type="checkbox"
                    checked={reportIndicators.credentialHarvestLink}
                    onChange={(e) =>
                      setReportIndicators(prev => ({ ...prev, credentialHarvestLink: e.target.checked }))
                    }
                    className="mt-0.5 rounded text-red-600 focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <span className="font-semibold text-gray-900 block">
                      Phishing / Credential Harvesting Link
                    </span>
                    <span className="text-gray-500 text-[11px]">
                      Calls to action redirect to external lookalike portal
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-gray-50 cursor-pointer border border-gray-100">
                  <input
                    type="checkbox"
                    checked={reportIndicators.anomalousHeader}
                    onChange={(e) =>
                      setReportIndicators(prev => ({ ...prev, anomalousHeader: e.target.checked }))
                    }
                    className="mt-0.5 rounded text-red-600 focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <span className="font-semibold text-gray-900 block">
                      Failed Routing / SPF Authentication
                    </span>
                    <span className="text-gray-500 text-[11px]">
                      Email authentication headers indicate unverified mail server
                    </span>
                  </div>
                </label>
              </div>

              {/* Optional notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Additional Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={reportNotes}
                  onChange={(e) => setReportNotes(e.target.value)}
                  placeholder="Describe anything else that caught your attention..."
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-lg outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 resize-none"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-200/60 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReport}
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
      {/* 5. FLOATING COMPOSE WINDOW (Gmail bottom-right compose dialog) */}
      {/* ============================================================== */}
      {isComposeOpen && (
        <div
          role="region"
          aria-label="Compose new message"
          className="fixed bottom-0 right-4 z-40 w-96 sm:w-[500px] bg-white rounded-t-xl shadow-2xl border border-gray-300 flex flex-col overflow-hidden animate-slideUp"
        >
          {/* Window Header */}
          <div className="h-10 bg-[#f2f6fc] px-4 flex items-center justify-between text-xs font-semibold text-gray-800 border-b border-gray-200">
            <span>New Message (Simulated)</span>
            <div className="flex items-center gap-2 text-gray-500">
              <button
                onClick={() => setIsComposeOpen(false)}
                className="p-1 hover:bg-gray-200 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Form Fields */}
          <div className="p-3 space-y-2 text-xs">
            {composeStatus && (
              <div className="p-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-center">
                {composeStatus}
              </div>
            )}
            <input
              type="text"
              value={composeTo}
              onChange={(e) => setComposeTo(e.target.value)}
              placeholder="Recipients"
              className="w-full border-b border-gray-200 pb-1 outline-none text-xs text-gray-800 placeholder-gray-400"
            />
            <input
              type="text"
              value={composeSubject}
              onChange={(e) => setComposeSubject(e.target.value)}
              placeholder="Subject"
              className="w-full border-b border-gray-200 pb-1 outline-none text-xs text-gray-800 placeholder-gray-400"
            />
            <textarea
              rows={6}
              value={composeBody}
              onChange={(e) => setComposeBody(e.target.value)}
              placeholder="Compose your simulated email..."
              className="w-full border-none outline-none text-xs text-gray-800 placeholder-gray-400 resize-none pt-2"
            />
          </div>

          {/* Footer with Send */}
          <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <button
              onClick={handleSendCompose}
              className="bg-[#0b57d0] hover:bg-[#0842a0] text-white px-5 py-1.5 rounded-full text-xs font-semibold shadow-xs"
            >
              Send
            </button>
            <button
              onClick={() => {
                setIsComposeOpen(false);
                setComposeTo('');
                setComposeSubject('');
                setComposeBody('');
              }}
              className="p-1.5 hover:bg-gray-200 rounded text-gray-500"
              title="Discard draft"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 6. SIMULATION TERMINAL STATE OVERLAY (When completed by controller) */}
      {/* ============================================================== */}
      {isTerminal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center border border-gray-200">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              Email Simulation Concluded
            </h2>
            <p className="text-xs text-gray-600 mb-6 leading-relaxed">
              The interaction period for this email scenario has been finalized by the simulation controller. All telemetry and threat metrics were captured.
            </p>
            <button
              onClick={() => {
                setIsTerminal(false);
                emitEvent('scenario_completed', { status: 'concluded' });
              }}
              className="w-full bg-[#0b57d0] hover:bg-[#0842a0] text-white py-2.5 rounded-xl text-xs font-semibold shadow-sm transition-colors"
            >
              Review Simulation Telemetry
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
