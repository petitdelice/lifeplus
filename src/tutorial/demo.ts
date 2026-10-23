// The make-believe save the first-launch tutorial plays on. It never reaches localStorage.
import { addTask, initialState, type GameState } from '../game/engine';
import { addDays, dayKey } from '../game/rules';

/** Just under level 2, so the first ticked task shows a level-up. */
export const DEMO_XP = 95;
/** Enough to use any default pleasure once it is unlocked. */
export const DEMO_ECLATS = 350;

export function demoState(today = dayKey()): GameState {
  let s = initialState(today);
  s = addTask(s, { title: "Boire un grand verre d'eau", kind: 'normal', duration: 1, flemme: 1 }, today);
  s = addTask(s, { title: '10 min d’étirements', kind: 'recurring', duration: 1, flemme: 3, recurrence: 'daily' }, today);
  s = addTask(s, { title: 'Répondre au mail qui traîne', kind: 'normal', duration: 2, flemme: 4 }, today);
  s = addTask(
    s,
    {
      title: 'Ranger l’appart',
      kind: 'project',
      duration: 3,
      flemme: 3,
      steps: [
        { title: 'Le bureau', duration: 2, flemme: 2 },
        { title: 'La cuisine', duration: 2, flemme: 3 },
        { title: 'Le grenier', duration: 3, flemme: 4 },
      ],
    },
    today,
  );
  s = addTask(s, { title: 'Faire ma déclaration d’impôts', kind: 'normal', duration: 4, flemme: 5 }, today);
  s = addTask(s, { title: 'Déménager', kind: 'normal', duration: 5, flemme: 5 }, today);

  // The routine was done yesterday too, so its regularity bonus shows.
  const tasks = s.tasks.map((t) => (t.kind === 'recurring' ? { ...t, lastPeriod: addDays(today, -1), chain: 2 } : t));
  return { ...s, tasks, totalXp: DEMO_XP, eclats: DEMO_ECLATS, earned: DEMO_ECLATS };
}
