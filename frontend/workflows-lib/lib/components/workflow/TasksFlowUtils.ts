import dagre from "@dagrejs/dagre";
import { Node, Edge } from "@xyflow/react";
import { Task, TaskNode } from "../../types";

export function applyDagreLayout(
  nodes: Node[],
  edges: Edge[]
): { nodes: Node[]; edges: Edge[] } {
  const graph = new dagre.graphlib.Graph();

  graph.setGraph({
    rankdir: "LR",
    nodesep: 50,
    ranksep: 150,
  });

  graph.setDefaultEdgeLabel(() => ({}));

  nodes.forEach((node) => {
    graph.setNode(node.id, { width: 100, height: 120 });
  });

  edges.forEach((edge) => {
    graph.setEdge(edge.source, edge.target);
  });

  dagre.layout(graph);

  nodes.forEach((node) => {
    const nodeData = graph.node(node.id);
    node.position = { x: nodeData.x || 0, y: nodeData.y || 0 };
  });

  return { nodes, edges };
}

export function buildTaskTree(tasks: Task[]): TaskNode[] {
  const taskMap: { [key: string]: TaskNode } = {};
  const roots: TaskNode[] = [];

  tasks.forEach((task) => {
    taskMap[task.id] = { ...task, children: [] };
  });

  tasks.forEach((task) => {
    if (task.depends && task.depends?.length > 0) {
      task.depends.forEach((depId) => {
        taskMap[depId].children?.push(taskMap[task.id]);
      });
    } else {
      roots.push(taskMap[task.id]);
    }
  });

  return roots;
}

export function generateNodesAndEdges(taskNodes: TaskNode[]): {
  nodes: Node[];
  edges: Edge[];
} {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const edgeSet = new Set<string>();

  const traverse = (tasks: TaskNode[], parents: string[] = []) => {
    tasks.forEach((task) => {
      const uniqueTaskId = `${task.id}-${task.name}`;
      nodes.push({
        id: uniqueTaskId,
        type: "custom",
        data: { label: task.name, status: task.status },
        position: { x: 0, y: 0 },
      });

      parents.forEach((parent) => {
        const edgeId = `e${parent}-${uniqueTaskId}`;
        if (!edgeSet.has(edgeId)) {
          edges.push({
            id: edgeId,
            source: parent,
            target: uniqueTaskId,
            animated: true,
          });
          edgeSet.add(edgeId);
        }
      });

      if (task.children && task.children.length > 0) {
        traverse(task.children, [uniqueTaskId]);
      }
    });
  };

  traverse(taskNodes);
  return { nodes, edges };
}
