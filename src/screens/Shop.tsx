import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useGame } from '../store/game';
import { rewardPrice, type GambleResult, type Reward } from '../game/engine';
import {
  COST_LABELS,
  DURATION_LABELS,
  FREEZE_MAX,
  FREEZE_PRICE,
  GOLDEN_TICKET_AFTER,
  GUILTY_LABELS,
  gamblePrice,
  resalePrice,
  unlockPrice,
  usagePrice,
} from '../game/rules';
import { REWARD_EMOJIS } from '../game/defaults';
import { fmt } from '../game/rarity';
import { Button, Confirm, Field, Scale, Sheet, inputClass } from '../components/ui';
import { Lock, Snow, Spark, Ticket, Trash } from '../components/icons';
import { Wallet } from '../components/Header';

const detail = (r: Pick<Reward, 'D' | 'C'>) => `${DURATION_LABELS[r.D - 1]} · ${COST_LABELS[r.C]}`;

function EmojiTile({ emoji, spinning = false }: { emoji: string; spinning?: boolean }) {
  return (
    <motion.div
      animate={spinning ? { rotate: 360 } : { rotate: 0 }}
      transition={spinning ? { repeat: Infinity, duration: 0.6, ease: 'linear' } : { duration: 0.2 }}
      className="flex size-13 shrink-0 items-center justify-center rounded-2xl bg-bg text-[28px]"
      aria-hidden
    >
      {emoji}
    </motion.div>
  );
}

function OwnedCard({ r, onSell, onGamble, onDelete }: { r: Reward; onSell: () => void; onGamble: () => void; onDelete: () => void }) {
  const { eclats, enjoy, showToast } = useGame();
  const price = rewardPrice(r);
  const can = eclats >= price;
  const [pop, setPop] = useState(0);
  return (
    <motion.div
      layout
      key={pop}
      animate={pop ? { scale: [1, 1.04, 0.98, 1] } : undefined}
      className="flex flex-col gap-3 rounded-2xl bg-white p-3.5 shadow-card"
    >
      <div className="flex items-center gap-3">
        <EmojiTile emoji={r.emoji} />
        <div className="flex min-w-0 grow flex-col gap-0.5">
          <div className="text-base font-extrabold">{r.name}</div>
          <div className="text-xs font-semibold text-muted">{detail(r)}</div>
        </div>
        {r.gift ? (
          <span className="shrink-0 rounded-full bg-mint-soft px-2 py-1 text-[11px] font-bold text-forest">Offert</span>
        ) : (
          <button
            type="button"
            onClick={onSell}
            aria-label={`Revendre ${r.name}`}
            className="press min-h-11 shrink-0 rounded-full border-[1.5px] border-line px-3 font-display text-xs font-semibold text-muted"
          >
            Revendre
          </button>
        )}
        {r.custom && (
          <button type="button" onClick={onDelete} aria-label={`Retirer ${r.name} du shop`} className="press flex size-11 shrink-0 items-center justify-center rounded-full text-off">
            <Trash />
          </button>
        )}
      </div>
      <div className="flex gap-2">
        <Button
          tone={can ? 'indigo' : 'off'}
          className="flex-[3]"
          onClick={() => {
            if (enjoy(r.id)) {
              setPop((p) => p + 1);
              showToast(`Profite bien : ${r.name} !`, 'good');
            }
          }}
        >
          Utiliser · {fmt(price)}
        </Button>
        <Button tone="lemon" className="flex-[2]" onClick={onGamble}>
          Gamble · {fmt(gamblePrice(price))}
        </Button>
      </div>
    </motion.div>
  );
}

function LockedCard({ r }: { r: Reward }) {
  const { eclats, freeUnlocks, tickets, unlock, spendTicket, showToast } = useGame();
  const price = rewardPrice(r);
  const cost = unlockPrice(price);
  const free = freeUnlocks > 0;
  const can = free || eclats >= cost;
  return (
    <motion.div layout className="flex flex-col gap-3 rounded-2xl bg-white/70 p-3.5 shadow-card">
      <div className="flex items-center gap-3">
        <div className="relative">
          <EmojiTile emoji={r.emoji} />
          <span className="absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full bg-white text-muted shadow-card">
            <Lock size={13} />
          </span>
        </div>
        <div className="flex min-w-0 grow flex-col gap-0.5">
          <div className="text-base font-extrabold">{r.name}</div>
          <div className="text-xs font-semibold text-muted">
            Puis {fmt(price)} à chaque fois · {COST_LABELS[r.C]}
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          tone={free ? 'mint' : can ? 'lemon' : 'off'}
          className="flex-1"
          onClick={() => {
            if (unlock(r.id)) showToast(`${r.name} débloqué !`, 'good');
          }}
        >
          {free ? 'Débloquer gratuitement' : `Débloquer · ${fmt(cost)}`}
        </Button>
        {tickets > 0 && r.C === 0 && (
          <Button
            tone="soft"
            aria-label={`Utiliser un ticket d'or pour ${r.name}`}
            className="flex items-center gap-1.5 !text-amber-ink"
            onClick={() => {
              if (spendTicket(r.id)) showToast(`Ticket d'or utilisé : profite de ${r.name} !`, 'gold');
            }}
          >
            <Ticket className="text-lemon-dark" /> Ticket
          </Button>
        )}
      </div>
    </motion.div>
  );
}

function RewardForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addReward, freeUnlocks, showToast } = useGame();
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🎁');
  const [D, setD] = useState(2);
  const [C, setC] = useState(0);
  const [G, setG] = useState(1);
  useEffect(() => {
    if (open) {
      setName('');
      setEmoji('🎁');
      setD(2);
      setC(0);
      setG(1);
    }
  }, [open]);
  const price = usagePrice(D, C, G);
  const save = () => {
    if (!name.trim()) return;
    addReward({ name, emoji, D, C, G });
    showToast(freeUnlocks > 0 ? `${name.trim()} est prêt, et débloqué gratuitement !` : `${name.trim()} ajouté au shop !`, 'good');
    onClose();
  };
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Créer un plaisir"
      footer={
        <Button className="w-full" onClick={save} disabled={!name.trim()}>
          Ajouter au shop
        </Button>
      }
    >
      <form
        className="flex flex-col gap-5 pt-2"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <Field label="Quel plaisir ?">
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Une glace en terrasse" autoFocus maxLength={60} />
        </Field>
        <div className="flex flex-col gap-2">
          <span className="font-display text-sm font-semibold">Icône</span>
          <div className="flex flex-wrap gap-1.5">
            {REWARD_EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                aria-label={`Icône ${e}`}
                aria-pressed={emoji === e}
                onClick={() => setEmoji(e)}
                className={`press flex size-11 items-center justify-center rounded-xl text-2xl ${emoji === e ? 'bg-indigo-soft ring-2 ring-indigo' : 'bg-chip'}`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
        <Scale label="Ça dure combien de temps ?" value={D} onChange={setD} labels={DURATION_LABELS} />
        <Scale label="Ça coûte combien en vrai ?" value={C} onChange={setC} labels={COST_LABELS} start={0} />
        <Scale label="Plaisir coupable ?" value={G} onChange={setG} labels={GUILTY_LABELS} />
        <div className="rounded-2xl bg-bg p-4 text-sm font-semibold text-muted">
          Prix calculé : <span className="font-display text-base font-bold text-ink">{fmt(price)} éclats</span> à chaque fois, et{' '}
          {freeUnlocks > 0 ? 'il naît débloqué grâce à un déblocage offert.' : `${fmt(unlockPrice(price))} pour le débloquer une fois.`}
        </div>
        <button type="submit" hidden />
      </form>
    </Sheet>
  );
}

const REEL = ['🎁', '✨', '🍀', '💎', '🎉', '⭐', '🍒', '🔔'];

