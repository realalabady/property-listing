import type { CSSProperties } from "react";
import type { PublicCompany } from "./data";
import { hexToHslChannels } from "@/lib/utils/color";

export function publicCompanyThemeStyle(
  company: PublicCompany | null,
): CSSProperties | undefined {
  if (!company?.theme) return undefined;

  const primary = hexToHslChannels(company.theme.primaryColor);
  const secondary = hexToHslChannels(company.theme.secondaryColor);
  const accent = hexToHslChannels(company.theme.accentColor);

  const nextStyle: CSSProperties & Record<string, string> = {};
  if (primary) {
    nextStyle["--primary"] = primary;
    nextStyle["--ring"] = primary;
  }
  if (secondary) {
    nextStyle["--secondary"] = secondary;
    nextStyle["--input"] = secondary;
    nextStyle["--border"] = secondary;
  }
  if (accent) {
    nextStyle["--accent"] = accent;
  }

  return nextStyle;
}
