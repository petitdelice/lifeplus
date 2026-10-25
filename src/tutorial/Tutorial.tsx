import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import { useGame } from '../store/game';
import type { GameState } from '../game/engine';
import { RARITIES, RARITY_GAINS } from '../game/rules';
import { RarityChip } from '../screens/TaskForm';
import { Button } from '../components/ui';
import { useTuto } from './store';

type Route = 'taches' | 'shop' | 'chemin' | 'profil';

interface StepDef {
  /** Centered card instead of the coach bubble. */
  modal?: boolean;
  route?: Route;
  /** data-tuto value of the element to light up. */
  target?: string;
  title: string;
  body: ReactNode;
  /** Waits for the player to do it instead of showing a "Suivant" button. */
  until?: (s: GameState) => boolean;
}

const STEPS: StepDef[] = [
  { modal: true, title: 'Bienvenue sur lifeplus 👋', body: null },
  {
    route: 'taches',
    title: 'Une journée de démo',
    body: (
      <>
        <p>Chaque tâche a une rareté, calculée selon sa durée et la flemme qu’elle te donne. Plus elle est pénible, plus elle rapporte.</p>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {RARITIES.map((r) => (
            <span key={r} className="flex items-center gap-1">
              <RarityChip rarity={r} />
              <span className="text-xs font-bold text-muted">{RARITY_GAINS[r].xp} XP</span>
            </span>
          ))}
        </div>
      </>
    ),
  },
  {
    route: 'taches',
    target: 'check',
    title: 'À toi de jouer',
    body: <p>Coche une tâche en touchant le rond à gauche. Une erreur de clic ? Touche-le à nouveau, sans aucune pénalité.</p>,
    until: (s) => s.completions.length > 0,
  },
  {
    route: 'taches',
    target: 'level',
    title: 'XP et Éclats',
    body: (
      <p>
        Bien joué ! L’<b>XP</b> remplit ta barre de niveau, sans niveau maximum, et chaque niveau t’offre un bonus. Les <b>Éclats ✨</b> sont ta monnaie
        pour te faire plaisir. Ce que tu gagnes ne t’est jamais retiré.
      </p>
    ),
  },
  {
    route: 'taches',
    target: 'tabs',
    title: 'Trois types de tâches',
    body: (
      <p>
        Les <b>simples</b>, à faire une fois. Les <b>récurrentes</b>, chaque jour, semaine ou mois, avec un bonus de régularité jusqu’à +50 %. Et les{' '}
        <b>projets</b>, de vrais chemins : des étapes avec leurs tâches, chacune rapporte plus que la précédente, et l’arrivée ajoute +50 %.
      </p>
    ),
  },
  {
    route: 'taches',
    target: 'add',
    title: 'Créer une tâche',
    body: <p>Touche le + pour ajouter les tiennes. Tu indiques sa durée et ta flemme, la rareté se calcule toute seule.</p>,
  },
  {
    route: 'taches',
    target: 'streak',
    title: 'Ta flamme',
    body: (
      <p>
        Le streak compte les jours d’affilée avec au moins une tâche. À 3, 7, 14 et 30 jours : un coffre d’Éclats et des gains multipliés. Un jour sans ?
        Aucun souci, ton record reste gravé et tes Éclats aussi.
      </p>
    ),
  },
  {
    route: 'shop',
    target: 'unlock',
    title: 'Le Shop',
    body: <p>Tes Éclats s’échangent ici contre de vrais plaisirs. Un plaisir se débloque une fois, puis se paie à chaque utilisation. Débloque celui qui te fait envie, c’est offert.</p>,
    until: (s) => s.rewards.some((r) => r.unlocked),
  },
  {
    route: 'shop',
    target: 'enjoy',
    title: 'Fais-toi plaisir',
    body: <p>Il est à toi. Quand tu te l’offres pour de vrai, touche « Utiliser » : il coûte son prix en Éclats.</p>,
    until: (s) => s.enjoyed > 0,
  },
  {
    route: 'shop',
    target: 'gamble',
    title: 'Tenter ta chance',
    body: (
      <p>
        Le Gamble coûte moitié prix, avec 20 % de chance de gagner. Après 8 essais sans chance, un ticket d’or t’est offert. Plus bas, le gel de streak
        protège ta flamme un jour sans tâche.
      </p>
    ),
  },
  {
    route: 'chemin',
    target: 'badges',
    title: 'Ton chemin',
    body: <p>Ici, tout ce que tu as accompli : badges, calendrier et grands moments. On ne regarde que le progrès.</p>,
  },
  { modal: true, title: 'Prêt pour de vrai ?', body: null },
];

