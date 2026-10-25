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

export function RarityChip({ rarity, className = '' }: { rarity: Rarity; className?: string }) {
  const r = RARITY_UI[rarity];
  return <span className={`rounded-full px-2.5 py-0.5 font-display text-xs font-semibold ${r.bg} ${r.text} ${className}`}>{r.label}</span>;
}

export function TaskForm({
  open,
  onClose,
  task,
  defaultKind = 'normal',
  defaultRecurrence = 'daily',
  onProject,
}: {
  open: boolean;
  onClose: () => void;
  task?: Task;
  defaultKind?: TaskKind;
  defaultRecurrence?: Recurrence;
  /** Projects have their own longer form: picking the type hands over to it. */
  onProject: () => void;
}) {
  const { addTask, updateTask, deleteTask, showToast } = useGame();
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<TaskKind>(defaultKind);
  const [recurrence, setRecurrence] = useState<Recurrence>('daily');
  const [duration, setDuration] = useState(2);
  const [flemme, setFlemme] = useState(2);
  const [rarity, setRarity] = useState<Rarity | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(task?.title ?? '');
    setKind(task?.kind ?? defaultKind);
    setRecurrence(task?.recurrence ?? defaultRecurrence);
    setDuration(task?.duration ?? 2);
    setFlemme(task?.flemme ?? 2);
    const suggested = task ? rarityFromScore(task.duration, task.flemme) : null;
    setRarity(task && task.rarity !== suggested ? task.rarity : null);
  }, [open, task, defaultKind, defaultRecurrence]);

  const suggested = rarityFromScore(duration, flemme);
  const allowed = allowedRarities(suggested);
  const chosen = rarity && allowed.includes(rarity) ? rarity : suggested;
  const gains = RARITY_GAINS[chosen];
  const canSave = !!title.trim();

  const save = () => {
    if (!canSave) return;
    const input = {
      title,
      kind,
      duration,
      flemme,
      rarity: chosen,
      recurrence,
    };
    if (task) updateTask(task.id, input);
    else {
      addTask(input);
      showToast('Tâche ajoutée !', 'good');
    }
    onClose();
  };

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title={task ? 'Modifier' : 'Nouvelle tâche'}
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
              onChange={(k) => (k === 'project' ? onProject() : setKind(k))}
              options={[
                { value: 'normal', label: 'Normale' },
                { value: 'recurring', label: 'Récurrente' },
                { value: 'project', label: 'Projet' },
              ]}
            />
          )}

          <Field label="Quoi ?">
            <input
              className={inputClass}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={kind === 'recurring' ? 'Aller au sport' : 'Appeler la banque'}
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
