export type Vec2 = { x: number; y: number };
export type Chapter = "singularity" | "market" | "breakout" | "portfolio" | "machine" | "founder" | "timeline";
export function getChapter(progress: number): Chapter;
export function getFeaturedProjectIndex(progress: number): number | null;
export function getAttractor(point: Vec2, mouse: Vec2, velocity: Vec2, radius?: number): { x: number; y: number; twist: number };
export function validateScreenshot(file: { type?: string; size?: number } | null | undefined, maxBytes?: number): { ok: boolean; reason: string };
