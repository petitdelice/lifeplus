import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useGame, snapshot } from '../store/game';
import { findUndoable, previewGains, type Step, type Task } from '../game/engine';
import { DURATION_LABELS, FLEMME_LABELS, dayKey, parseDay } from '../game/rules';
import { RARITY_UI, fmt } from '../game/rarity';
import { Button, Sheet } from '../components/ui';
import { Check, Spark, Trash } from '../components/icons';
import { RarityChip } from './TaskForm';
import { ConfirmDeleteProject, ProjectFunnel } from './ProjectFunnel';
import { STAGE_COLORS } from '../components/stageColors';

/** Sideways offset of each node, so the path winds like a trail. */
const WIND = [0, 44, 66, 44, 0, -44, -66, -44];

export const projectHref = (id: string) => `#/projet/${id}`;

/** Where the player is on the path: the first task not done yet. */
export function currentStep(task: Task): Step | undefined {
  return task.steps.find((s) => !s.doneDay);
}

export function projectProgress(task: Task) {
  const done = task.steps.filter((s) => s.doneDay).length;
  const cur = currentStep(task);
  const stageIndex = cur ? task.stages.findIndex((g) => g.id === cur.stageId) : task.stages.length - 1;
  return { done, total: task.steps.length, pct: task.steps.length ? (done / task.steps.length) * 100 : 0, stageIndex, current: cur };
}

function scrollToCurrent() {
  document.querySelector('[data-tuto="path-node"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

const dateLabel = (key: string) => parseDay(key).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });

function vibrate(ms: number) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* not supported */
  }
}

