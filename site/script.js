// Language: English / Español. Page text swaps via data-es attributes; text written by this script uses t()
const strings = {
  en: {
    openNow: "{name} is open now · until {time}", opensToday: "{name} opens today at {time}", opensTomorrow: "{name} opens tomorrow at {time}",
    preview: "Preview only: messages will send once the site is live.", sending: "Sending...", send: "Send message",
    thanks: "Thanks! We'll be in touch soon.", error: "Sorry, something went wrong. Please call or try again.",
    tapCan: "Tap the can to shake it", favorite: "A fan favorite. Ask for it at the window!",
    shakeHint: "📳 Or shake your phone!", shakeOff: "Phone shake is off. Tap the can instead!",
    daysLeft: "🎃 {n} days until Halloween · Today's spooky sip: {drink}", oneDay: "🎃 1 day until Halloween · Today's spooky sip: {drink}",
    halloween: "🎃 Happy Halloween! Today's spooky sip: {drink}", fallPick: "🍂 Today's fall pick: {drink}",
    langBtn: "ES", langLabel: "Ver en español", langAttr: "es",
  },
  es: {
    openNow: "{name} está abierto ahora · hasta las {time}", opensToday: "{name} abre hoy a las {time}", opensTomorrow: "{name} abre mañana a las {time}",
    preview: "Vista previa: los mensajes se enviarán cuando el sitio esté en línea.", sending: "Enviando...", send: "Enviar mensaje",
    thanks: "¡Gracias! Te responderemos pronto.", error: "Lo sentimos, algo salió mal. Llámanos o inténtalo de nuevo.",
    tapCan: "Toca la lata para agitarla", favorite: "Un favorito de nuestros clientes. ¡Pídelo en la ventanilla!",
    shakeHint: "📳 ¡O agita tu teléfono!", shakeOff: "Agitar el teléfono está desactivado. ¡Toca la lata!",
    daysLeft: "🎃 Faltan {n} días para Halloween · Bebida espeluznante del día: {drink}", oneDay: "🎃 Falta 1 día para Halloween · Bebida espeluznante del día: {drink}",
    halloween: "🎃 ¡Feliz Halloween! Bebida espeluznante del día: {drink}", fallPick: "🍂 Bebida de otoño del día: {drink}",
    langBtn: "EN", langLabel: "View in English", langAttr: "en",
  },
};
let lang = "en";
try {
  if (localStorage.getItem("sipco-lang") === "es") lang = "es";
} catch {}
const t = (key, vars = {}) => strings[lang][key].replace(/\{(\w+)\}/g, (_, k) => vars[k]);

// Mobile nav toggle
const toggle = document.querySelector(".nav-toggle");
const links = document.querySelector(".nav-links");
toggle.addEventListener("click", () => {
  const open = links.classList.toggle("open");
  toggle.setAttribute("aria-expanded", open);
});
function closeNav() {
  links.classList.remove("open");
  toggle.setAttribute("aria-expanded", "false");
}
links.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeNav));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && links.classList.contains("open")) {
    closeNav();
    toggle.focus();
  }
});

// Menu tabs
const tabs = document.querySelectorAll(".tab");
const panels = document.querySelectorAll(".menu-panel");
tabs.forEach((tab) =>
  tab.addEventListener("click", () => {
    tabs.forEach((t) => {
      t.classList.toggle("active", t === tab);
      t.setAttribute("aria-selected", t === tab);
    });
    panels.forEach((p) => p.classList.toggle("active", p.dataset.panel === tab.dataset.tab));
  })
);

// Jump to a menu tab (used by fan favorites and the drink picker)
function goToTab(key) {
  document.querySelector(`.tab[data-tab="${key}"]`)?.click();
  document.getElementById("menu").scrollIntoView({ behavior: "smooth" });
}
document.querySelectorAll("[data-goto-tab]").forEach((el) =>
  el.addEventListener("click", () => goToTab(el.dataset.gotoTab))
);

// Locations: open/closed status (Pacific time) and the visitor's chosen shop
const locations = {
  pasco: {
    name: "Pasco",
    hours: { weekday: [5, 19], weekend: [7, 18] },
    map: "https://www.google.com/maps/search/?api=1&query=Sip+%26+Co+8921+Sandifur+Pkwy+Pasco+WA",
  },
  richland: {
    name: "Richland",
    hours: { weekday: [5, 19], weekend: [7, 18] },
    map: "https://www.google.com/maps/search/?api=1&query=Sip+%26+Co+2588+Queensgate+Dr+Richland+WA",
  },
};
let chosen = "richland";
try {
  if (locations[localStorage.getItem("sipco-location")]) chosen = localStorage.getItem("sipco-location");
} catch {}

