// Pure state transitions. The zustand store wraps these; tests call them directly.
import {
  type Rarity,
  type Recurrence,
  RARITY_GAINS,
  STREAK_TIERS,
  FREE_UNLOCKS,
  FREEZE_MAX,
  FREEZE_PRICE,
  GAMBLE_CHANCE,
  GOLDEN_TICKET_AFTER,
  PROJECT_FINAL_BONUS,
  addDays,
  daysBetween,
  dayKey,
  gamblePrice,
  levelBonus,
  levelInfo,
  nextChain,
  periodKey,
  progressMultiplier,
  rarityFromScore,
  regularityBonus,
  resalePrice,
  streakMultiplier,
  unlockPrice,
  usagePrice,
} from './rules';
import { LEVEL_BADGES, TASK_COUNT_BADGES } from './badges';
import { DEFAULT_REWARDS } from './defaults';

export type TaskKind = 'normal' | 'recurring' | 'project';

export interface Step {
  id: string;
  title: string;
  duration: number;
  flemme: number;
  rarity: Rarity;
  doneDay?: string;
}

export interface Task {
  id: string;
  title: string;
  kind: TaskKind;
  duration: number;
  flemme: number;
  rarity: Rarity;
  createdDay: string;
  // normal
  doneDay?: string;
  // recurring
  recurrence?: Recurrence;
  lastPeriod?: string;
  chain: number;
  // project
  steps: Step[];
  projectXp: number;
  projectEclats: number;
  finishedDay?: string;
}

export interface Streak {
  current: number;
  best: number;
  lastDay?: string;
  freezes: number;
  tiersClaimed: number[];
}

export interface Completion {
  id: string;
  taskId: string;
  stepId?: string;
  day: string;
  rarity: Rarity;
  xp: number;
  eclats: number;
  levelBonus: number;
  chest: number;
  prevTask: Task;
  prevStreak: Streak;
  /** Badges and moments this completion created, removed again if it is unticked. */
  badges: string[];
  moments: string[];
  /** The streak-tier part, only removed when the day's streak is rolled back. */
  streakBadges: string[];
  streakMoments: string[];
}

export interface Reward {
  id: string;
  name: string;
  emoji: string;
  D: number;
  C: number;
  G: number;
  unlocked: boolean;
  /** Unlocked with a free unlock: cannot be resold. */
  gift: boolean;
  custom: boolean;
  uses: number;
}

export type MomentKind = 'level' | 'rarity' | 'project' | 'streak' | 'unlock';

export interface Moment {
  id: string;
  day: string;
  kind: MomentKind;
  label: string;
}

export interface GameState {
  version: 1;
  startedDay: string;
  totalXp: number;
  eclats: number;
  earned: number;
  spent: number;
  enjoyed: number;
  tasks: Task[];
  completions: Completion[];
  streak: Streak;
  rewards: Reward[];
  shopVisited: boolean;
  freeUnlocks: number;
  losses: number;
  tickets: number;
  badges: Record<string, string>;
  moments: Moment[];
}

export type GameEvent =
  | { type: 'levelup'; level: number; bonus: number }
  | { type: 'chest'; name: string; amount: number; days: number }
  | { type: 'badge'; id: string }
  | { type: 'project'; title: string; xp: number; eclats: number }
  | { type: 'streak-broken'; best: number; lost: number }
  | { type: 'freeze-used'; count: number }
  | { type: 'shop-welcome'; count: number };

let counter = 0;
export function uid(prefix = ''): string {
  counter = (counter + 1) % 1e6;
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7) + counter.toString(36);
}

export function initialState(today = dayKey()): GameState {
  return {
    version: 1,
    startedDay: today,
    totalXp: 0,
    eclats: 0,
    earned: 0,
    spent: 0,
    enjoyed: 0,
    tasks: [],
    completions: [],
    streak: { current: 0, best: 0, freezes: 0, tiersClaimed: [] },
    rewards: DEFAULT_REWARDS.map((r) => ({ ...r, unlocked: false, gift: false, custom: false, uses: 0 })),
    shopVisited: false,
    freeUnlocks: 0,
    losses: 0,
    tickets: 0,
    badges: {},
    moments: [],
  };
}

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

// ---------- Tasks ----------

