import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sendTelemetryEvent, sanitizeClientMetadata } from './telemetryService';

describe('Telemetry Service - Frontend Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('sanitizeClientMetadata', () => {
    it('redacts sensitive credentials, passwords, and tokens', () => {
      const raw = {
        messageId: 'msg-123',
        password: 'my-super-secret-password',
        userAuthToken: 'xyz-auth-token-999',
        otpCode: '123456',
        isTarget: true
      };

      const sanitized = sanitizeClientMetadata(raw);

      expect(sanitized.messageId).toBe('msg-123');
      expect(sanitized.isTarget).toBe(true);
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.userAuthToken).toBe('[REDACTED]');
      expect(sanitized.otpCode).toBe('[REDACTED]');
    });

    it('truncates excessively long string values', () => {
      const longStr = 'a'.repeat(600);
      const sanitized = sanitizeClientMetadata({ note: longStr });

      expect(sanitized.note.length).toBeLessThan(550);
      expect(sanitized.note).toContain('[truncated]');
    });

    it('filters out prototype pollution keys', () => {
      const dangerous = {
        __proto__: { admin: true },
        safeKey: 'valid'
      };

      const sanitized = sanitizeClientMetadata(dangerous);
      expect(sanitized.safeKey).toBe('valid');
      expect(Object.prototype.hasOwnProperty.call(sanitized, '__proto__')).toBe(false);
    });
  });

  describe('sendTelemetryEvent', () => {
    it('submits event to POST /api/events with correct payload and session ID', async () => {
      let capturedBody = null;

      global.fetch = vi.fn().mockImplementation((url, options) => {
        capturedBody = JSON.parse(options.body);
        return Promise.resolve({
          ok: true,
          status: 201,
          json: async () => ({
            success: true,
            event: { eventId: 'evt-123', ...capturedBody }
          })
        });
      });

      const result = await sendTelemetryEvent({
        sessionId: 'sess-email-test-001',
        eventType: 'simulated_link_clicked',
        metadata: {
          url: 'https://security-verify.net',
          password: 'sensitive-password'
        }
      });

      expect(result.success).toBe(true);
      expect(capturedBody.sessionId).toBe('sess-email-test-001');
      expect(capturedBody.eventType).toBe('simulated_link_clicked');
      expect(capturedBody.metadata.url).toBe('https://security-verify.net');
      expect(capturedBody.metadata.password).toBe('[REDACTED]');
    });

    it('prevents accidental duplicate submission of identical events', async () => {
      let fetchCount = 0;

      global.fetch = vi.fn().mockImplementation(() => {
        fetchCount++;
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, event: { eventId: 'evt-dup-1' } })
        });
      });

      const eventPayload = {
        sessionId: 'sess-test-dup-999',
        eventType: 'message_opened',
        clientEventId: 'cevt-stable-unique-id',
        metadata: { messageId: 'm1' }
      };

      // First call
      const res1 = await sendTelemetryEvent(eventPayload);
      expect(res1.success).toBe(true);

      // Second call with same clientEventId
      const res2 = await sendTelemetryEvent(eventPayload);
      expect(res2.success).toBe(true);
      expect(res2.duplicated).toBe(true);

      // Verify fetch was only executed once
      expect(fetchCount).toBe(1);
    });

    it('handles network failure gracefully without crashing or throwing', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network offline or connection refused'));

      const result = await sendTelemetryEvent({
        sessionId: 'sess-email-fail-test',
        eventType: 'message_opened',
        metadata: { messageId: 'm2' }
      });

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/network error/i);
    });

    it('handles backend 409 or 400 errors safely without throwing', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({
          success: false,
          error: 'Cannot record interaction events for a terminal session.'
        })
      });

      const result = await sendTelemetryEvent({
        sessionId: 'sess-terminal-001',
        eventType: 'message_opened'
      });

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/terminal session/i);
    });
  });
});
