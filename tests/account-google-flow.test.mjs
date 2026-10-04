import test from 'node:test';
import assert from 'node:assert/strict';

test('Google uses the exact allowlisted callback on each origin and keeps next in HttpOnly cookies', async () => {
  const original = {
    fetch: globalThis.fetch,
    SITE_ORIGIN: process.env.SITE_ORIGIN,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    BREVO_API_KEY: process.env.BREVO_API_KEY
  };
  process.env.SUPABASE_URL = 'https://supabase.example';
  process.env.SUPABASE_ANON_KEY = 'test-anon-key';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
  process.env.BREVO_API_KEY = 'test-mail-key';
  const user = {
    id: 'google-user', email: 'person@example.com', email_confirmed_at: '2026-09-21T00:00:00Z',
    app_metadata: { provider: 'google' }, user_metadata: {}
  };
  let profileComplete = false;
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(String(input));
    if (url.pathname === '/auth/v1/settings') return Response.json({ external: { google: true } });
    if (url.pathname === '/auth/v1/token') {
      const body = JSON.parse(init.body);
      assert.equal(body.auth_code, 'test-code');
      assert.ok(body.code_verifier);
      return Response.json({ access_token: 'test-access', refresh_token: 'test-refresh', user });
    }
    if (url.pathname === '/auth/v1/user') return Response.json(user);
    if (url.pathname === '/auth/v1/logout') return new Response(null, { status: 204 });
    if (url.pathname === '/rest/v1/customer_profiles') {
      return Response.json({
        user_id: user.id, title: profileComplete ? 'mr' : null,
        first_name: profileComplete ? 'Sam' : null, last_name: profileComplete ? 'Lee' : null,
        full_name: profileComplete ? 'Sam Lee' : null,
        profile_completed_at: profileComplete ? '2026-09-21T00:00:00Z' : null
      });
    }
    if (url.pathname === '/rest/v1/rpc/claim_orders_for_user') return Response.json(0);
    throw Error(`unexpected request: ${init.method || 'GET'} ${url.pathname}`);
  };

  try {
    const { default: google } = await import('../netlify/functions/account-google.mjs');
    const { default: accountSession } = await import('../netlify/functions/account-session.mjs');
    for (const origin of ['http://localhost:8888', 'https://marvellflorist.com']) {
      process.env.SITE_ORIGIN = origin;
      const response = await google(new Request(`${origin}/api/account/google?next=%2Faccount`));
      assert.equal(response.status, 303);
      const destination = new URL(response.headers.get('location'));
      assert.equal(destination.searchParams.get('redirect_to'), `${origin}/api/account/google/callback`);
      assert.equal(destination.searchParams.get('code_challenge_method'), 's256');
      const cookies = response.headers.getSetCookie();
      assert.deepEqual(cookies.map((cookie) => cookie.split('=')[0]), ['mv_pkce', 'mv_oauth_next']);
      assert.ok(cookies.every((cookie) => cookie.includes('HttpOnly') && cookie.includes('SameSite=Lax')));
      assert.ok(cookies.every((cookie) => cookie.includes('Path=/api/account')));
      assert.equal(cookies.every((cookie) => cookie.includes('Secure')), origin.startsWith('https:'));

      // The callback can recover the original page without putting a query
      // on redirect_to. Missing a code must fail before any token exchange.
      const callback = await google(new Request(`${origin}/api/account/google/callback`, {
        headers: { cookie: cookies.map((cookie) => cookie.split(';')[0]).join('; ') }
      }));
      assert.equal(callback.status, 303);
      assert.equal(callback.headers.get('location'), '/account?account=google-failed');
      assert.ok(callback.headers.getSetCookie().some((cookie) => cookie.startsWith('mv_oauth_next=') && cookie.includes('Max-Age=0')));

      for (const completedAccount of [false, true]) {
        profileComplete = completedAccount;
        const success = await google(new Request(`${origin}/api/account/google/callback?code=test-code`, {
          headers: { cookie: cookies.map((cookie) => cookie.split(';')[0]).join('; ') }
        }));
        assert.equal(success.status, 303);
        assert.equal(success.headers.get('location'), completedAccount
          ? '/account?account=signed-in'
          : '/account?account=complete-profile');
        const sessionCookies = success.headers.getSetCookie();
        assert.ok(sessionCookies.some((cookie) => cookie.startsWith('mv_session=') && cookie.includes('HttpOnly')));
        assert.ok(sessionCookies.some((cookie) => cookie.startsWith('mv_refresh=') && cookie.includes('HttpOnly')));
        assert.ok(sessionCookies.some((cookie) => cookie.startsWith('mv_pkce=') && cookie.includes('Max-Age=0')));
        assert.ok(sessionCookies.some((cookie) => cookie.startsWith('mv_oauth_next=') && cookie.includes('Max-Age=0')));

        const sessionHeader = sessionCookies
          .filter((cookie) => cookie.startsWith('mv_session=') || cookie.startsWith('mv_refresh='))
          .map((cookie) => cookie.split(';')[0]).join('; ');
        const session = await accountSession(new Request(`${origin}/api/account/session`, {
          headers: { cookie: sessionHeader }
        }));
        const signedIn = await session.json();
        assert.equal(signedIn.signed_in, true);
        assert.equal(signedIn.user.profile_complete, completedAccount);

        const signout = await accountSession(new Request(`${origin}/api/account/session`, {
          method: 'DELETE', headers: { cookie: sessionHeader }
        }));
        assert.equal((await signout.json()).signed_in, false);
        assert.ok(signout.headers.getSetCookie().some((cookie) => cookie.startsWith('mv_session=') && cookie.includes('Max-Age=0')));
        assert.ok(signout.headers.getSetCookie().some((cookie) => cookie.startsWith('mv_refresh=') && cookie.includes('Max-Age=0')));
      }
    }
  } finally {
    globalThis.fetch = original.fetch;
    for (const key of ['SITE_ORIGIN', 'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'BREVO_API_KEY']) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  }
});
