import { Box } from "@mui/material";
import { ReactFlow, Node, Edge, ReactFlowInstance } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import React, { useCallback, useMemo, useRef } from "react";
import CustomNode from "./CustomNode";
import { applyDagreLayout } from "../../uilts/DagreLayout";

interface Task {
  name: string;
  workflow: string;
  status: string;
  depends?: string;
}

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
        type: "custom",
        data: { label: task.name, status: task.status },
        position: { x: 0, y: 0 },
      });

      if (parentId) {
        edges.push({
          id: `e${parentId}-${task.name}`,
          source: parentId,
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
};

const nodeTypes = {
  custom: CustomNode,
};

interface TasksFlowProps {
  tasks: Task[];
}

const TasksFlow: React.FC<TasksFlowProps> = ({ tasks }) => {
  const taskTree = useMemo(() => buildTaskTree(tasks), [tasks]);
  const { nodes, edges } = useMemo(
    () => generateNodesAndEdges(taskTree),
    [taskTree]
  );
  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(
    () => applyDagreLayout(nodes, edges),
    [nodes, edges]
  );

  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);

  const onInit = useCallback((instance: ReactFlowInstance) => {
    reactFlowInstance.current = instance;
    void instance.fitView();
  }, []);

  return (
    <Box display="flex" height="100vh" width="100%">
      <ReactFlow
        onInit={onInit}
        nodes={layoutedNodes}
        edges={layoutedEdges}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        panOnDrag={false}
        preventScrolling={false}
        style={{ width: "100%", height: "100%" }}
      />
    </Box>
  );
};

export default TasksFlow;
