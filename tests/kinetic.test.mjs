import test from "node:test";
import assert from "node:assert/strict";

const kinetic = await import("../src/lib/kinetic.js").catch(() => ({}));

test("scroll progress resolves to a stable chapter, including both endpoints", () => {
  assert.equal(typeof kinetic.getChapter, "function", "chapter resolver is missing");
  assert.equal(kinetic.getChapter(-0.2), "singularity");
  assert.equal(kinetic.getChapter(0.2), "market");
  assert.equal(kinetic.getChapter(0.99), "timeline");
  assert.equal(kinetic.getChapter(1), "timeline");
});

test("portfolio evidence stays synchronized with the four 3D reveals", () => {
  assert.equal(typeof kinetic.getFeaturedProjectIndex, "function", "portfolio mapping is missing");
  assert.equal(kinetic.getFeaturedProjectIndex(0.41), null);
  assert.equal(kinetic.getFeaturedProjectIndex(0.42), 0);
  assert.equal(kinetic.getFeaturedProjectIndex(0.49), 2);
  assert.equal(kinetic.getFeaturedProjectIndex(0.56), 9);
  assert.equal(kinetic.getFeaturedProjectIndex(0.63), 13);
  assert.equal(kinetic.getFeaturedProjectIndex(0.69), null);
});

test("pointer attraction is bounded and vanishes outside its influence", () => {
  assert.equal(typeof kinetic.getAttractor, "function", "attractor field is missing");
  const force = kinetic.getAttractor({ x: 0.2, y: 0.5 }, { x: 0.5, y: 0.5 }, { x: 100, y: 0 }, 0.4);
  assert.ok(Number.isFinite(force.x) && Number.isFinite(force.y) && Number.isFinite(force.twist));
  assert.ok(Math.hypot(force.x, force.y) <= 1);
  assert.ok(force.x > 0);
  assert.deepEqual(kinetic.getAttractor({ x: 0, y: 0 }, { x: 0.9, y: 0.9 }, { x: 1, y: 1 }, 0.2), { x: 0, y: 0, twist: 0 });
});

test("local screenshot input accepts images only and enforces a size ceiling", () => {
  assert.equal(typeof kinetic.validateScreenshot, "function", "screenshot validator is missing");
  assert.equal(kinetic.validateScreenshot({ type: "image/png", size: 1024 }).ok, true);
  assert.equal(kinetic.validateScreenshot({ type: "text/html", size: 1024 }).ok, false);
  assert.equal(kinetic.validateScreenshot({ type: "image/jpeg", size: 20_000_000 }).ok, false);
});
