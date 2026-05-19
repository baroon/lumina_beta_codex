import { screen } from "@testing-library/react";
import { renderWithRouter } from "@/test-utils";
import { AppShell } from "./AppShell";
import { APP_COPY } from "@/content/app";

describe("AppShell", () => {
  it("renders children in main content area", async () => {
    renderWithRouter(
      <AppShell>
        <p>Page content</p>
      </AppShell>,
    );
    expect(await screen.findByText("Page content")).toBeInTheDocument();
  });

  it("renders the Sidebar", async () => {
    renderWithRouter(
      <AppShell>
        <p>Content</p>
      </AppShell>,
    );
    expect(await screen.findByText(APP_COPY.name)).toBeInTheDocument();
  });
});
