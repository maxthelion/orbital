export const RADIUS = 180;
export const HEIGHT = 7;
export const HALF_WIDTH = 6;
export const EYE_HEIGHT = 1.72;
export const TAU = Math.PI * 2;
export const START_ANGLE = -Math.PI / 2;
// Fraction of the original spin that produced 1 g at the outer hull.
export const SPIN_SPEED_FACTOR = 0.5;
export const gravityAt = (radius) => 9.81 * SPIN_SPEED_FACTOR ** 2 * Math.max(0, radius) / RADIUS;
export const wrapAngle = (angle) => ((angle % TAU) + TAU) % TAU;

export function createPlayer() {
  return { angle: START_ANGLE, z: -1.4, height: 0, verticalSpeed: 0, yaw: -0.24, pitch: 0.035, travel: 0 };
}

// A deliberately constrained walking controller in the station's rotating frame.
// Angular motion follows the floor; height measures inward distance from the hull.
// Coriolis forces are omitted for this first proof of concept.
export function stepPlayer(player, input, dt) {
  const length = Math.hypot(input.forward, input.side) || 1;
  const speed = input.run ? 13 : 4.6;
  const forward = input.forward / Math.max(1, length);
  const side = input.side / Math.max(1, length);
  const along = (Math.cos(player.yaw) * forward - Math.sin(player.yaw) * side) * speed;
  const across = (Math.sin(player.yaw) * forward + Math.cos(player.yaw) * side) * speed;
  player.angle = wrapAngle(player.angle + along * dt / (RADIUS - player.height));
  player.z = Math.max(-HALF_WIDTH + 0.42, Math.min(HALF_WIDTH - 0.42, player.z + across * dt));
  player.travel += Math.abs(along * dt);
  if (input.jump && player.height === 0) player.verticalSpeed = 4.7;
  player.verticalSpeed -= gravityAt(RADIUS - player.height) * dt;
  player.height += player.verticalSpeed * dt;
  if (player.height < 0) {
    player.height = 0;
    player.verticalSpeed = 0;
  }
  if (player.height > HEIGHT - EYE_HEIGHT - 0.2) {
    player.height = HEIGHT - EYE_HEIGHT - 0.2;
    player.verticalSpeed = Math.min(0, player.verticalSpeed);
  }
}

export function playerPosition(player) {
  const r = RADIUS - player.height - EYE_HEIGHT;
  return [Math.cos(player.angle) * r, Math.sin(player.angle) * r, player.z];
}
