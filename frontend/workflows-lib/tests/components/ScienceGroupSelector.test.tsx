import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ScienceGroupSelector, ScienceGroup } from "../../lib/main";
import userEvent from "@testing-library/user-event";

describe("ScienceGroupSelector", () => {
  const mockSetter = vi.fn();
  const user = userEvent.setup();
  const scienceGroups = Object.values(ScienceGroup);

  beforeEach(() => {
    vi.clearAllMocks();
    render(<ScienceGroupSelector setFilter={mockSetter} />);
  });

  it("allows a science group to be selected", async () => {
    const select = screen.getByRole("combobox");
    await user.click(select);

    const groups = screen.getAllByRole("option");
    await user.click(groups[1]);

    // scienceGroups[i] === groups[i+1] due to 'No Group' option
    expect(select).toHaveTextContent(scienceGroups[0]);

    const button = screen.getByRole("button", { name: "Apply" });
    await user.click(button);
    expect(mockSetter).toHaveBeenCalledWith({
      scienceGroup: [scienceGroups[0]],
    });
  });

  it("calls the filter setter when apply is clicked", async () => {
    const button = screen.getByRole("button", { name: "Apply" });
    await user.click(button);
    expect(mockSetter).toHaveBeenCalledWith({ scienceGroup: [] });
  });
});
