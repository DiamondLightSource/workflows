import { act, render, renderHook } from "@testing-library/react";
import "@testing-library/jest-dom";
import TasksFlow from "../../lib/components/TasksFlow";
import {
  applyDagreLayout,
  buildTaskTree,
  generateNodesAndEdges,
  usePersistentViewport,
} from "workflows-lib/lib/utils/tasksFlowUtils";
import { ReactFlow } from "@xyflow/react";
import { mockTasks } from "workflows-lib/tests/components/data";

describe("TasksFlow Component", () => {
  beforeEach(() => {
    vi.mock(
      "../../lib/components/workflow/TasksFlowNode",
      async (importOriginal) => ({
        ...(await importOriginal()),
        TaskFlowNode: vi.fn().mockReturnValue(<div>CustomNode Mock</div>),
      }),
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

  vi.mock("relay-workflows-lib/lib/utils/workflowRelayUtils", () => ({
    useFetchedTasks: vi.fn(() => mockTasks),
  }));

  beforeEach(() => {
    vi.mock(
      "workflows-lib/lib/utils/tasksFlowUtils",
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
      }),
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
      <TasksFlow workflowName="mockWorkflowA" onNavigate={() => {}} />,
    );
    expect(getByText("ReactFlow Mock")).toBeInTheDocument();
  });

  it("should build the task tree", () => {
    render(<TasksFlow workflowName="mockWorkflowA" onNavigate={() => {}} />);

    expect(buildTaskTree).toHaveBeenCalledWith(mockTasks);
  });

  it("should generate nodes and edges based on the task tree", () => {
    render(
      <TasksFlow
        workflowName="mockWorkflowA"
        highlightedTaskIds={["node-1"]}
        onNavigate={() => {}}
      />,
    );

    expect(generateNodesAndEdges).toHaveBeenCalledWith(mockTaskTree);
  });

  it("should apply the dagre layout", () => {
    render(<TasksFlow workflowName="mockWorkflowA" onNavigate={() => {}} />);

    expect(applyDagreLayout).toHaveBeenCalledWith(mockNodes, mockEdges);
  });

  it("should initialize ReactFlow with the correct nodes and edges", () => {
    render(<TasksFlow workflowName="mockWorkflowA" onNavigate={() => {}} />);

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
        nodeTypes: { custom: expect.any(Function) },
        nodesDraggable: false,
        nodesConnectable: false,
        elementsSelectable: true,
        zoomOnScroll: false,
        zoomOnPinch: false,
        zoomOnDoubleClick: false,
        panOnDrag: true,
        preventScrolling: false,
        fitView: true,
        style: { width: "100%", overflow: "auto", height: "100%" },
      }),
      {},
    );
  });
});

describe("usePersistentViewport hook tests", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  const mockViewport = { x: 20, y: 30, zoom: 2.5 };

  it("should save viewport to sessionStorage", () => {
    const { result } = renderHook(() => usePersistentViewport("testWorkflowA"));

    act(() => {
      result.current.saveViewport(mockViewport);
    });

    const stored = sessionStorage.getItem("testWorkflowAViewport");
    expect(stored).toBe(JSON.stringify(mockViewport));
  });

  it("loads viewport from sessionStorage", () => {
    sessionStorage.setItem(
      "testWorkflowBViewport",
      JSON.stringify(mockViewport),
    );

    const { result } = renderHook(() => usePersistentViewport("testWorkflowB"));

    let loadedViewport;
    act(() => {
      loadedViewport = result.current.loadViewport();
    });

    expect(loadedViewport).toEqual(mockViewport);
  });

  it("clears viewport from sessionStorage", () => {
    sessionStorage.setItem(
      "testWorkflowCViewport",
      JSON.stringify(mockViewport),
    );

    const { result } = renderHook(() => usePersistentViewport("testWorkflowC"));

    act(() => {
      result.current.clearViewport();
    });

    expect(sessionStorage.getItem("testWorkflowCViewport")).toBeNull();
  });
});
