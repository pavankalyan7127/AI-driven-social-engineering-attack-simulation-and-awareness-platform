import React, { useState, useRef, useEffect } from 'react';
import Header from '../components/common/Header';
import {
  Shield,
  Upload,
  X,
  AlertTriangle,
  Loader2,
  Sparkles,
  ArrowRight,
  Info,
  Cpu,
  Mic,
  MicOff,
  Languages,
  Search,
  MessageSquare,
  BookOpen,
  TrendingUp,
  Mail,
  Smartphone,
  Globe,
  Radio
} from 'lucide-react';

export const SUPPORTED_LANGUAGES = [
  { code: 'auto', label: 'Auto Detect', bcp47: 'en-US' },
  { code: 'en', label: 'English', bcp47: 'en-IN' },
  { code: 'ta', label: 'தமிழ் (Tamil)', bcp47: 'ta-IN' },
  { code: 'te', label: 'తెలుగు (Telugu)', bcp47: 'te-IN' },
  { code: 'hi', label: 'हिन्दी (Hindi)', bcp47: 'hi-IN' },
  { code: 'kn', label: 'ಕನ್ನಡ (Kannada)', bcp47: 'kn-IN' },
  { code: 'ml', label: 'മലയാളം (Malayalam)', bcp47: 'ml-IN' },
  { code: 'bn', label: 'বাংলা (Bengali)', bcp47: 'bn-IN' },
  { code: 'mr', label: 'मराठी (Marathi)', bcp47: 'mr-IN' }
];

const PRESETS = [
  {
    label: 'University Phishing Email',
    hint: 'Email',
    prompt: 'Simulate a spear phishing email from the university IT department warning students that their account will be deactivated unless they verify credentials within 24 hours.'
  },
  {
    label: 'Helpdesk Chat Impersonation',
    hint: 'Chat',
    prompt: 'Simulate an urgent message from corporate IT support claiming suspicious account activity and requesting the user provide their multi-factor authentication (MFA) code.'
  },
  {
    label: 'Bank Fraud Alert SMS',
    hint: 'SMS',
    prompt: 'Simulate a smishing SMS from a major bank claiming an unauthorized transaction of $849.00 and providing a link to contest the charge.'
  },
  {
    label: 'Single Sign-On Cloned Portal',
    hint: 'Website',
    prompt: 'Simulate a cloned corporate single sign-on (SSO) login page that prompts for university or enterprise credentials with simulated security badges.'
  },
  {
    label: 'Bank Fraud Vishing Call',
    hint: 'Call',
    prompt: 'Simulate an urgent incoming voice call from a bank fraud prevention department claiming unauthorized wire transfers and demanding credit card or PIN confirmation.'
  }
];

const MAX_IMAGES = 3;
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

