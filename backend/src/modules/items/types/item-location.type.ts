export const ITEM_LOCATION_VALUES = ['shop', 'inventory'] as const;

export type ItemLocation = (typeof ITEM_LOCATION_VALUES)[number];
