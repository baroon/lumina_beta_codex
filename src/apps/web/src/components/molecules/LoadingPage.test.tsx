import { render } from "@testing-library/react";
import { LoadingPage } from "./LoadingPage";

describe("LoadingPage", () => {
  it("renders skeleton elements", () => {
    const { container } = render(<LoadingPage />);
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThanOrEqual(4);
  });
});
