import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DiscoveryStepProgress } from "./DiscoveryStepProgress";

interface DiscoveryProgressScreenProps {
  message: string;
  step: number;
  totalSteps: number;
}

export function DiscoveryProgressScreen({
  message,
  step,
  totalSteps,
}: DiscoveryProgressScreenProps) {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Discovering your brand</CardTitle>
        </CardHeader>
        <CardContent>
          <DiscoveryStepProgress
            step={step}
            totalSteps={totalSteps}
            message={message}
          />
        </CardContent>
      </Card>
    </div>
  );
}
