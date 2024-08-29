import { render } from "@testing-library/react";
import TasksTable from "../../lib/components/workflow/TasksFlow";
import { getStatusIcon } from "../../lib/components/common/StatusIcons";
import "@testing-library/jest-dom";

jest.mock("../../lib/components/common/StatusIcons", () => ({
  getStatusIcon: jest.fn(),
}));

describe("TaskTable Component", () => {
  const mockTasks = [
    { name: "task-1", workflow: "w1", status: "pending" },
    { name: "task-2", workflow: "w2", status: "in-progress" },
    { name: "task-3", workflow: "w2", status: "completed" },
  ];

  beforeEach(() => {
    (getStatusIcon as jest.Mock)
      .mockReturnValueOnce(<span>Pending Icon</span>)
      .mockReturnValueOnce(<span>Completed Icon</span>)
      .mockReturnValueOnce(<span>In-Progress Icon</span>);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should render without crashing", () => {
    const { getByText } = render(<TasksTable tasks={mockTasks} />);
    expect(getByText("task-1")).toBeInTheDocument();
    expect(getByText("task-2")).toBeInTheDocument();
    expect(getByText("task-3")).toBeInTheDocument();
  });

  it("should call getStatusIcon for each task", () => {
    render(<TasksTable tasks={mockTasks} />);

    expect(getStatusIcon).toHaveBeenCalledWith("pending");
    expect(getStatusIcon).toHaveBeenCalledWith("completed");
    expect(getStatusIcon).toHaveBeenCalledWith("in-progress");
  });
});
