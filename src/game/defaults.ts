import { usagePrice } from './rules';

export interface RewardSeed {
  id: string;
  name: string;
  emoji: string;
  D: number;
  C: number;
  G: number;
}

// The shop's default pleasures (doc: "une dizaine de plaisirs par défaut").
export const DEFAULT_REWARDS: RewardSeed[] = [
  { id: 'serie', name: 'Épisode de série', emoji: '📺', D: 2, C: 0, G: 1 },
  { id: 'jeu', name: 'Session de jeu vidéo', emoji: '🎮', D: 2, C: 0, G: 2 },
  { id: 'grasse', name: 'Grasse matinée', emoji: '😴', D: 3, C: 0, G: 2 },
  { id: 'bain', name: 'Bain ou moment détente', emoji: '🛁', D: 2, C: 0, G: 1 },
  { id: 'patisserie', name: 'Pâtisserie', emoji: '🧁', D: 1, C: 1, G: 3 },
  { id: 'fastfood', name: 'Fast-food', emoji: '🍔', D: 2, C: 1, G: 3 },
  { id: 'cinema', name: 'Séance de cinéma', emoji: '🎬', D: 3, C: 2, G: 1 },
  { id: 'shopping', name: 'Petit achat plaisir', emoji: '🛍️', D: 2, C: 3, G: 2 },
  { id: 'resto', name: 'Restaurant', emoji: '🍝', D: 3, C: 3, G: 1 },
  { id: 'weekend', name: 'Week-end', emoji: '🧳', D: 5, C: 4, G: 1 },
];

export const priceOf = (r: { D: number; C: number; G: number }) => usagePrice(r.D, r.C, r.G);

export const REWARD_EMOJIS = ['🎁', '📺', '🎮', '🍕', '🍔', '🧁', '🍦', '☕', '🎬', '🎧', '📚', '🛁', '😴', '🛍️', '🍝', '🧳', '🏖️', '🎨', '🌳', '🍫'];

export const TASK_SUGGESTIONS = [
  { title: 'Sortir les poubelles', duration: 1, flemme: 1 },
  { title: 'Faire les courses', duration: 2, flemme: 2 },
  { title: 'Ranger le bureau', duration: 2, flemme: 3 },
  { title: 'Appeler la banque', duration: 1, flemme: 4 },
];
