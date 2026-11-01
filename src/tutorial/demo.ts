// The make-believe save the first-launch tutorial plays on. It never reaches localStorage.
import { addTask, initialState, type GameState } from '../game/engine';
import { addDays, dayKey } from '../game/rules';

/** Just under level 2, so the first ticked task shows a level-up. */
export const DEMO_XP = 95;
/** Enough to use any default pleasure once it is unlocked. */
export const DEMO_ECLATS = 350;

export function demoState(today = dayKey()): GameState {
  let s = initialState(today);
  // One simple task per rarity, so "Aujourd'hui" shows the whole ladder, rarest on top.
  s = addTask(s, { title: "Boire un grand verre d'eau", kind: 'normal', duration: 1, flemme: 1 }, today);
  s = addTask(s, { title: 'Lancer une machine', kind: 'normal', duration: 1, flemme: 3 }, today);
  s = addTask(s, { title: 'Répondre au mail qui traîne', kind: 'normal', duration: 2, flemme: 4 }, today);
  s = addTask(s, { title: 'Faire ma déclaration d’impôts', kind: 'normal', duration: 4, flemme: 5 }, today);
  s = addTask(s, { title: 'Déménager', kind: 'normal', duration: 5, flemme: 5 }, today);
  // Two frequencies, so Récurrentes shows its dividers and filters.
  s = addTask(s, { title: '10 min d’étirements', kind: 'recurring', duration: 1, flemme: 3, recurrence: 'daily' }, today);
  s = addTask(s, { title: 'Arroser les plantes', kind: 'recurring', duration: 1, flemme: 1, recurrence: 'weekly' }, today);
  // Same example as the Projets tour.
  s = addTask(
    s,
    {
      title: 'Apprendre la guitare',
      kind: 'project',
      duration: 3,
      flemme: 3,
      emoji: '🎸',
      stages: [
        {
          title: 'Les bases',
          tasks: [
            { title: 'Accorder la guitare', duration: 1, flemme: 2 },
            { title: 'Apprendre 3 accords', duration: 2, flemme: 3 },
            { title: 'Enchaîner 3 accords', duration: 2, flemme: 3 },
          ],
        },
        {
          title: 'Un premier morceau',
          tasks: [
            { title: 'Choisir un morceau facile', duration: 1, flemme: 1 },
            { title: 'Le jouer en entier', duration: 3, flemme: 4 },
          ],
        },
      ],
    },
    today,
  );

  // The daily routine was done yesterday too, so its regularity bonus shows.
  const tasks = s.tasks.map((t) => (t.recurrence === 'daily' ? { ...t, lastPeriod: addDays(today, -1), chain: 2 } : t));
  return { ...s, tasks, totalXp: DEMO_XP, eclats: DEMO_ECLATS, earned: DEMO_ECLATS };
}
