import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Stepper } from "./Stepper";
import { Package } from "lucide-react";

const STEPS = [{ label: "Step One" }, { label: "Step Two" }, { label: "Step Three" }];

describe("Stepper", () => {
  it("renders all step labels", () => {
    render(<Stepper steps={STEPS} currentStep={0} />);
    expect(screen.getByText("Step One")).toBeInTheDocument();
    expect(screen.getByText("Step Two")).toBeInTheDocument();
    expect(screen.getByText("Step Three")).toBeInTheDocument();
  });

  it("renders step numbers", () => {
    render(<Stepper steps={STEPS} currentStep={1} />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders children content", () => {
    render(
      <Stepper steps={STEPS} currentStep={0}>
        <p>Step content here</p>
      </Stepper>,
    );
    expect(screen.getByText("Step content here")).toBeInTheDocument();
  });

  it("shows Back button only when currentStep > 0", () => {
    const onBack = vi.fn();
    const { rerender } = render(
      <Stepper steps={STEPS} currentStep={0} onBack={onBack} onNext={vi.fn()} />,
    );
    expect(screen.queryByRole("button", { name: "Back" })).not.toBeInTheDocument();

    rerender(<Stepper steps={STEPS} currentStep={1} onBack={onBack} onNext={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
  });

  it("calls onNext when Next is clicked", async () => {
    const onNext = vi.fn();
    render(<Stepper steps={STEPS} currentStep={0} onNext={onNext} />);
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(onNext).toHaveBeenCalledOnce();
  });

  it("calls onBack when Back is clicked", async () => {
    const onBack = vi.fn();
    render(<Stepper steps={STEPS} currentStep={1} onBack={onBack} />);
    await userEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it("disables Next when isNextDisabled is true", () => {
    render(<Stepper steps={STEPS} currentStep={0} onNext={vi.fn()} isNextDisabled />);
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  it("shows loading text when isNextLoading is true", () => {
    render(<Stepper steps={STEPS} currentStep={0} onNext={vi.fn()} isNextLoading />);
    expect(screen.getByRole("button", { name: "Loading..." })).toBeDisabled();
  });

  it("uses custom nextLabel and backLabel", () => {
    render(
      <Stepper
        steps={STEPS}
        currentStep={1}
        onNext={vi.fn()}
        onBack={vi.fn()}
        nextLabel="Continue"
        backLabel="Previous"
      />,
    );
    expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous" })).toBeInTheDocument();
  });

  it("renders a step icon instead of the number when provided", () => {
    const { container } = render(
      <Stepper steps={[{ label: "One", icon: Package }]} currentStep={0} />,
    );
    expect(screen.queryByText("1")).not.toBeInTheDocument();
    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});
