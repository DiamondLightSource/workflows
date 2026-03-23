import "@testing-library/jest-dom";
import { screen, render } from "@testing-library/react";

import { MemoryRouter } from "react-router-dom";
import TemplatesListPage from "../src/routes/TemplatesListPage";
import { TemplatesListViewProps } from "relay-workflows-lib/lib/views/TemplatesListView";

vi.mock("relay-workflows-lib/lib/views/TemplatesListView", () => ({
  default: ({ filter }: TemplatesListViewProps) => (
    <p>{filter?.scienceGroup?.toString()}</p>
  ),
}));

describe("TemplatesListPage", () => {
  beforeEach(() => {
    render(
      <MemoryRouter initialEntries={["?group=EXAMPLES"]}>
        <TemplatesListPage />
      </MemoryRouter>,
    );
  });

  it("obtains template filter from the query params", () => {
    expect(screen.getByText("EXAMPLES")).toBeInTheDocument();
  });
});