export interface TaskInput {
  title: string;
  kind: TaskKind;
  duration: number;
  flemme: number;
  rarity?: Rarity;
  recurrence?: Recurrence;
  steps?: { id?: string; title: string; duration: number; flemme: number; rarity?: Rarity }[];
}

function buildSteps(input: TaskInput, previous: Step[] = []): Step[] {
  return (input.steps ?? [])
    .filter((s) => s.title.trim())
    .map((s) => {
      const old = previous.find((p) => p.id === s.id);
      return {
        id: s.id ?? uid('s'),
        title: s.title.trim(),
        duration: s.duration,
        flemme: s.flemme,
        rarity: s.rarity ?? rarityFromScore(s.duration, s.flemme),
        doneDay: old?.doneDay,
      };
    });
}

export function addTask(state: GameState, input: TaskInput, today = dayKey()): GameState {
  const task: Task = {
    id: uid('t'),
    title: input.title.trim(),
    kind: input.kind,
    duration: input.duration,
    flemme: input.flemme,
    rarity: input.rarity ?? rarityFromScore(input.duration, input.flemme),
    createdDay: today,
    recurrence: input.kind === 'recurring' ? input.recurrence ?? 'daily' : undefined,
    chain: 0,
    steps: input.kind === 'project' ? buildSteps(input) : [],
    projectXp: 0,
    projectEclats: 0,
  };
  return { ...state, tasks: [...state.tasks, task] };
}

export function updateTask(state: GameState, id: string, input: TaskInput): GameState {
  return {
    ...state,
    tasks: state.tasks.map((t) =>
      t.id !== id
        ? t
        : {
            ...t,
            title: input.title.trim(),
            duration: input.duration,
            flemme: input.flemme,
            rarity: input.rarity ?? rarityFromScore(input.duration, input.flemme),
            recurrence: t.kind === 'recurring' ? input.recurrence ?? t.recurrence : undefined,
            steps: t.kind === 'project' ? buildSteps(input, t.steps) : [],
          },
    ),
  };
}

export function deleteTask(state: GameState, id: string): GameState {
  return { ...state, tasks: state.tasks.filter((t) => t.id !== id) };
}

/** Whether the task (or the step) counts as done right now, as the list shows it. */
export function isDone(task: Task, today = dayKey(), stepId?: string): boolean {
  if (task.kind === 'project') {
    if (stepId) return !!task.steps.find((s) => s.id === stepId)?.doneDay;
    return !!task.finishedDay;
  }
  if (task.kind === 'recurring') return task.lastPeriod === periodKey(task.recurrence!, today);
  return !!task.doneDay;
}

/** Unticking only works on the same day, so the day's streak can be rolled back safely. */
export function findUndoable(state: GameState, taskId: string, stepId: string | undefined, today = dayKey()) {
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task) return undefined;
  if (task.kind === 'project') {
    // Only the most recent step can be unticked, so later progress bonuses stay right.
    const last = [...state.completions].reverse().find((c) => c.taskId === taskId);
    if (!last || last.stepId !== stepId) return undefined;
    return last.day === today ? last : undefined;
  }
  if (!isDone(task, today)) return undefined;
  const c = [...state.completions].reverse().find((x) => x.taskId === taskId);
  return c && c.day === today ? c : undefined;
}

export interface Gains {
  xp: number;
  eclats: number;
  factor: number;
  mult: number;
}

/** Preview of what completing a task (or step) would give right now, before streak changes today. */
export function previewGains(state: GameState, task: Task, stepId?: string, today = dayKey()): Gains {
  const streak = state.streak;
  const current =
    streak.lastDay === today ? streak.current : streak.lastDay === addDays(today, -1) ? streak.current + 1 : 1;
  const mult = streakMultiplier(current);
  let rarity = task.rarity;
  let factor = 1;
  if (task.kind === 'recurring') {
    factor = 1 + regularityBonus(nextChain(task.recurrence!, today, task.lastPeriod, task.chain));
  } else if (task.kind === 'project') {
    const step = task.steps.find((s) => s.id === stepId);
    if (step) rarity = step.rarity;
    factor = progressMultiplier(task.steps.filter((s) => s.doneDay).length, task.steps.length);
  }
  const base = RARITY_GAINS[rarity];
  return { xp: Math.round(base.xp * factor * mult), eclats: Math.round(base.eclats * factor * mult), factor, mult };
}

