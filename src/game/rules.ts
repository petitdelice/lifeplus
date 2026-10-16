// Pure game rules. Every number here comes from the "Règles du jeu" doc.

export type Rarity = 'commun' | 'rare' | 'epique' | 'legendaire' | 'mythique';
export type Recurrence = 'daily' | 'weekly' | 'monthly';

export const RARITIES: Rarity[] = ['commun', 'rare', 'epique', 'legendaire', 'mythique'];

export const RARITY_GAINS: Record<Rarity, { xp: number; eclats: number }> = {
  commun: { xp: 10, eclats: 5 },
  rare: { xp: 25, eclats: 12 },
  epique: { xp: 60, eclats: 30 },
  legendaire: { xp: 150, eclats: 75 },
  mythique: { xp: 400, eclats: 200 },
};

/** Score = durée (1-5) + flemme (1-5), so 2..10. */
export function rarityFromScore(duration: number, flemme: number): Rarity {
  const score = duration + flemme;
  if (score <= 3) return 'commun';
  if (score <= 5) return 'rare';
  if (score <= 7) return 'epique';
  if (score <= 9) return 'legendaire';
  return 'mythique';
}

/** The user may move the suggested rarity by one notch at most. */
export function allowedRarities(suggested: Rarity): Rarity[] {
  const i = RARITIES.indexOf(suggested);
  return RARITIES.slice(Math.max(0, i - 1), i + 2);
}

// ---------- Levels ----------

/** XP needed to go from level n to n+1. No max level. */
export function xpForNext(level: number): number {
  return Math.round(100 * Math.pow(level, 1.5));
}

export function levelInfo(totalXp: number): { level: number; into: number; need: number } {
  let level = 1;
  let rest = Math.max(0, totalXp);
  while (rest >= xpForNext(level)) {
    rest -= xpForNext(level);
    level++;
  }
  return { level, into: rest, need: xpForNext(level) };
}

export function levelBonus(level: number): number {
  return 20 * level;
}

// ---------- Streaks ----------

export const STREAK_TIERS = [
  { days: 3, mult: 1.1, chest: 20, name: 'Petit coffre' },
  { days: 7, mult: 1.25, chest: 50, name: 'Coffre' },
  { days: 14, mult: 1.5, chest: 120, name: 'Grand coffre' },
  { days: 30, mult: 2, chest: 300, name: 'Coffre mythique' },
];

export function streakMultiplier(streak: number): number {
  let mult = 1;
  for (const t of STREAK_TIERS) if (streak >= t.days) mult = t.mult;
  return mult;
}

export function nextStreakTier(streak: number) {
  return STREAK_TIERS.find((t) => t.days > streak) ?? null;
}

export const FREEZE_PRICE = 60;
export const FREEZE_MAX = 2;

// ---------- Task bonuses ----------

/** +10 % per on-time occurrence in a row (the first one has no bonus), capped at +50 %. */
export function regularityBonus(chain: number): number {
  return Math.min(0.5, 0.1 * Math.max(0, chain - 1));
}

/** Project step: base × (1 + share of the project already done before this step). */
export function progressMultiplier(doneBefore: number, total: number): number {
  return total > 0 ? 1 + doneBefore / total : 1;
}

export const PROJECT_FINAL_BONUS = 0.5;

// ---------- Shop ----------

export function usagePrice(D: number, C: number, G: number): number {
  return Math.round(20 * D * (1 + C / 2) * (1 + (G - 1) / 4));
}
export const unlockPrice = (price: number) => price * 3;
export const gamblePrice = (price: number) => Math.round(price / 2);
export const resalePrice = (price: number) => Math.round(unlockPrice(price) / 2);
export const GAMBLE_CHANCE = 0.2;
export const GOLDEN_TICKET_AFTER = 8;
export const FREE_UNLOCKS = 3;

// ---------- Dates (local time) ----------

const pad = (n: number) => String(n).padStart(2, '0');

export function dayKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDay(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, n: number): string {
  const d = parseDay(key);
  d.setDate(d.getDate() + n);
  return dayKey(d);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parseDay(b).getTime() - parseDay(a).getTime()) / 86400000);
}

/** Monday of the week containing the day, used as the week's key. */
function weekStart(key: string): string {
  const d = parseDay(key);
  const offset = (d.getDay() + 6) % 7;
  return addDays(key, -offset);
}

export function periodKey(rec: Recurrence, day: string): string {
  if (rec === 'daily') return day;
  if (rec === 'weekly') return 'w' + weekStart(day);
  return day.slice(0, 7);
}

export function previousPeriodKey(rec: Recurrence, day: string): string {
  if (rec === 'daily') return addDays(day, -1);
  if (rec === 'weekly') return 'w' + addDays(weekStart(day), -7);
  const d = parseDay(day.slice(0, 7) + '-01');
  d.setMonth(d.getMonth() - 1);
  return dayKey(d).slice(0, 7);
}

/** Next on-time occurrence count for a recurring task completed today. */
export function nextChain(rec: Recurrence, day: string, lastPeriod: string | undefined, chain: number): number {
  if (lastPeriod === previousPeriodKey(rec, day)) return chain + 1;
  return 1;
}

export const RECURRENCE_LABEL: Record<Recurrence, string> = {
  daily: 'chaque jour',
  weekly: 'chaque semaine',
  monthly: 'chaque mois',
};

export const DURATION_LABELS = ['moins de 15 min', '15 à 60 min', '1 à 3 h', 'une demi-journée', 'une journée ou plus'];
export const FLEMME_LABELS = ['aucune', 'un peu', 'moyenne', 'beaucoup', 'je la repousse depuis des semaines'];
export const COST_LABELS = ['gratuit', 'moins de 10 €', '10 à 30 €', '30 à 100 €', 'plus de 100 €'];
export const GUILTY_LABELS = ['pas du tout', 'un peu', 'beaucoup'];
