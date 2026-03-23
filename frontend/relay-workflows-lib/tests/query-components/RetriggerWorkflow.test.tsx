import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { RelayEnvironmentProvider } from "react-relay";
import { getRelayEnvironment } from "dashboard/src/RelayEnvironment";
import { MemoryRouter } from "react-router-dom";
import { RetriggerWorkflowQuery$data } from "../../lib/query-components/__generated__/RetriggerWorkflowQuery.graphql";
import { RetriggerWorkflow } from "../../lib/query-components/RetriggerWorkflow";
import { mockLazyLoadQuery } from "../testUtils";

vi.mock("react-relay", async () => {
  const actual = await vi.importActual("react-relay");
  return {
    ...actual,
    RelayEnvironmentProvider: actual.RelayEnvironmentProvider,
    useLazyLoadQuery: vi.fn(),
  };
});

describe("RetriggerWorkflow", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });
  const renderComponent = async () => {
    const environment = await getRelayEnvironment();
    render(
      <MemoryRouter initialEntries={["/workflows/abc1234-1"]}>
        <RelayEnvironmentProvider environment={environment}>
          <RetriggerWorkflow
            instrumentSession={{
              proposalCode: "abc",
              proposalNumber: 1234,
              number: 1,
            }}
            workflowName="mock-workflow"
          />
        </RelayEnvironmentProvider>
      </MemoryRouter>,
    );
  };

  it("renders a link to previous workflow submission page", async () => {
    mockLazyLoadQuery<RetriggerWorkflowQuery$data>({
      workflow: {
        templateRef: "mock-template",
      },
    });

    await renderComponent();

    const icon = await screen.findByTestId("RefreshIcon");
    expect(icon).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Rerun workflow" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute(
      "href",
      "/templates/mock-template/abc1234-1-mock-workflow",
    );
  });

  it("renders no template icon", async () => {
    mockLazyLoadQuery<RetriggerWorkflowQuery$data>({
      workflow: {
        templateRef: null,
      },
    });

    await renderComponent();

    const icon = await screen.findByTestId("RefreshIcon");
    expect(icon).toBeInTheDocument();
    expect(screen.getByLabelText("No template found")).toBeInTheDocument();
  });
});
