import * as THREE from 'three';
import './style.css';
import { createSky } from './sky.js';
import { createStation } from './station.js';
import { createExteriorCamera, resizeExteriorCamera, updateExteriorCamera, createExteriorGuides } from './exterior-view.js';
import { createStationRotation, createSpinClock } from './rotation.js';
import { RADIUS, TAU, START_ANGLE, createPlayer, gravityAt, playerPosition, stepPlayer, wrapAngle } from './movement.js';

const canvas = document.querySelector('#scene');
const status = document.querySelector('#entry-status');
try { boot(); } catch (error) {
  console.error(error);
  status.textContent = 'The 3D view could not start. Please use a browser with WebGL 2 enabled.';
  document.querySelector('#enter').disabled = true;
}

function boot() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  const scene = new THREE.Scene();
  scene.background = createSky(renderer);
  scene.add(createStation());
  scene.add(new THREE.AmbientLight('#c6d9e8', 1.65));
  const sun = new THREE.DirectionalLight('#ffe0b4', 2.2);
  sun.position.set(-50, 80, -160); scene.add(sun);
  const fill = new THREE.DirectionalLight('#8ac5e7', 0.85);
  fill.position.set(30, -100, 130); scene.add(fill);
  const rotateStation = createStationRotation(scene, [sun, fill]);
  const rotationStartedAt = performance.now();
  const spinClock = createSpinClock();
  const camera = new THREE.PerspectiveCamera(76, window.innerWidth / window.innerHeight, 0.05, 900);
  const exteriorCamera = createExteriorCamera(camera.aspect);
  const exteriorGuides = createExteriorGuides();
  scene.add(exteriorGuides);
  let exterior = new URLSearchParams(window.location.search).get('view') === 'exterior';
  const viewToggle = document.querySelector('#view-toggle');
  const lamp = new THREE.PointLight('#d4e9ed', 18, 17, 2);
  scene.add(lamp);
  let player = createPlayer();
  let playing = false, dragId = null, lastX = 0, lastY = 0, jumpQueued = false;
  let pointerRequestPending = false;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const keys = new Set(), touchMoves = new Map();
  const enter = document.querySelector('#enter');
  const welcome = document.querySelector('#welcome');
  const help = document.querySelector('#footer-help');
  const forward = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3();
  const tangent = new THREE.Vector3(), backwards = new THREE.Vector3(), basis = new THREE.Matrix4();
  const gravity = document.querySelector('#gravity');
  const dot = document.querySelector('#map-dot');
  const sector = document.querySelector('#sector');
  const distance = document.querySelector('#distance');
  const gravityButtons = [...document.querySelectorAll('[data-gravity]')];
  function syncGravityUI() {
    const { rimGravity, rpm, period } = spinClock.settings;
    for (const button of gravityButtons) button.setAttribute('aria-pressed', String(Number(button.dataset.gravity) === rimGravity));
    document.querySelector('#rotation-readout').textContent = `ROTATION ${rpm.toFixed(2)} RPM / ${period.toFixed(1)} S`;
    document.querySelector('#exterior-spin-readout').textContent = `${rpm.toFixed(2)} rpm · ${period.toFixed(1)} seconds per rotation · ${rimGravity} g at the rim`;
    gravity.innerHTML = `${(gravityAt(RADIUS - player.height, rimGravity) / 9.81).toFixed(2)} <small>g</small>`;
  }
  function selectGravity(value) {
    spinClock.setGravity(value, (performance.now() - rotationStartedAt) / 1000);
    syncGravityUI();
  }
  for (const button of gravityButtons) button.addEventListener('click', () => selectGravity(Number(button.dataset.gravity)));
  syncGravityUI();
  function clearInput() { keys.clear(); touchMoves.clear(); jumpQueued = false; dragId = null; }
  function setPlaying(value) {
    playing = value;
    document.body.classList.toggle('playing', value);
    welcome.inert = value || exterior;
    clearInput();
    if (!value && !exterior) {
      enter.innerHTML = 'Continue exploring <span>↗</span>';
      enter.focus({ preventScroll: true });
    }
    help.textContent = exterior ? 'FIXED EXTERIOR CAMERA · V TO WALK INSIDE' : coarse ? 'DRAG TO LOOK · ARROWS TO WALK' : 'WASD WALK · SHIFT RUN · SPACE JUMP · V EXTERIOR';
  }
  function syncView() {
    document.body.classList.toggle('exterior', exterior);
    exteriorGuides.visible = exterior;
    lamp.visible = !exterior;
    welcome.inert = exterior || playing;
    viewToggle.textContent = exterior ? 'Walk inside · V' : 'Exterior view · V';
    viewToggle.setAttribute('aria-pressed', String(exterior));
    canvas.setAttribute('aria-label', exterior ? 'Exterior view of the spinning ring with its rotation axis marked' : 'First person view inside an orbital ring corridor');
    if (exterior) help.textContent = 'FIXED EXTERIOR CAMERA · V TO WALK INSIDE';
  }
  function toggleView() {
    exterior = !exterior;
    setPlaying(false);
    if (exterior && document.pointerLockElement === canvas) document.exitPointerLock();
    syncView();
    if (!exterior) requestControl();
  }
  viewToggle.addEventListener('click', toggleView);
  syncView();
  async function requestControl() {
    if (pointerRequestPending || exterior) return;
    setPlaying(true);
    if (coarse || !canvas.requestPointerLock) return;
    pointerRequestPending = true;
    try { await canvas.requestPointerLock(); } catch {
      help.textContent = 'DRAG TO LOOK · WASD WALK · ESC PAUSE';
    } finally { pointerRequestPending = false; }
  }
  enter.addEventListener('click', requestControl);
  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === canvas && !exterior) setPlaying(true);
    else if (playing) setPlaying(false);
  });
  document.addEventListener('pointerlockerror', () => { help.textContent = 'DRAG TO LOOK · WASD WALK · ESC PAUSE'; });
  function look(dx, dy) {
    player.yaw = wrapAngle(player.yaw + dx * 0.0022);
    player.pitch = Math.max(-1.43, Math.min(1.43, player.pitch - dy * 0.0022));
  }
  document.addEventListener('mousemove', (event) => {
    if (playing && document.pointerLockElement === canvas) look(event.movementX, event.movementY);
  });
  canvas.addEventListener('pointerdown', (event) => {
    if (!playing || document.pointerLockElement === canvas) return;
    dragId = event.pointerId; lastX = event.clientX; lastY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (event.pointerId !== dragId || !playing) return;
    look(event.clientX - lastX, event.clientY - lastY);
    lastX = event.clientX; lastY = event.clientY;
  });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(event, () => { dragId = null; });
  const controlCodes = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight']);
  document.addEventListener('keydown', (event) => {
    if (event.code === 'KeyG' && !event.repeat) { event.preventDefault(); selectGravity(spinClock.settings.rimGravity === 0.25 ? 1 : 0.25); return; }
    if (event.code === 'KeyV' && !event.repeat) { event.preventDefault(); toggleView(); return; }
    if (event.code === 'Escape' && playing && document.pointerLockElement !== canvas) setPlaying(false);
    if (!playing || !controlCodes.has(event.code)) return;
    event.preventDefault(); keys.add(event.code);
    if (event.code === 'Space' && !event.repeat) jumpQueued = true;
  });
  document.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => {
    clearInput();
    if (document.pointerLockElement === canvas) document.exitPointerLock();
    setPlaying(false);
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) clearInput(); });
  for (const button of document.querySelectorAll('[data-move]')) {
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault(); button.setPointerCapture(event.pointerId); touchMoves.set(event.pointerId, button.dataset.move);
    });
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(name, (event) => touchMoves.delete(event.pointerId));
  }
  document.querySelector('#reset').addEventListener('click', () => { player = createPlayer(); clearInput(); });
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
    resizeExteriorCamera(exteriorCamera, camera.aspect);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); renderer.setSize(window.innerWidth, window.innerHeight);
  });
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault(); renderer.setAnimationLoop(null); setPlaying(false);
    status.textContent = 'The graphics context was interrupted. Reload the page to restart.'; enter.disabled = true;
  });
  let previous = rotationStartedAt, accumulator = 0, nextHud = 0;
  const timestep = 1 / 120;
  renderer.setAnimationLoop((now) => {
    // Absolute elapsed time preserves the true spin rate at low frame rates and
    // after background tabs resume. Pausing controls does not stop the habitat.
    const elapsedSeconds = (now - rotationStartedAt) / 1000;
    const spinAngle = spinClock.angleAt(elapsedSeconds);
    rotateStation(spinAngle);
    if (exterior) updateExteriorCamera(exteriorCamera, spinAngle);
    const dt = Math.min((now - previous) / 1000, 0.05); previous = now;
    if (playing) {
      const touch = new Set(touchMoves.values());
      player.yaw = wrapAngle(player.yaw + ((keys.has('ArrowRight') ? 1 : 0) - (keys.has('ArrowLeft') ? 1 : 0)) * dt * 1.45);
      const input = {
        forward: Number(keys.has('KeyW') || keys.has('ArrowUp') || touch.has('forward')) - Number(keys.has('KeyS') || keys.has('ArrowDown') || touch.has('back')),
        side: Number(keys.has('KeyD') || touch.has('right')) - Number(keys.has('KeyA') || touch.has('left')),
        run: keys.has('ShiftLeft') || keys.has('ShiftRight'), jump: jumpQueued,
      };
      accumulator += dt;
      while (accumulator >= timestep) {
        stepPlayer(player, input, timestep, spinClock.settings.rimGravity); accumulator -= timestep;
        input.jump = false; jumpQueued = false;
      }
    } else accumulator = 0;
    camera.position.fromArray(playerPosition(player));
    tangent.set(-Math.sin(player.angle), Math.cos(player.angle), 0);
    up.set(-Math.cos(player.angle), -Math.sin(player.angle), 0);
    forward.copy(tangent).multiplyScalar(Math.cos(player.yaw)); forward.z = Math.sin(player.yaw);
    right.copy(tangent).multiplyScalar(-Math.sin(player.yaw)); right.z = Math.cos(player.yaw);
    backwards.copy(forward).negate();
    basis.makeBasis(right, up, backwards);
    camera.quaternion.setFromRotationMatrix(basis);
    camera.rotateX(player.pitch);
    lamp.position.copy(camera.position).addScaledVector(up, 0.5);
    if (now >= nextHud) {
      const fraction = wrapAngle(player.angle - START_ANGLE) / TAU;
      dot.setAttribute('cx', String(50 + Math.cos(player.angle) * 37));
      dot.setAttribute('cy', String(50 - Math.sin(player.angle) * 37));
      sector.textContent = `SECTOR ${String(Math.floor(fraction * 16) + 1).padStart(2, '0')} / 16`;
      distance.textContent = `${String(Math.floor(fraction * TAU * RADIUS)).padStart(4, '0')} m / 1131 m`;
      gravity.innerHTML = `${(gravityAt(RADIUS - player.height, spinClock.settings.rimGravity) / 9.81).toFixed(2)} <small>g</small>`;
      nextHud = now + 100;
    }
    renderer.render(scene, exterior ? exteriorCamera : camera);
  });
}
