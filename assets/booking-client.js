// Talks to the booking functions (netlify/functions) on the live site.
// Opened as a file or inside a preview there is no server, so it switches to a
// preview mode that keeps bookings in this browser only. Preview mode is never
// used on a real web address: there, errors are shown instead.
(function () {
  const LIVE = /^https?:$/.test(location.protocol);
  const enc = encodeURIComponent;

  function fail(message, status) {
    const err = new Error(message);
    err.status = status;
    return err;
  }

  async function call(method, path, body, headers) {
    let res;
    try {
      res = await fetch('/api' + path, {
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (e) {
      throw fail('Online booking is unavailable right now. Please try again in a few minutes, or walk in.', 0);
    }
    let data = {};
    try { data = await res.json(); } catch (e) { /* no body */ }
    if (!res.ok) throw fail(data.error || 'Online booking is unavailable right now. Please try again in a few minutes, or walk in.', res.status);
    return data;
  }

  const live = {
    availability: (barber, service) => call('GET', `/availability?barber=${enc(barber)}&service=${enc(service)}`),
    book: (booking) => call('POST', '/bookings', booking),
    getBooking: (id, code) => call('GET', `/bookings/${enc(id)}?code=${enc(code)}`),
    cancelBooking: (id, code) => call('DELETE', `/bookings/${enc(id)}?code=${enc(code)}`),
    adminDay: (pin, barber, date) => call('GET', `/admin/day?barber=${enc(barber)}&date=${enc(date)}`, null, { 'X-Admin-Pin': pin }),
    adminAddBlock: (pin, block) => call('POST', '/admin/blocks', block, { 'X-Admin-Pin': pin }),
    adminRemoveBlock: (pin, barber, date, id) => call('DELETE', `/admin/blocks?barber=${enc(barber)}&date=${enc(date)}&id=${enc(id)}`, null, { 'X-Admin-Pin': pin }),
    adminCancel: (pin, barber, date, id) => call('DELETE', `/admin/bookings?barber=${enc(barber)}&date=${enc(date)}&id=${enc(id)}`, null, { 'X-Admin-Pin': pin }),
  };

  // ---- Preview mode: same rules as netlify/lib/shop.mjs, stored in this browser ----
  const KEY = 'newera-preview-bookings-v1';
  // Without browser storage, keep bookings on the top window so pages shown
  // side by side in one preview still see each other's bookings
  const shared = (() => { try { return (window.top.__newEraPreview = window.top.__newEraPreview || { all: {} }); } catch (e) { return { all: {} }; } })();
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || shared.all; } catch (e) { return shared.all; } };
  const save = (all) => { shared.all = all; try { localStorage.setItem(KEY, JSON.stringify(all)); } catch (e) { /* shared memory only */ } };
  const dayOf = (all, barber, date) => all[`${barber}/${date}`] || (all[`${barber}/${date}`] = { bookings: [], blocks: [] });
  const pad = (n) => String(n).padStart(2, '0');
  const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
  const randomId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
  const later = (v) => new Promise((r) => setTimeout(() => r(v), 250));

  function previewSlots(cfg, service, date, day) {
    const dow = new Date(date + 'T12:00:00').getDay();
    if (Boolean(service.sundayOnly) !== (dow === 0)) return [];
    const now = new Date();
    const earliest = date === isoDate(now) ? now.getHours() * 60 + now.getMinutes() + 30 : 0;
    const busy = [
      ...day.bookings.filter((b) => b.status === 'booked').map((b) => [b.start, b.start + b.mins]),
      ...day.blocks.map((b) => [b.start, b.end]),
    ];
    const out = [];
    for (const [a, b] of cfg.hours[dow]) {
      for (let t = toMin(a); t + service.mins <= toMin(b); t += 15) {
        if (t >= earliest && !busy.some(([s, e]) => t < e && t + service.mins > s)) out.push(t);
      }
    }
    return out;
  }
  function findBooking(all, id) {
    for (const [key, day] of Object.entries(all)) {
      const b = day.bookings.find((x) => x.id === id);
      if (b) return { b, date: key.split('/')[1] };
    }
    return {};
  }
  const view = (b, cfg, date) => ({ id: b.id, status: b.status, barber: cfg ? cfg.name : b.barberName, service: b.service, price: b.price, mins: b.mins, date, start: b.start, name: b.name });

  const preview = {
    availability(barber, serviceId, cfg) {
      const all = load();
      const service = cfg.services.find((s) => s.id === serviceId);
      const start = new Date();
      const days = Array.from({ length: 14 }, (_, i) => {
        const date = isoDate(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
        return { date, slots: previewSlots(cfg, service, date, dayOf(all, barber, date)) };
      });
      return later({ today: days[0].date, days });
    },
    book(p, cfg) {
      const all = load();
      const service = cfg.services.find((s) => s.id === p.service);
      const day = dayOf(all, p.barber, p.date);
      if (!previewSlots(cfg, service, p.date, day).includes(p.start)) return Promise.reject(fail('Sorry, that time was just taken. Please pick another time.', 409));
      const phone = String(p.phone).replace(/\D/g, '').slice(-10);
      if (day.bookings.some((b) => b.status === 'booked' && b.phone === phone)) return Promise.reject(fail('You already have an appointment that day. Cancel it first to pick a new time.', 409));
      const b = { id: randomId(), code: randomId(), service: service.name, price: service.price, mins: service.mins, start: p.start, name: p.name, phone, notes: p.notes || '', barberName: cfg.name, status: 'booked', createdAt: new Date().toISOString() };
      day.bookings.push(b);
      save(all);
      return later({ ...view(b, cfg, p.date), code: b.code, manageUrl: `book.html?booking=${b.id}&code=${b.code}` });
    },
    getBooking(id, code) {
      const { b, date } = findBooking(load(), id);
      return b && b.code === code ? later(view(b, null, date)) : Promise.reject(fail('Booking not found.', 404));
    },
    cancelBooking(id, code) {
      const all = load();
      const { b, date } = findBooking(all, id);
      if (!b || b.code !== code) return Promise.reject(fail('Booking not found.', 404));
      b.status = 'cancelled';
      save(all);
      return later(view(b, null, date));
    },
    adminDay(pin, barber, date) {
      const day = dayOf(load(), barber, date);
      return later({ date, bookings: [...day.bookings].sort((a, b) => a.start - b.start), blocks: [...day.blocks].sort((a, b) => a.start - b.start) });
    },
    adminAddBlock(pin, block) {
      const all = load();
      if (!(block.start < block.end)) return Promise.reject(fail('The end time has to be after the start time.', 400));
      const b = { id: randomId(), start: block.start, end: block.end, note: block.note || '' };
      dayOf(all, block.barber, block.date).blocks.push(b);
      save(all);
      return later(b);
    },
    adminRemoveBlock(pin, barber, date, id) {
      const all = load();
      const day = dayOf(all, barber, date);
      day.blocks = day.blocks.filter((b) => b.id !== id);
      save(all);
      return later({ ok: true });
    },
    adminCancel(pin, barber, date, id) {
      const all = load();
      const b = dayOf(all, barber, date).bookings.find((x) => x.id === id);
      if (b) b.status = 'cancelled';
      save(all);
      return later({ ok: true });
    },
  };

  window.BookingClient = { live: LIVE, ...(LIVE ? live : preview) };
})();
