export function healthMiscarriageModifier(health: number) {
  if (health >= 80) return .5;
  if (health >= 60) return 1;
  if (health >= 40) return 1.5;
  if (health >= 20) return 2;
  return 3;
}

export function miscarriageCountModifier(count: number) {
  if (count >= 4) return .3;
  if (count === 3) return .2;
  if (count === 2) return .1;
  return .05;
}

export function calculateDailyMiscarriageChance(input: {
  totalRate: number;
  gestationDays: number;
  health: number;
  fetusCount: 1 | 2;
  illness: boolean;
  miscarriageCount: number;
}) {
  const totalRate = Math.max(0, Math.min(100, input.totalRate)) / 100;
  if (totalRate <= 0) return 0;
  if (totalRate >= 1) return 1;
  const illnessModifier = input.illness ? 1.25 : 1;
  const fetusModifier = input.fetusCount === 2 ? 1.5 : 1;
  const adjustedTotal = Math.min(1, totalRate * healthMiscarriageModifier(input.health) * illnessModifier * fetusModifier);
  const days = Math.max(1, input.gestationDays);
  return Math.min(1, 1 - Math.pow(1 - adjustedTotal, 1 / days));
}

export function rollFetusCount(twinRate: number, roll: number): 1 | 2 {
  return roll < Math.max(0, Math.min(100, twinRate)) / 100 ? 2 : 1;
}

export function shouldBecomeInfertile(input: { baseRate: number; miscarriageCount: number; health: number; roll: number }) {
  const configured = Math.max(0, Math.min(100, input.baseRate)) / 100;
  const countRate = miscarriageCountModifier(input.miscarriageCount);
  const healthModifier = input.health < 40 ? 2 : input.health < 60 ? 1.5 : 1;
  return input.roll < Math.min(1, Math.max(configured, countRate) * healthModifier);
}
