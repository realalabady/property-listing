import { cn } from "@/lib/utils/cn";

/**
 * The Raei lockup: a gradient brand tile carrying the Arabic letter "ر", plus
 * the wordmark.
 *
 * The mark is typographic on purpose — a generic house glyph says "some real
 * estate site", the letterform says Raei. It also sidesteps the emoji-as-icon
 * problem in email, where the same mark is rebuilt with a text character.
 */

type LogoSize = "sm" | "md" | "lg";

const MARK: Record<LogoSize, string> = {
  sm: "h-9 w-9 rounded-lg text-lg",
  md: "h-11 w-11 rounded-xl text-xl",
  lg: "h-14 w-14 rounded-2xl text-2xl",
};

const WORD: Record<LogoSize, string> = {
  sm: "text-base",
  md: "text-lg",
  lg: "text-2xl",
};

interface RaeiLogoProps {
  size?: LogoSize;
  /** Hide the wordmark and render the mark alone. */
  markOnly?: boolean;
  /** Tagline under the wordmark. Only meaningful at size "lg". */
  tagline?: string;
  /** Render the wordmark in white, for use on a dark brand panel. */
  onBrand?: boolean;
  className?: string;
}

export function RaeiLogo({
  size = "md",
  markOnly = false,
  tagline,
  onBrand = false,
  className,
}: RaeiLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        aria-hidden="true"
        className={cn(
          "flex shrink-0 items-center justify-center font-extrabold leading-none text-white",
          "bg-gradient-to-br from-[hsl(274_53%_42%)] to-[hsl(204_100%_37%)]",
          onBrand ? "shadow-sm shadow-black/20" : "shadow-sm shadow-primary/25",
          MARK[size],
        )}
      >
        <span className="-mt-0.5">ر</span>
      </span>
      {!markOnly && (
        <span className="flex flex-col text-start leading-none">
          <span
            className={cn(
              "font-extrabold tracking-tight",
              onBrand ? "text-white" : "text-foreground",
              WORD[size],
            )}
          >
            راعي
          </span>
          {tagline && (
            <span
              className={cn(
                "mt-1 text-xs font-medium",
                onBrand ? "text-white/70" : "text-muted-foreground",
              )}
            >
              {tagline}
            </span>
          )}
        </span>
      )}
    </span>
  );
}
