import { act, render, renderHook } from "@testing-library/react";
import "@testing-library/jest-dom";
import TasksFlow from "../../lib/components/TasksFlow";
import { ReactFlow } from "@xyflow/react";
import * as workflowsLib from "workflows-lib";

vi.mock("@xyflow/react", () => ({
  ReactFlow: vi.fn(() => <div>ReactFlow Mock</div>),
}));

vi.mock("relay-workflows-lib/lib/utils/workflowRelayUtils", () => ({
  useFetchedTasks: vi.fn(() => workflowsLib.mockTasks),
}));

describe("TasksFlow Component", () => {
  const mockNodes = [{ id: "node-1", position: { x: 0, y: 0 }, data: {} }];

  const mockEdges = [{ id: "edge-1", source: "node-1", target: "node-2" }];

  const mockLayoutedNodes = [
    { id: "node-1", position: { x: 0, y: 0 }, data: {} },
  ];

  const mockLayoutedEdges = [
    { id: "edge-1", source: "node-1", target: "node-2" },
  ];

  const buildTaskTreeSpy = vi
    .spyOn(workflowsLib, "buildTaskTree")
    .mockReturnValue([]);

  const generateNodesAndEdgesSpy = vi
    .spyOn(workflowsLib, "generateNodesAndEdges")
    .mockReturnValue({
      nodes: mockNodes,
      edges: mockEdges,
    });

  const applyDagreLayoutSpy = vi
    .spyOn(workflowsLib, "applyDagreLayout")
    .mockReturnValue({
      nodes: mockLayoutedNodes,
      edges: mockLayoutedEdges,
    });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should render without crashing", () => {
    const { getByText } = render(
      <TasksFlow workflowId="mockWorkflowA" onNavigate={() => {}} />,
    );

    expect(getByText("ReactFlow Mock")).toBeInTheDocument();
  });

  it("should build the task tree", () => {
    render(<TasksFlow workflowId="mockWorkflowA" onNavigate={() => {}} />);

    expect(buildTaskTreeSpy).toHaveBeenCalledWith(workflowsLib.mockTasks);
  });

  it("should generate nodes and edges based on the task tree", () => {
    render(
      <TasksFlow
        workflowId="mockWorkflowA"
        highlightedTaskIds={["node-1"]}
        onNavigate={() => {}}
      />,
    );

    expect(generateNodesAndEdgesSpy).toHaveBeenCalledWith([]);
  });

  it("should apply the dagre layout", () => {
    render(<TasksFlow workflowId="mockWorkflowA" onNavigate={() => {}} />);

    expect(applyDagreLayoutSpy).toHaveBeenCalledWith(mockNodes, mockEdges);
  });

  it("should initialize ReactFlow with the correct nodes and edges", () => {
    render(<TasksFlow workflowId="mockWorkflowA" onNavigate={() => {}} />);

    expect(ReactFlow).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultViewport: {
          x: 0,
          y: 0,
          zoom: 1.5,
        },
        nodes: [
          {
            id: "node-1",
            position: { x: 0, y: 0 },
            data: {
              filled: true,
              highlighted: false,
            },
          },
        ],
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
    const { result } = renderHook(() =>
      workflowsLib.usePersistentViewport("testWorkflowA"),
    );

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

    const { result } = renderHook(() =>
      workflowsLib.usePersistentViewport("testWorkflowB"),
    );

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

    const { result } = renderHook(() =>
      workflowsLib.usePersistentViewport("testWorkflowC"),
    );

    act(() => {
      result.current.clearViewport();
    });

    expect(sessionStorage.getItem("testWorkflowCViewport")).toBeNull();
  });
});
