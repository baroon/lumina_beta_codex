import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorPage } from "./ErrorPage";
import { APP_COPY } from "@/content/app";

describe("ErrorPage", () => {
  it("renders title from APP_COPY", () => {
    render(<ErrorPage />);
    expect(screen.getByRole("heading", { name: APP_COPY.error.title })).toBeInTheDocument();
  });

  it("renders description from APP_COPY", () => {
    render(<ErrorPage />);
    expect(screen.getByText(APP_COPY.error.description)).toBeInTheDocument();
  });

  it("shows error message in a pre element when error is provided", () => {
    render(<ErrorPage error={new Error("Something broke")} />);
    const pre = screen.getByText("Something broke");
    expect(pre.tagName).toBe("PRE");
  });

  it("does not show error message when no error is provided", () => {
    const { container } = render(<ErrorPage />);
    expect(container.querySelector("pre")).not.toBeInTheDocument();
  });

  it("shows reset button only when onReset is provided", () => {
    render(<ErrorPage onReset={() => {}} />);
    expect(screen.getByRole("button", { name: APP_COPY.error.retry })).toBeInTheDocument();
  });

  it("does not show reset button when onReset is not provided", () => {
    render(<ErrorPage />);
    expect(screen.queryByRole("button", { name: APP_COPY.error.retry })).not.toBeInTheDocument();
  });

  it("calls onReset when reset button is clicked", async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();
    render(<ErrorPage onReset={onReset} />);
    await user.click(screen.getByRole("button", { name: APP_COPY.error.retry }));
    expect(onReset).toHaveBeenCalledOnce();
  });
});
