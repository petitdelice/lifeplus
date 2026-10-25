import { describe, expect, it } from 'vitest';
import {
  addReward,
  addTask,
  buyFreeze,
  completeTask,
  enjoyReward,
  gambleReward,
  initialState,
  migrateState,
  updateTask,
  refreshDay,
  sellReward,
  spendTicket,
  undoTask,
  unlockReward,
  visitShop,
  type GameState,
} from './engine';
import { levelInfo, rarityFromScore, usagePrice, xpForNext, addDays } from './rules';

const D0 = '2026-10-01';

function withTask(state: GameState, input: Parameters<typeof addTask>[1]) {
  const s = addTask(state, input, D0);
  return { s, t: s.tasks[s.tasks.length - 1] };
}

describe('rules', () => {
  it('maps the score to the five rarities', () => {
    expect(rarityFromScore(1, 1)).toBe('commun');
    expect(rarityFromScore(2, 3)).toBe('rare');
    expect(rarityFromScore(3, 4)).toBe('epique');
    expect(rarityFromScore(4, 5)).toBe('legendaire');
    expect(rarityFromScore(5, 5)).toBe('mythique');
  });

  it('prices rewards like the doc table', () => {
    expect(usagePrice(2, 0, 1)).toBe(40);
    expect(usagePrice(2, 1, 3)).toBe(90);
    expect(usagePrice(3, 2, 1)).toBe(120);
    expect(usagePrice(3, 3, 1)).toBe(150);
    expect(usagePrice(5, 4, 1)).toBe(300);
  });

  it('levels follow 100 × n^1.5 with no max', () => {
    expect(xpForNext(1)).toBe(100);
    expect(xpForNext(5)).toBe(1118);
    expect(levelInfo(99).level).toBe(1);
    expect(levelInfo(100).level).toBe(2);
    expect(levelInfo(10_000_000).level).toBeGreaterThan(100);
  });
});

describe('tasks', () => {
  it('gives base gains for a normal task and a level-up bonus', () => {
    const { s, t } = withTask(initialState(D0), { title: 'Impôts', kind: 'normal', duration: 4, flemme: 5 });
    const r = completeTask(s, t.id, undefined, D0)!;
    expect(r.xp).toBe(150);
    expect(r.eclats).toBe(75);
    // 150 XP passes level 2 (100): +40 éclats level bonus.
    expect(levelInfo(r.state.totalXp).level).toBe(2);
    expect(r.state.eclats).toBe(75 + 40);
    expect(r.events.some((e) => e.type === 'levelup')).toBe(true);
    expect(r.state.badges['first-legendaire']).toBe(D0);
  });

  it('unticking restores everything', () => {
    const { s, t } = withTask(initialState(D0), { title: 'Impôts', kind: 'normal', duration: 4, flemme: 5 });
    const r = completeTask(s, t.id, undefined, D0)!;
    const back = undoTask(r.state, t.id, undefined, D0)!;
    expect(back.totalXp).toBe(0);
    expect(back.eclats).toBe(0);
    expect(back.streak.current).toBe(0);
    expect(back.badges).toEqual({});
    expect(back.moments).toEqual([]);
    expect(back.tasks[0].doneDay).toBeUndefined();
  });

  it('projects: progress bonus then +50 % final bonus (doc example)', () => {
    let { s, t } = withTask(initialState(D0), {
      title: 'Repeindre',
      kind: 'project',
      duration: 3,
      flemme: 3,
      steps: [1, 2, 3, 4].map((i) => ({ title: `Étape ${i}`, duration: 3, flemme: 3 })),
    });
    const eclats: number[] = [];
    for (const step of t.steps) {
      const r = completeTask(s, t.id, step.id, D0)!;
      eclats.push(r.eclats);
      s = r.state;
    }
    // 30, 37/38, 45, 52/53 then 82 bonus on the last step (rounding of ×1.25 / ×1.75).
    expect(eclats.slice(0, 3)).toEqual([30, 38, 45]);
    const project = s.tasks[0];
    expect(project.finishedDay).toBe(D0);
    expect(s.badges['project-1']).toBe(D0);
    expect(project.projectEclats).toBe(Math.round((30 + 38 + 45 + 53) * 1.5));
    t = project;
  });

  it('recurring: regularity bonus +10 % per occurrence, reset after a miss', () => {
    let { s, t } = withTask(initialState(D0), { title: 'Sport', kind: 'recurring', recurrence: 'daily', duration: 2, flemme: 2 });
    const gains: number[] = [];
    for (let d = 0; d < 3; d++) {
      const r = completeTask(s, t.id, undefined, addDays(D0, d))!;
      gains.push(r.xp);
      s = r.state;
    }
    // ×1, ×1.1, ×1.2 regularity and ×1.1 streak on day 3.
    expect(gains).toEqual([25, 28, Math.round(25 * 1.2 * 1.1)]);
    const missed = completeTask(s, t.id, undefined, addDays(D0, 5))!;
    expect(missed.state.tasks[0].chain).toBe(1);
  });

  it('streak multiplier and chest at 3 days', () => {
    let { s, t } = withTask(initialState(D0), { title: 'Poubelles', kind: 'recurring', recurrence: 'daily', duration: 1, flemme: 1 });
    let last;
    for (let d = 0; d < 3; d++) {
      last = completeTask(s, t.id, undefined, addDays(D0, d))!;
      s = last.state;
    }
    expect(s.streak.current).toBe(3);
    expect(last!.events.some((e) => e.type === 'chest')).toBe(true);
  });

  it('freezes save the streak, otherwise it ends gently without losing éclats', () => {
    let { s, t } = withTask(initialState(D0), { title: 'Poubelles', kind: 'recurring', recurrence: 'daily', duration: 1, flemme: 1 });
    s = completeTask(s, t.id, undefined, D0)!.state;
    s = { ...s, streak: { ...s.streak, freezes: 1 } };
    const saved = refreshDay(s, addDays(D0, 2));
    expect(saved.state.streak.current).toBe(1);
    expect(saved.state.streak.freezes).toBe(0);
    const broken = refreshDay(s, addDays(D0, 4));
    expect(broken.state.streak.current).toBe(0);
    expect(broken.state.streak.best).toBe(1);
    expect(broken.state.eclats).toBe(s.eclats);
  });

  it('unticking one of two tasks of the day keeps the streak', () => {
    let s = initialState(D0);
    s = addTask(s, { title: 'A', kind: 'normal', duration: 1, flemme: 1 }, D0);
    s = addTask(s, { title: 'B', kind: 'normal', duration: 1, flemme: 1 }, D0);
    const [a, b] = s.tasks;
    s = completeTask(s, a.id, undefined, D0)!.state;
    s = completeTask(s, b.id, undefined, D0)!.state;
    s = undoTask(s, a.id, undefined, D0)!;
    expect(s.streak.current).toBe(1);
    s = undoTask(s, b.id, undefined, D0)!;
    expect(s.streak.current).toBe(0);
    expect(s.streak.lastDay).toBeUndefined();
  });
});

