import { buildTaskTree } from "../../lib/components/workflow/TasksFlowUtils";
import { TaskNode, TaskStatus } from "../../lib/types";

describe("buildTaskTree", () => {
  it("should build a correct task tree from a list of tasks", () => {
    const tasks = [
      { id: "task-1", name: "task-1", status: "Pending" as TaskStatus },
      {
        id: "task-2",
        name: "task-2",
        status: "Succeeded" as TaskStatus,
        depends: ["task-1"],
      },
      { id: "task-3", name: "task-3", status: "Running" as TaskStatus },
      {
        id: "task-4",
        name: "task-4",
        status: "Succeeded" as TaskStatus,
        depends: ["task-2"],
      },
      {
        id: "task-5",
        name: "task-5",
        status: "Succeeded" as TaskStatus,
        depends: ["task-4"],
      },
    ];

    const expectedTree: TaskNode[] = [
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

    expect(buildTaskTree(tasks)).toEqual(expectedTree);
  });
});
