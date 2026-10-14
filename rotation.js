import { Vector3 } from 'three';
import { RADIUS, TAU, gravityAt, DEFAULT_RIM_GRAVITY, wrapAngle } from './movement.js';

export const ANGULAR_SPEED = Math.sqrt(gravityAt(RADIUS) / RADIUS);
export const ROTATION_PERIOD = TAU / ANGULAR_SPEED;
export const ROTATION_RPM = ANGULAR_SPEED * 60 / TAU;
const axis = new Vector3(0, 0, 1);

export function rotationForGravity(rimGravity) {
  if (!Number.isFinite(rimGravity) || rimGravity <= 0) throw new RangeError('Gravity must be positive.');
  const angularSpeed = Math.sqrt(gravityAt(RADIUS, rimGravity) / RADIUS);
  return { rimGravity, angularSpeed, rpm: angularSpeed * 60 / TAU, period: TAU / angularSpeed };
}

// Rebase at each speed change so changing gravity never jumps the sky or ring
// phase. Use elapsed real time so hidden tabs do not slow the rotation.
export function createSpinClock(rimGravity = DEFAULT_RIM_GRAVITY) {
  let settings = rotationForGravity(rimGravity), baseAngle = 0, baseTime = 0;
  const angleAt = (seconds) => wrapAngle(baseAngle + settings.angularSpeed * (seconds - baseTime));
  return {
    get settings() { return settings; },
    angleAt,
    setGravity(value, seconds) {
      const next = rotationForGravity(value);
      baseAngle = angleAt(seconds);
      baseTime = seconds;
      settings = next;
    },
  };
}

// The corridor and player use station coordinates. An inertially fixed sky and
// external light directions therefore rotate oppositely around the ring's Z axis.
export function createStationRotation(scene, externalLights) {
  const initialPositions = externalLights.map((light) => light.position.clone());
  return (spinAngle) => {
    const angle = -wrapAngle(spinAngle);
    scene.backgroundRotation.set(0, 0, angle);
    externalLights.forEach((light, i) => {
      light.position.copy(initialPositions[i]).applyAxisAngle(axis, angle);
    });
  };
}
