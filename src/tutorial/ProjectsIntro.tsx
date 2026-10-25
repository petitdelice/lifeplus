// A short tour of the Projets tab, shown the first time it is opened. It plays on the real save: nothing to set up or restore.
import { AnimatePresence, motion } from 'framer-motion';
import { useState, type ReactNode } from 'react';
import { Check, Pencil, Spark, Trash } from '../components/icons';
import { Button } from '../components/ui';
import { STAGE_COLORS } from '../components/stageColors';
import { Modal } from './Tutorial';

const DONE_KEY = 'lifeplus-tuto-projets';

export function projectsIntroDone(): boolean {
  try {
    return localStorage.getItem(DONE_KEY) === 'done';
  } catch {
    return true;
  }
}

function markDone() {
  try {
    localStorage.setItem(DONE_KEY, 'done');
  } catch {
    /* private mode: the tour may show again, nothing else breaks */
  }
}

const [indigo, mint, orange] = STAGE_COLORS;

/** A tiny winding path: two tasks done, the current one, two to come and the finish. */
function MiniPath() {
  const nodes: { x: number; color?: (typeof STAGE_COLORS)[number]; state: 'done' | 'current' | 'later' }[] = [
    { x: 0, color: indigo, state: 'done' },
    { x: 30, color: indigo, state: 'done' },
    { x: 40, color: mint, state: 'current' },
    { x: 22, state: 'later' },
    { x: -14, state: 'later' },
  ];
  return (
    <div className="flex flex-col-reverse items-center gap-1.5" aria-hidden>
      {nodes.map((n, i) => (
        <motion.span
          key={i}
          className="relative flex size-8 items-center justify-center rounded-full text-white"
          style={{
            x: n.x,
            background: n.color?.main ?? '#E6E3F1',
            boxShadow: `0 4px 0 ${n.color?.dark ?? '#CFCBE0'}`,
          }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 13, stiffness: 260, delay: 0.1 + i * 0.08 }}
        >
          {n.state === 'current' && (
            <motion.span
              className="absolute -inset-1.5 rounded-full border-[3px]"
              style={{ borderColor: mint.main }}
              animate={{ scale: [1, 1.15, 1], opacity: [0.7, 0.2, 0.7] }}
              transition={{ repeat: Infinity, duration: 1.8 }}
            />
          )}
          {n.state === 'done' ? <Check size={16} /> : n.state === 'current' ? <Spark size={14} /> : null}
        </motion.span>
      ))}
    </div>
  );
}

/** Gains that climb along the path, then the finish bonus. */
function GrowingGains() {
  const bars = [
    { h: 28, label: '×1', color: indigo },
    { h: 40, label: '×1,3', color: indigo },
    { h: 52, label: '×1,5', color: mint },
    { h: 64, label: '×1,8', color: mint },
  ];
  return (
    <div className="flex h-28 items-end justify-center gap-2.5" aria-hidden>
      {bars.map((b, i) => (
        <div key={i} className="flex flex-col items-center gap-1">
          <span className="text-[11px] font-extrabold" style={{ color: b.color.ink }}>
            {b.label}
          </span>
          <motion.span
            className="w-8 rounded-lg"
            style={{ background: b.color.main, boxShadow: `0 3px 0 ${b.color.dark}` }}
            initial={{ height: 0 }}
            animate={{ height: b.h }}
            transition={{ type: 'spring', damping: 14, stiffness: 180, delay: 0.1 + i * 0.1 }}
          />
        </div>
      ))}
      <div className="flex flex-col items-center gap-1">
        <motion.span
          className="rounded-full px-2 py-0.5 text-[11px] font-extrabold"
          style={{ background: orange.soft, color: orange.ink }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 9, stiffness: 240, delay: 0.6 }}
        >
          +50 %
        </motion.span>
        <motion.span
          className="flex w-10 items-start justify-center rounded-lg pt-1 text-lg"
          style={{ background: orange.main, boxShadow: `0 3px 0 ${orange.dark}` }}
          initial={{ height: 0 }}
          animate={{ height: 80 }}
          transition={{ type: 'spring', damping: 14, stiffness: 180, delay: 0.5 }}
        >
          🏁
        </motion.span>
      </div>
    </div>
  );
}

