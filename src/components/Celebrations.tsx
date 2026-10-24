import { AnimatePresence, motion } from 'framer-motion';
import { useMemo } from 'react';
import { useGame } from '../store/game';
import { badgeById } from '../game/badges';
import { fmt } from '../game/rarity';
import type { GameEvent } from '../game/engine';
import { Button } from './ui';

const COLORS = ['#FFD23F', '#2EC4A6', '#8B5CF6', '#FF9F1C', '#4CC9F0', '#F472B6'];

function Confetti({ count = 36 }: { count?: number }) {
  const bits = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: (Math.random() - 0.5) * 520,
        y: -220 - Math.random() * 260,
        r: Math.random() * 720 - 360,
        d: 0.9 + Math.random() * 0.8,
        c: COLORS[i % COLORS.length],
        w: 6 + Math.random() * 6,
      })),
    [count],
  );
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden" aria-hidden>
      {bits.map((b, i) => (
        <motion.span
          key={i}
          className="absolute rounded-[2px]"
          style={{ width: b.w, height: b.w * 0.5, background: b.c }}
          initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
          animate={{ x: b.x, y: [0, b.y, b.y + 520], rotate: b.r, opacity: [1, 1, 0] }}
          transition={{ duration: b.d * 2, ease: 'easeOut', times: [0, 0.35, 1] }}
        />
      ))}
    </div>
  );
}

function Rays() {
  return (
    <motion.svg
      className="pointer-events-none absolute size-[640px] opacity-30"
      viewBox="0 0 200 200"
      aria-hidden
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 9, ease: 'linear' }}
    >
      {Array.from({ length: 12 }, (_, i) => (
        <path key={i} d="M100 100 L94 0 L106 0 Z" fill="#FFD23F" transform={`rotate(${i * 30} 100 100)`} />
      ))}
    </motion.svg>
  );
}

function content(e: GameEvent) {
  switch (e.type) {
    case 'levelup':
      return {
        full: true,
        big: <span className="font-display text-6xl font-extrabold">{e.level}</span>,
        title: `Niveau ${e.level}`,
        text: 'Bravo, tu montes en puissance.',
        extra: `Bonus de niveau\n+${fmt(e.bonus)} éclats`,
        cta: 'Continuer',
      };
    case 'project':
      return {
        full: true,
        big: <span className="text-6xl">🧱</span>,
        title: 'Projet terminé !',
        text: e.title,
        extra: `Bonus final\n+${fmt(e.xp)} XP · +${fmt(e.eclats)} éclats`,
        cta: 'Trop bien',
      };
    case 'stage':
      return {
        full: false,
        big: (
          <motion.span className="text-6xl" animate={{ rotate: [0, -10, 10, 0], y: [0, -6, 0] }} transition={{ duration: 0.8 }}>
            🚩
          </motion.span>
        ),
        title: 'Étape franchie !',
        text: `${e.title} · ${e.project}`,
        extra: e.total - e.index - 1 > 1 ? `Plus que ${e.total - e.index - 1} étapes avant l’arrivée.` : 'Plus qu’une étape avant l’arrivée !',
        cta: 'En route',
      };
    case 'chest':
      return {
        full: false,
        big: (
          <motion.span className="text-6xl" animate={{ rotate: [0, -12, 12, -8, 8, 0], scale: [1, 1.1, 1] }} transition={{ duration: 0.9 }}>
            🎁
          </motion.span>
        ),
        title: `${e.name} !`,
        text: `Streak de ${e.days} jours.`,
        extra: `+${fmt(e.amount)} éclats`,
        cta: 'Ouvrir',
      };
    case 'badge': {
      const b = badgeById(e.id);
      return {
        full: false,
        big: <span className="text-6xl">{b?.emoji ?? '🏅'}</span>,
        title: 'Nouveau badge',
        text: b?.name ?? '',
        extra: b?.hint,
        cta: 'Super',
      };
    }
    case 'streak-broken':
      return {
        full: false,
        big: <span className="text-6xl">🌱</span>,
        title: 'Nouvelle série',
        text: `Ton record de ${e.best} jour${e.best > 1 ? 's' : ''} reste gravé. On repart ?`,
        extra: 'Tes éclats et ton XP sont toujours là.',
        cta: 'On repart',
      };
    case 'freeze-used':
      return {
        full: false,
        big: <span className="text-6xl">❄️</span>,
        title: 'Streak sauvé',
        text: e.count > 1 ? `${e.count} gels de streak ont protégé ta série.` : 'Un gel de streak a protégé ta série.',
        extra: undefined,
        cta: 'Merci !',
      };
    case 'shop-welcome':
      return {
        full: false,
        big: <span className="text-6xl">🛍️</span>,
        title: 'Bienvenue au shop',
        text: `Ici, tes éclats s'échangent contre de vrais plaisirs. Pour commencer, ${e.count} déblocages sont offerts.`,
        extra: undefined,
        cta: 'Je choisis',
      };
  }
}