export interface CompleteResult {
  state: GameState;
  events: GameEvent[];
  xp: number;
  eclats: number;
}

export function completeTask(state: GameState, taskId: string, stepId?: string, today = dayKey()): CompleteResult | null {
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task) return null;
  if (isDone(task, today, stepId)) return null;
  if (task.kind === 'project' && !task.steps.find((s) => s.id === stepId)) return null;

  const events: GameEvent[] = [];
  const prevTask = clone(task);
  const prevStreak = clone(state.streak);
  const badges = { ...state.badges };
  const moments = [...state.moments];
  const created = { badges: [] as string[], moments: [] as string[], streakBadges: [] as string[], streakMoments: [] as string[] };

  const award = (id: string, streakPart = false) => {
    if (badges[id]) return;
    badges[id] = today;
    (streakPart ? created.streakBadges : created.badges).push(id);
    events.push({ type: 'badge', id });
  };
  const moment = (kind: MomentKind, label: string, streakPart = false) => {
    const m = { id: uid('m'), day: today, kind, label };
    moments.push(m);
    (streakPart ? created.streakMoments : created.moments).push(m.id);
  };

  // Streak: a day counts as soon as one task is done that day.
  const streak = clone(state.streak);
  if (streak.lastDay !== today) {
    streak.current = streak.lastDay === addDays(today, -1) ? streak.current + 1 : 1;
    streak.lastDay = today;
    if (streak.current === 1) streak.tiersClaimed = [];
  }
  streak.best = Math.max(streak.best, streak.current);
  const mult = streakMultiplier(streak.current);

  // Base gains and task bonuses.
  const next = clone(task);
  let rarity = task.rarity;
  let factor = 1;
  if (task.kind === 'normal') {
    next.doneDay = today;
  } else if (task.kind === 'recurring') {
    next.chain = nextChain(task.recurrence!, today, task.lastPeriod, task.chain);
    next.lastPeriod = periodKey(task.recurrence!, today);
    factor = 1 + regularityBonus(next.chain);
  } else {
    const step = next.steps.find((s) => s.id === stepId)!;
    rarity = step.rarity;
    factor = progressMultiplier(next.steps.filter((s) => s.doneDay).length, next.steps.length);
    step.doneDay = today;
  }
  const base = RARITY_GAINS[rarity];
  let xp = Math.round(base.xp * factor * mult);
  let eclats = Math.round(base.eclats * factor * mult);

  if (task.kind === 'project') {
    next.projectXp += xp;
    next.projectEclats += eclats;
    if (next.steps.every((s) => s.doneDay)) {
      const fx = Math.round(next.projectXp * PROJECT_FINAL_BONUS);
      const fe = Math.round(next.projectEclats * PROJECT_FINAL_BONUS);
      xp += fx;
      eclats += fe;
      next.projectXp += fx;
      next.projectEclats += fe;
      next.finishedDay = today;
      events.push({ type: 'project', title: next.title, xp: fx, eclats: fe });
      moment('project', `Projet terminé : ${next.title}`);
      const finished = state.tasks.filter((t) => t.kind === 'project' && t.finishedDay).length + 1;
      award('project-1');
      if (finished >= 5) award('project-5');
    }
  }

  // Badges and moments for rarities and counts.
  const doneCount = state.completions.length + 1;
  award('first-task');
  for (const n of TASK_COUNT_BADGES) if (doneCount >= n) award(`tasks-${n}`);
  if (rarity === 'legendaire' || rarity === 'mythique') {
    const id = `first-${rarity}`;
    if (!badges[id]) moment('rarity', rarity === 'mythique' ? 'Première tâche mythique' : 'Première tâche légendaire');
    award(id);
  }

  // Streak chests, once per tier per streak.
  let chest = 0;
  for (const tier of STREAK_TIERS) {
    if (streak.current >= tier.days && !streak.tiersClaimed.includes(tier.days)) {
      streak.tiersClaimed.push(tier.days);
      chest += tier.chest;
      events.push({ type: 'chest', name: tier.name, amount: tier.chest, days: tier.days });
      moment('streak', `Streak de ${tier.days} jours`, true);
      award(`streak-${tier.days}`, true);
    }
  }

  // Levels: full-screen animation and 20 × level éclats each.
  const before = levelInfo(state.totalXp).level;
  const after = levelInfo(state.totalXp + xp).level;
  let lvlBonus = 0;
  for (let l = before + 1; l <= after; l++) {
    const bonus = levelBonus(l);
    lvlBonus += bonus;
    events.push({ type: 'levelup', level: l, bonus });
    moment('level', `Niveau ${l} atteint`);
    if (LEVEL_BADGES.includes(l)) award(`level-${l}`);
  }

  const gained = eclats + lvlBonus + chest;
  const completion: Completion = {
    id: uid('c'),
    taskId,
    stepId,
    day: today,
    rarity,
    xp,
    eclats,
    levelBonus: lvlBonus,
    chest,
    prevTask,
    prevStreak,
    ...created,
  };

  // Celebrations come first so the level-up shows before badges.
  events.sort((a, b) => order(a) - order(b));

  return {
    state: {
      ...state,
      totalXp: state.totalXp + xp,
      eclats: state.eclats + gained,
      earned: state.earned + gained,
      tasks: state.tasks.map((t) => (t.id === taskId ? next : t)),
      completions: [...state.completions, completion],
      streak,
      badges,
      moments,
    },
    events,
    xp,
    eclats,
  };
}

