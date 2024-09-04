import { Box } from "@mui/material";
import { getNodesBounds, ReactFlow, ReactFlowInstance } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import React, { useCallback, useEffect, useRef, useState } from "react";
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

interface TasksDynamicProps {
  tasks: Task[];
}

const TasksDynamic: React.FC<TasksDynamicProps> = ({ tasks }) => {
  const taskTree = buildTaskTree(tasks);
  const { nodes, edges } = generateNodesAndEdges(taskTree);
  const { nodes: laidoutNodes, edges: laidoutEdges } = applyDagreLayout(
    nodes,
    edges
  );

  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isOverflow, setIsOverflow] = useState(false);

  const onInit = useCallback((instance: ReactFlowInstance) => {
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
        const boundingBox = getNodesBounds(laidoutNodes);
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
  }, [laidoutNodes, laidoutEdges]);

  return (
    <Box ref={containerRef} display="flex" height="100%" width="100%">
      {isOverflow ? (
        <TasksTable tasks={tasks} />
      ) : (
        <ReactFlow
          onInit={onInit}
          nodes={laidoutNodes}
          edges={laidoutEdges}
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
      )}
    </Box>
  );
};

export default TasksDynamic;
