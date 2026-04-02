import { insforge } from './insforge';

// Use environment variable for API URL
const API_BASE = import.meta.env.VITE_API_URL || '/api';

/**
 * Token holder — set by AuthContext on login,
 * used by apiFetch for every backend request.
 * This avoids calling refreshSession() on every single API call.
 */
let cachedToken: string | null = null;

export function setApiToken(token: string | null) {
  cachedToken = token;
}

/**
 * Authenticated fetch wrapper for Jazz Caller backend API.
 * Uses the cached access token set by AuthContext.
 */
async function apiFetch<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: T; meta?: Record<string, unknown> }> {
  let token = cachedToken;

  // If no cached token, try one refresh as fallback
  if (!token) {
    try {
      const { data: sessionData } = await insforge.auth.refreshSession();
      token = sessionData?.accessToken ?? null;
      if (token) cachedToken = token;
    } catch {
      // refresh failed, no token available
    }
  }

  if (!token) {
    throw new Error('Not authenticated. Please sign in again.');
  }

  const url = `${API_BASE}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...((options.headers as Record<string, string>) || {}),
  };

  const response = await fetch(url, { ...options, headers });

  // If 401, try refreshing once
  if (response.status === 401 && cachedToken) {
    try {
      const { data: refreshData } = await insforge.auth.refreshSession();
      if (refreshData?.accessToken) {
        cachedToken = refreshData.accessToken;
        headers.Authorization = `Bearer ${refreshData.accessToken}`;
        const retryResponse = await fetch(url, { ...options, headers });
        if (!retryResponse.ok) {
          const errorBody = await retryResponse.json().catch(() => ({ error: { message: retryResponse.statusText } }));
          throw new Error(errorBody?.error?.message || `API Error: ${retryResponse.status}`);
        }
        return retryResponse.json();
      }
    } catch {
      cachedToken = null;
      throw new Error('Session expired. Please sign in again.');
    }
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ error: { message: response.statusText } }));
    throw new Error(errorBody?.error?.message || `API Error: ${response.status}`);
  }

  if (response.status === 204) {
    return {} as any;
  }

  return response.json();
}

// ============ Campaigns API ============

export interface Campaign {
  id: string;
  user_id: string;
  name: string;
  dialer_mode: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  total_leads: number;
  leads_called: number;
  created_at: string;
  updated_at: string;
}

export const statsApi = {
  getDashboard: () => apiFetch<{ totalCampaigns: number; totalLeads: number; totalCallsMade: number }>('/stats/dashboard'),
};

export const campaignsApi = {
  list: () => apiFetch<Campaign[]>('/campaigns'),
  
  get: (id: string) => apiFetch<Campaign>(`/campaigns/${id}`),
  
  create: (payload: { name: string; dialer_mode?: string }) =>
    apiFetch<Campaign>('/campaigns', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  
  updateStatus: (id: string, status: Campaign['status']) =>
    apiFetch<Campaign>(`/campaigns/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  rename: (id: string, name: string) =>
    apiFetch<Campaign>(`/campaigns/${id}/rename`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    }),

  delete: (id: string) =>
    apiFetch<void>(`/campaigns/${id}`, {
      method: 'DELETE',
    }),
};

// ============ Leads API ============

export interface Lead {
  id: string;
  campaign_id: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  phone: string;
  email?: string;
  website?: string;
  city?: string;
  state?: string;
  zip?: string;
  google_rating?: number;
  review_count?: number;
  business_category?: string;
  status: string;
  priority: number;
  tags?: string[];
  notes?: string;
  custom_fields?: Record<string, unknown>;
  created_at: string;
}

export const leadsApi = {
  listAll: (params?: { limit?: number; offset?: number }) => {
    const query = new URLSearchParams();
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.offset) query.append('offset', params.offset.toString());
    const qs = query.toString();
    return apiFetch<Lead[]>(qs ? `/leads?${qs}` : '/leads');
  },

  listByCampaign: (campaignId: string, params?: { status?: string; limit?: number; offset?: number }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    const qs = query.toString();
    return apiFetch<Lead[]>(`/leads/campaign/${campaignId}${qs ? `?${qs}` : ''}`);
  },

  bulkUpload: (campaignId: string, leads: Omit<Lead, 'id' | 'campaign_id' | 'created_at'>[]) =>
    apiFetch<Lead[]>('/leads/bulk', {
      method: 'POST',
      body: JSON.stringify({ campaign_id: campaignId, leads }),
    }),

  updateDisposition: (leadId: string, status: string) =>
    apiFetch<Lead>(`/leads/${leadId}/disposition`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
};

// ============ Calls API ============

export interface CallLog {
  id: string;
  lead_id: string;
  campaign_id: string;
  provider: string;
  direction: string;
  from_number: string;
  to_number: string;
  status: string;
  disposition: string | null;
  disposition_sub: string | null;
  duration_seconds: number;
  recording_url: string | null;
  notes: string | null;
  started_at: string;
  ended_at: string;
  created_at: string;
  lead: {
    first_name?: string;
    last_name?: string;
    company?: string;
    phone: string;
  } | null;
  campaign: { name: string } | null;
}

export interface CallStats {
  totalCalls: number;
  answeredCalls: number;
  totalDuration: number;
  avgDuration: number;
  dispositionCounts: Record<string, number>;
}

export const callsApi = {
  log: (payload: { lead_id: string; campaign_id: string; duration_seconds: number; status: string; disposition: string; notes?: string }) =>
    apiFetch<{ data: unknown }>('/calls/log', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  list: (params?: { campaign_id?: string; lead_id?: string; limit?: number; offset?: number }) => {
    const query = new URLSearchParams();
    if (params?.campaign_id) query.set('campaign_id', params.campaign_id);
    if (params?.lead_id) query.set('lead_id', params.lead_id);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    const qs = query.toString();
    return apiFetch<CallLog[]>(`/calls${qs ? `?${qs}` : ''}`);
  },

  getStats: (campaign_id?: string) => {
    const query = campaign_id ? `?campaign_id=${campaign_id}` : '';
    return apiFetch<CallStats>(`/calls/stats${query}`);
  },
};

// ============ Settings API ============

export interface UserSettings {
  telnyx_api_key?: string;
  telnyx_sip_login?: string;
  telnyx_sip_password?: string;
  telnyx_caller_number?: string;
  updated_at?: string;
}

export const settingsApi = {
  get: () => apiFetch<UserSettings>('/settings'),
  
  update: (settings: Partial<UserSettings>) =>
    apiFetch<UserSettings>('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),

  verifyTelnyxKey: (apiKey: string) =>
    apiFetch<{ success: boolean; message?: string }>('/settings/verify-telnyx', {
      method: 'POST',
      body: JSON.stringify({ apiKey }),
    }),
};

// ============ Telnyx API ============

export const telnyxApi = {
  /** Fetch a short-lived WebRTC JWT token from the backend */
  getToken: () =>
    apiFetch<{ token: string }>('/telnyx/token', {
      method: 'POST',
    }),
};