const ORDER: Record<GameEvent['type'], number> = {
  'streak-broken': 0,
  'freeze-used': 0,
  'shop-welcome': 0,
  project: 1,
  levelup: 2,
  chest: 3,
  badge: 4,
};
const order = (e: GameEvent) => ORDER[e.type];

/** "Erreur de clic": everything goes back to how it was, no message of reproach. */
export function undoTask(state: GameState, taskId: string, stepId?: string, today = dayKey()): GameState | null {
  const c = findUndoable(state, taskId, stepId, today);
  if (!c) return null;
  const completions = state.completions.filter((x) => x.id !== c.id);
  const othersToday = completions.some((x) => x.day === c.day);

  // If another task still counts for today the streak stays, and so does its chest.
  const rollStreak = !othersToday;
  const removedBadges = rollStreak ? [...c.badges, ...c.streakBadges] : c.badges;
  const removedMoments = rollStreak ? [...c.moments, ...c.streakMoments] : c.moments;
  const lost = c.eclats + c.levelBonus + (rollStreak ? c.chest : 0);

  const badges = { ...state.badges };
  for (const id of removedBadges) delete badges[id];

  let rest = completions;
  if (!rollStreak) {
    // Hand the day's streak part to a remaining completion of the day, so unticking it later still rolls back cleanly.
    const heir = [...completions].reverse().find((x) => x.day === c.day)!;
    rest = completions.map((x) =>
      x.id === heir.id
        ? {
            ...x,
            chest: x.chest + c.chest,
            streakBadges: [...x.streakBadges, ...c.streakBadges],
            streakMoments: [...x.streakMoments, ...c.streakMoments],
            prevStreak: earliest(c.prevStreak, x.prevStreak),
          }
        : x,
    );
  }

  return {
    ...state,
    totalXp: Math.max(0, state.totalXp - c.xp),
    eclats: Math.max(0, state.eclats - lost),
    earned: Math.max(0, state.earned - lost),
    tasks: state.tasks.map((t) => (t.id === taskId ? c.prevTask : t)),
    completions: rest,
    streak: rollStreak ? { ...c.prevStreak, freezes: state.streak.freezes } : state.streak,
    badges,
    moments: state.moments.filter((m) => !removedMoments.includes(m.id)),
  };
}

/** The streak state from before the day started is the one whose lastDay is not today. */
function earliest(a: Streak, b: Streak): Streak {
  if (!a.lastDay) return a;
  if (!b.lastDay) return b;
  return a.lastDay <= b.lastDay ? a : b;
}

// ---------- Day change ----------

