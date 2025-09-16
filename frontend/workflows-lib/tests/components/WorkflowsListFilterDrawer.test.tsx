import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import templateListResponse from "dashboard/src/mocks/responses/templates/templateListResponse.json";
import { WorkflowListFilterDrawer } from "relay-workflows-lib";
import userEvent from "@testing-library/user-event";

vi.mock("relay-runtime", () => ({
  graphql: () => {},
}));

vi.mock("react-relay", () => ({
  graphql: () => {},
}));

vi.mock("react-relay/hooks", () => ({
  useLazyLoadQuery: vi.fn(() => templateListResponse),
}));

describe("WorkflowListFilterDrawer", () => {
  const mockApplyFilter = vi.fn();
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    render(<WorkflowListFilterDrawer onApplyFilters={mockApplyFilter} />);
  });

  it("displays the list of templates as options", async () => {
    await user.click(screen.getByRole("button"));

    const autocomplete = screen.getByRole("combobox", { name: "Template" });
    expect(autocomplete).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Open" }));

    const options = await screen.findAllByRole("option");
    expect(options).toHaveLength(28);
  });

  it("allows a template to be selected", async () => {
    await user.click(screen.getByRole("button"));

    const autocomplete = screen.getByRole("combobox", { name: "Template" });
    expect(autocomplete).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Open" }));

    expect(autocomplete).toHaveValue("");
    await user.keyboard("{ArrowDown}{Enter}");
    expect(autocomplete).toHaveValue("conditional-steps");
  });

  it("filters templates as text is entered", async () => {
    await user.click(screen.getByRole("button"));
    await userEvent.click(screen.getByRole("button", { name: "Open" }));

    await user.keyboard("httomo");
    const options = await screen.findAllByRole("option");
    expect(options).toHaveLength(2);
  });

  it("updates the filter when applied", async () => {
    await user.click(screen.getByRole("button"));
    const autocomplete = screen.getByRole("combobox", { name: "Template" });
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    const options = await screen.findAllByRole("option");
    await userEvent.click(options[2]);
    expect(autocomplete).toHaveValue("e02-mib2x");
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(mockApplyFilter).toHaveBeenCalledWith({
      creator: undefined,
      template: "e02-mib2x",
      workflowStatusFilter: undefined,
    });
  });
});
