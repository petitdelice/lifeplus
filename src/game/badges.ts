export interface BadgeDef {
  id: string;
  name: string;
  hint: string;
  emoji: string;
}

// Shown in the Chemin showcase in this order; badges not yet earned appear as silhouettes.
export const BADGES: BadgeDef[] = [
  { id: 'first-task', name: 'Premier pas', hint: 'Termine ta première tâche', emoji: '👣' },
  { id: 'tasks-50', name: 'Lancé', hint: 'Termine 50 tâches', emoji: '🚀' },
  { id: 'tasks-200', name: 'Inarrêtable', hint: 'Termine 200 tâches', emoji: '🌪️' },
  { id: 'first-legendaire', name: 'Légende', hint: 'Termine une tâche légendaire', emoji: '🏆' },
  { id: 'first-mythique', name: 'Mythe vivant', hint: 'Termine une tâche mythique', emoji: '🦄' },
  { id: 'project-1', name: 'Bâtisseur', hint: 'Termine un projet', emoji: '🧱' },
  { id: 'project-5', name: 'Architecte', hint: 'Termine 5 projets', emoji: '🏛️' },
  { id: 'streak-3', name: 'Étincelle', hint: 'Streak de 3 jours', emoji: '✨' },
  { id: 'streak-7', name: 'Une semaine', hint: 'Streak de 7 jours', emoji: '🔥' },
  { id: 'streak-14', name: 'Deux semaines', hint: 'Streak de 14 jours', emoji: '☄️' },
  { id: 'streak-30', name: 'Flamme éternelle', hint: 'Streak de 30 jours', emoji: '🌋' },
  { id: 'level-5', name: 'Niveau 5', hint: 'Atteins le niveau 5', emoji: '⭐' },
  { id: 'level-10', name: 'Niveau 10', hint: 'Atteins le niveau 10', emoji: '🌟' },
  { id: 'level-20', name: 'Niveau 20', hint: 'Atteins le niveau 20', emoji: '💫' },
  { id: 'level-50', name: 'Niveau 50', hint: 'Atteins le niveau 50', emoji: '👑' },
  { id: 'first-reward', name: 'Bien mérité', hint: 'Profite de ton premier plaisir', emoji: '🎁' },
  { id: 'gamble-win', name: 'Coup de chance', hint: 'Gagne un gamble', emoji: '🎰' },
  { id: 'golden-ticket', name: "Ticket d'or", hint: "Obtiens un ticket d'or", emoji: '🎫' },
];

export const badgeById = (id: string) => BADGES.find((b) => b.id === id);

export const LEVEL_BADGES = [5, 10, 20, 50];
export const TASK_COUNT_BADGES = [50, 200];
