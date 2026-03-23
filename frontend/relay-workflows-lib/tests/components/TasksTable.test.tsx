import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import TasksTable from "../../lib/components/TasksFlow";
import { getTaskStatusIcon } from "workflows-lib/lib/components/common/StatusIcons";
import { mockTasks } from "workflows-lib/tests/components/data";

describe("TaskTable Component", () => {
  vi.mock("relay-workflows-lib/lib/utils/workflowRelayUtils", () => ({
    useFetchedTasks: vi.fn(() => mockTasks),
  }));

  beforeEach(() => {
    vi.mock(
      "workflows-lib/lib/components/common/StatusIcons",
      async (importOriginal) => ({
        ...(await importOriginal()),
        getTaskStatusIcon: vi
          .fn()
          .mockReturnValueOnce(<span>Pending Icon</span>)
          .mockReturnValueOnce(<span>Completed Icon</span>)
          .mockReturnValueOnce(<span>In-Progress Icon</span>),
      }),
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should render without crashing", () => {
    const { getByText } = render(
      <TasksTable workflowName="mockWorkflowA" onNavigate={() => {}} />,
    );
    expect(getByText("task-1")).toBeInTheDocument();
    expect(getByText("task-2")).toBeInTheDocument();
    expect(getByText("task-3")).toBeInTheDocument();
  });

  it("should call getStatusIcon for each task", () => {
    render(<TasksTable workflowName="mockWorkflowA" onNavigate={() => {}} />);
    expect(getTaskStatusIcon).toHaveBeenCalledWith("Pending");
    expect(getTaskStatusIcon).toHaveBeenCalledWith("Succeeded");
    expect(getTaskStatusIcon).toHaveBeenCalledWith("Running");
  });
});
