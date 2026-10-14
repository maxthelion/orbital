import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { createExteriorCamera, updateExteriorCamera } from './exterior-view.js';
import { ANGULAR_SPEED, ROTATION_PERIOD } from './rotation.js';
import { RADIUS } from './movement.js';
import { PLANET_POSITION } from './sky.js';
const axis = new Vector3(0, 0, 1);

test('exterior observer is opposite the planet and remains fixed in inertial space', () => {
  const camera = createExteriorCamera(16 / 9);
  updateExteriorCamera(camera, 0);
  const position = camera.position.clone();
  assert.ok(position.dot(new Vector3().fromArray(PLANET_POSITION)) < 0);
  assert.ok(position.length() > RADIUS + 260);
  const skyDirection = new Vector3().fromArray(PLANET_POSITION).normalize().multiplyScalar(10000);
  assert.ok(skyDirection.clone().cross(axis).length() < 1e-9);
  assert.ok(skyDirection.dot(axis) < 0);
  const startProjection = skyDirection.clone().add(position).project(camera);
  for (const phase of [0.25, 0.5, 0.75, 1]) {
    const time = phase * ROTATION_PERIOD;
    assert.ok(skyDirection.clone().applyAxisAngle(axis, -time * ANGULAR_SPEED).distanceTo(skyDirection) < 1e-8);
    updateExteriorCamera(camera, time * ANGULAR_SPEED);
    const inertialPosition = camera.position.clone().applyAxisAngle(axis, time * ANGULAR_SPEED);
    assert.ok(inertialPosition.distanceTo(position) < 1e-8);
    const projection = skyDirection.clone().applyAxisAngle(axis, -time * ANGULAR_SPEED).add(camera.position).project(camera);
    assert.ok(projection.distanceTo(startProjection) < 1e-8);
  }
});

test('complete ring and axis fit the exterior camera on portrait and wide screens', () => {
  for (const aspect of [9 / 16, 1, 16 / 9, 32 / 9]) {
    const camera = createExteriorCamera(aspect);
    for (const fraction of [0, 0.25, 0.5, 0.75]) {
      updateExteriorCamera(camera, fraction * Math.PI * 2);
      const points = [new Vector3(0, 0, -285), new Vector3(0, 0, 260)];
      for (let i = 0; i < 128; i++) for (const z of [-6, 6]) points.push(new Vector3(Math.cos(i / 128 * Math.PI * 2) * RADIUS, Math.sin(i / 128 * Math.PI * 2) * RADIUS, z));
      for (const point of points) {
        const projected = point.project(camera);
        assert.ok(Math.abs(projected.x) < 0.95 && Math.abs(projected.y) < 0.95);
        assert.ok(projected.z > -1 && projected.z < 1);
      }
    }
  }
});
