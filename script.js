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

// Contact form (front-end only — connect to a form service to receive messages)
document.getElementById("contact-form").addEventListener("submit", (e) => {
  e.preventDefault();
  e.target.reset();
  e.target.querySelector(".form-status").textContent = "Thanks! We'll be in touch soon.";
});

document.getElementById("year").textContent = new Date().getFullYear();
