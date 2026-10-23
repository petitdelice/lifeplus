import { describe, expect, it } from 'vitest';
import { completeTask, previewGains } from '../game/engine';
import { RARITIES, levelInfo } from '../game/rules';
import { demoState } from './demo';

const today = '2026-10-23';

describe('tutorial demo save', () => {
  const s = demoState(today);

  it('shows every rarity and every task type', () => {
    const rarities = new Set(s.tasks.flatMap((t) => (t.kind === 'project' ? t.steps.map((st) => st.rarity) : [t.rarity])));
    expect([...rarities].sort()).toEqual([...RARITIES].sort());
    expect(new Set(s.tasks.map((t) => t.kind))).toEqual(new Set(['normal', 'recurring', 'project']));
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
