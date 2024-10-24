import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import TasksTable from "../../lib/components/workflow/TasksFlow";
import { getTaskStatusIcon } from "../../lib/components/common/StatusIcons";
import { TaskStatus } from "../../lib/types";

describe("TaskTable Component", () => {
  const mockTasks = [
    { id: "task-1", name: "task-1", status: "Pending" as TaskStatus },
    {
      id: "task-2",
      name: "task-2",
      status: "Succeeded" as TaskStatus,
      depends: ["task-1"],
    },
    { id: "task-3", name: "task-3", status: "Running" as TaskStatus },
  ];

  beforeEach(() => {
    vi.mock(
      "../../lib/components/common/StatusIcons",
      async (importOriginal) => ({
        ...(await importOriginal()),
        getTaskStatusIcon: vi
          .fn()
          .mockReturnValueOnce(<span>Pending Icon</span>)
          .mockReturnValueOnce(<span>Completed Icon</span>)
          .mockReturnValueOnce(<span>In-Progress Icon</span>),
      })
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should render without crashing", () => {
    const { getByText } = render(<TasksTable tasks={mockTasks} />);
    expect(getByText("task-1")).toBeInTheDocument();
    expect(getByText("task-2")).toBeInTheDocument();
    expect(getByText("task-3")).toBeInTheDocument();
  });

  it("should call getStatusIcon for each task", () => {
    render(<TasksTable tasks={mockTasks} />);
    expect(getTaskStatusIcon).toHaveBeenCalledWith("Pending");
    expect(getTaskStatusIcon).toHaveBeenCalledWith("Succeeded");
    expect(getTaskStatusIcon).toHaveBeenCalledWith("Running");
  });
});
