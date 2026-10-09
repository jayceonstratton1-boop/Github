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

// Contact form: submits to Netlify Forms without leaving the page
document.getElementById("contact-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const status = form.querySelector(".form-status");
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
const drinks = [...document.querySelectorAll(".menu-panel")].flatMap((panel) =>
  [...panel.querySelectorAll(".menu-item")].map((item) => ({
    cat: panel.dataset.panel,
    name: item.querySelector("h3").textContent,
    desc: item.querySelector("p")?.textContent || "A Sip & Co. favorite.",
    price: item.querySelector(".price").textContent,
  }))
);
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
  }, 900);
});

document.getElementById("year").textContent = new Date().getFullYear();
