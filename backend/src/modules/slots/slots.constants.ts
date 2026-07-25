export const SLOT_BET = 5;
export const SLOT_CHANCE_SCALE = 10_000;
export const SLOT_RTP_BPS = 9_700;

export type SlotSymbolId = 'coin' | 'potion' | 'sword' | 'crystal' | 'crown' | 'dragonEye';

export interface SlotPaytableEntry {
  id: SlotSymbolId;
  label: string;
  shortLabel: string;
  payoutMultiplier: number;
  chanceBps: number;
}

export const SLOT_PAYTABLE: readonly SlotPaytableEntry[] = [
  {
    id: 'coin',
    label: 'Star Coin',
    shortLabel: 'COIN',
    payoutMultiplier: 2,
    chanceBps: 1_400,
  },
  {
    id: 'potion',
    label: 'Heart Elixir',
    shortLabel: 'ELIXIR',
    payoutMultiplier: 3,
    chanceBps: 700,
  },
  {
    id: 'sword',
    label: 'Hero Blade',
    shortLabel: 'BLADE',
    payoutMultiplier: 6,
    chanceBps: 300,
  },
  {
    id: 'crystal',
    label: 'Mana Crystal',
    shortLabel: 'CRYSTAL',
    payoutMultiplier: 10,
    chanceBps: 150,
  },
  {
    id: 'crown',
    label: 'Royal Crown',
    shortLabel: 'CROWN',
    payoutMultiplier: 25,
    chanceBps: 40,
  },
  {
    id: 'dragonEye',
    label: 'Dragon Eye',
    shortLabel: 'JACKPOT',
    payoutMultiplier: 100,
    chanceBps: 5,
  },
];

export const SLOT_HIT_RATE_BPS = SLOT_PAYTABLE.reduce((total, entry) => total + entry.chanceBps, 0);