/** First visible element for a data-tuto key (the wallet and flame exist twice, for phone and desktop). */
function findTarget(key: string): HTMLElement | null {
  for (const el of document.querySelectorAll<HTMLElement>(`[data-tuto="${key}"]`)) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

/** Follows the target's box every frame, so scrolling and layout animations stay in sync. */
function useTargetRect(key: string | undefined, step: number) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  useLayoutEffect(() => {
    setRect(null);
    if (!key) return;
    let raf = 0;
    let scrolled = false;
    const started = performance.now();
    const loop = () => {
      const el = findTarget(key);
      if (el && !scrolled && performance.now() - started > 250) {
        scrolled = true;
        const r = el.getBoundingClientRect();
        if (r.top < 80 || r.bottom > window.innerHeight - 260) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
      const r = el?.getBoundingClientRect() ?? null;
      setRect((old) => (old && r && old.x === r.x && old.y === r.y && old.width === r.width && old.height === r.height ? old : r));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [key, step]);
  return rect;
}

function Dots({ step }: { step: number }) {
  const total = STEPS.length - 2;
  return (
    <div className="flex gap-1" aria-label={`Étape ${step} sur ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`h-1.5 rounded-full transition-all ${i < step ? 'w-4 bg-indigo' : 'w-1.5 bg-line'}`} />
      ))}
    </div>
  );
}

function Modal({ children }: { children: ReactNode }) {
  return (
    <motion.div
      className="fixed inset-0 z-[65] flex items-center justify-center bg-ink/55 p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', damping: 16, stiffness: 260 }}
        className="flex w-full max-w-sm flex-col items-center gap-3 rounded-3xl bg-white px-6 pt-7 pb-6 text-center shadow-pop"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

export function Tutorial() {
  const { active, replay, step, next, finish } = useTuto();
  const events = useGame((s) => s.events);
  const def = active ? STEPS[step] : undefined;
  const rect = useTargetRect(def?.target, step);

  // Each step opens its own screen.
  useEffect(() => {
    if (def?.route && window.location.hash !== `#/${def.route}`) window.location.hash = `/${def.route}`;
  }, [def]);

  // Action steps move on by themselves once done and the celebrations are closed.
  useEffect(() => {
    if (!def?.until) return;
    const check = (s: ReturnType<typeof useGame.getState>) => {
      if (s.events.length === 0 && def.until!(s)) next();
    };
    check(useGame.getState());
    return useGame.subscribe(check);
  }, [def, next]);

  if (!def) return null;

  if (def.modal) {
    const last = step === STEPS.length - 1;
    return (
      <AnimatePresence>
        {events.length === 0 && (
          <Modal key={step}>
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', damping: 9, stiffness: 220, delay: 0.1 }}
              className="flex size-20 items-center justify-center rounded-full bg-indigo-soft text-4xl"
              aria-hidden
            >
              {last ? '🌱' : '✨'}
            </motion.div>
            <h2 className="font-display text-2xl font-bold">{def.title}</h2>
            {last ? (
              <p className="text-[15px] font-medium text-muted">
                {replay
                  ? 'On range la partie de démo et ta vraie partie revient, exactement là où tu l’avais laissée.'
                  : 'On efface la partie de démo : tu démarres au Niveau 1 avec 0 Éclats. Commence par une petite tâche, ça compte déjà.'}
              </p>
            ) : (
              <p className="text-[15px] font-medium text-muted">
                Ici, tes tâches deviennent un jeu : tu gagnes de l’XP et des Éclats, puis tu les échanges contre de vrais plaisirs.{' '}
                {replay
                  ? 'Le tour se fait sur une partie de démo, ta vraie partie est mise de côté et revient intacte à la fin.'
                  : 'Petit tour guidé sur une partie de démo : à la fin, tout est effacé et tu commences à zéro.'}
              </p>
            )}
            <Button className="mt-2 w-full" onClick={last ? finish : next} autoFocus>
              {last ? (replay ? 'Retrouver ma partie' : 'Commencer à zéro') : 'Faire le tour'}
            </Button>
            {!last && (
              <button type="button" onClick={finish} className="py-1 text-sm font-semibold text-muted underline">
                Passer le tuto
              </button>
            )}
          </Modal>
        )}
      </AnimatePresence>
    );
  }

  // Keep the bubble away from what it points at.
  const onTop = !!rect && rect.top + rect.height / 2 > window.innerHeight * 0.55;
  const hidden = events.length > 0;

  return (
    <>
      {rect && !hidden && (
        <motion.div
          aria-hidden
          className="pointer-events-none fixed z-[35] rounded-2xl"
          initial={false}
          animate={{
            left: rect.left - 6,
            top: rect.top - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            boxShadow: ['0 0 0 3px rgba(91,76,240,0.9), 0 0 0 0 rgba(91,76,240,0.35)', '0 0 0 3px rgba(91,76,240,0.9), 0 0 0 10px rgba(91,76,240,0)'],
          }}
          transition={{ default: { type: 'spring', damping: 26, stiffness: 300 }, boxShadow: { repeat: Infinity, duration: 1.4 } }}
        />
      )}
      <AnimatePresence mode="wait">
        {!hidden && (
          <motion.div
            key={step}
            role="dialog"
            aria-label={def.title}
            initial={{ opacity: 0, y: onTop ? -14 : 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            transition={{ type: 'spring', damping: 22, stiffness: 300 }}
            className={`fixed inset-x-3 z-[35] mx-auto flex max-w-md flex-col gap-2 rounded-3xl bg-white p-4 shadow-pop ring-1 ring-line md:right-6 md:left-auto md:mx-0 md:w-[380px] ${
              onTop ? 'top-[max(0.75rem,env(safe-area-inset-top))]' : 'bottom-[calc(6.5rem+env(safe-area-inset-bottom))] md:bottom-28'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <Dots step={step} />
              <button type="button" onClick={finish} className="-my-1 py-1 text-xs font-semibold text-muted underline">
                Passer le tuto
              </button>
            </div>
            <h2 className="font-display text-lg font-bold">{def.title}</h2>
            <div className="text-sm leading-relaxed font-medium text-muted [&_b]:text-ink">{def.body}</div>
            {def.until ? (
              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="flex items-center gap-2 font-display text-sm font-semibold text-indigo">
                  <motion.span animate={{ scale: [1, 1.4, 1] }} transition={{ repeat: Infinity, duration: 1.2 }} className="size-2 rounded-full bg-indigo" />
                  À toi
                </span>
                <button type="button" onClick={next} className="py-1 text-xs font-semibold text-muted underline">
                  Passer cette étape
                </button>
              </div>
            ) : (
              <Button className="self-end" onClick={next}>
                Suivant
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
