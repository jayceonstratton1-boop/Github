// Barbers, hours and services for online booking.
// Keep these in sync with the BARBER settings in book.html.

export const TIME_ZONE = 'America/Los_Angeles';
export const SLOT_STEP = 15;        // minutes between start times
export const DAYS_AHEAD = 14;       // how far ahead people can book
export const MIN_NOTICE_MINS = 30;  // earliest same-day start, from now

const WEEKDAY = [['09:00', '13:00'], ['14:00', '18:00']];

export const BARBERS = {
  angel: {
    id: 'angel',
    name: 'AngelTheBarber',
    // 0 = Sunday
    hours: { 0: [['07:00', '13:00']], 1: WEEKDAY, 2: [], 3: WEEKDAY, 4: WEEKDAY, 5: WEEKDAY, 6: [['07:00', '13:00']] },
    services: [
      { id: 'haircut', name: 'Haircut', price: 45, mins: 45 },
      { id: 'haircut-brows', name: 'Haircut w/ Eyebrows', price: 50, mins: 50 },
      { id: 'haircut-beard', name: 'Haircut w/ Beard', price: 60, mins: 60 },
      { id: 'sunday', name: 'Sunday Haircut', price: 55, mins: 45, sundayOnly: true },
      { id: 'haircut-design', name: 'Haircut w/ Design', price: 50, mins: 50 },
      { id: 'haircut-brows-design', name: 'Haircut, Eyebrows & Design', price: 55, mins: 55 },
    ],
  },
};

export const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

export function isDateStr(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export const dayOfWeek = (date) => new Date(date + 'T00:00:00Z').getUTCDay();

export function addDays(date, n) {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Today's date and minutes past midnight at the shop
export function shopNow(at = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(at).map((p) => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, mins: Number(parts.hour) * 60 + Number(parts.minute) };
}

export const bookingDates = (now) => Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(now.date, i));

// Start times (minutes past midnight) still open for this service on this date
export function openSlots({ barber, service, date, day, now }) {
  const dow = dayOfWeek(date);
  // Sundays only take the Sunday service, and the Sunday service only runs on Sundays
  if (Boolean(service.sundayOnly) !== (dow === 0)) return [];
  if (date < now.date || date > addDays(now.date, DAYS_AHEAD - 1)) return [];

  const busy = [
    ...day.bookings.filter((b) => b.status === 'booked').map((b) => [b.start, b.start + b.mins]),
    ...day.blocks.map((b) => [b.start, b.end]),
  ];
  const earliest = date === now.date ? now.mins + MIN_NOTICE_MINS : 0;
  const out = [];
  for (const [a, b] of barber.hours[dow]) {
    for (let t = toMin(a); t + service.mins <= toMin(b); t += SLOT_STEP) {
      if (t < earliest) continue;
      if (busy.some(([s, e]) => t < e && t + service.mins > s)) continue;
      out.push(t);
    }
  }
  return out;
}

export function formatTime(mins) {
  const h = Math.floor(mins / 60), m = mins % 60;
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

export function formatDate(date) {
  return new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' });
}
