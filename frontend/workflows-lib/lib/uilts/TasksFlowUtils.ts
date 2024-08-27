import dagre from "@dagrejs/dagre";
import { Node, Edge } from "@xyflow/react";
import { Task, TaskNode } from "../types";

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

export function buildTaskTree(tasks: Task[]): TaskNode[] {
  const taskMap: { [key: string]: TaskNode } = {};
  const roots: TaskNode[] = [];

  tasks.forEach((task) => {
    taskMap[task.name] = { ...task, children: [] };
  });

  tasks.forEach((task) => {
    if (task.depends) {
      taskMap[task.depends].children?.push(taskMap[task.name]);
    } else {
      roots.push(taskMap[task.name]);
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

  const traverse = (tasks: TaskNode[], parent?: string) => {
    tasks.forEach((task) => {
      nodes.push({
        id: task.name,
        type: "custom",
        data: { label: task.name, status: task.status },
        position: { x: 0, y: 0 },
      });

      if (parent) {
        edges.push({
          id: `e${parent}-${task.name}`,
          source: parent,
          target: task.name,
          animated: true,
        });
      }

      if (task.children && task.children.length > 0) {
        traverse(task.children, task.name);
      }
    });
  };

  traverse(taskNodes);
  return { nodes, edges };
}
