/**
 * Tiny stroke icons used by the sign-in / sign-up pages.
 *
 * These replace the emoji glyphs that used to sit in the inputs and the
 * feature list: emoji render inconsistently across platforms (and pull in a
 * colour-font raster pass), while these are 1 KB of inline SVG that inherit
 * `currentColor`.
 */

type IconProps = { className?: string; size?: number };

function base(size: number, className?: string) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };
}

export function UserIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export function LockIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export function ShieldCheckIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function BoltIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
    </svg>
  );
}

export function TagIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M20.6 13.4 12 22l-9-9V4a1 1 0 0 1 1-1h8l8.6 8.6a1.4 1.4 0 0 1 0 1.8Z" />
      <circle cx="7.5" cy="7.5" r="1.2" />
    </svg>
  );
}

export function AlertIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v6" />
      <path d="M12 16.5v.5" />
    </svg>
  );
}
