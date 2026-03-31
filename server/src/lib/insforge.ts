import { createClient } from '@insforge/sdk';

/**
 * Creates an isolated InsForge client for a specific request.
 * Uses lazy env access so dotenv has time to load in ESM modules.
 * This prevents token leakage between concurrent requests.
 */
export const getInsforgeClient = (token?: string) => {
  const baseUrl = process.env.INSFORGE_BASE_URL || process.env.INSFORGE_URL || process.env.VITE_INSFORGE_URL || 'https://755d753k.ap-southeast.insforge.app';
  const anonKey = process.env.INSFORGE_ANON_KEY || process.env.VITE_INSFORGE_ANON_KEY || 'ik_af1473a111e5ba0499e448e9ca6ad0ab';

  const client = createClient({
    baseUrl,
    anonKey
  });

  if (token) {
    // @ts-ignore
    client.auth.http.setAuthToken(token);
  }

  return client;
};
