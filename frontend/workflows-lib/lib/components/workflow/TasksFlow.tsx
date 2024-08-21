import { Box } from "@mui/material";
import { ReactFlow } from "@xyflow/react";
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

interface TasksFlowProps {
  tasks: Task[];
}

const TasksFlow: React.FC<TasksFlowProps> = ({ tasks }) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const taskTree = buildTaskTree(tasks);

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
