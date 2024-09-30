import { render, fireEvent } from "@testing-library/react";
import { WorkflowAccordion } from "../../lib/main";
import { TaskStatus, WorkflowStatus } from "../../lib/types";
import "@testing-library/jest-dom";

jest.mock("../../lib/components/common/StatusIcons", () => ({
  getWorkflowStatusIcon: jest.fn(() => <div>Mocked WorkflowStatusIcon</div>),
}));

describe("WorkflowAccordion Component", () => {
  const mockWorkflow = {
    name: "Test Workflow",
    status: "Running" as WorkflowStatus,
    tasks: [
      { id: "Task-1", name: "Task 1", status: "Succeeded" as TaskStatus },
    ],
  };

  const MockChildComponent = <div>Mocked ChildComponent</div>;
  it("should render the workflow name and status icon", () => {
    const { getByText } = render(
      <WorkflowAccordion workflow={mockWorkflow}>
        {MockChildComponent}
      </WorkflowAccordion>
    );
    expect(getByText("Test Workflow")).toBeInTheDocument();
    expect(getByText("Mocked WorkflowStatusIcon")).toBeInTheDocument();
  });

  it("should expand the accordion and render children when clicked", () => {
    const { getByText } = render(
      <WorkflowAccordion workflow={mockWorkflow}>
        {MockChildComponent}
      </WorkflowAccordion>
    );
    const accordionSummary = getByText("Test Workflow");
    expect(getByText("Mocked ChildComponent")).not.toBeVisible();
    fireEvent.click(accordionSummary);
    expect(getByText("Mocked ChildComponent")).toBeVisible();
  });
});
