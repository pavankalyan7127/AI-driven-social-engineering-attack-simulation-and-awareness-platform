import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Grid,
  ShieldAlert,
  AlertTriangle,
  X,
  Clock,
  Wifi,
  Battery,
  Signal,
  User,
  UserPlus,
  Users,
  Video,
  Circle,
  ChevronDown,
  ChevronUp,
  Send,
  RotateCcw
} from 'lucide-react';

/**
 * Standard telephone dialpad layout matching native smartphone dialer (Image 3)
 */
const DIALPAD_KEYS = [
  { digit: '1', letters: '' },
  { digit: '2', letters: 'ABC' },
  { digit: '3', letters: 'DEF' },
  { digit: '4', letters: 'GHI' },
  { digit: '5', letters: 'JKL' },
  { digit: '6', letters: 'MNO' },
  { digit: '7', letters: 'PQRS' },
  { digit: '8', letters: 'TUV' },
  { digit: '9', letters: 'WXYZ' },
  { digit: '*', letters: '' },
  { digit: '0', letters: '+' },
  { digit: '#', letters: '' }
];

export default function VoiceCallSimulation({
  scenario,
  sessionId,
  onAction,
  onComplete
}) {
  // Graceful fallback for invalid/missing scenario
  if (!scenario || !scenario.callData) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-gray-950 text-gray-300">
        <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Call Scenario Unavailable</h2>
        <p className="text-sm text-gray-400">
          The requested phone call simulation data could not be loaded.
        </p>
      </div>
    );
  }

  const { callData, scenarioId } = scenario;
  const initialView = scenario.initialView || 'incoming';

  // Detective Mode Detection: In Cyber Detective Mode, the call speaks once and does NOT listen
  const isDetectiveMode = Boolean(
    scenario.isDetective ||
    scenario.isDetectiveMode ||
    scenario.mode === 'detective' ||
    scenario.category === 'Detective Triage' ||
    String(scenario.scenarioId || '').startsWith('det-')
  );

  // State Management
  const [callState, setCallState] = useState(initialView); // 'incoming' | 'connected' | 'ended'
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [showKeypad, setShowKeypad] = useState(false);
  const [keypadInput, setKeypadInput] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [showQuickPresets, setShowQuickPresets] = useState(false);
  const [dialogueHistory, setDialogueHistory] = useState([]);
  const [userTextInput, setUserTextInput] = useState('');
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [isAttackerSpeaking, setIsAttackerSpeaking] = useState(false);
  const [speechError, setSpeechError] = useState(null);

  // Sync refs to avoid stale closures in Web Speech async events
  const isListeningRef = useRef(false);
  const isAttackerSpeakingRef = useRef(false);
  const isAiRespondingRef = useRef(false);
  const callStateRef = useRef(callState);
  const isMutedRef = useRef(isMuted);
  const silenceTimerRef = useRef(null);
  const speechBufferRef = useRef('');

  useEffect(() => { callStateRef.current = callState; }, [callState]);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  useEffect(() => { isAiRespondingRef.current = isAiResponding; }, [isAiResponding]);

  // Audio Context ref for DTMF touch tones
  const audioCtxRef = useRef(null);
  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const hasEmittedViewed = useRef(false);
  const onActionRef = useRef(onAction);

  useEffect(() => { onActionRef.current = onAction; }, [onAction]);

  // Helper to emit telemetry events safely
  const emitEvent = useCallback((eventType, metadata = {}) => {
    if (typeof onActionRef.current === 'function') {
      onActionRef.current({
        eventType,
        scenarioId: scenario.scenarioId,
        sessionId,
        targetId: callData.id || 'call-target-1',
        timestamp: new Date().toISOString(),
        metadata: {
          channel: 'call',
          callState: callStateRef.current,
          callerNumber: callData.callerNumber,
          callerName: callData.callerName,
          ...metadata
        }
      });
    }
  }, [callData.callerName, callData.callerNumber, callData.id, scenario.scenarioId, sessionId]);

  // Initial mount: dispatch scenario_viewed exactly once
  useEffect(() => {
    if (!hasEmittedViewed.current) {
      hasEmittedViewed.current = true;
      emitEvent('scenario_viewed', {
        initialView,
        category: scenario.category,
        difficulty: scenario.difficulty
      });
    }
  }, [emitEvent, initialView, scenario.category, scenario.difficulty]);

  // Timer for active call duration
  useEffect(() => {
    if (callState === 'connected') {
      timerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callState]);

  // DTMF Tone Generator via Web Audio API
  const playDtmfTone = (key) => {
    try {
      if (!audioCtxRef.current) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          audioCtxRef.current = new AudioContext();
        }
      }
      if (!audioCtxRef.current) return;
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }

      const freqs = {
        '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
        '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
        '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
        '*': [941, 1209], '0': [941, 1336], '#': [941, 1477]
      }[key] || [800, 1300];

      const osc1 = audioCtxRef.current.createOscillator();
      const osc2 = audioCtxRef.current.createOscillator();
      const gain = audioCtxRef.current.createGain();

      osc1.frequency.value = freqs[0];
      osc2.frequency.value = freqs[1];
      gain.gain.value = 0.1;

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(audioCtxRef.current.destination);

      const now = audioCtxRef.current.currentTime;
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.15);
      osc2.stop(now + 0.15);
    } catch (_) {}
  };

  // Safe STT start helper (Standard Simulation Mode ONLY)
  const startListeningAutomatically = useCallback(() => {
    // In Cyber Detective Mode, the call only speaks once and NEVER listens
    if (isDetectiveMode) {
      return;
    }

    if (
      callStateRef.current !== 'connected' ||
      isMutedRef.current ||
      isAttackerSpeakingRef.current ||
      isAiRespondingRef.current ||
      !recognitionRef.current
    ) {
      return;
    }

    try {
      if (!isListeningRef.current) {
        speechBufferRef.current = '';
        recognitionRef.current.start();
      }
    } catch (e) {
      // recognition already active or warming up
    }
  }, [isDetectiveMode]);

  // Safe STT stop helper
  const stopListeningImmediately = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recognitionRef.current && isListeningRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
    }
    setIsListening(false);
    setIsUserSpeaking(false);
    isListeningRef.current = false;
  }, []);

  // Web Speech Synthesis (TTS) Helper:
  // When AI finished speaking, automatically turns on user microphone!
  const speakText = useCallback((text) => {
    // 1. Immediately turn off mic while attacker is talking to prevent feedback
    stopListeningImmediately();
    setIsAttackerSpeaking(true);
    isAttackerSpeakingRef.current = true;

    if (!ttsEnabled || typeof window === 'undefined' || !window.speechSynthesis) {
      setTimeout(() => {
        setIsAttackerSpeaking(false);
        isAttackerSpeakingRef.current = false;
        speechBufferRef.current = '';
        if (!isDetectiveMode) {
          startListeningAutomatically();
        }
      }, 800);
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 0.95; // Authoritative tone

      // Multilingual voice synthesis tag for Indian regional languages
      if (/[\u0B80-\u0BFF]/.test(text) || scenario?.language === 'Tamil') {
        utterance.lang = 'ta-IN';
      } else if (/[\u0C00-\u0C7F]/.test(text) || scenario?.language === 'Telugu') {
        utterance.lang = 'te-IN';
      } else if (/[\u0900-\u097F]/.test(text) || scenario?.language === 'Hindi') {
        utterance.lang = 'hi-IN';
      } else if (/[\u0C80-\u0CFF]/.test(text) || scenario?.language === 'Kannada') {
        utterance.lang = 'kn-IN';
      } else if (/[\u0D00-\u0D7F]/.test(text) || scenario?.language === 'Malayalam') {
        utterance.lang = 'ml-IN';
      } else {
        utterance.lang = 'en-US';
      }

      utterance.onstart = () => {
        setIsAttackerSpeaking(true);
        isAttackerSpeakingRef.current = true;
        stopListeningImmediately();
      };

      const handleSpeechDone = () => {
        setIsAttackerSpeaking(false);
        isAttackerSpeakingRef.current = false;
        speechBufferRef.current = '';

        // In Cyber Detective Mode, the call strictly speaks once. It does NOT listen.
        if (isDetectiveMode) {
          return;
        }

        // Buffer pause of 650ms so browser speaker audio doesn't loop back into microphone!
        setTimeout(() => {
          if (callStateRef.current === 'connected' && !isMutedRef.current) {
            startListeningAutomatically();
          }
        }, 650);
      };

      utterance.onend = handleSpeechDone;
      utterance.onerror = handleSpeechDone;

      window.speechSynthesis.speak(utterance);
    } catch (_) {
      setIsAttackerSpeaking(false);
      isAttackerSpeakingRef.current = false;
      speechBufferRef.current = '';
      if (!isDetectiveMode) {
        startListeningAutomatically();
      }
    }
  }, [isDetectiveMode, startListeningAutomatically, stopListeningImmediately, ttsEnabled]);

  const hasSpokenInitialRef = useRef(false);
  const lastScenarioIdRef = useRef(null);

  // Synchronize call state across detective rounds
  useEffect(() => {
    const currentScenarioId = scenario?.scenarioId || scenario?.id || (scenario?.roundNumber ? `round-${scenario.roundNumber}` : null);
    if (lastScenarioIdRef.current && currentScenarioId && lastScenarioIdRef.current === currentScenarioId) {
      return;
    }
    lastScenarioIdRef.current = currentScenarioId;

    hasSpokenInitialRef.current = false;
    setCallState(scenario.initialView || 'incoming');
    setCallDuration(0);
    setDialogueHistory([]);
    setIsAttackerSpeaking(false);
    isAttackerSpeakingRef.current = false;
    stopListeningImmediately();
  }, [scenario, stopListeningImmediately]);

  // If call is already connected on mount / round transition, speak initial line once
  useEffect(() => {
    if (callState === 'connected' && !hasSpokenInitialRef.current) {
      hasSpokenInitialRef.current = true;
      const opening = callData.callerSpeech || callData.openingLine || 'Hello, this is fraud prevention calling regarding suspicious activity on your account.';
      const initialDialogue = [{ sender: 'caller', text: opening, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }];
      setDialogueHistory(initialDialogue);
      speakText(opening);
    }
  }, [callState, callData, speakText]);

  // Setup Web Speech Recognition (STT) on mount (Standard Simulation Mode ONLY)
  useEffect(() => {
    // In Cyber Detective Mode, the call only speaks once and never listens - do not start mic
    if (isDetectiveMode) {
      return;
    }

    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        // Keep listening continuously across pauses and words (does not abort prematurely)
        recognition.continuous = true;
        // Stream interim results as user speaks
        recognition.interimResults = true;
        // Configure language for SpeechRecognition based on scenario language / script
        if (/[\u0B80-\u0BFF]/.test(scenario?.title || scenario?.callerSpeech || '') || scenario?.language === 'Tamil') {
          recognition.lang = 'ta-IN';
        } else if (/[\u0C00-\u0C7F]/.test(scenario?.title || scenario?.callerSpeech || '') || scenario?.language === 'Telugu') {
          recognition.lang = 'te-IN';
        } else if (/[\u0900-\u097F]/.test(scenario?.title || scenario?.callerSpeech || '') || scenario?.language === 'Hindi') {
          recognition.lang = 'hi-IN';
        } else {
          recognition.lang = 'en-US';
        }

        recognition.onstart = () => {
          setIsListening(true);
          isListeningRef.current = true;
          setSpeechError(null);
        };

        recognition.onresult = (event) => {
          // Ignore any stray audio if attacker is speaking or AI is responding
          if (isAttackerSpeakingRef.current || isAiRespondingRef.current) {
            return;
          }

          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            const text = result[0]?.transcript || '';
            if (result.isFinal) {
              finalTranscript += text + ' ';
            } else {
              interimTranscript += text;
            }
          }

          if (finalTranscript) {
            speechBufferRef.current = (speechBufferRef.current + ' ' + finalTranscript).trim();
          }

          const currentCombined = (speechBufferRef.current + ' ' + interimTranscript).trim();

          // Only consider valid speech (ignore transient single-character glitches or clicks)
          if (currentCombined.length >= 2) {
            setIsUserSpeaking(true);

            // Reset silence timer on every spoken word/syllable
            if (silenceTimerRef.current) {
              clearTimeout(silenceTimerRef.current);
            }

            // Natural conversational silence debounce: Wait 1.8 seconds of silence before finalizing turn
            // This gives you plenty of time to speak complete sentences without being cut off!
            silenceTimerRef.current = setTimeout(() => {
              const fullSpeech = (speechBufferRef.current + ' ' + interimTranscript).trim();
              if (fullSpeech.length >= 2 && !isAiRespondingRef.current && !isAttackerSpeakingRef.current) {
                stopListeningImmediately();
                speechBufferRef.current = '';
                setIsUserSpeaking(false);
                handleUserSpeech(fullSpeech);
              }
            }, 1800);
          }
        };

        recognition.onerror = (e) => {
          // 'no-speech' is completely normal when user pauses or listens
          if (e.error !== 'no-speech') {
            console.warn('[Call Speech Recognition Warning]:', e.error);
          }
        };

        recognition.onend = () => {
          setIsListening(false);
          isListeningRef.current = false;
          setIsUserSpeaking(false);

          // If user had finished an utterance right as recognition ended, process it
          if (speechBufferRef.current.trim().length >= 2 && !isAiRespondingRef.current && !isAttackerSpeakingRef.current) {
            const textToSend = speechBufferRef.current.trim();
            speechBufferRef.current = '';
            handleUserSpeech(textToSend);
            return;
          }

          // In Cyber Detective Mode, never auto-resume listening
          if (isDetectiveMode) return;

          // If still in connected call, not muted, and attacker isn't talking, auto-resume listening
          if (
            callStateRef.current === 'connected' &&
            !isMutedRef.current &&
            !isAttackerSpeakingRef.current &&
            !isAiRespondingRef.current
          ) {
            setTimeout(() => {
              startListeningAutomatically();
            }, 300);
          }
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (_) {}
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [startListeningAutomatically, stopListeningImmediately]);

  // 1. Answer Incoming Call
  const handleAnswerCall = () => {
    hasSpokenInitialRef.current = true;
    setCallState('connected');
    emitEvent('call_answered', { callerName: callData.callerName, callerNumber: callData.callerNumber });

    // Initial Caller Opening Line
    const opening = callData.callerSpeech || callData.openingLine || 'Hello, this is fraud prevention calling regarding suspicious activity on your account.';
    const initialDialogue = [{ sender: 'caller', text: opening, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }];
    setDialogueHistory(initialDialogue);

    // Speak opening line - automatically turns on mic when finished!
    speakText(opening);
  };

  // 2. Reject Incoming Call (Positive Termination)
  const handleRejectCall = () => {
    setCallState('ended');
    emitEvent('call_rejected', { callerNumber: callData.callerNumber });

    if (typeof onComplete === 'function') {
      onComplete({
        status: 'safe_exit',
        action: 'call_rejected',
        scenarioId,
        sessionId,
        reason: 'User recognized suspicious incoming call and declined it.'
      });
    }
  };

  // 3. Hang up active call (Positive Safe Exit)
  const handleHangUp = () => {
    setCallState('ended');
    stopListeningImmediately();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    emitEvent('call_hung_up', { callDurationSeconds: callDuration });
    emitEvent('safe_exit', { reason: 'user_hung_up_call' });

    if (typeof onComplete === 'function') {
      onComplete({
        status: 'safe_exit',
        action: 'call_hung_up',
        scenarioId,
        sessionId,
        reason: 'User terminated call without giving into social engineering pressure.'
      });
    }
  };

  // 4. Report & Block Caller (Positive Threat Reporting)
  const handleConfirmReport = () => {
    setShowReportModal(false);
    setCallState('ended');
    stopListeningImmediately();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    emitEvent('user_blocked_sender', { blockedNumber: callData.callerNumber });
    emitEvent('threat_reported', { reportedTarget: true, channel: 'call', reportedNumber: callData.callerNumber });

    if (typeof onComplete === 'function') {
      onComplete({
        status: 'reported',
        action: 'threat_reported',
        scenarioId,
        sessionId,
        reason: 'User blocked and reported the fraudulent voice phishing call.'
      });
    }
  };

  // 5. User Speech / Message Processing Loop
  const handleUserSpeech = async (speechText) => {
    const trimmed = speechText.trim();
    if (!trimmed || isAiRespondingRef.current) return;

    stopListeningImmediately();
    setUserTextInput('');
    setSpeechError(null);

    const userTurn = {
      sender: 'user',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    const updatedHistory = [...dialogueHistory, userTurn];
    setDialogueHistory(updatedHistory);

    emitEvent('speech_input_provided', { speechText: trimmed });

    // Client-side instant sensitive info detection heuristic
    const hasCardNumbers = /\b(?:\d[ -]*?){12,19}\b/.test(trimmed);
    const hasPinDisclosure = /\b(?:\d[ -]*?){4,6}\b/.test(trimmed) && (
      trimmed.toLowerCase().includes('pin') ||
      trimmed.toLowerCase().includes('cvv') ||
      trimmed.toLowerCase().includes('code') ||
      trimmed.startsWith('[Entered PIN')
    );
    const isExplicitLeak =
      trimmed.toLowerCase().includes('4231') ||
      hasCardNumbers ||
      hasPinDisclosure;

    setIsAiResponding(true);
    isAiRespondingRef.current = true;

    // Detect active call language (Tamil, Telugu, Hindi, or English)
    const activeCallLanguage = scenario?.language || callData?.language || (
      /[\u0B80-\u0BFF]/.test(callData?.callerSpeech || '') || /[\u0B80-\u0BFF]/.test(scenario?.title || '') ? 'Tamil' :
      /[\u0C00-\u0C7F]/.test(callData?.callerSpeech || '') || /[\u0C00-\u0C7F]/.test(scenario?.title || '') ? 'Telugu' :
      /[\u0900-\u097F]/.test(callData?.callerSpeech || '') || /[\u0900-\u097F]/.test(scenario?.title || '') ? 'Hindi' : 'English'
    );

    try {
      const res = await fetch('/api/scenarios/call/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userSpeech: trimmed,
          dialogueHistory: updatedHistory,
          callerName: callData.callerName,
          personaContext: callData.personaContext,
          targetInformation: callData.targetInformation,
          language: activeCallLanguage
        })
      });

      const data = await res.json();
      const regionalFallbacks = {
        Tamil: 'உங்கள் கணக்கு முடக்கப்படாமல் இருக்க உடனடியாக விவரங்களை சரிபார்க்கவும்.',
        Telugu: 'మీ ఖాతా రద్దు కాకుండా ఉండటానికి వెంటనే మీ వివరాలను ధృవీకరించండి.',
        Hindi: 'अपना खाता ब्लॉक होने से बचाने के लिए कृपया तुरंत विवरण सत्यापित करें।'
      };
      const defaultFallback = regionalFallbacks[activeCallLanguage] || "I need your credentials confirmed immediately to prevent account suspension.";
      const attackerReply = data.attackerSpeech || defaultFallback;
      const sensitiveDisclosed = Boolean(data.sensitiveInfoDisclosed || isExplicitLeak);

      setDialogueHistory(prev => [
        ...prev,
        {
          sender: 'caller',
          text: attackerReply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);

      // Speak attacker response - will auto-resume listening when finished!
      speakText(attackerReply);

      // Check for Negative Outcome: Sensitive Information Disclosed
      if (sensitiveDisclosed) {
        emitEvent('sensitive_info_disclosed', { userSpeech: trimmed, reason: data.explanation || 'Disclosed credentials to imposter caller.', channel: 'call', method: 'spoken_voice' });
        emitEvent('credential_submitted', { channel: 'call', method: 'spoken_voice' });

        setTimeout(() => {
          setCallState('ended');
          if (typeof onComplete === 'function') {
            onComplete({
              status: 'completed',
              action: 'credential_submitted',
              scenarioId,
              sessionId,
              sensitiveInfoDisclosed: true,
              reason: 'User disclosed card/PIN credentials during the voice phishing call.'
            });
          }
        }, 1200);
      }
    } catch (_) {
      const fallbackReply = "Sir, this is an official banking alert. If you do not verify your information, we will freeze your account.";
      speakText(fallbackReply);

      if (isExplicitLeak) {
        emitEvent('sensitive_info_disclosed', { userSpeech: trimmed, reason: 'Disclosed credentials to imposter caller.', channel: 'call', method: 'spoken_voice' });
        emitEvent('credential_submitted', { channel: 'call', method: 'spoken_voice' });
        setTimeout(() => {
          setCallState('ended');
          if (typeof onComplete === 'function') {
            onComplete({
              status: 'completed',
              action: 'credential_submitted',
              scenarioId,
              sessionId,
              reason: 'User disclosed credentials during phone call.'
            });
          }
        }, 1200);
      }
    } finally {
      setIsAiResponding(false);
      isAiRespondingRef.current = false;
    }
  };

  // Toggle Mute
  const handleToggleMute = () => {
    setIsMuted(prev => {
      const next = !prev;
      if (next) {
        stopListeningImmediately();
      } else {
        startListeningAutomatically();
      }
      return next;
    });
  };

  // Handle Keypad Digit Press
  const handleKeypadPress = (digit) => {
    playDtmfTone(digit);
    const updatedInput = keypadInput + digit;
    setKeypadInput(updatedInput);

    emitEvent('dtmf_keypad_pressed', { digit, currentInputLength: updatedInput.length });

    // If user enters 4 or more digits on keypad when PIN or card is requested
    if (updatedInput.length >= 4) {
      setTimeout(() => {
        handleUserSpeech(`[Entered PIN / Digits on Dial Pad: ${updatedInput}]`);
        setKeypadInput('');
      }, 400);
    }
  };

  // Preset response options for quick testing
  const presetResponses = [
    { label: "🛡️ I refuse to share details over the phone", text: "I refuse to give out my credit card details or PIN over an incoming phone call." },
    { label: "❓ What is your employee badge number?", text: "What is your official employee badge number and branch location? I will call the bank directly." },
    { label: "⚠️ [Leak Card] 4231-5555-8888-1234", text: "Okay, my credit card number is 4231 5555 8888 1234." },
    { label: "⚠️ [Leak PIN] My PIN is 4920", text: "My card security PIN is 4920." }
  ];

  // Format call duration MM:SS
  const formattedDuration = useMemo(() => {
    const mins = Math.floor(callDuration / 60);
    const secs = callDuration % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, [callDuration]);

  // Dynamic status text for caller line matching Image 2
  const activeStatusText = useMemo(() => {
    if (isAttackerSpeaking) return 'Speaking...';
    if (isDetectiveMode) {
      return callDuration > 0 ? formattedDuration : 'Connected';
    }
    if (isAiResponding) return 'Calling...';
    if (isMuted) return 'Muted';
    if (isListening) {
      return isUserSpeaking ? 'Listening to you...' : 'Listening...';
    }
    return callDuration > 0 ? formattedDuration : 'Calling...';
  }, [callDuration, formattedDuration, isAiResponding, isAttackerSpeaking, isDetectiveMode, isListening, isMuted, isUserSpeaking]);

  return (
    <div
      data-testid="voice-call-simulation"
      className="flex flex-col h-full w-full bg-[#111215] text-white select-none overflow-hidden font-sans relative"
    >
      {/* ============================================================== */}
      {/* NATIVE SMARTPHONE STATUS BAR                                    */}
      {/* ============================================================== */}
      <div className="h-10 px-6 flex items-center justify-between text-xs text-gray-300 font-semibold shrink-0 z-20">
        <span>9:41</span>
        <div className="w-24 h-4 bg-black rounded-full mx-auto" />
        <div className="flex items-center gap-1.5 text-gray-400">
          <Signal className="w-3.5 h-3.5" />
          <Wifi className="w-3.5 h-3.5" />
          <Battery className="w-4 h-4" />
        </div>
      </div>

      {/* Top Discreet Bar: Report/Block and Audio status */}
      <div className="px-5 py-0.5 flex items-center justify-between text-xs shrink-0 z-20">
        <button
          onClick={() => setTtsEnabled(prev => !prev)}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] transition-colors ${
            ttsEnabled
              ? 'bg-zinc-800/80 border-zinc-700 text-zinc-300'
              : 'bg-zinc-900 border-zinc-800 text-zinc-500'
          }`}
          title="Toggle voice speech"
        >
          {ttsEnabled ? <Volume2 className="w-2.5 h-2.5 text-sky-400" /> : <VolumeX className="w-2.5 h-2.5" />}
          <span>{ttsEnabled ? 'Voice On' : 'Muted'}</span>
        </button>

        <button
          onClick={() => setShowReportModal(true)}
          data-testid="call-report-spam-btn"
          className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-950/70 border border-red-800/80 text-red-300 text-[11px] hover:bg-red-900 transition-colors cursor-pointer"
        >
          <ShieldAlert className="w-3 h-3 text-red-400" />
          <span>Report / Block</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* SCREEN 1: INCOMING CALL VIEW                                   */}
      {/* ============================================================== */}
      {callState === 'incoming' && (
        <div className="flex-1 flex flex-col items-center justify-between px-6 py-8 relative overflow-hidden animate-in fade-in duration-300">
          {/* Animated concentric ringing waves */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
            <div className="w-64 h-64 rounded-full border border-red-500 animate-ping duration-1000" />
            <div className="w-96 h-96 rounded-full border border-red-500 animate-pulse duration-1500" />
          </div>

          {/* Caller Identity */}
          <div className="text-center space-y-3 pt-6 z-10">
            <div className="w-28 h-28 rounded-full bg-white mx-auto flex items-center justify-center shadow-2xl">
              <User className="w-16 h-16 text-gray-400 fill-gray-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">{callData.callerName}</h1>
              <p className="text-sm text-gray-300 font-mono mt-0.5">{callData.callerNumber}</p>
              <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-900/60 border border-red-700/80 text-red-200 text-xs font-medium">
                <AlertTriangle className="w-3 h-3 text-red-400" />
                <span>{callData.location || 'Suspected Spam / Fraud'}</span>
              </div>
            </div>
          </div>

          {/* Incoming Call Action Buttons */}
          <div className="w-full max-w-xs space-y-6 pb-6 z-10">
            <div className="flex items-center justify-around">
              {/* Decline Button (Red) */}
              <div className="text-center space-y-2">
                <button
                  onClick={handleRejectCall}
                  data-testid="call-decline-btn"
                  className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 active:scale-95 flex items-center justify-center shadow-lg shadow-red-600/40 text-white transition-all cursor-pointer"
                  title="Decline Call"
                >
                  <PhoneOff className="w-7 h-7" />
                </button>
                <span className="text-xs text-gray-400 font-medium block">Decline</span>
              </div>

              {/* Accept Button (Green) */}
              <div className="text-center space-y-2">
                <button
                  onClick={handleAnswerCall}
                  data-testid="call-answer-btn"
                  className="w-16 h-16 rounded-full bg-emerald-600 hover:bg-emerald-500 active:scale-95 flex items-center justify-center shadow-lg shadow-emerald-600/40 text-white transition-all animate-pulse cursor-pointer"
                  title="Answer Call"
                >
                  <Phone className="w-7 h-7" />
                </button>
                <span className="text-xs text-gray-400 font-medium block">Accept</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SCREEN 2: ACTIVE IN-CALL VIEW (Pixel-Perfect Image 2 Replica)   */}
      {/* ============================================================== */}
      {callState === 'connected' && (
        <div className="flex-1 flex flex-col justify-between px-6 pt-2 pb-6 relative overflow-hidden">
          {/* Top Info Area: Number, Status, Avatar, Name */}
          <div className="flex flex-col items-center pt-2 shrink-0">
            {/* Phone Number at top */}
            <div className="text-2xl sm:text-3xl font-normal text-white tracking-wider text-center">
              {callData.callerNumber}
            </div>

            {/* Status: Calling... / Speaking... / Listening... / Duration */}
            <div className="text-sky-400 text-sm font-medium text-center mt-1">
              {activeStatusText}
            </div>

            {/* White Circular Avatar with Grey Silhouette Icon (Image 2) */}
            <div className="w-28 h-28 rounded-full bg-white flex items-center justify-center my-6 shadow-md transition-transform duration-300">
              <User className="w-16 h-16 text-gray-400 fill-gray-400" />
            </div>

            {/* Caller Name */}
            <h2 className="text-2xl font-semibold text-white text-center tracking-tight">
              {callData.callerName}
            </h2>
          </div>

          {/* In Cyber Detective Mode: Discreet Replay button in active call view (Audio only, no transcript) */}
          {isDetectiveMode ? (
            <div className="flex items-center justify-center shrink-0 my-2">
              <button
                type="button"
                disabled={isAttackerSpeaking}
                onClick={() => {
                  const opening = callData.callerSpeech || callData.openingLine || 'Hello, this is fraud prevention calling regarding your account.';
                  speakText(opening);
                }}
                className="text-xs px-3.5 py-1.5 rounded-full bg-zinc-900 border border-zinc-700/80 text-sky-300 hover:bg-zinc-800 transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-md"
                title="Replay caller voice statement"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Replay Call Audio</span>
              </button>
            </div>
          ) : (
            /* Quick preset collapse toggle (Discreet testing helper for non-mic users in Standard Simulation Mode) */
            <div className="flex flex-col items-center justify-center shrink-0 my-1">
              <button
                onClick={() => setShowQuickPresets(prev => !prev)}
                className="text-[11px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors py-0.5 cursor-pointer"
                title="Toggle simulated preset voice inputs"
              >
                <span>{showQuickPresets ? 'Hide Responses' : 'Simulate Voice Input'}</span>
                {showQuickPresets ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              {showQuickPresets && (
                <div className="w-full max-w-xs space-y-1.5 py-2 animate-in fade-in duration-150">
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    {presetResponses.map((p, i) => (
                      <button
                        key={i}
                        disabled={isAiResponding}
                        onClick={() => handleUserSpeech(p.text)}
                        className="text-[10px] px-2.5 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1.5 pt-1">
                    <input
                      type="text"
                      value={userTextInput}
                      onChange={(e) => setUserTextInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleUserSpeech(userTextInput)}
                      placeholder="Type speech response..."
                      className="flex-1 bg-zinc-900 border border-zinc-700 rounded-full px-3 py-1.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-sky-500"
                    />
                    <button
                      onClick={() => handleUserSpeech(userTextInput)}
                      disabled={!userTextInput.trim() || isAiResponding}
                      className="p-1.5 bg-sky-600 disabled:opacity-40 hover:bg-sky-500 text-white rounded-full transition-colors cursor-pointer"
                    >
                      <Send className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}

              {speechError && (
                <p className="text-[10px] text-amber-400 text-center truncate max-w-xs mt-1">{speechError}</p>
              )}
            </div>
          )}

          {/* Bottom Native Call Control Grid (3x3 Matrix matching Image 2) */}
          <div className="w-full max-w-xs mx-auto mt-auto space-y-5">
            {/* Control Row 1: Mute | Keypad | Reminder */}
            <div className="grid grid-cols-3 text-center">
              <button
                onClick={handleToggleMute}
                className="flex flex-col items-center justify-center group cursor-pointer"
              >
                <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                  isMuted ? 'bg-white text-gray-950 font-bold' : 'text-white hover:bg-zinc-800/60'
                }`}>
                  <MicOff className="w-6 h-6 stroke-[1.5]" />
                </div>
                <span className="text-xs text-gray-300 mt-1 font-normal">Mute</span>
              </button>

              <button
                onClick={() => setShowKeypad(prev => !prev)}
                data-testid="call-keypad-toggle-btn"
                className="flex flex-col items-center justify-center group cursor-pointer"
              >
                <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                  showKeypad ? 'bg-[#1b2b40] text-sky-400 ring-2 ring-sky-500' : 'text-white hover:bg-zinc-800/60'
                }`}>
                  <Grid className="w-6 h-6 stroke-[1.5]" />
                </div>
                <span className="text-xs text-gray-300 mt-1 font-normal">Keypad</span>
              </button>

              <button
                onClick={() => setShowReportModal(true)}
                className="flex flex-col items-center justify-center group cursor-pointer hover:opacity-80"
              >
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-white hover:bg-zinc-800/60">
                  <Clock className="w-6 h-6 stroke-[1.5]" />
                </div>
                <span className="text-xs text-gray-300 mt-1 font-normal">Reminder</span>
              </button>
            </div>

            {/* Control Row 2: Video call | Add call | Contacts */}
            <div className="grid grid-cols-3 text-center">
              <button
                onClick={() => {}}
                className="flex flex-col items-center justify-center group cursor-pointer opacity-80 hover:opacity-100"
              >
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-white hover:bg-zinc-800/60">
                  <Video className="w-6 h-6 stroke-[1.5]" />
                </div>
                <span className="text-xs text-gray-300 mt-1 font-normal">Video call</span>
              </button>

              <button
                onClick={() => setShowQuickPresets(prev => !prev)}
                className="flex flex-col items-center justify-center group cursor-pointer opacity-80 hover:opacity-100"
                title="Simulate Voice Response"
              >
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-white hover:bg-zinc-800/60">
                  <UserPlus className="w-6 h-6 stroke-[1.5]" />
                </div>
                <span className="text-xs text-gray-300 mt-1 font-normal">Add call</span>
              </button>

              <button
                onClick={() => setShowReportModal(true)}
                className="flex flex-col items-center justify-center group cursor-pointer opacity-80 hover:opacity-100"
              >
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-white hover:bg-zinc-800/60">
                  <Users className="w-6 h-6 stroke-[1.5]" />
                </div>
                <span className="text-xs text-gray-300 mt-1 font-normal">Contacts</span>
              </button>
            </div>

            {/* Control Row 3: Record | Red Hangup Circle | Speaker */}
            <div className="grid grid-cols-3 text-center items-center">
              <button
                onClick={() => setShowReportModal(true)}
                className="flex flex-col items-center justify-center group cursor-pointer opacity-80 hover:opacity-100"
              >
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-white hover:bg-zinc-800/60">
                  <Circle className="w-6 h-6 stroke-[1.5]" />
                </div>
                <span className="text-xs text-gray-300 mt-1 font-normal">Record</span>
              </button>

              {/* Red Hangup Phone Circle */}
              <button
                onClick={handleHangUp}
                data-testid="call-hangup-btn"
                className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 active:scale-95 flex items-center justify-center text-white shadow-lg shadow-red-600/40 mx-auto transition-transform cursor-pointer"
                title="End Call"
              >
                <PhoneOff className="w-7 h-7" />
              </button>

              <button
                onClick={() => setIsSpeakerOn(prev => !prev)}
                className="flex flex-col items-center justify-center group cursor-pointer"
              >
                <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                  isSpeakerOn ? 'text-white' : 'text-gray-500'
                }`}>
                  <Volume2 className="w-6 h-6 stroke-[1.5]" />
                </div>
                <span className="text-xs text-gray-300 mt-1 font-normal">Speaker</span>
              </button>
            </div>
          </div>

          {/* ============================================================== */}
          {/* KEYPAD BOTTOM SHEET OVERLAY (Pixel-Perfect Image 3 Replica)     */}
          {/* ============================================================== */}
          {showKeypad && (
            <div
              data-testid="keypad-sheet"
              className="absolute inset-x-0 bottom-0 top-32 bg-[#18191c] rounded-t-3xl border-t border-zinc-800 shadow-2xl flex flex-col justify-between px-6 pt-3 pb-6 z-30 animate-in slide-in-from-bottom duration-200"
            >
              {/* Sheet Top Handle & Close button */}
              <div className="flex items-center justify-between pb-1">
                <div className="w-5" />
                <div className="w-10 h-1 bg-zinc-600 rounded-full" />
                <button
                  onClick={() => setShowKeypad(false)}
                  className="text-zinc-400 hover:text-white p-1 cursor-pointer"
                  title="Close Keypad"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Entered Digits display */}
              <div className="text-center font-mono text-2xl tracking-widest text-white h-8 flex items-center justify-center">
                {keypadInput || ''}
              </div>

              {/* 3x4 Dialpad Button Matrix (Image 3) */}
              <div className="grid grid-cols-3 gap-y-3.5 gap-x-4 max-w-[270px] mx-auto my-auto w-full">
                {DIALPAD_KEYS.map((k) => (
                  <button
                    key={k.digit}
                    onClick={() => handleKeypadPress(k.digit)}
                    className="w-16 h-16 rounded-full bg-[#2a2c31] hover:bg-[#34373e] active:bg-[#40444d] active:scale-95 text-white flex flex-col items-center justify-center mx-auto transition-all shadow-md cursor-pointer"
                  >
                    <span className="text-2xl font-normal leading-none">{k.digit}</span>
                    {k.letters ? (
                      <span className="text-[9px] font-semibold tracking-wider text-zinc-400 mt-0.5 leading-none">
                        {k.letters}
                      </span>
                    ) : (
                      <span className="h-[9px]" />
                    )}
                  </button>
                ))}
              </div>

              {/* Controls below dialpad with Keypad Active Highlight (Image 3) */}
              <div className="w-full max-w-xs mx-auto space-y-4 pt-2">
                {/* Row 1 */}
                <div className="grid grid-cols-3 text-center">
                  <button onClick={handleToggleMute} className="flex flex-col items-center justify-center cursor-pointer">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isMuted ? 'bg-white text-gray-950 font-bold' : 'text-white'}`}>
                      <MicOff className="w-5 h-5 stroke-[1.5]" />
                    </div>
                    <span className="text-[11px] text-gray-300 mt-0.5">Mute</span>
                  </button>

                  <button onClick={() => setShowKeypad(false)} className="flex flex-col items-center justify-center cursor-pointer">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[#1e3450] text-sky-400 ring-2 ring-sky-500">
                      <Grid className="w-5 h-5 stroke-[1.5]" />
                    </div>
                    <span className="text-[11px] text-sky-400 mt-0.5 font-medium">Keypad</span>
                  </button>

                  <button onClick={() => setShowReportModal(true)} className="flex flex-col items-center justify-center cursor-pointer">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white">
                      <Clock className="w-5 h-5 stroke-[1.5]" />
                    </div>
                    <span className="text-[11px] text-gray-300 mt-0.5">Reminder</span>
                  </button>
                </div>

                {/* Row 2 */}
                <div className="grid grid-cols-3 text-center">
                  <button onClick={() => {}} className="flex flex-col items-center justify-center cursor-pointer opacity-80">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white">
                      <Video className="w-5 h-5 stroke-[1.5]" />
                    </div>
                    <span className="text-[11px] text-gray-300 mt-0.5">Video call</span>
                  </button>

                  <button onClick={() => setShowQuickPresets(prev => !prev)} className="flex flex-col items-center justify-center cursor-pointer opacity-80">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white">
                      <UserPlus className="w-5 h-5 stroke-[1.5]" />
                    </div>
                    <span className="text-[11px] text-gray-300 mt-0.5">Add call</span>
                  </button>

                  <button onClick={() => setShowReportModal(true)} className="flex flex-col items-center justify-center cursor-pointer opacity-80">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white">
                      <Users className="w-5 h-5 stroke-[1.5]" />
                    </div>
                    <span className="text-[11px] text-gray-300 mt-0.5">Contacts</span>
                  </button>
                </div>

                {/* Row 3 */}
                <div className="grid grid-cols-3 text-center items-center">
                  <button onClick={() => setShowReportModal(true)} className="flex flex-col items-center justify-center cursor-pointer opacity-80">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white">
                      <Circle className="w-5 h-5 stroke-[1.5]" />
                    </div>
                    <span className="text-[11px] text-gray-300 mt-0.5">Record</span>
                  </button>

                  <button
                    onClick={handleHangUp}
                    data-testid="call-hangup-btn-keypad"
                    className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 active:scale-95 flex items-center justify-center text-white shadow-lg shadow-red-600/40 mx-auto cursor-pointer"
                  >
                    <PhoneOff className="w-6 h-6" />
                  </button>

                  <button onClick={() => setIsSpeakerOn(prev => !prev)} className="flex flex-col items-center justify-center cursor-pointer">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isSpeakerOn ? 'text-white' : 'text-gray-500'}`}>
                      <Volume2 className="w-5 h-5 stroke-[1.5]" />
                    </div>
                    <span className="text-[11px] text-gray-300 mt-0.5">Speaker</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* SCREEN 3: CALL ENDED VIEW                                      */}
      {/* ============================================================== */}
      {callState === 'ended' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4 animate-in fade-in duration-200">
          <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
            <PhoneOff className="w-7 h-7 text-zinc-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Call Ended</h3>
            <p className="text-xs text-zinc-400 font-mono mt-1">Duration: {formattedDuration}</p>
          </div>
          <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
            The voice call simulation has finished. Redirecting to your awareness report...
          </p>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: REPORT & BLOCK CALLER                                   */}
      {/* ============================================================== */}
      {showReportModal && (
        <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-xs w-full p-5 text-zinc-200 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
              <ShieldAlert className="w-4 h-4" />
              <span>Report Vishing Scam Call</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Block <span className="text-white font-mono">{callData.callerNumber}</span> and report this incoming call as a social engineering fraud attempt?
            </p>
            <div className="space-y-1 text-[11px] text-zinc-300 bg-zinc-950 p-2.5 rounded-lg border border-zinc-800">
              <div>• Caller: {callData.callerName}</div>
              <div>• Target Info: {callData.targetInformation || 'Credit card details'}</div>
              <div>• Delivery: Simulated Phone Call</div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setShowReportModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReport}
                data-testid="confirm-report-btn"
                className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Block & Report Threat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
