import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import TasksFlow from "../../lib/components/workflow/TasksFlow";
import {
  applyDagreLayout,
  buildTaskTree,
  generateNodesAndEdges,
} from "../../lib/components/workflow/TasksFlowUtils";
import { ReactFlow } from "@xyflow/react";
import { mockTasks } from "./data";

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

  const mockTaskTree = vi.hoisted(() => ({}));
  const mockNodes = vi.hoisted(() => [
    { id: "node-1", position: { x: 0, y: 0 }, data: {} },
  ]);
  const mockEdges = vi.hoisted(() => [
    { id: "edge-1", source: "node-1", target: "node-2" },
  ]);
  const mockLayoutedNodes = vi.hoisted(() => [
    { id: "node-1", position: { x: 0, y: 0 }, data: {} },
  ]);
  const mockLayoutedEdges = vi.hoisted(() => [
    { id: "edge-1", source: "node-1", target: "node-2" },
  ]);

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
    const { getByText } = render(
      <TasksFlow tasks={mockTasks} onNavigate={() => {}} />
    );
    expect(getByText("ReactFlow Mock")).toBeInTheDocument();
  });

  it("should build the task tree", () => {
    render(<TasksFlow tasks={mockTasks} onNavigate={() => {}} />);

    expect(buildTaskTree).toHaveBeenCalledWith(mockTasks);
  });

  it("should generate nodes and edges based on the task tree", () => {
    render(<TasksFlow tasks={mockTasks} onNavigate={() => {}} />);

    expect(generateNodesAndEdges).toHaveBeenCalledWith(mockTaskTree);
  });

  it("should apply the dagre layout", () => {
    render(<TasksFlow tasks={mockTasks} onNavigate={() => {}} />);

    expect(applyDagreLayout).toHaveBeenCalledWith(mockNodes, mockEdges);
  });

  it("should initialize ReactFlow with the correct nodes and edges", () => {
    render(<TasksFlow tasks={mockTasks} onNavigate={() => {}} />);

    expect(ReactFlow).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultViewport: {
          x: 0,
          y: 0,
          zoom: 1.5,
        },
        nodes: mockLayoutedNodes,
        edges: mockLayoutedEdges,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        nodeTypes: expect.objectContaining({ custom: expect.any(Function) }),
        nodesDraggable: false,
        nodesConnectable: false,
        elementsSelectable: true,
        zoomOnScroll: false,
        zoomOnPinch: false,
        zoomOnDoubleClick: false,
        panOnDrag: false,
        preventScrolling: false,
        fitView: true,
        style: { width: "100%", overflow: "auto", height: "100%" },
      }),
      {}
    );
  });
});
