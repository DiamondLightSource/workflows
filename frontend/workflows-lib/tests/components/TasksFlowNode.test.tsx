import { render, screen, fireEvent } from "@testing-library/react";
import TaskFlowNode, {
  TaskFlowNodeData,
} from "../../lib/components/workflow/TasksFlowNode";
import "@testing-library/jest-dom";
import { ReactFlowProvider } from "@xyflow/react";
import { vi } from "vitest";

const mockedNavigator = vi.fn();
vi.mock("react-router-dom", async () => ({
  ...(await vi.importActual("react-router-dom")),
  useNavigate: () => mockedNavigator,
}));

const mockData: TaskFlowNodeData = {
  label: "TaskA",
  taskId: "id-12345",
  status: "SUCCEEDED",
  highlighted: false,
  filled: false,
  details: [],
  workflow: "Workflow1",
  instrumentSession: { proposalCode: "ab", proposalNumber: 12345, number: 6 },
};

describe("TaskFlowNode", () => {
  it("renders the task label", () => {
    render(
      <ReactFlowProvider>
        <TaskFlowNode data={mockData} onNavigate={mockedNavigator} />
      </ReactFlowProvider>,
    );
    expect(screen.getByText("TaskA")).toBeInTheDocument();
  });

  it("renders the task status icon", () => {
    render(
      <ReactFlowProvider>
        <TaskFlowNode data={mockData} onNavigate={mockedNavigator} />
      </ReactFlowProvider>,
    );
    expect(
      screen.getByTestId("task-status-icon-succeeded"),
    ).toBeInTheDocument();
  });

  it("calls onNavigate with the correct id when the task label is clicked", () => {
    render(
      <ReactFlowProvider>
        <TaskFlowNode data={mockData} onNavigate={mockedNavigator} />
      </ReactFlowProvider>,
    );
    fireEvent.click(screen.getByText("TaskA"));
    expect(mockedNavigator).toHaveBeenCalledWith(
      "id-12345",
      expect.any(Object),
    );
  });

  it("renders the target handle", () => {
    render(
      <ReactFlowProvider>
        <TaskFlowNode data={mockData} onNavigate={mockedNavigator} />
      </ReactFlowProvider>,
    );
    const targetHandle = screen.getByTestId("handle-target");
    expect(targetHandle).toBeInTheDocument();
  });

  it("renders the source handle", () => {
    render(
      <ReactFlowProvider>
        <TaskFlowNode data={mockData} onNavigate={mockedNavigator} />
      </ReactFlowProvider>,
    );
    const sourceHandle = screen.getByTestId("handle-source");
    expect(sourceHandle).toBeInTheDocument();
  });
});
