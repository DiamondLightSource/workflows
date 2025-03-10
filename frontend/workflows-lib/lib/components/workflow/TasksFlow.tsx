import React, { useRef, useCallback, useEffect, useState } from "react";
import { Box } from "@mui/material";
import {
  ReactFlow,
  ReactFlowInstance,
  Node,
  Edge,
  getNodesBounds,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import TaskFlowNode from "./TasksFlowNode";
import {
  applyDagreLayout,
  buildTaskTree,
  generateNodesAndEdges,
} from "./TasksFlowUtils";
import { Task } from "../../types";
import TasksTable from "./TasksTable";

const nodeTypes = {
  custom: TaskFlowNode,
};

const defaultViewport = { x: 0, y: 0, zoom: 1.5 };

interface TasksFlowProps {
  tasks: Task[];
  isDynamic?: boolean;
}

const TasksFlow: React.FC<TasksFlowProps> = ({ tasks, isDynamic }) => {
  const taskTree = buildTaskTree(tasks);
  const { nodes, edges } = generateNodesAndEdges(taskTree);
  const { nodes: layoutedNodes, edges: layoutedEdges } = applyDagreLayout(
    nodes,
    edges
  );

  const reactFlowInstance = useRef<ReactFlowInstance<Node, Edge> | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isOverflow, setIsOverflow] = useState(false);

  const onInit = useCallback((instance: ReactFlowInstance<Node, Edge>) => {
    reactFlowInstance.current = instance;
    void instance.fitView();
  }, []);

  useEffect(() => {
    const fitWindowResize = () => {
      if (reactFlowInstance.current) {
        void reactFlowInstance.current.fitView();
      }
    };

    const checkOverflow = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        const boundingBox = getNodesBounds(layoutedNodes);
        setIsOverflow(boundingBox.width > width || boundingBox.height > height);
      }
    };

    const handleResizeAndOverflow = () => {
      fitWindowResize();
      checkOverflow();
    };

    const resizeObserver = new ResizeObserver(handleResizeAndOverflow);
    const currentContainerRef = containerRef.current;

    if (currentContainerRef) {
      resizeObserver.observe(currentContainerRef);
    }
    handleResizeAndOverflow();
    window.addEventListener("resize", handleResizeAndOverflow);

    return () => {
      if (currentContainerRef) {
        resizeObserver.unobserve(currentContainerRef);
      }
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleResizeAndOverflow);
    };
  }, [layoutedNodes, layoutedEdges]);

  return (
    <Box ref={containerRef} display="flex" height="100%" width="100%">
      {isDynamic && isOverflow ? (
        <TasksTable tasks={tasks} />
      ) : (
        <ReactFlow
          onInit={onInit}
          nodes={layoutedNodes}
          edges={layoutedEdges}
          nodeTypes={nodeTypes}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={true}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          panOnDrag={true}
          preventScrolling={false}
          defaultViewport={defaultViewport}
          fitView={true}
          style={{ width: "100%", height: "100%", overflow: "auto" }}
        />
      )}
    </Box>
  );
};

export default TasksFlow;
