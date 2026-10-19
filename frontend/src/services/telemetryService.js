/**
 * Telemetry Service
 * 
 * Shared frontend service for dispatching sanitized simulation interaction
 * telemetry events to the backend POST /api/events endpoint.
 */

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /passwd/i,
  /token/i,
  /secret/i,
  /otp/i,
  /auth_token/i,
  /authorization/i,
  /credit_?card/i,
  /ssn/i,
  /private_?key/i
];

const MAX_STRING_LENGTH = 500;
const MAX_KEYS = 25;

// LRU-style set of recently processed clientEventIds to prevent duplicate requests
const processedClientEventIds = new Set();
const MAX_PROCESSED_CACHE = 200;

/**
 * Sanitizes client-side metadata before transmission:
 * - Redacts passwords, OTPs, authentication tokens, and secrets
 * - Truncates excessively long strings
 * - Disallows dangerous prototype keys
 */
export function sanitizeClientMetadata(rawMetadata) {
  if (!rawMetadata || typeof rawMetadata !== 'object' || Array.isArray(rawMetadata)) {
    return {};
  }

  const sanitized = {};
  const keys = Object.keys(rawMetadata).slice(0, MAX_KEYS);

  for (const key of keys) {
    if (['__proto__', 'constructor', 'prototype'].includes(key)) {
      continue;
    }

    const isSensitive = SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
      continue;
    }

    const val = rawMetadata[key];

    if (val === null || val === undefined) {
      sanitized[key] = val;
    } else if (typeof val === 'string') {
      sanitized[key] =
        val.length > MAX_STRING_LENGTH
          ? val.slice(0, MAX_STRING_LENGTH) + '...[truncated]'
          : val;
    } else if (typeof val === 'number' || typeof val === 'boolean') {
      sanitized[key] = val;
    } else if (Array.isArray(val)) {
      sanitized[key] = val.slice(0, 20).map((item) =>
        typeof item === 'string' && item.length > MAX_STRING_LENGTH
          ? item.slice(0, MAX_STRING_LENGTH) + '...[truncated]'
          : item
      );
    } else if (typeof val === 'object') {
      sanitized[key] = sanitizeClientMetadata(val);
    }
  }

  return sanitized;
}

/**
 * Dispatches an event to POST /api/events in the background without blocking the UI.
 * Returns a Promise with { success: boolean, event?: object, error?: string }.
 */
export async function sendTelemetryEvent({
  sessionId,
  eventType,
  metadata = {},
  clientEventId,
  clientTimestamp
}) {
  if (!sessionId || typeof sessionId !== 'string') {
    return { success: false, error: 'Missing or invalid sessionId.' };
  }

  if (!eventType || typeof eventType !== 'string') {
    return { success: false, error: 'Missing or invalid eventType.' };
  }

  // Deduplication check
  const eventKey = clientEventId || `${sessionId}:${eventType}:${JSON.stringify(metadata)}`;
  if (processedClientEventIds.has(eventKey)) {
    return { success: true, duplicated: true };
  }

  // Add to deduplication cache
  processedClientEventIds.add(eventKey);
  if (processedClientEventIds.size > MAX_PROCESSED_CACHE) {
    const firstKey = processedClientEventIds.values().next().value;
    processedClientEventIds.delete(firstKey);
  }

  const safeMetadata = sanitizeClientMetadata(metadata);
  const stableClientEventId =
    clientEventId || `cevt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  try {
    const response = await fetch('/api/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sessionId,
        eventType,
        clientEventId: stableClientEventId,
        clientTimestamp: clientTimestamp || new Date().toISOString(),
        metadata: safeMetadata
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      console.warn(`[Telemetry] Failed to record event "${eventType}":`, data.error);
      return {
        success: false,
        error: data.error || `HTTP ${response.status}`
      };
    }

    return {
      success: true,
      event: data.event
    };
  } catch (err) {
    console.warn(`[Telemetry] Network error transmitting event "${eventType}":`, err.message);
    return {
      success: false,
      error: `Network error: ${err.message}`
    };
  }
}
