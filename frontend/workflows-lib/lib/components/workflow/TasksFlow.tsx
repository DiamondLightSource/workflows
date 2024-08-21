import { Box } from "@mui/material";
import { ReactFlow, Node, Edge } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import React from "react";
import { Task } from "../../types";

interface TaskNode extends Task {
  children?: TaskNode[];
}

const buildTaskTree = (tasks: Task[]): TaskNode[] => {
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
};

const generateNodesAndEdges = (
  taskNodes: TaskNode[]
): { nodes: Node[]; edges: Edge[] } => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const traverse = (tasks: TaskNode[], parentId?: string) => {
    tasks.forEach((task) => {
      nodes.push({
        id: task.name,
        type: "default",
        data: { label: task.name, status: task.status },
        position: { x: 0, y: 0 },
      });

      if (parentId) {
        edges.push({
          id: `e${parentId}-${task.name}`,
          source: parentId,
          target: task.name,
          type: "smoothstep",
        });
      }

      if (task.children && task.children.length > 0) {
        traverse(task.children, task.name);
      }
    });
  };

  traverse(taskNodes);
  return { nodes, edges };
};

interface TasksFlowProps {
  tasks: Task[];
}

const TasksFlow: React.FC<TasksFlowProps> = ({ tasks }) => {
  const taskTree = buildTaskTree(tasks);
  const { nodes, edges } = generateNodesAndEdges(taskTree);

  return (
    <Box display="flex" height="100vh" width="100%">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        panOnDrag={false}
        preventScrolling={false}
        style={{ width: "100%", height: "100%" }}
      ></ReactFlow>
    </Box>
  );
};

export default TasksFlow;
