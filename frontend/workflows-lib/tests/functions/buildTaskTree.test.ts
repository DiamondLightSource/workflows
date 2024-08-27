import { buildTaskTree } from "../../lib/uilts/TasksFlowUtils";
import { TaskNode } from "../../lib/types";

describe("buildTaskTree", () => {
  it("should build a correct task tree from a list of tasks", () => {
    const tasks = [
      { name: "task-1", workflow: "w1", status: "pending" },
      {
        name: "task-2",
        workflow: "w1",
        status: "completed",
        depends: "task-1",
      },
      { name: "task-3", workflow: "w1", status: "in-progress" },
      {
        name: "task-4",
        workflow: "w1",
        status: "completed",
        depends: "task-2",
      },
      {
        name: "task-5",
        workflow: "w1",
        status: "completed",
        depends: "task-4",
      },
    ];

    const expectedTree: TaskNode[] = [
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

    expect(buildTaskTree(tasks)).toEqual(expectedTree);
  });
});
