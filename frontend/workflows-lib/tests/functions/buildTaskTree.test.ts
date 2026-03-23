import { buildTaskTree } from "../../lib/utils/tasksFlowUtils";
import { Task, TaskNode, TaskStatus } from "../../lib/types";
import { instrumentSession } from "../components/data";
describe("buildTaskTree", () => {
  it("should build a correct task tree from a list of tasks", () => {
    const tasks: Task[] = [
      {
        id: "task-1",
        name: "task-1",
        status: "Pending" as TaskStatus,
        artifacts: [],
        workflow: "workflow-1",
        instrumentSession: instrumentSession,
        stepType: "DAG",
      },
      {
        id: "task-2",
        name: "task-2",
        status: "Succeeded" as TaskStatus,
        depends: ["task-1"],
        artifacts: [],
        workflow: "workflow-2",
        instrumentSession: instrumentSession,
        stepType: "POD",
      },
      {
        id: "task-3",
        name: "task-3",
        status: "Running" as TaskStatus,
        artifacts: [],
        workflow: "workflow-3",
        instrumentSession: instrumentSession,
        stepType: "POD",
      },
      {
        id: "task-4",
        name: "task-4",
        status: "Succeeded" as TaskStatus,
        depends: ["task-2"],
        artifacts: [],
        workflow: "workflow-4",
        instrumentSession: instrumentSession,
        stepType: "POD",
      },
      {
        id: "task-5",
        name: "task-5",
        status: "Succeeded" as TaskStatus,
        depends: ["task-4"],
        artifacts: [],
        workflow: "workflow-5",
        instrumentSession: instrumentSession,
        stepType: "POD",
      },
    ];

    const expectedTree: TaskNode[] = [
      {
        id: "task-1",
        name: "task-1",
        status: "Pending" as TaskStatus,
        stepType: "DAG",
        children: [
          {
            id: "task-2",
            name: "task-2",
            status: "Succeeded" as TaskStatus,
            depends: ["task-1"],
            stepType: "POD",
            children: [
              {
                id: "task-4",
                name: "task-4",
                status: "Succeeded" as TaskStatus,
                depends: ["task-2"],
                stepType: "POD",
                children: [
                  {
                    id: "task-5",
                    name: "task-5",
                    status: "Succeeded" as TaskStatus,
                    depends: ["task-4"],
                    children: [],
                    artifacts: [],
                    workflow: "workflow-5",
                    instrumentSession: instrumentSession,
                    stepType: "POD",
                  },
                ],
                artifacts: [],
                workflow: "workflow-4",
                instrumentSession: instrumentSession,
              },
            ],
            artifacts: [],
            workflow: "workflow-2",
            instrumentSession: instrumentSession,
          },
        ],
        artifacts: [],
        workflow: "workflow-1",
        instrumentSession: instrumentSession,
      },
      {
        id: "task-3",
        name: "task-3",
        status: "Running" as TaskStatus,
        children: [],
        artifacts: [],
        workflow: "workflow-3",
        instrumentSession: instrumentSession,
        stepType: "POD",
      },
    ];

    expect(buildTaskTree(tasks)).toEqual(expectedTree);
  });
});
