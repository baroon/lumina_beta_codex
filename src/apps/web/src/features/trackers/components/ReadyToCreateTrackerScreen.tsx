import { useEffect, useState } from "react";
import {
  Sparkles,
  ArrowRight,
  Check,
  MessageSquare,
  Swords,
  Package,
  Users,
  Globe,
  Eye,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/atoms/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/atoms/card";
import { Input } from "@/components/atoms/input";
import { LoadingPage } from "@/components/molecules/LoadingPage";
import { TRACKERS_COPY } from "@/content/trackers";
import { useTrackerSetupPreview, useCreateTracker } from "../hooks/useTrackers";

interface ReadyToCreateTrackerScreenProps {
  brandId: string;
}

export function ReadyToCreateTrackerScreen({ brandId }: ReadyToCreateTrackerScreenProps) {
  const preview = useTrackerSetupPreview(brandId);
  const createTracker = useCreateTracker(brandId);
  const [name, setName] = useState("");
  const [createdName, setCreatedName] = useState<string | null>(null);

  const previewData = preview.data;
  useEffect(() => {
    if (previewData) setName(previewData.suggestedName);
  }, [previewData]);

  if (preview.isLoading) return <LoadingPage />;
  if (!previewData) return null;

  if (createdName) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-semantic-success-100 text-semantic-success-600">
              <Check className="h-6 w-6" />
            </div>
            <CardTitle>{TRACKERS_COPY.created.title}</CardTitle>
            <CardDescription>
              {TRACKERS_COPY.created.description.replace("{name}", createdName)}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const summary: ReadonlyArray<readonly [string, number, LucideIcon]> = [
    [TRACKERS_COPY.ready.summary.topics, previewData.topicCount, MessageSquare],
    [TRACKERS_COPY.ready.summary.competitors, previewData.competitorCount, Swords],
    [TRACKERS_COPY.ready.summary.products, previewData.productCount, Package],
    [TRACKERS_COPY.ready.summary.audiences, previewData.audienceCount, Users],
    [TRACKERS_COPY.ready.summary.markets, previewData.marketCount, Globe],
    [TRACKERS_COPY.ready.summary.visibilityChecks, previewData.visibilityCheckCount, Eye],
  ];

  function handleCreate() {
    const trimmed = name.trim();
    createTracker.mutate(
      { name: trimmed.length > 0 ? trimmed : null },
      { onSuccess: (res) => setCreatedName(res.name) },
    );
  }

  return (
    <div className="mx-auto max-w-xl p-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-50 text-primary-600">
              <Sparkles className="h-5 w-5" />
            </div>
            <CardTitle>{TRACKERS_COPY.ready.title}</CardTitle>
          </div>
          <CardDescription>
            {TRACKERS_COPY.ready.description.replace("{brandName}", previewData.brandName)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-neutral-400">
              {TRACKERS_COPY.ready.nameLabel}
            </label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-neutral-400">
              {TRACKERS_COPY.ready.coverageTitle}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {summary.map(([label, count, Icon]) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-md border border-neutral-200 px-3 py-2 text-sm"
                >
                  <span className="flex items-center gap-2 text-neutral-600">
                    <Icon className="h-4 w-4 text-neutral-400" />
                    {label}
                  </span>
                  <span className="font-semibold tabular-nums text-neutral-900">{count}</span>
                </div>
              ))}
            </div>
          </div>
          <Button
            onClick={handleCreate}
            disabled={createTracker.isPending}
            className="w-full gap-2"
            size="lg"
          >
            {createTracker.isPending ? TRACKERS_COPY.ready.creating : TRACKERS_COPY.ready.create}
            {!createTracker.isPending && <ArrowRight className="h-4 w-4" />}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
