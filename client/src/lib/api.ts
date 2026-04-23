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

/** Standardized pagination metadata returned by all list endpoints. */
export interface PaginationMeta {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

/** Standardized paginated API response. */
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

/** Pagination query params accepted by list endpoints. */
export interface PaginationParams {
  page?: number;
  per_page?: number;
}

/**
 * Authenticated fetch wrapper for Jazz Caller backend API.
 * Uses the cached access token set by AuthContext.
 */
async function apiFetch<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: T; meta?: PaginationMeta }> {
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

  const json = await response.json();
  
  // Enforce the { data: T } contract if the backend just returned raw JSON
  if (json && typeof json === 'object' && 'data' in json) {
    return json;
  }
  return { data: json };
}

// ============ Campaigns API ============

export interface Campaign {
  id: string;
  user_id: string;
  name: string;
  dialer_mode: string;
  provider: 'telnyx' | 'twilio' | 'local';
  caller_number?: string;
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
  list: (params?: PaginationParams) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.per_page) query.set('per_page', String(params.per_page));
    const qs = query.toString();
    return apiFetch<Campaign[]>(qs ? `/campaigns?${qs}` : '/campaigns') as Promise<PaginatedResponse<Campaign>>;
  },
  
  get: (id: string) => apiFetch<Campaign>(`/campaigns/${id}`),
  
  create: (payload: { name: string; dialer_mode?: string; provider?: string; caller_number?: string }) =>
    apiFetch<Campaign>('/campaigns', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  
  updateStatus: (id: string, status: Campaign['status']) =>
    apiFetch<Campaign>(`/campaigns/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  updateConfig: (id: string, config: { dialer_mode?: string; provider?: string; caller_number?: string | null }) =>
    apiFetch<Campaign>(`/campaigns/${id}/config`, {
      method: 'PATCH',
      body: JSON.stringify(config),
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
  linkedin_url?: string;
  google_maps_url?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  google_rating?: number;
  review_count?: number;
  business_category?: string;
  notes?: string;
  tags?: string[];
  status: string;
  priority: number;
  custom_fields?: Record<string, unknown>;
  created_at: string;
}

export interface LeadsFilterParams extends PaginationParams {
  search?: string;
  status?: string;
  tags?: string;
}

export const leadsApi = {
  listAll: (params?: LeadsFilterParams) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.per_page) query.set('per_page', String(params.per_page));
    if (params?.search) query.set('search', params.search);
    if (params?.status) query.set('status', params.status);
    if (params?.tags) query.set('tags', params.tags);
    const qs = query.toString();
    return apiFetch<Lead[]>(qs ? `/leads?${qs}` : '/leads') as Promise<PaginatedResponse<Lead>>;
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

  assignToCampaign: (campaignId: string, leadIds: string[]) =>
    apiFetch<{ message: string; count: number }>('/leads/assign', {
      method: 'POST',
      body: JSON.stringify({ campaign_id: campaignId, lead_ids: leadIds }),
    }),
};

// ============ Calls API ============

export interface CallLog {
  id: string;
  lead_id: string | null;
  campaign_id: string | null;
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
  log: (payload: { lead_id: string | null; campaign_id: string | null; duration_seconds: number; status: string; disposition: string; notes?: string; provider?: string }) =>
    apiFetch<{ data: unknown }>('/calls/log', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  list: (params?: { campaign_id?: string; lead_id?: string } & PaginationParams) => {
    const query = new URLSearchParams();
    if (params?.campaign_id) query.set('campaign_id', params.campaign_id);
    if (params?.lead_id) query.set('lead_id', params.lead_id);
    if (params?.page) query.set('page', String(params.page));
    if (params?.per_page) query.set('per_page', String(params.per_page));
    const qs = query.toString();
    return apiFetch<CallLog[]>(`/calls${qs ? `?${qs}` : ''}`) as Promise<PaginatedResponse<CallLog>>;
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
  twilio_account_sid?: string;
  twilio_auth_token?: string;
  twilio_api_key?: string;
  twilio_api_secret?: string;
  twilio_twiml_app_sid?: string;
  twilio_caller_number?: string;
  default_provider?: 'telnyx' | 'twilio';
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

  verifyTwilio: (accountSid: string, authToken: string) =>
    apiFetch<{ success: boolean; message?: string }>('/settings/verify-twilio', {
      method: 'POST',
      body: JSON.stringify({ accountSid, authToken }),
    }),

  getTelnyxNumbers: () =>
    apiFetch<{ phone_number: string; friendly_name: string; status: string }[]>('/settings/telnyx/phone-numbers'),

  getTelnyxBalance: () =>
    apiFetch<{ balance: string; currency: string; available_credit: string }>('/settings/telnyx/balance'),

  getTwilioNumbers: () =>
    apiFetch<{ phone_number: string; friendly_name: string; status: string }[]>('/settings/twilio/phone-numbers'),

  getTwilioBalance: () =>
    apiFetch<{ balance: string; currency: string }>('/settings/twilio/balance'),
};

// ============ Telnyx API ============

export const telnyxApi = {
  /** Fetch a short-lived WebRTC JWT token from the backend */
  getToken: () =>
    apiFetch<{ token: string }>('/telnyx/token', {
      method: 'POST',
    }),
};

// ============ Twilio API ============

export const twilioApi = {
  /** Fetch a short-lived Twilio Access Token from the backend */
  getToken: () =>
    apiFetch<{ token: string }>('/twilio/token', {
      method: 'POST',
    }),
};
