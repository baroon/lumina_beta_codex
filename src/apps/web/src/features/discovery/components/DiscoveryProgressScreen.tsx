import { Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DiscoveryStepProgress } from "./DiscoveryStepProgress";

interface DiscoveryProgressScreenProps {
  message: string;
  step: number;
  totalSteps: number;
}

export function DiscoveryProgressScreen({
  step,
  totalSteps,
}: DiscoveryProgressScreenProps) {
  return (
    <div className="flex min-h-[400px] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-primary-600">
            <Search className="h-6 w-6" />
          </div>
          <CardTitle>Discovering your brand</CardTitle>
          <CardDescription>
            We're analyzing your website to build a complete brand profile.
            This usually wraps up in under a minute.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DiscoveryStepProgress
            step={step}
            totalSteps={totalSteps}
          />
        </CardContent>
      </Card>
    </div>
  );
}
