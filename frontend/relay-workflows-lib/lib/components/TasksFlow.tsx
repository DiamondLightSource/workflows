import React, {
  useRef,
  useCallback,
  useEffect,
  useState,
  useMemo,
} from "react";
import { Box, IconButton, Tooltip } from "@mui/material";
import { AspectRatio } from "@mui/icons-material";
import {
  ReactFlow,
  ReactFlowInstance,
  Viewport,
  getNodesBounds,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  TaskFlowNode,
  TaskFlowNodeData,
  TasksTable,
  addHighlightsAndFills,
  applyDagreLayout,
  buildTaskTree,
  generateNodesAndEdges,
  usePersistentViewport,
} from "workflows-lib";
import { useFetchedTasks } from "relay-workflows-lib/lib/utils/workflowRelayUtils";
import { WorkflowTasksFragment$key } from "../graphql/__generated__/WorkflowTasksFragment.graphql";

const defaultViewport = { x: 0, y: 0, zoom: 1.5 };

interface TasksFlowProps {
  workflowId: string;
  tasksRef?: WorkflowTasksFragment$key | null;
  onNavigate: (path: string, e?: React.MouseEvent) => void;
  highlightedTaskIds?: string[];
  filledTaskId?: string | null;
  isDynamic?: boolean;
}

const TasksFlow: React.FC<TasksFlowProps> = ({
  workflowId,
  tasksRef,
  onNavigate,
  highlightedTaskIds,
  filledTaskId,
  isDynamic,
}) => {
  const tasks = useFetchedTasks(tasksRef ?? null);

  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isOverflow, setIsOverflow] = useState(false);

  const previousTaskCount = useRef<number>(tasks.length);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  /*
   * Keep the latest onNavigate without making nodeTypes change whenever
   * the parent recreates its callback.
   */
  const onNavigateRef = useRef(onNavigate);

  useEffect(() => {
    onNavigateRef.current = onNavigate;
  }, [onNavigate]);

  /*
   * Keep the node type itself stable.
   *
   * Previously this depended directly on `onNavigate`, which can change
   * whenever the selected task changes. That can cause React Flow to
   * recreate the custom nodes while the user is clicking them.
   */
  const nodeTypes = useMemo(
    () => ({
      custom: (props: { data: TaskFlowNodeData }) => (
        <TaskFlowNode
          {...props}
          onNavigate={(taskId, event) => {
            onNavigateRef.current(taskId, event);
          }}
        />
      ),
    }),
    [],
  );

  const { saveViewport, loadViewport, clearViewport } =
    usePersistentViewport(workflowId);

  const onViewportChangeEnd = useCallback(
    (viewport: Viewport) => {
      saveViewport(viewport);
    },
    [saveViewport],
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

  /*
   * Highlights are derived from the layouted nodes and the current
   * selection, so calculate them directly instead of storing them in
   * state and updating them from an effect.
   */
  const nodesWithHighlights = useMemo(
    () =>
      addHighlightsAndFills(layoutedNodes, highlightedTaskIds, filledTaskId),
    [layoutedNodes, highlightedTaskIds, filledTaskId],
  );

  const hasInitialized = useRef(false);

  const onInit = useCallback(
    (instance: ReactFlowInstance) => {
      reactFlowInstance.current = instance;

      if (!hasInitialized.current) {
        const saved = loadViewport();

        if (saved) {
          void instance.setViewport(saved, { duration: 0 });
        } else {
          void instance.fitView();
        }

        hasInitialized.current = true;
      }
    },
    [loadViewport],
  );

  const resetView = useCallback(() => {
    clearViewport();
    void reactFlowInstance.current?.fitView();
  }, [clearViewport]);

  useEffect(() => {
    const currentCount = tasks.length;

    if (currentCount !== previousTaskCount.current) {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }

      debounceTimeout.current = setTimeout(() => {
        if (reactFlowInstance.current) {
          void reactFlowInstance.current.fitView();
          previousTaskCount.current = currentCount;
        }
      }, 300);
    }

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
        debounceTimeout.current = null;
      }
    };
  }, [tasks.length]);

  useEffect(() => {
    const handleResizeAndOverflow = () => {
      if (containerRef.current && reactFlowInstance.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();

        const nodeLookup = reactFlowInstance.current.getNodes();

        const boundingBox = getNodesBounds(nodeLookup);

        setIsOverflow(boundingBox.width > width || boundingBox.height > height);
      }
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
      <Box
        sx={{
          position: "absolute",
          top: 8,
          right: 8,
          zIndex: 10,
        }}
      >
        <Tooltip title="Reset View">
          <IconButton size="small" onClick={resetView} aria-label="Reset View">
            <AspectRatio fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {isDynamic && isOverflow ? (
        <TasksTable tasks={tasks} />
      ) : (
        <ReactFlow
          onInit={onInit}
          onViewportChange={onViewportChangeEnd}
          nodes={nodesWithHighlights}
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
          style={{
            width: "100%",
            height: "100%",
            overflow: "auto",
          }}
        />
      )}
    </Box>
  );
};

export default TasksFlow;
