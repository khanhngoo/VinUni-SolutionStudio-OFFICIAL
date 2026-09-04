import type { ChipVariant } from "@/components/ui/chip";
import type { ScoreBand } from "@/lib/types";

/**
 * Presentation helpers for the fit score.
 *
 * The raw number out of `scoreStudent` is a weighted sum, not a percentage: the
 * bonuses can push it past 100 and the capacity penalty can drive it below
 * zero. Nothing renders it directly — every path goes through `clampScore`, so
 * the donut arc and the numeral always agree with each other and with the band.
 */
export function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

/** Arc colour. Matches the chip so the donut and the band read as one signal. */
export function bandStroke(band: ScoreBand): string {
  if (band === "Strong") return "var(--color-ok)";
  if (band === "Proficient") return "var(--color-brand)";
  if (band === "Developing") return "var(--color-warn)";
  return "var(--color-ink-3)";
}

export function bandChipVariant(band: ScoreBand): ChipVariant {
  if (band === "Strong") return "ok";
  if (band === "Proficient") return "accent";
  return "outline-dashed";
}