function fmtHour(h) {
  return h === 12 ? "12pm" : h > 12 ? `${h - 12}pm` : `${h}am`;
}
// Today's date parts in Pacific time
function pacificNow() {
  return Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles", weekday: "short", month: "numeric", day: "numeric", year: "numeric",
      hour: "numeric", minute: "numeric", hourCycle: "h23",
    }).formatToParts(new Date()).map((p) => [p.type, p.value])
  );
}
function openStatus(key) {
  const { name, hours } = locations[key];
  const parts = pacificNow();
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday);
  const now = Number(parts.hour) + Number(parts.minute) / 60;
  const hoursFor = (d) => (d === 0 || d === 6 ? hours.weekend : hours.weekday);
  const [open, close] = hoursFor(day);
  if (now >= open && now < close) return { open: true, text: t("openNow", { name, time: fmtHour(close) }) };
  if (now < open) return { open: false, text: t("opensToday", { name, time: fmtHour(open) }) };
  return { open: false, text: t("opensTomorrow", { name, time: fmtHour(hoursFor((day + 1) % 7)[0]) }) };
}
function showStatus() {
  document.querySelectorAll("[data-open-status]").forEach((el) => {
    const key = el.dataset.openStatus === "chosen" ? chosen : el.dataset.openStatus;
    const { open, text } = openStatus(key);
    el.textContent = text;
    el.classList.toggle("is-open", open);
    el.hidden = false;
  });
}
function chooseLocation(key) {
  chosen = key;
  try { localStorage.setItem("sipco-location", key); } catch {}
  document.querySelectorAll("[data-choose-location]").forEach((btn) => {
    const on = btn.dataset.chooseLocation === key;
    btn.classList.toggle("active", on);
    btn.setAttribute("aria-pressed", on);
  });
  document.querySelectorAll("[data-directions]").forEach((a) => (a.href = locations[key].map));
  document.querySelectorAll("[data-location-name]").forEach((el) => (el.textContent = locations[key].name));
  document.querySelectorAll("[data-for-location]").forEach((el) => (el.hidden = el.dataset.forLocation !== key));
  const shopSelect = document.querySelector('#contact-form select[name="location"]');
  if (shopSelect && !shopSelect.dataset.touched) shopSelect.value = locations[key].name;
  showStatus();
}
document.querySelectorAll("[data-choose-location]").forEach((btn) =>
  btn.addEventListener("click", () => chooseLocation(btn.dataset.chooseLocation))
);
chooseLocation(chosen);
setInterval(showStatus, 60000);

document.querySelector('#contact-form select[name="location"]')
  .addEventListener("change", (e) => (e.target.dataset.touched = "1"));

// Contact form: submits to Netlify Forms without leaving the page
document.getElementById("contact-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const status = form.querySelector(".form-status");
  // Opened as a local file (demo preview): there's no server to send to yet
  if (location.protocol === "file:") {
    status.textContent = t("preview");
    return;
  }
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  button.textContent = t("sending");
  try {
    const res = await fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(new FormData(form)).toString(),
    });
    if (!res.ok) throw new Error(res.status);
    form.reset();
    status.textContent = t("thanks");
  } catch {
    status.textContent = t("error");
  } finally {
    button.disabled = false;
    button.textContent = t("send");
  }
});

// Drink picker: pulls drinks straight from the menu so it never goes stale
const skipInPicker = ["Water in a Can", "Refreshers / Lemonades", "Chocolate Milk", "Customized Energy Drink"];
const drinks = [...document.querySelectorAll(".menu-panel")].flatMap((panel) =>
  [...panel.querySelectorAll(".menu-item")].map((item) => ({
    cat: panel.dataset.panel,
    name: item.querySelector("h3").textContent,
    item,
  }))
).filter((d) => !skipInPicker.includes(d.name));
const canColors = {
  redbulls: ["#ff6b8b", "#ffb36b", "#fff1e0"],
  matcha: ["#b58ee0", "#a9cf7f", "#e6f2d2"],
  coffee: ["#6b4a35", "#d9b48f", "#f6ead9"],
  caffeinefree: ["#ff9a76", "#ffd36e", "#fff6dc"],
  fall: ["#c9772b", "#e9b77a", "#f6e3c8"],
};
const can = document.getElementById("can");
const chips = document.querySelectorAll(".chip");
let filter = "all";
chips.forEach((chip) =>
  chip.addEventListener("click", () => {
    filter = chip.dataset.filter;
    chips.forEach((c) => c.classList.toggle("active", c === chip));
  })
);
let lastPick = null;
const pickDesc = (pick) => pick.item.querySelector("p")?.textContent || t("favorite");
document.getElementById("pick-menu").addEventListener("click", () => lastPick && goToTab(lastPick.cat));
let shaking = false;
function shakeCan() {
  if (shaking) return;
  shaking = true;
  // On phones the can sits below the button: bring it into view so the shake is visible
  const bar = document.querySelector(".mobile-bar");
  const barHeight = bar && getComputedStyle(bar).display !== "none" ? bar.offsetHeight : 0;
  const box = can.getBoundingClientRect();
  if (box.top < 70 || box.bottom > innerHeight - barHeight) {
    const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    can.scrollIntoView({ block: "center", behavior: calm ? "auto" : "smooth" });
  }
  const pool = drinks.filter((d) => filter === "all" || d.cat === filter);
  const pick = pool[Math.floor(Math.random() * pool.length)];
  can.classList.remove("landed");
  can.classList.add("shaking");
  setTimeout(() => {
    const [top, mid, bot] = canColors[pick.cat];
    can.style.setProperty("--can-top", top);
    can.style.setProperty("--can-mid", mid);
    can.style.setProperty("--can-bot", bot);
    document.getElementById("pick-name").textContent = pick.name;
    document.getElementById("pick-desc").textContent = pickDesc(pick);
    can.classList.remove("shaking");
    can.classList.add("landed");
    lastPick = pick;
    document.getElementById("pick-actions").hidden = false;
    shaking = false;
  }, 900);
}
document.getElementById("shake").addEventListener("click", shakeCan);
can.addEventListener("click", shakeCan);
can.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    shakeCan();
  }
});

