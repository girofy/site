const CHAPTERS = [
  ["singularity", 0.14],
  ["market", 0.29],
  ["breakout", 0.42],
  ["portfolio", 0.64],
  ["machine", 0.77],
  ["founder", 0.88],
  ["timeline", 1],
];
const FEATURED_PROJECTS = [0, 2, 9, 13];

const finite = (value) => Number.isFinite(value) ? value : 0;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function getChapter(progress) {
  const normalized = clamp(finite(progress), 0, 1);
  return CHAPTERS.find(([, end]) => normalized < end)?.[0] ?? "timeline";
}

export function getFeaturedProjectIndex(progress) {
  const normalized = clamp(finite(progress), 0, 1);
  if (normalized < 0.42 || normalized > 0.68) return null;
  const index = Math.min(FEATURED_PROJECTS.length - 1, Math.floor((normalized - 0.42) / 0.065));
  return FEATURED_PROJECTS[index];
}

export function getAttractor(point, mouse, velocity, radius = 0.4) {
  const dx = finite(mouse?.x) - finite(point?.x);
  const dy = finite(mouse?.y) - finite(point?.y);
  const distance = Math.hypot(dx, dy);
  const safeRadius = Math.max(0.001, finite(radius));
  if (distance >= safeRadius || distance < 1e-6) return { x: 0, y: 0, twist: 0 };

  const speed = clamp(Math.hypot(finite(velocity?.x), finite(velocity?.y)), 0, 1);
  const weight = (1 - distance / safeRadius) ** 2;
  const magnitude = weight * (0.32 + speed * 0.68);
  return {
    x: dx / distance * magnitude,
    y: dy / distance * magnitude,
    twist: weight * speed * 0.38,
  };
}

export function validateScreenshot(file, maxBytes = 12 * 1024 * 1024) {
  const type = String(file?.type ?? "").toLowerCase();
  const size = finite(file?.size);
  const ok = ["image/png", "image/jpeg", "image/webp"].includes(type) && size > 0 && size <= maxBytes;
  return { ok, reason: ok ? "" : "Escolha PNG, JPG ou WebP de até 12 MB." };
}
