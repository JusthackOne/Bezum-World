export const CIVILIZATION_ATTRIBUTE_KEYS = [
  'strength',
  'charisma',
  'endurance',
  'intelligence',
] as const;

export type CivilizationAttributeKey = (typeof CIVILIZATION_ATTRIBUTE_KEYS)[number];

export type CivilizationAttributeRecord<T> = Record<CivilizationAttributeKey, T>;
