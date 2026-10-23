import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { useGame, snapshot } from '../store/game';
import { dayCounts, levelDaysAgo, rarityCounts, type MomentKind } from '../game/engine';
import { BADGES } from '../game/badges';
import { RARITIES, addDays, dayKey, daysBetween, levelInfo, parseDay } from '../game/rules';
import { RARITY_UI, fmt } from '../game/rarity';
import { Flame, Spark } from '../components/icons';

const MOMENT_ICON: Record<MomentKind, string> = {
  level: '⭐',
  rarity: '🏆',
  project: '🧱',
  streak: '🔥',
  unlock: '🎁',
};

const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' });
const shortFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });

function Tile({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl bg-white p-3.5 shadow-card">
      <div className="flex items-center gap-1.5 font-display text-2xl font-bold">
        {icon}
        {value}
      </div>
      <div className="text-xs font-semibold text-muted">{label}</div>
    </div>
  );
}

/** GitHub-style grid. Days without tasks stay neutral grey, never red. */
function Heatmap({ counts, weeks }: { counts: Record<string, number>; weeks: number }) {
  const today = dayKey();
  const offset = (parseDay(today).getDay() + 6) % 7;
  const start = addDays(today, -offset - (weeks - 1) * 7);
  const shades = ['#ECEAF4', '#C9C2FA', '#9D92F7', '#7566F3', '#5B4CF0'];
  const shade = (n: number) => shades[n === 0 ? 0 : n === 1 ? 1 : n <= 3 ? 2 : n <= 5 ? 3 : 4];
  const cols = Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const key = addDays(start, w * 7 + d);
      return { key, n: counts[key] ?? 0, future: key > today };
    }),
  );
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-[3px] overflow-x-auto pb-1" role="img" aria-label="Calendrier des tâches terminées">
        {cols.map((col, i) => (
          <div key={i} className="flex flex-col gap-[3px]">
            {col.map((c) => (
              <motion.div
                key={c.key}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.012 }}
                title={c.future ? undefined : `${shortFmt.format(parseDay(c.key))} : ${c.n} tâche${c.n > 1 ? 's' : ''}`}
                className="size-3.5 rounded-[4px]"
                style={{ background: c.future ? 'transparent' : shade(c.n) }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 self-end text-[11px] font-semibold text-muted">
        Moins
        {shades.map((s) => (
          <span key={s} className="size-3 rounded-[3px]" style={{ background: s }} />
        ))}
        Plus
      </div>
    </div>
  );
}

export function CheminScreen() {
  const state = useGame();
  const s = snapshot(state);
  const [badgeOpen, setBadgeOpen] = useState<string | null>(null);
  const today = dayKey();
  const level = levelInfo(s.totalXp).level;
  const counts = useMemo(() => dayCounts(s), [s.completions]);
  const byRarity = rarityCounts(s);
  const projectsDone = s.tasks.filter((t) => t.kind === 'project' && t.finishedDay).length;
  const age = daysBetween(s.startedDay, today);

  // Before / now, shown only when it is positive.
  const span = age >= 30 ? 30 : age >= 7 ? 7 : 0;
  const before = span ? levelDaysAgo(s, span, today) : 1;
  const showBefore = level > before;

  const moments = [...s.moments].reverse();
  const earned = BADGES.filter((b) => s.badges[b.id]).length;

  return (
    <div className="flex flex-col gap-5 pt-4">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold">Chemin parcouru</h1>
        <p className="text-sm font-semibold text-muted">
          {age === 0 ? "Ton aventure commence aujourd'hui." : `Depuis le ${dateFmt.format(parseDay(s.startedDay))}, regarde tout ce que tu as fait.`}
        </p>
      </div>

      {showBefore && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-end justify-around gap-3 rounded-3xl bg-indigo p-5 text-white shadow-[0_4px_0_var(--color-indigo-dark)]"
        >
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs font-semibold opacity-80">{span ? `Il y a ${span} jours` : 'Au début'}</span>
            <span className="font-display text-[28px] leading-8 font-bold opacity-80">Niveau {before}</span>
          </div>
          <span className="mb-1 text-2xl" aria-hidden>
            →
          </span>
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs font-semibold opacity-80">Aujourd'hui</span>
            <span className="font-display text-[28px] leading-8 font-bold">Niveau {level}</span>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Tile label="Tâches terminées" value={fmt(s.completions.length)} />
        <Tile label="XP au total" value={fmt(s.totalXp)} />
        <Tile label="Éclats gagnés" value={fmt(s.earned)} icon={<Spark className="animate-bounce-soft text-grape" />} />
        <Tile label="Plaisirs profités" value={fmt(s.enjoyed)} />
        <Tile label="Projets finis" value={fmt(projectsDone)} />
        <Tile label="Plus long streak" value={`${s.streak.best} j`} icon={<Flame className="animate-wiggle text-orange" />} />
      </div>

      <section className="flex flex-col gap-3 rounded-3xl bg-white p-4 shadow-card">
        <h2 className="font-display text-lg font-bold">Par rareté</h2>
        <div className="flex flex-col gap-2">
          {RARITIES.map((r) => {
            const n = byRarity[r];
            const max = Math.max(1, ...Object.values(byRarity));
            return (
              <div key={r} className="flex items-center gap-3">
                <span className={`w-24 shrink-0 text-sm font-bold ${RARITY_UI[r].text}`}>{RARITY_UI[r].label}</span>
                <div className="h-3 grow overflow-hidden rounded-full bg-bg">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: RARITY_UI[r].ring }}
                    initial={{ width: 0 }}
                    animate={{ width: `${(n / max) * 100}%` }}
                    transition={{ type: 'spring', damping: 18 }}
                  />
                </div>
                <span className="w-8 text-right font-display text-sm font-bold">{n}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-3xl bg-white p-4 shadow-card" data-tuto="badges">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-lg font-bold">Badges</h2>
          <span className="text-sm font-semibold text-muted">
            {earned}/{BADGES.length}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
          {BADGES.map((b, i) => {
            const got = s.badges[b.id];
            const open = badgeOpen === b.id;
            return (
              <motion.button
                key={b.id}
                type="button"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.02, type: 'spring', damping: 14 }}
                whileTap={{ scale: 0.9, rotate: -6 }}
                onClick={() => setBadgeOpen(open ? null : b.id)}
                aria-label={got ? `${b.name}, obtenu le ${dateFmt.format(parseDay(got))}` : `Badge à découvrir : ${b.hint}`}
                aria-expanded={open}
                className="flex flex-col items-center gap-1"
              >
                <span
                  className={`flex size-14 items-center justify-center rounded-2xl text-[28px] ${got ? 'bg-lemon-soft shadow-[0_3px_0_#F2DC8A]' : 'bg-bg grayscale'}`}
                  style={got ? undefined : { filter: 'grayscale(1) brightness(0.2)', opacity: 0.18 }}
                >
                  {b.emoji}
                </span>
                <span className={`text-center text-[11px] leading-tight font-bold ${got ? '' : 'text-off'}`}>{got ? b.name : '???'}</span>
              </motion.button>
            );
          })}
        </div>
        {badgeOpen && (
          <motion.div key={badgeOpen} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl bg-bg px-3 py-2 text-sm font-semibold text-muted">
            {(() => {
              const b = BADGES.find((x) => x.id === badgeOpen)!;
              const got = s.badges[b.id];
              return got ? `${b.name} : ${b.hint.toLowerCase()}, le ${dateFmt.format(parseDay(got))}.` : `À découvrir : ${b.hint.toLowerCase()}.`;
            })()}
          </motion.div>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-3xl bg-white p-4 shadow-card">
        <h2 className="font-display text-lg font-bold">Calendrier</h2>
        <Heatmap counts={counts} weeks={18} />
      </section>

      <section className="flex flex-col gap-3 rounded-3xl bg-white p-4 shadow-card">
        <h2 className="font-display text-lg font-bold">Grands moments</h2>
        {moments.length === 0 ? (
          <p className="text-sm font-medium text-muted">Tes montées de niveau, projets finis et paliers de streak apparaîtront ici.</p>
        ) : (
          <ol className="flex flex-col">
            {moments.slice(0, 40).map((m, i) => (
              <motion.li
                key={m.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i, 10) * 0.04 }}
                className="relative flex items-center gap-3 py-2 pl-1"
              >
                <span className="z-10 flex size-9 shrink-0 items-center justify-center rounded-full bg-bg text-lg" aria-hidden>
                  {MOMENT_ICON[m.kind]}
                </span>
                {i < Math.min(moments.length, 40) - 1 && <span className="absolute top-11 left-[22px] h-[calc(100%-28px)] w-0.5 bg-line" aria-hidden />}
                <span className="grow text-sm font-bold">{m.label}</span>
                <span className="shrink-0 text-xs font-semibold text-muted">{shortFmt.format(parseDay(m.day))}</span>
              </motion.li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
