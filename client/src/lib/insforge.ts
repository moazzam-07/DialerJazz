import { createClient } from '@insforge/sdk';

const baseUrl = import.meta.env.VITE_INSFORGE_BASE_URL || 'https://755d753k.ap-southeast.insforge.app';
const anonKey = import.meta.env.VITE_INSFORGE_ANON_KEY || 'your-anon-key';

export const insforge = createClient({
  baseUrl,
  anonKey,
});
