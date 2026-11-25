import { useMemo } from "react";

export type ChartColorResolver = (name: string) => string;

interface CategoryPieProps {
  data: { name: string; value: number }[];
  /** Maps a slice label to its fill colour. */
  resolveColor: ChartColorResolver;
}

/**
 * Tooltip payload shape for the pie tooltips we render ourselves.
 * Declared explicitly so the fields are type-checked instead of `any`.
 */
export interface ChartTooltipEntry {
  name?: string;
  value?: number;
  color?: string;
  payload?: {
    color?: string;
    Average?: number;
    projectCount?: number;
  };
}

export interface ChartTooltipProps {
  active?: boolean;
  payload?: ChartTooltipEntry[];
  label?: string;
}

/**
 * Builds a name -> colour resolver. Matching is case-insensitive and falls back
 * through the rules in order, so translated labels (e.g. "Selesai") still get
 * the right colour as long as one keyword matches.
 */
export function useKeywordColorResolver(
  rules: { keywords: string[]; color: string }[],
  fallback: string,
  depsKey: string,
): ChartColorResolver {
  return useMemo(() => {
    return (name: string) => {
      const lower = (name ?? "").toLowerCase();
      const rule = rules.find((r) => r.keywords.some((k) => k && lower.includes(k.toLowerCase())));
      return rule?.color ?? fallback;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fallback, depsKey]);
}


