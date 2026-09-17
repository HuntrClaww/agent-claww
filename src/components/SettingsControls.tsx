// src/components/SettingsControls.tsx
//
// Shared layout primitives for the Settings modal.
//
// Why these exist: the first pass built every choice as a big tappable
// card, which ate vertical space fast and pushed most controls below the
// fold. These follow the pattern the reference dashboards use - a
// collapsible section, and inside it compact rows with the label on the
// left and the control on the right. Same information, a fraction of the
// height, and it scales as more settings get added rather than turning
// into an endless wall of cards.
//
// Use these for any new setting instead of hand-rolling markup, so tabs
// stay visually consistent as the app grows.

import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

/** Collapsible group of settings. Defaults open; pass defaultOpen={false}
 *  for advanced/rarely-touched groups so they stay out of the way. */
export function Section({
  title,
  hint,
  icon,
  defaultOpen = true,
  children,
}: {
  title: string;
  hint?: string;
  icon?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-slate-700/60 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-2.5 py-3 text-left group"
      >
        {icon && <span className="text-slate-400 shrink-0">{icon}</span>}
        <span className="flex-1 min-w-0">
          <span className="block text-[13px] font-semibold text-slate-200 tracking-wide">{title}</span>
          {hint && <span className="block text-[11px] text-slate-500 leading-tight mt-0.5">{hint}</span>}
        </span>
        <ChevronDown
          size={16}
          className={`text-slate-500 shrink-0 transition-transform group-hover:text-slate-300 ${open ? 'rotate-180' : ''}`}
          style={{ transitionDuration: 'var(--motion-fast)' }}
        />
      </button>
      {open && <div className="pb-4 space-y-1">{children}</div>}
    </div>
  );
}

/** One setting: label (and optional hint) on the left, control on the
 *  right. `stack` puts the control on its own line underneath instead,
 *  for controls that need the full width (sliders, color pairs). */
export function Row({
  label,
  hint,
  control,
  stack = false,
}: {
  label: string;
  hint?: string;
  control: ReactNode;
  stack?: boolean;
}) {
  if (stack) {
    return (
      <div className="py-1.5">
        <div className="flex items-baseline justify-between gap-3 mb-1.5">
          <span className="text-[13px] text-slate-300">{label}</span>
          {hint && <span className="text-[11px] text-slate-500 text-right">{hint}</span>}
        </div>
        {control}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 py-1.5 min-h-[34px]">
      <span className="flex-1 min-w-0">
        <span className="block text-[13px] text-slate-300">{label}</span>
        {hint && <span className="block text-[11px] text-slate-500 leading-tight">{hint}</span>}
      </span>
      <span className="shrink-0">{control}</span>
    </div>
  );
}

/** Compact pill toggle - replaces a row of large choice cards. Options
 *  stay on one line, so three modes cost ~34px of height instead of ~90. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex rounded-lg border border-slate-600/70 p-0.5 bg-slate-900/40"
    >
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.id)}
            className={`px-2.5 py-1 text-[12px] rounded-md whitespace-nowrap transition-colors ${
              active ? 'text-slate-900 font-medium' : 'text-slate-400 hover:text-slate-200'
            }`}
            style={active ? { background: 'var(--user-accent)' } : undefined}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Native select, styled to match. Better than a pill group once there
 *  are more than ~4 options, or when labels are long. */
export function Select<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
  ariaLabel?: string;
}) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="bg-slate-900/60 border border-slate-600/70 rounded-lg px-2.5 py-1.5 text-[12px] text-slate-200 focus:outline-none focus:border-slate-400 cursor-pointer min-w-[130px]"
    >
      {options.map((o) => (
        <option key={o.id} value={o.id}>{o.label}</option>
      ))}
    </select>
  );
}

/** Inline slider with its live value. Kept on one row so a handful of
 *  them read as a tidy group rather than a stack of blocks. `decimals`
 *  formats the displayed value (and drives the step precision) for
 *  continuous values like pitch (1.3) rather than forcing everything
 *  through integer-plus-unit display. */
export function Slider({
  value, min, max, step, unit, onChange, ariaLabel, decimals = 0,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
  ariaLabel: string;
  decimals?: number;
}) {
  return (
    <div className="flex items-center gap-2.5 w-full">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={ariaLabel}
        className="flex-1 cursor-pointer h-1.5"
        style={{ accentColor: 'var(--user-accent)' }}
      />
      <span className="text-[11px] text-slate-400 tabular-nums w-[46px] text-right shrink-0">
        {value.toFixed(decimals)}{unit}
      </span>
    </div>
  );
}

/** Color swatches as a single compact strip, instead of one card each. */
export function SwatchRow({
  value,
  swatches,
  onChange,
}: {
  value: string;
  swatches: { id: string; label: string; primary: string; secondary: string }[];
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {swatches.map((s) => {
        const active = s.id === value;
        return (
          <button
            key={s.id}
            type="button"
            title={s.label}
            aria-label={s.label}
            aria-pressed={active}
            onClick={() => onChange(s.id)}
            className={`w-7 h-7 rounded-full shrink-0 transition-transform ${active ? 'ring-2 ring-offset-2 ring-offset-slate-800 scale-110' : 'ring-1 ring-white/15 hover:scale-105'}`}
            style={{
              background: `linear-gradient(135deg, ${s.primary}, ${s.secondary})`,
              ...(active ? { ['--tw-ring-color' as string]: 'var(--user-accent)' } : {}),
            }}
          />
        );
      })}
    </div>
  );
}

/** Small on/off switch for boolean settings. */
export function Toggle({
  checked, onChange, ariaLabel,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={`relative w-9 h-5 rounded-full transition-colors ${checked ? '' : 'bg-slate-600'}`}
      style={checked ? { background: 'var(--user-accent)' } : undefined}
    >
      <span
        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`}
        style={{ transitionDuration: 'var(--motion-fast)' }}
      />
    </button>
  );
}
