/** Inverse-projects screen points of the plate to world metres, using the fitted camera. */
const CAM = {
  position: { x: 4.167, y: -10.135, z: 6.031 },
  target: { x: 3.881, y: -0.606, z: 3.010 },
  focal: 1105.239,
  px: 565.717,
  py: 293.956,
};

const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const norm = (a) => { const l = Math.hypot(a.x, a.y, a.z); return { x: a.x / l, y: a.y / l, z: a.z / l }; };
const cross = (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;

const forward = norm(sub(CAM.target, CAM.position));
const right = norm(cross(forward, { x: 0, y: 0, z: 1 }));
const up = cross(right, forward);

function project(x, y, z) {
  const v = sub({ x, y, z }, CAM.position);
  const d = dot(v, forward);
  return [CAM.px + CAM.focal * (dot(v, right) / d), CAM.py - CAM.focal * (dot(v, up) / d)];
}

/** Ray through a screen pixel intersected with the horizontal plane z = height. */
function atHeight(sx, sy, height) {
  const a = (sx - CAM.px) / CAM.focal;
  const b = (CAM.py - sy) / CAM.focal;
  const dir = {
    x: right.x * a + up.x * b + forward.x,
    y: right.y * a + up.y * b + forward.y,
    z: right.z * a + up.z * b + forward.z,
  };
  const t = (height - CAM.position.z) / dir.z;
  if (t <= 0) return null;
  return [CAM.position.x + dir.x * t, CAM.position.y + dir.y * t];
}

const POINTS = [
  ['grass right-front', 1430, 760, 0],
  ['grass right-back', 1430, 470, 0],
  ['grass left-front', 60, 800, 0],
  ['back bushes centre', 700, 400, 0],
  ['back bushes right', 1100, 430, 0],
  ['kid feet', 1213, 500, 0],
  ['dog feet', 1290, 490, 0],
  ['table foot', 1430, 545, 0],
  ['crate foot', 1450, 900, 0],
  ['watering can', 95, 960, 0],
  ['football', 145, 950, 0],
  ['wall top @x=250', 250, 799, 0.5],
  ['wall top @x=800', 800, 823, 0.5],
  ['wall top @x=1300', 1300, 844, 0.5],
  ['left wall top @y=400', 220, 392, 0.3],
  ['left wall top @y=470', 100, 466, 0.3],
];

console.log('label                    screen        world (x, y)');
for (const [label, sx, sy, h] of POINTS) {
  const w = atHeight(sx, sy, h);
  console.log(`${label.padEnd(22)} (${String(sx).padStart(4)},${String(sy).padStart(3)})  ` +
    (w ? `(${w[0].toFixed(2).padStart(7)}, ${w[1].toFixed(2).padStart(7)})` : 'behind camera') + (h ? `  at z=${h}` : ''));
}

console.log('');
console.log('--- sanity: project a 1.75 m person at several spots ---');
for (const [label, x, y] of [['mark 2', 0.86, 0.22], ['mark 5', 5.01, -0.02], ['mark 8', 10.40, -0.68], ['mark 7', 7.25, 4.13], ['mark 6', 5.79, -3.23]]) {
  const feet = project(x, y, 0);
  const head = project(x, y, 1.75);
  console.log(`${label.padEnd(8)} feet (${feet[0].toFixed(0)},${feet[1].toFixed(0)})  height ${(feet[1] - head[1]).toFixed(0)} px`);
}

console.log('');
console.log('--- cross-check against the adults drawn in the reference ---');
console.log('Feet and head read off chubol-nba-jam.png. If the drawn figures are much');
console.log('taller than the projection predicts, the assumed rim height is too low.');
const ADULTS = [
  ['grey tank', 450, 640, 395],
  ['white/sun', 800, 525, 310],
  ['red tank', 975, 665, 405],
  ['black tank', 1120, 835, 530],
  ['boy (River)', 1213, 500, 330],
];
for (const [label, sx, feetY, headY] of ADULTS) {
  const ground = atHeight(sx, feetY, 0);
  const drawn = feetY - headY;
  // Height in metres that would put the head exactly where it is drawn.
  let lo = 0.5;
  let hi = 3.0;
  for (let i = 0; i < 40; i += 1) {
    const mid = (lo + hi) / 2;
    if (project(ground[0], ground[1], mid)[1] > headY) lo = mid;
    else hi = mid;
  }
  const predicted = feetY - project(ground[0], ground[1], 1.75)[1];
  console.log(
    `${label.padEnd(12)} ground (${ground[0].toFixed(1).padStart(5)},${ground[1].toFixed(1).padStart(5)})  ` +
      `drawn ${String(drawn).padStart(3)} px  1.75 m would be ${predicted.toFixed(0).padStart(3)} px  ` +
      `=> implied height ${((lo + hi) / 2).toFixed(2)} m`,
  );
}

console.log('');
console.log('--- independent scale check against the walls (the only real measurements given) ---');
console.log('The brief gives the left wall as about 0.30 m and the front wall as about 0.50 m.');
for (const [label, sx, baseY, topY, realHeight] of [
  ['left wall @x=100', 100, 575, 476, 0.30],
  ['left wall @x=160', 160, 505, 434, 0.30],
]) {
  const ground = atHeight(sx, baseY, 0);
  const drawn = baseY - topY;
  let lo = 0.05;
  let hi = 2.0;
  for (let i = 0; i < 40; i += 1) {
    const mid = (lo + hi) / 2;
    if (project(ground[0], ground[1], mid)[1] > topY) lo = mid;
    else hi = mid;
  }
  const implied = (lo + hi) / 2;
  console.log(
    `${label.padEnd(18)} drawn ${String(drawn).padStart(3)} px  => implied ${implied.toFixed(3)} fitted units  ` +
      `=> scale factor ${(realHeight / implied).toFixed(3)} (real metres per fitted unit)`,
  );
}
console.log('');
console.log('For comparison, the four adults imply a scale factor of 1.75 / 2.444 = 0.716.');

console.log('');
console.log('--- how high is the rim, measured in drawn adults? ---');
const RIM_FITTED_HEIGHT = 3.039;
for (const [label, sx, feetY, headY] of [['grey tank', 450, 640, 395], ['red tank', 975, 665, 405]]) {
  const ground = atHeight(sx, feetY, 0);
  const atRim = project(ground[0], ground[1], RIM_FITTED_HEIGHT)[1];
  const drawn = feetY - headY;
  const rimAbove = feetY - atRim;
  console.log(
    `${label.padEnd(12)} drawn height ${String(drawn).padStart(3)} px; the rim height above HIS OWN feet ` +
      `would be ${rimAbove.toFixed(0)} px = ${(rimAbove / drawn).toFixed(2)} x his height`,
  );
}
const hoopGround = project(1.311, 0, 0);
const rimScreen = project(1.311, 0, RIM_FITTED_HEIGHT);
console.log(`hoop: ground (${hoopGround[0].toFixed(0)},${hoopGround[1].toFixed(0)})  rim (${rimScreen[0].toFixed(0)},${rimScreen[1].toFixed(0)})  => ${(hoopGround[1] - rimScreen[1]).toFixed(0)} px tall on screen`);
