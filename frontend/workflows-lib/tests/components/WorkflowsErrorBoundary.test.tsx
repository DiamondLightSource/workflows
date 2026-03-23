import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import WorkflowsErrorBoundary from "../../lib/components/workflow/WorkflowsErrorBoundary";

describe("WorkflowsErrorBoundary", () => {
  it("renders with children", () => {
    const { getByText } = render(
      <WorkflowsErrorBoundary>
        <div>Child</div>
      </WorkflowsErrorBoundary>,
    );
    expect(getByText("Child")).toBeInTheDocument();
  });

  it("displays error message on error", () => {
    const TestError = () => {
      throw new Error("Error thrown");
    };

    const { getByText } = render(
      <WorkflowsErrorBoundary>
        <TestError />
      </WorkflowsErrorBoundary>,
    );

    expect(getByText("Error thrown")).toBeInTheDocument();
  });
});
