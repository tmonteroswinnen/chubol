/**
 * Court projection.
 *
 * The scene uses a fixed elevated three-quarter camera. A ground-plane homography
 * alone cannot place the ball at a given height, so the projection is a full
 * pinhole camera: it projects any world point (x, y, z) and therefore resolves the
 * vertical dimension explicitly and consistently with the rim and every vertical.
 *
 * World axes (metres):
 *   +x -> along the court, away from the hoop (screen right)
 *   +y -> depth, towards the cypresses (screen up/away)
 *   +z -> up
 */

export interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export interface Projected {
  /** Horizontal screen position, in logical pixels. */
  readonly x: number;
  /** Vertical screen position, in logical pixels. */
  readonly y: number;
  /** Distance along the camera forward axis, in metres. Used for depth sorting. */
  readonly depth: number;
  /** Logical pixels per world metre at this depth. Used to scale sprites. */
  readonly scale: number;
}

export interface CameraSetup {
  readonly position: Vec3;
  readonly target: Vec3;
}

export interface FramingRect {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

interface Basis {
  right: Vec3;
  up: Vec3;
  forward: Vec3;
}

const sub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
const norm = (a: Vec3): Vec3 => {
  const l = Math.hypot(a.x, a.y, a.z);
  if (l === 0) throw new Error('cannot normalise a zero-length vector');
  return { x: a.x / l, y: a.y / l, z: a.z / l };
};

function buildBasis(camera: CameraSetup): Basis {
  const forward = norm(sub(camera.target, camera.position));
  const worldUp: Vec3 = { x: 0, y: 0, z: 1 };
  const right = norm(cross(forward, worldUp));
  const up = cross(right, forward);
  return { right, up, forward };
}

/**
 * Fixed pinhole projection for the court.
 *
 * The focal length and principal point are solved once so that a set of framing
 * anchors fits inside a target rectangle of the *logical* canvas. The logical
 * canvas never changes size (the Phaser scale manager letterboxes the real
 * canvas), so resizing the browser window cannot move a shot spot in world space.
 */
export class CourtProjection {
  readonly camera: CameraSetup;
  readonly focal: number;
  readonly principalX: number;
  readonly principalY: number;
  private readonly basis: Basis;

  private constructor(camera: CameraSetup, focal: number, principalX: number, principalY: number) {
    this.camera = camera;
    this.basis = buildBasis(camera);
    this.focal = focal;
    this.principalX = principalX;
    this.principalY = principalY;
  }

  /** Solves focal length and principal point so `anchors` fit inside `frame`. */
  static fit(camera: CameraSetup, anchors: readonly Vec3[], frame: FramingRect): CourtProjection {
    if (anchors.length < 2) throw new Error('at least two framing anchors are required');
    const basis = buildBasis(camera);
    let aMin = Infinity;
    let aMax = -Infinity;
    let bMin = Infinity;
    let bMax = -Infinity;

    for (const p of anchors) {
      const v = sub(p, camera.position);
      const depth = dot(v, basis.forward);
      if (depth <= 1e-4) throw new Error('framing anchor sits behind the camera');
      const a = dot(v, basis.right) / depth;
      const b = dot(v, basis.up) / depth;
      if (a < aMin) aMin = a;
      if (a > aMax) aMax = a;
      if (b < bMin) bMin = b;
      if (b > bMax) bMax = b;
    }

    const frameWidth = frame.right - frame.left;
    const frameHeight = frame.bottom - frame.top;
    const spanA = aMax - aMin;
    const spanB = bMax - bMin;
    const focal = Math.min(frameWidth / spanA, frameHeight / spanB);

    const centreX = (frame.left + frame.right) / 2;
    const centreY = (frame.top + frame.bottom) / 2;
    const principalX = centreX - (focal * (aMin + aMax)) / 2;
    const principalY = centreY + (focal * (bMin + bMax)) / 2;

    return new CourtProjection(camera, focal, principalX, principalY);
  }

  /** Builds a projection with an explicit calibration (used by tests and tooling). */
  static explicit(camera: CameraSetup, focal: number, principalX: number, principalY: number): CourtProjection {
    return new CourtProjection(camera, focal, principalX, principalY);
  }

  project(x: number, y: number, z: number): Projected {
    const v = sub({ x, y, z }, this.camera.position);
    const depth = dot(v, this.basis.forward);
    const safeDepth = depth <= 1e-4 ? 1e-4 : depth;
    const a = dot(v, this.basis.right) / safeDepth;
    const b = dot(v, this.basis.up) / safeDepth;
    return {
      x: this.principalX + this.focal * a,
      y: this.principalY - this.focal * b,
      depth: safeDepth,
      scale: this.focal / safeDepth,
    };
  }

  projectPoint(p: Vec3): Projected {
    return this.project(p.x, p.y, p.z);
  }

  /**
   * Inverse projection restricted to the ground plane (z = 0).
   * Returns null when the screen point is at or above the horizon.
   */
  groundFromScreen(screenX: number, screenY: number): Vec2 | null {
    const a = (screenX - this.principalX) / this.focal;
    const b = (this.principalY - screenY) / this.focal;
    const dir: Vec3 = {
      x: this.basis.right.x * a + this.basis.up.x * b + this.basis.forward.x,
      y: this.basis.right.y * a + this.basis.up.y * b + this.basis.forward.y,
      z: this.basis.right.z * a + this.basis.up.z * b + this.basis.forward.z,
    };
    if (dir.z >= -1e-6) return null;
    const t = -this.camera.position.z / dir.z;
    if (t <= 0) return null;
    return { x: this.camera.position.x + dir.x * t, y: this.camera.position.y + dir.y * t };
  }

  /** Screen y of the horizon line, used to place sky and background strips. */
  horizonY(): number {
    const f = this.basis.forward;
    const u = this.basis.up;
    // Direction with z = 0 that stays in the view plane: subtract the vertical
    // component of forward, then read its b coordinate at infinite distance.
    const flat = norm({ x: f.x, y: f.y, z: 0 });
    const depth = dot(flat, f);
    const b = dot(flat, u) / depth;
    return this.principalY - this.focal * b;
  }
}
