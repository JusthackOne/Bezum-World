import { describe, expect, test } from 'bun:test';

import {
  SLOT_CHANCE_SCALE,
  SLOT_HIT_RATE_BPS,
  SLOT_PAYTABLE,
  SLOT_RTP_BPS,
} from '../src/modules/slots/slots.constants';
import { getSlotStatisticChange, resolveWinningEntry } from '../src/modules/slots/slots.utils';

describe('slot paytable', () => {
  test('has the configured 97% RTP', () => {
    const calculatedRtpBps = SLOT_PAYTABLE.reduce(
      (total, entry) => total + entry.chanceBps * entry.payoutMultiplier,
      0,
    );

    expect(calculatedRtpBps).toBe(SLOT_RTP_BPS);
    expect(SLOT_HIT_RATE_BPS).toBe(2_595);
  });

  test('maps every winning roll to the expected symbol', () => {
    const winningRollCounts = new Map<string, number>();

    for (let roll = 0; roll < SLOT_CHANCE_SCALE; roll += 1) {
      const entry = resolveWinningEntry(roll);
      if (entry) {
        winningRollCounts.set(entry.id, (winningRollCounts.get(entry.id) ?? 0) + 1);
      }
    }

    for (const entry of SLOT_PAYTABLE) {
      expect(winningRollCounts.get(entry.id)).toBe(entry.chanceBps);
    }
  });

  test('rejects rolls outside the configured range', () => {
    expect(() => resolveWinningEntry(-1)).toThrow(RangeError);
    expect(() => resolveWinningEntry(SLOT_CHANCE_SCALE)).toThrow(RangeError);
    expect(() => resolveWinningEntry(1.5)).toThrow(RangeError);
  });
});

describe('slot aggregate statistics', () => {
  test('records only net winnings for a profitable spin', () => {
    expect(getSlotStatisticChange(15)).toEqual({ winnings: 15, losses: 0 });
  });

  test('records only the lost stake for a losing spin', () => {
    expect(getSlotStatisticChange(-5)).toEqual({ winnings: 0, losses: 5 });
  });
});
