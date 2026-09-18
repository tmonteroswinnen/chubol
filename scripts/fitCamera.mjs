/**
 * Fits the game camera to the supplied court plate.
 *
 * The plate is the artwork the game has to sit inside, so the camera is not
 * chosen — it is measured. Every landmark below was read off a 4x to 8x crop of
 * the plate itself (see scripts/crop.mjs and the crops it writes to .work/),
 * never estimated from the full view.
 *
 * Two things this has to get right that are easy to get wrong:
 *
 *  - A projected circle is an ellipse, and the ellipse's rightmost pixel is NOT
 *    the projection of the circle's rightmost world point. So the arcs are
 *    measured where they CROSS the axis of the key, not at their visual apex.
 *  - A ground homography leaves the vertical scale free: the same ground can be
 *    reproduced by a near camera with a short focal length or a far one with a
 *    long one, and those differ entirely in how a three-metre hoop projects. The
 *    rim anchors that scale, which is why its height is a stated assumption.
 *
 * Run: node scripts/fitCamera.mjs
 */

/* ------------------------------------------------------------------ */
/* Landmarks measured on the plate                                     */
/* ------------------------------------------------------------------ */

const OBSERVED = {
  // Corners of the painted key. "far" = cypress side (+y), "near" = front wall (-y).
  keyBaselineFar: [252, 464],
  keyBaselineNear: [125, 663],
  keyFreeThrowFar: [607, 466],
  keyFreeThrowNear: [607, 660],
  // Where each arc crosses the axis of the key.
  freeThrowCross: [752, 563],
  outerArcCross: [942, 563],
  // Centre of the metal rim.
  rimCentre: [301, 270],
  // Corners of the wooden backboard.
  boardTopFar: [295, 116],
  boardTopNear: [150, 170],
  boardBottomFar: [295, 280],
  boardBottomNear: [155, 335],
};

/** Two further points on the baseline, used as a line constraint. */
const BASELINE_POINTS = [
  [303, 377],
  [130, 650],
];

/**
 * The court was never measured in real life, so the half-width of the key is the
 * chosen unit that sets the scale; everything else is solved against it.
 */
const KEY_HALF_WIDTH = 1.9;

/* ------------------------------------------------------------------ */
/* Camera model (mirrors src/game/sim/projection.ts)                   */
/* ------------------------------------------------------------------ */

function basisFrom(position, yaw, pitch) {
  const forward = {
    x: Math.cos(pitch) * Math.sin(yaw),
    y: Math.cos(pitch) * Math.cos(yaw),
    z: Math.sin(pitch),
  };
  let rx = forward.y;
  let ry = -forward.x;
  const rl = Math.hypot(rx, ry) || 1;
  rx /= rl;
  ry /= rl;
  const right = { x: rx, y: ry, z: 0 };
  const up = {
    x: right.y * forward.z - right.z * forward.y,
    y: right.z * forward.x - right.x * forward.z,
    z: right.x * forward.y - right.y * forward.x,
  };
  return { position, forward, right, up };
}

function project(cam, x, y, z) {
  const vx = x - cam.position.x;
  const vy = y - cam.position.y;
  const vz = z - cam.position.z;
  const depth = vx * cam.forward.x + vy * cam.forward.y + vz * cam.forward.z;
  if (depth <= 1e-5) return null;
  const a = (vx * cam.right.x + vy * cam.right.y + vz * cam.right.z) / depth;
  const b = (vx * cam.up.x + vy * cam.up.y + vz * cam.up.z) / depth;
  return [cam.px + cam.focal * a, cam.py - cam.focal * b];
}

const PARAMS = [
  'camX', 'camY', 'camZ', 'yaw', 'pitch', 'focal', 'principalX', 'principalY',
  'keyLength', 'freeThrowRadius', 'outerArcReach', 'hoopX', 'rimHeight',
  'boardX', 'boardHalfWidth', 'boardBottomZ', 'boardTopZ',
];
const IX = Object.fromEntries(PARAMS.map((n, i) => [n, i]));

const makeCamera = (p) => ({
  ...basisFrom({ x: p[IX.camX], y: p[IX.camY], z: p[IX.camZ] }, p[IX.yaw], p[IX.pitch]),
  focal: p[IX.focal],
  px: p[IX.principalX],
  py: p[IX.principalY],
});

