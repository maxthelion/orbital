import { Vector3 } from 'three';
import { RADIUS, TAU, gravityAt } from './movement.js';

export const ANGULAR_SPEED = Math.sqrt(gravityAt(RADIUS) / RADIUS);
export const ROTATION_PERIOD = TAU / ANGULAR_SPEED;
export const ROTATION_RPM = ANGULAR_SPEED * 60 / TAU;
const axis = new Vector3(0, 0, 1);

// The corridor and player use station coordinates. An inertially fixed sky and
// external light directions therefore rotate oppositely around the ring's Z axis.
export function createStationRotation(scene, externalLights) {
  const initialPositions = externalLights.map((light) => light.position.clone());
  return (elapsedSeconds) => {
    const angle = -(elapsedSeconds % ROTATION_PERIOD) * ANGULAR_SPEED;
    scene.backgroundRotation.set(0, 0, angle);
    externalLights.forEach((light, i) => {
      light.position.copy(initialPositions[i]).applyAxisAngle(axis, angle);
    });
  };
}
