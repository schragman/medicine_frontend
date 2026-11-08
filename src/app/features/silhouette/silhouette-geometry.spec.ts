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

  it.each(BODY_FORMS)('is symmetric about the centre line (%s)', (form) => {
    const shapes = silhouetteShapes(form);
    const right = points(shapes.rightArm);
    const left = points(shapes.leftArm);

    expect(left).toHaveLength(right.length);
    left.forEach(([x, y], i) => {
      // Coordinates are rounded to one decimal, so mirrored values may differ by that.
      expect(Math.abs(x - (VIEW_BOX.width - right[i][0]))).toBeLessThanOrEqual(0.1 + 1e-9);
      expect(y).toBe(right[i][1]);
    });
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

describe('viewDetails', () => {
  it('draws different orientation lines for front and back (AC2)', () => {
    expect(viewDetails('NEUTRAL', 'FRONT')).not.toEqual(viewDetails('NEUTRAL', 'BACK'));
  });
});