describe('shop', () => {
  const rich = (): GameState => ({ ...visitShop(initialState(D0)).state, eclats: 1000 });

  it('gives 3 free unlocks on the first visit; gifts cannot be resold', () => {
    let s = rich();
    expect(s.freeUnlocks).toBe(3);
    s = unlockReward(s, 'cinema', D0).state;
    expect(s.eclats).toBe(1000);
    expect(s.rewards.find((r) => r.id === 'cinema')!.gift).toBe(true);
    expect(sellReward(s, 'cinema').state).toBe(s);
  });

  it('paid unlock costs 3×, resale gives back half of it', () => {
    let s = { ...rich(), freeUnlocks: 0 };
    s = unlockReward(s, 'cinema', D0).state;
    expect(s.eclats).toBe(1000 - 360);
    s = sellReward(s, 'cinema').state;
    expect(s.eclats).toBe(1000 - 360 + 180);
    expect(s.rewards.find((r) => r.id === 'cinema')!.unlocked).toBe(false);
  });

  it('use costs the usage price', () => {
    let s = rich();
    s = unlockReward(s, 'serie', D0).state;
    const r = enjoyReward(s, 'serie', D0);
    expect(r.state.eclats).toBe(960);
    expect(r.state.enjoyed).toBe(1);
  });

  it('gamble: half price, 20 %, golden ticket after 8 losses', () => {
    let s = rich();
    s = unlockReward(s, 'serie', D0).state;
    const win = gambleReward(s, 'serie', 0.1, D0);
    expect(win.win).toBe(true);
    expect(win.state.eclats).toBe(980);
    for (let i = 0; i < 8; i++) s = gambleReward(s, 'serie', 0.9, D0).state;
    expect(s.tickets).toBe(1);
    expect(s.losses).toBe(0);
    // Ticket works on a free (C = 0) pleasure even when locked.
    const t = spendTicket(s, 'grasse', D0);
    expect(t.state.tickets).toBe(0);
    expect(spendTicket(s, 'cinema', D0).state).toBe(s);
  });

  it('created pleasures use a free unlock if one is left', () => {
    let s = rich();
    s = addReward(s, { name: 'Glace', emoji: '🍦', D: 1, C: 1, G: 2 });
    expect(s.rewards.at(-1)!.unlocked).toBe(true);
    expect(s.freeUnlocks).toBe(2);
  });

  it('freeze: 60 éclats, 2 max', () => {
    let s = rich();
    s = buyFreeze(s).state;
    s = buyFreeze(s).state;
    expect(buyFreeze(s).error).toBeTruthy();
    expect(s.streak.freezes).toBe(2);
    expect(s.eclats).toBe(880);
  });
});

