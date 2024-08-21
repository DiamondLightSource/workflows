import { Box } from "@mui/material";
import { ReactFlow } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import React from "react";
import { Task } from "../../types";

interface TasksFlowProps {
  tasks: Task[];
}

const TasksFlow: React.FC<TasksFlowProps> = () => {
  return (
    <Box display="flex" height="50vh" width="100%">
      <ReactFlow
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
