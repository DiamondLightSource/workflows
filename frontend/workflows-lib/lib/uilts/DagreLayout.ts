import dagre from "@dagrejs/dagre";
import { Node, Edge } from "@xyflow/react";

export function applyDagreLayout(
  nodes: Node[],
  edges: Edge[]
): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();

  g.setGraph({
    rankdir: "LR",
    nodesep: 50,
    ranksep: 150,
  });

  g.setDefaultEdgeLabel(() => ({}));

  nodes.forEach((node) => {
    g.setNode(node.id, { width: 100, height: 120 });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  nodes.forEach((node) => {
    const nodeData = g.node(node.id);
    node.position = { x: nodeData.x || 0, y: nodeData.y || 0 };
  });

  return { nodes, edges };
}
