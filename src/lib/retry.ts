/**
 * Retry an async operation with exponential backoff + jitter. Intended for flaky-network
 * upload/POST steps. Isomorphic (no server-only imports) so the client editor can use it too.
 *
 * A thrown `RetryableError` (or a generic Error from a network failure) is retried; a thrown
 * `NonRetryableError` stops immediately. Callers that talk to fetch should classify the
 * response themselves via {@link isRetryableStatus} and throw the appropriate error.
 */

export class NonRetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NonRetryableError';
  }
}

export class RetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RetryableError';
  }
}

/** 5xx, plus 408 (timeout) and 429 (rate limit), are worth retrying. Other 4xx are not. */
export function isRetryableStatus(status: number): boolean {
  return status >= 500 || status === 408 || status === 429;
}

export interface RetryOptions {
  retries?: number;
  baseDelayMs?: number;
  /** Injectable sleep, for tests. */
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const { retries = 3, baseDelayMs = 500, sleep = defaultSleep } = options;

  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof NonRetryableError || attempt >= retries) throw err;
      // Exponential backoff with full jitter: random point in [0, base * 2^attempt].
      const delay = Math.round(Math.random() * baseDelayMs * 2 ** attempt);
      await sleep(delay);
      attempt += 1;
    }
  }
}
