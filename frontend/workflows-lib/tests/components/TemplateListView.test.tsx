import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import TemplatesListView from "relay-workflows-lib/lib/views/TemplatesListView";
import userEvent from "@testing-library/user-event";
import templateListResponse from "dashboard/src/mocks/responses/templates/templateListResponse.json";
import { serviceWorker as worker } from "../mocks/worker";
import { RelayEnvironmentProvider } from "react-relay";
import { getRelayEnvironment } from "dashboard/src/RelayEnvironment";

const firstPageTemplates = {
  workflowTemplates: {
    nodes: templateListResponse.workflowTemplates.nodes.slice(0, 10),
  },
};

vi.mock("react-router-dom", async () => ({
  useNavigate: () => {},
  useLocation: () => {},
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
    worker.listen();
    assert(import.meta.env.VITE_KEYCLOAK_URL === "https://authn.diamond.ac.uk");
    assert(import.meta.env.VITE_ENABLE_MOCKING === "true");
  });
  afterAll(() => {
    worker.close();
  });
  afterEach(() => {
    worker.resetHandlers();
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
      const filteredOutTemplates = allTemplateNames.filter(
        (name) => !results.includes(name),
      );

      // allTemplateNames.forEach(async (templateName) => {
      //     console.log(templateName)
      //     expect(await screen.findByRole("button", {name: new RegExp(templateName, "i")}, {timeout: 10000})).toBeInTheDocument();
      //     console.log("Passed")
      // });

      for (const templateName of allTemplateNames) {
        expect(
          await screen.findByRole("button", {
            name: new RegExp(templateName, "i"),
          }),
        ).toBeInTheDocument();
      }

      if (search) await user.type(searchInput, search);

    //   results.forEach((template) => {
    //     expect(screen.getByText(template)).toBeInTheDocument();
    //   });

      for(const template of results){
        expect(await screen.findByRole("button", { name: new RegExp(template, "i")}))
      }
      filteredOutTemplates.forEach((template) => {
        expect(screen.queryByText(template)).not.toBeInTheDocument();
      });
    },
  );

//   it("shows all templates again when search is cleared", async () => {
//     const searchInput = screen.getByTestId("searchInput");
//     const clearButton = screen.getByTestId("clear-search");
//     await user.type(searchInput, "ePSIC mib conversion");
//     expect(screen.getByText("e02-mib2x")).toBeInTheDocument();
//     expect(screen.queryByText("conditional-steps")).not.toBeInTheDocument();
//     await user.click(clearButton);
//     expect(screen.getByText("e02-mib2x")).toBeInTheDocument();
//     expect(screen.getByText("conditional-steps")).toBeInTheDocument();
//   });
});
