# Perihelion — Ring walk

A standalone Three.js proof of concept: walk the entire inner surface of a 180 m
radius orbital ring, with panoramic windows onto a gas giant and a dense starfield.
The planet and stars are rendered once at startup into a cubemap that rotates
relative to the station at its physical spin rate. All visuals
are procedural; there are no remote image, font, CDN, or API dependencies.

## Run

```sh
npm install
npm run dev
```

The development server binds only to `127.0.0.1:4380`.
For a built preview: `npm run build` then `npm run preview`.

## Controls

Click **Enter the ring**, then WASD to walk, mouse to look, Shift to run, Space to
jump, and Esc to pause. Arrow up/down also walk; arrow left/right turn. If pointer
lock is unavailable, drag the view to look. Touch devices get directional buttons
and drag-to-look. Reset position returns to the initial observation point.

Press **V** or click **Exterior view** to switch to an oblique camera on the side
opposite the planet. The amber dashed line marks the physical Z rotation axis;
the cyan sector 01 marker follows the ring. The axis arrow points towards the
planet centre, aligned with the negative Z axis. This camera is fixed in inertial
space, so the planet/stars stay still while the station rotates. Switch back
with **V** or **Walk inside**; your walking position is preserved.

Direct exterior view: https://omarchy.tail4ba9e6.ts.net:8535/?view=exterior

## Model

- 1,131 m continuous corridor; 12 m wide, 7 m high, divided into 16 marked sectors.
- Floor at radius 180 m. Local up points towards the rotation axis.
- Half the original spin speed gives quarter gravity: `g(r) = 9.81 * 0.5² * r / 180`.
  The floor has 0.25 g; jumping uses this reduced acceleration.
- Fixed 120 Hz movement integration; radial jumps, wall and ceiling constraints.
- The ring spins at `0.5 * sqrt(9.81 / 180)` rad/s: 1.11 rpm, one turn every 53.8 s.
  The baked sky and external light directions rotate oppositely around the Z axis
  in station coordinates. Walking and local gravity remain relative to the deck.
- Spin follows elapsed real time, including while controls are paused or the tab
  is hidden. Reset position resets the player only. No orbital translation or
  planet animation is simulated.
- This initial version has no ladders, access to the axis, Coriolis forces, physics
  props, or general-purpose mesh collision. Movement is constrained to the ring.
- Repeated structure uses instanced meshes; the environment is baked once.

## Verification

`npm test` runs focused non-browser checks for a full circuit, local radius,
gravity falloff, jumping, both wall constraints, diagonal speed and angle wrapping,
plus spin acceleration, inertial sky/light alignment, and full-rotation closure.
`npm run build` validates the standalone application bundle.
Browser testing and visual validation are intentionally left for manual review.

## Review instance

Tailnet-only review: https://omarchy.tail4ba9e6.ts.net:8535/

A user service named `perihelion-ring-walk.service` serves `dist/` on loopback
port 4380. Tailscale Serve maps HTTPS port 8535 to this service. Other Serve
mappings are preserved. Run the development server on another port while this
review instance is active, for example `npm run dev -- --port 4381`.

## Verification record — 13 October 2026

- Seven focused movement tests passed on the first run (63 ms test-runner duration).
- JavaScript syntax checks passed (0.10 s command wall time).
- Initial offline installation could not find one cached Vite dependency, so the
  initial build could not locate Vite. Normal dependency installation resolved it.
- Standalone production build passed (0.49 s command wall time; 274 ms Vite build).
- No browser, screenshot, or interactive visual validation was run.

## Rotation update — 14 October 2026

- Added physical ring spin: 2.23 rpm (26.9 s per turn), with inverse sky and external
  lighting rotation in the station frame. The cubemap still renders only once.
- Ten movement/rotation checks passed (84 ms test-runner duration); production
  build passed (225 ms Vite duration). Combined command wall time: 0.67 s.
- Tailnet HTTP checks confirmed that the page and assets match the rebuilt files.
- No browser or visual validation was run. Coriolis physics remains outside scope.

## Half-speed update — 14 October 2026

- Halved the original rotation speed to 1.11 rpm (53.8 s per turn).
- Gravity follows the square of spin speed: 0.25 g at the floor. The HUD and
  jump acceleration use the same gravity model as the rotation calculation.
- All ten checks passed, including the higher quarter-gravity jump (84 ms test
  duration); build passed (227 ms Vite duration; 0.64 s combined command wall).
- Tailnet page and assets match the rebuilt files. No browser validation was run.


## Exterior view — 14 October 2026

- Added a fixed exterior observer on the planet-opposite side, visible rotation
  axis, sector marker, view toggle, and direct `?view=exterior` entry.
- Twelve tests passed (87 ms test-runner duration), including inertial observer
  consistency and framing at four aspect ratios/four spin phases. Build passed
  (237 ms Vite duration; combined test/build command wall time 0.69 s).
- HTTPS page/assets match the new build. No browser validation was run.

## Planet-axis alignment — 14 October 2026

- Aligned the planet centre with the ring's negative Z axis while preserving its
  apparent size. The exterior axis arrow now points towards the planet.
- Updated the exterior checks to use the actual sky position and verify alignment
  throughout a rotation. All twelve checks passed (89 ms test-runner duration).
- Build passed (267 ms Vite duration; combined command wall time 0.73 s).
- Tailnet page/assets match the new build. No browser validation was run.
