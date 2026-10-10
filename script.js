// Mobile nav toggle
const toggle = document.querySelector(".nav-toggle");
const links = document.querySelector(".nav-links");
toggle.addEventListener("click", () => {
  const open = links.classList.toggle("open");
  toggle.setAttribute("aria-expanded", open);
});
links.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => {
    links.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  })
);

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

// Richland open/closed status, in Pacific time
const richlandHours = { weekday: [5, 19], weekend: [7, 18] };
function fmtHour(h) {
  return h === 12 ? "12pm" : h > 12 ? `${h - 12}pm` : `${h}am`;
}
function richlandStatus() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles", weekday: "short", hour: "numeric", minute: "numeric", hourCycle: "h23",
    }).formatToParts(new Date()).map((p) => [p.type, p.value])
  );
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const day = days.indexOf(parts.weekday);
  const now = Number(parts.hour) + Number(parts.minute) / 60;
  const hoursFor = (d) => (d === 0 || d === 6 ? richlandHours.weekend : richlandHours.weekday);
  const [open, close] = hoursFor(day);
  if (now >= open && now < close) return { open: true, text: `Richland is open now · until ${fmtHour(close)}` };
  if (now < open) return { open: false, text: `Richland opens today at ${fmtHour(open)}` };
  return { open: false, text: `Richland opens tomorrow at ${fmtHour(hoursFor((day + 1) % 7)[0])}` };
}
function showStatus() {
  const { open, text } = richlandStatus();
  document.querySelectorAll("[data-open-status]").forEach((el) => {
    el.textContent = text;
    el.classList.toggle("is-open", open);
    el.hidden = false;
  });
}
showStatus();
setInterval(showStatus, 60000);

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
  }
});

// Drink picker: pulls drinks straight from the menu so it never goes stale
const skipInPicker = ["Water in a Can", "Refreshers / Lemonades", "Chocolate Milk", "Customized Energy Drink"];
const drinks = [...document.querySelectorAll(".menu-panel")].flatMap((panel) =>
  [...panel.querySelectorAll(".menu-item")].map((item) => ({
    cat: panel.dataset.panel,
    name: item.querySelector("h3").textContent,
    desc: item.querySelector("p")?.textContent || "A fan favorite. Ask for it at the window!",
    price: item.querySelector(".price")?.textContent || "",
  }))
).filter((d) => !skipInPicker.includes(d.name));
const canColors = {
  redbulls: ["#ff6b8b", "#ffb36b", "#fff1e0"],
  matcha: ["#b58ee0", "#a9cf7f", "#e6f2d2"],
  coffee: ["#6b4a35", "#d9b48f", "#f6ead9"],
  caffeinefree: ["#ff9a76", "#ffd36e", "#fff6dc"],
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
document.getElementById("shake").addEventListener("click", () => {
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
    document.getElementById("pick-price").textContent = pick.price;
    can.classList.remove("shaking");
    can.classList.add("landed");
    lastPick = pick;
    document.getElementById("pick-actions").hidden = false;
  }, 900);
});

document.getElementById("year").textContent = new Date().getFullYear();
