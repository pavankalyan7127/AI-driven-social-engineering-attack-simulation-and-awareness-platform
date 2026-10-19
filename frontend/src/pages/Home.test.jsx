import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
  it('renders landing page with title, prompt textarea, channel selector, and generate button', () => {
    render(<Home onGenerateScenario={mockOnGenerateScenario} />);

    expect(screen.getByText(/AI Social Engineering Simulator/i)).toBeInTheDocument();
    expect(screen.getByText(/Design and Launch Attack Simulations/i)).toBeInTheDocument();
    expect(screen.getByTestId('prompt-input')).toBeInTheDocument();
    expect(screen.getByTestId('channel-email')).toBeInTheDocument();
    expect(screen.getByTestId('channel-chat')).toBeInTheDocument();
    expect(screen.getByTestId('channel-sms')).toBeInTheDocument();
    expect(screen.getByTestId('channel-website')).toBeInTheDocument();
    expect(screen.getByTestId('generate-button')).toBeInTheDocument();
  });

  // Test 2: Channel selection
  it('allows selecting each of the 4 simulation channels', () => {
    render(<Home onGenerateScenario={mockOnGenerateScenario} />);

    const emailBtn = screen.getByTestId('channel-email');
    const chatBtn = screen.getByTestId('channel-chat');
    const smsBtn = screen.getByTestId('channel-sms');
    const websiteBtn = screen.getByTestId('channel-website');

    // Click Chat
    fireEvent.click(chatBtn);
    expect(chatBtn).toHaveClass('border-blue-500');

    // Click SMS
    fireEvent.click(smsBtn);
    expect(smsBtn).toHaveClass('border-blue-500');

    // Click Website
    fireEvent.click(websiteBtn);
    expect(websiteBtn).toHaveClass('border-blue-500');

    // Click Email
    fireEvent.click(emailBtn);
    expect(emailBtn).toHaveClass('border-blue-500');
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

  // Test 7: Vision model limitation banner
  it('shows explicit vision model limitation banner', () => {
    render(<Home onGenerateScenario={mockOnGenerateScenario} />);
    const notice = screen.getByTestId('vision-notice');
    expect(notice).toBeInTheDocument();
    expect(notice).toHaveTextContent(
      'Uploaded images are for reference only. AI generation currently runs on a text-only model (openai/gpt-oss-20b) and does not analyze image content.'
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

  // Test 10: Presets populate prompt and channel
  it('populates prompt and channel when a quick-start preset is clicked', () => {
    render(<Home onGenerateScenario={mockOnGenerateScenario} />);

    const presetBtn = screen.getByText('Bank Fraud Alert SMS');
    fireEvent.click(presetBtn);

    const promptInput = screen.getByTestId('prompt-input');
    expect(promptInput.value).toMatch(/smishing SMS from a major bank/i);

    const smsBtn = screen.getByTestId('channel-sms');
    expect(smsBtn).toHaveClass('border-blue-500');
  });
});
