import test from 'node:test';
import assert from 'node:assert/strict';
import { Scene, DirectionalLight, Vector3 } from 'three';
import { RADIUS, gravityAt } from './movement.js';
import { ANGULAR_SPEED, ROTATION_PERIOD, ROTATION_RPM, createStationRotation, createSpinClock, rotationForGravity } from './rotation.js';

const near = (actual, expected, tolerance = 1e-9) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`);
const sameVector = (actual, expected) => near(actual.distanceTo(expected), 0);

test('half the original spin provides quarter gravity and doubles the period', () => {
  near(ANGULAR_SPEED, Math.sqrt(9.81 / RADIUS) / 2);
  near(ANGULAR_SPEED ** 2 * RADIUS, 9.81 / 4);
  near(ANGULAR_SPEED ** 2 * RADIUS, gravityAt(RADIUS));
  assert.ok(ROTATION_PERIOD > 53.8 && ROTATION_PERIOD < 53.9);
  assert.ok(ROTATION_RPM > 1.11 && ROTATION_RPM < 1.12);
});

test('sky and external lighting remain fixed in inertial space as the ring turns', () => {
  const scene = new Scene();
  const light = new DirectionalLight(); light.position.set(2, 3, -5);
  const originalLight = light.position.clone();
  const direction = new Vector3(1, 2, -3).normalize();
  const rotate = createStationRotation(scene, [light]);
  const axis = new Vector3(0, 0, 1);
  for (const fraction of [0.25, 0.5, 0.75]) {
    rotate(Math.PI * 2 * fraction);
    near(scene.backgroundRotation.z, -Math.PI * 2 * fraction);
    const apparentDirection = direction.clone().applyEuler(scene.backgroundRotation);
    sameVector(apparentDirection.applyAxisAngle(axis, Math.PI * 2 * fraction), direction);
    sameVector(light.position.clone().applyAxisAngle(axis, Math.PI * 2 * fraction), originalLight);
  }
});

test('absolute elapsed time handles full turns and long frame gaps without drift', () => {
  const scene = new Scene();
  const light = new DirectionalLight(); light.position.set(-50, 80, -160);
  const original = light.position.clone();
  const rotate = createStationRotation(scene, [light]);
  rotate(Math.PI * 2 * 0.7);
  rotate(Math.PI * 2);
  near(scene.backgroundRotation.z, 0); sameVector(light.position, original);
  rotate(Math.PI * 2 * 1000.25);
  near(scene.backgroundRotation.z, -Math.PI / 2);
  sameVector(light.position, original.clone().applyAxisAngle(new Vector3(0, 0, 1), -Math.PI / 2));
});

test('1 g requires twice the speed and half the period of 0.25 g', () => {
  const low = rotationForGravity(0.25), high = rotationForGravity(1);
  near(high.angularSpeed, low.angularSpeed * 2);
  near(high.period, low.period / 2);
  near(high.angularSpeed ** 2 * RADIUS, 9.81);
});

test('switching gravity preserves phase and applies the new speed only afterwards', () => {
  const clock = createSpinClock();
  const lowSpeed = clock.settings.angularSpeed;
  const changeTime = 12.3;
  const before = clock.angleAt(changeTime);
  clock.setGravity(1, changeTime);
  near(clock.angleAt(changeTime), before);
  near(clock.angleAt(changeTime + 1), before + 2 * lowSpeed);
  const secondTime = changeTime + 1;
  const secondAngle = clock.angleAt(secondTime);
  clock.setGravity(0.25, secondTime);
  near(clock.angleAt(secondTime), secondAngle);
  near(clock.angleAt(secondTime + 1), secondAngle + lowSpeed);
  near(clock.angleAt(secondTime + clock.settings.period * 1000), secondAngle, 1e-8);
});
