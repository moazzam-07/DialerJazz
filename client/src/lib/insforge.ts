import { createClient } from '@insforge/sdk';

const baseUrl = import.meta.env.VITE_INSFORGE_BASE_URL || 'https://755d753k.ap-southeast.insforge.app';
const anonKey = import.meta.env.VITE_INSFORGE_ANON_KEY || 'ik_af1473a111e5ba0499e448e9ca6ad0ab';

export const insforge = createClient({
  baseUrl,
  anonKey,
});
