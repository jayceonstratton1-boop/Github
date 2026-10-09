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

// Gallery: hide photos that aren't there yet; show the section once any photo loads
document.querySelectorAll(".gallery img").forEach((img) => {
  const show = () => document.getElementById("gallery").removeAttribute("hidden");
  const hide = () => img.remove();
  if (img.complete) (img.naturalWidth ? show : hide)();
  else { img.addEventListener("load", show); img.addEventListener("error", hide); }
});

document.getElementById("year").textContent = new Date().getFullYear();
