// Sends a welcome text when a customer creates an account on the check-in tablet.
//
// Set these environment variables in the hosting dashboard (never put them in this file):
//   TWILIO_ACCOUNT_SID             from the Twilio console
//   TWILIO_AUTH_TOKEN              from the Twilio console
//   TWILIO_FROM_NUMBER             the shop's Twilio number, e.g. +15095550123
//     or TWILIO_MESSAGING_SERVICE_SID instead of TWILIO_FROM_NUMBER
//   KIOSK_KEY (recommended)        a long random password; only the tablet that has it can send texts

const SHOP = 'The New Era Barber Studio';
const COOLDOWN_MS = 60 * 1000;
const recent = new Map(); // phone -> last send time (best effort, resets on cold start)

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const env = process.env;
  if (env.KIOSK_KEY && req.headers.get('x-kiosk-key') !== env.KIOSK_KEY) {
    return json({ error: 'Not allowed' }, 403);
  }

  let body;
  try { body = await req.json(); } catch { return json({ error: 'Bad request' }, 400); }

  const phone = String(body.phone || '').replace(/\D/g, '').slice(-10);
  if (phone.length !== 10) return json({ error: 'Invalid phone number' }, 400);
  const first = String(body.firstName || '').replace(/[^\p{L}' -]/gu, '').trim().slice(0, 24) || 'there';

  if (Date.now() - (recent.get(phone) || 0) < COOLDOWN_MS) return json({ error: 'Too many requests' }, 429);

  const { TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: token } = env;
  if (!sid || !token || !(env.TWILIO_FROM_NUMBER || env.TWILIO_MESSAGING_SERVICE_SID)) {
    return json({ error: 'Texting is not set up yet' }, 503);
  }

  const params = new URLSearchParams({
    To: '+1' + phone,
    Body: `${SHOP}: Hi ${first}, you're registered! Next visit, log in on our check-in tablet with this number and your PIN. Msg & data rates may apply. Reply STOP to opt out.`,
  });
  if (env.TWILIO_MESSAGING_SERVICE_SID) params.set('MessagingServiceSid', env.TWILIO_MESSAGING_SERVICE_SID);
  else params.set('From', env.TWILIO_FROM_NUMBER);

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });
  if (!res.ok) {
    console.error('Twilio error', res.status, await res.text());
    return json({ error: 'Text failed to send' }, 502);
  }

  recent.set(phone, Date.now());
  return json({ ok: true });
};

export const config = { path: '/api/sms/welcome' };

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
