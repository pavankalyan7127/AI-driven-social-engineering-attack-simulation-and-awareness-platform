import React, { useState, useMemo } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Search,
  Sparkles,
  HelpCircle,
  Eye,
  Info,
  ChevronDown,
  ChevronUp,
  XCircle,
  Loader2
} from 'lucide-react';
import SimulationRenderer from '../simulation/SimulationRenderer';

/**
 * Sanitizes contact/sender/caller names to remove spoiler meta-tags like "(Impersonator)",
 * "(Attacker)", "(Fake)", "(Scammer)", etc. that real-world platforms never display.
 */
export function cleanContactName(name) {
  if (!name || typeof name !== 'string') return name || '';
  return name
    .replace(/\s*[\(\[\{](?:impersonator|impersonation|attacker|scammer|scam|fake|phishing|phisher|spoofed|malicious|fraudster|unverified|hacker|bot)[\)\]\}]/gi, '')
    .replace(/\s*-\s*(?:impersonator|impersonation|attacker|scammer|scam|fake|phishing|phisher|spoofed|malicious|fraudster|unverified|hacker|bot)/gi, '')
    .trim();
}

/**
 * Cyber Detective Mode - 3-Round Interactive Triage Challenge Runner.
 * 
 * In this mode, the user is presented with 3 distinct communications (Round 1, Round 2, Round 3).
 * Each can be either REAL (Legitimate) or FAKE (Malicious Attack).
 * The user investigates and decides: [ Mark as Legitimate ] or [ Flag / Report as Attack ].
 */
