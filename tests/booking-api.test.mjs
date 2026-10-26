// Runs the booking functions against an in-memory store that follows Netlify
// Blobs' rules for conditional writes (onlyIfNew / onlyIfMatch with ETags).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

import availability from '../netlify/functions/availability.mjs';
import bookings from '../netlify/functions/bookings.mjs';
import admin from '../netlify/functions/admin.mjs';
import { BARBERS, dayOfWeek, shopNow, bookingDates, openSlots } from '../netlify/lib/shop.mjs';
import { useStoreForTests } from '../netlify/lib/store.mjs';

const BASE = 'https://new-era.test';
const realFetch = globalThis.fetch;
const texts = [];
const pause = () => new Promise((r) => setTimeout(r, Math.random() * 5));

// Reads and writes yield to each other so concurrent requests really interleave
class MemoryStore {
  entries = new Map();
  version = 0;
  async get(key) { await pause(); const e = this.entries.get(key); return e ? JSON.parse(e.value) : null; }
  async getWithMetadata(key) {
    await pause();
    const e = this.entries.get(key);
    return e ? { data: JSON.parse(e.value), etag: e.etag, metadata: {} } : null;
  }
  async setJSON(key, data, opts = {}) {
    await pause();
    const e = this.entries.get(key);
    if (opts.onlyIfNew && e) return { modified: false };
    if (opts.onlyIfMatch && (!e || e.etag !== opts.onlyIfMatch)) return { modified: false };
    const etag = `"v${++this.version}"`;
    this.entries.set(key, { value: JSON.stringify(data), etag });
    return { modified: true, etag };
  }
}

before(() => {
  useStoreForTests(new MemoryStore());
  globalThis.fetch = async (input, init) => {
    const u = String(input instanceof Request ? input.url : input);
    if (!u.startsWith('https://api.twilio.com/')) throw new Error('Unexpected network call: ' + u);
    texts.push(Object.fromEntries(new URLSearchParams(init.body.toString())));
    return new Response('{"sid":"SM1"}', { status: 201 });
  };
});

after(() => { globalThis.fetch = realFetch; useStoreForTests(null); });

