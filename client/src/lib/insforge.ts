import { createClient } from '@insforge/sdk';

const baseUrl = import.meta.env.VITE_INSFORGE_BASE_URL || 'https://755d753k.ap-southeast.insforge.app';
// TODO: InsForge anon key - use env var. Currently InsForge uses API keys only (development phase)
const anonKey = import.meta.env.VITE_INSFORGE_ANON_KEY || '';

export const insforge = createClient({
  baseUrl,
  anonKey,
});
