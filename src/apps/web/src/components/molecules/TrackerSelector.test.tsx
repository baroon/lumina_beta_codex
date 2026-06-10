import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import {
  TrackerSelector,
  allTrackerIds,
  computeBrandState,
  computeWorkspaceState,
  isTrackerSelected,
  toggleBrand,
  toggleTracker,
  toggleWorkspace,
  triggerLabel,
  type BrandGroup,
} from "./TrackerSelector";

const FIXTURE: BrandGroup[] = [
  {
    brandId: "b-acme",
    brandName: "Acme",
    trackers: [
      { id: "t1", name: "Acme · US", hasScans: true },
      { id: "t2", name: "Acme · EU", hasScans: true },
      { id: "t3", name: "Acme · New", hasScans: false },
    ],
  },
  {
    brandId: "b-bold",
    brandName: "BOLD",
    trackers: [
      { id: "t4", name: "BOLD · Docs", hasScans: true },
      { id: "t5", name: "BOLD · Jobs", hasScans: true },
    ],
  },
];

describe("TrackerSelector — pure helpers", () => {
  describe("allTrackerIds", () => {
    it("flattens every tracker ID across all brands", () => {
      expect(allTrackerIds(FIXTURE)).toEqual(["t1", "t2", "t3", "t4", "t5"]);
    });
    it("returns empty when brands is empty", () => {
      expect(allTrackerIds([])).toEqual([]);
    });
  });

  describe("isTrackerSelected", () => {
    it("returns true for every tracker when scope is 'all'", () => {
      expect(isTrackerSelected("all", "t-anything")).toBe(true);
    });
    it("checks explicit inclusion when scope is an array", () => {
      expect(isTrackerSelected(["t1", "t3"], "t1")).toBe(true);
      expect(isTrackerSelected(["t1", "t3"], "t2")).toBe(false);
    });
  });

  describe("computeWorkspaceState", () => {
    it("checked when scope is 'all'", () => {
      expect(computeWorkspaceState("all", FIXTURE)).toBe("checked");
    });
    it("unchecked when scope is empty array", () => {
      expect(computeWorkspaceState([], FIXTURE)).toBe("unchecked");
    });
    it("checked when explicit list equals every tracker (canonical case)", () => {
      expect(computeWorkspaceState(["t1", "t2", "t3", "t4", "t5"], FIXTURE)).toBe("checked");
    });
    it("indeterminate for partial selection", () => {
      expect(computeWorkspaceState(["t1", "t2"], FIXTURE)).toBe("indeterminate");
    });
  });

  describe("computeBrandState", () => {
    const acme = FIXTURE[0];
    it("checked when scope is 'all'", () => {
      expect(computeBrandState("all", acme)).toBe("checked");
    });
    it("checked when all of the brand's trackers are in scope", () => {
      expect(computeBrandState(["t1", "t2", "t3"], acme)).toBe("checked");
    });
    it("unchecked when none of the brand's trackers are in scope", () => {
      expect(computeBrandState(["t4"], acme)).toBe("unchecked");
    });
    it("indeterminate for partial brand selection", () => {
      expect(computeBrandState(["t1", "t3"], acme)).toBe("indeterminate");
    });
  });

  describe("toggleTracker", () => {
    it("removes from explicit list", () => {
      expect(toggleTracker(["t1", "t2"], "t1", FIXTURE)).toEqual(["t2"]);
    });
    it("adds to explicit list when not present", () => {
      expect(toggleTracker(["t1"], "t2", FIXTURE)).toEqual(["t1", "t2"]);
    });
    it("expands 'all' to all-minus-toggled when removing", () => {
      expect(toggleTracker("all", "t3", FIXTURE)).toEqual(["t1", "t2", "t4", "t5"]);
    });
    it("canonicalizes back to 'all' when list reaches full", () => {
      expect(toggleTracker(["t1", "t2", "t3", "t4"], "t5", FIXTURE)).toBe("all");
    });
  });

  describe("toggleBrand", () => {
    it("when brand is fully checked → removes all its trackers from scope", () => {
      // Acme fully checked under explicit scope.
      expect(toggleBrand(["t1", "t2", "t3", "t4"], "b-acme", FIXTURE)).toEqual(["t4"]);
    });
    it("when scope is 'all' (brand checked via 'all') → expands to other brands' trackers", () => {
      expect(toggleBrand("all", "b-acme", FIXTURE)).toEqual(["t4", "t5"]);
    });
    it("when brand is indeterminate → selects all in brand", () => {
      const result = toggleBrand(["t1", "t4"], "b-acme", FIXTURE);
      // Acme had t1; toggle adds t2, t3.
      expect(result).toEqual(expect.arrayContaining(["t1", "t2", "t3", "t4"]));
      expect((result as string[]).length).toBe(4);
    });
    it("when brand is unchecked → selects all in brand", () => {
      expect(toggleBrand(["t4"], "b-acme", FIXTURE)).toEqual(
        expect.arrayContaining(["t1", "t2", "t3", "t4"]),
      );
    });
    it("canonicalizes to 'all' when adding the brand completes the full set", () => {
      // Start with just BOLD's trackers; toggle Acme → all selected → "all".
      expect(toggleBrand(["t4", "t5"], "b-acme", FIXTURE)).toBe("all");
    });
    it("unknown brand id is a no-op", () => {
      expect(toggleBrand(["t1"], "bogus", FIXTURE)).toEqual(["t1"]);
    });
  });

  describe("toggleWorkspace", () => {
    it("checked → []", () => {
      expect(toggleWorkspace("all", FIXTURE)).toEqual([]);
    });
    it("unchecked → 'all'", () => {
      expect(toggleWorkspace([], FIXTURE)).toBe("all");
    });
    it("indeterminate → 'all'", () => {
      expect(toggleWorkspace(["t1"], FIXTURE)).toBe("all");
    });
  });

  describe("triggerLabel", () => {
    it("returns 'No trackers yet' when there are zero brands", () => {
      expect(triggerLabel("all", [])).toBe("No trackers yet");
    });
    it("returns 'All trackers (N)' when scope is 'all'", () => {
      expect(triggerLabel("all", FIXTURE)).toBe("All trackers (5)");
    });
    it("returns 'None selected' when scope is empty array", () => {
      expect(triggerLabel([], FIXTURE)).toBe("None selected");
    });
    it("returns the tracker name when scope is a single tracker", () => {
      expect(triggerLabel(["t1"], FIXTURE)).toBe("Acme · US");
    });
    it("returns 'N of M trackers' for multi-select subset", () => {
      expect(triggerLabel(["t1", "t4"], FIXTURE)).toBe("2 of 5 trackers");
    });
  });
});

