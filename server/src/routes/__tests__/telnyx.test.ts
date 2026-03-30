import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../index.js';
import { getInsforgeClient } from '../../lib/insforge.js';

// Mock DB client
vi.mock('../../lib/insforge.js', () => ({
  getInsforgeClient: vi.fn(),
}));

describe('POST /api/telnyx/token', () => {
  const validToken = jwt.sign(
    { sub: 'user-123', email: 'test@user.com', role: 'authenticated' },
    'fake-secret'
  );

  const mockSelect = vi.fn();
  const mockEq = vi.fn();
  const mockSingle = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup Supabase chaining for the user_settings fetch
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ single: mockSingle });

    vi.mocked(getInsforgeClient).mockReturnValue({
      database: {
        from: vi.fn((table: string) => {
          if (table === 'user_settings') return { select: mockSelect };
          return {};
        }),
      },
    } as any);

    // Mock global fetch to isolate Telnyx API REST calls
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return 400 when Telnyx API Key is missing from settings', async () => {
    // Mock DB returning no settings or no API key
    mockSingle.mockResolvedValue({
      data: { telnyx_sip_login: 'sip-user' }, // Missing API Key
      error: null,
    });

    const response = await request(app)
      .post('/api/telnyx/token')
      .set('Authorization', `Bearer ${validToken}`);

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('Telnyx API Key not configured. Go to Connectors page.');
  });

  it('should return 502 when Telnyx credentials API upstream fails', async () => {
    mockSingle.mockResolvedValue({
      data: { telnyx_api_key: 'KEY_123', telnyx_sip_login: 'my_sip_user' },
      error: null,
    });

    // Mock the first fetch (get credentials list) failing 
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
    } as Response);

    const response = await request(app)
      .post('/api/telnyx/token')
      .set('Authorization', `Bearer ${validToken}`);

    expect(response.status).toBe(502);
    expect(response.body.error.message).toBe('Failed to reach Telnyx API');
  });

  it('should return 400 when no matching SIP credential is found on Telnyx', async () => {
    mockSingle.mockResolvedValue({
      data: { telnyx_api_key: 'KEY_123', telnyx_sip_login: 'my_sip_user' },
      error: null,
    });

    // Mock an empty data payload back from Telnyx
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }), // Empty array
    } as Response);

    const response = await request(app)
      .post('/api/telnyx/token')
      .set('Authorization', `Bearer ${validToken}`);

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('No Telnyx SIP Credential found. Create one in Telnyx dashboard.');
  });

  it('should securely generate and return a temporary JWT on success', async () => {
    mockSingle.mockResolvedValue({
      data: { telnyx_api_key: 'KEY_123', telnyx_sip_login: 'my_sip_user' },
      error: null,
    });

    // 1st Fetch: Find the connection ID
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [{ id: 'connection_456', sip_username: 'my_sip_user' }],
      }),
    } as Response);

    // 2nd Fetch: Token Generation
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => 'mock.webrtc.jwt.token',
    } as Response);

    const response = await request(app)
      .post('/api/telnyx/token')
      .set('Authorization', `Bearer ${validToken}`);

    expect(response.status).toBe(200);
    expect(response.body.token).toBe('mock.webrtc.jwt.token');

    // Verify correct endpoints were called
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      'https://api.telnyx.com/v2/telephony_credentials',
      expect.objectContaining({
        headers: { 'Authorization': 'Bearer KEY_123', 'Content-Type': 'application/json' },
      })
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      'https://api.telnyx.com/v2/telephony_credentials/connection_456/token',
      expect.objectContaining({
        method: 'POST',
      })
    );
  });
});