const call = async (fn, method, path, { body, headers } = {}) => {
  const res = await fn(new Request(BASE + path, {
    method, headers: { 'Content-Type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined,
  }), {});
  return { status: res.status, data: await res.json() };
};
const avail = (service) => call(availability, 'GET', `/api/availability?barber=angel&service=${service}`);
const book = (over) => call(bookings, 'POST', '/api/bookings', {
  body: { barber: 'angel', service: 'haircut', name: 'Test Person', phone: '(509) 555-0100', agreed: true, ...over },
});
// First non-Sunday day with at least 8 open slots
async function openDay(service = 'haircut') {
  const { data } = await avail(service);
  return data.days.find((d) => d.slots.length >= 8);
}

test('availability follows the hours and the Sunday rule', async () => {
  const { status, data } = await avail('haircut');
  assert.equal(status, 200);
  assert.equal(data.days.length, 14);
  for (const d of data.days) {
    const dow = dayOfWeek(d.date);
    if (dow === 2 || dow === 0) assert.deepEqual(d.slots, [], `${d.date} should have no regular haircut slots`);
    for (const t of d.slots) assert.ok(t + 45 <= (dow === 6 ? 13 * 60 : 18 * 60));
  }
  const sunday = await avail('sunday');
  for (const d of sunday.data.days) if (dayOfWeek(d.date) !== 0) assert.deepEqual(d.slots, []);
  assert.equal((await call(availability, 'GET', '/api/availability?barber=nobody&service=haircut')).status, 404);
});

test('no lunch-break overlap and same-day notice', () => {
  const barber = BARBERS.angel;
  const service = barber.services.find((s) => s.id === 'haircut-beard'); // 60 min
  const now = { date: '2026-10-26', mins: 10 * 60 + 5 }; // Monday 10:05
  const slots = openSlots({ barber, service, date: '2026-10-26', day: { bookings: [], blocks: [] }, now });
  assert.equal(slots[0], 10 * 60 + 45, 'first slot is at least 30 min out, on a 15-min step');
  assert.ok(!slots.some((t) => t < 13 * 60 && t + 60 > 13 * 60), 'nothing runs into the 1-2pm break');
  assert.equal(slots.at(-1), 17 * 60);
});

test('booking takes the slot, and the same slot cannot be booked twice', async () => {
  const day = await openDay();
  const start = day.slots[0];
  const first = await book({ date: day.date, start, phone: '5095550101' });
  assert.equal(first.status, 201);
  assert.equal(first.data.timeLabel.length > 0, true);
  assert.ok(first.data.code && first.data.manageUrl.includes(first.data.id));

  const again = await book({ date: day.date, start, phone: '5095550102' });
  assert.equal(again.status, 409);

  const after = (await avail('haircut')).data.days.find((d) => d.date === day.date);
  assert.ok(!after.slots.some((t) => t < start + 45 && t + 45 > start), 'overlapping times are gone');
});

test('two people booking the same slot at once: only one wins', async () => {
  const day = await openDay();
  const start = day.slots.at(-1);
  const results = await Promise.all([
    book({ date: day.date, start, phone: '5095550111', name: 'Racer One' }),
    book({ date: day.date, start, phone: '5095550112', name: 'Racer Two' }),
    book({ date: day.date, start, phone: '5095550113', name: 'Racer Three' }),
  ]);
  assert.equal(results.filter((r) => r.status === 201).length, 1);
  assert.equal(results.filter((r) => r.status === 409).length, 2);
});

test('one appointment per phone per day', async () => {
  const day = await openDay();
  const a = await book({ date: day.date, start: day.slots[2], phone: '5095550120' });
  assert.equal(a.status, 201);
  const b = await book({ date: day.date, start: day.slots[5], phone: '5095550120' });
  assert.equal(b.status, 409);
  assert.match(b.data.error, /already have an appointment/);
});

test('bad requests are refused', async () => {
  const day = await openDay();
  const s = day.slots[1];
  assert.equal((await book({ date: day.date, start: s, agreed: false })).status, 400);
  assert.equal((await book({ date: day.date, start: s, phone: '555' })).status, 400);
  assert.equal((await book({ date: day.date, start: s, name: 'A' })).status, 400);
  assert.equal((await book({ date: day.date, start: s, website: 'spam.example' })).status, 400);
  assert.equal((await book({ date: '2026-13-40', start: s })).status, 400);
  assert.equal((await book({ date: day.date, start: s + 1 })).status, 409, 'off-grid time');
  assert.equal((await book({ date: day.date, start: s, service: 'sunday' })).status, 409, 'Sunday service on a weekday');
});

test('cancel link: wrong code is refused, right code cancels and frees the slot', async () => {
  const day = await openDay();
  const start = day.slots[3];
  const { data: b } = await book({ date: day.date, start, phone: '5095550130' });
  assert.equal((await call(bookings, 'GET', `/api/bookings/${b.id}?code=nope`)).status, 404);
  const look = await call(bookings, 'GET', `/api/bookings/${b.id}?code=${b.code}`);
  assert.equal(look.status, 200);
  assert.equal(look.data.status, 'booked');
  assert.equal(look.data.phone, undefined, 'phone is not sent back');
  const cancel = await call(bookings, 'DELETE', `/api/bookings/${b.id}?code=${b.code}`);
  assert.equal(cancel.data.status, 'cancelled');
  const after = (await avail('haircut')).data.days.find((d) => d.date === day.date);
  assert.ok(after.slots.includes(start), 'slot is open again');
});

test('staff tools need ADMIN_PIN and can block time and cancel', async () => {
  delete process.env.ADMIN_PIN;
  assert.equal((await call(admin, 'GET', '/api/admin/day?barber=angel&date=2026-10-26')).status, 503, 'not set up yet');
  process.env.ADMIN_PIN = '482913';
  const pin = { 'X-Admin-Pin': '482913' };
  assert.equal((await call(admin, 'GET', '/api/admin/day?barber=angel&date=2026-10-26', { headers: { 'X-Admin-Pin': '000000' } })).status, 401);

  const day = await openDay();
  const { data: b } = await book({ date: day.date, start: day.slots[4], phone: '5095550140', name: 'Staff View' });
  const view = await call(admin, 'GET', `/api/admin/day?barber=angel&date=${day.date}`, { headers: pin });
  assert.equal(view.status, 200);
  const row = view.data.bookings.find((x) => x.id === b.id);
  assert.equal(row.phone, '5095550140');

  const block = await call(admin, 'POST', '/api/admin/blocks', { headers: pin, body: { barber: 'angel', date: day.date, start: 14 * 60, end: 16 * 60, note: 'Booksy appt' } });
  assert.equal(block.status, 201);
  const blocked = (await avail('haircut')).data.days.find((d) => d.date === day.date);
  assert.ok(!blocked.slots.some((t) => t < 16 * 60 && t + 45 > 14 * 60), 'blocked time is not offered');
  assert.equal((await call(admin, 'POST', '/api/admin/blocks', { headers: pin, body: { barber: 'angel', date: day.date, start: 600, end: 500 } })).status, 400);

  await call(admin, 'DELETE', `/api/admin/blocks?barber=angel&date=${day.date}&id=${block.data.id}`, { headers: pin });
  await call(admin, 'DELETE', `/api/admin/bookings?barber=angel&date=${day.date}&id=${b.id}`, { headers: pin });
  const after = await call(admin, 'GET', `/api/admin/day?barber=angel&date=${day.date}`, { headers: pin });
  assert.equal(after.data.blocks.length, 0);
  assert.equal(after.data.bookings.find((x) => x.id === b.id).status, 'cancelled');
});

test('texts go to the customer (when asked) and the shop', async () => {
  Object.assign(process.env, { TWILIO_ACCOUNT_SID: 'AC1', TWILIO_AUTH_TOKEN: 't', TWILIO_FROM_NUMBER: '+15095559999', NOTIFY_PHONE: '509-555-0000' });
  texts.length = 0;
  const day = await openDay();
  const res = await book({ date: day.date, start: day.slots[6], phone: '5095550150', name: 'Text Me', sms: true });
  assert.equal(res.status, 201);
  assert.equal(texts.length, 2);
  const toCustomer = texts.find((t) => t.To === '+15095550150');
  assert.match(toCustomer.Body, /You're booked with AngelTheBarber for Haircut/);
  assert.ok(toCustomer.Body.includes(res.data.manageUrl));
  assert.match(texts.find((t) => t.To === '+15095550000').Body, /New booking: Text Me/);

  texts.length = 0;
  const day2 = await openDay();
  await book({ date: day2.date, start: day2.slots.at(-2), phone: '5095550151', name: 'No Text' });
  assert.equal(texts.length, 1, 'only the shop is texted when the customer did not ask');
  for (const k of ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM_NUMBER', 'NOTIFY_PHONE']) delete process.env[k];
});

test('shop time zone helpers', () => {
  const now = shopNow(new Date('2026-10-27T06:30:00Z')); // 11:30pm Oct 26 in Pasco
  assert.equal(now.date, '2026-10-26');
  assert.equal(now.mins, 23 * 60 + 30);
  assert.equal(bookingDates(now)[13], '2026-11-08');
});
