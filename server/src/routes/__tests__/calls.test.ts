import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../index.js';
import { getInsforgeClient } from '../../lib/insforge.js';

// Mock the insforge DB global mock
vi.mock('../../lib/insforge.js', () => ({
  getInsforgeClient: vi.fn(),
}));

describe('POST /api/calls/log', () => {
  const validToken = jwt.sign(
    { sub: 'user-id-123', email: 'test@user.com', role: 'authenticated' },
    'fake-secret' // requireAuth just uses jwt.decode(), so signature is irrelevant
  );
  
  const mockInsert = vi.fn();
  const mockUpdate = vi.fn();
  const mockSelect = vi.fn();
  const mockSingle = vi.fn();
  const mockEq = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Construct the Supabase chainable mock
    mockInsert.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ single: mockSingle });

    // Supabase builder is a "thenable" (chainable promise)
    const mockQueryBuilder = {
      eq: mockEq,
      then: function (resolve: any) {
        return Promise.resolve({ error: null }).then(resolve);
      },
      catch: function () { return this; }
    };

    mockUpdate.mockReturnValue(mockQueryBuilder);
    mockEq.mockReturnValue(mockQueryBuilder);

    // Inject our mock DB client into the getInsforgeClient return value
    vi.mocked(getInsforgeClient).mockReturnValue({
      database: {
        from: vi.fn((table: string) => {
          if (table === 'call_logs') return { insert: mockInsert };
          if (table === 'leads') return { update: mockUpdate };
          return {};
        }),
      },
    } as any);
  });

  it('should return 401 when no authorization header is provided', async () => {
    const response = await request(app).post('/api/calls/log').send({
      lead_id: '123e4567-e89b-12d3-a456-426614174000',
    });

    expect(response.status).toBe(401);
    expect(response.body.error.message).toBe('Missing or unsupported authorization header');
  });

  it('should return 400 when missing required lead_id (Zod schema failure)', async () => {
    const response = await request(app)
      .post('/api/calls/log')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        duration_seconds: 45,
        status: 'completed',
        notes: 'Good call',
      });

    // Zod validation should kick in before DB interaction
    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('Request validation failed');
    expect(response.body.error.code).toBe('validation_error');
    // Ensure one of the detailed errors mentions lead_id
    expect(response.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'lead_id' }),
      ])
    );
    expect(getInsforgeClient).toHaveBeenCalled(); // Auth triggered
    expect(mockInsert).not.toHaveBeenCalled(); // DB untouched
  });

  it('should return 400 for an invalid UUID format', async () => {
    const response = await request(app)
      .post('/api/calls/log')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        lead_id: 'not-a-valid-uuid', // UUID format validation
      });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('Request validation failed');
    expect(response.body.error.details[0].message).toBe('lead_id must be a valid UUID');
  });

  it('should insert a call log securely and return 200 on success', async () => {
    const validLeadId = '123e4567-e89b-12d3-a456-426614174000';
    
    // Setup Mock Responses
    mockSingle.mockResolvedValue({
      data: { id: 1, lead_id: validLeadId, duration_seconds: 60 },
      error: null,
    });
    // the mockQueryBuilder resolves automatically

    const payload = {
      lead_id: validLeadId,
      duration_seconds: 60,
      disposition: 'hot_lead',
      notes: 'Customer is very interested',
      status: 'completed',
    };

    const response = await request(app)
      .post('/api/calls/log')
      .set('Authorization', `Bearer ${validToken}`)
      .send(payload);

    expect(response.status).toBe(200);
    expect(response.body.data.duration_seconds).toBe(60);

    // Verify correct fields passed to database insert
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-id-123',
        lead_id: validLeadId,
        duration_seconds: 60,
        provider: 'telnyx',
        direction: 'outbound',
        disposition: 'hot_lead',
        status: 'completed',
      })
    );

    // Verify it attempted to update the lead status to hot_lead
    expect(mockUpdate).toHaveBeenCalledWith({ status: 'hot_lead' });
  });

  it('should return 500 when database insertion fails', async () => {
    const validLeadId = '123e4567-e89b-12d3-a456-426614174000';
    
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: 'Database connection failed' }, // DB failure
    });

    const response = await request(app)
      .post('/api/calls/log')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        lead_id: validLeadId,
        duration_seconds: 10,
      });

    // The centralized errorHandler translates 500 errors to a standard format
    expect(response.status).toBe(500);
    expect(response.body.error.message).toBe('Database connection failed');
  });
});
