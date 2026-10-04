import test from 'node:test';
import assert from 'node:assert/strict';

test('a verified Google identity only becomes an account after submitting required fields', async () => {
  const original = {
    fetch: globalThis.fetch,
    SITE_ORIGIN: process.env.SITE_ORIGIN,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    BREVO_API_KEY: process.env.BREVO_API_KEY
  };
  Object.assign(process.env, {
    SITE_ORIGIN: 'http://localhost:8888',
    SUPABASE_URL: 'https://supabase.example',
    SUPABASE_ANON_KEY: 'test-anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
    BREVO_API_KEY: 'test-mail-key'
  });

  const user = {
    id: 'google-user', email: 'person@example.com', email_confirmed_at: '2026-09-21T00:00:00Z',
    app_metadata: { provider: 'google' }, user_metadata: {}
  };
  let profile = {
    user_id: user.id, title: null, first_name: null, last_name: null, full_name: null,
    phone: null, marketing_email_opt_in: false, pending_marketing_opt_in: false,
    profile_completed_at: null, created_at: '2026-09-21T00:00:00Z'
  };
  const calls = [];
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(String(input));
    const method = init.method || 'GET';
    calls.push({ path: url.pathname, method, body: init.body && JSON.parse(init.body) });
    if (url.pathname === '/auth/v1/user') return Response.json(user);
    if (url.pathname === '/rest/v1/rpc/my_marvell_account') {
      return Response.json([{ user_id: user.id, auth_exists: true, profile_complete: false }]);
    }
    if (url.pathname === '/rest/v1/customer_profiles' && method === 'POST') {
      profile = { ...profile, ...JSON.parse(init.body) };
      return new Response(null, { status: 201 });
    }
    if (url.pathname === '/rest/v1/customer_profiles' && method === 'GET') {
      return Response.json(profile);
    }
    if (url.pathname === '/rest/v1/customer_profiles' && method === 'PATCH') {
      profile = { ...profile, ...JSON.parse(init.body) };
      return Response.json(profile);
    }
    throw Error(`unexpected request: ${method} ${url.pathname}`);
  };

  try {
    const { default: register } = await import('../netlify/functions/account-register.mjs');
    const body = {
      title: 'mr', first_name: 'Sam', last_name: 'Lee',
      email: user.email, email_confirm: user.email, newsletter: false
    };
    const request = (payload) => new Request('http://localhost:8888/api/account/register', {
      method: 'POST',
      headers: { cookie: 'mv_session=test-access', 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const incomplete = await register(request({ ...body, title: '' }));
    assert.equal(incomplete.status, 400);
    assert.equal(profile.profile_completed_at, null);
    assert.equal(calls.some((call) => call.method === 'PATCH'), false);

    const otherEmail = await register(request({
      ...body, email: 'other@example.com', email_confirm: 'other@example.com'
    }));
    assert.equal(otherEmail.status, 400);
    assert.equal(profile.profile_completed_at, null);

    const completed = await register(request(body));
    assert.equal(completed.status, 200);
    const result = await completed.json();
    assert.equal(result.user.profile_complete, true);
    assert.ok(profile.profile_completed_at);
    assert.equal(calls.some((call) => call.path === '/auth/v1/otp'), false, 'Google does not need a second email code');
    assert.equal(calls.some((call) => call.path === '/auth/v1/admin/users'), false, 'Google identity is reused');
  } finally {
    globalThis.fetch = original.fetch;
    for (const key of ['SITE_ORIGIN', 'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'BREVO_API_KEY']) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  }
});
