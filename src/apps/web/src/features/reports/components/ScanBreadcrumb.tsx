import { Breadcrumb } from "@/components/molecules/Breadcrumb";
import { useScanResults } from "../hooks/useScanResults";

interface ScanBreadcrumbProps {
  scanRunId: string;
  /** Label for the current page within the scan detail surfaces (e.g. "Scan Results", "Sources"). */
  currentLabel: string;
}

/**
 * Convenience wrapper around `Breadcrumb` for the scan detail pages.
 * Reads the scan summary via `useScanResults` (cached — pages that
 * already call the same hook share the cache entry), then renders the
 * standard scan trail: `Brands › {Brand} › {Tracker} › {currentLabel}`.
 *
 * Until the summary lands, the Breadcrumb molecule renders skeleton
 * segments for the brand and tracker labels so the trail keeps its
 * layout instead of reflowing.
 */
export function ScanBreadcrumb({ scanRunId, currentLabel }: ScanBreadcrumbProps) {
  const { data } = useScanResults(scanRunId);
  const summary = data?.summary;

  return (
    <Breadcrumb
      items={[
        { label: "Brands", to: "/brands" },
        summary
          ? {
              label: summary.brandName,
              to: "/brands/$brandId/profile",
              params: { brandId: summary.brandId },
            }
          : {},
        summary
          ? {
              label: summary.trackerName,
              to: "/brands/$brandId/trackers/$trackerId",
              params: { brandId: summary.brandId, trackerId: summary.trackerId },
            }
          : {},
        { label: currentLabel },
      ]}
    />
  );
}