/**
 * Landmarks weighted by how much the game depends on them. The ground plane is
 * where every shot spot and every footstep lives, so it dominates. The artwork
 * is an illustration, not a photograph: its verticals do not all meet at a
 * single vanishing point, so the backboard is fitted loosely rather than pulling
 * the ground out of alignment to chase it.
 */
function correspondences(p) {
  const w = KEY_HALF_WIDTH;
  const L = p[IX.keyLength];
  return [
    ['keyBaselineFar', [0, w, 0], 3],
    ['keyBaselineNear', [0, -w, 0], 3],
    ['keyFreeThrowFar', [L, w, 0], 3],
    ['keyFreeThrowNear', [L, -w, 0], 3],
    ['freeThrowCross', [L + p[IX.freeThrowRadius], 0, 0], 2],
    ['outerArcCross', [p[IX.outerArcReach], 0, 0], 2],
    ['rimCentre', [p[IX.hoopX], 0, p[IX.rimHeight]], 2],
    ['boardTopFar', [p[IX.boardX], p[IX.boardHalfWidth], p[IX.boardTopZ]], 0.4],
    ['boardTopNear', [p[IX.boardX], -p[IX.boardHalfWidth], p[IX.boardTopZ]], 0.4],
    ['boardBottomFar', [p[IX.boardX], p[IX.boardHalfWidth], p[IX.boardBottomZ]], 0.4],
    ['boardBottomNear', [p[IX.boardX], -p[IX.boardHalfWidth], p[IX.boardBottomZ]], 0.4],
  ];
}

/** Perpendicular distance from a point to the line through a and b. */
function lineDistance(point, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const length = Math.hypot(dx, dy) || 1;
  return Math.abs(dy * (point[0] - a[0]) - dx * (point[1] - a[1])) / length;
}

function residual(p) {
  const cam = makeCamera(p);
  let sum = 0;

  for (const [name, world, weight] of correspondences(p)) {
    const got = project(cam, world[0], world[1], world[2]);
    if (got === null) return 1e12;
    const want = OBSERVED[name];
    sum += weight * ((got[0] - want[0]) ** 2 + (got[1] - want[1]) ** 2);
  }

  // The baseline of the court is the world line x = 0. Two more points measured
  // along it constrain how the far and near ends of the court foreshorten.
  const a = project(cam, 0, KEY_HALF_WIDTH, 0);
  const b = project(cam, 0, -KEY_HALF_WIDTH, 0);
  if (a === null || b === null) return 1e12;
  for (const point of BASELINE_POINTS) sum += 2 * lineDistance(point, a, b) ** 2;

  const prior = (value, want, weight) => weight * (value - want) ** 2;
  // The rim height is the anchor that fixes the vertical scale. It was never
  // measured in real life, so it is a stated assumption, and it is held firmly.
  sum += prior(p[IX.rimHeight], 3.05, 6000);
  sum += prior(p[IX.boardTopZ] - p[IX.boardBottomZ], 1.05, 300);
  sum += prior(p[IX.boardHalfWidth], 0.85, 300);
  sum += prior(p[IX.freeThrowRadius], KEY_HALF_WIDTH, 60);
  sum += prior(p[IX.boardX] - p[IX.hoopX], -0.5, 200);

  if (p[IX.camZ] < 1.5) sum += (1.5 - p[IX.camZ]) ** 2 * 1e6;
  if (p[IX.camY] > -4) sum += (p[IX.camY] + 4) ** 2 * 1e6;
  if (p[IX.keyLength] < 2 || p[IX.keyLength] > 12) sum += 1e7;
  if (p[IX.outerArcReach] < p[IX.keyLength]) sum += 1e7;
  if (p[IX.boardTopZ] < p[IX.boardBottomZ]) sum += 1e7;
  return sum;
}

/* ------------------------------------------------------------------ */
/* Nelder-Mead                                                          */
/* ------------------------------------------------------------------ */

