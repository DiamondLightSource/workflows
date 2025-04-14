import { render, screen } from "@testing-library/react";
import {
  getTaskStatusIcon,
  getWorkflowStatusIcon,
} from "../../lib/components/common/StatusIcons";
import "@testing-library/jest-dom";

describe("getTaskStatusIcon", () => {
  it("renders the Pending icon", () => {
    render(getTaskStatusIcon("PENDING"));
    expect(screen.getByTestId("task-status-icon-pending")).toBeInTheDocument();
  });

  it("renders the Running icon", () => {
    render(getTaskStatusIcon("RUNNING"));
    expect(screen.getByTestId("task-status-icon-running")).toBeInTheDocument();
  });

  it("renders the Succeeded icon", () => {
    render(getTaskStatusIcon("SUCCEEDED"));
    expect(
      screen.getByTestId("task-status-icon-succeeded")
    ).toBeInTheDocument();
  });

  it("renders the Skipped icon", () => {
    render(getTaskStatusIcon("SKIPPED"));
    expect(screen.getByTestId("task-status-icon-skipped")).toBeInTheDocument();
  });

  it("renders the Failed icon", () => {
    render(getTaskStatusIcon("FAILED"));
    expect(screen.getByTestId("task-status-icon-failed")).toBeInTheDocument();
  });

  it("renders the Error icon", () => {
    render(getTaskStatusIcon("ERROR"));
    expect(screen.getByTestId("task-status-icon-error")).toBeInTheDocument();
  });

  it("renders the Omitted icon", () => {
    render(getTaskStatusIcon("OMITTED"));
    expect(screen.getByTestId("task-status-icon-omitted")).toBeInTheDocument();
  });
});

describe("getWorkflowStatusIcon", () => {
  it("renders the Unknown icon", () => {
    render(getWorkflowStatusIcon("Unknown"));
    expect(screen.getByTestId("status-icon-unknown")).toBeInTheDocument();
  });

  it("renders the Pending icon", () => {
    render(getWorkflowStatusIcon("WorkflowPendingStatus"));
    expect(screen.getByTestId("status-icon-pending")).toBeInTheDocument();
  });

  it("renders the Running icon", () => {
    render(getWorkflowStatusIcon("WorkflowRunningStatus"));
    expect(screen.getByTestId("status-icon-running")).toBeInTheDocument();
  });

  it("renders the Succeeded icon", () => {
    render(getWorkflowStatusIcon("WorkflowSucceededStatus"));
    expect(screen.getByTestId("status-icon-succeeded")).toBeInTheDocument();
  });

  it("renders the Failed icon", () => {
    render(getWorkflowStatusIcon("WorkflowFailedStatus"));
    expect(screen.getByTestId("status-icon-failed")).toBeInTheDocument();
  });

  it("renders the Errored icon", () => {
    render(getWorkflowStatusIcon("WorkflowErroredStatus"));
    expect(screen.getByTestId("status-icon-errored")).toBeInTheDocument();
  });
});
