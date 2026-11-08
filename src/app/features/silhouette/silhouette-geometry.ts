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

type Point = readonly [x: number, y: number];

/** A point of an outline on the right body half. */
interface OutlinePoint {
  readonly x: number;
  readonly y: number;
  readonly zone: Zone;
  /** Keeps a sharp angle instead of a smooth curve — the soles and the crotch. */
  readonly corner?: boolean;
  /**
   * On the inside of the leg: moves towards the centre line when the zone gets wider, so
   * that the leg itself widens instead of moving outwards.
   */
  readonly inner?: boolean;
}

function point(
  x: number,
  y: number,
  zone: Zone,
  flags: Pick<OutlinePoint, 'corner' | 'inner'> = {},
): OutlinePoint {
  return { x, y, zone, ...flags };
}

/**
 * Right half of head, trunk and leg, from the top of the head down the outside of the
 * leg, across the sole and up the inside of the leg to the crotch.
 */
const RIGHT_HALF: readonly OutlinePoint[] = [
  point(160, 8, 'head'),
  point(176, 12, 'head'),
  point(185, 27, 'head'),
  point(187, 46, 'head'),
  point(183, 65, 'head'),
  point(176, 77, 'head'),
  point(172, 86, 'neck'),
  point(171, 97, 'neck'),
  point(184, 104, 'shoulder'),
  point(199, 112, 'shoulder'),
  point(214, 122, 'shoulder'),
  point(216, 142, 'chest'),
  point(213, 160, 'chest'),
  point(212, 180, 'chest'),
  point(204, 200, 'waist'),
  point(200, 218, 'waist'),
  point(206, 238, 'waist'),
  point(212, 258, 'hip'),
  point(211, 278, 'hip'),
  point(217, 303, 'hip'),
  point(211, 351, 'thigh'),
  point(202, 405, 'thigh'),
  point(201, 441, 'lowerLeg'),
  point(191, 493, 'lowerLeg'),
  point(186, 525, 'lowerLeg'),
  point(190, 538, 'lowerLeg'),
  point(194, 548, 'lowerLeg', { corner: true }),
  point(162, 548, 'lowerLeg', { corner: true, inner: true }),
  point(166, 523, 'lowerLeg', { inner: true }),
  point(167, 491, 'lowerLeg', { inner: true }),
  point(165, 439, 'lowerLeg', { inner: true }),
  point(168, 403, 'thigh', { inner: true }),
  point(165, 349, 'thigh', { inner: true }),
  point(163, 301, 'thigh', { inner: true }),
  point(160, 282, 'thigh', { corner: true }),
];

/**
 * Outline of the right arm including the hand, as one closed shape. The arm hangs from
 * the shoulder and the hand rests beside the hip, so each part follows the width of the
 * trunk next to it.
 */
const RIGHT_ARM: readonly OutlinePoint[] = [
  point(210.5, 115, 'shoulder'),
  point(231, 132.5, 'shoulder'),
  point(231, 183.5, 'shoulder'),
  point(238, 219, 'waist'),
  point(245, 253.5, 'waist'),
  point(248, 286.5, 'hip'),
  point(256, 304, 'hip'),
  point(255.5, 321, 'hip'),
  point(247, 331.5, 'hip'),
  point(236.5, 323, 'hip'),
  point(232, 308, 'hip'),
  point(232, 289.5, 'hip'),
  point(223, 258.5, 'waist'),
  point(214, 225, 'waist'),
  point(201, 188.5, 'shoulder'),
  point(193, 135.5, 'shoulder'),
];

/**
 * How much wider (+) or narrower (−) each region is than the neutral form, in grid units
 * per body side. Points on the centre line stay where they are; inner leg points move
 * half as far, towards the centre.
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
  const widen = (p: OutlinePoint): OutlinePoint => {
    if (p.x === CENTER_X) {
      return p;
    }
    const shift = p.inner ? -change[p.zone] / 2 : change[p.zone];
    return { ...p, x: p.x + Math.sign(p.x - CENTER_X) * shift };
  };

  const rightHalf = RIGHT_HALF.map(widen);
  // The left half runs back up, so the loop is closed without repeating the points that
  // lie on the centre line (top of the head and crotch).
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
  const bothSides = (line: readonly OutlinePoint[]) => [openPath(line), openPath(line.map(mirror))];

  if (view === 'FRONT') {
    const collarbone = [
      point(164, 106, 'shoulder'),
      point(182, 106, 'shoulder'),
      point(200 + shoulder, 114, 'shoulder'),
    ];
    const navel = [0, 90, 180, 270].map((degrees) => {
      const angle = (degrees * Math.PI) / 180;
      return point(CENTER_X + 3 * Math.cos(angle), 226 + 3 * Math.sin(angle), 'waist');
    });
    return [...bothSides(collarbone), closedPath(navel)];
  }

  const spine = [point(CENTER_X, 100, 'chest'), point(CENTER_X, 268, 'waist')];
  const shoulderBlade = [
    point(176 + shoulder / 2, 128, 'shoulder'),
    point(188 + shoulder * 0.8, 135, 'shoulder'),
    point(190 + shoulder * 0.8, 151, 'shoulder'),
    point(180 + shoulder / 2, 170, 'shoulder'),
  ];
  const glutealFold = [point(162, 300, 'hip'), point(184, 306, 'hip'), point(206, 300, 'hip')];
  return [openPath(spine), ...bothSides(shoulderBlade), ...bothSides(glutealFold)];
}

function mirror(p: OutlinePoint): OutlinePoint {
  return { ...p, x: 2 * CENTER_X - p.x };
}

/**
 * Smooth closed path through the points (Catmull-Rom spline as cubic Béziers). A point
 * marked as corner keeps a sharp angle.
 */
function closedPath(points: readonly OutlinePoint[]): string {
  const at = (index: number) => points[(index + points.length) % points.length];
  const segments = points.map((_, i) => curve(at(i - 1), at(i), at(i + 1), at(i + 2)));
  return `M ${coords([points[0].x, points[0].y])} ${segments.join(' ')} Z`;
}

/** Smooth open path through the points; it starts and ends without a bend. */
function openPath(points: readonly OutlinePoint[]): string {
  const at = (index: number) => points[Math.min(Math.max(index, 0), points.length - 1)];
  const segments = points.slice(1).map((_, i) => curve(at(i - 1), at(i), at(i + 1), at(i + 2)));
  return `M ${coords([points[0].x, points[0].y])} ${segments.join(' ')}`;
}

/** Cubic Bézier from p1 to p2; the neighbours p0 and p3 set the tangents. */
function curve(p0: OutlinePoint, p1: OutlinePoint, p2: OutlinePoint, p3: OutlinePoint): string {
  const c1: Point = p1.corner ? [p1.x, p1.y] : [p1.x + (p2.x - p0.x) / 6, p1.y + (p2.y - p0.y) / 6];
  const c2: Point = p2.corner ? [p2.x, p2.y] : [p2.x - (p3.x - p1.x) / 6, p2.y - (p3.y - p1.y) / 6];
  return `C ${coords(c1)}, ${coords(c2)}, ${coords([p2.x, p2.y])}`;
}

function coords([x, y]: Point): string {
  return `${round(x)} ${round(y)}`;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
