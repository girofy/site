(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  // A splash over a deep link hides the destination and can look like a washed-out page.
  // Let section links and browser text-fragment links open directly at their target.
  if (window.location.hash) return;
  try {
    if (sessionStorage.getItem('girofy-brand-intro') === '1') return;
    sessionStorage.setItem('girofy-brand-intro', '1');
  } catch (_) { return; }
  document.documentElement.classList.add('girofy-first-visit');
})();
