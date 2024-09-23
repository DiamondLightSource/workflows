import { render } from "@testing-library/react";
import WorkflowStack from "../../lib/components/workflow/WorkflowStack";
import WorkflowAccordion from "../../lib/components/workflow/WorkflowAccordian";
import { TaskStatus, WorkflowStatus } from "../../lib/types";
import "@testing-library/jest-dom";

jest.mock("../../lib/components/workflow/WorkflowAccordian", () => ({
  __esModule: true,
  default: jest.fn(() => <div>Mocked WorkflowAccordion</div>),
}));

describe("WorkflowStack Component", () => {
  const mockWorkflows = [
    {
      name: "Workflow 1",
      status: "Running" as WorkflowStatus,
      tasks: [
        { id: "task-1", name: "Task 1", status: "Succeeded" as TaskStatus },
      ],
    },
    {
      name: "Workflow 2",
      status: "Failed" as WorkflowStatus,
      tasks: [{ id: "task-2", name: "Task 2", status: "Failed" as TaskStatus }],
    },
  ];

  it("should render the correct number of WorkflowAccordion components", () => {
    const { getAllByText } = render(
      <WorkflowStack workflows={mockWorkflows} />
    );

    const workflowAccordions = getAllByText("Mocked WorkflowAccordion");
    expect(workflowAccordions).toHaveLength(mockWorkflows.length);
  });

  it("should pass the correct props to each WorkflowAccordion component", () => {
    render(<WorkflowStack workflows={mockWorkflows} />);

    mockWorkflows.forEach((workflow) => {
      expect(WorkflowAccordion).toHaveBeenCalledWith(
        { workflow: workflow },
        expect.anything()
      );
    });
  });
});
