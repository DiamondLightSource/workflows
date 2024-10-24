import { applyDagreLayout } from "../../lib/components/workflow/TasksFlowUtils";
import { Node, Edge } from "@xyflow/react";

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
        position: { x: 50, y: 60 },
      },
      {
        id: "task-2",
        type: "custom",
        data: { label: "task-2", status: "completed" },
        position: { x: 300, y: 60 },
      },
    ]);

    expect(layoutedEdges).toEqual(edges);
  });
});
