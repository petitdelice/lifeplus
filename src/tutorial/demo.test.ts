import { describe, expect, it } from 'vitest';
import { completeTask, previewGains } from '../game/engine';
import { RARITIES, levelInfo } from '../game/rules';
import { demoState } from './demo';

const today = '2026-10-23';

describe('tutorial demo save', () => {
  const s = demoState(today);

  it('shows every task type, and every rarity in Aujourd’hui', () => {
    // Aujourd'hui only lists simple tasks, so they alone must cover the whole ladder.
    const rarities = new Set(s.tasks.filter((t) => t.kind === 'normal').map((t) => t.rarity));
    expect([...rarities].sort()).toEqual([...RARITIES].sort());
    expect(new Set(s.tasks.map((t) => t.kind))).toEqual(new Set(['normal', 'recurring', 'project']));
  });

  it('has routines of more than one frequency, so Récurrentes shows its groups', () => {
    expect(new Set(s.tasks.filter((t) => t.kind === 'recurring').map((t) => t.recurrence)).size).toBeGreaterThan(1);
  });

  it('starts at level 1 and the first ticked task levels up', () => {
    expect(levelInfo(s.totalXp).level).toBe(1);
    for (const t of s.tasks) {
      const r = completeTask(s, t.id, t.steps[0]?.id, today)!;
      expect(r.events.some((e) => e.type === 'levelup')).toBe(true);
    }
  });

  it('gives the routine a regularity bonus', () => {
    const routine = s.tasks.find((t) => t.kind === 'recurring')!;
    expect(previewGains(s, routine, undefined, today).factor).toBeGreaterThan(1);
  });
});
