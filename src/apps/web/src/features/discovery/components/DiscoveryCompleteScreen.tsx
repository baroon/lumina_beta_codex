import { PartyPopper, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface DiscoveryCompleteScreenProps {
  brandName: string;
  brandId: string;
}

export function DiscoveryCompleteScreen({ brandName }: DiscoveryCompleteScreenProps) {
  return (
    <div className="flex min-h-[400px] items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
            <PartyPopper className="h-6 w-6" />
          </div>
          <CardTitle>Discovery complete</CardTitle>
          <CardDescription>
            We've built a complete profile for <span className="font-medium text-neutral-700">{brandName}</span>.
            You're ready to create your Visibility Tracker.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button disabled className="w-full gap-2" size="lg">
            Create Visibility Tracker
            <ArrowRight className="h-4 w-4" />
          </Button>
          <p className="mt-3 text-xs text-neutral-400">
            Tracker setup is coming soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
