import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import TemplatesListView from "relay-workflows-lib/lib/views/TemplatesListView";
import userEvent from "@testing-library/user-event";
import templateListResponse from "dashboard/src/mocks/responses/templates/templateListResponse.json";
import { server } from "relay-workflows-lib/tests/mocks/browser.ts";
import { RelayEnvironmentProvider } from "react-relay";
import { getRelayEnvironment } from "dashboard/src/RelayEnvironment";

const firstPageTemplates = {
  workflowTemplates: {
    nodes: templateListResponse.workflowTemplates.nodes.slice(0, 10),
  },
};

vi.mock("react-router-dom", () => ({
  useNavigate: vi.fn(),
  useLocation: vi.fn(),
}));

describe("TemplateList", () => {
  // Get the names of templates on first page
  const allTemplateNames: string[] = [];
  firstPageTemplates.workflowTemplates.nodes.map((template) => {
    allTemplateNames.push(template.name);
  });

  // [search string, template names expected to be visible in list]
  const cases: [string, string[]][] = [
    ["", allTemplateNames],
    ["e02-mib2x", ["e02-mib2x"]],
    ["e02", ["e02-mib2x", "e02-auto-mib2x"]],
    ["based on conditions", ["conditional-steps"]],
    ["HTTOMO-cor-SwEeP", ["httomo-cor-sweep"]],
  ];

  const user = userEvent.setup();

  beforeAll(() => {
    server.listen();
    assert(import.meta.env.VITE_ENABLE_MOCKING === "true");
  });
  afterAll(() => {
    server.close();
  });
  afterEach(() => {
    server.resetHandlers();
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    const environment = await getRelayEnvironment();
    render(
      <RelayEnvironmentProvider environment={environment}>
        <TemplatesListView />
      </RelayEnvironmentProvider>,
    );
  });

  test.each(cases)(
    "returns a search of '%s' with '%s'",
    async (search, results) => {
      const searchInput = await screen.findByTestId("searchInput");
      expect(searchInput).toBeInTheDocument();

      // List of all the templates that should be filtered out after the search
      const filteredOutTemplates = allTemplateNames.filter(
        (name) => !results.includes(name),
      );

      await screen.findByRole("button", { name: /conditional-steps/i });

      if (search) await user.type(searchInput, search);

      const buttons = await screen.findAllByRole("button");

      // List of text content of all buttons, including template cards
      const displayedTemplateNames = buttons.map(
        (button) => button.textContent,
      );

      // Each of the templates in the expected results should appear somewhere in the list
      results.forEach((template) => {
        expect(displayedTemplateNames).toContainEqual(
          expect.stringContaining(template),
        );
      });

      // None of the filtered out templates should appear in the list
      filteredOutTemplates.forEach((template) => {
        expect(displayedTemplateNames).not.toContainEqual(
          expect.stringContaining(template),
        );
      });
    },
  );

  it("shows all templates again when search is cleared", async () => {
    const searchInput = await screen.findByTestId("searchInput");
    const clearButton = screen.getByTestId("clear-search");

    await user.type(searchInput, "ePSIC mib conversion");
    expect(screen.getByText("e02-mib2x")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "conditional-steps" }),
    ).not.toBeInTheDocument();

    await user.click(clearButton);
    expect(screen.getByText("e02-mib2x")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "conditional-steps" }),
    ).toBeInTheDocument();
  });
});
