import { create } from 'zustand';
import { hasSave, setSandbox, useGame } from '../store/game';
import { demoState } from './demo';

const DONE_KEY = 'lifeplus-tuto';

function tutoDone(): boolean {
  try {
    return localStorage.getItem(DONE_KEY) === 'done';
  } catch {
    return true;
  }
}

/** Read once at load, before anything can be saved: only a brand-new player gets the tour by itself. */
export const firstLaunch = !hasSave() && !tutoDone();

interface Tuto {
  active: boolean;
  /** Replayed from the profile: the real save comes back at the end instead of a fresh start. */
  replay: boolean;
  step: number;
  /** Bumped at the end so every screen remounts on the restored state. */
  gen: number;
  start: () => void;
  next: () => void;
  finish: () => void;
}

export const useTuto = create<Tuto>()((set, get) => ({
  active: false,
  replay: false,
  step: 0,
  gen: 0,

  start: () => {
    if (get().active) return;
    setSandbox(true);
    useGame.setState({ ...demoState(), events: [], toast: null });
    set({ active: true, replay: hasSave(), step: 0 });
  },

  next: () => set({ step: get().step + 1 }),

  finish: () => {
    const { replay } = get();
    setSandbox(false);
    try {
      localStorage.setItem(DONE_KEY, 'done');
    } catch {
      /* private mode: the tour may show again, nothing else breaks */
    }
    if (hasSave()) {
      // The sandbox never wrote, so the stored save is the real one, untouched.
      void useGame.persist.rehydrate();
      useGame.setState({ events: [], toast: null });
    } else {
      useGame.getState().resetAll();
    }
    set({ active: false, step: 0, gen: get().gen + 1 });
    window.location.hash = '/taches';
    useGame.getState().showToast(replay ? 'Ta partie est de retour !' : 'C’est parti, à toi de jouer !', 'good');
  },
}));
