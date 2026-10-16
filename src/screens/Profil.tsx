import { useRef, useState } from 'react';
import { useGame, snapshot } from '../store/game';
import { BUY_ME_A_COFFEE_URL } from '../config';
import { STREAK_TIERS, levelInfo } from '../game/rules';
import { fmt, fmtMult } from '../game/rarity';
import { Button, Confirm } from '../components/ui';
import { Coffee } from '../components/icons';
import type { GameState } from '../game/engine';

const RULES: [string, string][] = [
  ['Raretés', 'À la création, tu dis combien de temps prend la tâche et quelle flemme elle te donne. Plus elle est pénible, plus elle rapporte.'],
  ['Types', 'Les tâches récurrentes gagnent +10 % par fois d’affilée (jusqu’à +50 %). Les projets rapportent plus à chaque étape, et la dernière ajoute 50 % de bonus.'],
  ['Streak', `Un jour compte dès qu’une tâche est faite. Bonus : ${STREAK_TIERS.map((t) => `${fmtMult(t.mult)} à ${t.days} jours`).join(', ')}.`],
  ['Shop', 'Un plaisir se débloque une fois (3 × son prix), puis se paie à chaque utilisation. Le gamble coûte la moitié du prix pour 20 % de chance.'],
  ['Règle d’or', 'Les éclats et l’XP gagnés ne sont jamais retirés : ils représentent ton travail. Seuls les bonus peuvent retomber.'],
];

export function ProfilScreen() {
  const state = useGame();
  const { importData, resetAll, showToast } = state;
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const level = levelInfo(state.totalXp).level;

  const exportData = () => {
    const blob = new Blob([JSON.stringify(snapshot(state), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lifeplus-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Sauvegarde téléchargée', 'good');
  };

  const onImport = async (file: File) => {
    try {
      const data = JSON.parse(await file.text()) as GameState;
      if (data.version !== 1 || !Array.isArray(data.tasks) || !Array.isArray(data.rewards)) throw new Error('format');
      importData(data);
      showToast('Sauvegarde restaurée !', 'good');
    } catch {
      showToast("Ce fichier n'est pas une sauvegarde lifeplus.", 'info');
    }
  };

  return (
    <div className="flex flex-col gap-5 pt-4">
      <h1 className="font-display text-2xl font-bold">Profil</h1>

      <div className="flex items-center gap-4 rounded-3xl bg-white p-4 shadow-card">
        <div className="flex size-14 items-center justify-center rounded-full bg-lemon font-display text-2xl font-bold shadow-[0_4px_0_var(--color-lemon-dark)]">{level}</div>
        <div className="flex flex-col">
          <span className="font-display text-lg font-bold">Niveau {level}</span>
          <span className="text-sm font-semibold text-muted">
            {fmt(state.completions.length)} tâches · {fmt(state.earned)} éclats gagnés
          </span>
        </div>
      </div>

      {BUY_ME_A_COFFEE_URL && (
        <section className="flex flex-col gap-3 rounded-3xl bg-lemon-soft p-5">
          <h2 className="font-display text-lg font-bold">lifeplus est gratuit</h2>
          <p className="text-sm font-medium text-ink/80">Pas de pub, pas de compte, tes données restent sur ton appareil. Si l'appli t'aide, tu peux offrir un café.</p>
          <a
            href={BUY_ME_A_COFFEE_URL}
            target="_blank"
            rel="noreferrer"
            className="press flex min-h-12 items-center justify-center gap-2 self-start rounded-xl bg-lemon px-5 font-display font-semibold text-ink no-underline shadow-[0_3px_0_var(--color-lemon-dark)]"
          >
            <Coffee /> Buy Me a Coffee
          </a>
        </section>
      )}

      <section className="flex flex-col gap-3 rounded-3xl bg-white p-4 shadow-card">
        <h2 className="font-display text-lg font-bold">Comment ça marche</h2>
        <dl className="flex flex-col gap-3">
          {RULES.map(([t, d]) => (
            <div key={t} className="flex flex-col gap-0.5">
              <dt className="font-display text-sm font-bold">{t}</dt>
              <dd className="m-0 text-sm font-medium text-muted">{d}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="flex flex-col gap-3 rounded-3xl bg-white p-4 shadow-card">
        <h2 className="font-display text-lg font-bold">Mes données</h2>
        <p className="text-sm font-medium text-muted">
          Tout est enregistré dans ce navigateur. Télécharge une sauvegarde pour changer d'appareil ou ne rien perdre.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={exportData}>Télécharger une sauvegarde</Button>
          <Button tone="soft" onClick={() => fileRef.current?.click()}>
            Restaurer
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onImport(f);
              e.target.value = '';
            }}
          />
        </div>
        <button type="button" onClick={() => setConfirmReset(true)} className="self-start py-2 text-sm font-semibold text-muted underline">
          Tout recommencer à zéro
        </button>
      </section>

      <Confirm
        open={confirmReset}
        title="Tout recommencer ?"
        confirmLabel="Effacer"
        danger
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          resetAll();
          setConfirmReset(false);
          showToast('Nouveau départ !', 'good');
        }}
      >
        <p className="text-sm font-medium text-muted">Tâches, niveau, éclats et badges seront effacés de cet appareil. Pense à télécharger une sauvegarde avant.</p>
      </Confirm>
    </div>
  );
}
