import { useEffect, useState, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSignalR } from "@/hooks/useSignalR";
import { brandsApi } from "@/api/brandsApi";
import type { DiscoveryProgressMessage, DiscoveryStatus } from "@/types/api";

interface DiscoveryProgress {
  status: DiscoveryStatus;
  message: string;
  step: number;
  totalSteps: number;
}

export function useDiscoveryProgress(brandId: string) {
  const [progress, setProgress] = useState<DiscoveryProgress>({
    status: "Pending",
    message: "Starting discovery...",
    step: 0,
    totalSteps: 5,
  });

  const { connectionState, joinBrandGroup, onProgress } = useSignalR();
  const queryClient = useQueryClient();
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Join SignalR group once connected
  useEffect(() => {
    if (brandId && connectionState === "Connected") {
      joinBrandGroup(brandId);
    }
  }, [brandId, connectionState, joinBrandGroup]);

  // Listen for SignalR progress
  useEffect(() => {
    const cleanup = onProgress((msg: unknown) => {
      const message = msg as DiscoveryProgressMessage;
      if (message.brandId === brandId) {
        setProgress({
          status: message.status,
          message: message.message,
          step: message.step,
          totalSteps: message.totalSteps,
        });

        if (
          message.status === "AwaitingConfirmation" ||
          message.status === "Completed" ||
          message.status === "Failed"
        ) {
          queryClient.invalidateQueries({ queryKey: ["discovery", brandId] });
          queryClient.invalidateQueries({ queryKey: ["brands", brandId] });
        }
      }
    });

    return cleanup;
  }, [brandId, onProgress, queryClient]);

  // Poll API for status (always-on baseline; SignalR is a bonus for real-time updates)
  const pollStatus = useCallback(async () => {
    try {
      const brand = await brandsApi.getById(brandId);
      if (brand.latestDiscovery) {
        const d = brand.latestDiscovery;
        setProgress((prev) => ({
          ...prev,
          status: d.status,
        }));

        if (
          d.status === "AwaitingConfirmation" ||
          d.status === "Completed" ||
          d.status === "Failed"
        ) {
          queryClient.invalidateQueries({ queryKey: ["discovery", brandId] });
          if (pollingRef.current) clearInterval(pollingRef.current);
        }
      }
    } catch {
      // Ignore polling errors
    }
  }, [brandId, queryClient]);

  useEffect(() => {
    // Fetch immediately so UI doesn't sit on "Initializing" for 3s
    pollStatus();
    pollingRef.current = setInterval(pollStatus, 3000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [pollStatus]);

  return progress;
}
