import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import TasksFlow from "../../lib/components/workflow/TasksFlow";
import {
  applyDagreLayout,
  buildTaskTree,
  generateNodesAndEdges,
} from "../../lib/components/workflow/TasksFlowUtils";
import { ReactFlow } from "@xyflow/react";
import { TaskStatus } from "../../lib/types";

describe("TasksFlow Component", () => {
  beforeEach(() => {
    vi.mock(
      "../../lib/components/workflow/TasksFlowNode",
      async (importOriginal) => ({
        ...(await importOriginal()),
        TaskFlowNode: vi.fn().mockReturnValue(<div>CustomNode Mock</div>),
      })
    );
  });

  const mockTasks = vi.hoisted(() => [
    { id: "task-1", name: "task-1", status: "Pending" as TaskStatus },
    {
      id: "task-2",
      name: "task-2",
      status: "Succeeded" as TaskStatus,
      depends: ["task-1"],
    },
    { id: "task-3", name: "task-3", status: "Running" as TaskStatus },
  ]);

  const mockTaskTree = vi.hoisted(() => ({}));
  const mockNodes = vi.hoisted(() => [{}]);
  const mockEdges = vi.hoisted(() => [{}]);
  const mockLayoutedNodes = vi.hoisted(() => [{}]);
  const mockLayoutedEdges = vi.hoisted(() => [{}]);

  beforeEach(() => {
    vi.mock(
      "../../lib/components/workflow/TasksFlowUtils",
      async (importOriginal) => ({
        ...(await importOriginal()),
        buildTaskTree: vi.fn().mockReturnValue(mockTaskTree),
        generateNodesAndEdges: vi.fn().mockReturnValue({
          nodes: mockNodes,
          edges: mockEdges,
        }),
        applyDagreLayout: vi.fn().mockReturnValue({
          nodes: mockLayoutedNodes,
          edges: mockLayoutedEdges,
        }),
      })
    );
  });

  beforeEach(() => {
    vi.mock("@xyflow/react", async (importOriginal) => ({
      ...(await importOriginal()),
      ReactFlow: vi.fn().mockReturnValue(<div>ReactFlow Mock</div>),
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
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