function nelderMead(f, start, step, iterations = 20000) {
  const n = start.length;
  let simplex = [start.slice()];
  for (let i = 0; i < n; i += 1) {
    const point = start.slice();
    point[i] += step[i];
    simplex.push(point);
  }
  let values = simplex.map(f);

  for (let iter = 0; iter < iterations; iter += 1) {
    const order = values.map((v, i) => i).sort((a, b) => values[a] - values[b]);
    simplex = order.map((i) => simplex[i]);
    values = order.map((i) => values[i]);
    if (values[n] - values[0] < 1e-9) break;

    const centroid = new Array(n).fill(0);
    for (let i = 0; i < n; i += 1) for (let j = 0; j < n; j += 1) centroid[j] += simplex[i][j] / n;

    const reflect = centroid.map((c, j) => c + (c - simplex[n][j]));
    const fr = f(reflect);
    if (fr < values[0]) {
      const expand = centroid.map((c, j) => c + 2 * (c - simplex[n][j]));
      const fe = f(expand);
      if (fe < fr) { simplex[n] = expand; values[n] = fe; } else { simplex[n] = reflect; values[n] = fr; }
      continue;
    }
    if (fr < values[n - 1]) { simplex[n] = reflect; values[n] = fr; continue; }

    const contract = centroid.map((c, j) => c + 0.5 * (simplex[n][j] - c));
    const fc = f(contract);
    if (fc < values[n]) { simplex[n] = contract; values[n] = fc; continue; }

    for (let i = 1; i <= n; i += 1) {
      simplex[i] = simplex[i].map((v, j) => simplex[0][j] + 0.5 * (v - simplex[0][j]));
      values[i] = f(simplex[i]);
    }
  }
  const best = values.map((v, i) => i).reduce((a, b) => (values[a] <= values[b] ? a : b));
  return { point: simplex[best], value: values[best] };
}

/* ------------------------------------------------------------------ */

const START = [8.0, -17.0, 9.0, 0.10, -0.42, 1500, 700, 500, 5.0, 1.9, 8.0, 1.4, 3.05, 0.9, 0.85, 2.6, 3.65];
const STEP = [1.5, 3.0, 1.5, 0.08, 0.08, 250, 80, 80, 0.6, 0.3, 0.8, 0.4, 0.15, 0.4, 0.15, 0.2, 0.2];

let best = { point: START, value: residual(START) };
// Nelder-Mead on seventeen parameters settles into a local minimum easily, so
// the simplex is restarted from deterministic perturbations of the best point so
// far. No randomness, so the calibration is reproducible.
for (let restart = 0; restart < 90; restart += 1) {
  const shrink = 1 / (1 + (restart % 10) * 0.5);
  const nudge = best.point.map((v, i) => v + STEP[i] * 0.4 * Math.sin(restart * 2.399 + i * 1.7));
  const from = restart % 3 === 0 ? best.point : nudge;
  const result = nelderMead(residual, from, STEP.map((s) => s * shrink));
  if (result.value < best.value) best = result;
}

const p = best.point;
const cam = makeCamera(p);

const ground = correspondences(p).filter((c) => c[1][2] === 0);
const groundError = ground.reduce((acc, [name, world]) => {
  const got = project(cam, world[0], world[1], world[2]);
  const want = OBSERVED[name];
  return acc + (got[0] - want[0]) ** 2 + (got[1] - want[1]) ** 2;
}, 0);

console.log(`objective (weighted landmarks + priors): ${best.value.toFixed(2)}`);
console.log(`rms error on the ground plane: ${Math.sqrt(groundError / ground.length).toFixed(2)} px`);
console.log('');
PARAMS.forEach((n, i) => console.log(`${n.padEnd(18)} ${p[i].toFixed(4)}`));

console.log('');
console.log('landmark              observed        fitted          error');
for (const [name, world] of correspondences(p)) {
  const got = project(cam, world[0], world[1], world[2]);
  const want = OBSERVED[name];
  console.log(
    `${name.padEnd(20)} (${want[0].toString().padStart(4)},${want[1].toString().padStart(4)})   ` +
      `(${got[0].toFixed(0).padStart(4)},${got[1].toFixed(0).padStart(4)})   ` +
      `${Math.hypot(got[0] - want[0], got[1] - want[1]).toFixed(1).padStart(5)} px`,
  );
}
const a = project(cam, 0, KEY_HALF_WIDTH, 0);
const b = project(cam, 0, -KEY_HALF_WIDTH, 0);
for (const point of BASELINE_POINTS) {
  console.log(`baseline point (${point[0]},${point[1]}) is ${lineDistance(point, a, b).toFixed(1)} px off the fitted baseline`);
}