describe('project paths', () => {
  const path = {
    title: 'Cuisine',
    kind: 'project' as const,
    duration: 3,
    flemme: 3,
    stages: [
      { title: 'Préparer', tasks: [{ title: 'Vider', duration: 2, flemme: 2 }, { title: 'Acheter', duration: 2, flemme: 2 }] },
      { title: '', tasks: [{ title: 'Peindre', duration: 3, flemme: 3 }] },
      { title: 'Vide', tasks: [{ title: '  ', duration: 1, flemme: 1 }] },
    ],
  };

  it('keeps stages in order, names unnamed ones and drops empty ones', () => {
    const { t } = withTask(initialState(D0), path);
    expect(t.stages.map((g) => g.title)).toEqual(['Préparer', 'Étape 2']);
    expect(t.steps.map((s) => s.title)).toEqual(['Vider', 'Acheter', 'Peindre']);
    expect(t.steps.map((s) => t.stages.findIndex((g) => g.id === s.stageId))).toEqual([0, 0, 1]);
  });

  it('celebrates a finished stage, then the whole project', () => {
    let { s, t } = withTask(initialState(D0), path);
    let r = completeTask(s, t.id, t.steps[0].id, D0)!;
    expect(r.events.some((e) => e.type === 'stage')).toBe(false);
    r = completeTask(r.state, t.id, t.steps[1].id, D0)!;
    expect(r.events.find((e) => e.type === 'stage')).toMatchObject({ title: 'Préparer', index: 0, total: 2 });
    r = completeTask(r.state, t.id, t.steps[2].id, D0)!;
    expect(r.events.some((e) => e.type === 'stage')).toBe(false);
    expect(r.events.some((e) => e.type === 'project')).toBe(true);
    s = r.state;
    expect(s.tasks[0].finishedDay).toBe(D0);
  });

  it('editing keeps done tasks done', () => {
    const { s, t } = withTask(initialState(D0), path);
    const done = completeTask(s, t.id, t.steps[0].id, D0)!.state;
    const p = done.tasks[0];
    const edited = updateTask(done, p.id, {
      ...path,
      stages: [
        { id: p.stages[0].id, title: 'Avant', tasks: p.steps.slice(0, 2) },
        { title: 'Nouvelle', tasks: [{ title: 'Ranger', duration: 1, flemme: 1 }] },
      ],
    }).tasks[0];
    expect(edited.stages.map((g) => g.title)).toEqual(['Avant', 'Nouvelle']);
    expect(edited.steps[0].doneDay).toBe(D0);
    expect(edited.steps.at(-1)!.doneDay).toBeUndefined();
  });

  it('migrates old flat projects into one stage without losing progress', () => {
    const { s, t } = withTask(initialState(D0), { ...path, stages: undefined, steps: path.stages[0].tasks });
    const r = completeTask(s, t.id, t.steps[0].id, D0)!;
    // What a save from before project paths looked like.
    const strip = (task: (typeof r.state.tasks)[0]) => {
      const { stages: _, ...rest } = task;
      return { ...rest, steps: task.steps.map(({ stageId: __, ...st }) => st) };
    };
    const old = {
      ...r.state,
      tasks: r.state.tasks.map(strip),
      completions: r.state.completions.map((c) => ({ ...c, prevTask: strip(c.prevTask) })),
    } as unknown as GameState;
    const m = migrateState(old);
    const p = m.tasks[0];
    expect(p.stages).toHaveLength(1);
    expect(p.steps.every((st) => st.stageId === p.stages[0].id)).toBe(true);
    expect(p.steps[0].doneDay).toBe(D0);
    expect(m.eclats).toBe(r.state.eclats);
    expect(m.completions[0].prevTask.stages).toHaveLength(1);
    // Unticking restores a task that still has its stage.
    expect(undoTask(m, p.id, p.steps[0].id, D0)!.tasks[0].stages).toHaveLength(1);
    expect(migrateState(m)).toEqual(m);
  });
});
