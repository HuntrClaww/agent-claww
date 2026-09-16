// src/components/Brand.tsx
//
// StageEgo's brand mark, replacing the 🎭 emoji that was standing in for
// a logo across the auth screen, sidebar, settings header and launch
// shell. An emoji renders differently on every OS, can't take the user's
// accent color, and reads as a placeholder - which is exactly how it
// looked next to real icons elsewhere in the app.
//
// The mark is two overlapping mask-like forms: one filled, one outlined,
// sharing a silhouette. That's the product in one shape - two sides of
// the same character (Generic and Personality), one identity underneath.
// It inherits the accent gradient, so it restyles with the user's theme
// instead of being a fixed image.

export function BrandMark({ size = 32, className = '' }: { size?: number; className?: string }) {
  // Unique per instance so multiple marks on one page don't collide on
  // gradient IDs (which are document-global in SVG).
  const gid = `sg-grad-${size}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      role="img"
      aria-label="StageEgo"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--user-accent, #14b8a6)" />
          <stop offset="100%" stopColor="var(--user-accent-secondary, #06b6d4)" />
        </linearGradient>
      </defs>

      {/* Back form — the "other" self, offset and outlined only */}
      <path
        d="M30 8c6.6 0 11 4 11 10 0 8.5-4.2 17-11 20.5"
        stroke={`url(#${gid})`}
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.45"
      />
      <path
        d="M30 8c6.6 0 11 4 11 10 0 8.5-4.2 17-11 20.5-1.6.8-3.2 1.2-4.6 1.2"
        stroke={`url(#${gid})`}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.45"
        fill="none"
      />

      {/* Front form — filled mask silhouette */}
      <path
        d="M18 7c-7.2 0-12 4.4-12 11 0 9.4 4.6 18.7 12 22.6C25.4 36.7 30 27.4 30 18c0-6.6-4.8-11-12-11z"
        fill={`url(#${gid})`}
      />

      {/* Eyes — negative space, angled to read as expression rather than dots */}
      <path d="M12.5 17.5c1.6-1.4 3.6-1.4 5 0" stroke="var(--surface-base, #0f172a)" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M19.5 17.5c1.6-1.4 3.6-1.4 5 0" stroke="var(--surface-base, #0f172a)" strokeWidth="2.2" strokeLinecap="round" />

      {/* Mouth — a curve that reads as performance, not a smiley */}
      <path
        d="M13 26c2.2 3.4 7.8 3.4 10 0"
        stroke="var(--surface-base, #0f172a)"
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

/** Mark + wordmark lockup, for headers and the auth screen. */
export function BrandLockup({
  size = 32,
  textClass = 'text-2xl',
  className = '',
}: {
  size?: number;
  textClass?: string;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <BrandMark size={size} />
      <span
        className={`${textClass} font-bold bg-clip-text text-transparent tracking-tight`}
        style={{ backgroundImage: 'linear-gradient(90deg, var(--user-accent), var(--user-accent-secondary))' }}
      >
        StageEgo
      </span>
    </span>
  );
}
