export const ITEM_SALE_SOURCE_VALUES = ['system', 'all', 'players'] as const;

export type ItemSaleSource = (typeof ITEM_SALE_SOURCE_VALUES)[number];
