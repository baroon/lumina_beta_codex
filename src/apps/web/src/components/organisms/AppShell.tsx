import { Sidebar } from "./Sidebar";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen bg-surface-page">
      <Sidebar />
      <main className="flex-1 overflow-auto [scrollbar-gutter:stable]">
        <div className="px-6 py-6">{children}</div>
      </main>
    </div>
  );
}
