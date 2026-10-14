import * as THREE from 'three';
import { RADIUS, START_ANGLE } from './movement.js';
import { ANGULAR_SPEED, ROTATION_PERIOD } from './rotation.js';

const axis = new THREE.Vector3(0, 0, 1);
// Positive Z is the side opposite the planet. An oblique angle makes the
// ring plane and its perpendicular axis readable together.
const viewingDirection = new THREE.Vector3(-0.65, 0.5, 1).normalize();
export function createExteriorCamera(aspect) {
  const camera = new THREE.PerspectiveCamera(48, aspect, 0.1, 4000);
  resizeExteriorCamera(camera, aspect);
  return camera;
}
export function resizeExteriorCamera(camera, aspect) {
  camera.aspect = aspect;
  const verticalHalfAngle = THREE.MathUtils.degToRad(camera.fov / 2);
  const limitingHalfAngle = Math.min(verticalHalfAngle, Math.atan(Math.tan(verticalHalfAngle) * aspect));
  camera.userData.viewDistance = 285 / Math.sin(limitingHalfAngle);
  camera.far = camera.userData.viewDistance + 1000;
  camera.updateProjectionMatrix();
}
export function updateExteriorCamera(camera, elapsedSeconds) {
  // Match the inertial observer to the existing rotating station coordinates.
  // This keeps the distant planet/stars fixed while the station visibly spins.
  const inverseSpin = -(elapsedSeconds % ROTATION_PERIOD) * ANGULAR_SPEED;
  camera.position.copy(viewingDirection).multiplyScalar(camera.userData.viewDistance).applyAxisAngle(axis, inverseSpin);
  camera.up.set(0, 1, 0).applyAxisAngle(axis, inverseSpin);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
}

export function createExteriorGuides() {
  const group = new THREE.Group();
  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, -260), new THREE.Vector3(0, 0, 260)]),
    new THREE.LineDashedMaterial({ color: '#ffce86', dashSize: 7, gapSize: 4, depthTest: false, depthWrite: false }),
  );
  line.computeLineDistances(); line.renderOrder = 100; group.add(line);
  const arrow = new THREE.ArrowHelper(axis.clone().negate(), new THREE.Vector3(0, 0, -244), 20, '#ffce86', 14, 8);
  arrow.line.material.depthTest = arrow.cone.material.depthTest = false;
  arrow.line.material.depthWrite = arrow.cone.material.depthWrite = false;
  arrow.line.renderOrder = arrow.cone.renderOrder = 101; group.add(arrow);
  function label(text, color, position, width) {
    const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 112;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#09141ee6'; ctx.fillRect(0, 0, 768, 112);
    ctx.fillStyle = color; ctx.font = '500 36px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 384, 56);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false, depthWrite: false }));
    sprite.position.copy(position); sprite.scale.set(width, width * 112 / 768, 1); sprite.renderOrder = 102; group.add(sprite);
  }
  label('AXIS → PLANET', '#ffce86', new THREE.Vector3(0, 0, -285), 110);
  const marker = new THREE.Mesh(new THREE.SphereGeometry(3.2, 16, 12), new THREE.MeshBasicMaterial({ color: '#96f1ef' }));
  marker.position.set(Math.cos(START_ANGLE) * (RADIUS + 5), Math.sin(START_ANGLE) * (RADIUS + 5), 8);
  group.add(marker);
  label('SECTOR 01', '#96f1ef', marker.position.clone().multiplyScalar(1.13), 72);
  return group;
}
