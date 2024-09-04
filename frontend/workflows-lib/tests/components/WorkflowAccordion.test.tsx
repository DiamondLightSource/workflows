import { render, fireEvent } from "@testing-library/react";
import WorkflowAccordion from "../../lib/components/workflow/WorkflowAccordian";
import { WorkflowStatus } from "../../lib/types";
import "@testing-library/jest-dom";

jest.mock("../../lib/components/workflow/TasksDynamic", () => () => (
  <div>Mocked TasksDynamic</div>
));
jest.mock("../../lib/components/common/StatusIcons", () => ({
  getWorkflowStatusIcon: jest.fn(() => <div>Mocked WorkflowStatusIcon</div>),
}));

describe("WorkflowAccordion Component", () => {
  const mockWorkflow = {
    name: "Test Workflow",
    status: "Running" as WorkflowStatus,
    tasks: [{ workflow: "1", name: "Task 1", status: "completed" }],
  };

  it("should render the workflow name and status icon", () => {
    const { getByText } = render(<WorkflowAccordion workflow={mockWorkflow} />);
    expect(getByText("Test Workflow")).toBeInTheDocument();
    expect(getByText("Mocked WorkflowStatusIcon")).toBeInTheDocument();
  });

  it("should expand the accordion and render TasksDynamic when clicked", () => {
    const { getByText } = render(<WorkflowAccordion workflow={mockWorkflow} />);
    const accordionSummary = getByText("Test Workflow");
    expect(getByText("Mocked TasksDynamic")).not.toBeVisible();
    fireEvent.click(accordionSummary);
    expect(getByText("Mocked TasksDynamic")).toBeVisible();
  });
});
