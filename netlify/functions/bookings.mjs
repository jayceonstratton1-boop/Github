// POST   /api/bookings              book a time
// GET    /api/bookings/:id?code=    look up a booking (for the cancel link)
// DELETE /api/bookings/:id?code=    cancel it
//
// Optional environment: NOTIFY_PHONE (10 digits) gets a text for every new booking.
import { randomBytes, randomUUID } from 'node:crypto';
import { BARBERS, formatDate, formatTime, isDateStr, openSlots, shopNow } from '../lib/shop.mjs';
import { readBookingRef, readDay, saveBookingRef, updateDay } from '../lib/store.mjs';
import { HttpError, digits, handle, json, readJson } from '../lib/http.mjs';
import { sendSms } from '../lib/sms.mjs';

const SHOP = 'The New Era Barber Studio';
const cleanText = (s, max) => String(s || '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);

// What the customer gets back; never includes other people's details
const publicView = (b, barber, date) => ({
  id: b.id, status: b.status, barber: barber.name, service: b.service, price: b.price, mins: b.mins,
  date, start: b.start, dateLabel: formatDate(date), timeLabel: formatTime(b.start), name: b.name,
});

export default handle(async (req) => {
  const url = new URL(req.url);
  const id = url.pathname.split('/').filter(Boolean)[2];

  if (req.method === 'POST' && !id) return create(req, url);
  if (id && (req.method === 'GET' || req.method === 'DELETE')) return manage(req, id, url.searchParams.get('code'));
  throw new HttpError(405, 'Method not allowed');
});

async function create(req, url) {
  const body = await readJson(req);
  if (body.website) throw new HttpError(400, 'Bad request'); // hidden field only bots fill in

  const barber = BARBERS[body.barber];
  if (!barber) throw new HttpError(400, 'Pick a barber.');
  const service = barber.services.find((s) => s.id === body.service);
  if (!service) throw new HttpError(400, 'Pick a service.');
  if (!isDateStr(body.date) || !Number.isInteger(body.start)) throw new HttpError(400, 'Pick a day and time.');
  const name = cleanText(body.name, 40);
  if (name.length < 2) throw new HttpError(400, 'Enter your name.');
  const phone = digits(body.phone);
  if (phone.length !== 10) throw new HttpError(400, 'Enter a 10-digit phone number.');
  if (body.agreed !== true) throw new HttpError(400, 'Please agree to the booking policy.');
  const notes = cleanText(body.notes, 200);

  const booking = {
    id: randomUUID(),
    code: randomBytes(9).toString('base64url'),
    serviceId: service.id, service: service.name, price: service.price, mins: service.mins,
    start: body.start, name, phone, notes, sms: body.sms === true,
    status: 'booked', createdAt: new Date().toISOString(),
  };

  await updateDay(barber.id, body.date, (day) => {
    const open = openSlots({ barber, service, date: body.date, day, now: shopNow() });
    if (!open.includes(body.start)) throw new HttpError(409, 'Sorry, that time was just taken. Please pick another time.');
    if (day.bookings.some((b) => b.status === 'booked' && b.phone === phone)) {
      throw new HttpError(409, 'You already have an appointment that day. Cancel it first to pick a new time.');
    }
    day.bookings.push(booking);
  });
  await saveBookingRef(booking.id, { barber: barber.id, date: body.date });

  const when = `${formatDate(body.date)} at ${formatTime(booking.start)}`;
  const manageUrl = `${url.origin}/book.html?booking=${booking.id}&code=${booking.code}`;
  const texts = [];
  if (booking.sms) {
    texts.push(sendSms(phone, `${SHOP}: You're booked with ${barber.name} for ${service.name} on ${when}. Arriving 10+ min late cancels your appointment. Cancel: ${manageUrl} Reply STOP to opt out.`));
  }
  const notify = digits(process.env.NOTIFY_PHONE);
  if (notify.length === 10) texts.push(sendSms(notify, `New booking: ${name} - ${service.name} with ${barber.name}, ${when}.`));
  await Promise.allSettled(texts);

  return json({ ...publicView(booking, barber, body.date), code: booking.code, manageUrl }, 201);
}

async function manage(req, id, code) {
  const ref = await readBookingRef(id);
  const barber = ref && BARBERS[ref.barber];
  const { day } = barber ? await readDay(barber.id, ref.date) : { day: null };
  const found = day && day.bookings.find((b) => b.id === id);
  if (!found || !code || found.code !== code) throw new HttpError(404, 'Booking not found.');

  if (req.method === 'GET') return json(publicView(found, barber, ref.date));

  const result = await updateDay(barber.id, ref.date, (fresh) => {
    const b = fresh.bookings.find((x) => x.id === id);
    if (b.status === 'booked') {
      b.status = 'cancelled';
      b.cancelledAt = new Date().toISOString();
      b.cancelledBy = 'customer';
    }
    return b;
  });
  return json(publicView(result, barber, ref.date));
}

export const config = { path: ['/api/bookings', '/api/bookings/:id'] };
