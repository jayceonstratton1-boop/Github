// Staff tools for admin.html. Every request needs the X-Admin-Pin header to match
// the ADMIN_PIN environment variable.
//
// GET    /api/admin/day?barber=&date=           appointments and blocked time
// POST   /api/admin/blocks  {barber,date,start,end,note}
// DELETE /api/admin/blocks?barber=&date=&id=
// DELETE /api/admin/bookings?barber=&date=&id=  cancel an appointment
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { BARBERS, isDateStr } from '../lib/shop.mjs';
import { readDay, updateDay } from '../lib/store.mjs';
import { HttpError, handle, json, readJson } from '../lib/http.mjs';

function checkPin(req) {
  const pin = process.env.ADMIN_PIN;
  if (!pin) throw new HttpError(503, 'Staff access is not set up yet. Add ADMIN_PIN in the hosting settings.');
  const given = Buffer.from(req.headers.get('x-admin-pin') || '');
  const want = Buffer.from(pin);
  return given.length === want.length && timingSafeEqual(given, want);
}

function target(params) {
  const barber = BARBERS[params.get('barber')];
  const date = params.get('date');
  if (!barber || !isDateStr(date)) throw new HttpError(400, 'Pick a barber and date.');
  return { barber, date };
}

export default handle(async (req) => {
  if (!checkPin(req)) {
    await new Promise((r) => setTimeout(r, 600)); // slow down PIN guessing
    throw new HttpError(401, 'Wrong PIN');
  }
  const url = new URL(req.url);
  const route = url.pathname.split('/').filter(Boolean)[2];

  if (route === 'day' && req.method === 'GET') {
    const { barber, date } = target(url.searchParams);
    const { day } = await readDay(barber.id, date);
    day.bookings.sort((a, b) => a.start - b.start);
    day.blocks.sort((a, b) => a.start - b.start);
    return json({ barber: barber.name, date, ...day });
  }

  if (route === 'blocks' && req.method === 'POST') {
    const body = await readJson(req);
    const { barber, date } = target(new URLSearchParams({ barber: body.barber, date: body.date }));
    const { start, end } = body;
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end > 24 * 60 || start >= end) {
      throw new HttpError(400, 'The end time has to be after the start time.');
    }
    const block = { id: randomUUID(), start, end, note: String(body.note || '').trim().slice(0, 80) };
    await updateDay(barber.id, date, (day) => { day.blocks.push(block); });
    return json(block, 201);
  }

  if (route === 'blocks' && req.method === 'DELETE') {
    const { barber, date } = target(url.searchParams);
    const id = url.searchParams.get('id');
    await updateDay(barber.id, date, (day) => { day.blocks = day.blocks.filter((b) => b.id !== id); });
    return json({ ok: true });
  }

  if (route === 'bookings' && req.method === 'DELETE') {
    const { barber, date } = target(url.searchParams);
    const id = url.searchParams.get('id');
    await updateDay(barber.id, date, (day) => {
      const b = day.bookings.find((x) => x.id === id);
      if (!b) throw new HttpError(404, 'Appointment not found.');
      if (b.status === 'booked') {
        b.status = 'cancelled';
        b.cancelledAt = new Date().toISOString();
        b.cancelledBy = 'staff';
      }
    });
    return json({ ok: true });
  }

  throw new HttpError(404, 'Not found');
});

export const config = { path: '/api/admin/*' };
