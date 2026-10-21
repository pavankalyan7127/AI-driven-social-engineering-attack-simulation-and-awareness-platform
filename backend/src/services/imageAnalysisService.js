import { createWorker } from 'tesseract.js';

/**
 * Common brands frequently targeted in social engineering / phishing campaigns.
 */
const KNOWN_BRANDS = [
  'PayPal', 'Netflix', 'Chase', 'Bank of America', 'Wells Fargo', 'Citibank',
  'Amazon', 'Microsoft', 'Office 365', 'Outlook', 'Apple', 'iCloud', 'Google',
  'Facebook', 'Meta', 'Instagram', 'WhatsApp', 'Telegram', 'DHL', 'FedEx',
  'UPS', 'USPS', 'DocuSign', 'Dropbox', 'Adobe', 'Zoom', 'Geek Squad',
  'Norton', 'McAfee', 'Coinbase', 'Binance', 'HDFC', 'SBI', 'ICICI'
];

/**
 * Phishing indicators and urgency patterns
 */
const TACTIC_PATTERNS = [
  { label: 'Urgent Account Suspension Threat', regex: /(?:account.*suspended|immediate.*action|permanently.*locked|freeze.*account|within 24 hours)/i },
  { label: 'Credential Harvesting Attempt', regex: /(?:verify.*password|confirm.*identity|update.*billing|enter.*credentials|log.*in.*here)/i },
  { label: 'Unauthorized Transaction Alert', regex: /(?:unauthorized.*transaction|fraudulent.*charge|suspicious.*login|flagged.*charge)/i },
  { label: 'Fake Invoice / Payment Request', regex: /(?:invoice|overdue.*payment|wire.*transfer|receipt.*attached|billing.*issue)/i },
  { label: 'Lure / Prize Winning Lure', regex: /(?:congratulations|you.*won|gift.*card|claim.*reward|prize)/i },
  { label: 'Security Verification / 2FA Bypass', regex: /(?:one-time.*code|otp|security.*alert|verification.*code)/i }
];

/**
 * Check if buffer starts with valid PNG, JPEG, or WebP magic numbers before passing to OCR
 */
function isValidImageBuffer(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length < 12) return false;
  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return true;
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return true;
  // WebP: RIFF....WEBP
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return true;
  return false;
}

/**
 * Extracts visible text and security indicators from uploaded reference images using OCR.
 * 
 * @param {Array} files - Array of Multer file objects ({ buffer, originalname, mimetype })
 * @returns {Promise<Object|null>} Structured image analysis or null if no files provided
 */
export async function analyzeReferenceImages(files = []) {
  if (!Array.isArray(files) || files.length === 0) {
    return null;
  }

  // Filter for valid image buffers to prevent OCR engine crashes on malformed/mock data
  const validFiles = files.filter(f => f && f.buffer && isValidImageBuffer(f.buffer));
  if (validFiles.length === 0) {
    return {
      processed: false,
      imageCount: files.length,
      notice: 'Uploaded reference images contained no legible text or could not be processed.'
    };
  }

  let worker = null;
  const extractedSnippets = [];

  try {
    // Initialize Tesseract worker for English OCR
    worker = await createWorker('eng');

    for (const file of validFiles) {
      try {
        const { data } = await worker.recognize(file.buffer);
        const cleanText = (data?.text || '').trim();
        if (cleanText) {
          extractedSnippets.push(cleanText);
        }
      } catch (ocrErr) {
        console.warn(`[Image Analysis OCR Warning] Failed to recognize image "${file.originalname}":`, ocrErr.message);
      }
    }
  } catch (err) {
    console.error('[Image Analysis Service Error]:', err.message);
  } finally {
    if (worker) {
      try {
        await worker.terminate();
      } catch (_) {}
    }
  }

  const combinedText = extractedSnippets.join('\n\n').trim();

  if (!combinedText) {
    return {
      processed: false,
      imageCount: files.length,
      notice: 'Uploaded reference images contained no legible text or could not be processed.'
    };
  }

  // 1. Detect Brand / Entity
  let detectedBrand = null;
  for (const brand of KNOWN_BRANDS) {
    const brandRegex = new RegExp(`\\b${brand}\\b`, 'i');
    if (brandRegex.test(combinedText)) {
      detectedBrand = brand;
      break;
    }
  }

  // 2. Detect Indicators / Tactics
  const detectedTactics = [];
  for (const { label, regex } of TACTIC_PATTERNS) {
    if (regex.test(combinedText)) {
      detectedTactics.push(label);
    }
  }

  // 3. Extract URLs, Emails, Phone numbers
  const urlMatches = combinedText.match(/https?:\/\/[^\s"'<>]+/gi) || [];
  const emailMatches = combinedText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi) || [];
  const phoneMatches = combinedText.match(/(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g) || [];

  const detectedUrls = Array.from(new Set(urlMatches)).slice(0, 5);
  const detectedEmails = Array.from(new Set(emailMatches)).slice(0, 5);
  const detectedPhones = Array.from(new Set(phoneMatches)).slice(0, 5);

  // 4. Heuristic channel inference if applicable
  let suggestedChannel = null;
  const lowerText = combinedText.toLowerCase();
  if (lowerText.includes('subject:') || lowerText.includes('from:') || lowerText.includes('inbox')) {
    suggestedChannel = 'email';
  } else if (lowerText.includes('password') && (lowerText.includes('sign in') || lowerText.includes('log in') || lowerText.includes('submit'))) {
    suggestedChannel = 'website';
  } else if (detectedPhones.length > 0 && (lowerText.includes('reply stop') || lowerText.includes('txt') || lowerText.includes('sms'))) {
    suggestedChannel = 'sms';
  }

  return {
    processed: true,
    imageCount: files.length,
    detectedBrand: detectedBrand || 'Unspecified Target Entity',
    detectedTactics: detectedTactics.length > 0 ? detectedTactics : ['Social Engineering Pretext'],
    detectedUrls,
    detectedEmails,
    detectedPhones,
    suggestedChannel,
    extractedSnippet: combinedText.slice(0, 800), // First 800 chars preview
    fullExtractedText: combinedText.slice(0, 2500),
    summary: `Analyzed ${files.length} reference image(s). Detected target: "${detectedBrand || 'Identified in image'}" with ${detectedTactics.length} threat indicator(s).`
  };
}
