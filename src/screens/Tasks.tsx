import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { useGame, snapshot } from '../store/game';
import { findUndoable, isDone, previewGains, type Task } from '../game/engine';
import { RECURRENCE_LABEL, dayKey, nextChain, regularityBonus } from '../game/rules';
import { RARITY_UI, fmt } from '../game/rarity';
import { TASK_SUGGESTIONS } from '../game/defaults';
import { Check, Trash } from '../components/icons';
import { Button } from '../components/ui';
import { RarityChip, TaskForm } from './TaskForm';
import { ConfirmDeleteProject, ProjectFunnel } from './ProjectFunnel';
import { projectHref, projectProgress } from './Project';
import { STAGE_COLORS } from '../components/stageColors';

type Tab = 'today' | 'recurring' | 'projects';

let handledTick = 0;
/** Kept across screens, so coming back from a project page lands on the projects again. */
let lastTab: Tab = 'today';

interface Row {
  key: string;
  task: Task;
  done: boolean;
}

function vibrate(ms: number) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* not supported */
  }
}

function meta(task: Task): string {
  if (task.kind === 'recurring') {
    const chain = isDone(task) ? task.chain : nextChain(task.recurrence!, dayKey(), task.lastPeriod, task.chain);
    const bonus = Math.round(regularityBonus(chain) * 100);
    return `Récurrente · ${RECURRENCE_LABEL[task.recurrence!]}${bonus ? ` · régularité +${bonus} %` : ''}`;
  }
  return '';
}

