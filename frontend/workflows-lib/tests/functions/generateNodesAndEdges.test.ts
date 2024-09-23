import { generateNodesAndEdges } from "../../lib/components/workflow/TasksFlowUtils";
import { TaskStatus } from "../../lib/types";

describe("generateNodesAndEdges", () => {
  it("should generate nodes and edges from a task tree", () => {
    const taskTree = [
      {
        id: "task-1",
        name: "task-1",
        status: "Pending" as TaskStatus,
        children: [
          {
            id: "task-2",
            name: "task-2",
            status: "Succeeded" as TaskStatus,
            depends: ["task-1"],
            children: [
              {
                id: "task-4",
                name: "task-4",
                status: "Succeeded" as TaskStatus,
                depends: ["task-2"],
                children: [
                  {
                    id: "task-5",
                    name: "task-5",
                    status: "Succeeded" as TaskStatus,
                    depends: ["task-4"],
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        id: "task-3",
        name: "task-3",
        status: "Running" as TaskStatus,
        children: [],
      },
    ];

    const { nodes, edges } = generateNodesAndEdges(taskTree);

    expect(nodes).toEqual([
      {
        id: "task-1",
        type: "custom",
        data: { label: "task-1", status: "Pending" },
        position: { x: 0, y: 0 },
      },
      {
        id: "task-2",
        type: "custom",
        data: { label: "task-2", status: "Succeeded" },
        position: { x: 0, y: 0 },
      },
      {
        id: "task-4",
        type: "custom",
        data: { label: "task-4", status: "Succeeded" },
        position: { x: 0, y: 0 },
      },
      {
        id: "task-5",
        type: "custom",
        data: { label: "task-5", status: "Succeeded" },
        position: { x: 0, y: 0 },
      },
      {
        id: "task-3",
        type: "custom",
        data: { label: "task-3", status: "Running" },
        position: { x: 0, y: 0 },
      },
    ]);

    expect(edges).toEqual([
      {
        id: "etask-1-task-2",
        source: "task-1",
        target: "task-2",
        animated: true,
      },
      {
        id: "etask-2-task-4",
        source: "task-2",
        target: "task-4",
        animated: true,
      },
      {
        id: "etask-4-task-5",
        source: "task-4",
        target: "task-5",
        animated: true,
      },
    ]);
  });
});