export default function DetectiveChallengeView({
  challenge,
  onFinishChallenge,
  onExit
}) {
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [selectedVerdict, setSelectedVerdict] = useState(null); // 'legitimate' | 'attack'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [showCheatSheetDrawer, setShowCheatSheetDrawer] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const rounds = challenge?.rounds || [];
  const currentRound = rounds[currentRoundIndex] || null;
  const isLastRound = currentRoundIndex === rounds.length - 1;
  const totalRounds = rounds.length || 3;

  // Handle user picking a verdict for the current round
  const handleSelectVerdict = (verdict) => {
    setSelectedVerdict(verdict);
  };

  // Proceed to next round or submit final evaluation
  const handleConfirmVerdict = async () => {
    if (!selectedVerdict || !currentRound) return;

    const updatedAnswers = [
      ...answers.filter((a) => a.roundNumber !== currentRound.roundNumber),
      {
        roundNumber: currentRound.roundNumber,
        userVerdict: selectedVerdict
      }
    ];
    setAnswers(updatedAnswers);

    if (!isLastRound) {
      setCurrentRoundIndex((prev) => prev + 1);
      setSelectedVerdict(null);
    } else {
      // Final round completed: submit answers to backend for forensic scoring
      setIsSubmitting(true);
      setSubmitError(null);

      try {
        const res = await fetch('/api/detective/score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            challengeId: challenge.challengeId,
            channel: challenge.channel,
            scenarioTitle: challenge.scenarioTitle,
            rounds: challenge.rounds,
            answers: updatedAnswers
          })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to score detective challenge');
        }

        if (onFinishChallenge) {
          onFinishChallenge(data.report, challenge);
        }
      } catch (err) {
        console.error('[Detective Evaluation Error]:', err);
        setSubmitError(err.message || 'Error evaluating detective challenge. Please try again.');
        setIsSubmitting(false);
      }
    }
  };

  if (!currentRound) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-gray-200 p-6">
        <div className="text-center space-y-4">
          <p className="text-gray-400">No detective rounds available for this challenge.</p>
          <button
            onClick={onExit}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
          >
            Return to Generator
          </button>
        </div>
      </div>
    );
  }

  // Determine resolved channel and platform first
  const isWhatsApp =
    challenge.channel === 'whatsapp' ||
    currentRound.scenarioData?.channel === 'whatsapp' ||
    (challenge.channel === 'chat' && /\b(?:whatsapp|wa)\b/i.test(`${challenge.scenarioTitle || ''} ${challenge.topic || ''} ${currentRound.title || ''}`));

  const isInstagram =
    challenge.channel === 'instagram' ||
    currentRound.scenarioData?.channel === 'instagram' ||
    (/\b(?:instagram|insta|ig)\b/i.test(`${challenge.channel || ''} ${challenge.scenarioTitle || ''} ${challenge.topic || ''} ${currentRound.title || ''}`));

  const isTelegram =
    challenge.channel === 'telegram' ||
    currentRound.scenarioData?.channel === 'telegram' ||
    (/\b(?:telegram|tg)\b/i.test(`${challenge.channel || ''} ${challenge.scenarioTitle || ''} ${challenge.topic || ''} ${currentRound.title || ''}`));

  let channelToUse = challenge.channel || 'email';
  let platformToUse = currentRound.scenarioData?.platform || challenge.platform;

  if (isWhatsApp) {
    channelToUse = 'whatsapp';
    platformToUse = 'whatsapp_web';
  } else if (isInstagram) {
    channelToUse = 'instagram';
    platformToUse = 'instagram_direct';
  } else if (isTelegram) {
    channelToUse = 'telegram';
    platformToUse = 'telegram_web';
  }

  const isChatLike =
    channelToUse === 'sms' ||
    channelToUse === 'chat' ||
    channelToUse === 'whatsapp' ||
    channelToUse === 'instagram' ||
    channelToUse === 'telegram';

  // Prepare normalized scenario object for SimulationRenderer
  const rawEmailData = currentRound.scenarioData?.emailData;
  const normalizedEmailData = rawEmailData ? {
    ...rawEmailData,
    senderName: cleanContactName(rawEmailData.sender?.name || rawEmailData.senderName || rawEmailData.fromName || 'Sender'),
    senderEmail: rawEmailData.sender?.email || rawEmailData.senderEmail || rawEmailData.fromEmail || 'sender@example.com',
    sender: {
      name: cleanContactName(rawEmailData.sender?.name || rawEmailData.senderName || rawEmailData.fromName || 'Sender'),
      email: rawEmailData.sender?.email || rawEmailData.senderEmail || rawEmailData.fromEmail || 'sender@example.com',
      avatarBg: rawEmailData.sender?.avatarBg || (currentRound.type === 'REAL' ? 'bg-emerald-700 text-white' : 'bg-red-700 text-white'),
      avatar: rawEmailData.sender?.avatar || (rawEmailData.sender?.name || rawEmailData.senderName || 'S').charAt(0).toUpperCase()
    }
  } : undefined;

  const isRealRound = currentRound.type === 'REAL';
  let rawConversations = currentRound.scenarioData?.conversations;
  if (!rawConversations && currentRound.scenarioData?.conversation) {
    rawConversations = [currentRound.scenarioData.conversation];
  }
  if (!rawConversations && Array.isArray(currentRound.scenarioData?.messages) && currentRound.scenarioData.messages.length > 0) {
    rawConversations = [{
      id: 'conv-target-fallback',
      isTarget: true,
      contactName: currentRound.scenarioData.contactName || currentRound.scenarioData.senderName || currentRound.scenarioData.callerName || 'Contact',
      messages: currentRound.scenarioData.messages
    }];
  }
  if (!rawConversations && isChatLike) {
    const singleMsg = currentRound.scenarioData?.callerSpeech || currentRound.scenarioData?.openingLine || currentRound.scenarioData?.body || currentRound.scenarioData?.text;
    if (singleMsg) {
      rawConversations = [{
        id: 'conv-target-fallback',
        isTarget: true,
        contactName: currentRound.scenarioData?.contactName || currentRound.scenarioData?.callerName || (channelToUse === 'instagram' ? 'Meta Support' : 'Contact'),
        messages: [{
          id: 'm-fallback-1',
          sender: 'contact',
          text: singleMsg,
          timestamp: '10:00 AM'
        }]
      }];
    }
  }

  const normalizedConversations = Array.isArray(rawConversations) ? rawConversations.map((c) => {
    const contactName = cleanContactName(c.contact?.name || c.contactName || c.sender?.name || 'Contact');
    const phoneNumber = c.contact?.phone || c.phoneNumber || c.sender?.phoneNumber || '+91 94421 88902';
    const isVerified = c.isVerified !== undefined
      ? Boolean(c.isVerified)
      : (c.contact?.isVerified !== undefined ? Boolean(c.contact.isVerified) : isRealRound);
    return {
      ...c,
      contactName,
      phoneNumber,
      isVerified,
      contact: {
        name: contactName,
        phone: phoneNumber,
        avatar: c.contact?.avatar || (contactName || 'C').charAt(0).toUpperCase(),
        avatarBg: c.contact?.avatarBg || (isVerified ? 'bg-emerald-700 text-white' : 'bg-red-700 text-white'),
        status: c.contact?.status || (isVerified ? 'Official business account' : 'online'),
        about: c.contact?.about || (isVerified ? 'Official Verified Business Account' : 'Hey there! I am using WhatsApp.'),
        ...(c.contact || {}),
        isVerified
      },
      sender: {
        name: contactName,
        phoneNumber,
        avatar: c.sender?.avatar || (contactName || 'S').charAt(0).toUpperCase(),
        ...(c.sender || {}),
        isVerified,
        verificationStatus: isVerified ? 'Verified Official' : 'Unverified Sender'
      }
    };
  }) : undefined;

  const rawCallData = currentRound.scenarioData?.callData || currentRound.scenarioData?.callerInfo || (channelToUse === 'call' || currentRound.scenarioData?.callerName ? currentRound.scenarioData : undefined);
  const initialCallerSpeech = rawCallData?.callerSpeech || rawCallData?.openingLine || 'Hello, I am calling regarding suspicious activity on your account.';
  const normalizedCallData = rawCallData ? {
    id: rawCallData.id || `call-det-${currentRound.roundNumber}`,
    callerName: cleanContactName(rawCallData.callerName || rawCallData.name || 'Bank Fraud Prevention'),
    callerNumber: rawCallData.callerNumber || rawCallData.number || '+1 (800) 555-0199',
    location: rawCallData.location || (currentRound.type === 'REAL' ? 'Verified Official Line' : 'Suspected Spoofed Line'),
    openingLine: initialCallerSpeech,
    callerSpeech: initialCallerSpeech,
    personaContext: rawCallData.personaContext || (currentRound.type === 'REAL' ? 'Official automated fraud notification' : 'Fraud prevention imposter'),
    targetInformation: rawCallData.targetInformation || (currentRound.type === 'REAL' ? 'No confidential data requested' : '16-digit card number and CVV')
  } : undefined;

  const rawPages = currentRound.scenarioData?.pages;
  const normalizedPages = rawPages && typeof rawPages === 'object' ? Object.fromEntries(
    Object.entries(rawPages).map(([pageId, page]) => {
      let pageUrl = page.url || `https://intranet.company.com/${pageId}`;
      if (isRealRound) {
        pageUrl = pageUrl.replace(/^http:\/\//i, 'https://');
        if (!/^https?:\/\//i.test(pageUrl)) {
          pageUrl = `https://${pageUrl}`;
        }
      }
      return [
        pageId,
        {
          ...page,
          url: pageUrl,
          isTargetPhish: isRealRound ? false : (page.isTargetPhish ?? true)
        }
      ];
    })
  ) : undefined;

  const normalizedBrowserConfig = {
    ...(currentRound.scenarioData?.browserConfig || {}),
    securityStatus: isRealRound ? 'secure' : (currentRound.scenarioData?.browserConfig?.securityStatus || 'unsecured')
  };

  const scenarioForSimulation = useMemo(() => ({
    scenarioId: `det-sim-r${currentRound.roundNumber}-${currentRound.type}`,
    channel: channelToUse,
    platform: platformToUse,
    title: currentRound.title || `Round ${currentRound.roundNumber}`,
    category: 'Detective Triage',
    difficulty: 'Challenge',
    mode: 'detective',
    isDetective: true,
    isDetectiveMode: true,
    isReal: isRealRound,
    isLegitimate: isRealRound,
    isVerified: isRealRound,
    contactName: currentRound.scenarioData?.contactName || normalizedConversations?.[0]?.contactName,
    initialView: isChatLike
      ? 'chat'
      : (channelToUse === 'call' ? 'incoming' : 'email'),
    ...currentRound.scenarioData,
    ...(normalizedEmailData ? { emailData: normalizedEmailData } : {}),
    ...(normalizedConversations ? { conversations: normalizedConversations } : {}),
    ...(normalizedCallData ? { callData: normalizedCallData } : {}),
    ...(normalizedPages ? { pages: normalizedPages, browserConfig: normalizedBrowserConfig } : {})
  }), [
    currentRound.roundNumber,
    currentRound.type,
    currentRound.title,
    currentRound.scenarioData,
    channelToUse,
    platformToUse,
    isRealRound,
    isChatLike,
    normalizedEmailData,
    normalizedConversations,
    normalizedCallData,
    normalizedPages,
    normalizedBrowserConfig
  ]);

  return (
    <div
      data-testid="detective-challenge-view"
      className="flex flex-col h-screen w-screen overflow-hidden bg-gray-950 font-sans text-gray-100"
    >
      {/* Top Detective Host Header */}
      <header className="h-14 bg-gray-900 border-b border-gray-800 px-4 sm:px-6 flex items-center justify-between text-xs shrink-0 z-30 shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowExitConfirm(true)}
            data-testid="detective-exit-btn"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition-colors font-medium text-xs cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-blue-400" />
            <span>Exit Mode</span>
          </button>

          <span className="h-4 w-px bg-gray-800" />

          {/* Mode Pill Badge */}
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-950/80 text-amber-300 border border-amber-800/80 tracking-wide">
              <Search className="w-3.5 h-3.5 text-amber-400" />
              <span>Cyber Detective Mode</span>
            </span>

            <span className="hidden sm:inline-block text-gray-400 text-xs truncate max-w-xs font-medium">
              {challenge.scenarioTitle || 'Real vs. Fake Triage Challenge'}
            </span>
          </div>
        </div>

        {/* Stepper Indicator */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-400 font-mono">
              Round <strong className="text-white text-xs">{currentRoundIndex + 1}</strong> of {totalRounds}
            </span>
            <div className="flex gap-1.5">
              {rounds.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    idx === currentRoundIndex
                      ? 'w-6 bg-blue-500'
                      : idx < currentRoundIndex
                      ? 'w-2 bg-emerald-500'
                      : 'w-2 bg-gray-700'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Inspection Guide Toggle */}
          <button
            onClick={() => setShowCheatSheetDrawer((prev) => !prev)}
            data-testid="toggle-cheatsheet-btn"
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-800/80 hover:bg-gray-700 text-gray-300 border border-gray-700 text-[11px] transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
            <span>Clues Guide</span>
            {showCheatSheetDrawer ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </header>

      {/* Main Simulation Viewport */}
      <div className="flex-1 overflow-hidden relative flex items-center justify-center bg-gray-900">
        <div
          key={`round-container-${currentRound.roundNumber}-${currentRoundIndex}`}
          data-testid="detective-round-container"
          className={`h-full transition-all duration-300 ${
            channelToUse === 'sms' || channelToUse === 'call'
              ? 'w-full max-w-[420px] shadow-2xl border-x border-gray-800 my-auto rounded-xl overflow-hidden'
              : 'w-full'
          }`}
        >
          <SimulationRenderer
            key={`sim-renderer-r${currentRound.roundNumber}-${currentRoundIndex}`}
            scenario={scenarioForSimulation}
            sessionId={`sess-det-${challenge?.challengeId || 'chall'}-r${currentRound.roundNumber}`}
            deviceMode="full"
            onAction={() => {}}
            onComplete={() => {}}
          />
        </div>

        {/* Clues Cheat-Sheet Overlay Drawer */}
        {showCheatSheetDrawer && challenge.channelCheatSheet && (
          <div
            data-testid="detective-cheatsheet-drawer"
            className="absolute top-3 right-3 z-40 w-80 max-h-[85%] bg-gray-950/95 border border-gray-800 rounded-xl shadow-2xl p-4 flex flex-col text-xs text-gray-300 backdrop-blur-md overflow-y-auto space-y-3"
          >
            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-blue-400" />
                <span>{challenge.channel.toUpperCase()} Inspection Guide</span>
              </span>
              <button
                onClick={() => setShowCheatSheetDrawer(false)}
                className="text-gray-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1.5">
              <span className="font-semibold text-gray-200">What to inspect:</span>
              <ul className="list-disc pl-4 space-y-1 text-gray-400 text-[11px]">
                {challenge.channelCheatSheet.whatToLookFor?.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-900/40 space-y-1">
              <span className="font-semibold text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Authentic Signs</span>
              </span>
              <ul className="list-disc pl-4 space-y-0.5 text-emerald-200/80 text-[11px]">
                {challenge.channelCheatSheet.realMarkers?.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-900/40 space-y-1">
              <span className="font-semibold text-red-400 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Attack Red Flags</span>
              </span>
              <ul className="list-disc pl-4 space-y-0.5 text-red-200/80 text-[11px]">
                {challenge.channelCheatSheet.fakeMarkers?.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Detective Verdict Bar */}
      <footer className="bg-gray-950 border-t border-gray-800 px-4 py-3 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 z-30 shadow-2xl">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-semibold text-gray-300">
            Triage Decision: Inspect the communication above and choose your verdict.
          </span>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Button 1: Mark as Legitimate */}
          <button
            type="button"
            data-testid="verdict-legitimate-btn"
            onClick={() => handleSelectVerdict('legitimate')}
            disabled={isSubmitting}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md border ${
              selectedVerdict === 'legitimate'
                ? 'bg-emerald-600 text-white border-emerald-400 ring-2 ring-emerald-500/50 scale-[1.02]'
                : 'bg-gray-900 hover:bg-emerald-950/60 text-emerald-300 border-emerald-800/80 hover:border-emerald-600'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Mark as Legitimate (Safe)</span>
          </button>

          {/* Button 2: Report as Attack */}
          <button
            type="button"
            data-testid="verdict-attack-btn"
            onClick={() => handleSelectVerdict('attack')}
            disabled={isSubmitting}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md border ${
              selectedVerdict === 'attack'
                ? 'bg-red-600 text-white border-red-400 ring-2 ring-red-500/50 scale-[1.02]'
                : 'bg-gray-900 hover:bg-red-950/60 text-red-300 border-red-800/80 hover:border-red-600'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-red-400" />
            <span>Flag / Report as Attack</span>
          </button>

          {/* Confirm & Advance Button */}
          <button
            type="button"
            data-testid="confirm-verdict-btn"
            onClick={handleConfirmVerdict}
            disabled={!selectedVerdict || isSubmitting}
            className={`flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg ${
              selectedVerdict && !isSubmitting
                ? 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer shadow-blue-600/30'
                : 'bg-gray-800 text-gray-500 border border-gray-700/60 cursor-not-allowed opacity-60'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Evaluating...</span>
              </>
            ) : isLastRound ? (
              <>
                <span>Submit Final Triage</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
              </>
            ) : (
              <>
                <span>Next Round</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </footer>

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-950/80 border border-amber-700/60 flex items-center justify-center text-amber-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Exit Detective Challenge?</h3>
                <p className="text-xs text-gray-400">Current triage progress will be lost.</p>
              </div>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed bg-gray-950/60 p-3 rounded-lg border border-gray-800">
              Are you sure you want to exit? You can return to the generator anytime to launch a new challenge or standard simulation.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 transition-colors"
              >
                Resume Challenge
              </button>
              <button
                type="button"
                data-testid="confirm-exit-detective-btn"
                onClick={onExit}
                className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-red-600 hover:bg-red-500 transition-colors"
              >
                Exit to Generator
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
