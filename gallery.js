(() => {
  const projects = window.PROJECTS || [];
  const list = document.getElementById("work-list");

  // ----- Render the work list: every tab is a full-width panel in its own style -----
  projects.forEach((p, i) => {
    const li = document.createElement("li");
    li.className = "work__row reveal";
    li.dataset.delay = String(Math.min(i + 1, 4));
    li.innerHTML = `<a class="tab ${p.cls}" href="${p.href}" aria-label="${p.title} — open project">${p.tab}</a>`;
    list.appendChild(li);
  });

  // ----- Eased scrolling for every in-page link (nav, footer, scroll cue) -----
  const easeFocus = (t) => {
    // cubic-bezier(0.52, 0.01, 0, 1) solved numerically
    const A = (a1, a2) => 1 - 3 * a2 + 3 * a1, B = (a1, a2) => 3 * a2 - 6 * a1, C = (a1) => 3 * a1;
    const calc = (x, a1, a2) => ((A(a1, a2) * x + B(a1, a2)) * x + C(a1)) * x;
    const slope = (x, a1, a2) => 3 * A(a1, a2) * x * x + 2 * B(a1, a2) * x + C(a1);
    let x = t;
    for (let i = 0; i < 8; i++) { const s = slope(x, 0.52, 0); if (Math.abs(s) < 1e-6) break; x -= (calc(x, 0.52, 0) - t) / s; }
    return calc(x, 0.01, 1);
  };
  let scrollRaf = null;
  const scrollToY = (targetY) => {
    if (scrollRaf) cancelAnimationFrame(scrollRaf);
    const startY = window.scrollY;
    const dist = targetY - startY;
    const dur = Math.min(1400, 500 + Math.abs(dist) * 0.35);
    const t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / dur);
      window.scrollTo(0, startY + dist * easeFocus(k));
      if (k < 1) scrollRaf = requestAnimationFrame(step); else scrollRaf = null;
    };
    scrollRaf = requestAnimationFrame(step);
  };
  document.querySelectorAll("a[data-scroll]").forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href").slice(1);
      const el = document.getElementById(id);
      if (!el) return;
      e.preventDefault();
      const top = id === "top" ? 0 : el.getBoundingClientRect().top + window.scrollY - 72;
      scrollToY(Math.max(0, top));
      history.replaceState(null, "", "#" + id);
    });
  });
  // cancel an eased scroll if the user takes over with the wheel or touch
  ["wheel", "touchstart"].forEach((ev) => window.addEventListener(ev, () => { if (scrollRaf) { cancelAnimationFrame(scrollRaf); scrollRaf = null; } }, { passive: true }));

  // ----- Nav: sliding glow follows hover, rests on the section in view -----
  const navLinks = document.getElementById("nav-links");
  if (navLinks) {
    const glow = navLinks.querySelector(".nav__glow");
    const links = [...navLinks.querySelectorAll("a")];
    let activeLink = null;
    const moveTo = (a) => {
      if (!a) { navLinks.classList.remove("has-glow"); return; }
      glow.style.width = `${a.offsetWidth}px`;
      glow.style.transform = `translateX(${a.offsetLeft}px)`;
      navLinks.classList.add("has-glow");
    };
    links.forEach((a) => {
      a.addEventListener("mouseenter", () => moveTo(a));
      a.addEventListener("focus", () => moveTo(a));
    });
    navLinks.addEventListener("mouseleave", () => moveTo(activeLink));
    const sections = links.map((a) => document.getElementById(a.dataset.section)).filter(Boolean);
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const link = links.find((a) => a.dataset.section === en.target.id);
        links.forEach((a) => a.classList.toggle("is-active", a === link));
        activeLink = link;
        if (!navLinks.matches(":hover")) moveTo(activeLink);
      });
    }, { rootMargin: "-40% 0px -50% 0px", threshold: 0 });
    sections.forEach((s) => spy.observe(s));
    // above the first section: no glow
    const hero = document.getElementById("top");
    if (hero) new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { activeLink = null; links.forEach((a) => a.classList.remove("is-active")); if (!navLinks.matches(":hover")) moveTo(null); } });
    }, { rootMargin: "-40% 0px -50% 0px", threshold: 0 }).observe(hero);
    window.addEventListener("resize", () => moveTo(activeLink), { passive: true });
  }

  // ----- Scroll reveal -----
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

  // ----- Marquee: duplicate the track so it loops seamlessly -----
  const mq = document.getElementById("marquee");
  if (mq) mq.innerHTML += mq.innerHTML;

  // ----- Year -----
  const yr = new Date().getFullYear();
  ["year", "year2"].forEach((id) => { const el = document.getElementById(id); if (el) el.textContent = yr; });
})();
