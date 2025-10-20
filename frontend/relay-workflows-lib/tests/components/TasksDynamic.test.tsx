import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import TasksFlow from "relay-workflows-lib/lib/components/TasksFlow";
import { ReactFlowInstance } from "@xyflow/react";
import { Node, Edge } from "@xyflow/react";
import { Task } from "workflows-lib/lib/types";
import "react-resizable/css/styles.css";

vi.mock("@xyflow/react", () => ({
  ReactFlow: ({
    onInit,
  }: {
    onInit: (instance: ReactFlowInstance) => void;
  }) => {
    const mockInstance = {
      fitView: vi.fn(),
    } as unknown as ReactFlowInstance;
    onInit(mockInstance);
    return <div data-testid="reactflow-mock" />;
  },
  getNodesBounds: () => ({ width: 100, height: 100 }),
}));

vi.mock("../../lib/components/workflow/TasksTable", () => ({
  __esModule: true,
  default: () => <div data-testid="taskstable-mock" />,
}));

vi.mock("../../lib/components/workflow/TasksFlowUtils", () => ({
  applyDagreLayout: (nodes: Node, edges: Edge) => ({ nodes, edges }),
  buildTaskTree: (tasks: Task[]) => tasks,
  generateNodesAndEdges: () => ({}),
}));

describe("TasksFlow", () => {
  it("should render Graph when there is no overflow", () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
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

    render(
      <TasksFlow
        workflowName="mockWorkflowA"
        isDynamic={true}
        onNavigate={() => {}}
      />,
    );
    expect(screen.getByTestId("reactflow-mock")).toBeInTheDocument();
    expect(screen.queryByTestId("taskstable-mock")).not.toBeInTheDocument();
  });

  it("should render TasksTable when there is overflow", () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
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

    render(
      <TasksFlow
        workflowName="mockWorkflowA"
        isDynamic={true}
        onNavigate={() => {}}
      />,
    );
    expect(screen.getByTestId("taskstable-mock")).toBeInTheDocument();
    expect(screen.queryByTestId("reactflow-mock")).not.toBeInTheDocument();
  });

  it("should clean up event listeners on unmount", () => {
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

    const { unmount } = render(
      <TasksFlow
        workflowName="mockWorkflowA"
        isDynamic={true}
        onNavigate={() => {}}
      />,
    );
    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "resize",
      expect.any(Function),
    );
  });
});