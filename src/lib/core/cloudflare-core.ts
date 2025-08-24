import Cloudflare from 'cloudflare';

let cfSingleton: Cloudflare | undefined;

export function getCloudflareClient(): Cloudflare {
  if (cfSingleton) return cfSingleton;
  const apiToken = process.env.CF_API_TOKEN;
  if (!apiToken) throw new Error('Missing CF_API_TOKEN for Cloudflare client');
  cfSingleton = new Cloudflare({ apiToken });
  return cfSingleton;
}
