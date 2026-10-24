import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useGame } from '../store/game';
import { stageName, type Task } from '../game/engine';
import { DURATION_LABELS, FLEMME_LABELS, PROJECT_FINAL_BONUS, RARITY_GAINS, progressMultiplier, rarityFromScore } from '../game/rules';
import { fmt } from '../game/rarity';
import { Button, Confirm, Field, Sheet, inputClass } from '../components/ui';
import { Trash } from '../components/icons';
import { RarityChip } from './TaskForm';
import { STAGE_COLORS } from '../components/stageColors';

export const PROJECT_EMOJIS = ['🧱', '🏠', '🎨', '📚', '💪', '🌱', '🎸', '💼', '✈️', '🧹', '🍳', '💻'];

interface TaskDraft {
  id?: string;
  title: string;
  duration: number;
  flemme: number;
  done?: boolean;
}

interface StageDraft {
  id?: string;
  title: string;
  tasks: TaskDraft[];
}

const blankTask = (): TaskDraft => ({ title: '', duration: 2, flemme: 2 });
const STAGE_HINTS = ['Préparer', 'Se lancer', 'Finir en beauté'];
const TASK_HINTS = ['Faire la liste', 'Acheter le nécessaire', 'Tâche suivante'];

const named = (t: TaskDraft) => !!t.title.trim();

/** XP and éclats of the whole path before streak bonuses: each task a bit more than the last, then +50 %. */
function estimate(stages: StageDraft[]) {
  const tasks = stages.flatMap((g) => g.tasks.filter(named));
  let xp = 0;
  let eclats = 0;
  tasks.forEach((t, i) => {
    const base = RARITY_GAINS[rarityFromScore(t.duration, t.flemme)];
    const f = progressMultiplier(i, tasks.length);
    xp += Math.round(base.xp * f);
    eclats += Math.round(base.eclats * f);
  });
  return { xp: Math.round(xp * (1 + PROJECT_FINAL_BONUS)), eclats: Math.round(eclats * (1 + PROJECT_FINAL_BONUS)), count: tasks.length };
}

