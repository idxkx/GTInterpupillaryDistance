// Basic test to verify Jest and fast-check setup
import fc from 'fast-check';

describe('Testing Framework Setup', () => {
  test('Jest is working correctly', () => {
    expect(true).toBe(true);
  });

  test('fast-check is working correctly', () => {
    fc.assert(
      fc.property(fc.integer(), (n) => {
        return n === n;
      }),
      { numRuns: 100 }
    );
  });

  test('TypeScript types are working', () => {
    const point: { x: number; y: number } = { x: 10, y: 20 };
    expect(point.x).toBe(10);
    expect(point.y).toBe(20);
  });
});