export default function Home({
  onGenerateScenario,
  onStartDetectiveChallenge,
  initialPrompt = '',
  initialMode = 'standard',
  onNavigateNav
}) {
  const [simulationMode, setSimulationMode] = useState(initialMode); // 'standard' | 'detective'
  const [prompt, setPrompt] = useState(initialPrompt);
  const [images, setImages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState(SUPPORTED_LANGUAGES[0].code);

  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const speechBaseTextRef = useRef('');

  const currentLangConfig = SUPPORTED_LANGUAGES.find((l) => l.code === selectedLanguage) || SUPPORTED_LANGUAGES[0];

  // Helper to safely stop all ongoing recording mechanisms (SpeechRecognition & MediaRecorder)
  const stopAllRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (_) {}
    }
    if (audioStreamRef.current) {
      try {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch (_) {}
      audioStreamRef.current = null;
    }
    setIsListening(false);
  };

  // Clean up any ongoing speech recognition on unmount
  useEffect(() => {
    return () => {
      stopAllRecording();
    };
  }, []);

  const toggleListening = async () => {
    if (isTranscribing) return;

    if (isListening) {
      stopAllRecording();
      return;
    }

    speechBaseTextRef.current = prompt.trim();
    setVoiceNotice(null);
    setErrorMessage(null);

    // MODE 1: Auto Detect Language Mode (uses MediaRecorder + Groq Whisper multilingual transcription)
    if (
      selectedLanguage === 'auto' &&
      typeof navigator !== 'undefined' &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function' &&
      typeof MediaRecorder !== 'undefined'
    ) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStreamRef.current = stream;

        const mimeType = (typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported('audio/webm'))
          ? 'audio/webm'
          : (typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported('audio/mp4'))
          ? 'audio/mp4'
          : '';

        const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        audioChunksRef.current = [];

        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        recorder.onstop = async () => {
          if (audioStreamRef.current) {
            try {
              audioStreamRef.current.getTracks().forEach((t) => t.stop());
            } catch (_) {}
            audioStreamRef.current = null;
          }

          const chunks = audioChunksRef.current;
          if (chunks.length === 0) {
            setIsListening(false);
            return;
          }

          const audioBlob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
          if (audioBlob.size < 500) {
            setIsListening(false);
            return;
          }

          setIsTranscribing(true);
          setVoiceNotice('Auto-detecting language & transcribing audio...');

          try {
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.webm');

            const res = await fetch('/api/scenarios/voice/transcribe', {
              method: 'POST',
              body: formData
            });

            const data = await res.json();
            if (res.ok && data.success && data.text) {
              const prefix = speechBaseTextRef.current ? speechBaseTextRef.current + ' ' : '';
              const newPrompt = (prefix + data.text.trim()).slice(0, 2000);
              setPrompt(newPrompt);

              if (data.detectedLanguage) {
                setSelectedLanguage(data.detectedLanguage);
              }
              setVoiceNotice(`Detected: ${data.languageName || 'Language'} • Transcribed successfully`);
              setTimeout(() => setVoiceNotice(null), 4000);
            } else {
              setVoiceNotice(data.error || 'Could not recognize speech. Please try again.');
              setTimeout(() => setVoiceNotice(null), 5000);
            }
          } catch (netErr) {
            console.error('[Voice Transcribe Error]:', netErr);
            setVoiceNotice('Network error while transcribing audio.');
            setTimeout(() => setVoiceNotice(null), 5000);
          } finally {
            setIsTranscribing(false);
            setIsListening(false);
          }
        };

        recorder.start(250);
        setIsListening(true);
        return;
      } catch (err) {
        console.warn('[MediaRecorder Not Available/Denied, Falling back to SpeechRecognition]:', err.message);
        // Fall through to SpeechRecognition fallback below
      }
    }

    // MODE 2: Explicit Individual Language Selected (Real-Time Web Speech Recognition)
    const SpeechRecognition = typeof window !== 'undefined'
      ? (window.SpeechRecognition || window.webkitSpeechRecognition)
      : null;

    if (!SpeechRecognition) {
      setVoiceNotice('Voice recognition is not supported in this browser. Please use Chrome, Edge, or Safari, or type your scenario.');
      setTimeout(() => setVoiceNotice(null), 6000);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      const currentLangConfig = SUPPORTED_LANGUAGES.find((l) => l.code === selectedLanguage) || SUPPORTED_LANGUAGES[0];
      recognition.lang = currentLangConfig.bcp47;

      speechBaseTextRef.current = prompt.trim();

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceNotice(null);
        setErrorMessage(null);
      };

      recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = 0; i < event.results.length; i++) {
          const item = event.results[i];
          const transcript = item[0]?.transcript || '';
          if (item.isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        const combinedSpoken = (finalTranscript + interimTranscript).trim();
        if (combinedSpoken) {
          const prefix = speechBaseTextRef.current ? speechBaseTextRef.current + ' ' : '';
          const newPrompt = (prefix + combinedSpoken).slice(0, 2000);
          setPrompt(newPrompt);
        }
      };

      recognition.onerror = (event) => {
        console.warn('[SpeechRecognition Error]:', event.error);
        if (event.error === 'not-allowed') {
          setVoiceNotice('Microphone access was denied. Please allow microphone permissions in browser settings.');
        } else if (event.error === 'network') {
          setVoiceNotice('Network error occurred during speech recognition.');
        } else if (event.error !== 'no-speech') {
          setVoiceNotice(`Speech recognition error: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('[SpeechRecognition Start Error]:', err);
      setVoiceNotice('Could not start microphone voice input.');
      setIsListening(false);
    }
  };

  const trimmedPrompt = prompt.trim();
  const isPromptTooShort = trimmedPrompt.length > 0 && trimmedPrompt.length < 5;
  const isPromptTooLong = trimmedPrompt.length > 2000;
  const isFormValid = trimmedPrompt.length >= 5 && !isPromptTooLong && !isLoading;

  const handleFileSelect = (e) => {
    setFileError(null);
    const selectedFiles = Array.from(e.target.files || []);
    if (!selectedFiles.length) return;

    if (images.length + selectedFiles.length > MAX_IMAGES) {
      setFileError(`You can upload a maximum of ${MAX_IMAGES} reference images.`);
      return;
    }

    const newImages = [];
    for (const file of selectedFiles) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        setFileError(`Unsupported format "${file.name}". Please upload PNG, JPEG, or WebP.`);
        return;
      }
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        setFileError(`"${file.name}" exceeds the 5MB file size limit.`);
        return;
      }

      newImages.push({
        file,
        previewUrl: URL.createObjectURL(file),
        name: file.name,
        sizeKb: Math.round(file.size / 1024)
      });
    }

    setImages((prev) => [...prev, ...newImages]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (indexToRemove) => {
    setImages((prev) => {
      const removed = prev[indexToRemove];
      if (removed && removed.previewUrl) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      return prev.filter((_, idx) => idx !== indexToRemove);
    });
    setFileError(null);
  };

  const handleApplyPreset = (preset) => {
    setPrompt(preset.prompt);
    setErrorMessage(null);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!isFormValid) return;

    stopAllRecording();
    setIsListening(false);
    setIsLoading(true);
    setErrorMessage(null);

    // MODE: CYBER DETECTIVE MODE (3-Round Real vs Fake Triage Challenge)
    if (simulationMode === 'detective') {
      try {
        const response = await fetch('/api/detective/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: trimmedPrompt,
            language: selectedLanguage,
            channel: 'auto'
          })
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
          const errText = data.error || `Detective challenge generation failed with status ${response.status}`;
          throw new Error(errText);
        }

        if (onStartDetectiveChallenge) {
          onStartDetectiveChallenge(data.challenge, {
            prompt: trimmedPrompt,
            language: selectedLanguage,
            mode: 'detective'
          });
        }
      } catch (err) {
        console.error('[Detective Generation Failed]:', err);
        setErrorMessage(err.message || 'Unable to generate detective challenge. Please try again.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // MODE: STANDARD ATTACK SIMULATION MODE (Existing Untouched Flow)
    try {
      const formData = new FormData();
      formData.append('prompt', trimmedPrompt);
      if (selectedLanguage) {
        formData.append('language', selectedLanguage);
      }

      images.forEach((imgObj) => {
        formData.append('images', imgObj.file);
      });

      const response = await fetch('/api/scenarios/generate', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const errText = data.error || `Generation failed with status ${response.status}`;
        throw new Error(errText);
      }

      // Initialize and persist simulation session in MongoDB using AI-predicted channel
      const scenarioChannel = data.scenario?.channel || 'email';
      const scenarioId = data.scenario?.scenarioId || data.scenario?.id || `scen-${scenarioChannel}-${Date.now()}`;

      const sessionResponse = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          scenarioId,
          channel: scenarioChannel,
          terminationRules: data.scenario?.terminationRules || null,
          attackClassification: data.scenario?.attackClassification || null
        })
      });

      const sessionData = await sessionResponse.json();

      if (!sessionResponse.ok || !sessionData.success) {
        const sessionErrText = sessionData.error || `Session creation failed with status ${sessionResponse.status}`;
        throw new Error(sessionErrText);
      }

      // Hand off generated scenario and backend-generated sessionId to parent callback
      if (onGenerateScenario) {
        onGenerateScenario(data.scenario, sessionData.sessionId, {
          modelUsed: data.modelUsed,
          imageAnalysis: data.imageAnalysis,
          prompt: trimmedPrompt,
          channel: scenarioChannel,
          session: sessionData.session
        });
      }
    } catch (err) {
      console.error('[Scenario Generation Failed]:', err);
      setErrorMessage(err.message || 'Unable to connect to AI scenario generator. Please check your backend and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const [activeNav, setActiveNav] = useState('home');

  const handleNavClick = (tabKey) => {
    setActiveNav(tabKey);
    if (typeof onNavigateNav === 'function') {
      onNavigateNav(tabKey);
    }
  };

  return (
    <div className="h-screen max-h-screen overflow-hidden bg-[#070b12] text-gray-100 flex flex-col font-sans select-none">
      {/* Top Navigation Bar Matching Image */}
      <Header activeTab={activeNav} onNavigate={handleNavClick} />

      {/* Main Content: Split 2-Column Hero + Form Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 sm:px-10 py-2.5 sm:py-3.5 flex flex-col justify-between overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Awareness Headline & Value Props */}
          <div className="lg:col-span-6 space-y-3 pt-1">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-[#111927] border border-blue-900/40 text-blue-300 text-[10px] font-semibold tracking-wider uppercase">
              <span>BE AWARE</span>
              <span className="text-gray-500">•</span>
              <span>RECOGNIZE SCAMS</span>
              <span className="text-gray-500">•</span>
              <span>STAY SAFE ONLINE</span>
            </div>

            {/* Main Headline */}
            <h2 className="text-2xl sm:text-3xl xl:text-4xl font-black text-white tracking-tight leading-[1.15]">
              Learn to stay safe from <br className="hidden sm:inline" />
              <span className="text-blue-500">online scams</span>
            </h2>

            {/* Paragraph description */}
            <p className="text-xs text-gray-300 leading-relaxed max-w-lg">
              Practice real-life situations like fake messages, calls and websites in a safe environment. Our AI creates simple and realistic simulations to help everyone — especially new and less experienced users — recognize scams and use phones and the internet more safely.
            </p>

            {/* 4 Feature Columns below description matching Image */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1.5">
              {/* Feature 1 */}
              <div className="flex flex-col gap-1.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-[11px] font-bold text-white leading-tight">Realistic Scenarios</h4>
                  <p className="text-[9.5px] text-gray-400 mt-0.5 leading-snug">Based on common real-world scams</p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="flex flex-col gap-1.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-md">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-[11px] font-bold text-white leading-tight">Simple Language</h4>
                  <p className="text-[9.5px] text-gray-400 mt-0.5 leading-snug">Easy to understand for everyone</p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="flex flex-col gap-1.5">
                <div className="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center text-white shadow-md">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-[11px] font-bold text-white leading-tight">Learn by Practicing</h4>
                  <p className="text-[9.5px] text-gray-400 mt-0.5 leading-snug">Build confidence through hands-on practice</p>
                </div>
              </div>

              {/* Feature 4 */}
              <div className="flex flex-col gap-1.5">
                <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center text-white shadow-md">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-[11px] font-bold text-white leading-tight">Stay Safer Everyday</h4>
                  <p className="text-[9.5px] text-gray-400 mt-0.5 leading-snug">Useful tips for using phones and the internet safely</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: "Create a Simulation" Card matching Image */}
          <div className="lg:col-span-6 bg-[#0c121e] border border-gray-800/80 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Create a Simulation
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">
                Describe a real-life situation in your own words.
                <span className="hidden sm:inline"> You can mention a message, call, website or any suspicious activity.</span>
              </p>
            </div>

            {/* Mode Selector Radio Cards matching Image */}
            <div className="space-y-1.5">
              <label className="block text-[10.5px] font-semibold text-gray-300">
                Select Mode
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {/* Standard Mode Pill */}
                <button
                  type="button"
                  data-testid="mode-standard-btn"
                  onClick={() => {
                    setSimulationMode('standard');
                    setErrorMessage(null);
                  }}
                  className={`p-2.5 rounded-xl border flex items-center justify-between text-left transition-all cursor-pointer ${
                    simulationMode === 'standard'
                      ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-600/30 ring-1 ring-blue-400'
                      : 'bg-[#121927] border-gray-800 text-gray-300 hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 shrink-0" />
                    <div>
                      <div className="text-[11px] font-bold leading-tight">Standard Mode</div>
                      <div className={`text-[9.5px] ${simulationMode === 'standard' ? 'text-blue-100' : 'text-gray-400'}`}>
                        Interactive attack simulation
                      </div>
                    </div>
                  </div>
                  <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                    simulationMode === 'standard'
                      ? 'border-white bg-white'
                      : 'border-gray-600 bg-transparent'
                  }`}>
                    {simulationMode === 'standard' && <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                  </div>
                </button>

                {/* Cyber Detective Mode Pill */}
                <button
                  type="button"
                  data-testid="mode-detective-btn"
                  onClick={() => {
                    setSimulationMode('detective');
                    setErrorMessage(null);
                  }}
                  className={`p-2.5 rounded-xl border flex items-center justify-between text-left transition-all cursor-pointer ${
                    simulationMode === 'detective'
                      ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-600/30 ring-1 ring-blue-400'
                      : 'bg-[#121927] border-gray-800 text-gray-300 hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 shrink-0 text-amber-400" />
                    <div>
                      <div className="text-[11px] font-bold leading-tight">Detective Mode</div>
                      <div className={`text-[9.5px] ${simulationMode === 'detective' ? 'text-blue-100' : 'text-gray-400'}`}>
                        3-round triage challenge
                      </div>
                    </div>
                  </div>
                  <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                    simulationMode === 'detective'
                      ? 'border-white bg-white'
                      : 'border-gray-600 bg-transparent'
                  }`}>
                    {simulationMode === 'detective' && <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                  </div>
                </button>
              </div>
            </div>

            {/* Generator Form */}
            <form onSubmit={handleSubmit} className="space-y-2.5">
              {/* Prompt Textarea */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label htmlFor="attack-prompt" className="text-[10.5px] font-semibold text-gray-300">
                    Describe the Attack Scenario
                  </label>
                  <div className="flex items-center gap-2">
                    {isListening && (
                      <span className="flex items-center gap-1 text-[10px] text-red-400 font-medium animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                        Listening...
                      </span>
                    )}
                    {isTranscribing && (
                      <span className="flex items-center gap-1 text-[10px] text-blue-400 font-medium animate-pulse">
                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                        Transcribing...
                      </span>
                    )}
                  </div>
                </div>

                <div className="relative">
                  <textarea
                    id="attack-prompt"
                    data-testid="prompt-input"
                    rows={2}
                    value={prompt}
                    onChange={(e) => {
                      setPrompt(e.target.value);
                      setErrorMessage(null);
                    }}
                    placeholder="e.g. I got a message on WhatsApp saying I won a prize and asked me to click a link..."
                    className="w-full bg-[#070b12] border border-gray-800 rounded-xl p-2.5 pb-6 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-all resize-none min-h-[64px]"
                  />

                  {/* Character Counter inside bottom-right */}
                  <span
                    data-testid="char-counter"
                    className="absolute bottom-1.5 right-2.5 text-[9.5px] font-mono text-gray-500 pointer-events-none"
                  >
                    {prompt.length} / 2000 chars
                  </span>
                </div>

                {voiceNotice && (
                  <p data-testid="voice-notice" className="text-[10px] text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    <span>{voiceNotice}</span>
                  </p>
                )}
                {isPromptTooShort && (
                  <p className="text-[10px] text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    <span>Prompt is too short. Please provide at least 5 characters describing the scenario.</span>
                  </p>
                )}
              </div>

              {/* Add Reference Images (Optional) Dashed Box matching Image */}
              <div
                data-testid="image-dropzone"
                onClick={() => fileInputRef.current?.click()}
                className="border border-dashed border-gray-800 hover:border-gray-700 bg-[#070b12]/60 rounded-xl px-3 py-2 flex items-center justify-between gap-2.5 cursor-pointer transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-[#121927] border border-gray-800 flex items-center justify-center text-gray-400 group-hover:text-blue-400 transition-colors">
                    <Upload className="w-3 h-3" />
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-gray-300 block leading-tight">
                      Add Reference Images (Optional)
                    </span>
                    <span className="text-[9.5px] text-gray-500 block leading-tight">
                      Upload screenshots of messages, calls, or websites (Max 3 images, 5MB each)
                    </span>
                  </div>
                </div>

                {/* Voice Input Button */}
                <button
                  type="button"
                  data-testid="voice-input-btn"
                  disabled={isTranscribing}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleListening();
                  }}
                  title={isListening ? 'Stop mic' : 'Dictate with microphone'}
                  className={`px-2 py-1 rounded-lg border text-[11px] font-medium flex items-center gap-1.5 transition-all ${
                    isListening
                      ? 'bg-red-500/20 border-red-500 text-red-400 animate-pulse'
                      : 'bg-[#121927] border-gray-800 text-gray-400 hover:text-blue-400 hover:border-blue-500/50'
                  }`}
                >
                  {isListening ? (
                    <>
                      <MicOff className="w-3 h-3" />
                      <span>Stop Mic</span>
                      <span data-testid="listening-indicator" className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping inline-block ml-0.5" />
                    </>
                  ) : (
                    <>
                      <Mic className="w-3 h-3" />
                      <span>Voice Input</span>
                    </>
                  )}
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  data-testid="image-input"
                  multiple
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Vision notice for OCR intelligence */}
              <div
                data-testid="vision-notice"
                className="sr-only"
              >
                Smart OCR Vision Active: Upload screenshots of suspicious emails, chat messages, or fake websites. The AI will extract the text, branding, and attack tactics to build an authentic replica simulation.
              </div>

              {fileError && (
                <p className="text-[10px] text-red-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span>{fileError}</span>
                </p>
              )}

              {/* Thumbnails */}
              {images.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-0.5">
                  {images.map((img, idx) => (
                    <div
                      key={idx}
                      className="relative rounded-lg overflow-hidden border border-gray-800 bg-[#070b12] flex items-center gap-1.5 p-1"
                    >
                      <img src={img.previewUrl} alt={img.name} className="w-6 h-6 object-cover rounded" />
                      <span className="text-[9.5px] text-gray-300 max-w-[80px] truncate">{img.name}</span>
                      <button
                        type="button"
                        title="Remove image"
                        onClick={() => handleRemoveImage(idx)}
                        className="p-0.5 text-gray-400 hover:text-red-400"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Error Banner */}
              {errorMessage && (
                <div data-testid="error-banner" className="p-2.5 rounded-xl bg-red-950/40 border border-red-800/60 flex items-center justify-between text-[11px] text-red-200">
                  <span>{errorMessage}</span>
                  <button type="button" data-testid="retry-button" onClick={handleSubmit} className="underline text-[11px] font-bold ml-2">Retry</button>
                </div>
              )}

              {/* Bottom Action Bar: Language Selector & Submit Button */}
              <div className="flex items-center justify-between gap-2.5 pt-1">
                {/* Language Dropdown */}
                <div className="flex items-center gap-1.5 bg-[#070b12] border border-gray-800 rounded-xl px-2.5 py-1.5 text-xs text-gray-300">
                  <Globe className="w-3.5 h-3.5 text-gray-400" />
                  <select
                    data-testid="language-select"
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="bg-transparent text-[11px] text-gray-200 focus:outline-none cursor-pointer pr-1"
                  >
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code} className="bg-gray-950 text-gray-200">
                        {lang.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Generate Simulation Button matching Image */}
                <button
                  type="submit"
                  data-testid="generate-button"
                  disabled={!isFormValid || isLoading}
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-lg ${
                    isFormValid && !isLoading
                      ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30 cursor-pointer'
                      : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-800'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                      <span>Generating scenario with AI...</span>
                    </>
                  ) : (
                    <>
                      <span>{simulationMode === 'detective' ? 'Start Detective Challenge' : 'Generate Simulation'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Bottom Section: "Try These Example Scenarios" matching Image */}
        <section className="space-y-2 pt-2 border-t border-gray-900/90 shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight">
              Try These Example Scenarios
            </h3>
            <span className="text-[10px] text-gray-500">
              Click to load preset
            </span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* Card 1: University Phishing Email */}
            <button
              type="button"
              onClick={() => handleApplyPreset(PRESETS[0])}
              className="text-left p-3 rounded-xl bg-[#0c121e] hover:bg-[#111928] border border-gray-800/80 hover:border-blue-500/50 transition-all flex flex-col justify-between gap-2.5 group cursor-pointer"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                    <Mail className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[9.5px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#131b2c] text-blue-300 border border-blue-900/50 font-bold">
                    EMAIL
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors">
                    University Phishing Email
                  </h4>
                  <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1 leading-snug">
                    A message claiming you won a prize and asking you to click a link.
                  </p>
                </div>
              </div>
              <div className="pt-1 text-blue-400 group-hover:translate-x-1 transition-transform">
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </button>

            {/* Card 2: Helpdesk Chat Impersonation */}
            <button
              type="button"
              onClick={() => handleApplyPreset(PRESETS[1])}
              className="text-left p-3 rounded-xl bg-[#0c121e] hover:bg-[#111928] border border-gray-800/80 hover:border-emerald-500/50 transition-all flex flex-col justify-between gap-2.5 group cursor-pointer"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <MessageSquare className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[9.5px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#131b2c] text-emerald-300 border border-emerald-900/50 font-bold">
                    CHAT
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                    Helpdesk Chat Impersonation
                  </h4>
                  <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1 leading-snug">
                    A fake support agent asking for your account details.
                  </p>
                </div>
              </div>
              <div className="pt-1 text-emerald-400 group-hover:translate-x-1 transition-transform">
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </button>

            {/* Card 3: Bank Fraud Alert SMS */}
            <button
              type="button"
              onClick={() => handleApplyPreset(PRESETS[2])}
              className="text-left p-3 rounded-xl bg-[#0c121e] hover:bg-[#111928] border border-gray-800/80 hover:border-red-500/50 transition-all flex flex-col justify-between gap-2.5 group cursor-pointer"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="w-7 h-7 rounded-lg bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400">
                    <Smartphone className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[9.5px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#131b2c] text-red-300 border border-red-900/50 font-bold">
                    SMS
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-red-400 transition-colors">
                    Bank Fraud Alert SMS
                  </h4>
                  <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1 leading-snug">
                    A suspicious SMS from a bank claiming an unauthorized transaction.
                  </p>
                </div>
              </div>
              <div className="pt-1 text-red-400 group-hover:translate-x-1 transition-transform">
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </button>

            {/* Card 4: Single Sign-On Cloned Portal */}
            <button
              type="button"
              onClick={() => handleApplyPreset(PRESETS[3])}
              className="text-left p-3 rounded-xl bg-[#0c121e] hover:bg-[#111928] border border-gray-800/80 hover:border-purple-500/50 transition-all flex flex-col justify-between gap-2.5 group cursor-pointer"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="w-7 h-7 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                    <Globe className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[9.5px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#131b2c] text-purple-300 border border-purple-900/50 font-bold">
                    WEBSITE
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-purple-400 transition-colors">
                    Single Sign-On Cloned Portal
                  </h4>
                  <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1 leading-snug">
                    A cloned website that looks like a real login page.
                  </p>
                </div>
              </div>
              <div className="pt-1 text-purple-400 group-hover:translate-x-1 transition-transform">
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