/** A project card in miniature, with its edit and delete buttons. */
function MiniCard() {
  return (
    <motion.div
      className="flex w-full max-w-60 flex-col gap-2 rounded-2xl bg-white p-3 text-left shadow-card ring-1 ring-line"
      initial={{ y: 10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', damping: 16, stiffness: 240, delay: 0.1 }}
      aria-hidden
    >
      <div className="flex items-center gap-2">
        <span className="text-xl">🎸</span>
        <span className="grow font-display text-sm font-bold">Apprendre la guitare</span>
        <span className="flex text-muted">
          <motion.span className="flex size-7 items-center justify-center rounded-lg" animate={{ backgroundColor: ['#ECEBFE00', '#ECEBFE', '#ECEBFE00'] }} transition={{ repeat: Infinity, duration: 2.2, delay: 0.6 }}>
            <Pencil size={15} />
          </motion.span>
          <motion.span className="flex size-7 items-center justify-center rounded-lg" animate={{ backgroundColor: ['#ECEBFE00', '#ECEBFE', '#ECEBFE00'] }} transition={{ repeat: Infinity, duration: 2.2, delay: 1.7 }}>
            <Trash size={15} />
          </motion.span>
        </span>
      </div>
      <div className="flex gap-1">
        {[indigo, indigo, mint, undefined, undefined].map((c, i) => (
          <span key={i} className="h-1.5 grow rounded-full" style={{ background: c?.main ?? 'var(--color-line)' }} />
        ))}
      </div>
      <span className="text-xs font-semibold text-muted">Prochaine : Enchaîner 3 accords</span>
    </motion.div>
  );
}

const SLIDES: { art: ReactNode; title: string; body: ReactNode }[] = [
  {
    art: <MiniPath />,
    title: 'Un projet, c’est un chemin',
    body: (
      <>
        Un gros objectif devient une suite de petites tâches, rangées en <b>étapes</b>. Tu avances case par case jusqu’à l’arrivée.
      </>
    ),
  },
  {
    art: <GrowingGains />,
    title: 'Ça rapporte de plus en plus',
    body: (
      <>
        Chaque tâche rapporte plus que la précédente, jusqu’à presque <b>deux fois plus</b> vers la fin. La dernière ajoute <b>+50 %</b>, et l’arrivée
        se fête.
      </>
    ),
  },
  {
    art: <MiniCard />,
    title: 'À ton rythme',
    body: (
      <>
        Coche les tâches dans l’ordre que tu veux, elles n’encombrent pas « Aujourd’hui ». Le <b>crayon</b> et la <b>corbeille</b> de chaque carte
        modifient ou suppriment le projet.
      </>
    ),
  },
];

export function ProjectsIntro({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate?: () => void }) {
  const [step, setStep] = useState(0);
  const last = step === SLIDES.length - 1;
  const slide = SLIDES[step];

  const close = (create = false) => {
    markDone();
    onClose();
    setStep(0);
    if (create) onCreate?.();
  };

  return (
    <AnimatePresence>
      {open && (
        <Modal key="projects-intro">
          <div className="flex w-full items-center justify-between">
            <div className="flex gap-1" aria-label={`Étape ${step + 1} sur ${SLIDES.length}`}>
              {SLIDES.map((_, i) => (
                <span key={i} className={`h-1.5 rounded-full transition-all ${i <= step ? 'w-4 bg-indigo' : 'w-1.5 bg-line'}`} />
              ))}
            </div>
            {!last && (
              <button type="button" onClick={() => close()} className="-my-1 py-1 text-xs font-semibold text-muted underline">
                Passer
              </button>
            )}
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              className="flex w-full flex-col items-center gap-3"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.18 }}
            >
              <div className="flex h-48 w-full items-center justify-center rounded-2xl bg-bg px-4">{slide.art}</div>
              <h2 className="font-display text-xl font-bold">{slide.title}</h2>
              <p className="min-h-[6.5rem] text-[15px] leading-relaxed font-medium text-muted [&_b]:text-ink">{slide.body}</p>
            </motion.div>
          </AnimatePresence>
          {last ? (
            onCreate ? (
              <>
                <Button className="mt-1 w-full" onClick={() => close(true)} autoFocus>
                  Créer mon premier projet
                </Button>
                <button type="button" onClick={() => close()} className="py-1 text-sm font-semibold text-muted underline">
                  Plus tard
                </button>
              </>
            ) : (
              <Button className="mt-1 w-full" onClick={() => close()} autoFocus>
                C’est parti
              </Button>
            )
          ) : (
            <Button className="mt-1 w-full" onClick={() => setStep(step + 1)} autoFocus>
              Suivant
            </Button>
          )}
        </Modal>
      )}
    </AnimatePresence>
  );
}
