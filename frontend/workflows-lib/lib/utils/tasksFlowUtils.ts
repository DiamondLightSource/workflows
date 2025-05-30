import dagre from "@dagrejs/dagre";
import { Node, Edge } from "@xyflow/react";
import { Task, TaskNode } from "../types";

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
    if (task.depends && task.depends.length > 0) {
      task.depends.forEach((depId) => {
        taskMap[depId].children?.push(taskMap[task.id]);
      });
    } else {
      roots.push(taskMap[task.id]);
    }
  });

  return roots;
}

export function isRootDag(task: TaskNode){
  return task.stepType === "DAG" && (!task.depends || task.depends.length === 0);
}

export function generateNodesAndEdges(taskNodes: TaskNode[], highlightedTaskName?: string): {
  nodes: Node[];
  edges: Edge[];
} {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const traverse = (tasks: TaskNode[], parents: string[] = []) => {
    const sortedTasks = [...tasks].sort((a, b) => a.name.localeCompare(b.name));
    sortedTasks.forEach((task) => {
      if (!nodes.some((existingNode) => existingNode.id === task.id) && !isRootDag(task)) {
        nodes.push({
          id: task.id,
          type: "custom",
          data: {
            label: task.name,
            status: task.status,
            details: task.artifacts,
            workflow: task.workflow,
            instrumentSession: task.instrumentSession,
            highlighted: task.name === highlightedTaskName,
          },
          position: { x: 0, y: 0 },
        });
      }
      parents.forEach((parent) => {
        const edge = {
          id: `e${parent}-${task.id}`,
          source: parent,
          target: task.id,
          animated: true,
        };

        if (!edges.some((existingEdge) => existingEdge.id === edge.id)) {
          edges.push(edge);
        }
      });

      if (task.children && task.children.length > 0) {
        traverse(task.children, [task.id]);
      }
    });
  };

  traverse(taskNodes);
  return { nodes, edges };
}
