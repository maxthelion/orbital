import test from 'node:test';
import assert from 'node:assert/strict';
import { RADIUS, EYE_HEIGHT, HALF_WIDTH, TAU, createPlayer, gravityAt, playerPosition, stepPlayer, wrapAngle } from './movement.js';
const idle = { forward: 0, side: 0, run: false, jump: false };
const near = (actual, expected, tolerance = 1e-8) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`);

test('gravity weakens linearly to zero at the axis', () => {
  near(gravityAt(RADIUS), 2.4525); near(gravityAt(RADIUS / 2), 1.22625); near(gravityAt(0), 0);
});
test('a full circuit closes without changing height or position', () => {
  const p = createPlayer(); p.yaw = 0;
  const start = playerPosition(p);
  const duration = TAU * RADIUS / 4.6;
  const count = 40000;
  for (let i = 0; i < count; i++) stepPlayer(p, { ...idle, forward: 1 }, duration / count);
  playerPosition(p).forEach((value, i) => near(value, start[i], 1e-6));
  near(p.height, 0); near(p.travel, TAU * RADIUS, 1e-6);
});
test('camera stays inside the floor around the entire ring', () => {
  const p = createPlayer();
  for (let i = 0; i < 1000; i++) {
    p.angle = i / 1000 * TAU;
    const [x, y] = playerPosition(p); near(Math.hypot(x, y), RADIUS - EYE_HEIGHT);
  }
});
test('quarter-gravity jump rises higher and lands without tunnelling', () => {
  const p = createPlayer(); let peak = 0;
  for (let i = 0; i < 600; i++) {
    stepPlayer(p, { ...idle, jump: i === 0 }, 1 / 120);
    peak = Math.max(peak, p.height); assert.ok(p.height >= 0);
  }
  assert.ok(peak > 4.4 && peak < 4.7); near(p.height, 0); near(p.verticalSpeed, 0);
});
test('both window walls constrain movement including diagonal input', () => {
  for (const direction of [-1, 1]) {
    const p = createPlayer(); p.yaw = 0;
    for (let i = 0; i < 1000; i++) stepPlayer(p, { ...idle, side: direction, forward: 1, run: true }, 1 / 120);
    near(p.z, direction * (HALF_WIDTH - 0.42));
  }
});
test('diagonal movement does not exceed straight-line speed', () => {
  const straight = createPlayer(), diagonal = createPlayer(); straight.yaw = diagonal.yaw = 0;
  stepPlayer(straight, { ...idle, forward: 1 }, 0.01);
  stepPlayer(diagonal, { ...idle, forward: 1, side: 1 }, 0.01);
  near(Math.hypot(diagonal.travel, diagonal.z + 1.4), straight.travel);
});
test('clockwise and anticlockwise crossings wrap continuously', () => {
  const p = createPlayer(); p.angle = 0.00001; p.yaw = 0;
  stepPlayer(p, { ...idle, forward: -1 }, 1 / 120);
  assert.ok(p.angle > TAU - 0.001);
  near(wrapAngle(-TAU * 3 + 0.2), 0.2);
});
