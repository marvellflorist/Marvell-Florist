import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

const ROOT = new URL('../', import.meta.url);
const PAGE = await readFile(new URL('account.html', ROOT), 'utf8');
const DETAILS = await readFile(new URL('assets/account-details.js', ROOT), 'utf8');
const JOIN_SCRIPT = PAGE.match(/<script>([\s\S]*?)<\/script>/)[1];

test('Google sign-in with an incomplete profile shows the required form and finishes without an email code', async () => {
  const dom = new JSDOM(PAGE, { url: 'http://localhost:8888/account?account=complete-profile', runScripts: 'outside-only' });
  const { window } = dom;
  const user = {
    id: 'google-user', email: 'person@example.com', email_confirmed: true,
    profile_complete: false, provider: 'google'
  };
  const calls = [];
  window.MarvellShop = { t: (en) => en };
  window.MarvellDetails = { render: () => {} };
  window.fetch = async (path, options = {}) => {
    calls.push({ path, options });
    if (path === '/api/account/session') {
      return { ok: true, json: async () => ({ ok: true, signed_in: true, available: true, user }) };
    }
    if (path === '/api/account/register') {
      return { ok: true, json: async () => ({ ok: true, user: { ...user, profile_complete: true } }) };
    }
    throw Error(`unexpected request: ${path}`);
  };

  window.eval(JOIN_SCRIPT);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(window.document.querySelector('#join-email').readOnly, true);
  assert.equal(window.document.querySelector('#join-email').value, user.email);
  assert.match(window.document.querySelector('[data-join-title]').textContent, /Complete your account/);
  window.document.querySelector('[data-join-title-option="mr"]').click();
  window.document.querySelector('#join-first-name').value = 'Sam';
  window.document.querySelector('#join-last-name').value = 'Lee';
  window.document.querySelector('[data-join-register]').dispatchEvent(
    new window.Event('submit', { bubbles: true, cancelable: true })
  );
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(window.document.querySelector('[data-join-step="done"]').hidden, false);
  assert.equal(window.document.querySelector('[data-join-step="verify"]').hidden, true);
  assert.deepEqual(calls.map(({ path }) => path), ['/api/account/session', '/api/account/register']);
  await new Promise((resolve) => setTimeout(resolve, 80));
  dom.window.close();
});

test('the account page reads and saves only the signed-in person’s details', async () => {
  const dom = new JSDOM(PAGE, { url: 'https://marvellflorist.com/account', runScripts: 'outside-only' });
  const { window } = dom;
  const calls = [];
  const user = {
    id: 'user-1', profile_complete: true, title: 'ms', first_name: 'Ava', last_name: 'Lee',
    email: 'ava@example.com', phone: '0812345678', marketing_email_opt_in: false
  };
  window.MarvellShop = { t: (en) => en, formatIdr: (value) => `Rp${value}` };
  window.fetch = async (path, options = {}) => {
    calls.push({ path, options });
    if (path === '/api/account/orders') {
      return { ok: true, json: async () => ({ ok: true, orders: [{
        order_number: 'MF-260921-ABCDE', total_idr: 400000, status: 'paid',
        payment_status: 'settlement', delivery_method: 'delivery', created_at: '2026-09-21T00:00:00Z',
        items: [{ name: 'Soft Tones', quantity: 1 }]
      }] }) };
    }
    if (options.method === 'PATCH') {
      const body = JSON.parse(options.body);
      return { ok: true, json: async () => ({ ok: true, user: { ...user, ...body } }) };
    }
    throw Error(`unexpected request: ${path}`);
  };

  window.eval(DETAILS);
  window.MarvellDetails.render(user);
  const form = window.document.querySelector('[data-details-profile]');
  assert.equal(form.elements.email.value, 'ava@example.com');
  assert.equal(form.elements.email.readOnly, true);
  form.elements.first_name.value = 'Avery';
  form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await new Promise((resolve) => setTimeout(resolve, 0));
  const patch = calls.find(({ options }) => options.method === 'PATCH');
  assert.equal(JSON.parse(patch.options.body).first_name, 'Avery');
  assert.equal(Object.hasOwn(JSON.parse(patch.options.body), 'email'), false);
  assert.match(window.document.querySelector('[data-details-profile-note]').textContent, /saved/);

  window.document.querySelector('[data-details-tab="orders"]').click();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.match(window.document.querySelector('[data-details-orders]').textContent, /MF-260921-ABCDE/);
  assert.equal(window.document.querySelector('[data-details-panel="profile"]').hidden, true);
  dom.window.close();
});
