import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
import TemplateSearchField from "workflows-lib/lib/components/template/TemplateSearchField";
import { MemoryRouter } from "react-router-dom";

describe("TemplateSearchField", () => {
  const mockSearch = vi.fn();
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    render(
      <MemoryRouter>
        <TemplateSearchField handleSearch={mockSearch} />
      </MemoryRouter>,
    );
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

  it("obtains initial search from the query parameters", () => {
    cleanup();
    render(
      <MemoryRouter initialEntries={["?search=template123"]}>
        <TemplateSearchField handleSearch={mockSearch} />
      </MemoryRouter>,
    );
    const textBox = screen.getByTestId("searchInput");
    expect(textBox).toHaveValue("template123");
  });
});
