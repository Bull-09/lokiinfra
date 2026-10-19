// LOKI Infra site interactions — no dependencies.
(() => {
  const header = document.querySelector("[data-header]");
  const toggle = document.querySelector("[data-nav-toggle]");

  // Header turns solid after scrolling past the hero.
  const onScroll = () => header.classList.toggle("is-solid", window.scrollY > 40);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  // Mobile menu
  toggle.addEventListener("click", () => {
    const open = document.body.classList.toggle("nav-open");
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  });
  document.querySelectorAll("[data-nav] a").forEach((a) =>
    a.addEventListener("click", () => document.body.classList.remove("nav-open"))
  );

  // Blueprint line-drawing: give each stroke its real length.
  document.querySelectorAll(".draw path, .draw line, .draw polyline, .draw rect, .draw circle").forEach((el) => {
    if (el.getTotalLength) el.style.setProperty("--len", Math.ceil(el.getTotalLength()));
  });

  // Reveal on scroll + number counters
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("in");
      entry.target.querySelectorAll("[data-count]").forEach(countUp);
      io.unobserve(entry.target);
    });
  }, { threshold: 0.15 });
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

  function countUp(el) {
    const target = Number(el.dataset.count);
    const duration = 1600;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))).toLocaleString("en-IN");
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // Project filters
  const filterBar = document.querySelector("[data-filters]");
  if (filterBar) {
    filterBar.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      filterBar.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
      const f = btn.dataset.filter;
      let shown = 0;
      document.querySelectorAll("[data-cat]").forEach((card) => {
        const hide = f !== "all" && card.dataset.cat !== f;
        card.classList.toggle("is-hidden", hide);
        if (!hide) shown++;
      });
      const status = document.querySelector("[data-filter-status]");
      if (status) status.textContent = `${shown} ${shown === 1 ? "project" : "projects"} shown`;
    });
  }

  // RFP form: until a form backend is connected, hand the enquiry to email.
  const form = document.querySelector("form.rfp");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const lines = [];
      for (const [k, v] of data.entries()) if (v) lines.push(`${k}: ${v}`);
      const subject = encodeURIComponent(`Project enquiry — ${data.get("Company") || data.get("Name") || "Website"}`);
      const body = encodeURIComponent(lines.join("\n"));
      window.location.href = `mailto:${form.dataset.email}?subject=${subject}&body=${body}`;
      form.querySelector(".form-status").classList.add("show");
    });
  }
})();
