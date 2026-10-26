// Sends texts through Twilio. Needs TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and
// TWILIO_FROM_NUMBER (or TWILIO_MESSAGING_SERVICE_SID) in the host's environment.

export function smsConfigured(env = process.env) {
  return Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && (env.TWILIO_FROM_NUMBER || env.TWILIO_MESSAGING_SERVICE_SID));
}

// to: 10-digit US number. Returns true when Twilio accepted the message.
export async function sendSms(to, body, env = process.env) {
  if (!smsConfigured(env)) return false;
  const sid = env.TWILIO_ACCOUNT_SID;
  const params = new URLSearchParams({ To: '+1' + to, Body: body });
  if (env.TWILIO_MESSAGING_SERVICE_SID) params.set('MessagingServiceSid', env.TWILIO_MESSAGING_SERVICE_SID);
  else params.set('From', env.TWILIO_FROM_NUMBER);

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${sid}:${env.TWILIO_AUTH_TOKEN}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });
  if (!res.ok) {
    console.error('Twilio error', res.status, await res.text());
    return false;
  }
  return true;
}
