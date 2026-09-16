// src/components/ColorSpectrum.tsx
//
// Full color picker, opened from a button in Settings > Appearance.
//
// The native <input type="color"> was doing the job technically but hands
// off to the OS dialog, which looks different on every platform and sits
// outside the app's own styling. This is the in-app version Arthur asked
// for: a gradient field to pick saturation and brightness, a hue strip
// across the full spectrum, and a hex box for anyone who already knows
// the value they want.
//
// Pointer events (not mouse) so dragging works on touch as well as
// desktop, with setPointerCapture so a drag that leaves the field keeps
// tracking instead of sticking.

import { useRef, useState, useEffect, useCallback } from 'react';

/* ---- color math ------------------------------------------------------ */

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('');
}

function hexToHsv(hex: string): { h: number; s: number; v: number } | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const int = parseInt(m[1], 16);
  const r = ((int >> 16) & 255) / 255;
  const g = ((int >> 8) & 255) / 255;
  const b = (int & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  if (h < 0) h += 360;
  return { h, s: max === 0 ? 0 : d / max, v: max };
}

/* ---- component ------------------------------------------------------- */

export default function ColorSpectrum({
  value,
  onChange,
  onClose,
}: {
  value: string;
  onChange: (hex: string) => void;
  onClose: () => void;
}) {
  const initial = hexToHsv(value) ?? { h: 174, s: 0.9, v: 0.72 };
  const [h, setH] = useState(initial.h);
  const [s, setS] = useState(initial.s);
  const [v, setV] = useState(initial.v);
  const [hexInput, setHexInput] = useState(value);

  const fieldRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);

  const hex = rgbToHex(...hsvToRgb(h, s, v));

  // Push changes upward live, so the whole app previews as you drag -
  // consistent with how the rest of the Appearance tab behaves.
  useEffect(() => {
    onChange(hex);
    setHexInput(hex);
    // onChange identity isn't stable across renders in the parent, and
    // including it would re-fire on every parent render; hex is the real
    // trigger here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hex]);

  // Escape to dismiss, matching the app's other popovers.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const updateFromField = useCallback((clientX: number, clientY: number) => {
    const el = fieldRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = Math.min(Math.max(clientX - r.left, 0), r.width);
    const y = Math.min(Math.max(clientY - r.top, 0), r.height);
    setS(r.width === 0 ? 0 : x / r.width);
    setV(r.height === 0 ? 0 : 1 - y / r.height);
  }, []);

  const updateFromHue = useCallback((clientX: number) => {
    const el = hueRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = Math.min(Math.max(clientX - r.left, 0), r.width);
    setH(r.width === 0 ? 0 : (x / r.width) * 360);
  }, []);

  const dragHandlers = (fn: (x: number, y: number) => void) => ({
    onPointerDown: (e: React.PointerEvent) => {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      fn(e.clientX, e.clientY);
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (e.buttons !== 1) return;
      fn(e.clientX, e.clientY);
    },
  });

  const commitHex = () => {
    const parsed = hexToHsv(hexInput);
    if (parsed) {
      setH(parsed.h); setS(parsed.s); setV(parsed.v);
    } else {
      setHexInput(hex); // reject invalid input rather than silently keeping it
    }
  };

  return (
    <div className="glass-surface rounded-xl p-3 w-[236px] space-y-2.5">
      {/* Saturation / brightness field — hue across X, darkness down Y */}
      <div
        ref={fieldRef}
        {...dragHandlers(updateFromField)}
        className="relative w-full h-[130px] rounded-lg cursor-crosshair touch-none"
        style={{
          background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${h} 100% 50%))`,
        }}
        role="application"
        aria-label="Saturation and brightness"
      >
        <span
          className="absolute w-3.5 h-3.5 rounded-full border-2 border-white shadow pointer-events-none -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${s * 100}%`, top: `${(1 - v) * 100}%`, background: hex }}
        />
      </div>

      {/* Hue strip — the full spectrum, black-to-white handled by the field above */}
      <div
        ref={hueRef}
        {...dragHandlers((x) => updateFromHue(x))}
        className="relative w-full h-3.5 rounded-full cursor-pointer touch-none"
        style={{
          background: 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)',
        }}
        role="slider"
        aria-label="Hue"
        aria-valuenow={Math.round(h)}
        aria-valuemin={0}
        aria-valuemax={360}
      >
        <span
          className="absolute top-1/2 w-4 h-4 rounded-full border-2 border-white shadow pointer-events-none -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${(h / 360) * 100}%`, background: `hsl(${h} 100% 50%)` }}
        />
      </div>

      <div className="flex items-center gap-2">
        <span className="w-7 h-7 rounded-md shrink-0 ring-1 ring-white/20" style={{ background: hex }} />
        <input
          value={hexInput}
          onChange={(e) => setHexInput(e.target.value)}
          onBlur={commitHex}
          onKeyDown={(e) => { if (e.key === 'Enter') commitHex(); }}
          spellCheck={false}
          aria-label="Hex color value"
          className="flex-1 min-w-0 bg-slate-900/60 border border-slate-600/70 rounded-md px-2 py-1 text-[12px] text-slate-200 font-mono focus:outline-none focus:border-slate-400"
        />
        <button
          type="button"
          onClick={onClose}
          className="text-[11px] px-2 py-1 rounded-md text-slate-300 hover:bg-white/10 shrink-0"
        >
          Done
        </button>
      </div>
    </div>
  );
}
