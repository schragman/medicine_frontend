import { BodyForm } from '../../core/model/profile';

/**
 * Geometry of the body silhouette (US-04).
 *
 * Origin and licence (NFR-6): drawn for Medicin from scratch — no third-party asset, no
 * licence restrictions. It is a schematic outline, not a validated anatomical template;
 * licensed anatomy SVGs (open point O-3) can replace this file without touching the
 * component, as long as they provide the same shapes.
 *
 * All coordinates live on a 320 × 560 grid with the body's centre line at x = 160. The
 * figure is 540 units tall; the head takes 1/7.5 of that and the crotch sits at
 * mid-height.
 */

export const VIEW_BOX = { width: 320, height: 560 } as const;

const CENTER_X = VIEW_BOX.width / 2;

export type BodyView = 'FRONT' | 'BACK';

export const BODY_VIEWS: readonly BodyView[] = ['FRONT', 'BACK'];

/** German labels — the UI language is German (NFR-1). */
export const BODY_VIEW_LABELS: Readonly<Record<BodyView, string>> = {
  FRONT: 'Vorderseite',
  BACK: 'Rückseite',
};

/** Body regions whose width depends on the body form. */
type Zone = 'head' | 'neck' | 'shoulder' | 'chest' | 'waist' | 'hip' | 'thigh' | 'lowerLeg';

/** A point of the right body half: [x, y, zone, sharp corner?]. */
type OutlinePoint = readonly [x: number, y: number, zone: Zone, corner?: boolean];

/**
 * Right half of head, trunk and leg, from the top of the head down the outside of the
 * leg, across the sole and up the inside of the leg to the crotch.
 */
const RIGHT_HALF: readonly OutlinePoint[] = [
  [160, 8, 'head'],
  [176, 12, 'head'],
  [185, 27, 'head'],
  [187, 46, 'head'],
  [183, 65, 'head'],
  [176, 77, 'head'],
  [172, 86, 'neck'],
  [171, 97, 'neck'],
  [184, 104, 'shoulder'],
  [199, 112, 'shoulder'],
  [214, 122, 'shoulder'],
  [216, 142, 'chest'],
  [213, 160, 'chest'],
  [212, 180, 'chest'],
  [204, 200, 'waist'],
  [200, 218, 'waist'],
  [206, 238, 'waist'],
  [212, 258, 'hip'],
  [211, 278, 'hip'],
  [217, 303, 'hip'],
  [211, 351, 'thigh'],
  [202, 405, 'thigh'],
  [201, 441, 'lowerLeg'],
  [191, 493, 'lowerLeg'],
  [186, 525, 'lowerLeg'],
  [190, 538, 'lowerLeg'],
  [194, 548, 'lowerLeg', true],
  [162, 548, 'lowerLeg', true],
  [166, 523, 'lowerLeg'],
  [167, 491, 'lowerLeg'],
  [165, 439, 'lowerLeg'],
  [168, 403, 'thigh'],
  [165, 349, 'thigh'],
  [163, 301, 'thigh'],
  [160, 282, 'thigh', true],
];

/** Outline of the right arm including the hand, as one closed shape. */
const RIGHT_ARM: readonly OutlinePoint[] = [
  [210.5, 115, 'shoulder'],
  [231, 132.5, 'shoulder'],
  [231, 183.5, 'shoulder'],
  [238, 219, 'shoulder'],
  [245, 253.5, 'shoulder'],
  [248, 286.5, 'shoulder'],
  [256, 304, 'shoulder'],
  [255.5, 321, 'shoulder'],
  [247, 331.5, 'shoulder'],
  [236.5, 323, 'shoulder'],
  [232, 308, 'shoulder'],
  [232, 289.5, 'shoulder'],
  [223, 258.5, 'shoulder'],
  [214, 225, 'shoulder'],
  [201, 188.5, 'shoulder'],
  [193, 135.5, 'shoulder'],
];

/**
 * How much wider (+) or narrower (−) each region is than the neutral form, in grid
 * units per body side. Points on the centre line stay where they are.
 */