describe("TrackerSelector — component", () => {
  it("renders the trigger pill with the scope label", () => {
    render(<TrackerSelector brands={FIXTURE} scope="all" onScopeChange={() => {}} />);
    expect(screen.getByRole("button", { name: /tracker scope selector/i })).toHaveTextContent(
      "All trackers (5)",
    );
  });

  it("dropdown is closed by default", () => {
    render(<TrackerSelector brands={FIXTURE} scope="all" onScopeChange={() => {}} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens the dropdown and renders every brand + tracker", async () => {
    render(<TrackerSelector brands={FIXTURE} scope="all" onScopeChange={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: /tracker scope selector/i }));
    const dialog = screen.getByRole("dialog");

    expect(within(dialog).getByLabelText("Acme")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("BOLD")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Acme · US")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("BOLD · Jobs")).toBeInTheDocument();
  });

  it("renders the empty state when there are no brands", async () => {
    const onAdd = vi.fn();
    render(<TrackerSelector brands={[]} scope="all" onScopeChange={() => {}} onAddBrand={onAdd} />);
    await userEvent.click(screen.getByRole("button", { name: /tracker scope selector/i }));
    const dialog = screen.getByRole("dialog");
    // The trigger pill also shows "No trackers yet" — scope to the dialog so
    // we assert specifically on the empty-state copy inside the dropdown.
    expect(within(dialog).getByText(/no trackers yet/i)).toBeInTheDocument();
    const addBtn = within(dialog).getByRole("button", { name: /add a brand/i });
    await userEvent.click(addBtn);
    expect(onAdd).toHaveBeenCalledOnce();
  });

  it("trackers without scans render greyed with a 'No scans yet' hint", async () => {
    render(<TrackerSelector brands={FIXTURE} scope="all" onScopeChange={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: /tracker scope selector/i }));
    // t3 (Acme · New) has hasScans=false → label rendered.
    expect(screen.getByText(/no scans yet/i)).toBeInTheDocument();
  });

  it("clicking a tracker checkbox calls onScopeChange with the new scope", async () => {
    const onChange = vi.fn();
    render(<TrackerSelector brands={FIXTURE} scope="all" onScopeChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: /tracker scope selector/i }));

    // Click the Acme · US checkbox — expects expansion + removal.
    const cb = screen.getByRole("checkbox", { name: "Acme · US" });
    await userEvent.click(cb);
    expect(onChange).toHaveBeenCalledWith(["t2", "t3", "t4", "t5"]);
  });

  it("clicking the 'All trackers' master while checked sets scope to []", async () => {
    const onChange = vi.fn();
    render(<TrackerSelector brands={FIXTURE} scope="all" onScopeChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: /tracker scope selector/i }));

    const masterCheckbox = screen.getByRole("checkbox", { name: /^all trackers/i });
    await userEvent.click(masterCheckbox);
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("clicking the 'All trackers' master while empty sets scope to 'all'", async () => {
    const onChange = vi.fn();
    render(<TrackerSelector brands={FIXTURE} scope={[]} onScopeChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: /tracker scope selector/i }));

    const masterCheckbox = screen.getByRole("checkbox", { name: /^all trackers/i });
    await userEvent.click(masterCheckbox);
    expect(onChange).toHaveBeenCalledWith("all");
  });

  it("search filters trackers by name", async () => {
    render(<TrackerSelector brands={FIXTURE} scope="all" onScopeChange={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: /tracker scope selector/i }));

    await userEvent.type(screen.getByPlaceholderText(/search trackers/i), "BOLD");
    // Acme group should be hidden when "BOLD" doesn't match Acme name or any of its trackers.
    expect(screen.queryByLabelText("Acme · US")).not.toBeInTheDocument();
    expect(screen.getByLabelText("BOLD · Docs")).toBeInTheDocument();
  });

  it("search matching a brand name shows all that brand's trackers", async () => {
    render(<TrackerSelector brands={FIXTURE} scope="all" onScopeChange={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: /tracker scope selector/i }));

    await userEvent.type(screen.getByPlaceholderText(/search trackers/i), "Acme");
    expect(screen.getByLabelText("Acme · US")).toBeInTheDocument();
    expect(screen.getByLabelText("Acme · EU")).toBeInTheDocument();
    expect(screen.getByLabelText("Acme · New")).toBeInTheDocument();
    expect(screen.queryByLabelText("BOLD · Docs")).not.toBeInTheDocument();
  });

  it("dropdown closes when Escape is pressed", async () => {
    render(<TrackerSelector brands={FIXTURE} scope="all" onScopeChange={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: /tracker scope selector/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("dropdown closes when clicking outside", async () => {
    render(
      <div>
        <button type="button">Outside</button>
        <TrackerSelector brands={FIXTURE} scope="all" onScopeChange={() => {}} />
      </div>,
    );
    await userEvent.click(screen.getByRole("button", { name: /tracker scope selector/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Outside" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("master checkbox has aria-checked='mixed' when scope is indeterminate", async () => {
    render(<TrackerSelector brands={FIXTURE} scope={["t1", "t4"]} onScopeChange={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: /tracker scope selector/i }));
    const masterCheckbox = screen.getByRole("checkbox", { name: /^all trackers/i });
    expect(masterCheckbox).toHaveAttribute("aria-checked", "mixed");
  });
});