// Shake your phone to shake the can (only while the drink picker is on screen)
const motionBtn = document.getElementById("motion-btn");
const shakeHint = document.getElementById("shake-hint");
let pickerOnScreen = false;
new IntersectionObserver(([entry]) => (pickerOnScreen = entry.isIntersecting), { threshold: 0.3 })
  .observe(document.getElementById("picker"));

let lastMotion = null;
let lastShakeAt = 0;
function onMotion(e) {
  const a = e.accelerationIncludingGravity;
  if (!a || a.x == null) return;
  if (lastMotion) {
    const jolt = Math.abs(a.x - lastMotion.x) + Math.abs(a.y - lastMotion.y) + Math.abs(a.z - lastMotion.z);
    if (jolt > 22 && pickerOnScreen && e.timeStamp - lastShakeAt > 1500) {
      lastShakeAt = e.timeStamp;
      shakeCan();
    }
  }
  lastMotion = { x: a.x, y: a.y, z: a.z };
}
function enablePhoneShake() {
  window.addEventListener("devicemotion", onMotion);
  motionBtn.hidden = true;
  shakeHint.textContent = t("shakeHint");
  shakeHint.dataset.msg = "shakeHint";
  shakeHint.hidden = false;
}
if ("DeviceMotionEvent" in window && matchMedia("(pointer: coarse)").matches) {
  if (typeof DeviceMotionEvent.requestPermission === "function") {
    // iPhone: motion needs the visitor's OK, asked from a tap
    motionBtn.hidden = false;
    motionBtn.addEventListener("click", async () => {
      try {
        if ((await DeviceMotionEvent.requestPermission()) === "granted") return enablePhoneShake();
      } catch {}
      motionBtn.hidden = true;
      shakeHint.textContent = t("shakeOff");
      shakeHint.dataset.msg = "shakeOff";
      shakeHint.hidden = false;
    });
  } else {
    enablePhoneShake();
  }
}

// Halloween countdown and a "spooky sip" that changes daily
function showCountdown() {
  const el = document.getElementById("fall-countdown");
  const names = [...document.querySelectorAll('.menu-panel[data-panel="fall"] h3')].map((h) => h.textContent);
  if (!el || !names.length) return;
  const { year, month, day } = pacificNow();
  const today = Date.UTC(year, month - 1, day);
  const dayOfYear = Math.round((today - Date.UTC(year, 0, 1)) / 86400000);
  const drink = names[dayOfYear % names.length];
  const daysLeft = Math.round((Date.UTC(year, 9, 31) - today) / 86400000);
  el.textContent =
    daysLeft > 1 && daysLeft <= 31 ? t("daysLeft", { n: daysLeft, drink }) :
    daysLeft === 1 ? t("oneDay", { drink }) :
    daysLeft === 0 ? t("halloween", { drink }) :
    t("fallPick", { drink });
  el.hidden = false;
}

const langBtn = document.getElementById("lang-btn");
function applyLang() {
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-es]").forEach((el) => {
    if (el.dataset.en === undefined) el.dataset.en = el.innerHTML;
    el.innerHTML = lang === "es" ? el.dataset.es : el.dataset.en;
  });
  langBtn.textContent = t("langBtn");
  langBtn.setAttribute("aria-label", t("langLabel"));
  langBtn.lang = t("langAttr");
  // Refresh text this script writes
  chooseLocation(chosen);
  showCountdown();
  document.getElementById("pick-desc").textContent = lastPick ? pickDesc(lastPick) : t("tapCan");
  if (shakeHint.dataset.msg) shakeHint.textContent = t(shakeHint.dataset.msg);
}
langBtn.addEventListener("click", () => {
  lang = lang === "en" ? "es" : "en";
  try { localStorage.setItem("sipco-lang", lang); } catch {}
  applyLang();
});
applyLang();

document.getElementById("year").textContent = new Date().getFullYear();
