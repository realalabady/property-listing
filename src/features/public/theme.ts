import type { CSSProperties } from "react";
import type { PublicCompany } from "./data";
import { hexToHslChannels } from "@/lib/utils/color";

export function publicCompanyThemeStyle(
  company: PublicCompany | null,
): CSSProperties | undefined {
  if (!company?.theme) return undefined;

  // Only tint the brand accent (buttons, ring). Surfaces stay on the shared
  // Dar light theme so company pages match the rest of the site — overriding
  // --secondary/--input/--border with a company colour made them off-brand.
  const primary = hexToHslChannels(company.theme.primaryColor);
  const accent = hexToHslChannels(company.theme.accentColor);

  const nextStyle: CSSProperties & Record<string, string> = {};
  if (primary) {
    nextStyle["--primary"] = primary;
    nextStyle["--ring"] = primary;
  }
  if (accent) {
    nextStyle["--accent"] = accent;
  }

  return nextStyle;
}
