import { Save, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { Card, CardContent } from "@/components/atoms/card";
import { PageHeader } from "@/components/molecules/PageHeader";
import { WORKSPACE_COPY } from "@/content/workspace";
import { deriveProfileReadiness, type ProfileReadinessItem } from "@/features/settings/settings";

export function ProfileSettingsScreen() {
  const copy = WORKSPACE_COPY.profile;
  const readiness = deriveProfileReadiness();

  return (
    <div className="space-y-5">
      <PageHeader title={copy.title} description={copy.description}>
        <Button variant="outline" size="sm" disabled>
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
          {copy.actions.security}
        </Button>
        <Button size="sm" disabled>
          <Save className="h-3.5 w-3.5" aria-hidden />
          {copy.actions.save}
        </Button>
      </PageHeader>

      <ProfileReadinessSection items={readiness} />

      <div className="grid gap-4 xl:grid-cols-2">
        <ProfileSection section={copy.sections.identity} />
        <ProfileSection section={copy.sections.preferences} />
        <ProfileSection section={copy.sections.notifications} />
        <ProfileSection section={copy.sections.access} />
      </div>
    </div>
  );
}

function ProfileReadinessSection({ items }: { items: readonly ProfileReadinessItem[] }) {
  const copy = WORKSPACE_COPY.profile.readiness;
  return (
    <section aria-labelledby="profile-readiness-title">
      <Card>
        <CardContent className="p-5">
          <div>
            <h2 id="profile-readiness-title" className="text-sm font-semibold text-neutral-900">
              {copy.title}
            </h2>
            <p className="mt-1 text-xs text-neutral-500">{copy.description}</p>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {items.map((item) => (
              <div key={item.id} className="rounded-md border border-neutral-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-semibold text-neutral-900">{item.label}</h3>
                  <ProfileReadinessBadge status={item.status} />
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

function ProfileReadinessBadge({ status }: { status: ProfileReadinessItem["status"] }) {
  if (status === "Ready") return <Badge variant="success">{status}</Badge>;
  if (status === "Managed") return <Badge variant="secondary">{status}</Badge>;
  return <Badge variant="warning">{status}</Badge>;
}

function ProfileSection({
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
          <Badge variant="secondary">{WORKSPACE_COPY.profile.sections.readOnly}</Badge>
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
