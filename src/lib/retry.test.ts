import { describe, it, expect, vi } from 'vitest';
import { withRetry, RetryableError, NonRetryableError, isRetryableStatus } from './retry';

const noSleep = (_ms: number) => Promise.resolve();

describe('isRetryableStatus', () => {
  it('treats 5xx, 408 and 429 as retryable', () => {
    expect(isRetryableStatus(500)).toBe(true);
    expect(isRetryableStatus(503)).toBe(true);
    expect(isRetryableStatus(408)).toBe(true);
    expect(isRetryableStatus(429)).toBe(true);
  });

  it('treats other 4xx and 2xx as non-retryable', () => {
    expect(isRetryableStatus(400)).toBe(false);
    expect(isRetryableStatus(403)).toBe(false);
    expect(isRetryableStatus(404)).toBe(false);
    expect(isRetryableStatus(200)).toBe(false);
  });
});

describe('withRetry', () => {
  it('returns immediately on first success without sleeping', async () => {
    const sleep = vi.fn(noSleep);
    const fn = vi.fn(async () => 'ok');
    await expect(withRetry(fn, { sleep })).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('retries transient failures then succeeds', async () => {
    const sleep = vi.fn(noSleep);
    let calls = 0;
    const fn = vi.fn(async () => {
      calls += 1;
      if (calls < 3) throw new RetryableError('flaky');
      return 'done';
    });
    await expect(withRetry(fn, { retries: 3, sleep })).resolves.toBe('done');
    expect(fn).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it('retries generic (network) errors', async () => {
    const sleep = vi.fn(noSleep);
    let calls = 0;
    const fn = vi.fn(async () => {
      calls += 1;
      if (calls < 2) throw new TypeError('Failed to fetch');
      return 'recovered';
    });
    await expect(withRetry(fn, { retries: 2, sleep })).resolves.toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('does not retry a NonRetryableError', async () => {
    const sleep = vi.fn(noSleep);
    const fn = vi.fn(async () => { throw new NonRetryableError('bad input'); });
    await expect(withRetry(fn, { retries: 5, sleep })).rejects.toThrow('bad input');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('gives up after exhausting retries and rethrows the last error', async () => {
    const sleep = vi.fn(noSleep);
    const fn = vi.fn(async () => { throw new RetryableError('still down'); });
    await expect(withRetry(fn, { retries: 2, sleep })).rejects.toThrow('still down');
    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
    expect(sleep).toHaveBeenCalledTimes(2);
  });
});
