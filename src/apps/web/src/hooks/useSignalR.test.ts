import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

const { connectionMock, builderMock } = vi.hoisted(() => {
  const connectionMock = {
    state: "Connected",
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    off: vi.fn(),
    invoke: vi.fn().mockResolvedValue(undefined),
    onreconnecting: vi.fn(),
    onreconnected: vi.fn(),
    onclose: vi.fn(),
  };
  const builderMock = {
    withUrl: vi.fn(),
    withAutomaticReconnect: vi.fn(),
    configureLogging: vi.fn(),
    build: vi.fn(() => connectionMock),
  };
  builderMock.withUrl.mockReturnValue(builderMock);
  builderMock.withAutomaticReconnect.mockReturnValue(builderMock);
  builderMock.configureLogging.mockReturnValue(builderMock);
  return { connectionMock, builderMock };
});

vi.mock("@microsoft/signalr", () => ({
  HubConnectionBuilder: vi.fn(() => builderMock),
  HubConnectionState: {
    Disconnected: "Disconnected",
    Connecting: "Connecting",
    Connected: "Connected",
    Reconnecting: "Reconnecting",
  },
  LogLevel: { None: 6 },
}));

import { useSignalR } from "./useSignalR";

describe("useSignalR", () => {
  beforeEach(() => {
    connectionMock.invoke.mockClear();
    connectionMock.on.mockClear();
    connectionMock.off.mockClear();
  });

  it("connects and reports the Connected state", async () => {
    const { result } = renderHook(() => useSignalR());
    await waitFor(() => expect(result.current.connectionState).toBe("Connected"));
  });

  it("joins a brand group when connected", async () => {
    const { result } = renderHook(() => useSignalR());
    await waitFor(() => expect(result.current.connectionState).toBe("Connected"));
    await act(async () => {
      await result.current.joinBrandGroup("b1");
    });
    expect(connectionMock.invoke).toHaveBeenCalledWith("JoinBrandGroup", "b1");
  });

  it("registers and cleans up a progress listener", () => {
    const { result } = renderHook(() => useSignalR());
    const cb = vi.fn();
    let cleanup = () => {};
    act(() => {
      cleanup = result.current.onProgress(cb);
    });
    expect(connectionMock.on).toHaveBeenCalledWith("ReceiveProgress", cb);
    cleanup();
    expect(connectionMock.off).toHaveBeenCalledWith("ReceiveProgress", cb);
  });
});
