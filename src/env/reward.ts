export interface RewardWeights {
  damageDealt: number;
  hpHealed: number;
  enemyFainted: number;
  playerFainted: number;
  waveCleared: number;
  partyLevel: number;
}

export const DEFAULT_WEIGHTS: RewardWeights = {
  damageDealt: 1,
  hpHealed: 1,
  enemyFainted: 50,
  playerFainted: -50,
  waveCleared: 200,
  partyLevel: 10,
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

  const prevPartyLevel = prev.playerParty.reduce((s, p) => s + p.level, 0);
  const nextPartyLevel = next.playerParty.reduce((s, p) => s + p.level, 0);

  const enemyFainted = next.enemyParty.filter((p, i) => p.hp <= 0 && prev.enemyParty[i].hp > 0).length;
  const playerFainted = next.playerParty.filter((p, i) => p.hp <= 0 && prev.playerParty[i].hp > 0).length;

  return {
    damageDealt: prevEnemyHp - nextEnemyHp,
    hpHealed: Math.max(0, nextPlayerHp - prevPlayerHp),
    enemyFainted,
    playerFainted,
    waveCleared: next.wave > prev.wave ? 1 : 0,
    partyLevel: Math.max(0, nextPartyLevel - prevPartyLevel),
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
    comps.hpHealed * weights.hpHealed +
    comps.enemyFainted * weights.enemyFainted +
    comps.playerFainted * weights.playerFainted +
    comps.waveCleared * weights.waveCleared +
    comps.partyLevel * weights.partyLevel
  );
}
