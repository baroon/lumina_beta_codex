import { useEffect, useRef, useCallback, useState } from "react";
import * as signalR from "@microsoft/signalr";

const HUB_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000") + "/hubs/discovery";

export function useSignalR() {
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const [connectionState, setConnectionState] = useState<signalR.HubConnectionState>(
    signalR.HubConnectionState.Disconnected,
  );

  useEffect(() => {
    let cancelled = false;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL)
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.None)
      .build();

    connectionRef.current = connection;

    connection.onreconnecting(() => {
      if (!cancelled) setConnectionState(signalR.HubConnectionState.Reconnecting);
    });
    connection.onreconnected(() => {
      if (!cancelled) setConnectionState(signalR.HubConnectionState.Connected);
    });
    connection.onclose(() => {
      if (!cancelled) setConnectionState(signalR.HubConnectionState.Disconnected);
    });

    connection
      .start()
      .then(() => {
        if (!cancelled) setConnectionState(signalR.HubConnectionState.Connected);
      })
      .catch(() => {
        // Ignore errors from connections stopped during cleanup (React StrictMode)
        if (!cancelled) setConnectionState(signalR.HubConnectionState.Disconnected);
      });

    return () => {
      cancelled = true;
      connection.stop();
    };
  }, []);

  const joinBrandGroup = useCallback(async (brandId: string) => {
    const connection = connectionRef.current;
    if (connection?.state === signalR.HubConnectionState.Connected) {
      await connection.invoke("JoinBrandGroup", brandId);
    }
  }, []);

  const onProgress = useCallback((callback: (message: unknown) => void) => {
    const connection = connectionRef.current;
    if (connection) {
      connection.on("ReceiveProgress", callback);
      return () => connection.off("ReceiveProgress", callback);
    }
    return () => {};
  }, []);

  return { connectionState, joinBrandGroup, onProgress };
}
