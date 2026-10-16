import { useEffect, useState } from 'react';
import { useGame } from '../store/game';
import type { Task, TaskKind } from '../game/engine';
import {
  DURATION_LABELS,
  FLEMME_LABELS,
  RARITY_GAINS,
  allowedRarities,
  rarityFromScore,
  type Rarity,
  type Recurrence,
} from '../game/rules';
import { RARITY_UI } from '../game/rarity';
import { Button, Confirm, Field, Scale, Segmented, Sheet, inputClass } from '../components/ui';
import { Trash } from '../components/icons';

interface StepDraft {
  id?: string;
  title: string;
  duration: number;
  flemme: number;
  done?: boolean;
}

export function RarityChip({ rarity, className = '' }: { rarity: Rarity; className?: string }) {
  const r = RARITY_UI[rarity];
  return <span className={`rounded-full px-2.5 py-0.5 font-display text-xs font-semibold ${r.bg} ${r.text} ${className}`}>{r.label}</span>;
}

export function TaskForm({
  open,
  onClose,
  task,
  defaultKind = 'normal',
}: {
  open: boolean;
  onClose: () => void;
  task?: Task;
  defaultKind?: TaskKind;
}) {
  const { addTask, updateTask, deleteTask, showToast } = useGame();
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<TaskKind>(defaultKind);
  const [recurrence, setRecurrence] = useState<Recurrence>('daily');
  const [duration, setDuration] = useState(2);
  const [flemme, setFlemme] = useState(2);
  const [rarity, setRarity] = useState<Rarity | null>(null);
  const [steps, setSteps] = useState<StepDraft[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(task?.title ?? '');
    setKind(task?.kind ?? defaultKind);
    setRecurrence(task?.recurrence ?? 'daily');
    setDuration(task?.duration ?? 2);
    setFlemme(task?.flemme ?? 2);
    const suggested = task ? rarityFromScore(task.duration, task.flemme) : null;
    setRarity(task && task.rarity !== suggested ? task.rarity : null);
    setSteps(
      task?.steps.length
        ? task.steps.map((s) => ({ id: s.id, title: s.title, duration: s.duration, flemme: s.flemme, done: !!s.doneDay }))
        : [
            { title: '', duration: 2, flemme: 2 },
            { title: '', duration: 2, flemme: 2 },
          ],
    );
  }, [open, task, defaultKind]);

  const suggested = rarityFromScore(duration, flemme);
  const allowed = allowedRarities(suggested);
  const chosen = rarity && allowed.includes(rarity) ? rarity : suggested;
  const gains = RARITY_GAINS[chosen];
  const validSteps = steps.filter((s) => s.title.trim());
  const canSave = title.trim() && (kind !== 'project' || validSteps.length >= 2);

  const save = () => {
    if (!canSave) return;
    const input = {
      title,
      kind,
      duration,
      flemme,
      rarity: chosen,
      recurrence,
      steps: steps.map((s) => ({ id: s.id, title: s.title, duration: s.duration, flemme: s.flemme })),
    };
    if (task) updateTask(task.id, input);
    else {
      addTask(input);
      showToast(kind === 'project' ? 'Projet créé, première étape en vue !' : 'Tâche ajoutée !', 'good');
    }
    onClose();
  };

  const setStep = (i: number, patch: Partial<StepDraft>) => setSteps((all) => all.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title={task ? 'Modifier' : kind === 'project' ? 'Nouveau projet' : 'Nouvelle tâche'}
        footer={
          <div className="flex gap-2">
            {task && (
              <Button tone="ghost" aria-label="Supprimer" onClick={() => setConfirmDelete(true)} className="px-3">
                <Trash />
              </Button>
            )}
            <Button className="flex-1" onClick={save} disabled={!canSave}>
              {task ? 'Enregistrer' : 'Ajouter'}
            </Button>
          </div>
        }
      >
        <form
          className="flex flex-col gap-5 pt-2"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          {!task && (
            <Segmented
              label="Type de tâche"
              value={kind}
              onChange={setKind}
              options={[
                { value: 'normal', label: 'Normale' },
                { value: 'recurring', label: 'Récurrente' },
                { value: 'project', label: 'Projet' },
              ]}
            />
          )}

          <Field label={kind === 'project' ? 'Nom du projet' : 'Quoi ?'}>
            <input
              className={inputClass}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={kind === 'project' ? 'Repeindre la chambre' : kind === 'recurring' ? 'Aller au sport' : 'Appeler la banque'}
              autoFocus={!task}
              maxLength={80}
            />
          </Field>

          {kind === 'recurring' && (
            <Segmented
              label="Fréquence"
              value={recurrence}
              onChange={setRecurrence}
              options={[
                { value: 'daily', label: 'Chaque jour' },
                { value: 'weekly', label: 'Semaine' },
                { value: 'monthly', label: 'Mois' },
              ]}
            />
          )}

          {kind !== 'project' ? (
            <>
              <Scale label="Ça prend combien de temps ?" value={duration} onChange={setDuration} labels={DURATION_LABELS} />
              <Scale label="Quelle flemme ?" value={flemme} onChange={setFlemme} labels={FLEMME_LABELS} />
              <div className="flex flex-col gap-2 rounded-2xl bg-bg p-4">
                <div className="font-display text-sm font-semibold">Rareté</div>
                <div className="flex flex-wrap gap-2">
                  {allowed.map((r) => (
                    <button
                      key={r}
                      type="button"
                      aria-pressed={chosen === r}
                      onClick={() => setRarity(r)}
                      className={`press rounded-full px-3 py-1.5 font-display text-sm font-semibold ${RARITY_UI[r].bg} ${RARITY_UI[r].text} ${
                        chosen === r ? 'ring-2 ring-offset-2 ring-ink' : 'opacity-70'
                      }`}
                    >
                      {RARITY_UI[r].label}
                      {r === suggested ? ' · proposée' : ''}
                    </button>
                  ))}
                </div>
                <div className="text-sm font-semibold text-muted">
                  Rapporte {gains.xp} XP et {gains.eclats} éclats, avant bonus.
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="font-display text-sm font-semibold">Étapes</div>
              {steps.map((s, i) => {
                const r = rarityFromScore(s.duration, s.flemme);
                return (
                  <div key={s.id ?? i} className={`flex flex-col gap-2 rounded-2xl bg-bg p-3 ${s.done ? 'opacity-60' : ''}`}>
                    <div className="flex items-center gap-2">
                      <span className="w-5 font-display text-sm font-bold text-muted">{i + 1}</span>
                      <input
                        className={`${inputClass} min-h-11`}
                        value={s.title}
                        onChange={(e) => setStep(i, { title: e.target.value })}
                        placeholder={i === 0 ? 'Acheter la peinture' : 'Étape suivante'}
                        aria-label={`Étape ${i + 1}`}
                        maxLength={80}
                        disabled={s.done}
                      />
                      {!s.done && steps.length > 2 && (
                        <button
                          type="button"
                          aria-label={`Retirer l'étape ${i + 1}`}
                          className="press flex size-11 shrink-0 items-center justify-center rounded-xl text-muted"
                          onClick={() => setSteps((all) => all.filter((_, j) => j !== i))}
                        >
                          <Trash />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2 pl-7 text-sm font-semibold text-muted">
                      <label className="flex min-w-0 flex-col gap-1 text-xs">
                      Durée
                      <select
                        className="min-h-10 w-full min-w-0 rounded-lg border-[1.5px] border-line bg-white px-2 text-sm text-ink"
                        value={s.duration}
                        onChange={(e) => setStep(i, { duration: Number(e.target.value) })}
                        aria-label={`Durée de l'étape ${i + 1}`}
                        disabled={s.done}
                      >
                        {DURATION_LABELS.map((l, j) => (
                          <option key={j} value={j + 1}>
                            {l}
                          </option>
                        ))}
                      </select>
                      </label>
                      <label className="flex min-w-0 flex-col gap-1 text-xs">
                      Flemme
                      <select
                        className="min-h-10 w-full min-w-0 rounded-lg border-[1.5px] border-line bg-white px-2 text-sm text-ink"
                        value={s.flemme}
                        onChange={(e) => setStep(i, { flemme: Number(e.target.value) })}
                        aria-label={`Flemme de l'étape ${i + 1}`}
                        disabled={s.done}
                      >
                        {FLEMME_LABELS.map((l, j) => (
                          <option key={j} value={j + 1}>
                            {l}
                          </option>
                        ))}
                      </select>
                      </label>
                      <RarityChip rarity={r} className="mb-2.5" />
                    </div>
                  </div>
                );
              })}
              <Button tone="ghost" onClick={() => setSteps((all) => [...all, { title: '', duration: 2, flemme: 2 }])}>
                + Ajouter une étape
              </Button>
              <p className="text-sm font-medium text-muted">
                Chaque étape rapporte un peu plus que la précédente, et la dernière ajoute 50 % de tout ce que le projet a rapporté.
              </p>
            </div>
          )}
          <button type="submit" hidden />
        </form>
      </Sheet>
      <Confirm
        open={confirmDelete}
        title="Supprimer cette tâche ?"
        confirmLabel="Supprimer"
        danger
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          if (task) deleteTask(task.id);
          setConfirmDelete(false);
          onClose();
        }}
      >
        <p className="text-sm font-medium text-muted">Ce que tu as déjà gagné avec elle reste à toi.</p>
      </Confirm>
    </>
  );
}
