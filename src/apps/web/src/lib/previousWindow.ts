import type { DateRangeSelection } from "@/components/molecules/DateRangePicker";

/**
 * Equal-length back-shifted window for "Movers" / WoW deltas.
 * - `preset N days` → previous window starts 2N days ago and ends N days ago.
 * - `custom from-to` → previous window equals the same width immediately
 *   before `from`.
 * - `all` → returns the same selection. Callers that compute deltas
 *   between the two windows should render an explanatory empty state in
 *   this case — "all time" has no meaningful previous window.
 *
 * Pure (no DOM / no React). Used by `/competitors` and `/sources` to
 * fire a second workspace query at the back-shifted window.
 */
export function previousSelectionFor(sel: DateRangeSelection): DateRangeSelection {
  switch (sel.kind) {
    case "preset": {
      const now = new Date();
      const to = new Date(now.getTime() - sel.days * 24 * 60 * 60 * 1000);
      const from = new Date(now.getTime() - 2 * sel.days * 24 * 60 * 60 * 1000);
      return { kind: "custom", from, to };
    }
    case "custom": {
      const widthMs = sel.to.getTime() - sel.from.getTime();
      const from = new Date(sel.from.getTime() - widthMs);
      const to = new Date(sel.from.getTime());
      return { kind: "custom", from, to };
    }
    case "all":
      return sel;
  }
}
