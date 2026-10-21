import { ALLOWED_EVENT_TYPES } from '../models/SimulationEvent.js';

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

const DISALLOWED_OBJECT_KEYS = ['__proto__', 'constructor', 'prototype'];

const MAX_KEY_COUNT = 25;
const MAX_DEPTH = 3;
const MAX_STRING_LENGTH = 500;
const MAX_ARRAY_LENGTH = 20;

/**
 * Validates and sanitizes event metadata to ensure bounded size,
 * safe nesting depth, and exclusion of sensitive credential fields.
 */
export function sanitizeMetadata(rawMetadata, currentDepth = 1) {
  if (rawMetadata === null || rawMetadata === undefined) {
    return { valid: true, sanitized: {} };
  }

  if (typeof rawMetadata !== 'object' || Array.isArray(rawMetadata)) {
    return {
      valid: false,
      error: 'Metadata must be a valid JSON object.'
    };
  }

  if (currentDepth > MAX_DEPTH) {
    return {
      valid: false,
      error: `Metadata exceeds maximum allowed nesting depth of ${MAX_DEPTH}.`
    };
  }

  const keys = Object.keys(rawMetadata);
  if (keys.length > MAX_KEY_COUNT) {
    return {
      valid: false,
      error: `Metadata exceeds maximum key count of ${MAX_KEY_COUNT}.`
    };
  }

  const sanitized = {};

  for (const key of keys) {
    if (DISALLOWED_OBJECT_KEYS.includes(key)) {
      continue;
    }

    // Check if key matches sensitive patterns
    const isSensitive = SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
    if (isSensitive) {
      // Redact sensitive credential/token values
      sanitized[key] = '[REDACTED]';
      continue;
    }

    const value = rawMetadata[key];

    if (value === null || value === undefined) {
      sanitized[key] = value;
    } else if (typeof value === 'string') {
      sanitized[key] =
        value.length > MAX_STRING_LENGTH
          ? value.slice(0, MAX_STRING_LENGTH) + '...[truncated]'
          : value;
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      sanitized[key] = value;
    } else if (Array.isArray(value)) {
      if (value.length > MAX_ARRAY_LENGTH) {
        return {
          valid: false,
          error: `Metadata array "${key}" exceeds maximum length of ${MAX_ARRAY_LENGTH}.`
        };
      }
      // Sanitize array items (primitives or objects up to depth)
      sanitized[key] = value.slice(0, MAX_ARRAY_LENGTH).map((item) => {
        if (typeof item === 'string') {
          return item.length > MAX_STRING_LENGTH
            ? item.slice(0, MAX_STRING_LENGTH) + '...[truncated]'
            : item;
        }
        if (typeof item === 'object' && item !== null) {
          const subResult = sanitizeMetadata(item, currentDepth + 1);
          return subResult.valid ? subResult.sanitized : {};
        }
        return item;
      });
    } else if (typeof value === 'object') {
      const nestedResult = sanitizeMetadata(value, currentDepth + 1);
      if (!nestedResult.valid) {
        return nestedResult;
      }
      sanitized[key] = nestedResult.sanitized;
    } else {
      // Ignore functions or unsupported types
      continue;
    }
  }

  return { valid: true, sanitized };
}

/**
 * Checks whether an event type is an authorized final event for a session in terminal status.
 */
export function isAuthorizedTerminalEvent(sessionStatus, eventType) {
  if (!sessionStatus || !eventType) return false;

  const normalizedStatus = sessionStatus.toLowerCase().trim();
  const normalizedEvent = eventType.toLowerCase().trim();

  switch (normalizedStatus) {
    case 'reported':
      return normalizedEvent === 'threat_reported' || normalizedEvent.startsWith('user_reported_');
    case 'safe_exit':
      return (
        normalizedEvent === 'safe_exit' ||
        normalizedEvent === 'user_blocked_sender' ||
        normalizedEvent === 'message_deleted' ||
        normalizedEvent === 'message_archived'
      );
    case 'abandoned':
      return normalizedEvent === 'simulation_abandoned';
    case 'completed':
      return (
        normalizedEvent === 'simulation_completed' ||
        normalizedEvent === 'scenario_completed' ||
        normalizedEvent === 'simulated_link_clicked' ||
        normalizedEvent === 'virtual_link_clicked' ||
        normalizedEvent === 'simulated_form_submitted' ||
        normalizedEvent === 'credential_submitted' ||
        normalizedEvent === 'observation_window_elapsed'
      );
    default:
      return false;
  }
}
