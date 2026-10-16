import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as E from '../game/engine';
import type { GameEvent, GameState, RewardInput, ShopResult, TaskInput } from '../game/engine';

interface Toast {
  id: number;
  text: string;
  kind: 'good' | 'info' | 'gold';
}

interface Store extends GameState {
  /** Celebrations waiting to be shown, one at a time. Not saved. */
  events: GameEvent[];
  toast: Toast | null;
  /** Bumped by the + button so the tasks screen opens its form. */
  newTaskTick: number;

  addTask: (input: TaskInput) => void;
  updateTask: (id: string, input: TaskInput) => void;
  deleteTask: (id: string) => void;
  complete: (taskId: string, stepId?: string) => { xp: number; eclats: number } | null;
  undo: (taskId: string, stepId?: string) => boolean;
  refreshDay: () => void;

  visitShop: () => void;
  enjoy: (id: string) => boolean;
  unlock: (id: string) => boolean;
  sell: (id: string) => void;
  gamble: (id: string) => E.GambleResult | null;
  spendTicket: (id: string) => boolean;
  buyFreeze: () => boolean;
  addReward: (input: RewardInput) => void;
  deleteReward: (id: string) => void;

  requestNewTask: () => void;
  shiftEvent: () => void;
  pushEvents: (events: GameEvent[]) => void;
  showToast: (text: string, kind?: Toast['kind']) => void;
  importData: (data: GameState) => void;
  resetAll: () => void;
}

const gameKeys = Object.keys(E.initialState()) as (keyof GameState)[];

export function snapshot(s: Store): GameState {
  const out = {} as Record<string, unknown>;
  for (const k of gameKeys) out[k] = s[k];
  return out as unknown as GameState;
}

let toastId = 0;

export const useGame = create<Store>()(
  persist(
    (set, get) => {
      /** Run a shop transition: apply state, queue events, toast errors. */
      const shop = (r: ShopResult) => {
        if (r.error) {
          get().showToast(r.error, 'info');
          return false;
        }
        set({ ...r.state, events: [...get().events, ...r.events] });
        return true;
      };

      return {
        ...E.initialState(),
        events: [],
        toast: null,
        newTaskTick: 0,

        addTask: (input) => set(E.addTask(snapshot(get()), input)),
        updateTask: (id, input) => set(E.updateTask(snapshot(get()), id, input)),
        deleteTask: (id) => set(E.deleteTask(snapshot(get()), id)),
        complete: (taskId, stepId) => {
          const r = E.completeTask(snapshot(get()), taskId, stepId);
          if (!r) return null;
          set({ ...r.state, events: [...get().events, ...r.events] });
          return { xp: r.xp, eclats: r.eclats };
        },
        undo: (taskId, stepId) => {
          const s = E.undoTask(snapshot(get()), taskId, stepId);
          if (!s) return false;
          set(s);
          return true;
        },
        refreshDay: () => {
          const r = E.refreshDay(snapshot(get()));
          if (r.events.length) set({ ...r.state, events: [...get().events, ...r.events] });
        },

        visitShop: () => {
          const r = E.visitShop(snapshot(get()));
          if (r.events.length) set({ ...r.state, events: [...get().events, ...r.events] });
        },
        enjoy: (id) => shop(E.enjoyReward(snapshot(get()), id)),
        unlock: (id) => shop(E.unlockReward(snapshot(get()), id)),
        sell: (id) => void shop(E.sellReward(snapshot(get()), id)),
        gamble: (id) => {
          const r = E.gambleReward(snapshot(get()), id);
          if (r.error) {
            get().showToast(r.error, 'info');
            return null;
          }
          // Events (badges) are queued by the caller once the spin animation ends.
          set(r.state);
          return r;
        },
        spendTicket: (id) => shop(E.spendTicket(snapshot(get()), id)),
        buyFreeze: () => shop(E.buyFreeze(snapshot(get()))),
        addReward: (input) => set(E.addReward(snapshot(get()), input)),
        deleteReward: (id) => set(E.deleteReward(snapshot(get()), id)),

        requestNewTask: () => set({ newTaskTick: get().newTaskTick + 1 }),
        shiftEvent: () => set({ events: get().events.slice(1) }),
        pushEvents: (events) => set({ events: [...get().events, ...events] }),
        showToast: (text, kind = 'good') => set({ toast: { id: ++toastId, text, kind } }),
        importData: (data) => set({ ...E.initialState(), ...data, events: [] }),
        resetAll: () => set({ ...E.initialState(), events: [], toast: null }),
      };
    },
    {
      name: 'lifeplus-v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => snapshot(s),
    },
  ),
);
