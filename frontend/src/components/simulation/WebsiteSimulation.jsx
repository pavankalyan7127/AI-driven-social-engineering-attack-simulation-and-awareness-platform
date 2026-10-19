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
  LogOut,
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
  SlidersHorizontal
} from 'lucide-react';

/**
 * WebsiteSimulation Component
 * 
 * Reusable, data-driven virtual browser simulation for AI-driven social engineering attack training.
 * Provides an isolated browser shell, navigation history, and allowlisted block renderer.
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
      <div className="flex items-center justify-center h-full min-h-[400px] p-6 bg-gray-50 text-gray-700 font-sans">
        <div className="text-center p-8 bg-white border border-gray-200 rounded-xl shadow-sm max-w-md">
          <AlertOctagon className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-semibold mb-2">Scenario Unavailable</h2>
          <p className="text-sm text-gray-600 mb-4">
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

  // Browser Address bar text (mirrors current page URL)
  const currentUrl = currentPage?.url || `https://${scenario.browserConfig?.defaultDomain || 'virtual-browser.simulation'}/${currentPageId}`;

  // Security status & popover
  const securityStatus = scenario.browserConfig?.securityStatus || (currentPage?.isTargetPhish ? 'unsecured' : 'secure');
  const [showSecurityPopover, setShowSecurityPopover] = useState(false);

  // Threat Reporting Modal State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportIndicators, setReportIndicators] = useState({
    lookalikeDomain: false,
    untrustedCertificate: false,
    credentialHarvestingFields: false,
    artificialUrgencyNotice: false,
    portalImpersonation: false
  });
  const [reportNotes, setReportNotes] = useState('');
  const [threatReportedConfirmed, setThreatReportedConfirmed] = useState(false);

  // Safe Exit Modal State
  const [isSafeExitModalOpen, setIsSafeExitModalOpen] = useState(false);

  // In-app educational intercept notice
  const [linkNotice, setLinkNotice] = useState(null);

  // Single scenario_viewed event tracker to prevent duplicate emissions on rerender
  const hasEmittedViewed = useRef(false);

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
      // Unknown destination handling
      emitEvent('virtual_navigation', {
        fromPageId: currentPageId,
        targetPageId,
        status: 'page_not_found',
        ...actionMeta
      });
      // Push unknown page to history to display 404 state
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

  // Form field value change
  const handleFieldChange = (fieldId, val) => {
    setFormValues(prev => ({ ...prev, [fieldId]: val }));
    emitEvent('form_interaction', {
      fieldId,
      pageId: currentPageId
    });
  };

  // Form submit button action
  const handleFormSubmit = (e, block) => {
    if (e) e.preventDefault();

    emitEvent('simulated_form_submitted', {
      buttonId: block.id,
      actionId: block.actionId || 'submit_form',
      pageId: currentPageId,
      targetPageId: block.targetPageId,
      hasProvidedInput: Object.keys(formValues).length > 0
    });

    if (block.targetPageId) {
      handleNavigate(block.targetPageId, { trigger: 'form_submit' });
    }
  };

  // Simulated link click
  const handleSimulatedLink = (e, block) => {
    if (e) e.preventDefault();

    emitEvent('virtual_link_clicked', {
      linkId: block.id,
      text: block.text,
      targetPageId: block.targetPageId,
      url: block.url || '#'
    });

    if (block.targetPageId) {
      handleNavigate(block.targetPageId, { trigger: 'link_click' });
    } else {
      setLinkNotice({
        text: block.text,
        url: block.url || currentUrl
      });
    }
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
      pageId: currentPageId,
      virtualUrl: currentUrl,
      indicators: reportIndicators,
      indicatorCount: selectedCount,
      notes: reportNotes,
      reportedTarget: Boolean(currentPage?.isTargetPhish)
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
      pageId: currentPageId
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
      case 'email-input':
        return (
          <div key={idx} className="my-3 space-y-1 text-left">
            {block.label && (
              <label className="block text-xs font-semibold text-gray-700">
                {block.label} {block.required && <span className="text-red-500">*</span>}
              </label>
            )}
            <input
              type={block.isMasked ? 'password' : block.type === 'email-input' ? 'email' : 'text'}
              value={formValues[block.id] || ''}
              onChange={(e) => handleFieldChange(block.id, e.target.value)}
              placeholder={block.placeholder || ''}
              className="w-full text-xs sm:text-sm px-3 py-2 border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all bg-white text-gray-900 placeholder-gray-400"
            />
          </div>
        );

      case 'checkbox':
        return (
          <div key={idx} className="my-3 flex items-start gap-2.5 text-left">
            <input
              type="checkbox"
              id={block.id || `chk-${idx}`}
              checked={formValues[block.id] !== undefined ? formValues[block.id] : Boolean(block.defaultChecked)}
              onChange={(e) => handleFieldChange(block.id, e.target.checked)}
              className="mt-0.5 rounded text-blue-600 focus:ring-0 cursor-pointer"
            />
            <label htmlFor={block.id || `chk-${idx}`} className="text-xs text-gray-700 cursor-pointer select-none">
              {block.label}
            </label>
          </div>
        );

      case 'button': {
        const isPrimary = block.variant === 'primary' || !block.variant;
        const isDanger = block.variant === 'danger';

        return (
          <div key={idx} className="my-3">
            <button
              onClick={(e) => handleFormSubmit(e, block)}
              className={`w-full sm:w-auto px-5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all shadow-2xs ${
                isDanger
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : isPrimary
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300'
              }`}
            >
              {block.label || 'Submit'}
            </button>
          </div>
        );
      }

      case 'simulated-link':
        return (
          <div key={idx} className="my-2 text-left">
            <button
              onClick={(e) => handleSimulatedLink(e, block)}
              className="text-xs sm:text-sm text-blue-600 hover:underline inline-flex items-center gap-1 font-medium"
            >
              <span>{block.text || block.url}</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        );

      case 'card':
        return (
          <div key={idx} className="my-3 p-4 bg-gray-50 border border-gray-200 rounded-xl text-left">
            {block.title && <div className="font-semibold text-sm text-gray-900 mb-1">{block.title}</div>}
            <div className="text-xs text-gray-600 leading-relaxed">{block.content || block.text}</div>
          </div>
        );

      case 'divider':
        return <hr key={idx} className="my-4 border-gray-200" />;

      case 'attachment-preview':
        return (
          <div key={idx} className="my-3 p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-500" />
              <span className="text-xs font-medium text-gray-800">{block.name || 'document.pdf'}</span>
            </div>
            <button
              onClick={() => emitEvent('attachment_interaction', { name: block.name })}
              className="p-1 hover:bg-gray-200 rounded text-gray-600"
              title="Preview attachment"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        );

      default:
        // Safely ignore unsupported block types without crashing
        return null;
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#e8eaed] text-[#202124] select-none overflow-hidden font-sans antialiased">
      {/* ============================================================== */}
      {/* 1. BROWSER TABS BAR                                            */}
      {/* ============================================================== */}
      <div className="h-10 bg-[#dee1e6] flex items-end px-3 pt-1.5 gap-1 select-none shrink-0 border-b border-gray-300">
        <div className="flex items-center gap-2 px-3.5 py-1.5 bg-white rounded-t-lg text-xs font-medium text-gray-800 shadow-2xs max-w-xs truncate border-t border-x border-gray-300 relative group">
          <Globe className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span className="truncate">
            {currentPage?.title || scenario.browserConfig?.siteTitle || 'Virtual Web Browser'}
          </span>
          <button className="p-0.5 rounded-full hover:bg-gray-200 text-gray-400 group-hover:text-gray-700 ml-1">
            <X className="w-3 h-3" />
          </button>
        </div>

        <button className="p-1.5 rounded-full hover:bg-gray-300 text-gray-600 mb-0.5" title="New Tab">
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ============================================================== */}
      {/* 2. BROWSER TOOLBAR & ADDRESS BAR                               */}
      {/* ============================================================== */}
      <div className="h-12 bg-white px-3 flex items-center justify-between gap-2 border-b border-gray-200 shrink-0 shadow-2xs">
        {/* Navigation buttons: Back, Forward, Refresh */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleBrowserBack}
            disabled={historyIndex <= 0}
            className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-30 text-gray-700 transition-colors"
            title="Click to go back"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <button
            onClick={handleBrowserForward}
            disabled={historyIndex >= history.length - 1}
            className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-30 text-gray-700 transition-colors"
            title="Click to go forward"
            aria-label="Forward"
          >
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={handleBrowserRefresh}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-700 transition-transform active:rotate-180"
            title="Reload this page"
            aria-label="Refresh"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Address Bar */}
        <div className="flex-1 max-w-3xl relative">
          <div className="flex items-center bg-[#f1f3f4] hover:bg-[#e8eaed] focus-within:bg-white focus-within:shadow-md focus-within:ring-1 focus-within:ring-blue-500 rounded-full px-3.5 py-1.5 transition-all text-xs sm:text-sm">
            {/* Security Indicator */}
            <button
              onClick={() => setShowSecurityPopover(prev => !prev)}
              className="flex items-center gap-1 mr-2 px-1 py-0.5 rounded hover:bg-black/5 shrink-0"
              title="View site information"
            >
              {securityStatus === 'unsecured' ? (
                <div className="flex items-center gap-1 text-red-600 font-semibold text-[11px]">
                  <AlertOctagon className="w-3.5 h-3.5 text-red-600" />
                  <span className="hidden sm:inline">Not Secure</span>
                </div>
              ) : (
                <Lock className="w-3.5 h-3.5 text-gray-500" />
              )}
            </button>

            {/* Virtual URL */}
            <input
              type="text"
              readOnly
              value={currentUrl}
              className="w-full bg-transparent border-none outline-none text-xs sm:text-sm text-gray-800 font-mono truncate"
            />
          </div>

          {/* Security Details Popover */}
          {showSecurityPopover && (
            <div className="absolute top-10 left-2 z-40 w-80 p-4 bg-white rounded-xl shadow-2xl border border-gray-200 text-xs text-gray-700">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 font-bold text-gray-900">
                  <ShieldAlert className="w-4 h-4 text-red-600" />
                  <span>Security Information</span>
                </div>
                <button onClick={() => setShowSecurityPopover(false)} className="p-0.5 rounded hover:bg-gray-100 text-gray-400">
                  <X className="w-3 h-3" />
                </button>
              </div>

              <p className="text-gray-600 mb-2">
                {scenario.browserConfig?.securityNotice || 'Your connection to this site is not private. Do not enter passwords or sensitive personal details.'}
              </p>

              <div className="p-2 bg-red-50 text-red-900 rounded font-mono text-[10px] break-all">
                Host Domain: {scenario.browserConfig?.defaultDomain || 'unverified-phishing-host'}
              </div>
            </div>
          )}
        </div>

        {/* Action Tools */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Report Threat Action */}
          <button
            onClick={() => setIsReportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold border border-red-200 transition-colors shadow-2xs mr-1"
            title="Report phishing website"
          >
            <ShieldAlert className="w-4 h-4 text-red-600" />
            <span className="hidden sm:inline">Report Threat</span>
          </button>

          {/* Safe Exit Simulation */}
          <button
            onClick={() => setIsSafeExitModalOpen(true)}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
            title="Safe Exit"
            aria-label="Safe Exit"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. BROWSER VIEWPORT & VIRTUAL PAGE CONTENT                     */}
      {/* ============================================================== */}
      <div className="flex-1 bg-white overflow-y-auto relative flex flex-col">
        {/* Threat Reported Confirmation Banner */}
        {threatReportedConfirmed && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2.5 flex items-center justify-between text-xs sm:text-sm text-emerald-900 shrink-0">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">
                Threat Reported: Fake website report submitted. Telemetry logged in simulation runner.
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

        {/* In-app Link Notice Banner */}
        {linkNotice && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between text-xs sm:text-sm text-amber-900 shrink-0">
            <div className="flex items-center gap-2 overflow-hidden">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="truncate">
                <strong>Simulated Link Intercepted:</strong> External navigation prevented. Action recorded safely.
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

        {/* Virtual Page Body */}
        <main className="flex-1 p-6 md:p-12 flex flex-col items-center">
          {!currentPage ? (
            /* 404 / Unknown Page Handler */
            <div className="max-w-md w-full text-center py-12 p-6 bg-gray-50 border border-gray-200 rounded-2xl shadow-sm">
              <AlertOctagon className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">404 - Page Not Found</h2>
              <p className="text-xs sm:text-sm text-gray-600 mb-5 leading-relaxed">
                The virtual web page <code className="bg-gray-200 px-1 py-0.5 rounded text-xs">{currentPageId}</code> does not exist in this simulation scenario.
              </p>
              <button
                onClick={() => handleNavigate(initialPageId, { trigger: 'return_home' })}
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
              >
                Return to Initial Page
              </button>
            </div>
          ) : (
            /* Layout Variants */
            <div
              className={`w-full transition-all ${
                currentPage.layout === 'login-style' || currentPage.layout === 'account-verification'
                  ? 'max-w-md bg-white border border-gray-200 p-6 sm:p-8 rounded-2xl shadow-sm text-center'
                  : currentPage.layout === 'confirmation'
                  ? 'max-w-lg bg-white border border-gray-200 p-8 rounded-2xl shadow-sm text-center'
                  : 'max-w-3xl'
              }`}
            >
              {/* Optional Portal Header / Logo for login-style layout */}
              {(currentPage.layout === 'login-style' || currentPage.layout === 'account-verification') && (
                <div className="flex items-center justify-center gap-2 mb-4 pb-4 border-b border-gray-100">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-xs">
                    V
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-sm text-gray-900 leading-tight">V-TOP PORTAL</div>
                    <div className="text-[10px] text-gray-500 font-mono">Single Sign-On SSO</div>
                  </div>
                </div>
              )}

              {/* Render Blocks */}
              {Array.isArray(currentPage.blocks) && currentPage.blocks.map((block, idx) => renderBlock(block, idx))}
            </div>
          )}
        </main>
      </div>

      {/* ============================================================== */}
      {/* 4. THREAT REPORTING MODAL                                      */}
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
                    Report Phishing Website
                  </h3>
                  <p className="text-xs text-gray-600">
                    Identify suspicious indicators detected on this virtual website
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
                Select the suspicious signals you observed on this webpage:
              </p>

              <div className="space-y-2 text-xs text-gray-800">
                <label className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-gray-50 cursor-pointer border border-gray-100">
                  <input
                    type="checkbox"
                    checked={reportIndicators.lookalikeDomain}
                    onChange={() => handleToggleIndicator('lookalikeDomain')}
                    className="mt-0.5 rounded text-red-600 focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <span className="font-semibold text-gray-900 block">
                      Lookalike / Typosquatting Domain
                    </span>
                    <span className="text-gray-500 text-[11px]">
                      URL domain differs from official root (e.g. <code>secure-verify-student.info</code> vs <code>vit.ac.in</code>)
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-gray-50 cursor-pointer border border-gray-100">
                  <input
                    type="checkbox"
                    checked={reportIndicators.untrustedCertificate}
                    onChange={() => handleToggleIndicator('untrustedCertificate')}
                    className="mt-0.5 rounded text-red-600 focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <span className="font-semibold text-gray-900 block">
                      Browser Security Warning / Untrusted Host
                    </span>
                    <span className="text-gray-500 text-[11px]">
                      Security indicator marks connection as unverified or not secure
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-gray-50 cursor-pointer border border-gray-100">
                  <input
                    type="checkbox"
                    checked={reportIndicators.credentialHarvestingFields}
                    onChange={() => handleToggleIndicator('credentialHarvestingFields')}
                    className="mt-0.5 rounded text-red-600 focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <span className="font-semibold text-gray-900 block">
                      Credential / OTP Harvesting Form
                    </span>
                    <span className="text-gray-500 text-[11px]">
                      Webpage solicits password or two-factor code unexpectedly
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-gray-50 cursor-pointer border border-gray-100">
                  <input
                    type="checkbox"
                    checked={reportIndicators.artificialUrgencyNotice}
                    onChange={() => handleToggleIndicator('artificialUrgencyNotice')}
                    className="mt-0.5 rounded text-red-600 focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <span className="font-semibold text-gray-900 block">
                      Artificial Urgency / Account Suspension Threat
                    </span>
                    <span className="text-gray-500 text-[11px]">
                      Threatens immediate account lock to induce panic
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-gray-50 cursor-pointer border border-gray-100">
                  <input
                    type="checkbox"
                    checked={reportIndicators.portalImpersonation}
                    onChange={() => handleToggleIndicator('portalImpersonation')}
                    className="mt-0.5 rounded text-red-600 focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <span className="font-semibold text-gray-900 block">
                      Visual Identity Impersonation
                    </span>
                    <span className="text-gray-500 text-[11px]">
                      Copies university / institutional logos and branding
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
                  placeholder="Additional context about this phishing site..."
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
      {/* 5. SAFE EXIT MODAL                                             */}
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
              Exit Website Simulation?
            </h3>
            <p className="text-xs text-gray-600 mb-5 leading-relaxed">
              You are terminating this virtual browser simulation. Your interaction telemetry will be finalized.
            </p>
            <div className="flex items-center justify-center gap-2.5">
              <button
                onClick={() => setIsSafeExitModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Continue Browsing
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
