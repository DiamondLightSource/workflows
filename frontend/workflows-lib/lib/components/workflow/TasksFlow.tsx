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
import TaskFlowNode, { TaskFlowNodeData } from "./TasksFlowNode";
import TasksTable from "./TasksTable";
import {
  applyDagreLayout,
  buildTaskTree,
  generateNodesAndEdges,
  usePersistentViewport,
} from "../../utils/tasksFlowUtils";
import { Task } from "../../types";

const defaultViewport = { x: 0, y: 0, zoom: 1.5 };

interface TasksFlowProps {
  workflowName: string;
  tasks: Task[];
  highlightedTaskName?: string;
  onNavigate: (s: string) => void;
  isDynamic?: boolean;
}

const TasksFlow: React.FC<TasksFlowProps> = ({
  workflowName,
  tasks,
  highlightedTaskName,
  onNavigate,
  isDynamic,
}) => {
  const previousTaskCount = useRef<number>(tasks.length);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const nodeTypes = {
    custom: (props: { data: TaskFlowNodeData }) => (
      <TaskFlowNode onNavigate={onNavigate} {...props} />
    ),
  };
  const taskTree = useMemo(() => buildTaskTree(tasks), [tasks]);
  const { nodes, edges } = useMemo(
    () => generateNodesAndEdges(taskTree, highlightedTaskName),
    [taskTree, highlightedTaskName],
  );
  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(
    () => applyDagreLayout(nodes, edges),
    [nodes, edges],
  );

  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isOverflow, setIsOverflow] = useState(false);

  const { saveViewport, loadViewport, clearViewport } =
    usePersistentViewport(workflowName);

  const onViewportChangeEnd = useCallback(
    (viewport: Viewport) => {
      saveViewport(viewport);
    },
    [saveViewport],
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

  const resetView = () => {
    clearViewport();
    void reactFlowInstance.current?.fitView();
  };

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
  }, [tasks.length]);

  useEffect(() => {
    const handleResizeAndOverflow = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        const boundingBox = getNodesBounds(layoutedNodes);
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
          fitView={false}
          style={{ width: "100%", height: "100%", overflow: "auto" }}
        />
      )}
    </Box>
  );
};

export default TasksFlow;