const WIDTH_CHANGE: Readonly<Record<BodyForm, Readonly<Record<Zone, number>>>> = {
  NEUTRAL: { head: 0, neck: 0, shoulder: 0, chest: 0, waist: 0, hip: 0, thigh: 0, lowerLeg: 0 },
  FEMALE: { head: -1, neck: -1, shoulder: -4, chest: -2, waist: -2, hip: 5, thigh: 3, lowerLeg: 0 },
  MALE: { head: 1, neck: 2, shoulder: 7, chest: 4, waist: 1, hip: -3, thigh: 0, lowerLeg: 1 },
};

export interface SilhouetteShapes {
  /** Head, trunk and legs as one closed path. */
  readonly body: string;
  readonly rightArm: string;
  readonly leftArm: string;
}

/** The silhouette for a body form. The outline is the same seen from front and back. */
export function silhouetteShapes(form: BodyForm): SilhouetteShapes {
  const change = WIDTH_CHANGE[form];
  const widen = ([x, y, zone, corner]: OutlinePoint): OutlinePoint => {
    const offset = x - CENTER_X;
    return offset === 0
      ? [x, y, zone, corner]
      : [x + Math.sign(offset) * change[zone], y, zone, corner];
  };

  const rightHalf = RIGHT_HALF.map(widen);
  // The left half runs back up, so the loop is closed without repeating the points
  // that lie on the centre line (top of the head and crotch).
  const leftHalf = rightHalf.slice(1, -1).reverse().map(mirror);

  const rightArm = RIGHT_ARM.map(widen);
  return {
    body: closedPath([...rightHalf, ...leftHalf]),
    rightArm: closedPath(rightArm),
    leftArm: closedPath(rightArm.map(mirror)),
  };
}

/**
 * Thin orientation lines that tell front and back apart: collarbones and navel at the
 * front, spine, shoulder blades and gluteal fold at the back.
 */
export function viewDetails(form: BodyForm, view: BodyView): readonly string[] {
  const shoulder = WIDTH_CHANGE[form].shoulder;
  if (view === 'FRONT') {
    const collarbone = `M 164 106 C 176 104, 190 108, ${200 + shoulder} 114`;
    return [
      collarbone,
      mirrorPath(collarbone),
      // navel
      'M 160 226 m -3 0 a 3 3 0 1 0 6 0 a 3 3 0 1 0 -6 0',
    ];
  }
  const shoulderBlade = `M ${176 + shoulder / 2} 128 C ${192 + shoulder} 130, ${196 + shoulder} 150, ${180 + shoulder / 2} 170`;
  const glutealFold = 'M 162 300 C 172 306, 190 307, 206 300';
  return [
    // spine
    'M 160 100 L 160 268',
    shoulderBlade,
    mirrorPath(shoulderBlade),
    glutealFold,
    mirrorPath(glutealFold),
  ];
}

function mirror([x, y, zone, corner]: OutlinePoint): OutlinePoint {
  return [2 * CENTER_X - x, y, zone, corner];
}

/** Mirrors a path made of absolute M, C and L commands at the centre line. */
function mirrorPath(path: string): string {
  let isX = true;
  return path.replace(/-?\d+(\.\d+)?/g, (value) => {
    const mirrored = isX ? String(round(2 * CENTER_X - Number(value))) : value;
    isX = !isX;
    return mirrored;
  });
}

/**
 * Smooth closed path through the points (Catmull-Rom spline as cubic Béziers). A point
 * marked as corner keeps a sharp angle — the soles and the crotch.
 */
function closedPath(points: readonly OutlinePoint[]): string {
  const at = (index: number) => points[(index + points.length) % points.length];
  const segments = points.map((_, i) => {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    const c1 = p1[3] ? p1 : [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = p2[3] ? p2 : [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    return `C ${coords(c1)}, ${coords(c2)}, ${coords(p2)}`;
  });
  return `M ${coords(points[0])} ${segments.join(' ')} Z`;
}

function coords(point: readonly unknown[]): string {
  return `${round(point[0] as number)} ${round(point[1] as number)}`;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
