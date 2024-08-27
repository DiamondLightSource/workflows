import { render } from "@testing-library/react";
import TasksFlow from "../../lib/components/workflow/TasksFlow";
import {
  applyDagreLayout,
  buildTaskTree,
  generateNodesAndEdges,
} from "../../lib/uilts/TasksFlowUtils";
import { ReactFlow } from "@xyflow/react";
import "@testing-library/jest-dom";

jest.mock("../../lib/uilts/TasksFlowUtils", () => ({
  applyDagreLayout: jest.fn(),
  buildTaskTree: jest.fn(),
  generateNodesAndEdges: jest.fn(),
}));

jest.mock("@xyflow/react", () => ({
  ReactFlow: jest.fn(() => <div>ReactFlow Mock</div>),
}));

jest.mock("../../lib/components/workflow/CustomNode", () =>
  jest.fn(() => <div>CustomNode Mock</div>)
);

describe("TasksFlow Component", () => {
  const mockTasks = [
    { name: "task-1", workflow: "w1", status: "pending" },
    {
      name: "task-2",
      workflow: "w1",
      status: "completed",
      depends: "task-1",
    },
    { name: "task-3", workflow: "w1", status: "in-progress" },
  ];

  const mockTaskTree = {};
  const mockNodes = [{}];
  const mockEdges = [{}];
  const mockLayoutedNodes = [{}];
  const mockLayoutedEdges = [{}];

  beforeEach(() => {
    (buildTaskTree as jest.Mock).mockReturnValue(mockTaskTree);
    (generateNodesAndEdges as jest.Mock).mockReturnValue({
      nodes: mockNodes,
      edges: mockEdges,
    });
    (applyDagreLayout as jest.Mock).mockReturnValue({
      nodes: mockLayoutedNodes,
      edges: mockLayoutedEdges,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should render without crashing", () => {
    const { getByText } = render(<TasksFlow tasks={mockTasks} />);
    expect(getByText("ReactFlow Mock")).toBeInTheDocument();
  });

  it("should build the task tree", () => {
    render(<TasksFlow tasks={mockTasks} />);

    expect(buildTaskTree).toHaveBeenCalledWith(mockTasks);
  });

  it("should generate nodes and edges based on the task tree", () => {
    render(<TasksFlow tasks={mockTasks} />);

    expect(generateNodesAndEdges).toHaveBeenCalledWith(mockTaskTree);
  });

  it("should apply the dagre layout", () => {
    render(<TasksFlow tasks={mockTasks} />);

    expect(applyDagreLayout).toHaveBeenCalledWith(mockNodes, mockEdges);
  });

  it("should initialize ReactFlow with the correct nodes and edges", () => {
    render(<TasksFlow tasks={mockTasks} />);

    expect(ReactFlow).toHaveBeenCalledWith(
      expect.objectContaining({
        nodes: mockLayoutedNodes,
        edges: mockLayoutedEdges,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        nodeTypes: expect.objectContaining({ custom: expect.any(Function) }),
        nodesDraggable: false,
        nodesConnectable: false,
        elementsSelectable: false,
        zoomOnScroll: false,
        zoomOnPinch: false,
        zoomOnDoubleClick: false,
        panOnDrag: false,
        preventScrolling: false,
        style: { width: "100%", height: "100%" },
      }),
      {}
    );
  });
});
