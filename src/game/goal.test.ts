import { describe, expect, it } from 'vitest';
import { addTask, completeTask, doneToday, initialState, migrateState, setDailyGoal, undoTask, type GameState } from './engine';
import { addDays } from './rules';

const D0 = '2026-10-01';
const easy = { kind: 'normal' as const, duration: 1, flemme: 1 }; // commun: 5 éclats

function withTasks(n: number, goal = 3): GameState {
  let s = setDailyGoal(initialState(D0), goal);
  for (let i = 0; i < n; i++) s = addTask(s, { title: `Tâche ${i}`, ...easy }, D0);
  return s;
}

const tick = (s: GameState, i: number, day = D0) => completeTask(s, s.tasks[i].id, undefined, day)!;
const goalEvents = (r: ReturnType<typeof tick>) => r.events.filter((e) => e.type === 'goal');

describe('daily goal', () => {
  it('defaults to 3 and stays between 1 and 10', () => {
    expect(initialState(D0).dailyGoal).toBe(3);
    expect(setDailyGoal(initialState(D0), 0).dailyGoal).toBe(1);
    expect(setDailyGoal(initialState(D0), 42).dailyGoal).toBe(10);
    const old = { ...initialState(D0) } as Partial<GameState>;
    delete old.dailyGoal;
    expect(migrateState(old as GameState).dailyGoal).toBe(3);
  });

  it('celebrates once with 10 éclats when the goal is reached', () => {
    let s = withTasks(4);
    let r = tick(s, 0);
    expect(goalEvents(r)).toHaveLength(0);
    r = tick(r.state, 1);
    expect(goalEvents(r)).toHaveLength(0);
    r = tick(r.state, 2);
    expect(goalEvents(r)).toEqual([{ type: 'goal', goal: 3, amount: 10 }]);
    expect(r.state.eclats).toBe(3 * 5 + 10);
    s = r.state;
    r = tick(s, 3);
    expect(goalEvents(r)).toHaveLength(0);
    expect(doneToday(r.state, D0)).toBe(4);
  });

  it('starts again the next day', () => {
    const r = tick(withTasks(2, 1), 0);
    expect(goalEvents(r)).toHaveLength(1);
    expect(goalEvents(tick(r.state, 1, addDays(D0, 1)))).toHaveLength(1);
  });

  it('takes the bonus back when the goal task is unticked', () => {
    const r = tick(withTasks(1, 1), 0);
    const back = undoTask(r.state, r.state.tasks[0].id, undefined, D0)!;
    expect(back.eclats).toBe(0);
  });
});
