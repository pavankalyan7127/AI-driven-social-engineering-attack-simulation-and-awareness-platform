import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Home from './Home';

describe('Home Page Component', () => {
  const mockOnGenerateScenario = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-preview-url');
    global.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Test 1: Renders landing page structure
  it('renders landing page with title, prompt textarea, intelligence badge, and generate button', () => {
    render(<Home onGenerateScenario={mockOnGenerateScenario} />);

    expect(screen.getByText(/AI Social Engineering Simulator/i)).toBeInTheDocument();
    expect(screen.getByText(/Design and Launch Attack Simulations/i)).toBeInTheDocument();
    expect(screen.getByText(/Autonomous Channel Prediction & Termination Rules Engine/i)).toBeInTheDocument();
    expect(screen.getByTestId('prompt-input')).toBeInTheDocument();
    expect(screen.getByTestId('generate-button')).toBeInTheDocument();
  });

  // Test 2: Channel prediction info and presets
  it('displays quick-start presets with channel hints without requiring manual channel selection', () => {
    render(<Home onGenerateScenario={mockOnGenerateScenario} />);

    // Presets exist
    expect(screen.getByText('University Phishing Email')).toBeInTheDocument();
    expect(screen.getByText('Helpdesk Chat Impersonation')).toBeInTheDocument();
    expect(screen.getByText('Bank Fraud Alert SMS')).toBeInTheDocument();
    expect(screen.getByText('Single Sign-On Cloned Portal')).toBeInTheDocument();

    // Channel selection cards should no longer be present
    expect(screen.queryByTestId('channel-email')).not.toBeInTheDocument();
    expect(screen.queryByTestId('channel-chat')).not.toBeInTheDocument();
  });

  // Test 3: Prompt validation (<5 chars disables button, shows inline warning)
  it('validates prompt length and disables generate button when < 5 chars', () => {
    render(<Home onGenerateScenario={mockOnGenerateScenario} />);
    const generateBtn = screen.getByTestId('generate-button');
    const promptInput = screen.getByTestId('prompt-input');

    // Empty initially -> disabled
    expect(generateBtn).toBeDisabled();

    // 4 characters -> disabled with warning
    fireEvent.change(promptInput, { target: { value: 'help' } });
    expect(generateBtn).toBeDisabled();
    expect(screen.getByText(/prompt is too short/i)).toBeInTheDocument();

    // 5 characters -> enabled
    fireEvent.change(promptInput, { target: { value: 'phish' } });
    expect(generateBtn).not.toBeDisabled();
  });

  // Test 4: Character counter updates
  it('updates character counter as user types', () => {
    render(<Home onGenerateScenario={mockOnGenerateScenario} />);
    const promptInput = screen.getByTestId('prompt-input');
    const counter = screen.getByTestId('char-counter');

    expect(counter).toHaveTextContent('0 / 2000 chars');

    fireEvent.change(promptInput, { target: { value: 'Urgent security alert' } });
    expect(counter).toHaveTextContent('21 / 2000 chars');
  });

  // Test 5: Reference image upload zone display
  it('displays reference image upload zone with max 3 images and 5MB limit', () => {
    render(<Home onGenerateScenario={mockOnGenerateScenario} />);
    expect(screen.getByTestId('image-dropzone')).toBeInTheDocument();
    expect(screen.getByText(/Max 3 images/i)).toBeInTheDocument();
    expect(screen.getByTestId('image-input')).toBeInTheDocument();
  });

  // Test 6: Image preview thumbnails and removal
  it('shows thumbnail previews when images are selected and allows removing them', () => {
    render(<Home onGenerateScenario={mockOnGenerateScenario} />);
    const fileInput = screen.getByTestId('image-input');

    const fakeFile = new File(['fake data'], 'phish-sample.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [fakeFile] } });

    expect(screen.getByText('phish-sample.png')).toBeInTheDocument();

    // Remove the image
    const removeBtn = screen.getByTitle('Remove image');
    fireEvent.click(removeBtn);

    expect(screen.queryByText('phish-sample.png')).not.toBeInTheDocument();
  });

  // Test 7: Vision model / OCR banner
  it('shows smart OCR vision banner', () => {
    render(<Home onGenerateScenario={mockOnGenerateScenario} />);
    const notice = screen.getByTestId('vision-notice');
    expect(notice).toBeInTheDocument();
    expect(notice).toHaveTextContent(
      'Smart OCR Vision Active: Upload screenshots of suspicious emails, chat messages, or fake websites. The AI will extract the text, branding, and attack tactics to build an authentic replica simulation.'
    );
  });

  // Test 8: Loading state during generation
  it('shows loading state during scenario generation', async () => {
    global.fetch = vi.fn(() =>
      new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            ok: true,
            json: async () => ({
              success: true,
              scenario: { channel: 'email', title: 'Test Phish' },
              sessionId: 'sess-1'
            })
          });
        }, 100);
      })
    );

    render(<Home onGenerateScenario={mockOnGenerateScenario} />);
    const promptInput = screen.getByTestId('prompt-input');
    const generateBtn = screen.getByTestId('generate-button');

    fireEvent.change(promptInput, {
      target: { value: 'Simulate an urgent password update email' }
    });
    fireEvent.click(generateBtn);

    expect(screen.getByText(/Generating scenario with AI/i)).toBeInTheDocument();
    expect(generateBtn).toBeDisabled();

    await waitFor(() => {
      expect(mockOnGenerateScenario).toHaveBeenCalledWith(
        { channel: 'email', title: 'Test Phish' },
        'sess-1',
        expect.any(Object)
      );
    });
  });

  // Test 9: Error banner display and preservation of user prompt
  it('displays error message when API call fails and preserves user prompt', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({
        success: false,
        error: 'GROQ_API_KEY is not configured on the backend server.'
      })
    });

    render(<Home onGenerateScenario={mockOnGenerateScenario} />);
    const promptInput = screen.getByTestId('prompt-input');
    const userPrompt = 'Simulate spear phishing email for bank customer';

    fireEvent.change(promptInput, { target: { value: userPrompt } });
    fireEvent.click(screen.getByTestId('generate-button'));

    await waitFor(() => {
      expect(screen.getByTestId('error-banner')).toBeInTheDocument();
      expect(
        screen.getByText(/GROQ_API_KEY is not configured on the backend server/i)
      ).toBeInTheDocument();
    });

    // Verify user prompt was preserved
    expect(promptInput.value).toBe(userPrompt);
    expect(screen.getByTestId('retry-button')).toBeInTheDocument();
  });

  // Test 10: Presets populate prompt
  it('populates prompt when a quick-start preset is clicked', () => {
    render(<Home onGenerateScenario={mockOnGenerateScenario} />);

    const presetBtn = screen.getByText('Bank Fraud Alert SMS');
    fireEvent.click(presetBtn);

    const promptInput = screen.getByTestId('prompt-input');
    expect(promptInput.value).toMatch(/smishing SMS from a major bank/i);
  });

  // Test 11: Preventing simulation launch when session creation fails
  it('prevents simulation launch and shows error when backend session creation fails', async () => {
    global.fetch = vi.fn((url) => {
      if (url.includes('/api/scenarios/generate')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            scenario: { scenarioId: 'scen-999', channel: 'email', title: 'Test Phish' }
          })
        });
      }
      if (url.includes('/api/sessions')) {
        return Promise.resolve({
          ok: false,
          status: 500,
          json: async () => ({
            success: false,
            error: 'Database connection failed: MONGODB_URL is unavailable'
          })
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    render(<Home onGenerateScenario={mockOnGenerateScenario} />);
    const promptInput = screen.getByTestId('prompt-input');
    const userPrompt = 'Simulate malicious payload email';

    fireEvent.change(promptInput, { target: { value: userPrompt } });
    fireEvent.click(screen.getByTestId('generate-button'));

    await waitFor(() => {
      expect(screen.getByTestId('error-banner')).toBeInTheDocument();
      expect(screen.getByText(/Database connection failed/i)).toBeInTheDocument();
    });

    // Verification: onGenerateScenario was NOT called, preserving user input
    expect(mockOnGenerateScenario).not.toHaveBeenCalled();
    expect(promptInput.value).toBe(userPrompt);
  });

  // Test 12: Voice input button rendering and fallback for unsupported browsers
  it('renders voice input button and displays notice if Web Speech API is unavailable', () => {
    const originalSpeech = window.SpeechRecognition;
    const originalWebkit = window.webkitSpeechRecognition;
    delete window.SpeechRecognition;
    delete window.webkitSpeechRecognition;

    render(<Home onGenerateScenario={mockOnGenerateScenario} />);
    const voiceBtn = screen.getByTestId('voice-input-btn');
    expect(voiceBtn).toBeInTheDocument();
    expect(screen.getByText('Voice Input')).toBeInTheDocument();

    fireEvent.click(voiceBtn);

    expect(screen.getByTestId('voice-notice')).toBeInTheDocument();
    expect(screen.getByText(/Voice recognition is not supported in this browser/i)).toBeInTheDocument();

    window.SpeechRecognition = originalSpeech;
    window.webkitSpeechRecognition = originalWebkit;
  });

  // Test 13: Voice input starts listening and transcribes speech into the prompt input
  it('starts speech recognition and transcribes spoken audio into prompt textarea', async () => {
    let mockInstance = null;
    class MockSpeechRecognition {
      constructor() {
        this.continuous = false;
        this.interimResults = false;
        this.lang = '';
        this.onstart = null;
        this.onresult = null;
        this.onerror = null;
        this.onend = null;
        mockInstance = this;
      }
      start() {
        if (this.onstart) this.onstart();
      }
      stop() {
        if (this.onend) this.onend();
      }
      abort() {
        if (this.onend) this.onend();
      }
    }

    window.SpeechRecognition = MockSpeechRecognition;

    render(<Home onGenerateScenario={mockOnGenerateScenario} />);
    const voiceBtn = screen.getByTestId('voice-input-btn');
    const promptInput = screen.getByTestId('prompt-input');

    fireEvent.click(voiceBtn);

    expect(screen.getByTestId('listening-indicator')).toBeInTheDocument();
    expect(screen.getByText('Stop Mic')).toBeInTheDocument();

    // Simulate speech recognition result event
    act(() => {
      mockInstance.onresult({
        results: [
          [{ transcript: 'Simulate urgent bank fraud email' }]
        ]
      });
    });

    expect(promptInput.value).toBe('Simulate urgent bank fraud email');

    // Clicking again stops speech recognition
    fireEvent.click(voiceBtn);
    expect(screen.queryByTestId('listening-indicator')).not.toBeInTheDocument();
    expect(screen.getByText('Voice Input')).toBeInTheDocument();

    delete window.SpeechRecognition;
  });
});
