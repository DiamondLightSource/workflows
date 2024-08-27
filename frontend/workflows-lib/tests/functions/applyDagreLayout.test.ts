import { applyDagreLayout } from "../../lib/uilts/TasksFlowUtils";
import { Node, Edge } from "@xyflow/react";

jest.mock("@dagrejs/dagre", () => ({
  graphlib: {
    Graph: jest.fn().mockImplementation(() => ({
      setGraph: jest.fn(),
      setDefaultEdgeLabel: jest.fn(),
      setNode: jest.fn(),
      setEdge: jest.fn(),
      node: jest.fn().mockReturnValue({ x: 100, y: 200 }),
    })),
  },
  layout: jest.fn(),
}));

describe("applyDagreLayout", () => {
  it("should apply layout to nodes and edges correctly", () => {
    const nodes: Node[] = [
      {
        id: "task-1",
        type: "custom",
        data: { label: "task-1", status: "pending" },
        position: { x: 0, y: 0 },
      },
      {
        id: "task-2",
        type: "custom",
        data: { label: "task-2", status: "completed" },
        position: { x: 0, y: 0 },
      },
    ];
    const edges: Edge[] = [
      {
        id: "etask-1-task-2",
        source: "task-1",
        target: "task-2",
        animated: true,
      },
    ];

    const { nodes: layoutedNodes, edges: layoutedEdges } = applyDagreLayout(
      nodes,
      edges
    );

    expect(layoutedNodes).toEqual([
      {
        id: "task-1",
        type: "custom",
        data: { label: "task-1", status: "pending" },
        position: { x: 100, y: 200 },
      },
      {
        id: "task-2",
        type: "custom",
        data: { label: "task-2", status: "completed" },
        position: { x: 100, y: 200 },
      },
    ]);

    expect(layoutedEdges).toEqual(edges);
  });
});
