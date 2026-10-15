// Store hours by day of week (0 = Sunday). null = closed. Times are 24h, Pacific.
const HOURS = {
  0: [14, 21],
  1: [14, 21],
  2: null,
  3: [14, 21],
  4: [14, 21],
  5: [14, 22],
  6: [14, 22],
};
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function fmtHour(h) {
  const suffix = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12} ${suffix}`;
}

// Current day and hour in Pasco, regardless of the visitor's own time zone.
function pascoNow() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type).value;
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { day, hour: Number(get("hour")) + Number(get("minute")) / 60 };
}

function nextOpening(day) {
  for (let i = 1; i <= 7; i++) {
    const d = (day + i) % 7;
    if (HOURS[d]) return `${i === 1 ? "tomorrow" : DAY_NAMES[d]} at ${fmtHour(HOURS[d][0])}`;
  }
  return "soon";
}

function updateStatus() {
  const { day, hour } = pascoNow();
  const today = HOURS[day];
  const pill = document.getElementById("open-status");
  const todayHours = document.getElementById("today-hours");

  todayHours.textContent = today ? `${fmtHour(today[0])} – ${fmtHour(today[1])}` : "Closed today";

  pill.classList.remove("is-open", "is-closed");
  if (today && hour >= today[0] && hour < today[1]) {
    pill.textContent = `Open now · until ${fmtHour(today[1])}`;
    pill.classList.add("is-open");
  } else if (today && hour < today[0]) {
    pill.textContent = `Opens today at ${fmtHour(today[0])}`;
    pill.classList.add("is-closed");
  } else {
    pill.textContent = `Closed · opens ${nextOpening(day)}`;
    pill.classList.add("is-closed");
  }

  document.querySelectorAll(".hours tr").forEach((row) => {
    row.classList.toggle("today", Number(row.dataset.day) === day);
  });
}

// Mobile menu
const toggle = document.querySelector(".nav-toggle");
const links = document.getElementById("nav-links");
toggle.addEventListener("click", () => {
  const open = links.classList.toggle("open");
  toggle.setAttribute("aria-expanded", open);
});
links.addEventListener("click", (e) => {
  if (e.target.closest("a")) {
    links.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  }
});

// Menu tabs (arrow keys move between tabs)
const tabs = [...document.querySelectorAll('[role="tab"]')];
function selectTab(tab) {
  tabs.forEach((t) => {
    const selected = t === tab;
    t.setAttribute("aria-selected", selected);
    t.tabIndex = selected ? 0 : -1;
    document.getElementById(t.getAttribute("aria-controls")).hidden = !selected;
  });
  tab.focus();
}
tabs.forEach((tab, i) => {
  tab.addEventListener("click", () => selectTab(tab));
  tab.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") selectTab(tabs[(i + 1) % tabs.length]);
    if (e.key === "ArrowLeft") selectTab(tabs[(i - 1 + tabs.length) % tabs.length]);
  });
});

document.getElementById("year").textContent = new Date().getFullYear();
updateStatus();
setInterval(updateStatus, 60 * 1000);
