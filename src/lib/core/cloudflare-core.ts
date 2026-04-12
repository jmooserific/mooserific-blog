import Cloudflare from 'cloudflare';
import { env } from '../env';

let cfSingleton: Cloudflare | undefined;

export function getCloudflareClient(): Cloudflare {
  if (cfSingleton) return cfSingleton;
  cfSingleton = new Cloudflare({ apiToken: env().CF_API_TOKEN });
  return cfSingleton;
}