function TaskCard({ row, onEdit }: { row: Row; onEdit: (t: Task) => void }) {
  const state = useGame();
  const { complete, undo } = state;
  const [float, setFloat] = useState<{ id: number; text: string } | null>(null);
  const { task, done } = row;
  const rarity = task.rarity;
  const ui = RARITY_UI[rarity];
  const today = dayKey();
  const s = snapshot(state);
  const undoable = done && !!findUndoable(s, task.id, undefined, today);
  const gains = previewGains(s, task, undefined, today);
  const title = task.title;

  const toggle = () => {
    if (done) {
      if (undoable && undo(task.id)) vibrate(10);
      return;
    }
    const r = complete(task.id);
    if (r) {
      vibrate(25);
      setFloat({ id: Date.now(), text: `+${fmt(r.xp)} XP` });
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: done ? 0.62 : 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', damping: 24, stiffness: 300 }}
      className="relative flex items-center gap-3 rounded-2xl bg-white p-3.5 shadow-card"
    >
      <motion.button
        type="button"
        whileTap={{ scale: 0.88 }}
        onClick={toggle}
        disabled={done && !undoable}
        data-tuto={done ? undefined : 'check'}
        aria-label={done ? (undoable ? `Décocher : ${title}` : `${title} : déjà fait`) : `Terminer : ${title}`}
        aria-pressed={done}
        className="flex size-11 shrink-0 items-center justify-center rounded-full border-[3px]"
        style={{ borderColor: ui.ring, background: done ? ui.ring : '#fff' }}
      >
        <AnimatePresence>
          {done && (
            <motion.span
              initial={{ scale: 0.2, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0 }}
              transition={{ type: 'spring', damping: 9, stiffness: 400 }}
              className="text-white"
            >
              <Check />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
      <button type="button" className="flex min-w-0 grow flex-col gap-1 text-left" onClick={() => onEdit(task)} aria-label={`Modifier ${task.title}`}>
        <span className={`text-base font-extrabold ${done ? 'line-through' : ''}`}>{title}</span>
        {meta(task) && <span className="text-xs font-semibold text-muted">{meta(task)}</span>}
        <span className="flex items-center gap-1.5">
          <RarityChip rarity={rarity} />
          {!done && (
            <span className="text-xs font-bold text-muted">
              +{fmt(gains.xp)} XP · +{fmt(gains.eclats)} éclats
            </span>
          )}
        </span>
      </button>
      <AnimatePresence>
        {float && (
          <motion.div
            key={float.id}
            initial={{ y: 6, opacity: 0 }}
            animate={{ y: -40, opacity: [0, 1, 1, 0] }}
            transition={{ duration: 1.3, ease: 'easeOut' }}
            onAnimationComplete={() => setFloat(null)}
            className={`pointer-events-none absolute top-2.5 right-4 font-display text-lg font-bold ${ui.text}`}
          >
            {float.text}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ProjectCard({ task }: { task: Task }) {
  const { done, total, pct, stageIndex, current } = projectProgress(task);
  const color = STAGE_COLORS[Math.max(0, stageIndex) % STAGE_COLORS.length];
  const [deleting, setDeleting] = useState(false);
  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative min-w-0">
      <motion.a
        href={projectHref(task.id)}
        whileTap={{ scale: 0.98 }}
        className="flex h-full flex-col gap-3 rounded-3xl bg-white p-4 text-ink no-underline shadow-card"
      >
        <div className="flex items-center gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl text-2xl" style={{ background: color.soft }} aria-hidden>
            {task.emoji ?? '🧱'}
          </span>
          <div className="flex min-w-0 grow flex-col">
            <span className="truncate font-display text-lg font-bold">{task.title}</span>
            <span className="text-xs font-semibold text-muted">
              {task.finishedDay ? 'Terminé 🏆' : `Étape ${stageIndex + 1}/${task.stages.length} · ${task.stages[stageIndex]?.title ?? ''}`}
            </span>
          </div>
          {/* Room for the delete button, which sits over the card: a button can't live inside a link. */}
          <span className="mr-10 shrink-0 font-display text-sm font-semibold text-muted">
            {done}/{total}
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-indigo-soft">
          <motion.div
            className="h-full rounded-full"
            style={{ background: task.finishedDay ? 'var(--color-mint)' : color.main }}
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ type: 'spring', damping: 16 }}
          />
        </div>
        {/* A glimpse of the path: one dot per task, grouped by stage. */}
        <div className="flex flex-wrap items-center gap-1.5" aria-hidden>
          {task.stages.map((g, gi) => (
            <span key={g.id} className="flex flex-wrap items-center gap-1">
              {gi > 0 && <span className="mx-0.5 h-0.5 w-2 rounded-full bg-line" />}
              {task.steps
                .filter((x) => x.stageId === g.id)
                .map((x) => (
                  <span
                    key={x.id}
                    className={`size-2.5 rounded-full ${x.id === current?.id ? 'ring-2 ring-offset-1' : ''}`}
                    style={{ background: x.doneDay ? STAGE_COLORS[gi % STAGE_COLORS.length].main : 'var(--color-line)', ['--tw-ring-color' as string]: color.main }}
                  />
                ))}
            </span>
          ))}
        </div>
        <span className="text-sm font-semibold text-muted">
          {task.finishedDay ? `${fmt(task.projectEclats)} éclats gagnés sur ce chemin.` : current ? `Prochaine : ${current.title}` : ''}
        </span>
      </motion.a>
      <button
        type="button"
        aria-label={`Supprimer le projet ${task.title}`}
        onClick={() => setDeleting(true)}
        className="press absolute top-[18px] right-3 flex size-11 items-center justify-center rounded-xl text-muted hover:bg-chip"
      >
        <Trash />
      </button>
      <ConfirmDeleteProject open={deleting} task={task} onCancel={() => setDeleting(false)} onDone={() => setDeleting(false)} />
    </motion.div>
  );
}

export function TasksScreen() {
  const state = useGame();
  const { tasks, completions, addTask, showToast } = state;
  const [tab, setTabState] = useState<Tab>(lastTab);
  const [editing, setEditing] = useState<Task | undefined>();
  const [formOpen, setFormOpen] = useState(false);
  const [funnelOpen, setFunnelOpen] = useState(false);
  const setTab = (t: Tab) => {
    lastTab = t;
    setTabState(t);
  };
  const today = dayKey();
  const newTaskTick = useGame((st) => st.newTaskTick);

  // The + button lives in the app shell; open the form when it is pressed, even if this screen mounts right after.
  useEffect(() => {
    if (newTaskTick !== handledTick) {
      handledTick = newTaskTick;
      setEditing(undefined);
      if (lastTab === 'projects') setFunnelOpen(true);
      else setFormOpen(true);
    }
  }, [newTaskTick]);

  const doneToday = useMemo(() => {
    const set = new Set<string>();
    for (const c of completions) if (c.day === today) set.add(c.stepId ?? c.taskId);
    return set;
  }, [completions, today]);

  const rows = useMemo<Row[]>(() => {
    if (tab === 'projects') return [];
    const out: Row[] = [];
    for (const t of tasks) {
      if (tab === 'recurring') {
        if (t.kind === 'recurring') out.push({ key: t.id, task: t, done: isDone(t, today) });
        continue;
      }
      if (t.kind === 'normal') {
        if (!t.doneDay) out.push({ key: t.id, task: t, done: false });
        else if (t.doneDay === today) out.push({ key: t.id, task: t, done: true });
      } else if (t.kind === 'recurring') {
        const done = isDone(t, today);
        if (!done || doneToday.has(t.id)) out.push({ key: t.id, task: t, done });
      }
      // Project tasks live on their own path, in the Projets tab.
    }
    // To-do first, done at the bottom.
    return [...out.filter((r) => !r.done), ...out.filter((r) => r.done)];
  }, [tasks, tab, today, doneToday]);

  const projects = tasks.filter((t) => t.kind === 'project');
  const openForm = (t?: Task) => {
    setEditing(t);
    if (!t && tab === 'projects') setFunnelOpen(true);
    else setFormOpen(true);
  };
  const allDone = tab === 'today' && rows.length > 0 && rows.every((r) => r.done);
  const empty = tab === 'projects' ? projects.length === 0 : rows.length === 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2 overflow-x-auto pt-4 pb-1" data-tuto="tabs" role="tablist" aria-label="Filtrer les tâches">
        {(
          [
            ['today', "Aujourd'hui"],
            ['recurring', 'Récurrentes'],
            ['projects', 'Projets'],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            type="button"
            onClick={() => setTab(id)}
            className={`press min-h-10 shrink-0 rounded-full px-4 font-display text-[15px] font-semibold transition-colors ${
              tab === id ? 'bg-ink text-white' : 'bg-white text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {allDone && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="rounded-2xl bg-mint-soft px-4 py-3 font-display text-[15px] font-semibold text-forest"
        >
          Tout est fait pour aujourd'hui. Profite, tu l'as bien mérité !
        </motion.div>
      )}

      {empty ? (
        <div className="flex flex-col items-center gap-4 rounded-3xl bg-white px-6 py-8 text-center shadow-card">
          <div className="text-4xl" aria-hidden>
            {tab === 'projects' ? '🧱' : tab === 'recurring' ? '🔁' : '🌱'}
          </div>
          <div className="font-display text-lg font-bold">
            {tab === 'projects' ? 'Pas encore de projet' : tab === 'recurring' ? 'Pas encore de routine' : 'Rien de prévu pour le moment'}
          </div>
          <p className="max-w-xs text-sm font-medium text-muted">
            {tab === 'projects'
              ? 'Transforme un gros objectif en chemin : des étapes, des tâches dedans, et une vraie fête à l’arrivée.'
              : tab === 'recurring'
                ? 'Les tâches qui reviennent chaque jour, semaine ou mois gagnent un bonus de régularité.'
                : 'Ajoute ta première tâche, ou pioche une idée\u00a0:'}
          </p>
          {tab === 'today' && tasks.length === 0 && (
            <div className="flex flex-wrap justify-center gap-2">
              {TASK_SUGGESTIONS.map((s) => (
                <button
                  key={s.title}
                  type="button"
                  className="press rounded-full bg-indigo-soft px-3 py-2 text-sm font-bold text-indigo"
                  onClick={() => {
                    addTask({ title: s.title, kind: 'normal', duration: s.duration, flemme: s.flemme });
                    showToast('Tâche ajoutée !', 'good');
                  }}
                >
                  + {s.title}
                </button>
              ))}
            </div>
          )}
          <Button onClick={() => openForm()}>{tab === 'projects' ? 'Créer un projet' : 'Ajouter une tâche'}</Button>
        </div>
      ) : tab === 'projects' ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {projects.map((p) => (
            <ProjectCard key={p.id} task={p} />
          ))}
          <button
            type="button"
            onClick={() => openForm()}
            className="press flex min-h-32 flex-col items-center justify-center gap-1 rounded-3xl border-2 border-dashed border-line font-display text-[15px] font-semibold text-muted"
          >
            <span className="text-2xl" aria-hidden>
              +
            </span>
            Nouveau projet
          </button>
        </div>
      ) : (
        <AnimatePresence initial={false}>
          {rows.map((r) => (
            <TaskCard key={r.key} row={r} onEdit={openForm} />
          ))}
        </AnimatePresence>
      )}

      <TaskForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        task={editing}
        defaultKind={tab === 'recurring' ? 'recurring' : 'normal'}
        onProject={() => {
          setFormOpen(false);
          setFunnelOpen(true);
        }}
      />
      <ProjectFunnel open={funnelOpen} onClose={() => setFunnelOpen(false)} onCreated={(id) => (window.location.hash = projectHref(id))} />
    </div>
  );
}
