import * as THREE from 'three';
import { RADIUS as R, HEIGHT, HALF_WIDTH as W, TAU } from './movement.js';

// Coordinates: ring in XY; Z runs across the corridor. Surface subdivisions
// keep the circular floor smooth even when viewed almost edge-on.
export function cylindricalSurface(radius, z0, z1, segments = 1024) {
  const positions = [], uv = [], indices = [];
  for (let i = 0; i <= segments; i++) {
    const a = i / segments * TAU;
    for (const z of [z0, z1]) positions.push(Math.cos(a) * radius, Math.sin(a) * radius, z);
    uv.push(i / segments, 0, i / segments, 1);
    if (i < segments) { const n = i * 2; indices.push(n, n + 2, n + 1, n + 1, n + 2, n + 3); }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function deckTexture() {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#859095'; ctx.fillRect(0, 0, 512, 512);
  ctx.fillStyle = '#68777e'; ctx.fillRect(0, 0, 4, 512); ctx.fillRect(0, 0, 512, 3);
  ctx.fillStyle = '#748189'; ctx.fillRect(255, 0, 2, 512);
  ctx.fillStyle = '#394a55';
  for (let y = 18; y < 512; y += 15) { ctx.fillRect(16, y, 48, 3); ctx.fillRect(448, y, 48, 3); }
  ctx.fillStyle = '#aab2b2';
  for (const x of [80, 432]) for (const y of [14, 498]) { ctx.beginPath(); ctx.arc(x, y, 2, 0, TAU); ctx.fill(); }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(128, 1);
  texture.anisotropy = 8;
  return texture;
}

export function createStation() {
  const group = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: '#71858e', roughness: 0.57, metalness: 0.45 });
  const dark = new THREE.MeshStandardMaterial({ color: '#233744', roughness: 0.67, metalness: 0.35, side: THREE.DoubleSide });
  const deck = new THREE.MeshStandardMaterial({ map: deckTexture(), roughness: 0.85, metalness: 0.15, side: THREE.DoubleSide });
  const panel = new THREE.MeshStandardMaterial({ color: '#87979b', roughness: 0.62, metalness: 0.28, side: THREE.DoubleSide });
  const warm = new THREE.MeshBasicMaterial({ color: '#ffe0aa' });
  const cyan = new THREE.MeshBasicMaterial({ color: '#a9e4ea' });
  group.add(new THREE.Mesh(cylindricalSurface(R, -W, W), deck));
  group.add(new THREE.Mesh(cylindricalSurface(R - HEIGHT, -W, W), dark));
  function ringBand(inner, outer, z, material) {
    const mesh = new THREE.Mesh(new THREE.RingGeometry(inner, outer, 1024), material);
    mesh.position.z = z; group.add(mesh);
  }
  for (const z of [-W, W]) {
    ringBand(R - 1.0, R + 0.2, z, panel);
    ringBand(R - HEIGHT - 0.15, R - HEIGHT + 0.55, z, panel);
    ringBand(R - HEIGHT + 0.55, R - 1, z, new THREE.MeshBasicMaterial({ color: '#72aec1', transparent: true, opacity: 0.035, side: THREE.DoubleSide, depthWrite: false }));
    for (const height of [1.18, HEIGHT - 0.64]) {
      const rail = new THREE.Mesh(new THREE.TorusGeometry(R - height, 0.045, 6, 768), metal);
      rail.position.z = z - Math.sign(z) * 0.16; group.add(rail);
    }
  }
  for (const z of [-4.75, 4.75]) {
    group.add(new THREE.Mesh(cylindricalSurface(R - 0.018, z - 0.028, z + 0.028), warm));
    group.add(new THREE.Mesh(cylindricalSurface(R - HEIGHT + 0.02, z - 0.12, z + 0.12), cyan));
  }
  for (const z of [-1.8, 1.8]) group.add(new THREE.Mesh(cylindricalSurface(R - HEIGHT + 0.07, z - 0.3, z + 0.3), metal));
  const transform = new THREE.Object3D();
  function repeatBox(size, material, placements) {
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(...size), material, placements.length);
    placements.forEach(([angle, height, z], i) => {
      transform.position.set(Math.cos(angle) * (R - height), Math.sin(angle) * (R - height), z);
      transform.rotation.set(0, 0, angle + Math.PI / 2);
      transform.updateMatrix(); mesh.setMatrixAt(i, transform.matrix);
    });
    mesh.computeBoundingSphere(); group.add(mesh);
  }
  const pillars = [], lintels = [], lamps = [], floorJoints = [];
  for (let i = 0; i < 128; i++) {
    const a = i / 128 * TAU;
    pillars.push([a, HEIGHT / 2, -W], [a, HEIGHT / 2, W]);
    lintels.push([a, HEIGHT - 0.2, 0]);
    lamps.push([a + 0.018, HEIGHT - 0.34, -3.2], [a + 0.018, HEIGHT - 0.34, 3.2]);
    floorJoints.push([a, 0.008, 0]);
  }
  repeatBox([0.18, HEIGHT, 0.27], metal, pillars);
  repeatBox([0.22, 0.4, W * 2], metal, lintels);
  repeatBox([2.5, 0.07, 0.28], warm, lamps);
  repeatBox([0.035, 0.013, W * 2], dark, floorJoints);
  for (let i = 0; i < 16; i++) {
    const angle = -Math.PI / 2 + i / 16 * TAU;
    const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1c303c'; ctx.fillRect(0, 0, 768, 256);
    ctx.fillStyle = '#eec995'; ctx.fillRect(0, 0, 8, 256);
    ctx.font = 'bold 110px Arial'; ctx.fillText(String(i + 1).padStart(2, '0'), 40, 140);
    ctx.font = '22px Arial'; ctx.fillStyle = '#ccdce0'; ctx.fillText('OBSERVATION RING', 235, 90);
    ctx.font = '16px Arial'; ctx.fillStyle = '#93b1c1'; ctx.fillText('PERIHELION  /  KEEP WALKING →', 238, 135);
    ctx.fillStyle = '#9acbd0'; ctx.fillRect(42, 190, 680, 2);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    for (const side of [-1, 1]) {
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 0.9), new THREE.MeshBasicMaterial({ map: texture }));
      const frame = new THREE.Group();
      frame.position.set(Math.cos(angle) * (R - 2.2), Math.sin(angle) * (R - 2.2), side * (W - 0.2));
      frame.rotation.z = angle + Math.PI / 2;
      sign.rotation.y = side === 1 ? Math.PI : 0;
      frame.add(sign); group.add(frame);
    }
  }
  return group;
}
