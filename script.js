// ==========================================================================
// Respect reduced motion preference
// ==========================================================================
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ==========================================================================
// Tab router — Home / Programming / Building & Environment
// Only one .tab-panel is visible at a time, driven by the URL hash so
// links are shareable and the back/forward buttons work as expected.
// ==========================================================================
(function tabRouter() {
  const panels = Array.from(document.querySelectorAll('.tab-panel'));
  const navTargets = Array.from(document.querySelectorAll('[data-tab]'));
  if (!panels.length) return;

  const validTabs = panels.map(p => p.dataset.panel);

  function revealPanelContent(panel) {
    // scroll-reveal and lazy video loading are IntersectionObserver-driven;
    // panels hidden via [hidden] never intersect, so force them in on activation
    panel.querySelectorAll('.clip, .game-entry, .about').forEach(el => {
      el.classList.add('in-view');
    });
    panel.querySelectorAll('.clip-media video[data-src]').forEach(video => {
      if (!video.src) video.src = video.dataset.src;
      video.play().catch(() => {});
    });
  }

  function activate(tab, { scroll = true } = {}) {
    if (!validTabs.includes(tab)) tab = validTabs[0];

    panels.forEach(panel => {
      const isActive = panel.dataset.panel === tab;
      const wasHidden = panel.hidden;
      panel.hidden = !isActive;
      // only force-reveal when a panel is freshly switched into —
      // the initially-active panel keeps its natural scroll-triggered fade-in
      if (isActive && wasHidden) revealPanelContent(panel);
    });

    navTargets.forEach(link => {
      link.classList.toggle('active', link.dataset.tab === tab);
    });

    if (scroll) {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    }
  }

  navTargets.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const tab = link.dataset.tab;
      if (location.hash !== `#${tab}`) history.pushState(null, '', `#${tab}`);
      activate(tab);
    });
  });

  window.addEventListener('popstate', () => {
    activate((location.hash || '#home').slice(1), { scroll: false });
  });

  activate((location.hash || '#home').slice(1), { scroll: false });
})();