function Node({
  step,
  index,
  color,
  state,
  float,
  onOpen,
}: {
  step: Step;
  index: number;
  color: (typeof STAGE_COLORS)[number];
  state: 'done' | 'current' | 'later';
  float?: string;
  onOpen: () => void;
}) {
  const ui = RARITY_UI[step.rarity];
  const x = WIND[index % WIND.length];
  const bg = state === 'later' ? '#E6E3F1' : color.main;
  const shadow = state === 'later' ? '#CFCBE0' : color.dark;
  return (
    <motion.li
      className="relative flex flex-col items-center gap-1.5"
      style={{ x }}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', damping: 14, stiffness: 260, delay: Math.min(index, 12) * 0.05 }}
    >
      {state === 'current' && (
        <motion.span
          className="absolute -top-9 z-10 rounded-xl bg-white px-3 py-1 font-display text-xs font-bold whitespace-nowrap shadow-card"
          style={{ color: color.ink }}
          animate={{ y: [0, -4, 0] }}
          transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
        >
          À toi !
          <span className="absolute -bottom-1 left-1/2 size-2.5 -translate-x-1/2 rotate-45 bg-white" />
        </motion.span>
      )}
      <motion.button
        type="button"
        onClick={onOpen}
        whileTap={{ scale: 0.92, y: 4 }}
        aria-label={`${step.title}${state === 'done' ? ' : fait' : state === 'current' ? ' : à faire maintenant' : ''}`}
        data-tuto={state === 'current' ? 'path-node' : undefined}
        className="relative flex size-[72px] items-center justify-center rounded-full text-white"
        style={{ background: bg, boxShadow: `0 6px 0 ${shadow}` }}
      >
        {state === 'current' && (
          <motion.span
            aria-hidden
            className="absolute -inset-2 rounded-full border-4"
            style={{ borderColor: color.main }}
            animate={{ scale: [1, 1.12, 1], opacity: [0.7, 0.2, 0.7] }}
            transition={{ repeat: Infinity, duration: 1.8 }}
          />
        )}
        {state === 'done' ? <Check size={32} /> : state === 'current' ? <Spark size={30} /> : <span className="font-display text-2xl font-bold text-off">{index + 1}</span>}
        <span className="absolute -right-1 -bottom-1 size-5 rounded-full border-[3px] border-bg" style={{ background: ui.ring }} aria-hidden />
      </motion.button>
      <span className={`mt-1.5 max-w-44 text-center text-sm leading-tight font-extrabold ${state === 'later' ? 'text-muted' : ''}`}>{step.title}</span>
      <AnimatePresence>
        {float && (
          <motion.span
            key={float}
            initial={{ y: 0, opacity: 0 }}
            animate={{ y: -60, opacity: [0, 1, 1, 0] }}
            transition={{ duration: 1.3, ease: 'easeOut' }}
            className="pointer-events-none absolute top-0 font-display text-lg font-bold whitespace-nowrap"
            style={{ color: color.ink }}
          >
            {float}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

export function ProjectScreen({ id }: { id: string }) {
  const state = useGame();
  const { complete, undo } = state;
  const task = state.tasks.find((t) => t.id === id && t.kind === 'project');
  const [openStep, setOpenStep] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [float, setFloat] = useState<{ stepId: string; text: string } | null>(null);

  const [away, setAway] = useState<'up' | 'down' | null>(null);
  const [landed, setLanded] = useState(false);
  const currentId = task && currentStep(task)?.id;

  // Land on the task to do: once the path has popped in, glide down to it.
  useEffect(() => {
    setLanded(false);
    let done: ReturnType<typeof setTimeout>;
    const land = () => {
      clearTimeout(done);
      window.removeEventListener('scrollend', land);
      setLanded(true);
    };
    const t = setTimeout(() => {
      scrollToCurrent();
      // The "Tâche en cours" button waits until this first glide is over.
      window.addEventListener('scrollend', land);
      done = setTimeout(land, 1200);
    }, 450);
    return () => {
      clearTimeout(t);
      clearTimeout(done);
      window.removeEventListener('scrollend', land);
    };
  }, [id]);

  // When the current task is off screen, a button brings it back.
  useEffect(() => {
    if (!currentId) {
      setAway(null);
      return;
    }
    const check = () => {
      const r = document.querySelector('[data-tuto="path-node"]')?.getBoundingClientRect();
      setAway(!r ? null : r.bottom < 60 ? 'up' : r.top > window.innerHeight - 120 ? 'down' : null);
    };
    check();
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    return () => {
      window.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
    };
  }, [currentId]);

  if (!task) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-3xl bg-white px-6 py-8 text-center shadow-card md:mt-6">
        <div className="text-4xl" aria-hidden>
          🧭
        </div>
        <div className="font-display text-lg font-bold">Ce projet n’existe plus</div>
        <Button onClick={() => (window.location.hash = '/taches')}>Retour aux tâches</Button>
      </div>
    );
  }

  const today = dayKey();
  const s = snapshot(state);
  const { done, total, pct, stageIndex, current } = projectProgress(task);
  const step = task.steps.find((x) => x.id === openStep);
  const stepStage = step ? task.stages.findIndex((g) => g.id === step.stageId) : -1;
  const undoable = !!step?.doneDay && !!findUndoable(s, task.id, step.id, today);
  const gains = step ? previewGains(s, task, step.id, today) : null;

  const tick = () => {
    if (!step) return;
    const r = complete(task.id, step.id);
    setOpenStep(null);
    if (r) {
      vibrate(25);
      setFloat({ stepId: step.id, text: `+${fmt(r.xp)} XP` });
      setTimeout(() => setFloat(null), 1400);
    }
  };

  let n = 0;
  return (
    <div className="flex flex-col gap-4 pt-4 md:pt-0">
      <a href="#/taches" className="press -ml-1 self-start rounded-full px-2 py-1.5 font-display text-sm font-semibold text-muted no-underline">
        ← Projets
      </a>

      <section className="flex flex-col gap-3 rounded-3xl bg-white p-4 shadow-card">
        <div className="flex items-center gap-3">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-soft text-3xl" aria-hidden>
            {task.emoji ?? '🧱'}
          </span>
          <div className="flex min-w-0 grow flex-col">
            <h1 className="font-display text-xl leading-tight font-bold">{task.title}</h1>
            <span className="text-sm font-semibold text-muted">
              {task.finishedDay
                ? `Terminé le ${dateLabel(task.finishedDay)}`
                : `Étape ${stageIndex + 1}/${task.stages.length} · ${task.stages[stageIndex]?.title ?? ''}`}
            </span>
          </div>
          <Button tone="soft" onClick={() => setEditing(true)} className="shrink-0 px-3 text-sm">
            Modifier
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-3 grow overflow-hidden rounded-full bg-indigo-soft">
            <motion.div className="h-full rounded-full bg-indigo" initial={false} animate={{ width: `${pct}%` }} transition={{ type: 'spring', damping: 16 }} />
          </div>
          <span className="font-display text-sm font-semibold text-muted">
            {done}/{total}
          </span>
        </div>
        <span className="text-xs font-semibold text-muted">
          {task.finishedDay
            ? `${fmt(task.projectXp)} XP et ${fmt(task.projectEclats)} éclats gagnés sur ce chemin.`
            : `Déjà ${fmt(task.projectEclats)} éclats gagnés. Chaque tâche rapporte plus que la précédente, et l’arrivée ajoute +50 %.`}
        </span>
      </section>

      <div className="flex flex-col items-center gap-6 pb-6">
        {task.stages.map((g, gi) => {
          const color = STAGE_COLORS[gi % STAGE_COLORS.length];
          const steps = task.steps.filter((x) => x.stageId === g.id);
          const stageDone = steps.filter((x) => x.doneDay).length;
          return (
            <section key={g.id} className="flex w-full flex-col items-center gap-9" aria-label={`Étape ${gi + 1} : ${g.title}`}>
              <div
                className="flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-white"
                style={{ background: color.main, boxShadow: `0 4px 0 ${color.dark}` }}
              >
                <div className="flex min-w-0 flex-col">
                  <span className="font-display text-xs font-semibold tracking-wide uppercase opacity-80">Étape {gi + 1}</span>
                  <span className="truncate font-display text-lg font-bold">{g.title}</span>
                </div>
                <span className="shrink-0 rounded-full bg-white/20 px-2.5 py-1 font-display text-sm font-semibold">
                  {stageDone === steps.length ? '✓ Franchie' : `${stageDone}/${steps.length}`}
                </span>
              </div>
              <ol className="flex flex-col items-center gap-10">
                {steps.map((x) => (
                  <Node
                    key={x.id}
                    step={x}
                    index={n++}
                    color={color}
                    state={x.doneDay ? 'done' : x.id === current?.id ? 'current' : 'later'}
                    float={float?.stepId === x.id ? float.text : undefined}
                    onOpen={() => setOpenStep(x.id)}
                  />
                ))}
              </ol>
            </section>
          );
        })}

        <motion.div
          className="mt-2 flex flex-col items-center gap-2 text-center"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 12, stiffness: 220 }}
        >
          <motion.span
            className={`flex size-24 items-center justify-center rounded-full text-5xl ${task.finishedDay ? 'bg-lemon shadow-[0_6px_0_var(--color-lemon-dark)]' : 'bg-chip shadow-[0_6px_0_#E4DCEC] grayscale-[0.6]'}`}
            animate={task.finishedDay ? { rotate: [0, -8, 8, 0] } : undefined}
            transition={{ repeat: Infinity, duration: 2.4, repeatDelay: 1.5 }}
            aria-hidden
          >
            🏆
          </motion.span>
          <span className="font-display text-base font-bold">{task.finishedDay ? 'Projet terminé !' : 'L’arrivée'}</span>
          <span className="max-w-60 text-sm font-semibold text-muted">
            {task.finishedDay ? 'Tu as parcouru tout le chemin. Bravo.' : 'Bonus final : +50 % de tout ce que le projet t’a rapporté.'}
          </span>
        </motion.div>

        <button
          type="button"
          onClick={() => setDeleting(true)}
          className="press mt-6 flex min-h-11 items-center gap-2 rounded-xl border-[1.5px] border-line px-4 font-display text-sm font-semibold text-muted"
        >
          <Trash />
          Supprimer ce projet
        </button>
      </div>

      <Sheet open={!!step} onClose={() => setOpenStep(null)} title={step?.title ?? ''}>
        {step && gains && (
          <div className="flex flex-col gap-4 pt-1 pb-2">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="rounded-full px-2.5 py-0.5 font-display text-xs font-semibold text-white"
                style={{ background: STAGE_COLORS[stepStage % STAGE_COLORS.length].main }}
              >
                Étape {stepStage + 1} · {task.stages[stepStage]?.title}
              </span>
              <RarityChip rarity={step.rarity} />
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-2xl bg-bg p-3">
                <div className="text-xs font-semibold text-muted">Durée</div>
                <div className="font-bold">{DURATION_LABELS[step.duration - 1]}</div>
              </div>
              <div className="rounded-2xl bg-bg p-3">
                <div className="text-xs font-semibold text-muted">Flemme</div>
                <div className="font-bold">{FLEMME_LABELS[step.flemme - 1]}</div>
              </div>
            </div>
            {step.doneDay ? (
              <>
                <div className="rounded-2xl bg-mint-soft px-4 py-3 font-display text-[15px] font-semibold text-forest">Fait le {dateLabel(step.doneDay)}. Bien joué !</div>
                {undoable && (
                  <Button
                    tone="ghost"
                    onClick={() => {
                      if (undo(task.id, step.id)) vibrate(10);
                      setOpenStep(null);
                    }}
                  >
                    Décocher, c’était une erreur de clic
                  </Button>
                )}
              </>
            ) : (
              <>
                <div className="rounded-2xl bg-lemon-soft px-4 py-3 font-display text-[15px] font-semibold">
                  +{fmt(gains.xp)} XP · +{fmt(gains.eclats)} éclats
                </div>
                {step.id !== current?.id && <p className="text-sm font-medium text-muted">Pas besoin de suivre l’ordre : si c’est fait, c’est fait.</p>}
                <Button tone="mint" onClick={tick} autoFocus>
                  C’est fait !
                </Button>
              </>
            )}
          </div>
        )}
      </Sheet>

      <AnimatePresence>
        {away && landed && (
          <motion.button
            type="button"
            onClick={scrollToCurrent}
            initial={{ opacity: 0, y: 16, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.9 }}
            whileTap={{ scale: 0.94 }}
            transition={{ type: 'spring', damping: 20, stiffness: 320 }}
            className="fixed right-4 bottom-[calc(6.5rem+env(safe-area-inset-bottom))] z-30 flex min-h-11 items-center gap-1.5 rounded-full bg-ink py-2 pr-4 pl-3 font-display text-sm font-semibold text-white shadow-pop md:right-10 md:bottom-32"
          >
            <span aria-hidden className="text-base leading-none">
              {away === 'up' ? '↑' : '↓'}
            </span>
            Tâche en cours
          </motion.button>
        )}
      </AnimatePresence>

      <ProjectFunnel open={editing} onClose={() => setEditing(false)} task={task} />
      <ConfirmDeleteProject open={deleting} task={task} onCancel={() => setDeleting(false)} />
    </div>
  );
}
