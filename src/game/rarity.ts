import type { Rarity } from './rules';

export const RARITY_UI: Record<Rarity, { label: string; text: string; bg: string; ring: string }> = {
  commun: { label: 'Commun', text: 'text-r-commun', bg: 'bg-r-commun-bg', ring: 'var(--color-r-commun-ring)' },
  rare: { label: 'Rare', text: 'text-r-rare', bg: 'bg-r-rare-bg', ring: 'var(--color-r-rare-ring)' },
  epique: { label: 'Épique', text: 'text-r-epique', bg: 'bg-r-epique-bg', ring: 'var(--color-r-epique-ring)' },
  legendaire: { label: 'Légendaire', text: 'text-r-legendaire', bg: 'bg-r-legendaire-bg', ring: 'var(--color-r-legendaire-ring)' },
  mythique: { label: 'Mythique', text: 'text-r-mythique', bg: 'bg-r-mythique-bg myth', ring: 'var(--color-r-mythique-ring)' },
};

export const fmt = (n: number) => n.toLocaleString('fr-FR');
export const fmtMult = (m: number) => '×' + m.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
