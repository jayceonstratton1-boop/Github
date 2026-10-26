// GET /api/availability?barber=angel&service=haircut
// Open start times for the next two weeks.
import { BARBERS, bookingDates, openSlots, shopNow } from '../lib/shop.mjs';
import { readDay } from '../lib/store.mjs';
import { HttpError, handle, json } from '../lib/http.mjs';

export default handle(async (req) => {
  if (req.method !== 'GET') throw new HttpError(405, 'Method not allowed');
  const url = new URL(req.url);
  const barber = BARBERS[url.searchParams.get('barber')];
  if (!barber) throw new HttpError(404, 'Barber not found');
  const service = barber.services.find((s) => s.id === url.searchParams.get('service'));
  if (!service) throw new HttpError(404, 'Service not found');

  const now = shopNow();
  const days = await Promise.all(bookingDates(now).map(async (date) => {
    const { day } = await readDay(barber.id, date);
    return { date, slots: openSlots({ barber, service, date, day, now }) };
  }));
  return json({ today: now.date, days });
});

export const config = { path: '/api/availability' };
