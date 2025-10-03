import { render, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import { WorkflowAccordion } from "workflows-lib";
import { TaskStatus, WorkflowStatus } from "workflows-lib/lib/types";
import { Visit } from "@diamondlightsource/sci-react-ui";
import { vi } from "vitest";

vi.mock("../../lib/components/common/StatusIcons", () => ({
  getWorkflowStatusIcon: vi.fn(() => <div>Mocked WorkflowStatusIcon</div>),
}));

describe("WorkflowAccordion Component", () => {
  const mockWorkflow = {
    name: "Test Workflow",
    status: "Running" as WorkflowStatus,
    instrumentSession: {
      proposalCode: "ab",
      proposalNumber: 7295,
      number: 5,
    } as Visit,
    tasks: [
      { id: "Task-1", name: "Task 1", status: "Succeeded" as TaskStatus },
    ],
  };

  const MockChildComponent = <div>Mocked ChildComponent</div>;
  it("should render the workflow name and status icon", () => {
    const { getByText } = render(
      <MemoryRouter>
        <WorkflowAccordion workflow={mockWorkflow}>
          {MockChildComponent}
        </WorkflowAccordion>
      </MemoryRouter>,
    );
    expect(getByText("Test Workflow")).toBeInTheDocument();
    expect(getByText("Mocked WorkflowStatusIcon")).toBeInTheDocument();
  });

  it("should expand the accordion and render children when clicked", () => {
    const { getByText } = render(
      <MemoryRouter>
        <WorkflowAccordion workflow={mockWorkflow}>
          {MockChildComponent}
        </WorkflowAccordion>
      </MemoryRouter>,
    );
    const accordionSummary = getByText("Test Workflow");
    expect(getByText("Mocked ChildComponent")).not.toBeVisible();
    fireEvent.click(accordionSummary);
    expect(getByText("Mocked ChildComponent")).toBeVisible();
  });
});
