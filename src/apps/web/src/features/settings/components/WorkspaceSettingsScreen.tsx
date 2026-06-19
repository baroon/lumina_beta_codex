import { CreditCard, UserPlus } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { Card, CardContent } from "@/components/atoms/card";
import { ErrorPage } from "@/components/molecules/ErrorPage";
import { LoadingPage } from "@/components/molecules/LoadingPage";
import { PageHeader } from "@/components/molecules/PageHeader";
import { WORKSPACE_COPY } from "@/content/workspace";
import { useWorkspaceSettingsSummary } from "@/features/settings/hooks/useWorkspaceSettingsSummary";
import {
  deriveWorkspaceReadiness,
  type WorkspaceReadinessItem,
} from "@/features/settings/settings";

export function WorkspaceSettingsScreen() {
  const copy = WORKSPACE_COPY.settings;
  const settings = useWorkspaceSettingsSummary();
  const readiness = deriveWorkspaceReadiness(settings.summary);
  const [invitePrepared, setInvitePrepared] = useState(false);
  const [billingQueued, setBillingQueued] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  if (settings.isLoading) return <LoadingPage />;
  if (settings.isError) {
    return (
      <ErrorPage
        error={settings.error instanceof Error ? settings.error : undefined}
        onReset={() => void settings.refetch()}
      />
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader title={copy.title} description={copy.description}>
        <Button
          variant="outline"
          size="sm"
          disabled={invitePrepared}
          onClick={() => {
            setInvitePrepared(true);
            setNotice(copy.actions.inviteNotice);
          }}
        >
          <UserPlus className="h-3.5 w-3.5" aria-hidden />
          {invitePrepared ? copy.actions.invitePrepared : copy.actions.invite}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={billingQueued}
          onClick={() => {
            setBillingQueued(true);
            setNotice(copy.actions.billingNotice);
          }}
        >
          <CreditCard className="h-3.5 w-3.5" aria-hidden />
          {billingQueued ? copy.actions.billingQueued : copy.actions.billing}
        </Button>
      </PageHeader>

      {notice && (
        <div className="rounded-md border border-primary-200 bg-primary-50 px-3 py-2 text-sm text-primary-800">
          {notice}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-4">
        <SummaryTile
          label={copy.summary.brands}
          value={settings.summary.brandCount.toLocaleString()}
          helper={copy.summary.brandsHelper}
        />
        <SummaryTile
          label={copy.summary.trackers}
          value={settings.summary.trackerCount.toLocaleString()}
          helper={copy.summary.trackersHelper}
        />
        <SummaryTile
          label={copy.summary.activeTrackers}
          value={settings.summary.activeTrackerCount.toLocaleString()}
          helper={copy.summary.activeTrackersHelper}
        />
        <SummaryTile
          label={copy.summary.completedScans}
          value={settings.summary.completedScanCount.toLocaleString()}
          helper={copy.summary.completedScansHelper}
        />
      </div>

      {settings.summary.brandCount === 0 && settings.summary.trackerCount === 0 && (
        <div className="rounded-md border border-dashed border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-500">
          {copy.empty}
        </div>
      )}

      <WorkspaceReadinessSection items={readiness} />

      <div className="grid gap-4 xl:grid-cols-2">
        <SettingsSection section={copy.sections.profile} />
        <SettingsSection section={copy.sections.team} />
        <SettingsSection section={copy.sections.notifications} />
        <SettingsSection section={copy.sections.integrations} />
      </div>
    </div>
  );
}

function WorkspaceReadinessSection({ items }: { items: readonly WorkspaceReadinessItem[] }) {
  const copy = WORKSPACE_COPY.settings.readiness;
  return (
    <section aria-labelledby="workspace-readiness-title">
      <Card>
        <CardContent className="p-5">
          <div>
            <h2 id="workspace-readiness-title" className="text-sm font-semibold text-neutral-900">
              {copy.title}
            </h2>
            <p className="mt-1 text-xs text-neutral-500">{copy.description}</p>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {items.map((item) => (
              <div key={item.id} className="rounded-md border border-neutral-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-semibold text-neutral-900">{item.label}</h3>
                  <ReadinessBadge status={item.status} />
                </div>
                <p className="mt-2 text-xs text-neutral-500">{item.detail}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function ReadinessBadge({ status }: { status: WorkspaceReadinessItem["status"] }) {
  if (status === "Ready") return <Badge variant="success">{status}</Badge>;
  if (status === "Needs setup") return <Badge variant="warning">{status}</Badge>;
  return <Badge variant="secondary">{status}</Badge>;
}

function SummaryTile({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
          {label}
        </p>
        <p className="mt-1 text-2xl font-semibold text-neutral-900">{value}</p>
        <p className="mt-1 text-xs text-neutral-500">{helper}</p>
      </CardContent>
    </Card>
  );
}

function SettingsSection({
  section,
}: {
  section: {
    title: string;
    description: string;
    items: readonly { label: string; value: string }[];
  };
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">{section.title}</h2>
            <p className="mt-1 text-xs text-neutral-500">{section.description}</p>
          </div>
          <Badge variant="secondary">{WORKSPACE_COPY.settings.sections.readOnly}</Badge>
        </div>
        <div className="mt-4 divide-y divide-neutral-100 rounded-md border border-neutral-200">
          {section.items.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-4 px-3 py-2">
              <span className="text-sm text-neutral-600">{item.label}</span>
              <span className="text-right text-sm font-medium text-neutral-900">{item.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