/** Called on launch and when the app comes back: uses streak freezes or ends the streak gently. */
export function refreshDay(state: GameState, today = dayKey()): { state: GameState; events: GameEvent[] } {
  const s = state.streak;
  if (!s.lastDay || s.current === 0) return { state, events: [] };
  const gap = daysBetween(s.lastDay, today);
  if (gap < 2) return { state, events: [] };
  const missed = gap - 1;
  if (s.freezes >= missed) {
    return {
      state: { ...state, streak: { ...s, freezes: s.freezes - missed, lastDay: addDays(today, -1) } },
      events: [{ type: 'freeze-used', count: missed }],
    };
  }
  return {
    state: { ...state, streak: { ...s, current: 0, tiersClaimed: [] } },
    events: [{ type: 'streak-broken', best: s.best, lost: s.current }],
  };
}

// ---------- Shop ----------

export const rewardPrice = (r: Pick<Reward, 'D' | 'C' | 'G'>) => usagePrice(r.D, r.C, r.G);

export type ShopResult = { state: GameState; events: GameEvent[]; error?: string };

const missing = (n: number, what: string) => `Encore ${n} éclats ${what}, tu y es presque !`;

export function visitShop(state: GameState): ShopResult {
  if (state.shopVisited) return { state, events: [] };
  return {
    state: { ...state, shopVisited: true, freeUnlocks: FREE_UNLOCKS },
    events: [{ type: 'shop-welcome', count: FREE_UNLOCKS }],
  };
}

function patchReward(state: GameState, id: string, patch: Partial<Reward>): Reward[] {
  return state.rewards.map((r) => (r.id === id ? { ...r, ...patch } : r));
}

function enjoyBadge(state: GameState, today: string): Record<string, string> {
  return state.badges['first-reward'] ? state.badges : { ...state.badges, 'first-reward': today };
}

export function enjoyReward(state: GameState, id: string, today = dayKey()): ShopResult {
  const r = state.rewards.find((x) => x.id === id);
  if (!r || !r.unlocked) return { state, events: [] };
  const price = rewardPrice(r);
  if (state.eclats < price) return { state, events: [], error: missing(price - state.eclats, 'pour en profiter') };
  const first = !state.badges['first-reward'];
  return {
    state: {
      ...state,
      eclats: state.eclats - price,
      spent: state.spent + price,
      enjoyed: state.enjoyed + 1,
      rewards: patchReward(state, id, { uses: r.uses + 1 }),
      badges: enjoyBadge(state, today),
    },
    events: first ? [{ type: 'badge', id: 'first-reward' }] : [],
  };
}

export function unlockReward(state: GameState, id: string, today = dayKey()): ShopResult {
  const r = state.rewards.find((x) => x.id === id);
  if (!r || r.unlocked) return { state, events: [] };
  const moment: Moment = { id: uid('m'), day: today, kind: 'unlock', label: `Plaisir débloqué : ${r.name}` };
  if (state.freeUnlocks > 0) {
    return {
      state: {
        ...state,
        freeUnlocks: state.freeUnlocks - 1,
        rewards: patchReward(state, id, { unlocked: true, gift: true }),
        moments: [...state.moments, moment],
      },
      events: [],
    };
  }
  const cost = unlockPrice(rewardPrice(r));
  if (state.eclats < cost) return { state, events: [], error: missing(cost - state.eclats, 'pour le débloquer') };
  return {
    state: {
      ...state,
      eclats: state.eclats - cost,
      spent: state.spent + cost,
      rewards: patchReward(state, id, { unlocked: true, gift: false }),
      moments: [...state.moments, moment],
    },
    events: [],
  };
}

export function sellReward(state: GameState, id: string): ShopResult {
  const r = state.rewards.find((x) => x.id === id);
  if (!r || !r.unlocked || r.gift) return { state, events: [] };
  const gain = resalePrice(rewardPrice(r));
  return {
    state: { ...state, eclats: state.eclats + gain, rewards: patchReward(state, id, { unlocked: false }) },
    events: [],
  };
}

export interface GambleResult extends ShopResult {
  win?: boolean;
  ticket?: boolean;
}

