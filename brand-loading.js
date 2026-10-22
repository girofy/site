(() => {
  const overlay = document.getElementById('brand-loading');
  if (!overlay) return;
  const image = overlay.querySelector('img');
  const root = document.documentElement;
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (window.location.hash) {
    overlay.remove();
    root.classList.remove('girofy-first-visit', 'girofy-loading');
    return;
  }
  const firstVisit = root.classList.contains('girofy-first-visit');
  if (reduce) { overlay.remove(); root.classList.remove('girofy-first-visit'); return; }

  const start = performance.now();
  let ready = false;
  let done = false;
  const intro = image.dataset.intro;
  const loop = image.dataset.loop;

  const imageReady = (img) => {
    if (img.complete) return img.decode ? img.decode().catch(() => undefined) : Promise.resolve();
    return new Promise((resolve) => {
      img.addEventListener('load', resolve, { once: true });
      img.addEventListener('error', resolve, { once: true });
    });
  };
  const criticalImages = [...document.images].filter((img) => {
    if (img.loading === 'lazy' || img.closest('.agreement')) return false;
    const rect = img.getBoundingClientRect();
    return rect.top < window.innerHeight + 24 && rect.bottom > 0;
  });
  const pageResourcesReady = document.readyState === 'complete'
    ? Promise.resolve()
    : new Promise((resolve) => window.addEventListener('load', resolve, { once: true }));
  Promise.all([
    pageResourcesReady,
    document.fonts?.ready ?? Promise.resolve(),
    ...criticalImages.map(imageReady),
  ]).then(() => {
    ready = true;
    if (firstVisit) window.setTimeout(hide, Math.max(0, 950 - (performance.now() - start)));
    else if (overlay.classList.contains('is-active')) hide();
    else overlay.remove();
  });

  function show(src, looping = false) {
    if (done) return;
    if (image.dataset.current !== src) {
      image.dataset.current = src;
      image.src = src;
    }
    overlay.classList.toggle('is-looping', looping);
    overlay.classList.add('is-active');
    root.classList.add('girofy-loading');
  }
  function hide() {
    if (done) return;
    done = true;
    overlay.classList.remove('is-active');
    overlay.classList.add('is-exiting');
    root.classList.remove('girofy-first-visit', 'girofy-loading');
    window.setTimeout(() => overlay.remove(), 360);
  }

  image.addEventListener('error', () => overlay.classList.add('is-fallback'));
  if (firstVisit) {
    show(intro);
    window.setTimeout(() => { if (!ready) show(loop, true); }, 970);
    window.setTimeout(hide, 2600);
  } else if (!ready) {
    window.setTimeout(() => { if (!ready) show(loop, true); }, 650);
    window.setTimeout(() => { if (!ready) hide(); }, 2600);
  } else {
    overlay.remove();
  }
})();
