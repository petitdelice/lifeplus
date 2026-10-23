import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Called by the "Revenir aux tâches" button before the boundary resets. */
  onReset?: () => void;
}

/**
 * Shows a friendly message instead of a blank page when a screen crashes.
 * The game data lives in localStorage and is not touched.
 */
export class ErrorBoundary extends Component<Props, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error('[lifeplus] screen crashed', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div role="alert" className="mx-auto mt-6 flex max-w-md flex-col gap-3 rounded-3xl bg-white p-6 text-center shadow-card">
        <div className="text-4xl" aria-hidden>
          🧩
        </div>
        <div className="font-display text-lg font-bold">Oups, cette page a coincé</div>
        <p className="text-sm font-medium text-muted">Ta progression est bien enregistrée. Tu peux revenir aux tâches ou recharger la page.</p>
        <code className="rounded-xl bg-bg px-3 py-2 text-left text-xs break-words text-muted select-all">{error.message || String(error)}</code>
        <div className="flex justify-center gap-2">
          <button
            type="button"
            className="press min-h-11 rounded-xl bg-chip px-4 font-display text-[15px] font-semibold"
            onClick={() => {
              this.props.onReset?.();
              this.setState({ error: null });
            }}
          >
            Revenir aux tâches
          </button>
          <button
            type="button"
            className="press min-h-11 rounded-xl bg-indigo px-4 font-display text-[15px] font-semibold text-white shadow-[0_3px_0_var(--color-indigo-dark)]"
            onClick={() => window.location.reload()}
          >
            Recharger
          </button>
        </div>
      </div>
    );
  }
}
