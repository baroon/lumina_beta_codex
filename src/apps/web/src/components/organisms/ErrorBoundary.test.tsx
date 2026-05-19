import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorBoundary } from "./ErrorBoundary";
import { APP_COPY } from "@/content/app";

function ProblemChild({ shouldThrow = true }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error("Test error");
  }
  return <p>Child content</p>;
}

describe("ErrorBoundary", () => {
  // Suppress React error boundary console.error noise in test output
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders children when no error occurs", () => {
    render(
      <ErrorBoundary>
        <p>Safe content</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText("Safe content")).toBeInTheDocument();
  });

  it("renders ErrorPage when a child throws", () => {
    render(
      <ErrorBoundary>
        <ProblemChild />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("heading", { name: APP_COPY.error.title })).toBeInTheDocument();
    expect(screen.getByText("Test error")).toBeInTheDocument();
  });

  it("shows reset button that clears the error and re-renders children", async () => {
    const user = userEvent.setup();
    let shouldThrow = true;

    function ConditionalChild() {
      if (shouldThrow) {
        throw new Error("Recoverable error");
      }
      return <p>Recovered</p>;
    }

    render(
      <ErrorBoundary>
        <ConditionalChild />
      </ErrorBoundary>,
    );

    expect(screen.getByRole("heading", { name: APP_COPY.error.title })).toBeInTheDocument();

    // Fix the error condition before clicking reset
    shouldThrow = false;
    await user.click(screen.getByRole("button", { name: APP_COPY.error.retry }));

    expect(screen.getByText("Recovered")).toBeInTheDocument();
  });
});
