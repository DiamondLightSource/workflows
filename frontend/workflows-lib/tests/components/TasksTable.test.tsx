import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import TasksTable from "../../lib/components/workflow/TasksFlow";
import { getTaskStatusIcon } from "../../lib/components/common/StatusIcons";
import { mockTasks } from "./data";

describe("TaskTable Component", () => {
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
    const { getByText } = render(
      <TasksTable tasks={mockTasks} onNavigate={() => {}} />
    );
    expect(getByText("task-1")).toBeInTheDocument();
    expect(getByText("task-2")).toBeInTheDocument();
    expect(getByText("task-3")).toBeInTheDocument();
  });

  it("should call getStatusIcon for each task", () => {
    render(<TasksTable tasks={mockTasks} onNavigate={() => {}} />);
    expect(getTaskStatusIcon).toHaveBeenCalledWith("Pending");
    expect(getTaskStatusIcon).toHaveBeenCalledWith("Succeeded");
    expect(getTaskStatusIcon).toHaveBeenCalledWith("Running");
  });
});
