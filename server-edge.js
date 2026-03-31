const BASE_URL = 'https://755d753k.ap-southeast.insforge.app';
const ANON_KEY = 'ik_af1473a111e5ba0499e448e9ca6ad0ab';

/** @param {string} endpoint @param {string} token @param {Object} [options] */
async function insforgeFetch(endpoint, token, options = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${token}`,
      // @ts-ignore
      ...options.headers
    }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || JSON.stringify(data));
  return data;
}

/** @param {string} token */
function decodeJWT(token) {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(payload);
    return JSON.parse(decoded);
  } catch { return null; }
}

/** @param {Response} res @param {any} body @param {number} [status] */
function json(res, body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type' }
  });
}

/** @param {Response} res @param {string} message @param {string} code @param {number} [status] */
function error(res, message, code, status = 400) {
  return json(res, { error: { code, message } }, status);
}

/** @param {Request} req @param {string} userId @param {string} token */
async function handleSettings(req, userId, token) {
  if (req.method === 'GET') {
    try {
      const data = await insforgeFetch(`/user_settings?user_id=eq.${userId}&limit=1`, token);
      return json(req, { data: data?.[0] || {} });
    } catch (e) { // @ts-ignore
      return error(req, e.message, 'db_error', 500);
    }
  }

  if (req.method === 'PUT' || req.method === 'POST') {
    const body = await req.json();
    // @ts-ignore
    const updatePayload = { user_id: userId, updated_at: new Date().toISOString() };
    // @ts-ignore
    if (body.telnyx_api_key !== undefined) updatePayload.telnyx_api_key = body.telnyx_api_key;
    // @ts-ignore
    if (body.telnyx_sip_login !== undefined) updatePayload.telnyx_sip_login = body.telnyx_sip_login;
    // @ts-ignore
    if (body.telnyx_sip_password !== undefined) updatePayload.telnyx_sip_password = body.telnyx_sip_password;
    // @ts-ignore
    if (body.telnyx_caller_number !== undefined) updatePayload.telnyx_caller_number = body.telnyx_caller_number;

    try {
      const data = await insforgeFetch(`/user_settings`, token, {
        method: 'POST',
        body: JSON.stringify(updatePayload)
      });
      return json(req, { data });
    } catch (e) { // @ts-ignore
      return error(req, e.message, 'db_error', 500);
    }
  }
  return error(req, 'Method not allowed', 'method_not_allowed', 405);
}

/** @param {Request} req @param {string} userId @param {string} token @param {string[]} pathParts */
async function handleCampaigns(req, userId, token, pathParts) {
  const id = pathParts[2];

  if (req.method === 'GET' && !id) {
    try {
      const data = await insforgeFetch(`/campaigns?user_id=eq.${userId}&order=created_at.desc`, token);
      return json(req, { data: data || [] });
    } catch (e) { // @ts-ignore
      return error(req, e.message, 'db_error', 500);
    }
  }

  if (req.method === 'GET' && id) {
    try {
      const data = await insforgeFetch(`/campaigns?id=eq.${id}&user_id=eq.${userId}&limit=1`, token);
      if (!data?.length) return error(req, 'Campaign not found', 'not_found', 404);
      return json(req, { data: data[0] });
    } catch (e) { // @ts-ignore
      return error(req, e.message, 'db_error', 500);
    }
  }

  if (req.method === 'POST') {
    const body = await req.json();
    if (!body.name) return error(req, 'Name is required', 'validation_error', 400);
    try {
      const data = await insforgeFetch(`/campaigns`, token, {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, name: body.name, dialer_mode: body.dialer_mode || 'preview', status: 'draft' })
      });
      return json(req, { data }, 201);
    } catch (e) { // @ts-ignore
      return error(req, e.message, 'db_error', 500);
    }
  }

  if (req.method === 'PATCH' && id && pathParts[3] === 'status') {
    const body = await req.json();
    if (!['draft', 'active', 'paused', 'completed'].includes(body.status)) return error(req, 'Invalid status', 'validation_error', 400);
    try {
      const data = await insforgeFetch(`/campaigns?id=eq.${id}&user_id=eq.${userId}`, token, {
        method: 'PATCH',
        body: JSON.stringify({ status: body.status, updated_at: new Date().toISOString() })
      });
      return json(req, { data: data?.[0] });
    } catch (e) { // @ts-ignore
      return error(req, e.message, 'db_error', 500);
    }
  }

  if (req.method === 'PATCH' && id && pathParts[3] === 'rename') {
    const body = await req.json();
    if (!body.name) return error(req, 'Name is required', 'validation_error', 400);
    try {
      const data = await insforgeFetch(`/campaigns?id=eq.${id}&user_id=eq.${userId}`, token, {
        method: 'PATCH',
        body: JSON.stringify({ name: body.name, updated_at: new Date().toISOString() })
      });
      return json(req, { data: data?.[0] });
    } catch (e) { // @ts-ignore
      return error(req, e.message, 'db_error', 500);
    }
  }

  if (req.method === 'DELETE' && id) {
    try {
      await insforgeFetch(`/campaigns?id=eq.${id}&user_id=eq.${userId}`, token, { method: 'DELETE' });
      return new Response(null, { status: 204 });
    } catch (e) { // @ts-ignore
      return error(req, e.message, 'db_error', 500);
    }
  }

  return error(req, 'Method not allowed', 'method_not_allowed', 405);
}

/** @param {Request} req @param {string} userId @param {string} token @param {string[]} pathParts */
async function handleLeads(req, userId, token, pathParts) {
  if (req.method === 'GET' && !pathParts[2]) {
    const url = new URL(req.url);
    const limit = url.searchParams.get('limit') || '100';
    const offset = url.searchParams.get('offset') || '0';
    try {
      const data = await insforgeFetch(`/leads?user_id=eq.${userId}&order=created_at.desc&limit=${limit}&offset=${offset}`, token);
      return json(req, { data: data || [], meta: { count: data?.length || 0 } });
    } catch (e) { // @ts-ignore
      return error(req, e.message, 'db_error', 500);
    }
  }

  if (req.method === 'POST') {
    const body = await req.json();
    if (body.campaign_id && body.leads) {
      const uniqueLeads = new Map();
      for (const l of body.leads) { uniqueLeads.set(l.phone, l); }
      const leadsToUpsert = Array.from(uniqueLeads.values()).map(lead => ({ ...lead, user_id: userId }));
      try {
        const upsertedLeads = await insforgeFetch(`/leads`, token, {
          method: 'POST',
          body: JSON.stringify(leadsToUpsert)
        });
        const campaignLeadsToUpsert = upsertedLeads.map(lead => ({ campaign_id: body.campaign_id, lead_id: lead.id, user_id: userId }));
        await insforgeFetch(`/campaign_leads`, token, { method: 'POST', body: JSON.stringify(campaignLeadsToUpsert) });
        return json(req, { data: upsertedLeads, count: upsertedLeads.length }, 201);
      } catch (e) { // @ts-ignore
        return error(req, e.message, 'db_error', 500);
      }
    }
    return error(req, 'Invalid payload', 'validation_error', 400);
  }

  if (req.method === 'PATCH' && pathParts[2] === 'disposition') {
    const body = await req.json();
    const leadId = pathParts[1];
    if (!['new', 'calling', 'answered', 'no_answer', 'voicemail', 'busy', 'failed', 'dnc'].includes(body.status)) return error(req, 'Invalid status', 'validation_error', 400);
    try {
      const data = await insforgeFetch(`/leads?id=eq.${leadId}&user_id=eq.${userId}`, token, {
        method: 'PATCH',
        body: JSON.stringify({ status: body.status, updated_at: new Date().toISOString() })
      });
      return json(req, { data: data?.[0] });
    } catch (e) { // @ts-ignore
      return error(req, e.message, 'db_error', 500);
    }
  }

  return error(req, 'Method not allowed', 'method_not_allowed', 405);
}

/** @param {Request} req @param {string} userId @param {string} token @param {string[]} pathParts */
async function handleCalls(req, userId, token, pathParts) {
  if (req.method === 'POST' && pathParts[2] === 'log') {
    const body = await req.json();
    if (!body.lead_id) return error(req, 'lead_id is required', 'validation_error', 400);
    
    try {
      const logData = await insforgeFetch(`/call_logs`, token, {
        method: 'POST',
        body: JSON.stringify({
          user_id: userId,
          lead_id: body.lead_id,
          campaign_id: body.campaign_id || null,
          provider: 'telnyx',
          direction: 'outbound',
          duration_seconds: body.duration_seconds || 0,
          status: body.status || 'completed',
          disposition: body.disposition || null,
          notes: body.notes || null,
        })
      });

      if (body.disposition) {
        await insforgeFetch(`/leads?id=eq.${body.lead_id}&user_id=eq.${userId}`, token, {
          method: 'PATCH',
          body: JSON.stringify({ status: body.disposition })
        });
      }

      return json(req, { data: logData });
    } catch (e) { // @ts-ignore
      return error(req, e.message, 'db_error', 500);
    }
  }

  if (req.method === 'GET' && !pathParts[2]) {
    const url = new URL(req.url);
    const campaign_id = url.searchParams.get('campaign_id');
    const lead_id = url.searchParams.get('lead_id');
    const limit = url.searchParams.get('limit') || '50';
    const offset = url.searchParams.get('offset') || '0';

    let filter = `user_id=eq.${userId}`;
    if (campaign_id) filter += `&campaign_id=eq.${campaign_id}`;
    if (lead_id) filter += `&lead_id=eq.${lead_id}`;

    try {
      const data = await insforgeFetch(`/call_logs?${filter}&order=created_at.desc&limit=${limit}&offset=${offset}&select=*,leads(*),campaigns(name)`, token);
      const formattedData = data?.map((row) => ({
        ...row,
        lead: row.leads ? { first_name: row.leads.first_name, last_name: row.leads.last_name, company: row.leads.company, phone: row.leads.phone } : null,
        campaign: row.campaigns ? { name: row.campaigns.name } : null
      })) || [];
      return json(req, { data: formattedData, meta: { count: formattedData.length } });
    } catch (e) { // @ts-ignore
      return error(req, e.message, 'db_error', 500);
    }
  }

  if (req.method === 'GET' && pathParts[2] === 'stats') {
    const url = new URL(req.url);
    const campaign_id = url.searchParams.get('campaign_id');
    let filter = `user_id=eq.${userId}`;
    if (campaign_id) filter += `&campaign_id=eq.${campaign_id}`;

    try {
      const data = await insforgeFetch(`/call_logs?${filter}&select=status,disposition,duration_seconds`, token);
      const totalCalls = data?.length || 0;
      const answeredCalls = data?.filter((c) => c.status === 'completed' || c.status === 'answered').length || 0;
      const totalDuration = data?.reduce((sum, c) => sum + (c.duration_seconds || 0), 0) || 0;
      const dispositionCounts = {};
      data?.forEach((c) => { if (c.disposition) dispositionCounts[c.disposition] = (dispositionCounts[c.disposition] || 0) + 1; });
      return json(req, { data: { totalCalls, answeredCalls, totalDuration, avgDuration: totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0, dispositionCounts } });
    } catch (e) { // @ts-ignore
      return error(req, e.message, 'db_error', 500);
    }
  }

  return error(req, 'Method not allowed', 'method_not_allowed', 405);
}

/** @param {Request} req @param {string} userId @param {string} token */
async function handleStats(req, userId, token) {
  try {
    const [campaigns, leads, calls] = await Promise.all([
      insforgeFetch(`/campaigns?user_id=eq.${userId}&select=id`, token),
      insforgeFetch(`/leads?user_id=eq.${userId}&select=id`, token),
      insforgeFetch(`/call_logs?user_id=eq.${userId}&select=id`, token)
    ]);
    return json(req, { data: { totalCampaigns: campaigns?.length || 0, totalLeads: leads?.length || 0, totalCallsMade: calls?.length || 0 } });
  } catch (e) { // @ts-ignore
    return error(req, e.message, 'db_error', 500);
  }
}

/** @param {Request} req @param {string} userId @param {string} token @param {string[]} pathParts */
async function handleTelnyx(req, userId, token, pathParts) {
  if (req.method === 'POST') {
    try {
      const settings = await insforgeFetch(`/user_settings?user_id=eq.${userId}&limit=1`, token);
      if (!settings?.[0]?.telnyx_api_key) return error(req, 'Telnyx API key not configured', 'telnyx_not_configured', 400);

      const telnyxRes = await fetch('https://api.telnyx.com/v2/voice/connections', {
        headers: { 'Authorization': `Bearer ${settings[0].telnyx_api_key}`, 'Content-Type': 'application/json' }
      });
      const telnyxData = await telnyxRes.json();

      if (!telnyxData.data || telnyxData.data.length === 0) return error(req, 'No Telnyx connection found', 'telnyx_no_connection', 400);
      const connection = telnyxData.data[0];
      return json(req, { data: { sip_login: connection.sip_username, sip_password: connection.sip_password, caller_number: settings[0].telnyx_caller_number } });
    } catch (e) { // @ts-ignore
      return error(req, e.message, 'db_error', 500);
    }
  }
  return error(req, 'Method not allowed', 'method_not_allowed', 405);
}

/** @param {Request} request */
module.exports = async function(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Authorization, Content-Type' }
    });
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return error(request, 'Missing or unsupported authorization header', 'missing_token', 401);
  }

  const token = authHeader.split(' ')[1];
  const decoded = decodeJWT(token);
  if (!decoded || !decoded.sub) return error(request, 'Invalid or expired token', 'invalid_token', 401);
  if (decoded.exp && Date.now() >= decoded.exp * 1000) return error(request, 'JWT expired', 'expired_token', 401);

  const userId = decoded.sub;
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\//, '');
  const pathParts = path.split('/').filter(Boolean);

  try {
    if (pathParts[0] === 'settings') return handleSettings(request, userId, token);
    if (pathParts[0] === 'campaigns') return handleCampaigns(request, userId, token, pathParts);
    if (pathParts[0] === 'leads') return handleLeads(request, userId, token, pathParts);
    if (pathParts[0] === 'calls') return handleCalls(request, userId, token, pathParts);
    if (pathParts[0] === 'stats') return handleStats(request, userId, token);
    if (pathParts[0] === 'telnyx') return handleTelnyx(request, userId, token, pathParts);
    return error(request, 'Endpoint not found', 'not_found', 404);
  } catch (err) {
    // @ts-ignore
    console.error('Handler error:', err);
    // @ts-ignore
    return error(request, err.message || 'Internal server error', 'internal_error', 500);
  }
};
