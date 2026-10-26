import { getStore } from '@netlify/blobs';
import { HttpError } from './http.mjs';

// One record per barber per day: { bookings: [...], blocks: [...] }
let testStore = null;
export const useStoreForTests = (s) => { testStore = s; };
const store = () => testStore || getStore({ name: 'bookings', consistency: 'strong' });
const dayKey = (barberId, date) => `day/${barberId}/${date}`;
const emptyDay = () => ({ bookings: [], blocks: [] });

export async function readDay(barberId, date) {
  const res = await store().getWithMetadata(dayKey(barberId, date), { type: 'json' });
  return res ? { day: { ...emptyDay(), ...res.data }, etag: res.etag } : { day: emptyDay(), etag: null };
}

// Runs change(day) and saves the result only if nobody else saved that day in
// between, retrying on a clash. This is what stops two people taking one slot.
export async function updateDay(barberId, date, change) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const { day, etag } = await readDay(barberId, date);
    const result = await change(day);
    const { modified } = await store().setJSON(dayKey(barberId, date), day, etag ? { onlyIfMatch: etag } : { onlyIfNew: true });
    if (modified) return result;
  }
  throw new HttpError(503, 'The schedule is busy right now. Please try again.');
}

// Booking id -> where it lives, for the cancel link
export const saveBookingRef = (id, ref) => store().setJSON(`booking/${id}`, ref);
export const readBookingRef = (id) => store().get(`booking/${id}`, { type: 'json' });
