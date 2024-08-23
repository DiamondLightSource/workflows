import { Box } from "@mui/material";
import { ReactFlow, ReactFlowInstance } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import React, { useCallback, useMemo, useRef } from "react";
import CustomNode from "./CustomNode";
import {
  applyDagreLayout,
  buildTaskTree,
  generateNodesAndEdges,
} from "../../uilts/TasksFlowUtils";
import { Task } from "../../types";

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