export function Celebrations() {
  const events = useGame((s) => s.events);
  const shiftEvent = useGame((s) => s.shiftEvent);
  const e = events[0];
  const c = e ? content(e) : null;

  return (
    <AnimatePresence mode="wait">
      {e && c && (
        <motion.div
          key={JSON.stringify(e) + events.length}
          className={`fixed inset-0 z-[60] flex items-center justify-center overflow-hidden p-6 ${c.full ? 'bg-indigo' : 'bg-ink/55'}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={shiftEvent}
          role="alertdialog"
          aria-modal="true"
          aria-label={c.title}
        >
          {c.full && <Rays />}
          {(c.full || e.type === 'chest' || e.type === 'badge' || e.type === 'stage') && <Confetti count={c.full ? 48 : 24} />}
          <motion.div
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 12, stiffness: 260 }}
            className={`relative flex w-full max-w-xs flex-col items-center gap-3 text-center ${c.full ? 'text-white' : 'rounded-3xl bg-white px-6 pt-7 pb-6 shadow-pop'}`}
            onClick={(ev) => ev.stopPropagation()}
          >
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', damping: 8, stiffness: 220, delay: 0.1 }}
              className={`flex size-28 items-center justify-center rounded-full ${c.full ? 'bg-lemon text-ink shadow-[0_6px_0_var(--color-lemon-dark)]' : 'bg-bg'}`}
            >
              {c.big}
            </motion.div>
            <div className="font-display text-2xl font-bold">{c.title}</div>
            <div className={`text-base font-semibold ${c.full ? 'text-white/90' : 'text-muted'}`}>{c.text}</div>
            {c.extra && (
              <div
                className={`whitespace-pre-line rounded-2xl px-4 py-2 font-display text-sm font-semibold ${c.full ? 'bg-white/15' : 'bg-lemon-soft text-ink'}`}
              >
                {c.extra}
              </div>
            )}
            <Button tone="lemon" className="mt-2 min-w-40" onClick={shiftEvent} autoFocus>
              {c.cta}
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Toast() {
  const toast = useGame((s) => s.toast);
  const colors = { good: 'bg-forest text-white', info: 'bg-ink text-white', gold: 'bg-lemon text-ink' };
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(6.75rem+env(safe-area-inset-bottom))] z-[70] flex justify-center px-5 md:top-6 md:bottom-auto" aria-live="polite">
      <AnimatePresence>
        {toast && (
          <ToastBubble key={toast.id} className={colors[toast.kind]}>
            {toast.text}
          </ToastBubble>
        )}
      </AnimatePresence>
    </div>
  );
}

function ToastBubble({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <motion.div
      initial={{ y: 30, opacity: 0, scale: 0.9 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: 20, opacity: 0 }}
      transition={{ type: 'spring', damping: 18, stiffness: 320 }}
      onAnimationComplete={() => {
        // Clear after a short read; a newer toast replaces it by key.
        const id = useGame.getState().toast?.id;
        setTimeout(() => {
          if (useGame.getState().toast?.id === id) useGame.setState({ toast: null });
        }, 2200);
      }}
      className={`max-w-sm rounded-2xl px-4 py-3 text-center font-display text-[15px] font-semibold shadow-[0_6px_0_rgba(28,24,48,0.15)] ${className}`}
    >
      {children}
    </motion.div>
  );
}
