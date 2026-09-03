import { useId } from "react";

/**
 * Facebook brand mark.
 *
 * Rendered as inline SVG using the official "f" glyph geometry, so it is crisp
 * at any size, needs no extra network request and — unlike the 📘 emoji — it
 * actually looks like Facebook on every platform (the emoji is a blue *book* on
 * Windows/Noto and a yellow-ish book on some Android builds).
 *
 * variant="badge" -> the familiar blue rounded-square app icon (default)
 * variant="glyph" -> bare "f" that inherits `currentColor` (for chips/buttons)
 */

/** Facebook "f" glyph, authored on a 320 x 512 grid. */
const F_PATH =
  "M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.43 0 225.36 0c-73.22 0-121.08 44.38-121.08 124.72v70.62H22.89V288h81.39v224c101.79-15.12 114.75-18.31 114.75-18.31v-205.64h80.12z";

/** Glyph bounds on that grid, used to centre + size it inside the badge. */
const GLYPH = { x: 22.89, y: 0, w: 276.26, h: 512 };

export type FacebookLogoVariant = "badge" | "glyph";

export interface FacebookLogoProps {
  /** Rendered size in px (square). */
  size?: number;
  variant?: FacebookLogoVariant;
  className?: string;
  /** Set false for purely decorative marks so screen readers skip them. */
  accessible?: boolean;
}

export function FacebookLogo({ size = 24, variant = "badge", className = "", accessible = true }: FacebookLogoProps) {
  // useId() contains ":" which is fine for fragment references but awkward for
  // CSS/querySelector, so strip it and keep the id unique per instance.
  const gradientId = `fb-tile-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  if (variant === "glyph") {
    return (
      <svg
        viewBox={`${GLYPH.x} 0 ${GLYPH.w} ${GLYPH.h}`}
        width={size}
        height={size}
        className={className}
        role={accessible ? "img" : undefined}
        aria-label={accessible ? "Facebook" : undefined}
        aria-hidden={accessible ? undefined : true}
        focusable="false"
        fill="currentColor"
      >
        <path d={F_PATH} />
      </svg>
    );
  }

  // 48x48 app icon: blue tile + white "f". The glyph is scaled to ~83% of the
  // tile height and its stem runs flush to the bottom edge, exactly like the
  // official Facebook app icon.
  const box = 48;
  const glyphHeight = 40;
  const scale = glyphHeight / GLYPH.h;
  const glyphWidth = GLYPH.w * scale;
  const tx = (box - glyphWidth) / 2 - GLYPH.x * scale;
  const ty = box - glyphHeight;

  return (
    <svg
      viewBox={`0 0 ${box} ${box}`}
      width={size}
      height={size}
      className={className}
      role={accessible ? "img" : undefined}
      aria-label={accessible ? "Facebook" : undefined}
      aria-hidden={accessible ? undefined : true}
      focusable="false"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0%" stopColor="#1B83F8" />
          <stop offset="55%" stopColor="#1877F2" />
          <stop offset="100%" stopColor="#0B5FD1" />
        </linearGradient>
      </defs>
      <rect width={box} height={box} rx="12.5" fill={`url(#${gradientId})`} />
      <g transform={`translate(${tx.toFixed(3)} ${ty.toFixed(3)}) scale(${scale.toFixed(6)})`} fill="#ffffff">
        <path d={F_PATH} />
      </g>
    </svg>
  );
}

/** Small "Facebook" service chip used on number cards and the buy bar. */
export function FacebookChip({ label = "Facebook", className = "" }: { label?: string; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border border-[#1877F2]/30 bg-[#1877F2]/10 px-2.5 py-1.5 text-xs font-bold tracking-wide text-[#8ab9f9] ${className}`}
    >
      <FacebookLogo size={14} accessible={false} />
      {label}
    </span>
  );
}
