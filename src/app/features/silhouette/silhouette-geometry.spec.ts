import { BODY_FORMS, BodyForm } from '../../core/model/profile';
import { VIEW_BOX, silhouetteShapes, viewDetails } from './silhouette-geometry';

/** All x/y pairs of a path made of absolute M, C and L commands. */
function points(path: string): Array<[number, number]> {
  const numbers = path.match(/-?\d+(\.\d+)?/g)!.map(Number);
  const result: Array<[number, number]> = [];
  for (let i = 0; i < numbers.length; i += 2) {
    result.push([numbers[i], numbers[i + 1]]);
  }
  return result;
}

/** x of the outline point at this height on the right body half (x > 160). */
function rightX(path: string, y: number): number {
  return Math.max(
    ...points(path)
      .filter(([px, py]) => py === y && px > 160)
      .map(([x]) => x),
  );
}

/** Coordinates are rounded to one decimal, so mirrored values may differ by that. */
const ROUNDING = 0.1 + 1e-9;

function widthAt(form: BodyForm, y: number): number {
  const xs = points(silhouetteShapes(form).body)
    .filter(([, py]) => py === y)
    .map(([x]) => x);
  return Math.max(...xs) - Math.min(...xs);
}

describe('silhouetteShapes', () => {
  it.each(BODY_FORMS)('draws closed shapes inside the view box (%s)', (form) => {
    const shapes = silhouetteShapes(form);

    for (const path of [shapes.body, shapes.rightArm, shapes.leftArm]) {
      expect(path).toMatch(/^M .* Z$/);
      for (const [x, y] of points(path)) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(VIEW_BOX.width);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(VIEW_BOX.height);
      }
    }
  });

  it.each(BODY_FORMS)('draws the arms as mirror images (%s)', (form) => {
    const shapes = silhouetteShapes(form);
    const right = points(shapes.rightArm);
    const left = points(shapes.leftArm);

    expect(left).toHaveLength(right.length);
    left.forEach(([x, y], i) => {
      expect(Math.abs(x - (VIEW_BOX.width - right[i][0]))).toBeLessThanOrEqual(ROUNDING);
      expect(y).toBe(right[i][1]);
    });
  });

  it.each(BODY_FORMS)('draws the body symmetric about the centre line (%s)', (form) => {
    const body = points(silhouetteShapes(form).body);

    for (const [x, y] of body) {
      const mirrored = body.some(
        ([mx, my]) => my === y && Math.abs(mx - (VIEW_BOX.width - x)) <= ROUNDING,
      );
      expect(mirrored, `no mirror image of ${x} ${y}`).toBe(true);
    }
  });

  it('keeps the figure 540 units tall', () => {
    const ys = points(silhouetteShapes('NEUTRAL').body).map(([, y]) => y);

    expect(Math.max(...ys) - Math.min(...ys)).toBe(540);
  });

  it('shapes the body form: broader shoulders for male, wider hips and narrower waist for female (AC3)', () => {
    const shoulders = 122;
    const waist = 218;
    const hips = 303;

    expect(widthAt('MALE', shoulders)).toBeGreaterThan(widthAt('NEUTRAL', shoulders));
    expect(widthAt('FEMALE', shoulders)).toBeLessThan(widthAt('NEUTRAL', shoulders));
    expect(widthAt('FEMALE', hips)).toBeGreaterThan(widthAt('NEUTRAL', hips));
    expect(widthAt('FEMALE', waist)).toBeLessThan(widthAt('NEUTRAL', waist));
    expect(widthAt('FEMALE', hips) / widthAt('FEMALE', shoulders)).toBeGreaterThan(
      widthAt('MALE', hips) / widthAt('MALE', shoulders),
    );
  });
});

describe('legs and arms per body form', () => {
  const outerThigh = 351;
  const innerThigh = 349;

  function thigh(form: BodyForm) {
    const body = silhouetteShapes(form).body;
    const inner = rightX(body, innerThigh);
    return { width: rightX(body, outerThigh) - inner, gap: inner - 160 };
  }

  it('makes the thighs wider instead of moving the legs apart (AC3)', () => {
    expect(thigh('FEMALE').width).toBeGreaterThan(thigh('NEUTRAL').width);
    expect(thigh('FEMALE').gap).toBeLessThanOrEqual(thigh('NEUTRAL').gap);
  });

  it.each(BODY_FORMS)('keeps the hand clear of the hip (%s)', (form) => {
    const shapes = silhouetteShapes(form);
    const handInside = 308;
    const hip = 303;
    const neutralGap =
      rightX(silhouetteShapes('NEUTRAL').rightArm, handInside) -
      rightX(silhouetteShapes('NEUTRAL').body, hip);

    // The inner edge of the hand is the smaller of the two arm points at this height.
    const handX = Math.min(
      ...points(shapes.rightArm)
        .filter(([, y]) => y === handInside)
        .map(([x]) => x),
    );
    expect(handX - rightX(shapes.body, hip)).toBeGreaterThanOrEqual(neutralGap - 1);
  });
});

describe('viewDetails', () => {
  it('draws different orientation lines for front and back (AC2)', () => {
    expect(viewDetails('NEUTRAL', 'FRONT')).not.toEqual(viewDetails('NEUTRAL', 'BACK'));
  });
});
