import { motion } from 'framer-motion';
import { Fragment, useEffect, useMemo, useState } from 'react';
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

const monthFmt = new Intl.DateTimeFormat('fr-FR', { month: 'short' });
const dayLongFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const SHADES = ['#ECEAF4', '#C9C2FA', '#9D92F7', '#7566F3', '#5B4CF0'];
const SHADE_LABELS = ['0', '1', '2-3', '4-5', '6+'];
const shadeIndex = (n: number) => (n === 0 ? 0 : n === 1 ? 1 : n <= 3 ? 2 : n <= 5 ? 3 : 4);
const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const plural = (n: number, word: string) => `${fmt(n)} ${word}${n > 1 ? 's' : ''}`;

function useWide() {
  const query = '(min-width: 640px)';
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const m = window.matchMedia(query);
    const on = () => setWide(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return wide;
}

/**
 * GitHub-style grid. Days without tasks stay neutral grey, never red.
 * Today is outlined so the eye lands on it first; tapping a day shows its count below.
 */
function Heatmap({ counts }: { counts: Record<string, number> }) {
  const wide = useWide();
  const weeks = wide ? 39 : 17;
  const today = dayKey();
  const [picked, setPicked] = useState(today);
  const offset = (parseDay(today).getDay() + 6) % 7;
  const start = addDays(today, -offset - (weeks - 1) * 7);
  const cols = Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const key = addDays(start, w * 7 + d);
      return { key, n: counts[key] ?? 0, future: key > today };
    }),
  );

  // Month label on the column holding the 1st of the month (the first column too, unless a label follows too closely).
  const months = cols.map((col, i) => {
    const first = col.find((c) => c.key.endsWith('-01'));
    if (first) return monthFmt.format(parseDay(first.key)).replace('.', '');
    if (i === 0 && !cols.slice(1, 3).some((c) => c.some((x) => x.key.endsWith('-01')))) return monthFmt.format(parseDay(col[0].key)).replace('.', '');
    return '';
  });

  const past = cols.flat().filter((c) => !c.future);
  const total = past.reduce((a, c) => a + c.n, 0);
  const active = past.filter((c) => c.n > 0).length;
  const best = past.reduce((b, c) => (c.n > b.n ? c : b), past[0]);
  const pickedN = counts[picked] ?? 0;
  const pickedLabel = picked === today ? "Aujourd'hui" : dayLongFmt.format(parseDay(picked));

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-semibold text-muted">
        {total === 0 ? (
          'Chaque tâche terminée colorera une case. Les plus foncées sont tes plus grosses journées.'
        ) : (
          <>
            <span className="font-bold text-ink">{plural(total, 'tâche')}</span> sur{' '}
            <span className="font-bold text-ink">{plural(active, 'jour')}</span> ces {wide ? '9' : '4'} derniers mois
            {best.n > 1 && (
              <>
                {' '}· record : <span className="font-bold text-ink">{best.n}</span> le {shortFmt.format(parseDay(best.key))}
              </>
            )}
          </>
        )}
      </p>

      <div
        className="grid gap-[3px] sm:gap-1"
        style={{ gridTemplateColumns: `auto repeat(${weeks}, minmax(0, 1fr))` }}
        role="grid"
        aria-label="Calendrier des tâches terminées"
      >
        <span />
        {months.map((m, i) => (
          <span key={i} className="h-4 overflow-visible text-[11px] leading-4 font-bold whitespace-nowrap text-muted capitalize">
            {m}
          </span>
        ))}
        {DAY_LABELS.map((label, d) => (
          <Fragment key={d}>
            <span className="pr-1.5 text-[10px] leading-none font-semibold text-off sm:text-[11px]" style={{ alignSelf: 'center' }}>
              {label}
            </span>
            {cols.map((col, i) => {
              const c = col[d];
              const isToday = c.key === today;
              const isPicked = c.key === picked;
              if (c.future) return <span key={c.key} />;
              return (
                <motion.button
                  key={c.key}
                  type="button"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: i * 0.012 }}
                  onClick={() => setPicked(c.key)}
                  aria-label={`${isToday ? "Aujourd'hui" : dayLongFmt.format(parseDay(c.key))} : ${plural(c.n, 'tâche')}`}
                  aria-pressed={isPicked}
                  className={`aspect-square w-full rounded-[3px] outline-offset-1 sm:rounded-[4px] ${
                    isPicked ? 'outline-2 outline-ink' : isToday ? 'outline-2 outline-indigo' : ''
                  }`}
                  style={{ background: SHADES[shadeIndex(c.n)] }}
                />
              );
            })}
          </Fragment>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <motion.div
          key={picked}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2.5 rounded-xl bg-bg px-3 py-2"
          aria-live="polite"
        >
          <span className="size-3.5 shrink-0 rounded-[4px]" style={{ background: SHADES[shadeIndex(pickedN)] }} aria-hidden />
          <span className="text-sm font-semibold text-muted first-letter:uppercase">
            <span className="text-ink">{pickedLabel}</span> ·{' '}
            {pickedN > 0 ? <span className="font-bold text-ink">{plural(pickedN, 'tâche')} terminée{pickedN > 1 ? 's' : ''}</span> : picked === today ? 'la journée commence' : 'journée calme'}
          </span>
        </motion.div>
        <div className="flex items-center gap-1 self-end text-[11px] font-semibold text-muted sm:self-auto">
          <span className="mr-0.5">Moins</span>
          {SHADES.map((s, i) => (
            <span key={s} title={`${SHADE_LABELS[i]} tâche${i > 1 ? 's' : ''}`} className="size-3 rounded-[3px]" style={{ background: s }} />
          ))}
          <span className="ml-0.5">Plus</span>
        </div>
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
        <Heatmap counts={counts} />
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
