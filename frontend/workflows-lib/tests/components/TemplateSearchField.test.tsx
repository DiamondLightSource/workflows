import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
import TemplateSearchField from "workflows-lib/lib/components/template/TemplateSearchField";

describe("TemplateSearchField", () => {
  const mockSearch = vi.fn();
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    render(<TemplateSearchField handleSearch={mockSearch} />);
  });

  it("searches every time a key is pressed", async () => {
    await user.type(screen.getByTestId("searchInput"), "15 keys pressed");
    expect(mockSearch).toHaveBeenCalledTimes(15);
  });

  it("clears the search when clear icon is clicked", async () => {
    const textBox = screen.getByTestId("searchInput");
    await user.type(textBox, "Example text{enter}");
    expect(textBox).toHaveValue("Example text");

    await user.click(screen.getByRole("button"));
    expect(textBox).toHaveValue("");
    expect(mockSearch).toHaveBeenCalledWith("");
  });
});
