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

describe("WorkflowsListView", () => {
  const user = userEvent.setup();
  const workflows = workflowsListResponse.workflows.nodes;

  beforeAll(() => {
    server.listen();
  });

  beforeEach(async () => {
    const environment = await getRelayEnvironment();
    render(
      <MemoryRouter>
        <RelayEnvironmentProvider environment={environment}>
          <WorkflowsListView instrumentSessionID={"mg36964-1"} />
        </RelayEnvironmentProvider>
      </MemoryRouter>,
    );
  });

  afterAll(() => {
    server.close();
  });

  it("passes the mock workflows query data to the workflow list", async () => {
    expect(await screen.findByText("Loading Workflows...")).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.queryByText("Loading Workflows..."),
      ).not.toBeInTheDocument();
    });

    expect(screen.getAllByText("Creator: abc12345")).toHaveLength(10);
    workflows.forEach((workflow) => {
      expect(screen.getByText(workflow.name)).toBeInTheDocument();
    });
  });

  it("passes the mock template list query data to the filter drawer", async () => {
    await user.click(
      await screen.findByRole("button", { name: "Add filters" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    workflowsListViewTemplatesResponse.workflowTemplates.nodes.forEach(
      (template) => {
        expect(screen.getByText(template.name)).toBeInTheDocument();
      },
    );
  });
});
