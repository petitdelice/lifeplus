import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useGame } from '../store/game';
import { levelInfo, nextStreakTier, streakMultiplier } from '../game/rules';
import { fmt, fmtMult } from '../game/rarity';
import { Flame, Snow, Spark } from './icons';

export function AnimatedNumber({ value }: { value: number }) {
  const mv = useMotionValue(value);
  const text = useTransform(mv, (v) => fmt(Math.round(v)));
  useEffect(() => {
    const c = animate(mv, value, { duration: 0.7, ease: 'easeOut' });
    return () => c.stop();
  }, [value, mv]);
  return <motion.span>{text}</motion.span>;
}

/** Wiggles a chip briefly whenever its value changes. */
function usePulse(value: number) {
  const first = useRef(true);
  const [key, setKey] = useState(0);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setKey((k) => k + 1);
  }, [value]);
  return key;
}

/** The flame grows and changes colour at each tier. */
export function flameColor(streak: number) {
  if (streak >= 30) return '#F43F5E';
  if (streak >= 14) return '#8B5CF6';
  if (streak >= 7) return '#FF7A1C';
  if (streak >= 3) return '#FF9F1C';
  return '#FFB54D';
}

export function flameSize(streak: number) {
  if (streak >= 30) return 22;
  if (streak >= 14) return 21;
  if (streak >= 7) return 20;
  return 18;
}

export function Wallet({ className = '' }: { className?: string }) {
  const eclats = useGame((s) => s.eclats);
  const pulse = usePulse(eclats);
  return (
    <motion.div
      key={pulse}
      animate={pulse ? { scale: [1, 1.12, 1] } : undefined}
      transition={{ duration: 0.4 }}
      className={`flex items-center gap-1.5 rounded-full bg-bg px-3 py-1.5 font-display text-base font-semibold ${className}`}
      aria-label={`${eclats} éclats`}
    >
      <Spark className="animate-bounce-soft text-grape" />
      <AnimatedNumber value={eclats} />
    </motion.div>
  );
}

export function StreakChip() {
  const streak = useGame((s) => s.streak);
  return (
    <div
      data-tuto="streak"
      className="flex items-center gap-1.5 rounded-full bg-bg px-3 py-1.5 font-display text-base font-semibold"
      aria-label={`Streak de ${streak.current} jours`}
      title={streak.freezes ? `${streak.freezes} gel${streak.freezes > 1 ? 's' : ''} de streak en stock` : undefined}
    >
      <Flame className="animate-wiggle" size={flameSize(streak.current)} style={{ color: flameColor(streak.current) }} />
      {streak.current}
      {streak.freezes > 0 && <Snow size={14} className="text-sky" />}
    </div>
  );
}

export function Header() {
  const totalXp = useGame((s) => s.totalXp);
  const streak = useGame((s) => s.streak.current);
  const { level, into, need } = levelInfo(totalXp);
  const mult = streakMultiplier(streak);
  const next = nextStreakTier(streak);

  return (
    <header className="flex flex-col gap-3.5 rounded-b-3xl bg-white px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-4 shadow-card md:rounded-3xl md:pt-5">
      <div className="flex items-center justify-between md:hidden">
        <div className="font-display text-xl font-bold">
          life<span className="text-indigo">plus</span>
        </div>
        <div className="flex gap-2">
          <Wallet />
          <StreakChip />
        </div>
      </div>
      <div className="flex items-center gap-3" data-tuto="level">
        <motion.div
          key={level}
          initial={{ scale: 0.6, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', damping: 10, stiffness: 260 }}
          className="flex size-12 shrink-0 items-center justify-center rounded-full bg-lemon font-display text-xl font-bold shadow-[0_4px_0_var(--color-lemon-dark)]"
        >
          {level}
        </motion.div>
        <div className="flex grow flex-col gap-1.5">
          <div className="flex justify-between font-display text-sm font-semibold">
            <span>Niveau {level}</span>
            <span className="text-muted">
              {fmt(into)} / {fmt(need)} XP
            </span>
          </div>
          <div
            className="h-3.5 overflow-hidden rounded-full bg-lemon-soft"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={need}
            aria-valuenow={into}
            aria-label="XP vers le niveau suivant"
          >
            <motion.div
              className="h-full rounded-full bg-lemon shadow-[inset_0_-3px_0_#E6B800]"
              initial={false}
              animate={{ width: `${Math.max(3, (into / need) * 100)}%` }}
              transition={{ type: 'spring', damping: 14, stiffness: 120 }}
            />
          </div>
        </div>
      </div>
      {streak > 0 && (
        <div className="self-start rounded-xl bg-orange-soft px-2.5 py-1.5 text-[13px] font-bold text-amber-ink">
          {mult > 1
            ? `Streak de ${streak} jours : tous tes gains ${fmtMult(mult)}`
            : `Streak de ${streak} jour${streak > 1 ? 's' : ''} : bonus ${fmtMult(next!.mult)} à ${next!.days} jours`}
        </div>
      )}
    </header>
  );
}
