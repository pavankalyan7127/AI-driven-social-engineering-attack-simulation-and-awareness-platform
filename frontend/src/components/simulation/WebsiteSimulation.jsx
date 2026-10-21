import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Lock,
  LockOpen,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  MoreVertical,
  X,
  ExternalLink,
  Globe,
  Plus,
  Check,
  FileText,
  Download,
  Info,
  ChevronRight,
  CheckCircle2,
  SlidersHorizontal,
  Star,
  Puzzle,
  Shield,
  Minus,
  Square,
  Sparkles,
  Camera,
  Folder,
  Eye,
  EyeOff,
  Bookmark,
  Printer,
  History,
  Settings,
  HelpCircle,
  Flag,
  MessageSquare
} from 'lucide-react';

/**
 * WebsiteSimulation Component
 * 
 * 100% Real Google Chrome Browser Replication (Pixel-Perfect Chrome Skin).
 * Reproduces:
 * - Chrome dark title bar with curved tabs, favicon, Ask Gemini button, and window controls.
 * - Chrome Omnibox toolbar with Back, Forward, Reload, "Not secure" / padlock SSL chip, URL highlighting, bookmark star, Lens, extension puzzle icon, profile avatar, and 3-dot Chrome menu.
 * - Chrome Bookmarks bar.
 * - Chrome 3-Dot Dropdown Menu matching real Chrome, featuring "Help > Report an issue... / Report an unsafe site...".
 * - "Send feedback to Google" Chrome dialog matching Screenshot 2 with issue description, URL, email, checkboxes, and Send button.
 * - High-fidelity virtual webpage block renderer with multi-page navigation and form submission.
 * - Positive termination upon reporting threat via Chrome Help menu.
 * - Negative termination upon credential form submission or malicious link click.
 * 
 * @param {Object} props
 * @param {Object} props.scenario - Validated scenario JSON
 * @param {string} props.sessionId - Current simulation session ID
 * @param {Function} props.onAction - Reports user interaction events
 * @param {Function} props.onComplete - Notifies parent of terminal state
 */
