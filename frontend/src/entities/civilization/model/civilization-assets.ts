export const CIVILIZATION_ATTRIBUTE_KEYS = [
  "strength",
  "charisma",
  "endurance",
  "intelligence",
] as const;

export type CivilizationAttributeKey = (typeof CIVILIZATION_ATTRIBUTE_KEYS)[number];

export type CivilizationAssetKey =
  | "townHall"
  | "goldBuilding"
  | `attributeBuilding.${CivilizationAttributeKey}`
  | "tower.active"
  | "tower.underConstruction"
  | "tower.destroyed"
  | "item.catapult"
  | "item.repairKit"
  | "spawnPoint"
  | "mountain"
  | "resource.neutral";

export interface CivilizationAssetDefinition {
  path: string;
  alt: string;
  tintable: boolean;
}

export const CIVILIZATION_ASSETS = {
  townHall: {
    path: "/assets/civilization/town-hall.webp",
    alt: "Town hall",
    tintable: true,
  },
  goldBuilding: {
    path: "/assets/civilization/gold-building.webp",
    alt: "Gold-producing building",
    tintable: true,
  },
  "attributeBuilding.strength": {
    path: "/assets/civilization/attribute-strength.webp",
    alt: "Strength-producing building",
    tintable: true,
  },
  "attributeBuilding.charisma": {
    path: "/assets/civilization/attribute-charisma.webp",
    alt: "Charisma-producing building",
    tintable: true,
  },
  "attributeBuilding.endurance": {
    path: "/assets/civilization/attribute-endurance.webp",
    alt: "Endurance-producing building",
    tintable: true,
  },
  "attributeBuilding.intelligence": {
    path: "/assets/civilization/attribute-intelligence.webp",
    alt: "Intelligence-producing building",
    tintable: true,
  },
  "tower.active": {
    path: "/assets/civilization/tower-active.webp",
    alt: "Active defensive tower",
    tintable: true,
  },
  "tower.underConstruction": {
    path: "/assets/civilization/tower-under-construction.webp",
    alt: "Defensive tower under construction",
    tintable: true,
  },
  "tower.destroyed": {
    path: "/assets/civilization/tower-destroyed.webp",
    alt: "Destroyed repairable tower",
    tintable: true,
  },
  "item.catapult": {
    path: "/assets/civilization/catapult.webp",
    alt: "Catapult",
    tintable: false,
  },
  "item.repairKit": {
    path: "/assets/civilization/repair-kit.webp",
    alt: "Tower repair kit",
    tintable: false,
  },
  spawnPoint: {
    path: "/assets/civilization/spawn-point.webp",
    alt: "Team spawn point",
    tintable: true,
  },
  mountain: {
    path: "/assets/civilization/mountain.webp",
    alt: "Impassable mountain",
    tintable: false,
  },
  "resource.neutral": {
    path: "/assets/civilization/resource-neutral.webp",
    alt: "Neutral resource control marker",
    tintable: true,
  },
} as const satisfies Record<CivilizationAssetKey, CivilizationAssetDefinition>;
