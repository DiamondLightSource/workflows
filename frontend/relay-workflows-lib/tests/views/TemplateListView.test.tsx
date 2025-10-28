import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import TemplatesListView from "relay-workflows-lib/lib/views/TemplatesListView";
import userEvent from "@testing-library/user-event";
import templateListResponse from "dashboard/src/mocks/responses/templates/templateListResponse.json";
import { server } from "relay-workflows-lib/tests/mocks/browser.ts";
import { RelayEnvironmentProvider } from "react-relay";
import { getRelayEnvironment } from "dashboard/src/RelayEnvironment";
import { Box } from "@mui/material";
import { TemplateCardFragment$data } from "relay-workflows-lib/lib/components/__generated__/TemplateCardFragment.graphql.ts";

interface MockCardProps {
  template: TemplateCardFragment$data;
}

const firstPageTemplates = {
  workflowTemplates: {
    nodes: templateListResponse.workflowTemplates.nodes.slice(0, 10),
  },
};

vi.mock("relay-workflows-lib/lib/components/TemplateCard", () => ({
  TemplateCard: ({ template }: MockCardProps) => <Box>{template.name}</Box>,
}));

vi.mock("react-router-dom", () => ({
  useNavigate: vi.fn(),
  useLocation: vi.fn(),
}));

describe("TemplateList", () => {
  // Get the names of all mock templates in ./data.ts
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
  });

  beforeEach(async () => {
    console.log = vi.fn();
    const environment = await getRelayEnvironment();
    render(
      <RelayEnvironmentProvider environment={environment}>
        <TemplatesListView setFilter={() => {}} />
      </RelayEnvironmentProvider>,
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  test.each(cases)(
    "returns a search of '%s' with '%s'",
    async (search, results) => {
      const searchInput = await screen.findByTestId("searchInput");
      const filteredOutTemplates = allTemplateNames.filter(
        (name) => !results.includes(name),
      );

      allTemplateNames.forEach((templateName) => {
        expect(screen.getByText(templateName)).toBeInTheDocument();
      });

      if (search) await user.type(searchInput, search);

      results.forEach((template) => {
        expect(screen.getByText(template)).toBeInTheDocument();
      });
      filteredOutTemplates.forEach((template) => {
        expect(screen.queryByText(template)).not.toBeInTheDocument();
      });
    },
  );

  it("shows all templates again when search is cleared", async () => {
    const searchInput = await screen.findByTestId("searchInput");
    const clearButton = screen.getByTestId("clear-search");

    await user.type(searchInput, "ePSIC mib conversion");

    expect(screen.getByText("e02-mib2x")).toBeInTheDocument();
    expect(screen.queryByText("conditional-steps")).not.toBeInTheDocument();

    await user.click(clearButton);

    expect(screen.getByText("e02-mib2x")).toBeInTheDocument();
    expect(screen.getByText("conditional-steps")).toBeInTheDocument();
  });
});
