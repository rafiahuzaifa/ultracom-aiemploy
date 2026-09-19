import type { Localized } from "@/lib/ai/types";

/**
 * Flattens a bilingual caption into the single text field a social platform
 * post accepts. When both languages are present, English leads with the
 * Urdu translation beneath a divider, which is the common convention for
 * bilingual Pakistani brand pages.
 */
export function flattenCaption(localized: Localized | null | undefined): string {
  if (!localized) return "";
  const { en, ur } = localized;
  if (en && ur) return `${en}\n\n۔۔۔\n\n${ur}`;
  return en || ur || "";
}
