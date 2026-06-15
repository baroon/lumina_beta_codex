import { Sidebar } from "./Sidebar";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  // `overflow-hidden` + `min-h-0` are defence-in-depth so a future
  // overflowing descendant can't make the document scroll alongside
  // <main>. The actual document-scroll path is already prevented by
  // `h-screen` + flex stretch in this layout, but the explicit clamp
  // saves us from a future regression.
  //
  // Note: `scrollbar-gutter: stable` was tried here previously to stop
  // expand/collapse layout-shift, but on Windows native scrollbars it
  // renders the reserved gutter as a visible track line ALONGSIDE the
  // real <main> scrollbar — i.e. the user sees two scrollbars even when
  // only <main> is actually scrolling. Dropped.
  return (
    <div className="flex h-screen overflow-hidden bg-surface-page">
      <Sidebar />
      <main className="min-h-0 flex-1 overflow-auto">
        <div className="px-6 py-6">{children}</div>
      </main>
    </div>
  );
}
