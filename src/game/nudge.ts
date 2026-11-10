import { fmtMult } from "./rarity";
import type { Streak } from "./engine";
import { nextStreakTier } from "./rules";

/** Hour from which the streak nudge mentions a freeze in stock. */
export const FREEZE_HINT_HOUR = 19;

export interface StreakNudge {
  text: string;
  sub?: string;
}

/**
 * The gentle line shown under the level bar while no task is done yet today.
 * It only talks about what the next task brings, never about losing the streak.
 */
export function streakNudge(
  streak: Streak,
  today: string,
  hour: number,
): StreakNudge | null {
  if (streak.lastDay === today) return null;
  const n = streak.current;
  if (n <= 0) return { text: "Une tâche aujourd’hui et ta série démarre." };

  const next = nextStreakTier(n);
  const days = (d: number) => `${d} jour${d > 1 ? "s" : ""}`;
  let text: string;
  if (next && next.days === n + 1) {
    text = `Une tâche aujourd’hui et tu passes à ${days(n + 1)} : un ${next.name.toLowerCase()} et gains ${fmtMult(next.mult)} !`;
  } else if (next && next.days - n <= 3) {
    text = `${days(n)} ! Plus que ${next.days - n} jours avant le bonus ${fmtMult(next.mult)}.`;
  } else {
    text = `${days(n)} ! Une petite tâche suffit pour passer à ${n + 1}.`;
  }
  const sub =
    streak.freezes > 0 && hour >= FREEZE_HINT_HOUR
      ? "Pas le temps aujourd’hui ? Ton gel protège ta série."
      : undefined;
  return { text, sub };
}
