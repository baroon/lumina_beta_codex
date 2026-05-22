import { useState } from "react";
import { useParams } from "@tanstack/react-router";
import { useBrand } from "@/features/brands/hooks/useBrands";
import { useDiscoveryResults } from "@/features/discovery/hooks/useDiscovery";
import { useDiscoveryProgress } from "@/features/discovery/hooks/useDiscoveryProgress";
import { DISCOVERY_COPY } from "@/content/discovery";
import { DiscoveryProgressScreen } from "@/features/discovery/components/DiscoveryProgressScreen";
import { DiscoveryConfirmationScreen } from "@/features/discovery/components/DiscoveryConfirmationScreen";
import { ReadyToCreateTrackerScreen } from "@/features/trackers/components/ReadyToCreateTrackerScreen";
import { LoadingPage } from "@/components/molecules/LoadingPage";
import { Alert, AlertDescription } from "@/components/atoms/alert";
import { Button } from "@/components/atoms/button";
import type { DiscoveryResultsDto } from "@/types/api";

export function DiscoveryPage() {
  const { brandId } = useParams({ from: "/brands/$brandId/discovery" });
  const brand = useBrand(brandId);
  const discovery = useDiscoveryResults(brandId);
  const progress = useDiscoveryProgress(brandId);
  const [manualMode, setManualMode] = useState(false);

  if (brand.isLoading) return <LoadingPage />;

  if (brand.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{DISCOVERY_COPY.errors.loadBrandFailed}</AlertDescription>
      </Alert>
    );
  }

  const status = progress.status;

  if (status === "Pending" || status === "Crawling" || status === "Extracting") {
    return <DiscoveryProgressScreen step={progress.step} totalSteps={progress.totalSteps} />;
  }

  if (status === "Failed") {
    if (manualMode) {
      const emptyResults: DiscoveryResultsDto = {
        brandId,
        brandName: brand.data?.name ?? "",
        status: "AwaitingConfirmation",
        brandProfile: null,
        aliases: [],
        products: [],
        audiences: [],
        markets: [],
        topics: [],
        competitors: [],
        trustSignals: [],
      };
      return <DiscoveryConfirmationScreen results={emptyResults} />;
    }

    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertDescription>{DISCOVERY_COPY.errors.discoveryFailed}</AlertDescription>
        </Alert>
        <div className="rounded-lg border border-neutral-200 bg-surface-card p-6 text-center">
          <h2 className="text-lg font-semibold text-neutral-900">
            {DISCOVERY_COPY.fallback.crawlFailedTitle}
          </h2>
          <p className="mt-2 text-sm text-neutral-500">
            {DISCOVERY_COPY.fallback.crawlFailedDescription}
          </p>
          <Button className="mt-4" onClick={() => setManualMode(true)}>
            {DISCOVERY_COPY.fallback.continueManually}
          </Button>
        </div>
      </div>
    );
  }

  if (discovery.isLoading) return <LoadingPage />;

  if (discovery.data) {
    if (discovery.data.status === "Completed") {
      return <ReadyToCreateTrackerScreen brandId={discovery.data.brandId} />;
    }
    return <DiscoveryConfirmationScreen results={discovery.data} />;
  }

  return <LoadingPage />;
}
