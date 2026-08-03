import type { CivilizationAttributeRecord } from './attributes';
import {
  addExactDecimals,
  formatDecimal,
  multiplyDecimals,
  type DecimalLike,
  type ExactDecimal,
} from './decimal';

export interface CivilizationTeamScoreResources {
  gold: DecimalLike;
  attributes: CivilizationAttributeRecord<DecimalLike>;
}

export interface CivilizationScoreWeights extends CivilizationAttributeRecord<DecimalLike> {
  gold: DecimalLike;
}

export function calculateTeamScore(
  resources: CivilizationTeamScoreResources,
  weights: CivilizationScoreWeights,
): string {
  let score: ExactDecimal = multiplyDecimals(resources.gold, weights.gold);

  score = addExactDecimals(
    score,
    multiplyDecimals(resources.attributes.strength, weights.strength),
  );
  score = addExactDecimals(
    score,
    multiplyDecimals(resources.attributes.charisma, weights.charisma),
  );
  score = addExactDecimals(
    score,
    multiplyDecimals(resources.attributes.endurance, weights.endurance),
  );
  score = addExactDecimals(
    score,
    multiplyDecimals(resources.attributes.intelligence, weights.intelligence),
  );

  return formatDecimal(score);
}
