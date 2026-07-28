import { describe, expect, test } from 'bun:test';

import { getPreviousMoscowDayRange } from '../src/modules/notifications/moscow-day';

describe('getPreviousMoscowDayRange', () => {
  test('returns the completed Moscow day at midnight Moscow time', () => {
    const range = getPreviousMoscowDayRange(new Date('2026-07-29T21:00:00.000Z'));

    expect(range).toEqual({
      date: '2026-07-29',
      start: new Date('2026-07-28T21:00:00.000Z'),
      end: new Date('2026-07-29T21:00:00.000Z'),
    });
  });

  test('uses the previous calendar day for an arbitrary trigger time', () => {
    const range = getPreviousMoscowDayRange(new Date('2026-01-01T12:30:00.000Z'));

    expect(range).toEqual({
      date: '2025-12-31',
      start: new Date('2025-12-30T21:00:00.000Z'),
      end: new Date('2025-12-31T21:00:00.000Z'),
    });
  });
});
