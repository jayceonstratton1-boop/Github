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
function openStatus(key) {
  const { name, hours } = locations[key];
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles", weekday: "short", hour: "numeric", minute: "numeric", hourCycle: "h23",
    }).formatToParts(new Date()).map((p) => [p.type, p.value])
  );
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday);
  const now = Number(parts.hour) + Number(parts.minute) / 60;
  const hoursFor = (d) => (d === 0 || d === 6 ? hours.weekend : hours.weekday);
  const [open, close] = hoursFor(day);
  if (now >= open && now < close) return { open: true, text: `${name} is open now · until ${fmtHour(close)}` };
  if (now < open) return { open: false, text: `${name} opens today at ${fmtHour(open)}` };
  return { open: false, text: `${name} opens tomorrow at ${fmtHour(hoursFor((day + 1) % 7)[0])}` };
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
    status.textContent = "Preview only: messages will send once the site is live.";
    return;
  }
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  button.textContent = "Sending...";
  try {
    const res = await fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(new FormData(form)).toString(),
    });
    if (!res.ok) throw new Error(res.status);
    form.reset();
    status.textContent = "Thanks! We'll be in touch soon.";
  } catch {
    status.textContent = "Sorry, something went wrong. Please call or try again.";
  } finally {
    button.disabled = false;
    button.textContent = "Send message";
  }
});

// Drink picker: pulls drinks straight from the menu so it never goes stale
const skipInPicker = ["Water in a Can", "Refreshers / Lemonades", "Chocolate Milk", "Customized Energy Drink"];
const drinks = [...document.querySelectorAll(".menu-panel")].flatMap((panel) =>
  [...panel.querySelectorAll(".menu-item")].map((item) => ({
    cat: panel.dataset.panel,
    name: item.querySelector("h3").textContent,
    desc: item.querySelector("p")?.textContent || "A fan favorite. Ask for it at the window!",
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
    document.getElementById("pick-desc").textContent = pick.desc;
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
  shakeHint.textContent = "📳 Or shake your phone!";
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
      shakeHint.textContent = "Phone shake is off. Tap the can instead!";
      shakeHint.hidden = false;
    });
  } else {
    enablePhoneShake();
  }
}

document.getElementById("year").textContent = new Date().getFullYear();
