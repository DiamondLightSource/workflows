import { render } from "@testing-library/react";
import TasksFlow from "../lib/components/workflow/TasksFlow";
import { applyDagreLayout } from "../lib/uilts/DagreLayout";
import { ReactFlow } from "@xyflow/react";
import "@testing-library/jest-dom";

jest.mock("../lib/uilts/DagreLayout", () => ({
  applyDagreLayout: jest.fn(),
}));

jest.mock("@xyflow/react", () => ({
  ReactFlow: jest.fn(() => <div>ReactFlow Mock</div>),
}));

jest.mock("../lib/components/workflow/CustomNode", () =>
  jest.fn(() => <div>CustomNode Mock</div>)
);

describe("TasksFlow Component", () => {
  const mockTasks = [
    { id: "1", name: "Task 1", workflow_id: "w1", status: "pending" },
    {
      id: "2",
      name: "Task 2",
      workflow_id: "w1",
      status: "completed",
      depends: "1",
    },
    { id: "3", name: "Task 3", workflow_id: "w1", status: "in-progress" },
  ];

  const mockNodes = [
    {
      id: "1",
      type: "custom",
      data: { label: "Task 1", status: "pending" },
      position: { x: 0, y: 0 },
    },
    {
      id: "2",
      type: "custom",
      data: { label: "Task 2", status: "completed" },
      position: { x: 0, y: 0 },
    },
    {
      id: "3",
      type: "custom",
      data: { label: "Task 3", status: "in-progress" },
      position: { x: 0, y: 0 },
    },
  ];

  const mockEdges = [{ id: "e1-2", source: "1", target: "2", animated: true }];

  const layoutedNodes = mockNodes.map((node) => ({
    ...node,
    position: { x: Math.random() * 100, y: Math.random() * 100 },
  }));
  const layoutedEdges = [...mockEdges];

  beforeEach(() => {
    (applyDagreLayout as jest.Mock).mockReturnValue({
      nodes: layoutedNodes,
      edges: layoutedEdges,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should render ReactFlow with the correct props", () => {
    const { getByText } = render(<TasksFlow tasks={mockTasks} />);

    expect(applyDagreLayout).toHaveBeenCalledWith(mockNodes, mockEdges);
    expect(ReactFlow).toHaveBeenCalledWith(
      expect.objectContaining({
        nodes: layoutedNodes,
        edges: layoutedEdges,
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

    expect(getByText("ReactFlow Mock")).toBeInTheDocument();
  });
});
