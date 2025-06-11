export interface RewardWeights {
  damageDealt: number;
  damageTaken: number;
  enemyFainted: number;
  playerFainted: number;
  waveCleared: number;
}

export const DEFAULT_WEIGHTS: RewardWeights = {
  damageDealt: 1,
  damageTaken: -1,
  enemyFainted: 50,
  playerFainted: -50,
  waveCleared: 200,
};

import type { SerializedState } from "#app/utils/serialize";

export function getRewardComponents(
  prev: SerializedState,
  next: SerializedState,
) {
  const prevEnemyHp = prev.enemyParty.reduce((s, p) => s + p.hp, 0);
  const nextEnemyHp = next.enemyParty.reduce((s, p) => s + p.hp, 0);
  const prevPlayerHp = prev.playerParty.reduce((s, p) => s + p.hp, 0);
  const nextPlayerHp = next.playerParty.reduce((s, p) => s + p.hp, 0);

  const enemyFainted = next.enemyParty.filter((p, i) => p.hp <= 0 && prev.enemyParty[i].hp > 0).length;
  const playerFainted = next.playerParty.filter((p, i) => p.hp <= 0 && prev.playerParty[i].hp > 0).length;

  return {
    damageDealt: prevEnemyHp - nextEnemyHp,
    damageTaken: prevPlayerHp - nextPlayerHp,
    enemyFainted,
    playerFainted,
    waveCleared: next.wave > prev.wave ? 1 : 0,
  };
}

export function computeStepReward(
  prev: SerializedState,
  next: SerializedState,
  weights: RewardWeights = DEFAULT_WEIGHTS,
): number {
  const comps = getRewardComponents(prev, next);
  return (
    comps.damageDealt * weights.damageDealt +
    comps.damageTaken * weights.damageTaken +
    comps.enemyFainted * weights.enemyFainted +
    comps.playerFainted * weights.playerFainted +
    comps.waveCleared * weights.waveCleared
  );
}
