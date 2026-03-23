import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { WorkflowListFilterDrawer } from "relay-workflows-lib";
import { WorkflowsListViewTemplatesQuery } from "relay-workflows-lib/lib/views/WorkflowsListView";
import userEvent from "@testing-library/user-event";
import { WorkflowQueryFilter } from "workflows-lib";
import { useLazyLoadQuery } from "react-relay";
import { WorkflowsListViewTemplatesQuery as WorkflowsListViewTemplatesQueryType } from "relay-workflows-lib/lib/views/__generated__/WorkflowsListViewTemplatesQuery.graphql";
import { server } from "../mocks/browser";
import { RelayEnvironmentProvider } from "react-relay";
import { getRelayEnvironment } from "dashboard/src/RelayEnvironment";

function WorkflowListFilterDrawerWithQuery({
  onApplyFilter,
}: {
  onApplyFilter: (filters: WorkflowQueryFilter) => void;
}) {
  const templateData = useLazyLoadQuery<WorkflowsListViewTemplatesQueryType>(
    WorkflowsListViewTemplatesQuery,
    {},
    {},
  );

  return (
    <WorkflowListFilterDrawer
      data={templateData.workflowTemplates}
      onApplyFilters={onApplyFilter}
    />
  );
}

describe("WorkflowListFilterDrawer", () => {
  const mockApplyFilter = vi.fn();
  const user = userEvent.setup();
  beforeAll(() => {
    server.listen();
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    const environment = await getRelayEnvironment();

    render(
      <RelayEnvironmentProvider environment={environment}>
        <WorkflowListFilterDrawerWithQuery onApplyFilter={mockApplyFilter} />
      </RelayEnvironmentProvider>,
    );
  });

  afterAll(() => {
    server.close();
  });

  it("displays the list of templates as options", async () => {
    await user.click(await screen.findByRole("button"));

    const autocomplete = screen.getByRole("combobox", { name: "Template" });
    expect(autocomplete).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Open" }));

    const options = await screen.findAllByRole("option");
    expect(options).toHaveLength(3);
  });

  it("allows a template to be selected", async () => {
    await user.click(await screen.findByRole("button"));

    const autocomplete = screen.getByRole("combobox", { name: "Template" });
    expect(autocomplete).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Open" }));

    expect(autocomplete).toHaveValue("");
    await user.keyboard("{ArrowDown}{Enter}");
    expect(autocomplete).toHaveValue("Template A");
  });

  it("filters templates as text is entered", async () => {
    await user.click(await screen.findByRole("button"));
    await userEvent.click(screen.getByRole("button", { name: "Open" }));

    await user.keyboard("Template");
    const options = await screen.findAllByRole("option");
    expect(options).toHaveLength(2);
  });

  it("updates the filter when applied", async () => {
    await user.click(await screen.findByRole("button"));
    const autocomplete = screen.getByRole("combobox", { name: "Template" });
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    const options = await screen.findAllByRole("option");
    await userEvent.click(options[2]);
    expect(autocomplete).toHaveValue("Mock C");
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(mockApplyFilter).toHaveBeenCalledWith({
      creator: undefined,
      template: "Mock C",
      workflowStatusFilter: undefined,
    });
  });
});
