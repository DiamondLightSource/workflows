import { render, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, it, expect } from "vitest";
import WorkflowErrorBoundaryWithRetry from "../../lib/components/workflow/WorkflowErrorBoundaryWithRetry";

describe("WorkflowsErrorBoundaryWithRetry", () => {
  it("renders with children", () => {
    const { getByText } = render(
      <WorkflowErrorBoundaryWithRetry>
        {({ fetchKey }: { fetchKey: number }) => (
          <div>Child with Test Key: {fetchKey.toString()}</div>
        )}
      </WorkflowErrorBoundaryWithRetry>,
    );
    expect(getByText(`Child with Test Key: 0`)).toBeInTheDocument();
  });

  it("test maxRetries works", async () => {
    const TestError = ({ fetchKey }: { fetchKey: number }) => {
      throw new Error(`Error with Key: ${fetchKey.toString()}`);
    };

    const { getByText, queryByText } = render(
      <WorkflowErrorBoundaryWithRetry maxRetries={0}>
        {({ fetchKey }) => <TestError fetchKey={fetchKey} />}
      </WorkflowErrorBoundaryWithRetry>,
    );

    await waitFor(() => {
      expect(queryByText("Trying to Refetch Data...")).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(
        getByText("Something went wrong with the GraphQL query."),
      ).toBeInTheDocument();
    });
  });

  it("retries on error up to maxRetries", async () => {
    const TestError = ({ fetchKey }: { fetchKey: number }) => {
      throw new Error(`Error with Key: ${fetchKey.toString()}`);
    };

    const { getByText } = render(
      <WorkflowErrorBoundaryWithRetry>
        {({ fetchKey }) => <TestError fetchKey={fetchKey} />}
      </WorkflowErrorBoundaryWithRetry>,
    );

    await waitFor(() => {
      expect(getByText("Trying to Refetch Data...")).toBeInTheDocument();
    });

    await waitFor(
      () => {
        expect(
          getByText("Something went wrong with the GraphQL query."),
        ).toBeInTheDocument();
      },
      { timeout: 4000 },
    );
  });
});
