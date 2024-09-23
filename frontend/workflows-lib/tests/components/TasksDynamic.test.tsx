import { render, screen } from "@testing-library/react";
import TasksDynamic from "../../lib/components/workflow/TasksDynamic";
import { ReactFlowInstance } from "@xyflow/react";
import { Node, Edge } from "@xyflow/react";
import { Task, TaskStatus } from "../../lib/types";
import "@testing-library/jest-dom";

jest.mock("@xyflow/react", () => ({
  ReactFlow: ({
    onInit,
  }: {
    onInit: (instance: ReactFlowInstance) => void;
  }) => {
    const mockInstance = {
      fitView: jest.fn(),
    } as unknown as ReactFlowInstance;
    onInit(mockInstance);
    return <div data-testid="reactflow-mock" />;
  },
  getNodesBounds: () => ({ width: 100, height: 100 }),
}));

jest.mock("../../lib/components/workflow/TasksTable", () => ({
  __esModule: true,
  default: () => <div data-testid="taskstable-mock" />,
}));

jest.mock("../../lib/components/workflow/TasksFlowUtils", () => ({
  applyDagreLayout: (nodes: Node, edges: Edge) => ({ nodes, edges }),
  buildTaskTree: (tasks: Task[]) => tasks,
  generateNodesAndEdges: () => ({}),
}));

describe("TasksDynamic", () => {
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

  it("should render Graph when there is no overflow", () => {
    jest.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      width: 200,
      height: 200,
      x: 0,
      y: 0,
      bottom: 0,
      left: 0,
      right: 0,
      top: 0,
      toJSON: function () {
        throw new Error("Function not implemented.");
      },
    });

    render(<TasksDynamic tasks={mockTasks} />);
    expect(screen.getByTestId("reactflow-mock")).toBeInTheDocument();
    expect(screen.queryByTestId("taskstable-mock")).not.toBeInTheDocument();
  });

  it("should render TasksTable when there is overflow", () => {
    jest.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      width: 50,
      height: 50,
      x: 0,
      y: 0,
      bottom: 0,
      left: 0,
      right: 0,
      top: 0,
      toJSON: function () {
        throw new Error("Function not implemented.");
      },
    });

    render(<TasksDynamic tasks={mockTasks} />);
    expect(screen.getByTestId("taskstable-mock")).toBeInTheDocument();
    expect(screen.queryByTestId("reactflow-mock")).not.toBeInTheDocument();
  });

  it("should clean up event listeners on unmount", () => {
    const removeEventListenerSpy = jest.spyOn(window, "removeEventListener");

    const { unmount } = render(<TasksDynamic tasks={mockTasks} />);
    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "resize",
      expect.any(Function)
    );
  });
});
