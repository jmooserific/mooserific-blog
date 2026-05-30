import { describe, it, expect, vi } from 'vitest';

const construct = vi.fn();
vi.mock('cloudflare', () => ({
  // `new Cloudflare(...)` requires a constructable mock.
  default: class {
    constructor(opts: { apiToken: string }) {
      construct(opts);
    }
  },
}));

import { getCloudflareClient } from './cloudflare-core';

describe('getCloudflareClient', () => {
  it('constructs the client once with the configured API token and caches it', () => {
    const a = getCloudflareClient();
    const b = getCloudflareClient();
    expect(a).toBe(b); // singleton
    expect(construct).toHaveBeenCalledTimes(1);
    expect(construct).toHaveBeenCalledWith({ apiToken: 'test-cf-token' });
  });
});