export default function WebsiteSimulation({
  scenario,
  sessionId = 'sess-web-sim-default',
  onAction,
  onComplete
}) {
  // Graceful fallback if scenario is missing
  if (!scenario || typeof scenario !== 'object') {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] p-6 bg-[#202124] text-gray-200 font-sans">
        <div className="text-center p-8 bg-[#292a2d] border border-[#3c4043] rounded-2xl shadow-xl max-w-md">
          <AlertOctagon className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-white mb-2">Scenario Unavailable</h2>
          <p className="text-xs text-gray-400 mb-4">
            No valid website attack scenario data was provided to the simulation runner.
          </p>
        </div>
      </div>
    );
  }

  // Session & Scenario IDs
  const scenarioId = scenario.scenarioId || scenario.id || 'unnamed-scenario';
  const targetId = scenario.targetId || 'target-page';

  // Navigation History Stack
  const initialPageId = scenario.initialPageId || Object.keys(scenario.pages || {})[0] || 'page-home';
  const [history, setHistory] = useState([initialPageId]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Current page object
  const currentPageId = history[historyIndex];
  const pagesMap = scenario.pages || {};
  const currentPage = pagesMap[currentPageId] || null;

  // Local Form state per page: { [fieldId]: value }
  const [formValues, setFormValues] = useState({});
  const [passwordMasked, setPasswordMasked] = useState(true);

  // Browser Address bar text (mirrors current page URL)
  const currentUrl = currentPage?.url || `https://${scenario.browserConfig?.defaultDomain || 'vtop.vit.ac.in'}/${currentPageId}`;

  // Security status & popover
  const securityStatus = scenario.browserConfig?.securityStatus || (currentPage?.isTargetPhish ? 'unsecured' : 'secure');
  const [showSecurityPopover, setShowSecurityPopover] = useState(false);

  // Chrome 3-Dot Menu State & Submenu
  const [isChromeMenuOpen, setIsChromeMenuOpen] = useState(false);
  const [isHelpSubmenuOpen, setIsHelpSubmenuOpen] = useState(false);
  const chromeMenuRef = useRef(null);

  // Chrome "Send feedback to Google" Modal State (Screenshot 2)
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackEmail, setFeedbackEmail] = useState('pavankalyan7127@gmail.com');
  const [includeScreenshot, setIncludeScreenshot] = useState(false);
  const [sendSysInfo, setSendSysInfo] = useState(true);
  const [emailForUpdates, setEmailForUpdates] = useState(false);

  // In-app educational intercept notice
  const [linkNotice, setLinkNotice] = useState(null);

  // Single scenario_viewed event tracker to prevent duplicate emissions on rerender
  const hasEmittedViewed = useRef(false);

  // Close Chrome menu on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (chromeMenuRef.current && !chromeMenuRef.current.contains(event.target)) {
        setIsChromeMenuOpen(false);
        setIsHelpSubmenuOpen(false);
      }
    }
    if (isChromeMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isChromeMenuOpen]);

  // Safe Event Dispatcher
  const emitEvent = (eventType, metadata = {}) => {
    const payload = {
      eventType,
      scenarioId,
      sessionId,
      targetId: currentPageId || targetId,
      timestamp: new Date().toISOString(),
      metadata: {
        channel: 'website',
        currentView: 'browser',
        currentPageId,
        virtualUrl: currentUrl,
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
        scenarioTitle: scenario.title || 'Website Phishing Simulation',
        category: scenario.category || 'Website Phishing',
        difficulty: scenario.difficulty || 'Medium',
        initialPageId,
        initialUrl: currentUrl
      });
    }
  }, [scenarioId, sessionId]);

  // Emit virtual_page_viewed whenever current page changes
  useEffect(() => {
    if (currentPage) {
      emitEvent('virtual_page_viewed', {
        pageId: currentPage.id,
        pageTitle: currentPage.title,
        url: currentPage.url,
        layout: currentPage.layout,
        isTargetPhish: Boolean(currentPage.isTargetPhish)
      });
    }
  }, [currentPageId]);

  // Navigate to a destination page ID safely
  const handleNavigate = (targetPageId, actionMeta = {}) => {
    setLinkNotice(null);
    setShowSecurityPopover(false);

    if (!targetPageId || !pagesMap[targetPageId]) {
      emitEvent('virtual_navigation', {
        fromPageId: currentPageId,
        targetPageId,
        status: 'page_not_found',
        ...actionMeta
      });
      const nextHistory = history.slice(0, historyIndex + 1).concat(targetPageId || 'unknown');
      setHistory(nextHistory);
      setHistoryIndex(nextHistory.length - 1);
      return;
    }

    emitEvent('virtual_navigation', {
      fromPageId: currentPageId,
      targetPageId,
      targetUrl: pagesMap[targetPageId]?.url,
      ...actionMeta
    });

    const nextHistory = history.slice(0, historyIndex + 1).concat(targetPageId);
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
  };

  // Browser Back
  const handleBrowserBack = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      emitEvent('browser_back', {
        toPageId: history[prevIndex],
        historyIndex: prevIndex
      });
    }
  };

  // Browser Forward
  const handleBrowserForward = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      emitEvent('browser_forward', {
        toPageId: history[nextIndex],
        historyIndex: nextIndex
      });
    }
  };

  // Browser Refresh
  const handleBrowserRefresh = () => {
    setFormValues({});
    setLinkNotice(null);
    emitEvent('virtual_navigation', {
      action: 'refresh',
      pageId: currentPageId
    });
  };

  // Field change in form blocks
  const handleFieldChange = (fieldId, value) => {
    setFormValues(prev => ({
      ...prev,
      [fieldId]: value
    }));

    emitEvent('form_interaction', {
      fieldId,
      hasValue: Boolean(value && value.length > 0)
    });
  };

  // Button clicks inside virtual webpage
  const handleButtonClick = (e, block) => {
    if (e) e.preventDefault();

    const buttonLabel = block.label || block.text || 'Submit';

    emitEvent('form_interaction', {
      action: 'button_clicked',
      buttonId: block.id,
      buttonText: buttonLabel,
      targetPageId: block.targetPageId
    });

    const isSubmitButton =
      block.isSubmit ||
      block.type === 'button' &&
      (buttonLabel.toLowerCase().includes('sign in') ||
        buttonLabel.toLowerCase().includes('log in') ||
        buttonLabel.toLowerCase().includes('submit') ||
        buttonLabel.toLowerCase().includes('verify'));

    if (isSubmitButton) {
      const submittedFields = Object.keys(formValues).filter(k => Boolean(formValues[k]));

      emitEvent('simulated_form_submitted', {
        formId: block.id || 'virtual_form',
        pageId: currentPageId,
        fieldsSubmittedCount: submittedFields.length,
        isTargetPhish: Boolean(currentPage?.isTargetPhish)
      });

      emitEvent('credential_submitted', {
        pageId: currentPageId,
        phishDetected: Boolean(currentPage?.isTargetPhish)
      });
    }

    if (block.targetPageId) {
      handleNavigate(block.targetPageId, { buttonId: block.id });
    }
  };

  // Simulated link clicks inside webpage
  const handleVirtualLinkClick = (e, block) => {
    if (e) e.preventDefault();

    emitEvent('virtual_link_clicked', {
      linkId: block.id,
      url: block.url,
      text: block.text,
      targetPhish: Boolean(currentPage?.isTargetPhish)
    });

    setLinkNotice({
      url: block.url || '#',
      text: 'Simulated link intercepted within virtual browser sandbox.'
    });

    if (block.targetPageId) {
      handleNavigate(block.targetPageId, { linkId: block.id });
    }
  };

  // 1. Submit Google Chrome Report / Send Feedback (Positive Defensive Termination)
  const handleSendFeedback = () => {
    setIsFeedbackModalOpen(false);
    setIsChromeMenuOpen(false);
    setIsHelpSubmenuOpen(false);

    emitEvent('threat_reported', {
      reportedVia: 'chrome_feedback',
      issueDescription: feedbackText || 'Counterfeit phishing website detected on unverified domain.',
      virtualUrl: currentUrl,
      email: feedbackEmail,
      reportedTarget: Boolean(currentPage?.isTargetPhish)
    });

    if (typeof onComplete === 'function') {
      onComplete({
        status: 'reported',
        action: 'threat_reported',
        scenarioId,
        sessionId,
        reason: 'Reported unsafe website via Google Chrome feedback'
      });
    }
  };

  // 2. Chrome Menu Exit Action (Safe Exit Positive Termination)
  const handleChromeExit = () => {
    setIsChromeMenuOpen(false);
    setIsHelpSubmenuOpen(false);

    emitEvent('safe_exit', {
      reason: 'user_closed_chrome_window',
      pageId: currentPageId
    });

    if (typeof onComplete === 'function') {
      onComplete({
        status: 'safe_exit',
        action: 'safe_exit',
        scenarioId,
        sessionId,
        reason: 'User recognized suspicious page and closed the Chrome browser window'
      });
    }
  };

  // Parse hostname and path for realistic Omnibox URL highlighting
  const { hostPart, pathPart } = useMemo(() => {
    try {
      const urlObj = new URL(currentUrl);
      return {
        hostPart: `${urlObj.protocol}//${urlObj.host}`,
        pathPart: urlObj.pathname + urlObj.search
      };
    } catch {
      return {
        hostPart: currentUrl,
        pathPart: ''
      };
    }
  }, [currentUrl]);

  // Block Renderer
  const renderBlock = (block, idx) => {
    if (!block || typeof block !== 'object' || !block.type) {
      return null;
    }

    switch (block.type) {
      case 'heading': {
        const HeadingTag = block.level === 1 ? 'h1' : block.level === 3 ? 'h3' : 'h2';
        const sizeClasses = block.level === 1 ? 'text-2xl font-bold' : block.level === 3 ? 'text-base font-semibold' : 'text-xl font-bold';
        return (
          <HeadingTag key={idx} className={`${sizeClasses} text-gray-900 tracking-tight my-2`}>
            {block.text}
          </HeadingTag>
        );
      }

      case 'paragraph':
        return (
          <p key={idx} className="text-sm text-gray-700 leading-relaxed my-2">
            {block.text}
          </p>
        );

      case 'notice':
      case 'alert': {
        const isWarning = block.level === 'warning';
        const isSuccess = block.level === 'success';
        const isDanger = block.level === 'danger';

        return (
          <div
            key={idx}
            className={`p-3.5 rounded-xl border flex items-start gap-3 my-3 text-xs sm:text-sm ${
              isDanger
                ? 'bg-red-50 border-red-200 text-red-900'
                : isWarning
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : isSuccess
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-blue-50 border-blue-200 text-blue-900'
            }`}
          >
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              {block.title && <div className="font-bold mb-0.5">{block.title}</div>}
              <div>{block.text}</div>
            </div>
          </div>
        );
      }

      case 'text-input':
      case 'email-input': {
        const isMaskedField = block.isMasked || block.type === 'password-input';
        return (
          <div key={idx} className="my-3 space-y-1 text-left">
            {block.label && (
              <label className="block text-xs font-semibold text-gray-700">
                {block.label} {block.required && <span className="text-red-500">*</span>}
              </label>
            )}
            <div className="relative">
              <input
                type={isMaskedField ? (passwordMasked ? 'password' : 'text') : block.type === 'email-input' ? 'email' : 'text'}
                value={formValues[block.id] || ''}
                onChange={(e) => handleFieldChange(block.id, e.target.value)}
                placeholder={block.placeholder || ''}
                className="w-full text-xs sm:text-sm px-3 py-2 border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all bg-white text-gray-900 placeholder-gray-400"
              />
              {isMaskedField && (
                <button
                  type="button"
                  onClick={() => setPasswordMasked(prev => !prev)}
                  className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {passwordMasked ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>
        );
      }

      case 'file-input':
        return (
          <div key={idx} className="my-3 space-y-1 text-left">
            {block.label && (
              <label className="block text-xs font-semibold text-gray-700">
                {block.label} {block.required && <span className="text-red-500">*</span>}
              </label>
            )}
            <input
              type="file"
              id={block.id}
              onChange={(e) => handleFieldChange(block.id, e.target.files?.[0]?.name || 'file_uploaded')}
              className="w-full text-xs text-gray-600 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
            />
          </div>
        );

      case 'checkbox':
        return (
          <label key={idx} className="flex items-start gap-2.5 my-3 cursor-pointer select-none text-left">
            <input
              type="checkbox"
              id={block.id}
              checked={Boolean(formValues[block.id])}
              onChange={(e) => handleFieldChange(block.id, e.target.checked)}
              className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
            />
            <span className="text-xs sm:text-sm text-gray-700 leading-snug">
              {block.label}
            </span>
          </label>
        );

      case 'button':
        return (
          <div key={idx} className="my-4">
            <button
              onClick={(e) => handleButtonClick(e, block)}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs sm:text-sm rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{block.label || block.text}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        );

      case 'simulated-link':
        return (
          <div key={idx} className="my-3 text-center sm:text-left">
            <a
              href={block.url || '#'}
              onClick={(e) => handleVirtualLinkClick(e, block)}
              className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>{block.text || block.url}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        );

      case 'card':
        return (
          <div key={idx} className="my-4 p-4 rounded-xl border border-gray-200 bg-gray-50/50 shadow-2xs text-left">
            {block.title && <h3 className="font-bold text-sm text-gray-900 mb-1">{block.title}</h3>}
            {block.text && <p className="text-xs text-gray-600 leading-relaxed mb-3">{block.text}</p>}
            {Array.isArray(block.blocks) && block.blocks.map((b, bIdx) => renderBlock(b, `${idx}-${bIdx}`))}
          </div>
        );

      case 'divider':
        return <hr key={idx} className="my-4 border-gray-200" />;

      default:
        return null;
    }
  };

  return (
    <div
      className="flex flex-col h-full w-full bg-[#202124] text-white select-none overflow-hidden font-sans antialiased"
      data-testid="website-simulation"
    >
      {/* ============================================================== */}
      {/* 1. CHROME TITLE BAR & CURVED TABS STRIP (Screenshot 1)         */}
      {/* ============================================================== */}
      <div className="h-10 bg-[#292a2d] flex items-end justify-between px-2 pt-1.5 gap-1 shrink-0 select-none border-b border-[#3c4043]/50">
        {/* Left: Active Tab & New Tab button */}
        <div className="flex items-end gap-1 min-w-0">
          <div className="flex items-center gap-2 px-3 py-2 bg-[#35363a] rounded-t-lg text-xs font-medium text-gray-100 max-w-xs truncate border-t border-x border-[#3c4043] relative shadow-md">
            <Globe className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="truncate">
              {currentPage?.title || scenario.browserConfig?.siteTitle || 'Virtual Web Browser'}
            </span>
            <button
              onClick={handleChromeExit}
              className="p-0.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white ml-1"
              title="Close tab"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          <button
            className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white mb-0.5 transition-colors"
            title="New Tab"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Ask Gemini Pill & Chrome Window Controls */}
        <div className="flex items-center gap-3 pr-1 pb-1">
          {/* Ask Gemini Button */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-[#1e1b4b] to-[#311042] border border-indigo-400/30 text-indigo-200 text-xs font-medium cursor-pointer shadow-sm hover:brightness-110 transition-all">
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
            <span className="text-[11px] font-semibold bg-gradient-to-r from-indigo-200 via-pink-200 to-amber-200 bg-clip-text text-transparent">
              Ask Gemini
            </span>
          </div>

          <div className="h-4 w-px bg-gray-600/60 mx-0.5" />

          {/* Minimize, Maximize, Close */}
          <div className="flex items-center gap-1 text-gray-400">
            <button className="p-1 hover:bg-white/10 rounded" title="Minimize">
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button className="p-1 hover:bg-white/10 rounded" title="Maximize">
              <Square className="w-3 h-3" />
            </button>
            <button
              onClick={handleChromeExit}
              className="p-1 hover:bg-red-600 hover:text-white rounded transition-colors"
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. CHROME OMNIBOX & NAVIGATION TOOLBAR (Screenshot 1)          */}
      {/* ============================================================== */}
      <div className="h-11 bg-[#35363a] px-3 flex items-center justify-between gap-2 shrink-0 border-b border-[#292a2d]">
        {/* Navigation buttons: Back, Forward, Reload */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleBrowserBack}
            disabled={historyIndex <= 0}
            className="p-1.5 rounded-full hover:bg-white/10 disabled:opacity-30 text-gray-300 transition-colors"
            title="Click to go back"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <button
            onClick={handleBrowserForward}
            disabled={historyIndex >= history.length - 1}
            className="p-1.5 rounded-full hover:bg-white/10 disabled:opacity-30 text-gray-300 transition-colors"
            title="Click to go forward"
            aria-label="Forward"
          >
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={handleBrowserRefresh}
            className="p-1.5 rounded-full hover:bg-white/10 text-gray-300 transition-transform active:rotate-180"
            title="Reload this page"
            aria-label="Refresh"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Omnibox (Address Bar) with URL Highlighting & SSL Chip */}
        <div className="flex-1 max-w-4xl relative">
          <div className="flex items-center bg-[#202124] hover:bg-[#1b1c1e] focus-within:bg-[#1e1f22] focus-within:ring-2 focus-within:ring-blue-500 rounded-full px-3.5 py-1.5 transition-all text-xs font-mono">
            {/* Security Chip: "Not secure" / Padlock */}
            <button
              onClick={() => setShowSecurityPopover(prev => !prev)}
              className="flex items-center gap-1.5 mr-2 px-1.5 py-0.5 rounded-full hover:bg-white/10 shrink-0 transition-colors"
              title="View site information"
            >
              {securityStatus === 'unsecured' ? (
                <div className="flex items-center gap-1 text-red-400 font-semibold text-[11px]">
                  <AlertOctagon className="w-3.5 h-3.5 text-red-400" />
                  <span className="hidden sm:inline">Not secure</span>
                </div>
              ) : (
                <Lock className="w-3.5 h-3.5 text-gray-400" />
              )}
            </button>

            {/* URL Display with Host Highlighting */}
            <div className="flex-1 truncate text-xs flex items-center">
              <span className="text-white font-semibold">{hostPart}</span>
              <span className="text-gray-400">{pathPart}</span>
            </div>

            {/* Right Omnibox Tools: Bookmark Star & Lens */}
            <div className="flex items-center gap-2 text-gray-400 ml-2 shrink-0">
              <button title="Bookmark this tab" className="hover:text-white">
                <Star className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Security Details Popover */}
          {showSecurityPopover && (
            <div className="absolute top-10 left-2 z-50 w-80 p-4 bg-[#292a2d] rounded-xl shadow-2xl border border-[#3c4043] text-xs text-gray-300 animate-in fade-in zoom-in-95 duration-100">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 font-bold text-white">
                  <ShieldAlert className="w-4 h-4 text-red-400" />
                  <span>Security Information</span>
                </div>
                <button
                  onClick={() => setShowSecurityPopover(false)}
                  className="p-0.5 rounded hover:bg-white/10 text-gray-400"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>

              <p className="text-gray-400 mb-2 leading-relaxed">
                {scenario.browserConfig?.securityNotice ||
                  'Your connection to this site is not private. Attackers might try to steal your passwords or credit cards.'}
              </p>

              <div className="p-2 bg-red-950/60 border border-red-800 text-red-300 rounded font-mono text-[10px] break-all">
                Untrusted Host: {scenario.browserConfig?.defaultDomain || 'unverified-phishing-host'}
              </div>
            </div>
          )}
        </div>

        {/* Right Tools: Extension puzzle, Shield, Profile Avatar, 3-Dot Menu */}
        <div className="flex items-center gap-1 shrink-0 relative" ref={chromeMenuRef}>
          <button title="Extensions" className="p-1.5 text-gray-400 hover:text-white rounded-full hover:bg-white/10">
            <Puzzle className="w-4 h-4" />
          </button>

          <button title="Adblocker / Security Shield" className="p-1.5 text-gray-400 hover:text-white rounded-full hover:bg-white/10">
            <Shield className="w-4 h-4 text-red-400" />
          </button>

          {/* Profile Avatar */}
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm cursor-pointer ml-0.5">
            P
          </div>

          {/* 3-Dot Chrome Menu Button (Screenshot 1) */}
          <button
            onClick={() => {
              setIsChromeMenuOpen(prev => !prev);
              setIsHelpSubmenuOpen(false);
            }}
            data-testid="chrome-menu-btn"
            className={`p-1.5 rounded-full transition-colors ${
              isChromeMenuOpen ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
            title="Customize and control Google Chrome"
            aria-label="Chrome options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {/* ============================================================== */}
          {/* CHROME 3-DOT POPUP MENU (Screenshot 1)                        */}
          {/* ============================================================== */}
          {isChromeMenuOpen && (
            <div
              data-testid="chrome-dropdown-menu"
              className="absolute right-0 top-10 w-72 bg-[#292a2d] border border-[#3c4043] rounded-xl shadow-2xl py-1.5 z-50 text-xs text-gray-200 select-none animate-in fade-in zoom-in-95 duration-100"
            >
              {/* Security compromised passwords badge */}
              <div className="px-3.5 py-2 flex items-center gap-3 hover:bg-white/5 cursor-pointer text-gray-200">
                <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                <span className="font-medium">Found 3 compromised passwords</span>
              </div>

              <div className="h-px bg-[#3c4043] my-1" />

              <div className="px-3.5 py-1.5 flex items-center justify-between hover:bg-white/5 cursor-pointer text-gray-300">
                <span>New tab</span>
                <span className="text-[10px] text-gray-500">Ctrl+T</span>
              </div>
              <div className="px-3.5 py-1.5 flex items-center justify-between hover:bg-white/5 cursor-pointer text-gray-300">
                <span>New window</span>
                <span className="text-[10px] text-gray-500">Ctrl+N</span>
              </div>
              <div className="px-3.5 py-1.5 flex items-center justify-between hover:bg-white/5 cursor-pointer text-gray-300">
                <span>New Incognito window</span>
                <span className="text-[10px] text-gray-500">Ctrl+Shift+N</span>
              </div>

              <div className="h-px bg-[#3c4043] my-1" />

              {/* Profile Card */}
              <div className="mx-2 p-2 rounded-lg bg-[#35363a] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center">
                    P
                  </div>
                  <span className="font-semibold text-white">Pavan</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-950 text-red-400 border border-red-800">
                  Signed in
                </span>
              </div>

              <div className="px-3.5 py-1.5 flex items-center justify-between hover:bg-white/5 cursor-pointer text-gray-300 mt-1">
                <span>Passwords and autofill</span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
              </div>
              <div className="px-3.5 py-1.5 flex items-center justify-between hover:bg-white/5 cursor-pointer text-gray-300">
                <span>History</span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
              </div>
              <div className="px-3.5 py-1.5 flex items-center justify-between hover:bg-white/5 cursor-pointer text-gray-300">
                <span>Downloads</span>
                <span className="text-[10px] text-gray-500">Ctrl+J</span>
              </div>
              <div className="px-3.5 py-1.5 flex items-center justify-between hover:bg-white/5 cursor-pointer text-gray-300">
                <span>Bookmarks and lists</span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
              </div>
              <div className="px-3.5 py-1.5 flex items-center justify-between hover:bg-white/5 cursor-pointer text-gray-300">
                <span>Extensions</span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
              </div>

              <div className="h-px bg-[#3c4043] my-1" />

              {/* Zoom controls */}
              <div className="px-3.5 py-1.5 flex items-center justify-between text-gray-300">
                <span>Zoom</span>
                <div className="flex items-center gap-2 font-mono">
                  <button className="px-1.5 rounded hover:bg-white/10">-</button>
                  <span className="text-[11px]">100%</span>
                  <button className="px-1.5 rounded hover:bg-white/10">+</button>
                </div>
              </div>

              <div className="h-px bg-[#3c4043] my-1" />

              {/* HELP MENU TRIGGER (Hover / Click expands Submenu) */}
              <div className="relative">
                <button
                  onClick={() => setIsHelpSubmenuOpen(prev => !prev)}
                  onMouseEnter={() => setIsHelpSubmenuOpen(true)}
                  data-testid="chrome-help-menu-btn"
                  className="w-full px-3.5 py-1.5 flex items-center justify-between hover:bg-white/10 cursor-pointer text-gray-200 text-left transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <HelpCircle className="w-4 h-4 text-gray-400" />
                    <span>Help</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
                </button>

                {/* HELP FLYOUT SUBMENU (Screenshot 1) */}
                {isHelpSubmenuOpen && (
                  <div
                    data-testid="chrome-help-submenu"
                    className="absolute right-full top-0 mr-1 w-60 bg-[#292a2d] border border-[#3c4043] rounded-xl shadow-2xl py-1.5 text-xs text-gray-200 z-50 animate-in fade-in duration-100"
                  >
                    <div className="px-3.5 py-1.5 hover:bg-white/5 cursor-pointer text-gray-300">
                      About Google Chrome
                    </div>
                    <div className="px-3.5 py-1.5 hover:bg-white/5 cursor-pointer text-gray-300">
                      What's new
                    </div>
                    <div className="px-3.5 py-1.5 hover:bg-white/5 cursor-pointer text-gray-300">
                      Help center
                    </div>

                    <div className="h-px bg-[#3c4043] my-1" />

                    {/* REPORT AN ISSUE... (Opens Feedback Modal Screenshot 2) */}
                    <button
                      onClick={() => {
                        setIsChromeMenuOpen(false);
                        setIsHelpSubmenuOpen(false);
                        setIsFeedbackModalOpen(true);
                      }}
                      data-testid="chrome-report-issue-btn"
                      className="w-full px-3.5 py-1.5 flex items-center justify-between hover:bg-white/10 cursor-pointer text-gray-200 text-left transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
                        <span>Report an issue...</span>
                      </div>
                      <span className="text-[10px] text-gray-500 font-mono">Alt+Shift+I</span>
                    </button>

                    {/* REPORT AN UNSAFE SITE... (Opens Feedback Modal Screenshot 2) */}
                    <button
                      onClick={() => {
                        setIsChromeMenuOpen(false);
                        setIsHelpSubmenuOpen(false);
                        setIsFeedbackModalOpen(true);
                      }}
                      data-testid="chrome-report-unsafe-btn"
                      className="w-full px-3.5 py-1.5 flex items-center gap-2.5 hover:bg-white/10 cursor-pointer text-red-400 text-left transition-colors"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      <span>Report an unsafe site...</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="px-3.5 py-1.5 flex items-center gap-2.5 hover:bg-white/5 cursor-pointer text-gray-300">
                <Settings className="w-4 h-4 text-gray-400" />
                <span>Settings</span>
              </div>

              <div className="h-px bg-[#3c4043] my-1" />

              {/* Exit Chrome */}
              <button
                onClick={handleChromeExit}
                data-testid="chrome-exit-btn"
                className="w-full px-3.5 py-1.5 flex items-center gap-2.5 hover:bg-white/10 cursor-pointer text-gray-300 text-left"
              >
                <span>Exit</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. CHROME BOOKMARKS BAR (Screenshot 1)                         */}
      {/* ============================================================== */}
      <div className="h-7 bg-[#292a2d] px-3 flex items-center gap-3 border-b border-[#3c4043] text-[11px] text-gray-300 select-none shrink-0 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 cursor-pointer hover:bg-white/10 px-2 py-0.5 rounded">
          <Folder className="w-3.5 h-3.5 text-blue-400" />
          <span>All bookmarks</span>
        </div>

        <div className="h-3 w-px bg-gray-600/60" />

        <div className="flex items-center gap-1.5 cursor-pointer hover:bg-white/10 px-2 py-0.5 rounded">
          <div className="w-3 h-3 rounded-full bg-blue-600 text-[8px] font-bold text-white flex items-center justify-center">
            V
          </div>
          <span>VTOP</span>
        </div>

        <div className="flex items-center gap-1.5 cursor-pointer hover:bg-white/10 px-2 py-0.5 rounded">
          <div className="w-3 h-3 rounded-full bg-red-600 text-[8px] font-bold text-white flex items-center justify-center">
            M
          </div>
          <span>Gmail</span>
        </div>

        <div className="flex items-center gap-1.5 cursor-pointer hover:bg-white/10 px-2 py-0.5 rounded">
          <div className="w-3 h-3 rounded-full bg-blue-500 text-[8px] font-bold text-white flex items-center justify-center">
            G
          </div>
          <span>Google</span>
        </div>

        <div className="flex items-center gap-1.5 cursor-pointer hover:bg-white/10 px-2 py-0.5 rounded">
          <div className="w-3 h-3 rounded-full bg-red-700 text-[8px] font-bold text-white flex items-center justify-center">
            ▶
          </div>
          <span>YouTube</span>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 4. CHROME BROWSER VIEWPORT & WEBPAGE CONTENT                  */}
      {/* ============================================================== */}
      <div className="flex-1 bg-[#f8f9fa] text-gray-900 overflow-y-auto relative flex flex-col items-center">
        {/* Intercept Notice Banner */}
        {linkNotice && (
          <div className="w-full bg-blue-50 border-b border-blue-200 px-4 py-2 flex items-center justify-between text-xs text-blue-900 shrink-0">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
              <span>{linkNotice.text} ({linkNotice.url})</span>
            </div>
            <button onClick={() => setLinkNotice(null)} className="text-blue-500 hover:text-blue-800">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Page Content Rendering */}
        <div className="w-full flex-1 flex flex-col items-center justify-center p-4 sm:p-8">
          {!currentPage ? (
            /* 404 Fallback State */
            <div className="text-center p-8 bg-white border border-gray-200 rounded-2xl shadow-sm max-w-md w-full">
              <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
              <h2 className="text-xl font-bold text-gray-900 mb-1">404 - Page Not Found</h2>
              <p className="text-xs text-gray-600 mb-4">
                The virtual browser was unable to locate page <code className="bg-gray-100 px-1 py-0.5 rounded font-mono text-red-600">"{currentPageId}"</code>.
              </p>
              <button
                onClick={() => handleNavigate(initialPageId)}
                className="px-4 py-2 bg-blue-600 text-white font-semibold text-xs rounded-lg hover:bg-blue-700 transition-colors"
              >
                Return to Initial Page
              </button>
            </div>
          ) : (
            /* Layout Variants */
            <div
              className={`w-full transition-all ${
                currentPage.layout === 'login-style' || currentPage.layout === 'account-verification'
                  ? 'max-w-md bg-white border border-gray-200/80 p-6 sm:p-8 rounded-2xl shadow-lg text-center'
                  : currentPage.layout === 'confirmation'
                  ? 'max-w-lg bg-white border border-gray-200/80 p-8 rounded-2xl shadow-lg text-center'
                  : 'max-w-3xl bg-white border border-gray-200/80 p-6 rounded-2xl shadow-sm'
              }`}
            >
              {/* Optional Portal Header / Logo for login-style layout */}
              {(currentPage.layout === 'login-style' || currentPage.layout === 'account-verification') && (
                <div className="flex items-center justify-center gap-2 mb-4 pb-4 border-b border-gray-100">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
                    {scenario.browserConfig?.siteTitle?.charAt(0) || 'V'}
                  </div>
                  <span className="font-bold text-base text-gray-900 tracking-tight">
                    {scenario.browserConfig?.siteTitle || 'Single Sign-On Authentication'}
                  </span>
                </div>
              )}

              {/* Render Blocks */}
              {Array.isArray(currentPage.blocks) && currentPage.blocks.map((block, idx) => renderBlock(block, idx))}
            </div>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 5. "SEND FEEDBACK TO GOOGLE" MODAL (Screenshot 2)              */}
      {/* ============================================================== */}
      {isFeedbackModalOpen && (
        <div
          data-testid="chrome-feedback-modal"
          className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="bg-[#202124] border border-[#3c4043] rounded-2xl max-w-lg w-full text-gray-200 shadow-2xl overflow-hidden font-sans">
            {/* Modal Window Header with Chrome Icon */}
            <div className="px-4 py-3 bg-[#292a2d] border-b border-[#3c4043] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-red-500 via-yellow-400 to-green-500 flex items-center justify-center p-0.5 shadow-sm">
                  <div className="w-full h-full rounded-full bg-[#292a2d] flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-white tracking-tight">
                  Send feedback to Google
                </h3>
              </div>
              <div className="flex items-center gap-1 text-gray-400">
                <button className="p-1 hover:bg-white/10 rounded">
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <button className="p-1 hover:bg-white/10 rounded">
                  <Square className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setIsFeedbackModalOpen(false)}
                  className="p-1 hover:bg-red-600 hover:text-white rounded transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-medium text-gray-200 mb-1.5">
                  Describe the issue in detail
                </label>
                <textarea
                  rows={4}
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Describe why this website is suspicious, deceptive, or attempting to harvest user credentials..."
                  className="w-full bg-[#18191c] border border-blue-500 rounded-lg p-3 text-xs text-white placeholder-gray-500 outline-none focus:ring-1 focus:ring-blue-400 resize-none font-sans"
                />
              </div>

              <div>
                <p className="text-gray-400 text-[11px] font-semibold mb-2">Additional info (optional)</p>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3">
                    <span className="w-16 text-gray-400 shrink-0 text-left">URL</span>
                    <input
                      type="text"
                      readOnly
                      value={currentUrl}
                      className="flex-1 bg-[#18191c] border border-[#3c4043] rounded px-2.5 py-1.5 text-xs text-gray-300 font-mono truncate"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="w-16 text-gray-400 shrink-0 text-left">Email</span>
                    <select
                      value={feedbackEmail}
                      onChange={(e) => setFeedbackEmail(e.target.value)}
                      className="flex-1 bg-[#18191c] border border-[#3c4043] rounded px-2.5 py-1.5 text-xs text-gray-200 outline-none"
                    >
                      <option value="pavankalyan7127@gmail.com">pavankalyan7127@gmail.com</option>
                      <option value="student@university.edu">student@university.edu</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="w-16 text-gray-400 shrink-0 text-left">Attach file</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="px-2.5 py-1 bg-[#35363a] hover:bg-[#404247] text-gray-200 text-xs rounded border border-[#484b51] transition-colors"
                      >
                        Choose File
                      </button>
                      <span className="text-gray-500 text-[11px]">No file chosen</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-500 pl-19">
                    File will be sent to Google for debugging
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-gray-300">
                  <input
                    type="checkbox"
                    checked={emailForUpdates}
                    onChange={(e) => setEmailForUpdates(e.target.checked)}
                    className="rounded border-gray-600 bg-[#292a2d] text-blue-500 focus:ring-0"
                  />
                  <span>We may email you for more information or updates</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-gray-300">
                  <input
                    type="checkbox"
                    checked={includeScreenshot}
                    onChange={(e) => setIncludeScreenshot(e.target.checked)}
                    className="rounded border-gray-600 bg-[#292a2d] text-blue-500 focus:ring-0"
                  />
                  <span>Include this screenshot and titles of open tabs</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-gray-300">
                  <input
                    type="checkbox"
                    checked={sendSysInfo}
                    onChange={(e) => setSendSysInfo(e.target.checked)}
                    className="rounded border-gray-600 bg-[#292a2d] text-blue-500 focus:ring-0"
                  />
                  <span>Send system information</span>
                </label>
              </div>

              <p className="text-[10px] text-gray-500 leading-relaxed pt-1">
                Go to the <span className="text-blue-400 underline cursor-pointer">Legal Help page</span> to request content changes for legal reasons. Some account and system information may be sent to Google. We will use the information you give us to help address technical issues and to improve our services, subject to our <span className="text-blue-400 underline cursor-pointer">Privacy Policy</span> and <span className="text-blue-400 underline cursor-pointer">Terms of Service</span>.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-3.5 bg-[#1b1c1e] border-t border-[#3c4043] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsFeedbackModalOpen(false)}
                className="px-4 py-1.5 text-xs font-semibold text-gray-300 hover:bg-white/10 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendFeedback}
                data-testid="chrome-feedback-send-btn"
                className="px-5 py-1.5 text-xs font-bold text-gray-900 bg-[#8ab4f8] hover:bg-[#aecbfa] rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
