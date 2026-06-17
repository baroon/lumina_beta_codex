import { Save, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { Card, CardContent } from "@/components/atoms/card";
import { PageHeader } from "@/components/molecules/PageHeader";
import { WORKSPACE_COPY } from "@/content/workspace";

export function ProfileSettingsScreen() {
  const copy = WORKSPACE_COPY.profile;

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

      <div className="grid gap-4 xl:grid-cols-2">
        <ProfileSection section={copy.sections.identity} />
        <ProfileSection section={copy.sections.preferences} />
        <ProfileSection section={copy.sections.notifications} />
        <ProfileSection section={copy.sections.access} />
      </div>
    </div>
  );
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
