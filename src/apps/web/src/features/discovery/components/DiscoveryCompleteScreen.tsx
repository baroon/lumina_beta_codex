import { PartyPopper, ArrowRight } from "lucide-react";
import { Button } from "@/components/atoms/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/atoms/card";
import { DISCOVERY_COPY } from "@/content/discovery";

interface DiscoveryCompleteScreenProps {
  brandName: string;
  brandId: string;
}

export function DiscoveryCompleteScreen({ brandName }: DiscoveryCompleteScreenProps) {
  return (
    <div className="flex min-h-[400px] items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-semantic-success-100 text-semantic-success-600">
            <PartyPopper className="h-6 w-6" />
          </div>
          <CardTitle>{DISCOVERY_COPY.complete.title}</CardTitle>
          <CardDescription>
            {DISCOVERY_COPY.complete.description.replace("{brandName}", brandName)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button disabled className="w-full gap-2" size="lg">
            {DISCOVERY_COPY.complete.createTracker}
            <ArrowRight className="h-4 w-4" />
          </Button>
          <p className="mt-3 text-xs text-neutral-400">{DISCOVERY_COPY.complete.comingSoon}</p>
        </CardContent>
      </Card>
    </div>
  );
}
