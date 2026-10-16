import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, type ReactNode } from 'react';
import { Close } from './icons';

type Tone = 'indigo' | 'lemon' | 'mint' | 'soft' | 'ghost' | 'off';

const TONES: Record<Tone, string> = {
  indigo: 'bg-indigo text-white shadow-[0_3px_0_var(--color-indigo-dark)]',
  lemon: 'bg-lemon text-ink shadow-[0_3px_0_var(--color-lemon-dark)]',
  mint: 'bg-mint text-[#0F3D33] shadow-[0_3px_0_var(--color-mint-dark)]',
  soft: 'bg-chip text-ink',
  ghost: 'bg-transparent text-muted border-[1.5px] border-line',
  off: 'bg-[#F3EEF7] text-off shadow-[0_3px_0_#E4DCEC]',
};

export function Button({
  tone = 'indigo',
  className = '',
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone }) {
  return (
    <button
      type="button"
      className={`press min-h-11 rounded-xl px-4 font-display text-[15px] font-semibold disabled:opacity-60 ${TONES[tone]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Bottom sheet on phones, centered dialog on larger screens. */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40 flex items-end justify-center bg-ink/45 sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-3xl bg-white shadow-pop sm:rounded-3xl"
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-2">
              <h2 className="font-display text-xl font-bold">{title}</h2>
              <button type="button" onClick={onClose} aria-label="Fermer" className="press -mr-2 flex size-11 items-center justify-center rounded-full text-muted">
                <Close />
              </button>
            </div>
            <div className="overflow-y-auto px-5 pb-4">{children}</div>
            {footer && <div className="border-t border-line px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Small centered confirmation, like the resale pop-up of the mockup. */
export function Confirm({
  open,
  title,
  children,
  confirmLabel,
  onConfirm,
  onCancel,
  danger = false,
}: {
  open: boolean;
  title: string;
  children?: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
        >
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-label={title}
            className="flex w-full max-w-xs flex-col gap-4 rounded-3xl bg-white px-5 pt-6 pb-5 text-center shadow-pop"
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 18, stiffness: 340 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="font-display text-xl font-bold">{title}</div>
            {children}
            <div className="flex gap-2.5">
              <Button tone="soft" className="flex-1" onClick={onCancel}>
                Annuler
              </Button>
              <Button tone="indigo" className={`flex-1 ${danger ? '!bg-r-mythique !shadow-[0_3px_0_#7A0C3E]' : ''}`} onClick={onConfirm} autoFocus>
                {confirmLabel}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1 rounded-xl bg-chip p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`relative min-h-10 flex-1 rounded-lg px-2 font-display text-sm font-semibold transition-colors ${
            value === o.value ? 'text-white' : 'text-ink'
          }`}
        >
          {value === o.value && (
            <motion.span layoutId={`seg-${label}`} className="absolute inset-0 rounded-lg bg-ink" transition={{ type: 'spring', damping: 26, stiffness: 380 }} />
          )}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

/** 1..n picker with the meaning of the chosen value written under it. */
export function Scale({
  label,
  value,
  onChange,
  labels,
  start = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  labels: string[];
  start?: number;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 font-display text-sm font-semibold">{label}</legend>
      <div className="flex gap-1.5">
        {labels.map((l, i) => {
          const v = i + start;
          const on = v === value;
          return (
            <button
              key={v}
              type="button"
              aria-label={`${label} : ${l}`}
              aria-pressed={on}
              onClick={() => onChange(v)}
              className={`press min-h-11 flex-1 rounded-xl font-display text-base font-bold transition-colors ${
                on ? 'bg-indigo text-white shadow-[0_3px_0_var(--color-indigo-dark)]' : 'bg-chip text-ink'
              }`}
            >
              {v}
            </button>
          );
        })}
      </div>
      <div className="text-sm font-semibold text-muted">{labels[value - start]}</div>
    </fieldset>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="font-display text-sm font-semibold">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  'min-h-12 w-full rounded-xl border-[1.5px] border-line bg-white px-4 text-base font-semibold text-ink placeholder:text-off focus:border-indigo focus:outline-none';
