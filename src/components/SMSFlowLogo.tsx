import Image from "next/image";

/**
 * SMSFlow site brand mark (the resident speech-bubble icon).
 *
 * This is a thin wrapper around the `/logo.png` asset that keeps brand image
 * usage consistent across headers, sidebars, auth pages, hero tiles and empty
 * states. Keep it for site branding; use `FacebookLogo` / `FacebookChip` only
 * where the Facebook/OTP product itself is being represented.
 */
export interface SMSFlowLogoProps {
  /** Intrinsic rendered size in px (square). */
  size?: number;
  className?: string;
  alt?: string;
  /** Render as a high-priority image for above-the-fold brand placement. */
  priority?: boolean;
}

export function SMSFlowLogo({
  size = 40,
  className = "",
  alt = "SMSFlow",
  priority = false,
}: SMSFlowLogoProps) {
  return (
    <Image
      src="/logo.png"
      alt={alt}
      width={size}
      height={size}
      priority={priority}
      className={`w-full h-full object-cover ${className}`}
    />
  );
}
