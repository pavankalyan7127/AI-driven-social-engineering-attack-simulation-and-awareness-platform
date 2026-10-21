import React, { useState, useRef } from 'react';
import {
  Shield,
  Upload,
  X,
  AlertTriangle,
  Loader2,
  Sparkles,
  ArrowRight,
  Info,
  Cpu
} from 'lucide-react';

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
  initialPrompt = ''
}) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [images, setImages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [fileError, setFileError] = useState(null);

  const fileInputRef = useRef(null);

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

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('prompt', trimmedPrompt);

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-gray-100 flex flex-col font-sans">
      {/* Top Navigation / Brand */}
      <header className="border-b border-gray-800 bg-gray-950/70 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              AI Social Engineering Simulator
              <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-medium">
                Groq Powered
              </span>
            </h1>
            <p className="text-xs text-gray-400">
              Interactive Attack Simulation & Cybersecurity Awareness Engine
            </p>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 flex flex-col gap-8">
        {/* Intro Hero */}
        <section className="text-center space-y-3">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Design and Launch Attack Simulations
          </h2>
          <p className="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto">
            Describe any social engineering attack in natural language. Our AI automatically classifies the threat, predicts the optimal simulation channel, and constructs interactive defense rules.
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/50 border border-blue-500/30 text-blue-300 text-xs font-medium">
            <Cpu className="w-3.5 h-3.5 text-blue-400" />
            <span>Autonomous Channel Prediction & Termination Rules Engine</span>
          </div>
        </section>

        {/* Quick Presets */}
        <section className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Quick-Start Scenario Presets</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {PRESETS.map((preset, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className="text-left p-3 rounded-lg bg-gray-950/60 hover:bg-gray-800/80 border border-gray-800 hover:border-gray-700 transition-all group flex flex-col justify-between gap-2"
              >
                <div className="text-xs font-semibold text-gray-200 group-hover:text-blue-400 flex items-center justify-between">
                  <span>{preset.label}</span>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">
                    {preset.hint}
                  </span>
                </div>
                <div className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">
                  {preset.prompt}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Generator Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Prompt Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="attack-prompt"
                className="block text-sm font-semibold text-gray-200"
              >
                Describe the Attack Scenario
              </label>
              <span
                data-testid="char-counter"
                className={`text-xs font-mono ${
                  prompt.length > 2000
                    ? 'text-red-400 font-bold'
                    : prompt.length < 5 && prompt.length > 0
                    ? 'text-amber-400'
                    : 'text-gray-400'
                }`}
              >
                {prompt.length} / 2000 chars
              </span>
            </div>

            <textarea
              id="attack-prompt"
              data-testid="prompt-input"
              rows={4}
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                setErrorMessage(null);
              }}
              placeholder="e.g. Simulate a spear phishing email from the university IT department warning students their account will be deactivated unless they verify credentials within 24 hours..."
              className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-y"
            />

            {isPromptTooShort && (
              <p className="text-xs text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Prompt is too short. Please provide at least 5 characters describing the scenario.</span>
              </p>
            )}
            {isPromptTooLong && (
              <p className="text-xs text-red-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Prompt exceeds the maximum limit of 2000 characters.</span>
              </p>
            )}
          </div>

          {/* Reference Image Upload (Optional) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-gray-200">
                Reference Images (Optional)
              </label>
              <span className="text-xs text-gray-400">
                Max 3 images (PNG, JPEG, WebP, 5MB each)
              </span>
            </div>

            {/* Vision Model Limitation Warning Banner */}
            <div
              data-testid="vision-notice"
              className="p-3 rounded-lg bg-amber-950/30 border border-amber-800/50 flex items-start gap-2.5 text-xs text-amber-200/90 leading-relaxed"
            >
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                Uploaded images are for reference only. AI generation currently runs on a text-only model (openai/gpt-oss-20b) and does not analyze image content.
              </span>
            </div>

            {/* Upload Box */}
            <div
              data-testid="image-dropzone"
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-800 hover:border-gray-700 bg-gray-950/40 rounded-xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors group"
            >
              <div className="w-10 h-10 rounded-full bg-gray-900 group-hover:bg-gray-800 flex items-center justify-center transition-colors">
                <Upload className="w-5 h-5 text-gray-400 group-hover:text-blue-400" />
              </div>
              <div className="text-center">
                <p className="text-xs font-medium text-gray-300">
                  <span className="text-blue-400 hover:underline">Click to browse</span> or drag and drop reference images
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Screenshots of phishing emails, chat snippets, or target login forms
                </p>
              </div>
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

            {fileError && (
              <p className="text-xs text-red-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{fileError}</span>
              </p>
            )}

            {/* Thumbnail Previews */}
            {images.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    className="relative rounded-lg overflow-hidden border border-gray-800 bg-gray-900 flex items-center gap-2.5 p-2 group"
                  >
                    <img
                      src={img.previewUrl}
                      alt={img.name}
                      className="w-12 h-12 object-cover rounded border border-gray-800 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-gray-200 truncate">
                        {img.name}
                      </div>
                      <div className="text-[10px] text-gray-500">{img.sizeKb} KB</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="p-1 rounded bg-gray-800 hover:bg-red-950 hover:text-red-400 text-gray-400 transition-colors"
                      title="Remove image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div
              data-testid="error-banner"
              className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-red-200"
            >
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
              <button
                type="button"
                data-testid="retry-button"
                onClick={handleSubmit}
                className="px-3 py-1.5 rounded-lg bg-red-800/50 hover:bg-red-800 text-white font-medium transition-colors shrink-0"
              >
                Retry
              </button>
            </div>
          )}

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              data-testid="generate-button"
              disabled={!isFormValid}
              className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg ${
                isFormValid
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20 hover:shadow-blue-500/30 cursor-pointer'
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-800'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Generating scenario with AI...</span>
                </>
              ) : (
                <>
                  <span>Generate Simulation</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-850 bg-gray-950 py-4 px-6 text-center text-xs text-gray-500">
        AI-driven social engineering attack simulation and awareness platform • Educational cybersecurity research
      </footer>
    </div>
  );
}
