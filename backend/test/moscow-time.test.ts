import { describe, expect, test } from 'bun:test';

import {
  getMoscowDateKey,
  getMoscowDayRange,
  getMoscowIsoWeekRange,
} from '../src/common/time/moscow-time';

describe('Moscow calendar boundaries', () => {
  test('starts a new day at 00:00 Moscow time', () => {
    expect(getMoscowDayRange(new Date('2026-07-29T21:00:00.000Z'))).toEqual({
      start: new Date('2026-07-29T21:00:00.000Z'),
      end: new Date('2026-07-30T21:00:00.000Z'),
    });
  });

  test('keeps the preceding Moscow day before 21:00 UTC', () => {
    expect(getMoscowDayRange(new Date('2026-07-29T20:59:59.999Z'))).toEqual({
      start: new Date('2026-07-28T21:00:00.000Z'),
      end: new Date('2026-07-29T21:00:00.000Z'),
    });
  });

  test('starts an ISO week on Monday at 00:00 Moscow time', () => {
    expect(getMoscowIsoWeekRange(new Date('2026-08-02T21:00:00.000Z'))).toEqual({
      start: new Date('2026-08-02T21:00:00.000Z'),
      end: new Date('2026-08-09T21:00:00.000Z'),
    });
  });

  test('creates a SQL date key from the Moscow calendar date', () => {
    expect(getMoscowDateKey(new Date('2026-07-29T21:00:00.000Z'))).toEqual(
      new Date('2026-07-30T00:00:00.000Z'),
    );
  });
});