function TaskRow({
  task,
  index,
  onChange,
  onRemove,
}: {
  task: TaskDraft;
  index: number;
  onChange: (patch: Partial<TaskDraft>) => void;
  onRemove?: () => void;
}) {
  const r = rarityFromScore(task.duration, task.flemme);
  const select = 'min-h-10 w-full min-w-0 rounded-lg border-[1.5px] border-line bg-white px-2 text-sm text-ink';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: task.done ? 0.6 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="flex flex-col gap-2 rounded-2xl bg-bg p-3"
    >
      <div className="flex items-center gap-2">
        <span className="w-5 font-display text-sm font-bold text-muted">{index + 1}</span>
        <input
          className={`${inputClass} min-h-11`}
          value={task.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder={TASK_HINTS[Math.min(index, TASK_HINTS.length - 1)]}
          aria-label={`Tâche ${index + 1}`}
          maxLength={80}
          disabled={task.done}
        />
        {onRemove && (
          <button
            type="button"
            aria-label={`Retirer la tâche ${index + 1}`}
            className="press flex size-11 shrink-0 items-center justify-center rounded-xl text-muted"
            onClick={onRemove}
          >
            <Trash />
          </button>
        )}
      </div>
      <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2 pl-7 text-sm font-semibold text-muted">
        <label className="flex min-w-0 flex-col gap-1 text-xs">
          Durée
          <select className={select} value={task.duration} onChange={(e) => onChange({ duration: Number(e.target.value) })} disabled={task.done}>
            {DURATION_LABELS.map((l, j) => (
              <option key={j} value={j + 1}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-1 text-xs">
          Flemme
          <select className={select} value={task.flemme} onChange={(e) => onChange({ flemme: Number(e.target.value) })} disabled={task.done}>
            {FLEMME_LABELS.map((l, j) => (
              <option key={j} value={j + 1}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <RarityChip rarity={r} className="mb-2.5" />
      </div>
    </motion.div>
  );
}

/**
 * Project creation in a few short screens: the name, the stages, the tasks of each stage, then the path.
 * Also edits a project; a finished one only gets its name and emoji changed.
 */
export function ProjectFunnel({
  open,
  onClose,
  task,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  task?: Task;
  onCreated?: (id: string) => void;
}) {
  const { addTask, updateTask, deleteTask, showToast } = useGame();
  const [page, setPage] = useState(0);
  const [dir, setDir] = useState(1);
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState(PROJECT_EMOJIS[0]);
  const [stages, setStages] = useState<StageDraft[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPage(0);
    setDir(1);
    setTitle(task?.title ?? '');
    setEmoji(task?.emoji ?? PROJECT_EMOJIS[0]);
    setStages(
      task
        ? task.stages.map((g) => ({
            id: g.id,
            title: g.title,
            tasks: task.steps
              .filter((s) => s.stageId === g.id)
              .map((s) => ({ id: s.id, title: s.title, duration: s.duration, flemme: s.flemme, done: !!s.doneDay })),
          }))
        : [
            { title: '', tasks: [blankTask()] },
            { title: '', tasks: [blankTask()] },
          ],
    );
  }, [open, task]);

  const finished = !!task?.finishedDay;
  // Pages: 0 name, 1 stages, 2..n+1 one per stage, n+2 the path.
  const last = finished ? 0 : stages.length + 2;
  const stageIndex = page - 2;
  const total = estimate(stages);

  const canNext = (() => {
    if (page === 0) return !!title.trim();
    if (page === 1) return stages.length > 0;
    if (page <= stages.length + 1) return stages[stageIndex]?.tasks.some(named);
    return total.count > 0;
  })();

  const go = (to: number) => {
    setDir(to > page ? 1 : -1);
    setPage(to);
  };

  const save = () => {
    const input = {
      title,
      emoji,
      kind: 'project' as const,
      duration: task?.duration ?? 3,
      flemme: task?.flemme ?? 3,
      stages: stages.map((g, i) => ({
        id: g.id,
        title: g.title.trim() || stageName(i),
        tasks: g.tasks.map((t) => ({ id: t.id, title: t.title, duration: t.duration, flemme: t.flemme })),
      })),
    };
    if (task) {
      updateTask(task.id, input);
      showToast('Projet mis à jour', 'good');
    } else {
      addTask(input);
      showToast('Projet créé, le chemin t’attend !', 'good');
      const created = useGame.getState().tasks.at(-1);
      if (created) onCreated?.(created.id);
    }
    onClose();
  };

  const setStage = (i: number, patch: Partial<StageDraft>) => setStages((all) => all.map((g, j) => (j === i ? { ...g, ...patch } : g)));
  const setTask = (i: number, k: number, patch: Partial<TaskDraft>) =>
    setStages((all) => all.map((g, j) => (j === i ? { ...g, tasks: g.tasks.map((t, l) => (l === k ? { ...t, ...patch } : t)) } : g)));

  const heading = page === 0 ? 'Ton projet' : page === 1 ? 'Les étapes' : page === last ? 'Ton chemin' : stages[stageIndex]?.title.trim() || stageName(stageIndex);

  let body;
  if (page === 0) {
    body = (
      <div className="flex flex-col gap-5">
        <p className="text-sm font-medium text-muted">Un projet, c’est un chemin : des grandes étapes, et dans chaque étape, des tâches.</p>
        <Field label="Nom du projet">
          <input
            className={inputClass}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Repeindre la chambre"
            autoFocus
            maxLength={80}
          />
        </Field>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 font-display text-sm font-semibold">Son emblème</legend>
          <div className="flex flex-wrap gap-2">
            {PROJECT_EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                aria-label={`Emblème ${e}`}
                aria-pressed={emoji === e}
                onClick={() => setEmoji(e)}
                className={`press flex size-12 items-center justify-center rounded-xl text-2xl transition-colors ${
                  emoji === e ? 'bg-indigo-soft ring-2 ring-indigo' : 'bg-chip'
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </fieldset>
        {finished && <p className="text-sm font-medium text-muted">Ce projet est terminé : son chemin reste tel que tu l’as parcouru.</p>}
      </div>
    );
  } else if (page === 1) {
    body = (
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-muted">Les grandes parties de ton projet, dans l’ordre. Tu ajouteras leurs tâches juste après.</p>
        <AnimatePresence initial={false}>
          {stages.map((g, i) => {
            const locked = g.tasks.some((t) => t.done);
            return (
              <motion.div key={g.id ?? `new-${i}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} className="flex items-center gap-2">
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold text-white"
                  style={{ background: STAGE_COLORS[i % STAGE_COLORS.length].main }}
                >
                  {i + 1}
                </span>
                <input
                  className={inputClass}
                  value={g.title}
                  onChange={(e) => setStage(i, { title: e.target.value })}
                  placeholder={STAGE_HINTS[i] ?? stageName(i)}
                  aria-label={`Nom de l’étape ${i + 1}`}
                  maxLength={60}
                />
                {!locked && stages.length > 1 && (
                  <button
                    type="button"
                    aria-label={`Retirer l’étape ${i + 1}`}
                    className="press flex size-11 shrink-0 items-center justify-center rounded-xl text-muted"
                    onClick={() => setStages((all) => all.filter((_, j) => j !== i))}
                  >
                    <Trash />
                  </button>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
        <Button tone="ghost" onClick={() => setStages((all) => [...all, { title: '', tasks: [blankTask()] }])}>
          + Ajouter une étape
        </Button>
      </div>
    );
  } else if (page < last) {
    const g = stages[stageIndex];
    body = (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span
            className="rounded-full px-2.5 py-0.5 font-display text-xs font-semibold text-white"
            style={{ background: STAGE_COLORS[stageIndex % STAGE_COLORS.length].main }}
          >
            Étape {stageIndex + 1}/{stages.length}
          </span>
          <span className="text-sm font-medium text-muted">Qu’est-ce qu’il y a à faire ?</span>
        </div>
        <AnimatePresence initial={false}>
          {g.tasks.map((t, k) => (
            <TaskRow
              key={t.id ?? `${stageIndex}-${k}`}
              task={t}
              index={k}
              onChange={(patch) => setTask(stageIndex, k, patch)}
              onRemove={!t.done && g.tasks.length > 1 ? () => setStage(stageIndex, { tasks: g.tasks.filter((_, l) => l !== k) }) : undefined}
            />
          ))}
        </AnimatePresence>
        <Button tone="ghost" onClick={() => setStage(stageIndex, { tasks: [...g.tasks, blankTask()] })}>
          + Ajouter une tâche
        </Button>
        <p className="text-sm font-medium text-muted">Plus une tâche est longue ou pénible, plus elle rapporte.</p>
      </div>
    );
  } else {
    let n = 0;
    body = (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 rounded-2xl bg-indigo-soft p-3">
          <span className="text-3xl" aria-hidden>
            {emoji}
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-display text-lg font-bold">{title.trim()}</span>
            <span className="text-sm font-semibold text-muted">
              {stages.length} étape{stages.length > 1 ? 's' : ''} · {total.count} tâche{total.count > 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <ol className="flex flex-col gap-2">
          {stages.map((g, i) => {
            const tasks = g.tasks.filter(named);
            const c = STAGE_COLORS[i % STAGE_COLORS.length];
            return (
              <li key={g.id ?? i} className="flex flex-col gap-1.5 rounded-2xl border-[1.5px] border-line p-3">
                <span className="font-display text-sm font-bold" style={{ color: c.ink }}>
                  {i + 1}. {g.title.trim() || stageName(i)}
                </span>
                <span className="flex flex-wrap gap-1.5">
                  {tasks.map((t) => (
                    <span key={n++} className="flex items-center gap-1 rounded-full bg-bg py-0.5 pr-1 pl-2.5 text-xs font-bold">
                      {t.title.trim()}
                      <RarityChip rarity={rarityFromScore(t.duration, t.flemme)} className="!px-1.5 !text-[10px]" />
                    </span>
                  ))}
                </span>
              </li>
            );
          })}
        </ol>
        <div className="rounded-2xl bg-lemon-soft px-4 py-3 text-sm font-semibold">
          🏆 Au bout du chemin : environ {fmt(total.xp)} XP et {fmt(total.eclats)} éclats, bonus final de +50 % compris.
        </div>
        <p className="text-sm font-medium text-muted">Chaque tâche rapporte un peu plus que la précédente. Tu pourras tout modifier plus tard.</p>
      </div>
    );
  }

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title={task ? 'Modifier le projet' : 'Nouveau projet'}
        footer={
          <div className="flex gap-2">
            {task && page === 0 && (
              <Button tone="ghost" aria-label="Supprimer le projet" onClick={() => setConfirmDelete(true)} className="px-3">
                <Trash />
              </Button>
            )}
            {page > 0 && (
              <Button tone="soft" onClick={() => go(page - 1)}>
                Retour
              </Button>
            )}
            <Button className="flex-1" disabled={!canNext} onClick={() => (page === last ? save() : go(page + 1))}>
              {page === last ? (task ? 'Enregistrer' : 'Créer le projet') : 'Suivant'}
            </Button>
          </div>
        }
      >
        {!finished && (
          <div className="flex items-center gap-3 pb-3" aria-label={`Écran ${page + 1} sur ${last + 1}`}>
            <div className="flex grow gap-1">
              {Array.from({ length: last + 1 }, (_, i) => (
                <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= page ? 'bg-indigo' : 'bg-line'}`} />
              ))}
            </div>
          </div>
        )}
        <form
          className="overflow-hidden pt-1"
          onSubmit={(e) => {
            e.preventDefault();
            if (canNext) (page === last ? save() : go(page + 1));
          }}
        >
          <AnimatePresence mode="wait" initial={false} custom={dir}>
            <motion.div
              key={page}
              custom={dir}
              initial={{ opacity: 0, x: dir * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * -40 }}
              transition={{ duration: 0.18 }}
              className="flex flex-col gap-4"
            >
              <h3 className="font-display text-lg font-bold">{heading}</h3>
              {body}
            </motion.div>
          </AnimatePresence>
          <button type="submit" hidden />
        </form>
      </Sheet>
      <Confirm
        open={confirmDelete}
        title="Supprimer ce projet ?"
        confirmLabel="Supprimer"
        danger
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          if (task) deleteTask(task.id);
          setConfirmDelete(false);
          onClose();
          window.location.hash = '/taches';
        }}
      >
        <p className="text-sm font-medium text-muted">Ce que tu as déjà gagné avec lui reste à toi.</p>
      </Confirm>
    </>
  );
}
