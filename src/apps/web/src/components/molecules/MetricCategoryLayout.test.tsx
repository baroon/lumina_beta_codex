import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MetricCategoryLayout, type MetricCategorySection } from "./MetricCategoryLayout";

const SECTIONS: MetricCategorySection[] = [
  { id: "visibility", label: "Visibility", children: <p>Visibility content</p> },
  { id: "recommendation", label: "Recommendation", children: <p>Recommendation content</p> },
  { id: "sentiment", label: "Sentiment & Trust", children: <p>Sentiment content</p> },
];

beforeEach(() => {
  // jsdom doesn't implement IntersectionObserver; stub it so the hook doesn't throw.
  class MockIO {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  // @ts-expect-error — stub for jsdom
  window.IntersectionObserver = MockIO;
  // ResizeObserver isn't in jsdom either — the layout uses it to measure
  // the sticky stack so scrollMarginTop tracks the rendered height.
  class MockRO {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  window.ResizeObserver = MockRO;
  // scrollIntoView is also unimplemented in jsdom.
  Element.prototype.scrollIntoView = vi.fn();
  // Reset URL hash between tests.
  window.history.replaceState(null, "", " ");
});

describe("MetricCategoryLayout", () => {
  it("renders a pill for each section", () => {
    render(<MetricCategoryLayout sections={SECTIONS} />);
    for (const s of SECTIONS) {
      expect(screen.getByRole("button", { name: s.label })).toBeInTheDocument();
    }
  });

  it("renders each section's content", () => {
    render(<MetricCategoryLayout sections={SECTIONS} />);
    expect(screen.getByText("Visibility content")).toBeInTheDocument();
    expect(screen.getByText("Recommendation content")).toBeInTheDocument();
    expect(screen.getByText("Sentiment content")).toBeInTheDocument();
  });

  it("highlights the first section as active by default", () => {
    render(<MetricCategoryLayout sections={SECTIONS} />);
    expect(screen.getByRole("button", { name: "Visibility" })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  it("respects a non-default starting section", () => {
    render(<MetricCategoryLayout sections={SECTIONS} defaultSection="sentiment" />);
    expect(screen.getByRole("button", { name: "Sentiment & Trust" })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  it("restores the active section from URL hash on mount", () => {
    window.history.replaceState(null, "", "#recommendation");
    render(<MetricCategoryLayout sections={SECTIONS} />);
    expect(screen.getByRole("button", { name: "Recommendation" })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  it("clicking a pill updates the active section + URL hash", async () => {
    render(<MetricCategoryLayout sections={SECTIONS} />);
    await userEvent.click(screen.getByRole("button", { name: "Sentiment & Trust" }));
    expect(screen.getByRole("button", { name: "Sentiment & Trust" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(window.location.hash).toBe("#sentiment");
  });

  it("renders optional status and controls strips above the nav", () => {
    render(
      <MetricCategoryLayout
        statusStrip={<div data-testid="status">status</div>}
        controlsStrip={<div data-testid="controls">controls</div>}
        sections={SECTIONS}
      />,
    );
    expect(screen.getByTestId("status")).toBeInTheDocument();
    expect(screen.getByTestId("controls")).toBeInTheDocument();
  });
});
