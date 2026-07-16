import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Box, IconButton, Tooltip } from "@mui/material";

import { AspectRatio } from "@mui/icons-material";

import {
  ReactFlow,
  ReactFlowInstance,
  Node,
  NodeMouseHandler,
} from "@xyflow/react";

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
  onNavigate: (
    taskId: string,
    taskLabel?: string,
    e?: React.MouseEvent,
  ) => void;
  highlightedTaskIds?: string[];
  filledTaskId?: string | null;
  onSelectTask?: (taskId: string, taskLabel?: string) => void;
  onTaskLabelsChange?: (labels: Record<string, string>) => void;
}

const TasksFlow = ({
  tasksRef,
  onNavigate,
  highlightedTaskIds,
  filledTaskId,
  onSelectTask,
  onTaskLabelsChange,
}: TasksFlowProps) => {
  const tasks = useFetchedTasks(tasksRef ?? null);

  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);

  const nodeTypes = useMemo(
    () => ({
      custom: (props: { data: TaskFlowNodeData }) => (
        <TaskFlowNode
          {...props}
          onNavigate={onNavigate}
          onSelectTask={onSelectTask}
        />
      ),
    }),
    [onNavigate, onSelectTask],
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

  useEffect(() => {
    if (!onTaskLabelsChange) {
      return;
    }

    const labels: Record<string, string> = {};

    layoutedNodes.forEach((node) => {
      const data = node.data as TaskFlowNodeData;

      labels[node.id] = data.label ?? node.id;
    });

    onTaskLabelsChange(labels);
  }, [layoutedNodes, onTaskLabelsChange]);

  const onInit = useCallback((instance: ReactFlowInstance) => {
    reactFlowInstance.current = instance;

    instance.fitView();
  }, []);

  const handleNodeClick: NodeMouseHandler = useCallback(
    (event, node) => {
      console.log("[TasksFlow] node clicked:", node.id, node.data);

      const data = node.data as TaskFlowNodeData;

      const label = data.label ?? node.id;

      onNavigate(node.id, label, event as React.MouseEvent);
    },
    [onNavigate],
  );

  return (
    <Box width="100%" height="100%">
      <Tooltip title="Reset View">
        <IconButton
          onClick={() => {
            reactFlowInstance.current?.fitView();
          }}
        >
          <AspectRatio />
        </IconButton>
      </Tooltip>

      <ReactFlow
        nodes={nodesWithHighlights}
        edges={layoutedEdges}
        onInit={onInit}
        nodeTypes={nodeTypes}
        fitView
        onNodeClick={handleNodeClick}
      />
    </Box>
  );
};

export default TasksFlow;
