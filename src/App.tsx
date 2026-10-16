import { AnimatePresence, motion } from 'framer-motion';
import { Fragment, useEffect, useState } from 'react';
import { useGame } from './store/game';
import { Header, StreakChip, Wallet } from './components/Header';
import { Celebrations, Toast } from './components/Celebrations';
import { Bag, Check, Path, Plus, User } from './components/icons';
import { TasksScreen } from './screens/Tasks';
import { ShopScreen } from './screens/Shop';
import { CheminScreen } from './screens/Chemin';
import { ProfilScreen } from './screens/Profil';

type Route = 'taches' | 'shop' | 'chemin' | 'profil';

const NAV: { id: Route; label: string; Icon: typeof Check }[] = [
  { id: 'taches', label: 'Tâches', Icon: Check },
  { id: 'shop', label: 'Shop', Icon: Bag },
  { id: 'chemin', label: 'Chemin', Icon: Path },
  { id: 'profil', label: 'Profil', Icon: User },
];

function readRoute(): Route {
  const h = window.location.hash.replace(/^#\/?/, '') as Route;
  return NAV.some((n) => n.id === h) ? h : 'taches';
}

function useRoute(): [Route, (r: Route) => void] {
  const [route, setRoute] = useState<Route>(readRoute);
  useEffect(() => {
    const on = () => setRoute(readRoute());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return [route, (r) => (window.location.hash = `/${r}`)];
}

export default function App() {
  const [route, go] = useRoute();
  const refreshDay = useGame((s) => s.refreshDay);
  const requestNewTask = useGame((s) => s.requestNewTask);

  // Check the streak on launch and whenever the app comes back to the foreground.
  useEffect(() => {
    refreshDay();
    const on = () => document.visibilityState === 'visible' && refreshDay();
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, [refreshDay]);

  useEffect(() => window.scrollTo({ top: 0 }), [route]);

  const screen = { taches: <TasksScreen />, shop: <ShopScreen />, chemin: <CheminScreen />, profil: <ProfilScreen /> }[route];

  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl md:gap-6 md:px-6 md:py-6">
      {/* Side nav on tablets and desktop */}
      <nav aria-label="Navigation" className="sticky top-6 hidden h-[calc(100dvh-3rem)] w-56 shrink-0 flex-col gap-2 md:flex">
        <div className="px-3 pt-1 pb-4 font-display text-2xl font-bold">
          life<span className="text-indigo">plus</span>
        </div>
        <div className="flex gap-2 px-1 pb-3">
          <Wallet className="bg-white shadow-card" />
          <div className="rounded-full bg-white shadow-card">
            <StreakChip />
          </div>
        </div>
        {NAV.map(({ id, label, Icon }) => (
          <a
            key={id}
            href={`#/${id}`}
            aria-current={route === id ? 'page' : undefined}
            className={`press flex min-h-12 items-center gap-3 rounded-2xl px-4 font-display text-[15px] font-semibold no-underline transition-colors ${
              route === id ? 'bg-white text-indigo shadow-card' : 'text-muted hover:bg-white/60'
            }`}
          >
            <Icon size={22} />
            {label}
          </a>
        ))}
      </nav>

      <div className="flex min-w-0 grow flex-col">
        {route === 'taches' && <Header />}
        <main className="flex grow flex-col px-5 pb-36 md:px-0 md:pb-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={route}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="mx-auto w-full max-w-3xl"
            >
              {screen}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Bottom nav on phones */}
      <nav
        aria-label="Navigation"
        className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-between rounded-t-[20px] bg-white px-4 pt-2.5 pb-[max(1.1rem,env(safe-area-inset-bottom))] shadow-[0_-1px_0_var(--color-line),0_-6px_16px_rgba(28,24,48,0.04)] md:hidden"
      >
        {NAV.map(({ id, label, Icon }, i) => (
          <Fragment key={id}>
            {i === 2 && <span className="w-16" aria-hidden />}
            <a
              href={`#/${id}`}
              aria-current={route === id ? 'page' : undefined}
              className={`flex min-w-14 flex-col items-center gap-0.5 p-1 font-display text-[13px] font-semibold no-underline ${route === id ? 'text-indigo' : 'text-muted'}`}
              onClick={(e) => {
                e.preventDefault();
                go(id);
              }}
            >
              <motion.span animate={route === id ? { y: [0, -3, 0] } : { y: 0 }} transition={{ duration: 0.3 }}>
                <Icon size={24} />
              </motion.span>
              {label}
            </a>
          </Fragment>
        ))}
      </nav>

      <motion.button
        type="button"
        onClick={() => {
          go('taches');
          requestNewTask();
        }}
        whileTap={{ scale: 0.9 }}
        whileHover={{ scale: 1.05 }}
        aria-label="Ajouter une tâche"
        className="fixed bottom-[calc(1.6rem+env(safe-area-inset-bottom))] left-1/2 z-30 flex size-15 -translate-x-1/2 items-center justify-center rounded-full bg-indigo text-white shadow-[0_3px_0_var(--color-indigo-dark)] md:right-10 md:bottom-10 md:left-auto md:translate-x-0"
      >
        <Plus size={28} />
      </motion.button>

      <Celebrations />
      <Toast />
    </div>
  );
}
