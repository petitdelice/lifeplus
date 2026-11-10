import { describe, expect, it } from 'vitest';
import { addTask, completeTask, initialState, undoTask, type GameState } from './engine';
import { addDays } from './rules';

const D0 = '2026-10-01';
const easy = { kind: 'normal' as const, duration: 1, flemme: 1 }; // commun: 10 XP, 5 éclats, 6 % surprise

function twoTasks() {
  let s: GameState = initialState(D0);
  s = addTask(s, { title: 'Poubelles', ...easy }, D0);
  s = addTask(s, { title: 'Vaisselle', ...easy }, D0);
  return { s, a: s.tasks[0].id, b: s.tasks[1].id };
}

describe('surprise bonus', () => {
  it('doubles the base éclats, never the XP', () => {
    const { s, a } = twoTasks();
    const r = completeTask(s, a, undefined, D0, 0)!;
    expect(r.xp).toBe(10);
    expect(r.state.totalXp).toBe(10);
    expect(r.state.eclats).toBe(5 + 5);
    expect(r.events).toContainEqual({ type: 'surprise', amount: 5 });
  });

  it('depends on the rarity chance', () => {
    const { s, a } = twoTasks();
    expect(completeTask(s, a, undefined, D0, 0.07)!.events.some((e) => e.type === 'surprise')).toBe(false);
    const rare = addTask(s, { title: 'Impôts', kind: 'normal', duration: 4, flemme: 5 }, D0); // légendaire, 12 %
    const r = completeTask(rare, rare.tasks[2].id, undefined, D0, 0.11)!;
    expect(r.events).toContainEqual({ type: 'surprise', amount: 75 });
  });

  it('happens at most once a day', () => {
    const { s, a, b } = twoTasks();
    const r1 = completeTask(s, a, undefined, D0, 0)!;
    const r2 = completeTask(r1.state, b, undefined, D0, 0)!;
    expect(r2.events.some((e) => e.type === 'surprise')).toBe(false);
    expect(r2.state.eclats).toBe(5 + 5 + 5);
    const next = addTask(r2.state, { title: 'Courses', ...easy }, D0);
    const r3 = completeTask(next, next.tasks[2].id, undefined, addDays(D0, 1), 0)!;
    expect(r3.events.some((e) => e.type === 'surprise')).toBe(true);
  });

  it('is taken back when the task is unticked', () => {
    const { s, a } = twoTasks();
    const r = completeTask(s, a, undefined, D0, 0)!;
    const back = undoTask(r.state, a, undefined, D0)!;
    expect(back.eclats).toBe(0);
  });

  it('never triggers with the default roll', () => {
    const { s, a } = twoTasks();
    expect(completeTask(s, a, undefined, D0)!.events.some((e) => e.type === 'surprise')).toBe(false);
  });
});
