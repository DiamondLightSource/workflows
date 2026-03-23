import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import WorkflowsListView from "relay-workflows-lib/lib/views/WorkflowsListView";
import { server } from "relay-workflows-lib/tests/mocks/browser.ts";
import { RelayEnvironmentProvider } from "react-relay";
import { getRelayEnvironment } from "dashboard/src/RelayEnvironment";
import { MemoryRouter } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import { workflowsListViewTemplatesResponse } from "dashboard/src/mocks/responses/templates/workflowsListViewTemplates";
import workflowsListResponse from "dashboard/src/mocks/responses/workflows/workflowsListResponse.json";
import * as WorkflowsContent from "relay-workflows-lib/lib/components/WorkflowsContent";

vi.mock(import("relay-workflows-lib/lib/components/TasksFlow"), () => ({
  default: vi.fn(() => <></>),
}));

vi.mock(
  import("relay-workflows-lib/lib/components/WorkflowsContent"),
  async (importOriginal) => {
    const original = await importOriginal();
    return {
      ...original,
      default: vi.fn(original.default),
    };
  },
);

describe("WorkflowsListView", () => {
  const user = userEvent.setup();
  const workflows = workflowsListResponse.workflows.nodes;

  async function renderView() {
    const environment = await getRelayEnvironment();
    render(
      <MemoryRouter>
        <RelayEnvironmentProvider environment={environment}>
          <WorkflowsListView instrumentSessionID={"mg36964-1"} />
        </RelayEnvironmentProvider>
      </MemoryRouter>,
    );
  }

  beforeAll(() => {
    server.listen();
  });

  afterAll(() => {
    vi.restoreAllMocks();
    server.close();
  });

  it("passes the mock workflows query data to the workflow list", async () => {
    await renderView();
    expect(await screen.findByText("Loading Workflows...")).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.queryByText("Loading Workflows..."),
      ).not.toBeInTheDocument();
    });

    expect(screen.getAllByText("Creator: abc12345")).toHaveLength(10);
    const workflowNameRegex = new RegExp(workflows[0].name, "i");
    expect(
      screen.getByRole("heading", { name: workflowNameRegex }),
    ).toBeInTheDocument();
  });

  it("passes the mock template list query data to the filter drawer", async () => {
    vi.mocked(WorkflowsContent.default).mockImplementation(() => <></>);
    await renderView();
    await user.click(
      await screen.findByRole("button", { name: "Add filters" }),
    );
    await user.click(screen.getByRole("button", { name: "Open" }));
    workflowsListViewTemplatesResponse.workflowTemplates.nodes.forEach(
      (template) => {
        expect(screen.getByText(template.name)).toBeInTheDocument();
      },
    );
  });
});
