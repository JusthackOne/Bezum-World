import { randomInt } from 'node:crypto';

import {
  SLOT_CHANCE_SCALE,
  SLOT_PAYTABLE,
  type SlotPaytableEntry,
  type SlotSymbolId,
} from './slots.constants';

export interface SlotOutcome {
  result: [SlotSymbolId, SlotSymbolId, SlotSymbolId];
  payoutMultiplier: number;
}

const WINNING_ENTRIES = [...SLOT_PAYTABLE].reverse();

export function resolveWinningEntry(roll: number): SlotPaytableEntry | null {
  if (!Number.isInteger(roll) || roll < 0 || roll >= SLOT_CHANCE_SCALE) {
    throw new RangeError(`Slot roll must be an integer between 0 and ${SLOT_CHANCE_SCALE - 1}`);
  }

  let upperBound = 0;

  for (const entry of WINNING_ENTRIES) {
    upperBound += entry.chanceBps;
    if (roll < upperBound) {
      return entry;
    }
  }

  return null;
}

export function generateSlotOutcome(): SlotOutcome {
  const winningEntry = resolveWinningEntry(randomInt(SLOT_CHANCE_SCALE));

  if (winningEntry) {
    return {
      result: [winningEntry.id, winningEntry.id, winningEntry.id],
      payoutMultiplier: winningEntry.payoutMultiplier,
    };
  }

  return {
    result: generateLosingResult(),
    payoutMultiplier: 0,
  };
}

function generateLosingResult(): [SlotSymbolId, SlotSymbolId, SlotSymbolId] {
  const symbolIds = SLOT_PAYTABLE.map((entry) => entry.id);

  while (true) {
    const result: [SlotSymbolId, SlotSymbolId, SlotSymbolId] = [
      symbolIds[randomInt(symbolIds.length)]!,
      symbolIds[randomInt(symbolIds.length)]!,
      symbolIds[randomInt(symbolIds.length)]!,
    ];

    if (!(result[0] === result[1] && result[1] === result[2])) {
      return result;
    }
  }
}
