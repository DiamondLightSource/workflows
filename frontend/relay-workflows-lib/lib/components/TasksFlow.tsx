import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import { Box, IconButton, Tooltip } from "@mui/material";
import { AspectRatio } from "@mui/icons-material";
import { ReactFlow, ReactFlowInstance, Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { TaskFlowNodeData } from "workflows-lib";

import {
  TaskFlowNode,
  addHighlightsAndFills,
  applyDagreLayout,
  buildTaskTree,
  generateNodesAndEdges,
} from "workflows-lib";

import { useFetchedTasks } from "../utils/workflowRelayUtils";
import { WorkflowTasksFragment$key } from "../graphql/__generated__/WorkflowTasksFragment.graphql";

interface TasksFlowProps {
  workflowName: string;
  tasksRef?: WorkflowTasksFragment$key | null;
  onNavigate: (path: string, e?: React.MouseEvent) => void;
  highlightedTaskIds?: string[];
  filledTaskId?: string | null;
  onSelectTask?: (taskId: string) => void;
}

const TasksFlow: React.FC<TasksFlowProps> = ({
  tasksRef,
  onNavigate,
  highlightedTaskIds,
  filledTaskId,
  onSelectTask,
}) => {
  const tasks = useFetchedTasks(tasksRef ?? null);

  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);

  // Keep the latest callbacks in refs.
  const onNavigateRef = useRef(onNavigate);
  const onSelectTaskRef = useRef(onSelectTask);

  useEffect(() => {
    onNavigateRef.current = onNavigate;
  }, [onNavigate]);

  useEffect(() => {
    onSelectTaskRef.current = onSelectTask;
  }, [onSelectTask]);

  // Stable nodeTypes object.
  const nodeTypes = useMemo(
    () => ({
      custom: (props: { data: TaskFlowNodeData }) => (
        <TaskFlowNode
          {...props}
          onNavigate={(...args) => onNavigateRef.current(...args)}
          onSelectTask={(id) => onSelectTaskRef.current?.(id)}
        />
      ),
    }),
    [],
  );

  const taskTree = useMemo(() => buildTaskTree(tasks), [tasks]);

  const { nodes, edges } = useMemo(
    () => generateNodesAndEdges(taskTree),
    [taskTree],
  );

  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(
    () => applyDagreLayout(nodes, edges),
    [nodes, edges],
  );

  const [nodesWithHighlights, setNodesWithHighlights] =
    useState<Node[]>(layoutedNodes);

  useEffect(() => {
    setNodesWithHighlights(
      addHighlightsAndFills(layoutedNodes, highlightedTaskIds, filledTaskId),
    );
  }, [layoutedNodes, highlightedTaskIds, filledTaskId]);

  const onInit = useCallback((instance: ReactFlowInstance) => {
    reactFlowInstance.current = instance;
    instance.fitView();
  }, []);

  return (
    <Box width="100%" height="100%">
      <Tooltip title="Reset View">
        <IconButton onClick={() => reactFlowInstance.current?.fitView()}>
          <AspectRatio />
        </IconButton>
      </Tooltip>

      <ReactFlow
        nodes={nodesWithHighlights}
        edges={layoutedEdges}
        onInit={onInit}
        nodeTypes={nodeTypes}
        fitView
      />
    </Box>
  );
};

export default TasksFlow;