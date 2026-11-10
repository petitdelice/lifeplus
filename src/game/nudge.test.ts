import { describe, expect, it } from 'vitest';
import { streakNudge } from './nudge';
import type { Streak } from './engine';

const s = (current: number, lastDay: string, freezes = 0): Streak => ({ current, best: current, lastDay, freezes, tiersClaimed: [] });
const today = '2026-11-10';
const yesterday = '2026-11-09';
const NB = ' ';

describe('streakNudge', () => {
  it('stays hidden once a task is done today', () => {
    expect(streakNudge(s(5, today), today, 10)).toBeNull();
  });

  it('invites to start a series when there is none', () => {
    expect(streakNudge({ current: 0, best: 4, freezes: 0, tiersClaimed: [] }, today, 10)).toEqual({ text: 'Une tâche aujourd’hui et ta série démarre.' });
  });

  it('says one task is enough to grow the series', () => {
    expect(streakNudge(s(8, yesterday), today, 10)).toMatchObject({ text: `8 jours${NB}! Une petite tâche suffit pour passer à 9.` });
  });

  it('counts down to a close tier, with the bonus apart for the currency icon', () => {
    expect(streakNudge(s(12, yesterday), today, 10)).toMatchObject({ text: `12 jours${NB}! Plus que 2 jours avant le bonus`, bonus: 1.5, end: '.' });
  });

  it('announces the tier reached by today’s task', () => {
    expect(streakNudge(s(6, yesterday), today, 10)).toMatchObject({
      text: `Une tâche aujourd’hui et tu passes à 7 jours${NB}: un coffre et gains`,
      bonus: 1.25,
      end: `${NB}!`,
    });
  });

  it('mentions a freeze in stock only in the evening', () => {
    expect(streakNudge(s(8, yesterday, 1), today, 10)?.sub).toBeUndefined();
    expect(streakNudge(s(8, yesterday, 1), today, 20)?.sub).toBe(`Pas le temps aujourd’hui${NB}? Ton gel protège ta série.`);
    expect(streakNudge(s(8, yesterday, 0), today, 20)?.sub).toBeUndefined();
  });

  it('never talks about losing', () => {
    for (let n = 0; n < 40; n++) {
      const msg = streakNudge(s(n, yesterday, 1), today, 21);
      expect(`${msg?.text} ${msg?.end} ${msg?.sub}`).not.toMatch(/perd|mour|dernière/i);
    }
  });
});
