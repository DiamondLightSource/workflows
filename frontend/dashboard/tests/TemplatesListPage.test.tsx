import "@testing-library/jest-dom";
import { screen, render } from "@testing-library/react";

import { MemoryRouter } from "react-router-dom";
import TemplatesListPage from "../src/routes/TemplatesListPage";
import { TemplatesListViewProps } from "relay-workflows-lib";

vi.mock("relay-workflows-lib", async () => ({
  ...(await vi.importActual("relay-workflows-lib")),
  TemplatesListView: ({ filter }: TemplatesListViewProps) => (
    <p>{filter?.scienceGroup?.toString()}</p>
  ),
  WorkflowsNavbar: vi.fn(),
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
