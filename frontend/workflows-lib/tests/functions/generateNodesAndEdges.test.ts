import { generateNodesAndEdges } from "../../lib/components/workflow/TasksFlowUtils";

describe("generateNodesAndEdges", () => {
  it("should generate nodes and edges from a task tree", () => {
    const taskTree = [
      {
        name: "task-1",
        workflow: "w1",
        status: "pending",
        children: [
          {
            name: "task-2",
            workflow: "w1",
            status: "completed",
            depends: "task-1",
            children: [
              {
                name: "task-4",
                workflow: "w1",
                status: "completed",
                depends: "task-2",
                children: [
                  {
                    name: "task-5",
                    workflow: "w1",
                    status: "completed",
                    depends: "task-4",
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      },
      { name: "task-3", workflow: "w1", status: "in-progress", children: [] },
    ];

    const { nodes, edges } = generateNodesAndEdges(taskTree);

    expect(nodes).toEqual([
      {
        id: "task-1",
        type: "custom",
        data: { label: "task-1", status: "pending" },
        position: { x: 0, y: 0 },
      },
      {
        id: "task-2",
        type: "custom",
        data: { label: "task-2", status: "completed" },
        position: { x: 0, y: 0 },
      },
      {
        id: "task-4",
        type: "custom",
        data: { label: "task-4", status: "completed" },
        position: { x: 0, y: 0 },
      },
      {
        id: "task-5",
        type: "custom",
        data: { label: "task-5", status: "completed" },
        position: { x: 0, y: 0 },
      },
      {
        id: "task-3",
        type: "custom",
        data: { label: "task-3", status: "in-progress" },
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