const target = {
  x: p[IX.camX] + cam.forward.x * 10,
  y: p[IX.camY] + cam.forward.y * 10,
  z: p[IX.camZ] + cam.forward.z * 10,
};
console.log('');
console.log('--- for src/game/config/court.ts ---');
console.log(`position: { x: ${p[IX.camX].toFixed(3)}, y: ${p[IX.camY].toFixed(3)}, z: ${p[IX.camZ].toFixed(3)} }`);
console.log(`target:   { x: ${target.x.toFixed(3)}, y: ${target.y.toFixed(3)}, z: ${target.z.toFixed(3)} }`);
console.log(`focal ${p[IX.focal].toFixed(3)}  principal (${p[IX.principalX].toFixed(3)}, ${p[IX.principalY].toFixed(3)})`);
console.log(`keyLength ${p[IX.keyLength].toFixed(3)}  keyHalfWidth ${KEY_HALF_WIDTH}  freeThrowRadius ${p[IX.freeThrowRadius].toFixed(3)}`);
console.log(`outerArcReach (on the key axis) ${p[IX.outerArcReach].toFixed(3)}`);
console.log(`hoop ground (${p[IX.hoopX].toFixed(3)}, 0)  rimHeight ${p[IX.rimHeight].toFixed(3)}`);
console.log(`board x ${p[IX.boardX].toFixed(3)}  halfWidth ${p[IX.boardHalfWidth].toFixed(3)}  z ${p[IX.boardBottomZ].toFixed(3)}..${p[IX.boardTopZ].toFixed(3)}`);

/* ------------------------------------------------------------------ */
/* Where the painted numbers actually are, in world coordinates        */
/* ------------------------------------------------------------------ */

/** Inverse projection onto the ground plane, z = 0. */
function groundFromScreen(c, sx, sy) {
  const a = (sx - c.px) / c.focal;
  const b = (c.py - sy) / c.focal;
  const dir = {
    x: c.right.x * a + c.up.x * b + c.forward.x,
    y: c.right.y * a + c.up.y * b + c.forward.y,
    z: c.right.z * a + c.up.z * b + c.forward.z,
  };
  if (dir.z >= -1e-9) return null;
  const t = -c.position.z / dir.z;
  return [c.position.x + dir.x * t, c.position.y + dir.y * t];
}

// Centres of the seven numbers painted on the grass, measured on 6x crops.
// The owner of the court confirmed the numbers ARE the places you shoot from,
// so the centre of each glyph is taken as the mark itself.
const PAINTED_NUMBERS = [
  [2, 285, 537],
  [3, 330, 406],
  [4, 131, 726],
  [5, 676, 555],
  [6, 808, 781],
  [7, 819, 400],
  [8, 1242, 600],
];

console.log('');
console.log('--- the seven marks, in world metres ---');
console.log('pts   screen        world (x, y)     distance to rim');
const spots = [];
for (const [points, sx, sy] of PAINTED_NUMBERS) {
  const world = groundFromScreen(cam, sx, sy);
  const distance = Math.hypot(world[0] - p[IX.hoopX], world[1]);
  spots.push({ points, x: world[0], y: world[1], distance });
  console.log(
    `${String(points).padStart(3)}   (${String(sx).padStart(4)},${String(sy).padStart(3)})   ` +
      `(${world[0].toFixed(2).padStart(6)}, ${world[1].toFixed(2).padStart(6)})   ${distance.toFixed(2)} m`,
  );
}

console.log('');
console.log('--- paste into SHOT_SPOTS ---');
for (const s of spots) {
  console.log(`  { id: 'p${s.points}', points: ${s.points}, x: ${s.x.toFixed(2)}, y: ${s.y.toFixed(2)}, tolerance: 0.95, description: '' },`);
}