// ==========================================================================
// Starfield (hero background) with subtle cursor parallax
// ==========================================================================
(function starfield() {
  const canvas = document.getElementById('starfield');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let width, height, stars, links;
  let targetX = 0, targetY = 0, driftX = 0, driftY = 0;

  function resize() {
    width = canvas.width = canvas.offsetWidth * devicePixelRatio;
    height = canvas.height = canvas.offsetHeight * devicePixelRatio;
  }

  function buildStars() {
    const count = Math.floor((width * height) / 22000); // density scales with area
    stars = Array.from({ length: Math.min(count, 140) }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.4 + 0.4,
      baseAlpha: Math.random() * 0.5 + 0.3,
      twinkleSpeed: Math.random() * 0.015 + 0.005,
      phase: Math.random() * Math.PI * 2,
    }));

    // pick a handful of stars near the center-top to connect as a faint constellation
    const central = stars
      .filter(s => s.y < height * 0.55)
      .sort((a, b) => Math.hypot(a.x - width / 2, a.y - height * 0.3) - Math.hypot(b.x - width / 2, b.y - height * 0.3))
      .slice(0, 6);
    links = [];
    for (let i = 0; i < central.length - 1; i++) {
      links.push([central[i], central[i + 1]]);
    }
  }

  function draw(t) {
    // ease drift toward cursor target for a soft parallax feel
    driftX += (targetX - driftX) * 0.04;
    driftY += (targetY - driftY) * 0.04;

    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(driftX, driftY);

    ctx.strokeStyle = 'rgba(217, 181, 113, 0.14)';
    ctx.lineWidth = 1;
    links.forEach(([a, b]) => {
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    });

    stars.forEach(s => {
      const twinkle = prefersReducedMotion ? 0 : Math.sin(t * s.twinkleSpeed + s.phase) * 0.35;
      const alpha = Math.max(0, Math.min(1, s.baseAlpha + twinkle));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * devicePixelRatio, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(242, 236, 218, ${alpha})`;
      ctx.fill();
    });

    ctx.restore();

    if (!prefersReducedMotion) requestAnimationFrame(draw);
  }

  function init() {
    resize();
    buildStars();
    draw(0);
  }

  window.addEventListener('resize', () => {
    resize();
    buildStars();
    if (prefersReducedMotion) draw(0);
  });

  if (!prefersReducedMotion) {
    window.addEventListener('mousemove', (e) => {
      const nx = (e.clientX / window.innerWidth) - 0.5;
      const ny = (e.clientY / window.innerHeight) - 0.5;
      targetX = nx * -14 * devicePixelRatio;
      targetY = ny * -10 * devicePixelRatio;
    }, { passive: true });
  }

  init();
})();

// ==========================================================================
// Scroll progress rail
// ==========================================================================
(function scrollRail() {
  const fill = document.getElementById('scrollFill');
  if (!fill) return;
  window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    fill.style.width = pct + '%';
  }, { passive: true });
})();

// ==========================================================================
// Scroll reveal for clips / game entries / about
// ==========================================================================
(function scrollReveal() {
  const targets = document.querySelectorAll('.clip, .game-entry, .about');
  if (!targets.length) return;

  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    targets.forEach(el => el.classList.add('in-view'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  targets.forEach(el => observer.observe(el));
})();

// ==========================================================================
// Moveset clips: lazy-load the mp4 source and only play while on screen
// ==========================================================================
(function clipPlayback() {
  const videos = document.querySelectorAll('.clip-media video[data-src]');
  if (!videos.length || !('IntersectionObserver' in window)) {
    // fallback: just load everything, no autoplay
    videos.forEach(v => { v.src = v.dataset.src; });
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const video = entry.target;
      if (entry.isIntersecting) {
        if (!video.src) video.src = video.dataset.src;
        video.play().catch(() => {}); // ignore autoplay rejection
      } else {
        video.pause();
      }
    });
  }, { threshold: 0.35 });

  videos.forEach(v => observer.observe(v));
})();

// ==========================================================================
// Tilt + glare interaction on clip thumbnails (skipped for reduced motion)
// ==========================================================================
(function tiltEffect() {
  if (prefersReducedMotion) return;
  const tiles = document.querySelectorAll('.tilt');
  const MAX_TILT = 6; // degrees, kept subtle

  tiles.forEach(tile => {
    const video = tile.querySelector('video');
    const glare = tile.querySelector('.glare');

    tile.addEventListener('mousemove', (e) => {
      const rect = tile.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;  // 0..1
      const py = (e.clientY - rect.top) / rect.height;   // 0..1
      const rx = (py - 0.5) * -MAX_TILT;
      const ry = (px - 0.5) * MAX_TILT;

      if (video) video.style.transform = `scale(1.04) rotateX(${rx}deg) rotateY(${ry}deg)`;
      if (glare) {
        glare.style.setProperty('--glare-x', `${px * 100}%`);
        glare.style.setProperty('--glare-y', `${py * 100}%`);
      }
    });

    tile.addEventListener('mouseleave', () => {
      if (video) video.style.transform = '';
    });
  });
})();

// ==========================================================================
// Ambient particles — spawns sparkle/mote image assets into each
// .particle-field container, drifting upward and fading (Genshin-style dust)
// ==========================================================================
(function ambientParticles() {
  if (prefersReducedMotion) return;
  const fields = document.querySelectorAll('.particle-field');
  if (!fields.length) return;

  const assets = ['sparkle.svg', 'mote.svg', 'mote-teal.svg'];

  fields.forEach(field => {
    const count = parseInt(field.dataset.count, 10) || 8;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('img');
      p.src = assets[Math.floor(Math.random() * assets.length)];
      p.className = 'particle';
      p.alt = '';
      const size = 6 + Math.random() * 12;
      p.style.setProperty('--x', `${Math.random() * 100}%`);
      p.style.setProperty('--size', `${size}px`);
      p.style.setProperty('--duration', `${8 + Math.random() * 10}s`);
      p.style.setProperty('--delay', `${(Math.random() * -18).toFixed(2)}s`);
      field.appendChild(p);
    }
  });
})();

// ==========================================================================
// Weapon icon hover burst — spawns a handful of sparkle/mote images that
// fly outward and fade, like an elemental proc
// ==========================================================================
(function weaponIconBurst() {
  if (prefersReducedMotion) return;
  const heads = document.querySelectorAll('.weapon-head');
  const assets = ['sparkle.svg', 'mote.svg'];

  heads.forEach(head => {
    const anchor = head.querySelector('.weapon-icon') || head;
    head.addEventListener('mouseenter', () => {
      const burstCount = 5;
      for (let i = 0; i < burstCount; i++) {
        const p = document.createElement('img');
        p.src = assets[i % assets.length];
        p.className = 'burst-particle';
        p.alt = '';
        const angle = Math.random() * Math.PI * 2;
        const dist = 24 + Math.random() * 20;
        p.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
        p.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
        p.style.setProperty('--size', `${7 + Math.random() * 6}px`);
        anchor.appendChild(p);
        p.addEventListener('animationend', () => p.remove());
      }
    });
  });
})();

// ==========================================================================
// Discord copy-to-clipboard — shows a brief "Copied!" toast on click
// ==========================================================================
(function copyDiscord() {
  const link = document.querySelector('.copy-discord');
  if (!link) return;
  const li = link.closest('.social-copy');

  link.addEventListener('click', (e) => {
    e.preventDefault();
    const text = link.dataset.copy;

    const showToast = () => {
      if (!li) return;
      li.classList.add('copied');
      clearTimeout(li._copyTimeout);
      li._copyTimeout = setTimeout(() => li.classList.remove('copied'), 1600);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(showToast).catch(showToast);
    } else {
      showToast();
    }
  });
})();

// ==========================================================================
// Footer year
// ==========================================================================
(function footerYear() {
  const el = document.getElementById('year');
  if (el) el.textContent = new Date().getFullYear();
})();