function GambleOverlay({ reward, result, onDone }: { reward: Reward | null; result: GambleResult | null; onDone: () => void }) {
  const [phase, setPhase] = useState<'spin' | 'reveal'>('spin');
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (!reward) return;
    setPhase('spin');
    const tick = setInterval(() => setFrame((f) => f + 1), 80);
    const stop = setTimeout(() => {
      clearInterval(tick);
      setPhase('reveal');
    }, 1400);
    return () => {
      clearInterval(tick);
      clearTimeout(stop);
    };
  }, [reward]);

  const win = !!result?.win;
  return (
    <AnimatePresence>
      {reward && result && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => phase === 'reveal' && onDone()}
        >
          <motion.div
            role="alertdialog"
            aria-label="Gamble"
            aria-live="polite"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="flex w-full max-w-xs flex-col items-center gap-4 rounded-3xl bg-white px-6 pt-7 pb-6 text-center shadow-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex gap-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="flex size-18 items-center justify-center rounded-2xl bg-bg text-4xl shadow-[inset_0_-4px_0_var(--color-line)]"
                  animate={phase === 'reveal' ? { y: [0, -8, 0] } : { y: [0, 4, 0] }}
                  transition={phase === 'reveal' ? { delay: i * 0.08, duration: 0.35 } : { repeat: Infinity, duration: 0.24, delay: i * 0.05 }}
                >
                  {phase === 'spin' ? REEL[(frame + i * 3) % REEL.length] : win ? reward.emoji : ['🍋', '🌀', '🍋'][i]}
                </motion.div>
              ))}
            </div>
            {phase === 'spin' ? (
              <div className="font-display text-lg font-bold">Ça tourne…</div>
            ) : (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-2">
                <div className="font-display text-xl font-bold">{win ? 'Gagné !' : result.ticket ? "Ticket d'or !" : 'Pas cette fois'}</div>
                <div className="text-sm font-semibold text-muted">
                  {win
                    ? `Profite bien : ${reward.name}, pour ${fmt(gamblePrice(rewardPrice(reward)))} éclats.`
                    : result.ticket
                      ? "8 essais sans chance : tu gagnes un ticket d'or pour un plaisir gratuit de ton choix."
                      : 'La prochaine sera peut-être la bonne.'}
                </div>
                <Button tone={win || result.ticket ? 'lemon' : 'indigo'} className="mt-2" onClick={onDone} autoFocus>
                  {win ? 'Super !' : 'OK'}
                </Button>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ShopScreen() {
  const { rewards, freeUnlocks, losses, tickets, streak, visitShop, gamble, sell, buyFreeze, deleteReward, pushEvents, showToast } = useGame();
  const [formOpen, setFormOpen] = useState(false);
  const [selling, setSelling] = useState<Reward | null>(null);
  const [deleting, setDeleting] = useState<Reward | null>(null);
  const [spin, setSpin] = useState<{ reward: Reward; result: GambleResult } | null>(null);

  useEffect(() => {
    visitShop();
  }, [visitShop]);

  const owned = rewards.filter((r) => r.unlocked);
  const locked = rewards.filter((r) => !r.unlocked);

  return (
    <div className="flex flex-col gap-4 pt-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Shop</h1>
        <Wallet className="bg-white shadow-card" />
      </div>

      <AnimatePresence>
        {freeUnlocks > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-2xl bg-mint-soft px-4 py-3 text-sm font-bold text-forest"
          >
            🎁 {freeUnlocks} déblocage{freeUnlocks > 1 ? 's' : ''} offert{freeUnlocks > 1 ? 's' : ''} : choisis tes premiers plaisirs, ou crée les
            tiens.
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-muted shadow-card">
        <Ticket className="shrink-0 text-lemon-dark" />
        {tickets > 0 ? (
          <span>
            <b className="text-ink">
              {tickets} ticket{tickets > 1 ? 's' : ''} d'or
            </b>{' '}
            en poche : utilisable sur un plaisir gratuit, même verrouillé.
          </span>
        ) : (
          <span>
            Ticket d'or dans <b className="text-ink">{GOLDEN_TICKET_AFTER - losses} essais</b> de gamble sans chance.
          </span>
        )}
      </div>

      {owned.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-bold">Tes plaisirs</h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {owned.map((r) => (
              <OwnedCard
                key={r.id}
                r={r}
                onSell={() => setSelling(r)}
                onDelete={() => setDeleting(r)}
                onGamble={() => {
                  const result = gamble(r.id);
                  if (result) setSpin({ reward: r, result });
                }}
              />
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-bold">À débloquer</h2>
        <div className="grid gap-3 lg:grid-cols-2">
          {locked.map((r) => (
            <LockedCard key={r.id} r={r} />
          ))}
        </div>
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="press rounded-2xl border-[3px] border-dashed border-[#9D92F7] p-4 font-display text-base font-semibold text-indigo"
        >
          + Créer mon propre plaisir
        </button>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-bold">Objets</h2>
        <div className="flex items-center gap-3 rounded-2xl bg-white p-3.5 shadow-card">
          <div className="flex size-13 shrink-0 items-center justify-center rounded-2xl bg-[#E3F6FD] text-sky">
            <Snow size={26} />
          </div>
          <div className="flex min-w-0 grow flex-col gap-0.5">
            <div className="text-base font-extrabold">Gel de streak</div>
            <div className="text-xs font-semibold text-muted">
              Sauve ton streak un jour sans tâche, tout seul. En stock : {streak.freezes}/{FREEZE_MAX}
            </div>
          </div>
          <Button
            tone={streak.freezes >= FREEZE_MAX ? 'off' : 'indigo'}
            onClick={() => {
              if (buyFreeze()) showToast('Gel de streak en stock !', 'good');
            }}
            className="flex shrink-0 items-center gap-1"
          >
            <Spark size={14} /> {FREEZE_PRICE}
          </Button>
        </div>
      </section>

      <RewardForm open={formOpen} onClose={() => setFormOpen(false)} />

      <Confirm
        open={!!selling}
        title={selling ? `Revendre ${selling.name} ?` : ''}
        confirmLabel="Revendre"
        onCancel={() => setSelling(null)}
        onConfirm={() => {
          if (!selling) return;
          sell(selling.id);
          showToast(`${selling.name} revendu : +${fmt(resalePrice(rewardPrice(selling)))} éclats`, 'info');
          setSelling(null);
        }}
      >
        {selling && (
          <>
            <div className="flex items-center justify-center gap-2 font-display text-3xl font-extrabold text-indigo">
              <Spark size={26} className="text-lemon" />+{fmt(resalePrice(rewardPrice(selling)))}
            </div>
            <p className="text-sm leading-relaxed font-medium text-muted">
              Tu récupères la moitié du prix de déblocage. Pour l'utiliser à nouveau, il faudra le redébloquer.
            </p>
          </>
        )}
      </Confirm>

      <Confirm
        open={!!deleting}
        title={deleting ? `Retirer ${deleting.name} ?` : ''}
        confirmLabel="Retirer"
        danger
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) deleteReward(deleting.id);
          setDeleting(null);
        }}
      >
        <p className="text-sm font-medium text-muted">Ce plaisir disparaît du shop. Les éclats dépensés pour lui ne sont pas rendus.</p>
      </Confirm>

      <GambleOverlay
        reward={spin?.reward ?? null}
        result={spin?.result ?? null}
        onDone={() => {
          if (spin) pushEvents(spin.result.events);
          setSpin(null);
        }}
      />
    </div>
  );
}