export function gambleReward(state: GameState, id: string, roll = Math.random(), today = dayKey()): GambleResult {
  const r = state.rewards.find((x) => x.id === id);
  if (!r || !r.unlocked) return { state, events: [] };
  const cost = gamblePrice(rewardPrice(r));
  if (state.eclats < cost) return { state, events: [], error: missing(cost - state.eclats, 'pour tenter ta chance') };
  const base = { ...state, eclats: state.eclats - cost, spent: state.spent + cost };
  if (roll < GAMBLE_CHANCE) {
    const badges = { ...enjoyBadge(state, today) };
    const events: GameEvent[] = [];
    if (!state.badges['first-reward']) events.push({ type: 'badge', id: 'first-reward' });
    if (!badges['gamble-win']) {
      badges['gamble-win'] = today;
      events.push({ type: 'badge', id: 'gamble-win' });
    }
    return {
      state: { ...base, losses: 0, enjoyed: state.enjoyed + 1, rewards: patchReward(state, id, { uses: r.uses + 1 }), badges },
      events,
      win: true,
    };
  }
  const losses = state.losses + 1;
  if (losses >= GOLDEN_TICKET_AFTER) {
    const first = !state.badges['golden-ticket'];
    return {
      state: {
        ...base,
        losses: 0,
        tickets: state.tickets + 1,
        badges: first ? { ...state.badges, 'golden-ticket': today } : state.badges,
      },
      events: first ? [{ type: 'badge', id: 'golden-ticket' }] : [],
      win: false,
      ticket: true,
    };
  }
  return { state: { ...base, losses }, events: [], win: false };
}

/** Golden ticket: enjoy once any pleasure that costs no real money, even locked. */
export function spendTicket(state: GameState, id: string, today = dayKey()): ShopResult {
  const r = state.rewards.find((x) => x.id === id);
  if (!r || r.C !== 0 || state.tickets < 1) return { state, events: [] };
  const first = !state.badges['first-reward'];
  return {
    state: {
      ...state,
      tickets: state.tickets - 1,
      enjoyed: state.enjoyed + 1,
      rewards: patchReward(state, id, { uses: r.uses + 1 }),
      badges: enjoyBadge(state, today),
    },
    events: first ? [{ type: 'badge', id: 'first-reward' }] : [],
  };
}

export function buyFreeze(state: GameState): ShopResult {
  if (state.streak.freezes >= FREEZE_MAX) return { state, events: [], error: `Tu as déjà ${FREEZE_MAX} gels en stock.` };
  if (state.eclats < FREEZE_PRICE) return { state, events: [], error: missing(FREEZE_PRICE - state.eclats, 'pour un gel') };
  return {
    state: {
      ...state,
      eclats: state.eclats - FREEZE_PRICE,
      spent: state.spent + FREEZE_PRICE,
      streak: { ...state.streak, freezes: state.streak.freezes + 1 },
    },
    events: [],
  };
}

export interface RewardInput {
  name: string;
  emoji: string;
  D: number;
  C: number;
  G: number;
}

/** A pleasure created while free unlocks remain is born unlocked, as a gift. */
export function addReward(state: GameState, input: RewardInput): GameState {
  const free = state.freeUnlocks > 0;
  const reward: Reward = {
    id: uid('r'),
    name: input.name.trim(),
    emoji: input.emoji,
    D: input.D,
    C: input.C,
    G: input.G,
    unlocked: free,
    gift: free,
    custom: true,
    uses: 0,
  };
  return { ...state, freeUnlocks: free ? state.freeUnlocks - 1 : state.freeUnlocks, rewards: [...state.rewards, reward] };
}

export function deleteReward(state: GameState, id: string): GameState {
  return { ...state, rewards: state.rewards.filter((r) => r.id !== id) };
}

// ---------- Derived stats ----------

export function dayCounts(state: GameState): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of state.completions) out[c.day] = (out[c.day] ?? 0) + 1;
  return out;
}

export function rarityCounts(state: GameState): Record<Rarity, number> {
  const out: Record<Rarity, number> = { commun: 0, rare: 0, epique: 0, legendaire: 0, mythique: 0 };
  for (const c of state.completions) out[c.rarity]++;
  return out;
}

/** Level 30 days ago, from the XP earned since then. */
export function levelDaysAgo(state: GameState, days: number, today = dayKey()): number {
  const from = addDays(today, -days);
  const recent = state.completions.filter((c) => c.day > from).reduce((sum, c) => sum + c.xp, 0);
  return levelInfo(state.totalXp - recent).level;
}
