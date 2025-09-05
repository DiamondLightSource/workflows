import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import TemplatesList from "relay-workflows-lib/lib/components/TemplatesList";
import { TemplateCardProps } from "../../lib/components/template/TemplateCard";
import { Box } from "@mui/material";
import userEvent from "@testing-library/user-event";
import templateListResponse from "dashboard/src/mocks/responses/templates/templateListResponse.json";

const mockTemplates = {
  workflowTemplates: {
    nodes: templateListResponse.workflowTemplates.nodes.slice(0, 10),
  },
};

vi.mock("relay-runtime", () => ({
  graphql: () => {},
}));

vi.mock("workflows-lib/lib/components/template/TemplateCard", () => ({
  TemplateCard: (props: TemplateCardProps) => <Box>{props.template.name}</Box>,
}));

vi.mock("react-relay/hooks", () => ({
  useLazyLoadQuery: vi.fn(() => mockTemplates),
}));

describe("TemplateList", () => {
  // Get the names of all mock templates in ./data.ts
  const allTemplateNames: string[] = [];
  mockTemplates.workflowTemplates.nodes.map((template) => {
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

  beforeEach(() => {
    vi.clearAllMocks();
    render(<TemplatesList />);
  });

  test.each(cases)(
    "returns a search of '%s' with '%s'",
    async (search, results) => {
      const searchInput = screen.getByTestId("searchInput");
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
    const searchInput = screen.getByTestId("searchInput");
    const clearButton = screen.getByTestId("clear-search");

    await user.type(searchInput, "ePSIC mib conversion");

    expect(screen.getByText("e02-mib2x")).toBeInTheDocument();
    expect(screen.queryByText("conditional-steps")).not.toBeInTheDocument();

    await user.click(clearButton);

    expect(screen.getByText("e02-mib2x")).toBeInTheDocument();
    expect(screen.getByText("conditional-steps")).toBeInTheDocument();
  });
});
